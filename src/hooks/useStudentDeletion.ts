import { useMemo, useState } from 'react';
import { Attendance, OperationType, Score, Student } from '../types';
import { handleFirestoreError } from '../services/firestoreError';
import { deleteStudentCascade } from '../services/studentService';

interface UseStudentDeletionInput {
  student: Student | null;
  attendance: Attendance[];
  scores: Score[];
  onDeleted: () => void;
}

export function useStudentDeletion({ student, attendance, scores, onDeleted }: UseStudentDeletionInput) {
  const [isDeletingStudent, setIsDeletingStudent] = useState(false);

  const scopedAttendance = useMemo(() => {
    if (!student) return [];
    return attendance.filter((a) => a.studentId === student.studentId);
  }, [attendance, student]);

  const scopedScores = useMemo(() => {
    if (!student) return [];
    return scores.filter((s) => s.studentId === student.studentId);
  }, [scores, student]);

  const requestDelete = () => setIsDeletingStudent(true);
  const cancelDelete = () => setIsDeletingStudent(false);

  const confirmDelete = async () => {
    if (!student) return;

    try {
      await deleteStudentCascade({
        studentDocId: student.id,
        attendanceIds: scopedAttendance.map((a) => a.id),
        scoreIds: scopedScores.map((s) => s.id),
      });
      setIsDeletingStudent(false);
      onDeleted();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'students');
    }
  };

  return {
    isDeletingStudent,
    scopedAttendance,
    scopedScores,
    requestDelete,
    cancelDelete,
    confirmDelete,
  };
}
