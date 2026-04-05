import React from 'react';
import { cn } from '../lib/utils';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
  bgColor: string;
}

export function StatCard({ icon, label, value, subValue, bgColor }: StatCardProps) {
  return (
    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex items-start gap-6">
      <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner', bgColor)}>
        {React.cloneElement(icon as React.ReactElement<{ className: string }>, { className: 'w-7 h-7' })}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
        <h4 className="text-3xl font-bold text-gray-900">{value}</h4>
        {subValue && <p className="text-xs text-gray-400 mt-1">{subValue}</p>}
      </div>
    </div>
  );
}
