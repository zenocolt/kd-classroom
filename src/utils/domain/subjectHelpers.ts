import { Student, Subject } from '../../types';

export const SUBJECT_CARD_GRADIENTS = [
  'bg-gradient-to-br from-primary to-primary/80',
  'bg-gradient-to-br from-secondary to-secondary/80',
  'bg-gradient-to-br from-accent to-accent/80',
  'bg-gradient-to-br from-primary via-secondary to-primary/70',
  'bg-gradient-to-br from-secondary via-accent to-secondary/70',
  'bg-gradient-to-br from-accent via-primary to-accent/70',
];

export function getSubjectCardGradient(index: number) {
  return SUBJECT_CARD_GRADIENTS[index % SUBJECT_CARD_GRADIENTS.length];
}

function isSameDepartment(studentDepartment: string, subjectDepartment: string) {
  return (
    studentDepartment === subjectDepartment ||
    (studentDepartment === 'Information Technology' && subjectDepartment === 'เทคโนโลยีสารสนเทศ') ||
    (studentDepartment === 'เทคโนโลยีสารสนเทศ' && subjectDepartment === 'Information Technology')
  );
}

export function doesStudentBelongToSubject(student: Student, subject: Subject) {
  const subjectRoom = subject.room || '1';
  const studentRoom = student.room || '1';

  return (
    isSameDepartment(student.department, subject.department) &&
    (student.year || '').trim() === (subject.level || '').trim() &&
    studentRoom === subjectRoom
  );
}
