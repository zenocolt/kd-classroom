import { CalendarDays, CheckCircle, Trophy } from 'lucide-react';

interface StudentSummaryCardsProps {
  attendanceRate: string;
  avgScore: string;
  totalRecords: number;
}

export function StudentSummaryCards({ attendanceRate, avgScore, totalRecords }: StudentSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
        <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center text-green-600">
          <CheckCircle className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">อัตราการเข้าเรียน</p>
          <p className="text-2xl font-bold text-gray-900">{attendanceRate}%</p>
        </div>
      </div>
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
        <div className="w-12 h-12 bg-accent/20 rounded-2xl flex items-center justify-center text-accent">
          <Trophy className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">คะแนนเฉลี่ย</p>
          <p className="text-2xl font-bold text-gray-900">{avgScore}%</p>
        </div>
      </div>
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
        <div className="w-12 h-12 bg-secondary/20 rounded-2xl flex items-center justify-center text-secondary">
          <CalendarDays className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">บันทึกทั้งหมด</p>
          <p className="text-2xl font-bold text-gray-900">{totalRecords}</p>
        </div>
      </div>
    </div>
  );
}
