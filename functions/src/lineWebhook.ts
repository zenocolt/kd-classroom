/**
 * LINE Webhook — Student Account Linking
 * =======================================
 * Firebase HTTPS Function that handles LINE Messaging API webhook events.
 *
 * Flow:
 *  1. Student adds (follows) the LINE Official Account.
 *  2. Bot replies asking the student to send their school Student ID.
 *  3. Student sends their ID as a text message.
 *  4. Function looks up the student document in Firestore and stores
 *     their `line_user_id` so the reminder scheduler can address them.
 *
 * Setup
 * -----
 *  firebase functions:secrets:set LINE_CHANNEL_SECRET
 *  firebase functions:secrets:set LINE_CHANNEL_ACCESS_TOKEN
 *
 * LINE Dashboard
 * --------------
 *  Set Webhook URL to:
 *    https://<region>-<project-id>.cloudfunctions.net/lineWebhook
 *  Enable "Use webhook" in the LINE Developers Console.
 */

import * as admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { messagingApi, validateSignature, WebhookEvent } from '@line/bot-sdk';

// --------------------------------------------------------------------------
// Initialise Admin SDK only once (shared with index.ts via module cache).
// --------------------------------------------------------------------------
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

const LINE_CHANNEL_SECRET = defineSecret('LINE_CHANNEL_SECRET');
const LINE_CHANNEL_ACCESS_TOKEN = defineSecret('LINE_CHANNEL_ACCESS_TOKEN');

// --------------------------------------------------------------------------
// Request body type guard
// --------------------------------------------------------------------------
interface LineWebhookBody {
  events: WebhookEvent[];
}

function isLineWebhookBody(body: unknown): body is LineWebhookBody {
  return (
    typeof body === 'object' &&
    body !== null &&
    'events' in body &&
    Array.isArray((body as LineWebhookBody).events)
  );
}

// --------------------------------------------------------------------------
// Helper: reply to a LINE user with a text message
// --------------------------------------------------------------------------
async function replyText(
  client: messagingApi.MessagingApiClient,
  replyToken: string,
  text: string
) {
  await client.replyMessage({
    replyToken,
    messages: [{ type: 'text', text }],
  });
}

/** Convert Thai numerals and remove non-digits so students can type flexibly. */
function normalizeStudentId(text: string): string {
  const thaiDigits = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
  let normalized = text.trim();
  thaiDigits.forEach((thai, idx) => {
    normalized = normalized.replace(new RegExp(thai, 'g'), String(idx));
  });
  return normalized.replace(/\D/g, '');
}

function normalizeSubjectCode(text: string): string {
  return text.trim().replace(/^bind\s*:\s*/i, '').trim();
}

