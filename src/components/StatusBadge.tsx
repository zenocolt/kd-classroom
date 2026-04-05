import { cn } from '../lib/utils';

const labels: Record<string, string> = {
  present: 'มาเรียน',
  absent: 'ขาดเรียน',
  late: 'สาย',
  sick: 'ลาป่วย',
  'not-marked': 'ยังไม่ได้เช็ค'
};

const styles: Record<string, string> = {
  present: 'bg-green-100 text-green-700',
  absent: 'bg-red-100 text-red-700',
  late: 'bg-yellow-100 text-yellow-700',
  sick: 'bg-secondary/20 text-secondary',
  'not-marked': 'bg-page-bg text-gray-500'
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider', styles[status] || styles['not-marked'])}>
      {labels[status] || labels['not-marked']}
    </span>
  );
}
