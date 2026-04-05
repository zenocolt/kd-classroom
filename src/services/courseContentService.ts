import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface CourseContentPayload {
  title: string;
  description: string;
  url: string;
  subjectId: string;
  teacherId: string;
}

export interface CourseContentUpdatePayload {
  title: string;
  description: string;
  url: string;
}

export async function createCourseContent(payload: CourseContentPayload) {
  await addDoc(collection(db, 'course_content'), {
    ...payload,
    timestamp: serverTimestamp(),
  });
}

export async function updateCourseContent(contentId: string, payload: CourseContentUpdatePayload) {
  await updateDoc(doc(db, 'course_content', contentId), payload as unknown as Record<string, unknown>);
}

export async function deleteCourseContent(contentId: string) {
  await deleteDoc(doc(db, 'course_content', contentId));
}
