/**
 * DaiClassroom – LINE reminder and summary functions
 * ==================================================
 * LINE notifications are now manual-only. Teachers trigger reminder sends from
 * the application UI; the old scheduled reminder job remains deployed as a
 * no-op so it cannot push messages automatically anymore.
 */

import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { messagingApi } from '@line/bot-sdk';

// ─── Initialise Firebase Admin ───────────────────────────────────────────────
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

// ─── Re-export LINE webhook ───────────────────────────────────────────────────
export { lineWebhook } from './lineWebhook';

// Secret stored in Google Cloud Secret Manager (recommended for credentials)
const LINE_CHANNEL_ACCESS_TOKEN = defineSecret('LINE_CHANNEL_ACCESS_TOKEN');

// ─── Firestore types ─────────────────────────────────────────────────────────

interface Assignment {
  id: string;
  title: string;
  subjectId: string;
  teacherId: string;
  /** Firestore Timestamp representing the submission deadline */
  due_date: admin.firestore.Timestamp;
  description?: string;
}

interface Submission {
  id: string;
  assignmentId: string;
  /** References the Firestore document ID of a student */
  studentId: string;
  status: 'submitted' | 'not_submitted';
  submittedAt?: admin.firestore.Timestamp;
}

interface Student {
  id: string;
  studentId: string;
  name: string;
  /** LINE user ID, populated when the student links their LINE account */
  line_user_id?: string;
  department: string;
  year: string;
  teacherId: string;
}

interface Subject {
  id: string;
  code: string;
  name: string;
  lineGroupId?: string;
}

interface UserProfile {
  role?: 'admin' | 'teacher';
}

// ─── Helper: format Timestamp to a human-readable Thai-locale date ────────────

/**
 * Returns a date string in DD/MM/YYYY format (Buddhist Era + 543).
 * Example: 2026-04-07 → "07/04/2569"
 */
function formatDueDateThai(ts: admin.firestore.Timestamp): string {
  const date = ts.toDate();
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const buddhistYear = date.getFullYear() + 543;
  return `${day}/${month}/${buddhistYear}`;
}

// ─── Helper: build a personalised LINE text message ──────────────────────────

/**
 * Composes the reminder message body sent to each student.
 *
 * @param studentName   Full name of the student
 * @param assignmentTitle  Name / title of the assignment
 * @param dueDateLabel  Human-readable due date string
 * @param isOverdue     Whether the deadline has already passed
 */
function buildReminderMessage(
  studentName: string,
  assignmentTitle: string,
  dueDateLabel: string,
  isOverdue: boolean
): string {
  const urgencyLine = isOverdue
    ? `⚠️ งานนี้เลยกำหนดส่งไปแล้ว (${dueDateLabel}) กรุณาติดต่ออาจารย์โดยด่วน`
    : `📅 กำหนดส่ง: ${dueDateLabel} (พรุ่งนี้)`;

  return [
    `สวัสดี ${studentName} 👋`,
    ``,
    `แจ้งเตือน: คุณยังไม่ได้ส่งงาน`,
    `📝 "${assignmentTitle}"`,
    ``,
    urgencyLine,
    ``,
    `กรุณาส่งงานให้ทันกำหนดเพื่อไม่ให้เสียคะแนน 📚`,
    `หากมีข้อสงสัยกรุณาติดต่ออาจารย์`,
  ].join('\n');
}

function buildGroupSummaryMessage(
  subject: Subject,
  assignment: Assignment,
  students: Student[]
): string {
  const dueDateLabel = formatDueDateThai(assignment.due_date);
  const header = [
    `สรุปงานค้างส่ง`,
    `วิชา: ${subject.name}`,
    `งาน: ${assignment.title}`,
    `กำหนดส่ง: ${dueDateLabel}`,
    ``,
  ];

  const maxVisible = 25;
  const visibleStudents = students.slice(0, maxVisible);
  const lines = visibleStudents.map(
    (student, index) => `${index + 1}. ${student.name} (${student.studentId})`
  );

  if (students.length > maxVisible) {
    lines.push(`... และอีก ${students.length - maxVisible} คน`);
  }

  return [
    ...header,
    `นักเรียนที่ยังไม่ส่ง ${students.length} คน`,
    ...lines,
    ``,
    `กรุณาส่งงานภายในเวลาที่กำหนด`,
  ].join('\n');
}

