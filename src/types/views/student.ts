import { Attendance, Score, Student, Subject } from '../index';

export interface StudentDetailPageProps {
  student: Student | null;
  attendance: Attendance[];
  scores: Score[];
  subjects: Subject[];
  onBack: () => void;
  onDelete: () => void;
}
