"use strict";
/**
 * DaiClassroom – LINE reminder and summary functions
 * ==================================================
 * LINE notifications are now manual-only. Teachers trigger reminder sends from
 * the application UI; the old scheduled reminder job remains deployed as a
 * no-op so it cannot push messages automatically anymore.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendAssignmentReminders = exports.sendAssignmentGroupSummary = exports.sendAssignmentRoomReminder = exports.lineWebhook = void 0;
const admin = __importStar(require("firebase-admin"));
const scheduler_1 = require("firebase-functions/v2/scheduler");
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const bot_sdk_1 = require("@line/bot-sdk");
// ─── Initialise Firebase Admin ───────────────────────────────────────────────
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
// ─── Re-export LINE webhook ───────────────────────────────────────────────────
var lineWebhook_1 = require("./lineWebhook");
Object.defineProperty(exports, "lineWebhook", { enumerable: true, get: function () { return lineWebhook_1.lineWebhook; } });
// Secret stored in Google Cloud Secret Manager (recommended for credentials)
const LINE_CHANNEL_ACCESS_TOKEN = (0, params_1.defineSecret)('LINE_CHANNEL_ACCESS_TOKEN');
// ─── Helper: format Timestamp to a human-readable Thai-locale date ────────────
/**
 * Returns a date string in DD/MM/YYYY format (Buddhist Era + 543).
 * Example: 2026-04-07 → "07/04/2569"
 */
function formatDueDateThai(ts) {
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
function buildReminderMessage(studentName, assignmentTitle, dueDateLabel, isOverdue) {
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
function buildGroupSummaryMessage(subject, assignment, students) {
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
    const lines = visibleStudents.map((student, index) => `${index + 1}. ${student.name} (${student.studentId})`);
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
async function isAdminUser(uid) {
    const userSnap = await db.collection('users').doc(uid).get();
    if (!userSnap.exists)
        return false;
    const data = userSnap.data();
    return data.role === 'admin';
}
/**
 * Manual reminder trigger from the web UI.
 * Sends reminders only to selected student document IDs (typically one room group).
 */
exports.sendAssignmentRoomReminder = (0, https_1.onCall)({
    region: 'asia-southeast1',
    secrets: [LINE_CHANNEL_ACCESS_TOKEN],
}, async (request) => {
    if (!request.auth?.uid) {
        throw new https_1.HttpsError('unauthenticated', 'Authentication required.');
    }
    const assignmentId = String(request.data?.assignmentId || '').trim();
    const studentDocIdsRaw = Array.isArray(request.data?.studentDocIds)
        ? request.data.studentDocIds
        : [];
    const studentDocIds = studentDocIdsRaw
        .map((v) => String(v).trim())
        .filter((v) => v.length > 0);
    if (!assignmentId) {
        throw new https_1.HttpsError('invalid-argument', 'assignmentId is required.');
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
        throw new https_1.HttpsError('not-found', 'Assignment not found.');
    }
    const assignment = { id: assignmentSnap.id, ...assignmentSnap.data() };
    const uid = request.auth.uid;
    const callerIsAdmin = await isAdminUser(uid);
    if (!callerIsAdmin && assignment.teacherId !== uid) {
        throw new https_1.HttpsError('permission-denied', 'You cannot send reminders for this assignment.');
    }
    const lineClient = new bot_sdk_1.messagingApi.MessagingApiClient({
        channelAccessToken: LINE_CHANNEL_ACCESS_TOKEN.value(),
    });
    const submissionSnap = await db
        .collection('submissions')
        .where('assignmentId', '==', assignmentId)
        .where('status', '==', 'not_submitted')
        .get();
    const requestedSet = new Set(studentDocIds);
    const pendingStudentDocIds = submissionSnap.docs
        .map((d) => d.data())
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
        const student = { id: doc.id, ...doc.data() };
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
                        text: buildReminderMessage(student.name, assignment.title, dueDateLabel, isOverdue),
                    },
                ],
            });
            sent++;
        }
        catch (err) {
            console.error(`[sendAssignmentRoomReminder] LINE push failed for studentDocId=${doc.id}:`, err);
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
});
exports.sendAssignmentGroupSummary = (0, https_1.onCall)({
    region: 'asia-southeast1',
    secrets: [LINE_CHANNEL_ACCESS_TOKEN],
}, async (request) => {
    if (!request.auth?.uid) {
        throw new https_1.HttpsError('unauthenticated', 'Authentication required.');
    }
    const assignmentId = String(request.data?.assignmentId || '').trim();
    if (!assignmentId) {
        throw new https_1.HttpsError('invalid-argument', 'assignmentId is required.');
    }
    const assignmentSnap = await db.collection('assignments').doc(assignmentId).get();
    if (!assignmentSnap.exists) {
        throw new https_1.HttpsError('not-found', 'Assignment not found.');
    }
    const assignment = { id: assignmentSnap.id, ...assignmentSnap.data() };
    const uid = request.auth.uid;
    const callerIsAdmin = await isAdminUser(uid);
    if (!callerIsAdmin && assignment.teacherId !== uid) {
        throw new https_1.HttpsError('permission-denied', 'You cannot send group summary for this assignment.');
    }
    const subjectSnap = await db.collection('subjects').doc(assignment.subjectId).get();
    if (!subjectSnap.exists) {
        throw new https_1.HttpsError('not-found', 'Subject not found.');
    }
    const subject = { id: subjectSnap.id, ...subjectSnap.data() };
    if (!subject.lineGroupId) {
        throw new https_1.HttpsError('failed-precondition', 'This subject has no linked LINE group.');
    }
    const submissionsSnap = await db
        .collection('submissions')
        .where('assignmentId', '==', assignment.id)
        .where('status', '==', 'not_submitted')
        .get();
    const pendingStudentDocIds = submissionsSnap.docs
        .map((doc) => doc.data())
        .map((submission) => submission.studentId);
    const studentDocs = pendingStudentDocIds.length > 0
        ? await db.getAll(...pendingStudentDocIds.map((id) => db.collection('students').doc(id)))
        : [];
    const students = studentDocs
        .filter((doc) => doc.exists)
        .map((doc) => ({ id: doc.id, ...doc.data() }));
    const lineClient = new bot_sdk_1.messagingApi.MessagingApiClient({
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
});
// ─── Scheduled Function ───────────────────────────────────────────────────────
/**
 * Disabled scheduled reminder job.
 * Kept as a deployed no-op so the system no longer sends automatic LINE
 * reminders; all reminder delivery now happens only when a teacher triggers it
 * from the application.
 */
exports.sendAssignmentReminders = (0, scheduler_1.onSchedule)({
    schedule: '0 8 * * *',
    timeZone: 'Asia/Bangkok',
    region: 'asia-southeast1',
}, async (_event) => {
    console.log('[sendAssignmentReminders] Scheduled reminders are disabled. Manual sends only.');
});
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
//# sourceMappingURL=index.js.map