async function isAdminUser(uid: string): Promise<boolean> {
  const userSnap = await db.collection('users').doc(uid).get();
  if (!userSnap.exists) return false;
  const data = userSnap.data() as UserProfile;
  return data.role === 'admin';
}

/**
 * Manual reminder trigger from the web UI.
 * Sends reminders only to selected student document IDs (typically one room group).
 */
export const sendAssignmentRoomReminder = onCall(
  {
    region: 'asia-southeast1',
    secrets: [LINE_CHANNEL_ACCESS_TOKEN],
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Authentication required.');
    }

    const assignmentId = String(request.data?.assignmentId || '').trim();
    const studentDocIdsRaw = Array.isArray(request.data?.studentDocIds)
      ? request.data.studentDocIds
      : [];
    const studentDocIds = studentDocIdsRaw
      .map((v: unknown) => String(v).trim())
      .filter((v: string) => v.length > 0);

    if (!assignmentId) {
      throw new HttpsError('invalid-argument', 'assignmentId is required.');
    }

    if (studentDocIds.length === 0) {
      return {
        requested: 0,
        pending: 0,
        sent: 0,
        skippedNoLine: 0,
        failed: 0,
      };
    }

    const assignmentSnap = await db.collection('assignments').doc(assignmentId).get();
    if (!assignmentSnap.exists) {
      throw new HttpsError('not-found', 'Assignment not found.');
    }
    const assignment = { id: assignmentSnap.id, ...assignmentSnap.data() } as Assignment;

    const uid = request.auth.uid;
    const callerIsAdmin = await isAdminUser(uid);
    if (!callerIsAdmin && assignment.teacherId !== uid) {
      throw new HttpsError('permission-denied', 'You cannot send reminders for this assignment.');
    }

    const lineClient = new messagingApi.MessagingApiClient({
      channelAccessToken: LINE_CHANNEL_ACCESS_TOKEN.value(),
    });

    const submissionSnap = await db
      .collection('submissions')
      .where('assignmentId', '==', assignmentId)
      .where('status', '==', 'not_submitted')
      .get();

    const requestedSet = new Set(studentDocIds);
    const pendingStudentDocIds = submissionSnap.docs
      .map((d) => d.data() as Submission)
      .map((s) => s.studentId)
      .filter((id) => requestedSet.has(id));

    if (pendingStudentDocIds.length === 0) {
      return {
        requested: studentDocIds.length,
        pending: 0,
        sent: 0,
        skippedNoLine: 0,
        failed: 0,
      };
    }

    const studentRefs = pendingStudentDocIds.map((id) => db.collection('students').doc(id));
    const studentDocs = await db.getAll(...studentRefs);
    const isOverdue = assignment.due_date.toDate() < new Date();
    const dueDateLabel = formatDueDateThai(assignment.due_date);

    let sent = 0;
    let skippedNoLine = 0;
    let failed = 0;

    for (const doc of studentDocs) {
      if (!doc.exists) {
        failed++;
        continue;
      }
      const student = { id: doc.id, ...doc.data() } as Student;
      if (!student.line_user_id) {
        skippedNoLine++;
        continue;
      }
      try {
        await lineClient.pushMessage({
          to: student.line_user_id,
          messages: [
            {
              type: 'text',
              text: buildReminderMessage(
                student.name,
                assignment.title,
                dueDateLabel,
                isOverdue
              ),
            },
          ],
        });
        sent++;
      } catch (err) {
        console.error(
          `[sendAssignmentRoomReminder] LINE push failed for studentDocId=${doc.id}:`,
          err
        );
        failed++;
      }
    }

    return {
      requested: studentDocIds.length,
      pending: pendingStudentDocIds.length,
      sent,
      skippedNoLine,
      failed,
    };
  }
);

