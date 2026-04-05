import { deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';

export interface DeleteStudentCascadeInput {
  studentDocId: string;
  attendanceIds: string[];
  scoreIds: string[];
}

export async function deleteStudentCascade(input: DeleteStudentCascadeInput) {
  await deleteDoc(doc(db, 'students', input.studentDocId));

  for (const attendanceId of input.attendanceIds) {
    await deleteDoc(doc(db, 'attendance', attendanceId));
  }

  for (const scoreId of input.scoreIds) {
    await deleteDoc(doc(db, 'scores', scoreId));
  }
}

export interface DeleteStudentsCascadeBulkInput {
  studentDocIds: string[];
  attendanceIds: string[];
  scoreIds: string[];
}

export async function deleteStudentsCascadeBulk(input: DeleteStudentsCascadeBulkInput) {
  const refs = [
    ...input.studentDocIds.map((id) => doc(db, 'students', id)),
    ...input.attendanceIds.map((id) => doc(db, 'attendance', id)),
    ...input.scoreIds.map((id) => doc(db, 'scores', id)),
  ];

  // Firestore batch supports up to 500 operations. Keep a safety margin.
  const chunkSize = 450;
  for (let i = 0; i < refs.length; i += chunkSize) {
    const batch = writeBatch(db);
    refs.slice(i, i + chunkSize).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
}
