import { Attendance, Score, Student, Subject } from '../types';

export interface ConsecutiveAbsenceStudent {
  student: Student;
  consecutiveDays: number;
  lastAbsenceDate: string;
}

export interface AssignmentStatus {
  description: string;
  subjectId: string;
  totalStudents: number;
  submittedCount: number;
  pendingCount: number;
  subjectName?: string;
}

export function getStudentsWithConsecutiveAbsences(
  students: Student[],
  attendance: Attendance[],
  consecutiveDaysThreshold: number = 3
): ConsecutiveAbsenceStudent[] {
  const result: ConsecutiveAbsenceStudent[] = [];

  for (const student of students) {
    const studentAttendance = attendance
      .filter((a) => a.studentId === student.studentId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (studentAttendance.length === 0) continue;

    let consecutiveCount = 0;
    let lastAbsenceDate = '';

    for (const record of studentAttendance) {
      if (record.status === 'absent') {
        consecutiveCount++;
        if (!lastAbsenceDate) {
          lastAbsenceDate = record.date;
        }
      } else {
        if (consecutiveCount >= consecutiveDaysThreshold) {
          result.push({
            student,
            consecutiveDays: consecutiveCount,
            lastAbsenceDate
          });
        }
        consecutiveCount = 0;
        lastAbsenceDate = '';
      }
    }

    if (consecutiveCount >= consecutiveDaysThreshold) {
      result.push({
        student,
        consecutiveDays: consecutiveCount,
        lastAbsenceDate
      });
    }
  }

  return result;
}

export function getOverdueAssignments(students: Student[], subjects: Subject[], scores: Score[]): AssignmentStatus[] {
  const assignmentMap = new Map<string, AssignmentStatus>();
  const assignmentScores = scores.filter((s) => s.type === 'assignment');

  assignmentScores.forEach((score) => {
    const key = `${score.subjectId}-${score.description}`;
    if (!assignmentMap.has(key)) {
      const subject = subjects.find((s) => s.id === score.subjectId);
      assignmentMap.set(key, {
        description: score.description,
        subjectId: score.subjectId,
        totalStudents: students.length,
        submittedCount: 0,
        pendingCount: 0,
        subjectName: subject?.name
      });
    }
  });

  assignmentMap.forEach((assignment, key) => {
    const [subjectId, description] = key.split('-');
    const submissionsByStudent = new Set<string>();

    assignmentScores.forEach((score) => {
      if (score.subjectId === subjectId && score.description === description) {
        submissionsByStudent.add(score.studentId);
      }
    });

    assignment.submittedCount = submissionsByStudent.size;
    assignment.pendingCount = assignment.totalStudents - assignment.submittedCount;
  });

  return Array.from(assignmentMap.values())
    .sort((a, b) => b.pendingCount - a.pendingCount)
    .slice(0, 5);
}
