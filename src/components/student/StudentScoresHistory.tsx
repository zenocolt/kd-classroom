import { Trophy } from 'lucide-react';
import { Score, Subject } from '../../types';
import { getScoreTypeLabel } from '../../utils/domain/studentMetrics';

interface StudentScoresHistoryProps {
  scores: Score[];
  subjects: Subject[];
}

export function StudentScoresHistory({ scores, subjects }: StudentScoresHistoryProps) {
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-page-bg flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-900">คะแนนและเกรด</h3>
        <Trophy className="w-5 h-5 text-gray-400" />
      </div>
      <div className="max-h-[400px] overflow-y-auto">
        {scores.length === 0 ? (
          <div className="p-10 text-center text-gray-400 italic">ไม่พบประวัติคะแนน</div>
        ) : (
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-white shadow-sm">
              <tr className="text-[10px] uppercase tracking-widest font-bold text-gray-400">
                <th className="px-6 py-4">ประเภท</th>
                <th className="px-6 py-4">รายวิชา</th>
                <th className="px-6 py-4 text-right">คะแนน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-page-bg">
              {scores.sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis()).map((score) => {
                const subject = subjects.find((s) => s.id === score.subjectId);
                return (
                  <tr key={score.id} className="hover:bg-page-bg/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold uppercase tracking-wider text-primary bg-secondary/20 px-2 py-1 rounded-lg">
                        {getScoreTypeLabel(score.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{subject ? subject.name : 'ไม่ทราบวิชา'}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-bold text-gray-900">{score.score}/{score.maxScore}</span>
                        <span className="text-[10px] text-gray-400">{((score.score / score.maxScore) * 100).toFixed(0)}%</span>
                      </div>
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
