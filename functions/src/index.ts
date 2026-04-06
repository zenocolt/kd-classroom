/**
 * DaiClassroom – Automated Assignment Reminder
 * =============================================
 * Firebase Scheduled Cloud Function (v2) that runs every day at 08:00 ICT.
 *
 * Logic:
 *  1. Query `assignments` for items due TOMORROW or already OVERDUE (within
 *     the last 30 days, to avoid spamming ancient deadlines).
 *  2. For each assignment, fetch `submissions` whose `status == 'not_submitted'`.
 *  3. Resolve each missing student's `line_user_id` from the `students` collection.
 *  4. Send a personalised LINE Push Message via the LINE Messaging API.
 *  5. Write a summary log document to `reminderLogs` for auditing.
 *
 * Firestore schema assumed
 * ------------------------
 * assignments/{id}
 *   title        : string
 *   subjectId    : string
 *   teacherId    : string
 *   due_date     : Timestamp
 *   description? : string
 *
 * submissions/{id}
 *   assignmentId : string
 *   studentId    : string   ← Firestore document ID of the student
 *   status       : 'submitted' | 'not_submitted'
 *   submittedAt? : Timestamp
 *
 * students/{id}
 *   studentId    : string   ← school ID (e.g. "64001")
 *   name         : string
 *   line_user_id : string   ← LINE user ID (e.g. "Uxxxxxxxx...")
 *   department   : string
 *   year         : string
 *   teacherId    : string
 *
 * Environment / Firebase config
 * ------------------------------
 * Set the LINE channel access token BEFORE deploying:
 *   firebase functions:secrets:set LINE_CHANNEL_ACCESS_TOKEN
 *   (or)
 *   firebase functions:config:set line.channel_access_token="<token>"
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
 * Runs daily at 08:00 ICT (UTC+7).
 * Sends LINE push messages to students who have not submitted assignments
 * that are due tomorrow or already overdue (within the last 30 days).
 */