// --------------------------------------------------------------------------
// Core event handler
// --------------------------------------------------------------------------
async function handleEvent(
  event: WebhookEvent,
  client: messagingApi.MessagingApiClient
): Promise<void> {
  console.log(`[lineWebhook] event.type=${event.type}`);

  // ── Follow / Unblock ──────────────────────────────────────────────────────
  if (event.type === 'follow') {
    const lineUserId = event.source.userId;
    if (!lineUserId) return;

    await replyText(
      client,
      event.replyToken,
      [
        'สวัสดีค่ะ! 👋',
        '',
        'ยินดีต้อนรับสู่ระบบแจ้งเตือนการบ้าน DaiClassroom',
        '',
        '📋 กรุณาส่งรหัสนักเรียนของคุณ (เช่น 64001)',
        'เพื่อเชื่อมต่อบัญชี LINE กับโปรไฟล์นักเรียนในระบบ',
      ].join('\n')
    );
    return;
  }

  // ── Text message (student ID linking) ────────────────────────────────────
  if (event.type === 'message' && event.message.type === 'text') {
    const rawText = event.message.text.trim();
    const isGroupMessage = event.source.type === 'group';
    const groupId = isGroupMessage
      ? (event.source as { type: 'group'; groupId: string }).groupId
      : undefined;

    if (isGroupMessage && groupId && /^bind\s*:/i.test(rawText)) {
      const subjectCode = normalizeSubjectCode(rawText);
      console.log(`[lineWebhook] bind command received groupId=${groupId.slice(0, 8)}... subjectCode="${subjectCode}"`);

      if (!subjectCode) {
        await replyText(
          client,
          event.replyToken,
          'รูปแบบคำสั่งไม่ถูกต้อง\nตัวอย่าง: bind: IT101'
        );
        return;
      }

      const subjectSnap = await db
        .collection('subjects')
        .where('code', '==', subjectCode)
        .limit(2)
        .get();

      if (subjectSnap.empty) {
        await replyText(
          client,
          event.replyToken,
          `ไม่พบวิชารหัส "${subjectCode}" ในระบบ\nกรุณาตรวจสอบรหัสวิชาอีกครั้ง`
        );
        return;
      }

      if (subjectSnap.docs.length > 1) {
        await replyText(
          client,
          event.replyToken,
          `พบรหัสวิชา "${subjectCode}" มากกว่า 1 รายการ\nกรุณาใช้รหัสวิชาที่ไม่ซ้ำกันก่อน bind กลุ่ม`
        );
        return;
      }

      const subjectDoc = subjectSnap.docs[0];
      const batch = db.batch();

      const conflictingSubjects = await db
        .collection('subjects')
        .where('lineGroupId', '==', groupId)
        .get();

      conflictingSubjects.docs.forEach((doc) => {
        if (doc.id !== subjectDoc.id) {
          batch.update(doc.ref, {
            lineGroupId: admin.firestore.FieldValue.delete(),
            lineGroupBoundAt: admin.firestore.FieldValue.delete(),
          });
        }
      });

      batch.update(subjectDoc.ref, {
        lineGroupId: groupId,
        lineGroupBoundAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      await batch.commit();

      await replyText(
        client,
        event.replyToken,
        [
          `ผูกกลุ่มสำเร็จ ✅`,
          `วิชา: ${subjectDoc.get('name') as string}`,
          `รหัสวิชา: ${subjectCode}`,
          ``,
          `จากนี้สามารถส่งสรุปงานค้างเข้ากลุ่มนี้ได้แล้ว`,
        ].join('\n')
      );
      return;
    }

    const lineUserId = event.source.userId;
    if (!lineUserId) return;

    const normalizedStudentId = normalizeStudentId(rawText);
    console.log(
      `[lineWebhook] incoming text="${rawText}" normalizedStudentId="${normalizedStudentId}" user=${lineUserId.slice(0, 6)}...`
    );

    // Ignore messages that don't look like a student ID (digits only, 3-15 chars)
    if (!/^\d{3,15}$/.test(normalizedStudentId)) {
      await replyText(
        client,
        event.replyToken,
        'กรุณาส่งเฉพาะรหัสนักเรียน (ตัวเลขเท่านั้น) เช่น "65309010001"'
      );
      return;
    }

    const studentId = normalizedStudentId;

    // ── Look up the student by studentId field ──────────────────────────────
    const querySnapByField = await db
      .collection('students')
      .where('studentId', '==', studentId)
      .limit(1)
      .get();

    // Fallback: some datasets use docId as the student code.
    const byDocIdSnap = await db.collection('students').doc(studentId).get();

    const studentDoc = !querySnapByField.empty
      ? querySnapByField.docs[0]
      : byDocIdSnap.exists
        ? byDocIdSnap
        : null;

    if (!studentDoc) {
      console.warn(`[lineWebhook] student not found for studentId="${studentId}"`);
      await replyText(
        client,
        event.replyToken,
        `ไม่พบรหัสนักเรียน "${studentId}" ในระบบ\nกรุณาตรวจสอบรหัสของคุณหรือติดต่ออาจารย์`
      );
      return;
    }

    const existingLineUserId = studentDoc.get('line_user_id') as string | undefined;

    // ── Prevent hijacking another student's account ─────────────────────────
    if (existingLineUserId && existingLineUserId !== lineUserId) {
      await replyText(
        client,
        event.replyToken,
        'รหัสนักเรียนนี้ถูกเชื่อมต่อกับบัญชี LINE อื่นแล้ว\nกรุณาติดต่ออาจารย์เพื่อรีเซ็ตการเชื่อมต่อ'
      );
      return;
    }

    // ── Already linked to this LINE account ──────────────────────────────────
    if (existingLineUserId === lineUserId) {
      await replyText(
        client,
        event.replyToken,
        `บัญชีของคุณถูกเชื่อมต่อกับรหัสนักเรียน "${studentId}" แล้ว ✅\nคุณจะได้รับการแจ้งเตือนงานผ่าน LINE นี้`
      );
      return;
    }

    // ── Save line_user_id ─────────────────────────────────────────────────────
    await studentDoc.ref.update({ line_user_id: lineUserId });
    console.log(`[lineWebhook] linked studentDocId=${studentDoc.id} studentId=${studentId}`);

    const studentName = studentDoc.get('name') as string | undefined;
    await replyText(
      client,
      event.replyToken,
      [
        `เชื่อมต่อสำเร็จ! ✅`,
        ``,
        `ยินดีต้อนรับ ${studentName ?? 'นักเรียน'} 🎉`,
        `รหัสนักเรียน: ${studentId}`,
        ``,
        `คุณจะได้รับการแจ้งเตือนเมื่อมีงานที่ใกล้ครบกำหนดส่งผ่าน LINE นี้`,
      ].join('\n')
    );
    return;
  }
}

// --------------------------------------------------------------------------
// Exported Firebase HTTPS Function
// --------------------------------------------------------------------------
export const lineWebhook = onRequest(
  {
    region: 'asia-southeast1',
    secrets: [LINE_CHANNEL_SECRET, LINE_CHANNEL_ACCESS_TOKEN],
  },
  async (req, res) => {
    // Only accept POST from LINE's servers
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    // ── Signature verification ────────────────────────────────────────────────
    // LINE signs each webhook request; verifying prevents spoofed requests.
    const signature = req.headers['x-line-signature'] as string | undefined;
    const rawBody = JSON.stringify(req.body); // Firebase parses JSON automatically

    if (
      !signature ||
      !validateSignature(rawBody, LINE_CHANNEL_SECRET.value(), signature)
    ) {
      console.warn('[lineWebhook] Invalid signature — request rejected.');
      res.status(401).send('Unauthorized');
      return;
    }

    if (!isLineWebhookBody(req.body)) {
      res.status(400).send('Bad Request');
      return;
    }

    const client = new messagingApi.MessagingApiClient({
      channelAccessToken: LINE_CHANNEL_ACCESS_TOKEN.value(),
    });

    // Process all events concurrently; failures in one must not block others
    const results = await Promise.allSettled(
      req.body.events.map((event) => handleEvent(event, client))
    );

    results.forEach((result, i) => {
      if (result.status === 'rejected') {
        console.error(`[lineWebhook] Error processing event[${i}]:`, result.reason);
      }
    });

    // Always respond 200 quickly so LINE doesn't retry
    res.status(200).send('OK');
  }
);

// --------------------------------------------------------------------------
// Admin helper: unlink a student's LINE account (call from trusted backend)
// --------------------------------------------------------------------------
export async function unlinkStudentLine(studentDocId: string): Promise<void> {
  await db.collection('students').doc(studentDocId).update({
    line_user_id: admin.firestore.FieldValue.delete(),
  });
}
