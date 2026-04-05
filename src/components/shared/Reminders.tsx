import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { RemindersProps } from '../../types/views/shared';

export function Reminders({ students, scores }: RemindersProps) {
  const [showReminders, setShowReminders] = useState(false);

  const termEndDate = new Date('2026-04-15');
  const today = new Date();
  const daysUntilEnd = Math.ceil((termEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const isNearEnd = daysUntilEnd > 0 && daysUntilEnd <= 14;

  const reminders = [] as { id: string; title: string; message: string; type: 'warning' | 'info' }[];

  if (isNearEnd) {
    reminders.push({
      id: 'term-end',
      title: 'ใกล้สิ้นสุดภาคเรียน',
      message: `ภาคเรียนจะสิ้นสุดในอีก ${daysUntilEnd} วัน โปรดสรุปข้อมูลทั้งหมด`,
      type: 'warning'
    });
  }

  const studentsWithMissingScores = students.filter((student) => {
    const studentScores = scores.filter((s) => s.studentId === student.studentId);
    return studentScores.length === 0;
  });

  if (studentsWithMissingScores.length > 0) {
    reminders.push({
      id: 'missing-scores',
      title: 'คะแนนที่ค้างอยู่',
      message: `มีนักเรียน ${studentsWithMissingScores.length} คนที่ยังไม่มีการบันทึกคะแนน`,
      type: 'info'
    });
  }

  if (reminders.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setShowReminders(!showReminders)}
        className="relative p-3 bg-white rounded-2xl shadow-sm border border-gray-100 hover:bg-page-bg transition-colors"
      >
        <AlertCircle className={cn('w-6 h-6', reminders.some((r) => r.type === 'warning') ? 'text-red-500' : 'text-primary')} />
        <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 border-2 border-white rounded-full animate-pulse"></span>
      </button>

      <AnimatePresence>
        {showReminders && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowReminders(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-4 w-80 bg-white rounded-3xl shadow-2xl border border-gray-100 z-50 p-6 space-y-4"
            >
              <h4 className="font-bold text-gray-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-primary" />
                การแจ้งเตือนทางวิชาการ
              </h4>
              <div className="space-y-3">
                {reminders.map((r) => (
                  <div key={r.id} className={cn(
                    'p-4 rounded-2xl text-sm',
                    r.type === 'warning' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-secondary/10 text-primary border border-secondary/20'
                  )}>
                    <p className="font-bold mb-1">{r.title}</p>
                    <p className="text-xs opacity-80">{r.message}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setShowReminders(false)}
                className="w-full py-2 text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors"
              >
                ปิด
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