export const sendAssignmentGroupSummary = onCall(
  {
    region: 'asia-southeast1',
    secrets: [LINE_CHANNEL_ACCESS_TOKEN],
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Authentication required.');
    }

    const assignmentId = String(request.data?.assignmentId || '').trim();
    if (!assignmentId) {
      throw new HttpsError('invalid-argument', 'assignmentId is required.');
    }

    const assignmentSnap = await db.collection('assignments').doc(assignmentId).get();
    if (!assignmentSnap.exists) {
      throw new HttpsError('not-found', 'Assignment not found.');
    }
    const assignment = { id: assignmentSnap.id, ...assignmentSnap.data() } as Assignment;

    const uid = request.auth.uid;
    const callerIsAdmin = await isAdminUser(uid);
    if (!callerIsAdmin && assignment.teacherId !== uid) {
      throw new HttpsError('permission-denied', 'You cannot send group summary for this assignment.');
    }

    const subjectSnap = await db.collection('subjects').doc(assignment.subjectId).get();
    if (!subjectSnap.exists) {
      throw new HttpsError('not-found', 'Subject not found.');
    }
    const subject = { id: subjectSnap.id, ...subjectSnap.data() } as Subject;

    if (!subject.lineGroupId) {
      throw new HttpsError('failed-precondition', 'This subject has no linked LINE group.');
    }

    const submissionsSnap = await db
      .collection('submissions')
      .where('assignmentId', '==', assignment.id)
      .where('status', '==', 'not_submitted')
      .get();

    const pendingStudentDocIds = submissionsSnap.docs
      .map((doc) => doc.data() as Submission)
      .map((submission) => submission.studentId);

    const studentDocs = pendingStudentDocIds.length > 0
      ? await db.getAll(...pendingStudentDocIds.map((id) => db.collection('students').doc(id)))
      : [];

    const students = studentDocs
      .filter((doc) => doc.exists)
      .map((doc) => ({ id: doc.id, ...doc.data() } as Student));

    const lineClient = new messagingApi.MessagingApiClient({
      channelAccessToken: LINE_CHANNEL_ACCESS_TOKEN.value(),
    });

    const messageText = students.length > 0
      ? buildGroupSummaryMessage(subject, assignment, students)
      : [
          `อัปเดตงานวิชา ${subject.name}`,
          `งาน: ${assignment.title}`,
          ``,
          `ตอนนี้ทุกคนส่งงานครบแล้ว ✅`,
        ].join('\n');

    await lineClient.pushMessage({
      to: subject.lineGroupId,
      messages: [{ type: 'text', text: messageText }],
    });

    return {
      pending: students.length,
      subjectId: subject.id,
      subjectName: subject.name,
      groupId: subject.lineGroupId,
    };
  }
);

// ─── Scheduled Function ───────────────────────────────────────────────────────

/**
 * Disabled scheduled reminder job.
 * Kept as a deployed no-op so the system no longer sends automatic LINE
 * reminders; all reminder delivery now happens only when a teacher triggers it
 * from the application.
 */
export const sendAssignmentReminders = onSchedule(
  {
    schedule: '0 8 * * *',
    timeZone: 'Asia/Bangkok',
    region: 'asia-southeast1',
  },
  async (_event) => {
    console.log('[sendAssignmentReminders] Scheduled reminders are disabled. Manual sends only.');
  }
);

// ─── Alternative: node-cron version (for standalone Express servers) ─────────
//
// If you prefer running this outside of Firebase Cloud Functions (e.g., on a
// Cloud Run or VPS with Express), replace the `onSchedule` export above with:
//
//   import cron from 'node-cron';
//   cron.schedule('0 8 * * *', reminderJobHandler, { timezone: 'Asia/Bangkok' });
//
// where `reminderJobHandler` is the async callback extracted from onSchedule.
// Install the package with: npm install node-cron @types/node-cron
