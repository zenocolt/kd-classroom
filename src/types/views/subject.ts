import { User as FirebaseUser } from 'firebase/auth';
import { Attendance, CourseContent, Score, Slide, Student, Subject } from '../index';

export interface SubjectDashboardProps {
  subject: Subject | null;
  students: Student[];
  attendance: Attendance[];
  scores: Score[];
  slides: Slide[];
  courseContent: CourseContent[];
  user: FirebaseUser;
  subView: 'main' | 'slides' | 'content';
  onSubViewChange: (view: 'main' | 'slides' | 'content') => void;
  onBack: () => void;
  onNavigateAttendance: () => void;
  onNavigateAssignments: () => void;
}

export interface SlidesViewProps {
  subject: Subject;
  slides: Slide[];
  user: FirebaseUser;
  onBack: () => void;
}

export interface CourseContentViewProps {
  subject: Subject;
  content: CourseContent[];
  user: FirebaseUser;
  onBack: () => void;
}
