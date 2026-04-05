import { Timestamp } from 'firebase/firestore';

export interface Student {
  id: string;
  studentId: string;
  name: string;
  department: string;
  year: string;
  room?: string;
  teacherId: string;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  level: string;
  room?: string;
  department: string;
  teacherId: string;
}

export interface Attendance {
  id: string;
  studentId: string;
  subjectId?: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'sick';
  teacherId: string;
}

export interface Score {
  id: string;
  studentId: string;
  subjectId: string;
  type: 'assignment' | 'midterm' | 'final' | 'activity';
  score: number;
  maxScore: number;
  description: string;
  teacherId: string;
  timestamp: Timestamp;
}

export interface Slide {
  id: string;
  title: string;
  url: string;
  subjectId: string;
  teacherId: string;
  timestamp: Timestamp;
}

export interface CourseContent {
  id: string;
  title: string;
  description: string;
  url: string;
  subjectId: string;
  teacherId: string;
  timestamp: Timestamp;
}

export interface SemesterCalendar {
  startDate: string;
  endDate: string;
  startNote: string;
  endNote: string;
  updatedAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'teacher';
  photoURL?: string;
  semesterCalendar?: SemesterCalendar;
  appBrandName?: string;
  appBrandSubtitle?: string;
  appLogoUrl?: string;
  appPrimaryColor?: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}
