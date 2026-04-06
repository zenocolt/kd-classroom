import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase';
import { Timestamp } from 'firebase/firestore';

// ─── Assignment CRUD ──────────────────────────────────────────────────────────

export interface AssignmentPayload {
  title: string;
  description: string;
  subjectId: string;
  teacherId: string;
  due_date: Timestamp;
}

export async function createAssignment(payload: AssignmentPayload) {
  await addDoc(collection(db, 'assignments'), {
    ...payload,
    createdAt: serverTimestamp(),
  });
}

export async function updateAssignment(
  assignmentId: string,
  payload: Partial<Omit<AssignmentPayload, 'teacherId'>>
) {
  await updateDoc(doc(db, 'assignments', assignmentId), payload);
}

export async function deleteAssignment(assignmentId: string) {
  await deleteDoc(doc(db, 'assignments', assignmentId));
}

// ─── Submission CRUD ──────────────────────────────────────────────────────────

export interface SubmissionPayload {
  assignmentId: string;
  studentId: string;
  status: 'submitted' | 'not_submitted';
  teacherId: string;
}

export async function upsertSubmission(
  existingSubmissionId: string | null,
  payload: SubmissionPayload
) {
  if (existingSubmissionId) {
    // Toggle status on existing record
    await updateDoc(doc(db, 'submissions', existingSubmissionId), {
      status: payload.status,
      submittedAt: payload.status === 'submitted' ? serverTimestamp() : null,
    });
  } else {
    await addDoc(collection(db, 'submissions'), {
      ...payload,
      submittedAt: payload.status === 'submitted' ? serverTimestamp() : null,
    });
  }
}

/** Bulk-initialise submission records (not_submitted) for all students in one batch. */
export async function initSubmissionsForAssignment(
  assignmentId: string,
  studentIds: string[],
  teacherId: string
) {
  const chunkSize = 450; // Firestore batch limit is 500 operations

  for (let i = 0; i < studentIds.length; i += chunkSize) {
    const batch = writeBatch(db);
    studentIds.slice(i, i + chunkSize).forEach((studentId) => {
      const ref = doc(collection(db, 'submissions'));
      batch.set(ref, {
        assignmentId,
        studentId,
        status: 'not_submitted',
        submittedAt: null,
        teacherId,
      });
    });
    await batch.commit();
  }
}

// ─── LINE room reminder action ───────────────────────────────────────────────

export interface RoomReminderResult {
  requested: number;
  pending: number;
  sent: number;
  skippedNoLine: number;
  failed: number;
}

export interface GroupSummaryResult {
  pending: number;
  subjectId: string;
  subjectName: string;
  groupId: string;
}

export async function sendAssignmentRoomReminder(
  assignmentId: string,
  studentDocIds: string[]
): Promise<RoomReminderResult> {
  const callable = httpsCallable<
    { assignmentId: string; studentDocIds: string[] },
    RoomReminderResult
  >(functions, 'sendAssignmentRoomReminder');

  const result = await callable({ assignmentId, studentDocIds });
  return result.data;
}

export async function sendAssignmentGroupSummary(
  assignmentId: string
): Promise<GroupSummaryResult> {
  const callable = httpsCallable<{ assignmentId: string }, GroupSummaryResult>(
    functions,
    'sendAssignmentGroupSummary'
  );

  const result = await callable({ assignmentId });
  return result.data;
}