export const sendAssignmentReminders = onSchedule(
  {
    // cron syntax: minute hour day-of-month month day-of-week
    schedule: '0 8 * * *',
    timeZone: 'Asia/Bangkok',
    region: 'asia-southeast1',
    // Make the LINE token available inside this function's execution context
    secrets: [LINE_CHANNEL_ACCESS_TOKEN],
  },
  async (_event) => {
    console.log('[sendAssignmentReminders] Starting daily reminder job…');

    // ── Step 1: Calculate the date range ──────────────────────────────────────

    const now = new Date();
    // Midnight at the very start of today (Bangkok time, but Date uses UTC –
    // Firestore Timestamps use UTC too, so comparisons are consistent).
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    // End of tomorrow (23:59:59.999)
    const endOfTomorrow = new Date(startOfToday);
    endOfTomorrow.setDate(endOfTomorrow.getDate() + 2);
    endOfTomorrow.setMilliseconds(endOfTomorrow.getMilliseconds() - 1);

    // Do not remind about assignments older than 30 days to avoid noise
    const overdueWindowStart = new Date(startOfToday);
    overdueWindowStart.setDate(overdueWindowStart.getDate() - 30);

    const tsOverdueStart = admin.firestore.Timestamp.fromDate(overdueWindowStart);
    const tsEndOfTomorrow = admin.firestore.Timestamp.fromDate(endOfTomorrow);
    const tsStartOfToday = admin.firestore.Timestamp.fromDate(startOfToday);

    // ── Step 2: Fetch qualifying assignments ──────────────────────────────────
    //
    // We make two queries because Firestore does not support OR on different
    // field ranges in a single query:
    //   • Overdue   → due_date ∈ [30 days ago, start of today)
    //   • Tomorrow  → due_date ∈ [start of tomorrow, end of tomorrow]

    let assignments: Assignment[] = [];

    try {
      const startOfTomorrow = new Date(startOfToday);
      startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
      const tsStartOfTomorrow = admin.firestore.Timestamp.fromDate(startOfTomorrow);

      // Overdue assignments (deadline already passed, within the 30-day window)
      const overdueSnap = await db
        .collection('assignments')
        .where('due_date', '>=', tsOverdueStart)
        .where('due_date', '<', tsStartOfToday)
        .get();

      // Assignments due exactly tomorrow
      const tomorrowSnap = await db
        .collection('assignments')
        .where('due_date', '>=', tsStartOfTomorrow)
        .where('due_date', '<=', tsEndOfTomorrow)
        .get();

      const fromDocs = (snap: admin.firestore.QuerySnapshot): Assignment[] =>
        snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Assignment));

      // Merge and de-duplicate by document ID
      const seen = new Set<string>();
      for (const a of [...fromDocs(overdueSnap), ...fromDocs(tomorrowSnap)]) {
        if (!seen.has(a.id)) {
          seen.add(a.id);
          assignments.push(a);
        }
      }

      console.log(`[sendAssignmentReminders] Found ${assignments.length} qualifying assignment(s).`);
    } catch (err) {
      console.error('[sendAssignmentReminders] Error querying assignments:', err);
      // Re-throw so Cloud Functions marks the invocation as failed
      throw err;
    }

    if (assignments.length === 0) {
      console.log('[sendAssignmentReminders] No assignments require reminders today.');
      return;
    }

    // ── Step 3 & 4: For each assignment, find unsubmitted students ────────────

    const lineClient = new messagingApi.MessagingApiClient({
      channelAccessToken: LINE_CHANNEL_ACCESS_TOKEN.value(),
    });

    // Counters used for the audit log
    let totalMessagesSent = 0;
    let totalErrors = 0;
    const errorDetails: string[] = [];

    for (const assignment of assignments) {
      console.log(`[sendAssignmentReminders] Processing assignment "${assignment.title}" (${assignment.id})`);

      const isOverdue = assignment.due_date.toDate() < startOfToday;
      const dueDateLabel = formatDueDateThai(assignment.due_date);

      // ── Step 3a: Query submissions with status 'not_submitted' ──────────────
      let missingSubmissions: Submission[] = [];
      try {
        const submissionsSnap = await db
          .collection('submissions')
          .where('assignmentId', '==', assignment.id)
          .where('status', '==', 'not_submitted')
          .get();

        missingSubmissions = submissionsSnap.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Submission)
        );

        console.log(
          `  → ${missingSubmissions.length} student(s) have not submitted "${assignment.title}".`
        );
      } catch (err) {
        const msg = `Failed to query submissions for assignment ${assignment.id}: ${String(err)}`;
        console.error(`  ✗ ${msg}`);
        errorDetails.push(msg);
        totalErrors++;
        // Continue to the next assignment rather than aborting everything
        continue;
      }

      if (missingSubmissions.length === 0) continue;

      // ── Step 3b: Batch-fetch student documents ───────────────────────────────
      //
      // Firestore `getAll` accepts up to 500 DocumentReferences, which is more
      // than enough for a typical classroom batch.

      const studentRefs = missingSubmissions.map((s) =>
        db.collection('students').doc(s.studentId)
      );

      let studentDocs: admin.firestore.DocumentSnapshot[] = [];
      try {
        studentDocs = await db.getAll(...studentRefs);
      } catch (err) {
        const msg = `Failed to batch-fetch students for assignment ${assignment.id}: ${String(err)}`;
        console.error(`  ✗ ${msg}`);
        errorDetails.push(msg);
        totalErrors++;
        continue;
      }

      // Build a map: studentDocId → Student for O(1) lookups
      const studentMap = new Map<string, Student>();
      for (const doc of studentDocs) {
        if (doc.exists) {
          studentMap.set(doc.id, { id: doc.id, ...doc.data() } as Student);
        }
      }

      // ── Step 4: Send a LINE Push Message to each missing student ─────────────
      for (const submission of missingSubmissions) {
        const student = studentMap.get(submission.studentId);

        if (!student) {
          const msg = `Student document not found: ${submission.studentId}`;
          console.warn(`  ⚠ ${msg}`);
          errorDetails.push(msg);
          continue;
        }

        if (!student.line_user_id) {
          // Student has not linked their LINE account – skip silently
          console.warn(
            `  ⚠ Student "${student.name}" (${student.studentId}) has no line_user_id – skipping.`
          );
          continue;
        }

        const messageText = buildReminderMessage(
          student.name,
          assignment.title,
          dueDateLabel,
          isOverdue
        );

        try {
          await lineClient.pushMessage({
            to: student.line_user_id,
            messages: [
              {
                type: 'text',
                text: messageText,
              },
            ],
          });

          console.log(`  ✓ Reminder sent to "${student.name}" (LINE: ${student.line_user_id})`);
          totalMessagesSent++;
        } catch (err: unknown) {
          // Narrow the error to extract a useful message
          const errMessage =
            err instanceof Error
              ? `${err.message}`
              : String(err);

          const msg = `LINE push failed for student "${student.name}" (${student.line_user_id}): ${errMessage}`;
          console.error(`  ✗ ${msg}`);
          errorDetails.push(msg);
          totalErrors++;
          // Continue sending to other students even if one fails
        }
      }
    }

    // ── Step 5: Write audit log to Firestore ────────────────────────────────────

    try {
      await db.collection('reminderLogs').add({
        runAt: admin.firestore.FieldValue.serverTimestamp(),
        assignmentsProcessed: assignments.length,
        messagesSent: totalMessagesSent,
        errors: totalErrors,
        errorDetails: errorDetails.slice(0, 50), // cap array size in Firestore
      });
    } catch (logErr) {
      // Logging failure must not mask the main job result
      console.error('[sendAssignmentReminders] Failed to write audit log:', logErr);
    }

    console.log(
      `[sendAssignmentReminders] Done. Sent: ${totalMessagesSent}, Errors: ${totalErrors}.`
    );
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
