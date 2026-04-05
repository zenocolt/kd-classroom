import { AlertCircle, BookOpen, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';
import { Attendance, Score, Student, Subject } from '../../types';
import { getOverdueAssignments, getStudentsWithConsecutiveAbsences } from '../../utils/analytics';

interface QuickInsightsProps {
  students: Student[];
  subjects: Subject[];
  attendance: Attendance[];
  scores: Score[];
}

export function QuickInsights({ students, subjects, attendance, scores }: QuickInsightsProps) {
  const consecutiveAbsences = getStudentsWithConsecutiveAbsences(students, attendance, 3);
  const overdueAssignments = getOverdueAssignments(students, subjects, scores);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-primary" />
          ข้อมูลเชิงลึก (Quick Insights)
        </h3>
        <p className="text-gray-500">ติดตามสุขภาพห้องเรียนแบบ real-time</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-red-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-gray-900">นักเรียนที่ขาดเรียนมากกว่า 3 วัน</h4>
                <p className="text-xs text-gray-500">ต้องการการติดตามของครู</p>
              </div>
            </div>
            <span className="bg-red-600 text-white px-3 py-1 rounded-full font-bold text-lg">
              {consecutiveAbsences.length}
            </span>
          </div>

          {consecutiveAbsences.length > 0 ? (
            <div className="space-y-3">
              {consecutiveAbsences.slice(0, 5).map((absence) => (
                <motion.div
                  key={absence.student.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-4 bg-red-50 rounded-2xl border border-red-200 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center font-bold text-red-600 border border-red-200">
                      {absence.student.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{absence.student.name}</p>
                      <p className="text-xs text-gray-500">{absence.student.studentId}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-600">{absence.consecutiveDays} วัน</p>
                    <p className="text-[10px] text-gray-400">ขาดติดต่อกัน</p>
                  </div>
                </motion.div>
              ))}
              {consecutiveAbsences.length > 5 && (
                <p className="text-sm text-gray-500 text-center pt-2">+{consecutiveAbsences.length - 5} นักเรียนอื่นๆ</p>
              )}
            </div>
          ) : (
            <div className="p-6 bg-green-50 rounded-2xl border border-green-200 text-center">
              <p className="text-green-700 font-semibold">✓ ไม่มีนักเรียนที่ขาดติดต่อกันเกิน 3 วัน</p>
            </div>
          )}
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-yellow-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-gray-900">งานที่ค้างส่งมากที่สุด</h4>
                <p className="text-xs text-gray-500">นักเรียนยังไม่ได้ส่ง</p>
              </div>
            </div>
          </div>

          {overdueAssignments.length > 0 ? (
            <div className="space-y-3">
              {overdueAssignments.map((assignment) => (
                <motion.div
                  key={`${assignment.subjectId}-${assignment.description}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-4 bg-yellow-50 rounded-2xl border border-yellow-200"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 line-clamp-2">{assignment.description}</p>
                      <p className="text-xs text-gray-500 mt-1">{assignment.subjectName}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <div className="h-2 bg-yellow-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-yellow-600 transition-all duration-300"
                            style={{
                              width: `${assignment.submittedCount > 0 ? (assignment.submittedCount / assignment.totalStudents) * 100 : 0}%`
                            }}
                          />
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-gray-600 w-12">
                        {assignment.submittedCount}/{assignment.totalStudents}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-yellow-600">{assignment.pendingCount}</p>
                      <p className="text-[10px] text-gray-400">ค้างส่ง</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="p-6 bg-green-50 rounded-2xl border border-green-200 text-center">
              <p className="text-green-700 font-semibold">✓ ไม่มีงานที่ค้างส่ง ทั้งหมดเสร็จสมบูรณ์!</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
