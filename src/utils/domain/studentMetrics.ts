import { Attendance, Score } from '../../types';

export function getStudentAttendanceStats(attendance: Attendance[]) {
  const present = attendance.filter((a) => a.status === 'present').length;
  const absent = attendance.filter((a) => a.status === 'absent').length;
  const late = attendance.filter((a) => a.status === 'late').length;
  const sick = attendance.filter((a) => a.status === 'sick').length;
  const total = attendance.length;

  return { present, absent, late, sick, total };
}

export function getStudentAttendanceRate(attendance: Attendance[]) {
  const stats = getStudentAttendanceStats(attendance);
  if (stats.total === 0) return '0';
  return (((stats.present + stats.late) / stats.total) * 100).toFixed(1);
}

export function getStudentAverageScore(scores: Score[]) {
  if (scores.length === 0) return '0';
  return (scores.reduce((acc, s) => acc + (s.score / s.maxScore), 0) / scores.length * 100).toFixed(1);
}

export function getScoreTypeLabel(type: Score['type']) {
  if (type === 'assignment') return 'งานที่มอบหมาย';
  if (type === 'midterm') return 'สอบกลางภาค';
  if (type === 'final') return 'สอบปลายภาค';
  return 'กิจกรรม';
}

export function formatStudentYear(year: string) {
  const v = (year || '').trim();
  if (!v) return '-';
  if (/^\d+$/.test(v)) {
    if (v === '1' || v === '2' || v === '3') return `ปวช.${v}`;
  }
  return v;
}
