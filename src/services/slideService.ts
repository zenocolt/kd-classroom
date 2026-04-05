import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface SlidePayload {
  title: string;
  url: string;
  subjectId: string;
  teacherId: string;
}

export interface SlideUpdatePayload {
  title: string;
  url: string;
}

export async function createSlide(payload: SlidePayload) {
  await addDoc(collection(db, 'slides'), {
    ...payload,
    timestamp: serverTimestamp(),
  });
}

export async function updateSlide(slideId: string, payload: SlideUpdatePayload) {
  await updateDoc(doc(db, 'slides', slideId), payload as unknown as Record<string, unknown>);
}

export async function deleteSlide(slideId: string) {
  await deleteDoc(doc(db, 'slides', slideId));
}
