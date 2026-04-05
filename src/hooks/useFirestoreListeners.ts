import { useEffect, useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import {
  Attendance,
  CourseContent,
  OperationType,
  Score,
  Slide,
  Student,
  Subject,
  UserProfile,
} from '../types';
import { handleFirestoreError } from '../services/firestoreError';

function useScopedCollection<T>(
  collectionName: string,
  user: FirebaseUser | null,
  profile: UserProfile | null,
  enabled: boolean,
  mapper: (docData: any) => T
) {
  const [data, setData] = useState<T[]>([]);

  useEffect(() => {
    if (!enabled || !user || !profile) {
      setData([]);
      return;
    }

    const scopedQuery = profile.role === 'admin'
      ? collection(db, collectionName)
      : query(collection(db, collectionName), where('teacherId', '==', user.uid));

    const unsubscribe = onSnapshot(
      scopedQuery,
      (snapshot) => setData(snapshot.docs.map((d) => mapper({ id: d.id, ...d.data() }))),
      (error) => handleFirestoreError(error, OperationType.GET, collectionName)
    );

    return unsubscribe;
  }, [collectionName, enabled, profile, user]);

  return data;
}

export function useStudents(user: FirebaseUser | null, profile: UserProfile | null, enabled: boolean) {
  return useScopedCollection<Student>('students', user, profile, enabled, (docData) => docData as Student);
}

export function useSubjects(user: FirebaseUser | null, profile: UserProfile | null, enabled: boolean) {
  return useScopedCollection<Subject>('subjects', user, profile, enabled, (docData) => docData as Subject);
}

export function useAttendance(user: FirebaseUser | null, profile: UserProfile | null, enabled: boolean) {
  return useScopedCollection<Attendance>('attendance', user, profile, enabled, (docData) => docData as Attendance);
}

export function useScores(user: FirebaseUser | null, profile: UserProfile | null, enabled: boolean) {
  return useScopedCollection<Score>('scores', user, profile, enabled, (docData) => docData as Score);
}

export function useSlides(user: FirebaseUser | null, profile: UserProfile | null, enabled: boolean) {
  return useScopedCollection<Slide>('slides', user, profile, enabled, (docData) => docData as Slide);
}

export function useCourseContent(user: FirebaseUser | null, profile: UserProfile | null, enabled: boolean) {
  return useScopedCollection<CourseContent>('course_content', user, profile, enabled, (docData) => docData as CourseContent);
}

export function useUsers(profile: UserProfile | null, enabled: boolean) {
  const [users, setUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (!enabled || profile?.role !== 'admin') {
      setUsers([]);
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, 'users'),
      (snapshot) => setUsers(snapshot.docs.map((d) => d.data() as UserProfile)),
      (error) => handleFirestoreError(error, OperationType.GET, 'users')
    );

    return unsubscribe;
  }, [enabled, profile?.role]);

  return users;
}
