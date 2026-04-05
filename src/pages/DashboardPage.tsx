import { Calendar, CalendarDays, CheckCircle, TrendingUp, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { ReactNode } from 'react';
import { Attendance, Score, SemesterCalendar, Student, Subject } from '../types';
import { ThaiDatePicker } from '../components/ThaiDatePicker';
import { QuickInsights } from '../components/dashboard/QuickInsights';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';

interface DashboardPageProps {
  students: Student[];
  subjects: Subject[];
  attendance: Attendance[];
  scores: Score[];
  semesterCalendar?: SemesterCalendar;
  reminders: ReactNode;
}

export function DashboardPage({ students, subjects, attendance, scores, semesterCalendar, reminders }: DashboardPageProps) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayAttendance = attendance.filter((a) => a.date === today);
  const presentCount = todayAttendance.filter((a) => a.status === 'present').length;
  const attendanceRate = students.length > 0 ? (presentCount / students.length) * 100 : 0;

  const formatThaiSummaryDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '-';
    return format(date, 'dd/MM/') + (date.getFullYear() + 543);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6 md:space-y-10"
    >
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-1 sm:mb-2">แดชบอร์ด</h2>
          <p className="text-sm sm:text-base text-gray-500">ยินดีต้อนรับกลับมา นี่คือสิ่งที่เกิดขึ้นในวันนี้</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <ThaiDatePicker />
          {reminders}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
        <StatCard icon={<Users className="text-secondary" />} label="นักเรียนทั้งหมด" value={students.length.toString()} bgColor="bg-secondary/20" />
        <StatCard
          icon={<CheckCircle className="text-green-600" />}
          label="การเข้าเรียนวันนี้"
          value={`${attendanceRate.toFixed(0)}%`}
          subValue={`มาเรียน ${presentCount}/${students.length} คน`}
          bgColor="bg-green-100"
        />
        <StatCard
          icon={<TrendingUp className="text-accent" />}
          label="คะแนนเฉลี่ย"
          value={scores.length > 0 ? (scores.reduce((acc, s) => acc + (s.score / s.maxScore), 0) / scores.length * 100).toFixed(1) + '%' : '0%'}
          bgColor="bg-accent/20"
        />
      </div>

      <QuickInsights students={students} subjects={subjects} attendance={attendance} scores={scores} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-green-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-green-700">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">วันเปิดเรียน</h3>
              <p className="text-xs text-gray-500">{formatThaiSummaryDate(semesterCalendar?.startDate)}</p>
            </div>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">{semesterCalendar?.startNote?.trim() || 'ยังไม่ได้บันทึกโน้ตวันเปิดเรียน'}</p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-rose-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center text-rose-700">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">วันปิดภาคเรียน</h3>
              <p className="text-xs text-gray-500">{formatThaiSummaryDate(semesterCalendar?.endDate)}</p>
            </div>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">{semesterCalendar?.endNote?.trim() || 'ยังไม่ได้บันทึกโน้ตวันปิดภาคเรียน'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10">
        <div className="bg-white p-5 sm:p-8 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-5 sm:mb-8">
            <h3 className="text-xl font-bold text-gray-900">การเข้าเรียนล่าสุด</h3>
            <Calendar className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3 sm:space-y-4">
            {students.slice(0, 5).map((student) => {
              const status = todayAttendance.find((a) => a.studentId === student.studentId)?.status || 'not-marked';
              return (
                <div key={student.id} className="flex items-center justify-between p-3 sm:p-4 rounded-2xl bg-page-bg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center font-bold text-primary border border-secondary/20">
                      {student.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{student.name}</p>
                      <p className="text-xs text-gray-500">{student.studentId}</p>
                    </div>
                  </div>
                  <StatusBadge status={status} />
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white p-5 sm:p-8 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-5 sm:mb-8">
            <h3 className="text-xl font-bold text-gray-900">นักเรียนที่มีผลการเรียนดีเด่น</h3>
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3 sm:space-y-4">
            {students.slice(0, 5).map((student) => {
              const studentScores = scores.filter((s) => s.studentId === student.studentId);
              const avg = studentScores.length > 0
                ? (studentScores.reduce((acc, s) => acc + (s.score / s.maxScore), 0) / studentScores.length * 100).toFixed(0)
                : 0;
              return (
                <div key={student.id} className="flex items-center justify-between p-3 sm:p-4 rounded-2xl bg-page-bg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center font-bold text-accent border border-accent/20">
                      {student.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{student.name}</p>
                      <p className="text-xs text-gray-500">{student.department}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">{avg}%</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">คะแนนเฉลี่ย</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
