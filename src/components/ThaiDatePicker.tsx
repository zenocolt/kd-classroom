import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '../lib/utils';

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const THAI_DAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

interface ThaiDatePickerProps {
  value?: Date;
  onChange?: (date: Date) => void;
  className?: string;
  highlightedDates?: { date: Date; type?: 'start' | 'end' }[];
}

export function ThaiDatePicker({ value, onChange, className, highlightedDates = [] }: ThaiDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(value || new Date());
  const [viewDate, setViewDate] = useState(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLDivElement>(null);

  const selectedDate = value || currentDate;

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const dropdownWidth = 320;
      const spaceRight = window.innerWidth - rect.left;
      const spaceBottom = window.innerHeight - rect.bottom;
      const style: React.CSSProperties = {};

      // horizontal: prefer left-aligned, switch to right-aligned if not enough space
      if (spaceRight < dropdownWidth) {
        style.right = 0;
        style.left = 'auto';
      } else {
        style.left = 0;
        style.right = 'auto';
      }

      // vertical: prefer below, switch to above if not enough space
      if (spaceBottom < 380) {
        style.bottom = '100%';
        style.top = 'auto';
        style.marginBottom = '12px';
        style.marginTop = '0';
      } else {
        style.top = '100%';
        style.bottom = 'auto';
        style.marginTop = '12px';
        style.marginBottom = '0';
      }

      setDropdownStyle(style);
    }
  }, [isOpen]);

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();
  const toDateKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

  const highlightedDateMap = highlightedDates.reduce<Record<string, 'start' | 'end'>>((acc, item) => {
    acc[toDateKey(item.date)] = item.type || 'start';
    return acc;
  }, {});

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleDateClick = (day: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    setCurrentDate(newDate);
    onChange?.(newDate);
    setIsOpen(false);
  };

  const renderDays = () => {
    const totalDays = daysInMonth(viewDate.getFullYear(), viewDate.getMonth());
    const startDay = firstDayOfMonth(viewDate.getFullYear(), viewDate.getMonth());
    const days = [];

    // Empty slots for previous month
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-10 w-10" />);
    }

    // Days of current month
    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), d);
      const highlightType = highlightedDateMap[toDateKey(date)];
      const isSelected = 
        selectedDate.getDate() === d && 
        selectedDate.getMonth() === viewDate.getMonth() && 
        selectedDate.getFullYear() === viewDate.getFullYear();
      
      const isToday = 
        new Date().getDate() === d && 
        new Date().getMonth() === viewDate.getMonth() && 
        new Date().getFullYear() === viewDate.getFullYear();

      days.push(
        <button
          key={d}
          onClick={() => handleDateClick(d)}
          className={cn(
            "h-10 w-10 rounded-xl flex items-center justify-center text-sm font-medium transition-all",
            isSelected 
              ? "bg-primary text-white shadow-lg shadow-primary/30 scale-110" 
              : highlightType === 'start'
                ? "bg-green-100 text-green-700 border border-green-300"
                : highlightType === 'end'
                  ? "bg-rose-100 text-rose-700 border border-rose-300"
                  : isToday
                ? "bg-secondary/20 text-primary border border-primary/20"
                : "text-gray-600 hover:bg-page-bg hover:text-primary"
          )}
        >
          {d}
        </button>
      );
    }

    return days;
  };

  const formatThaiDate = (date: Date) => {
    const day = date.getDate();
    const month = THAI_MONTHS[date.getMonth()];
    const year = date.getFullYear() + 543;
    return `${day} ${month} ${year}`;
  };

  return (
    <div ref={triggerRef} className={cn("relative inline-block", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-5 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all text-gray-700 font-medium"
      >
        <CalendarIcon className="w-5 h-5 text-primary" />
        <span>{formatThaiDate(selectedDate)}</span>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute z-50 bg-white p-6 rounded-[2rem] shadow-2xl border border-gray-50 w-[320px] animate-in fade-in zoom-in duration-200" style={dropdownStyle}>
            <div className="flex items-center justify-between mb-6">
              <button 
                onClick={handlePrevMonth}
                className="p-2 hover:bg-page-bg rounded-xl text-gray-400 hover:text-primary transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="text-center">
                <div className="font-bold text-gray-900">
                  {THAI_MONTHS[viewDate.getMonth()]}
                </div>
                <div className="text-xs font-bold text-primary opacity-60">
                  พ.ศ. {viewDate.getFullYear() + 543}
                </div>
              </div>
              <button 
                onClick={handleNextMonth}
                className="p-2 hover:bg-page-bg rounded-xl text-gray-400 hover:text-primary transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {THAI_DAYS.map(day => (
                <div key={day} className="h-10 w-10 flex items-center justify-center text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {renderDays()}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-50 flex justify-center">
              <button 
                onClick={() => {
                  const today = new Date();
                  setCurrentDate(today);
                  setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
                  onChange?.(today);
                  setIsOpen(false);
                }}
                className="text-xs font-bold text-primary hover:underline"
              >
                กลับไปยังวันนี้
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
