import { addDoc, collection, deleteDoc, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';

export interface SubjectPayload {
  code: string;
  name: string;
  level: string;
  room: string;
  department: string;
  teacherId: string;
}

export async function createSubject(payload: SubjectPayload) {
  await addDoc(collection(db, 'subjects'), payload);
}

export async function updateSubject(subjectId: string, payload: Partial<SubjectPayload>) {
  await updateDoc(doc(db, 'subjects', subjectId), payload);
}

export async function deleteSubject(subjectId: string) {
  await deleteDoc(doc(db, 'subjects', subjectId));
}

export async function migrateSubjectRooms(subjectIds: string[], room: string) {
  const chunkSize = 450;

  for (let i = 0; i < subjectIds.length; i += chunkSize) {
    const batch = writeBatch(db);
    subjectIds.slice(i, i + chunkSize).forEach((subjectId) => {
      batch.update(doc(db, 'subjects', subjectId), { room });
    });
    await batch.commit();
  }
}
