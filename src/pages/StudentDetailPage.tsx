import { ArrowLeft, Trash2, User } from 'lucide-react';
import { Attendance, Score } from '../types';
import { StudentDetailPageProps } from '../types/views/student';
import { getStudentAttendanceRate, getStudentAverageScore, formatStudentYear } from '../utils/domain/studentMetrics';
import { StudentSummaryCards } from '../components/student/StudentSummaryCards';
import { StudentAttendanceHistory } from '../components/student/StudentAttendanceHistory';
import { StudentScoresHistory } from '../components/student/StudentScoresHistory';

export function StudentDetailPage({
  student,
  attendance,
  scores,
  subjects,
  onBack,
  onDelete,
}: StudentDetailPageProps) {
  if (!student) return null;

  const studentAttendance = attendance.filter((a: Attendance) => a.studentId === student.studentId);
  const studentScores = scores.filter((s: Score) => s.studentId === student.studentId);

  const attendanceRate = getStudentAttendanceRate(studentAttendance);
  const avgScore = getStudentAverageScore(studentScores);

  return (
    <div className="space-y-8">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors font-medium"
      >
        <ArrowLeft className="w-5 h-5" />
        กลับไปดูรายชื่อนักเรียน
      </button>

      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-primary text-white rounded-3xl flex items-center justify-center text-3xl font-bold">
              {student.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-4xl font-bold text-gray-900">{student.name}</h2>
              <div className="flex items-center gap-3 mt-2 text-gray-500">
                <User className="w-4 h-4" />
                <span>{student.studentId}</span>
                <span>•</span>
                <span>ชั้นปี {formatStudentYear(student.year)} {student.department}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onDelete}
            className="flex items-center gap-2 px-6 py-3 bg-red-50 text-red-600 rounded-2xl font-bold hover:bg-red-100 transition-all active:scale-95"
          >
            <Trash2 className="w-5 h-5" />
            ลบนักเรียน
          </button>
        </div>
      </div>

      <StudentSummaryCards
        attendanceRate={attendanceRate}
        avgScore={avgScore}
        totalRecords={studentAttendance.length + studentScores.length}
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <StudentAttendanceHistory attendance={studentAttendance} subjects={subjects} />
        <StudentScoresHistory scores={studentScores} subjects={subjects} />
      </div>
    </div>
  );
}
