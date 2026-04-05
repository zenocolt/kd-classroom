import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { Attendance, Subject } from '../../types';
import { StatusBadge } from '../StatusBadge';

interface StudentAttendanceHistoryProps {
  attendance: Attendance[];
  subjects: Subject[];
}

export function StudentAttendanceHistory({ attendance, subjects }: StudentAttendanceHistoryProps) {
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-page-bg flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-900">ประวัติการเข้าเรียน</h3>
        <Calendar className="w-5 h-5 text-gray-400" />
      </div>
      <div className="max-h-[400px] overflow-y-auto">
        {attendance.length === 0 ? (
          <div className="p-10 text-center text-gray-400 italic">ไม่พบประวัติการเข้าเรียน</div>
        ) : (
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-white shadow-sm">
              <tr className="text-[10px] uppercase tracking-widest font-bold text-gray-400">
                <th className="px-6 py-4">วันที่</th>
                <th className="px-6 py-4">รายวิชา</th>
                <th className="px-6 py-4 text-right">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-page-bg">
              {attendance.sort((a, b) => b.date.localeCompare(a.date)).map((record) => {
                const subject = subjects.find((s) => s.id === record.subjectId);
                return (
                  <tr key={record.id} className="hover:bg-page-bg/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-700">{format(new Date(record.date), 'MMM dd, yyyy')}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{subject ? subject.name : 'ทั่วไป'}</td>
                    <td className="px-6 py-4 text-right">
                      <StatusBadge status={record.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
