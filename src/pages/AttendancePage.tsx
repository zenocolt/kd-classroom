import React, { useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { BookOpen, Calendar, ChevronDown, Search, Users } from 'lucide-react';
import { db } from '../firebase';
import { cn } from '../lib/utils';
import { ThaiDatePicker } from '../components/ThaiDatePicker';
import { StatusBadge } from '../components/StatusBadge';
import { Attendance, OperationType, Student, Subject } from '../types';
import { handleFirestoreError } from '../services/firestoreError';
import { doesStudentBelongToSubject } from '../utils/domain/subjectHelpers';

interface AttendancePageProps {
  students: Student[];
  subjects: Subject[];
  attendance: Attendance[];
  user: FirebaseUser;
}

export function AttendancePage({ students, subjects, attendance, user }: AttendancePageProps) {
  const [selectedDateObj, setSelectedDateObj] = useState(new Date());
  const selectedDate = format(selectedDateObj, 'yyyy-MM-dd');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [isSubjectOpen, setIsSubjectOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedSubjectObj = subjects.find((s) => s.id === selectedSubject);

  const studentsInSubject = selectedSubjectObj
    ? students.filter((s) => doesStudentBelongToSubject(s, selectedSubjectObj))
    : [];

  const filteredStudents = studentsInSubject
    .filter((s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.studentId.includes(search)
    )
    .sort((a, b) => a.studentId.localeCompare(b.studentId, undefined, { numeric: true, sensitivity: 'base' }));

  const markAttendance = async (studentId: string, status: Attendance['status']) => {
    const existing = attendance.find(
      (a) => a.studentId === studentId && a.date === selectedDate && (!selectedSubject || a.subjectId === selectedSubject)
    );

    try {
      if (existing) {
        await updateDoc(doc(db, 'attendance', existing.id), { status });
      } else {
        await addDoc(collection(db, 'attendance'), {
          studentId,
          subjectId: selectedSubject || null,
          date: selectedDate,
          status,
          teacherId: user.uid
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'attendance');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-bold text-gray-900 tracking-tight mb-2">การเช็คชื่อ</h2>
          <p className="text-gray-500">บันทึกและติดตามการมาเรียนของนักเรียนรายวัน</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <button
              onClick={() => setIsSubjectOpen((v) => !v)}
              className={cn(
                'flex items-center gap-3 px-5 py-3 bg-white border rounded-2xl shadow-sm hover:shadow-md transition-all text-sm font-medium min-w-[260px] justify-between',
                isSubjectOpen ? 'border-primary ring-2 ring-primary/20' : 'border-gray-100'
              )}
            >
              <div className="flex items-center gap-2 truncate">
                <BookOpen className="w-4 h-4 text-primary shrink-0" />
                <span className={cn('truncate', selectedSubject ? 'text-gray-800' : 'text-gray-400')}>
                  {selectedSubjectObj ? `${selectedSubjectObj.code} - ${selectedSubjectObj.name}` : 'เลือกวิชาที่ต้องการเช็คชื่อ'}
                </span>
              </div>
              <ChevronDown className={cn('w-4 h-4 text-gray-400 shrink-0 transition-transform', isSubjectOpen && 'rotate-180')} />
            </button>

            {isSubjectOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsSubjectOpen(false)} />
                <div className="absolute top-full mt-2 left-0 z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 w-full min-w-[320px] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  {subjects.length === 0 ? (
                    <div className="px-5 py-4 text-sm text-gray-400 text-center">ไม่มีรายวิชา</div>
                  ) : (
                    <ul className="py-2 max-h-64 overflow-y-auto">
                      {subjects.map((s) => (
                        <li key={s.id}>
                          <button
                            onClick={() => {
                              setSelectedSubject(s.id);
                              setSearch('');
                              setIsSubjectOpen(false);
                            }}
                            className={cn(
                              'w-full text-left px-5 py-3 text-sm transition-colors flex items-center gap-3',
                              selectedSubject === s.id ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-700 hover:bg-page-bg'
                            )}
                          >
                            <div className={cn('w-2 h-2 rounded-full shrink-0', selectedSubject === s.id ? 'bg-primary' : 'bg-gray-200')} />
                              <div>
                                <div className="font-semibold">{s.code} - {s.name}</div>
                                <div className="text-[11px] text-gray-400">{s.level} · ห้อง {s.room || '1'} · {s.department}</div>
                              </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </div>

          <ThaiDatePicker value={selectedDateObj} onChange={(date) => setSelectedDateObj(date)} />
        </div>
      </header>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-page-bg flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="ค้นหาด้วยชื่อหรือรหัส..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={!selectedSubject}
              className="w-full pl-11 pr-4 py-3 bg-page-bg border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary outline-none disabled:opacity-40"
            />
          </div>
          {selectedSubjectObj && (
            <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-2 rounded-xl whitespace-nowrap">
              {filteredStudents.length} คน
            </span>
          )}
        </div>

        {!selectedSubject ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-4">
            <Calendar className="w-12 h-12 text-gray-200" />
            <p className="font-semibold">กรุณาเลือกวิชาที่ต้องการเช็คชื่อก่อน</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-4">
            <Users className="w-12 h-12 text-gray-200" />
            <p className="font-semibold">ไม่พบนักเรียนในวิชานี้</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-page-bg/50 text-[10px] uppercase tracking-widest font-bold text-gray-400">
                  <th className="px-8 py-4">นักเรียน</th>
                  <th className="px-8 py-4">รหัส</th>
                  <th className="px-8 py-4 text-center">สถานะ</th>
                  <th className="px-8 py-4 text-right">การดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-page-bg">
                {filteredStudents.map((student) => {
                  const record = attendance.find(
                    (a) => a.studentId === student.studentId && a.date === selectedDate && (!selectedSubject || a.subjectId === selectedSubject)
                  );
                  return (
                    <tr key={student.id} className="hover:bg-page-bg/50 transition-colors">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-secondary/20 rounded-full flex items-center justify-center text-xs font-bold text-primary">
                            {student.name.charAt(0)}
                          </div>
                          <span className="font-semibold text-gray-900">{student.name}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-sm text-gray-500">{student.studentId}</td>
                      <td className="px-8 py-5 text-center">
                        <StatusBadge status={record?.status || 'not-marked'} />
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center justify-end gap-2">
                          <AttendanceBtn active={record?.status === 'present'} onClick={() => markAttendance(student.studentId, 'present')} label="ม" color="green" />
                          <AttendanceBtn active={record?.status === 'absent'} onClick={() => markAttendance(student.studentId, 'absent')} label="ข" color="red" />
                          <AttendanceBtn active={record?.status === 'late'} onClick={() => markAttendance(student.studentId, 'late')} label="ส" color="yellow" />
                          <AttendanceBtn active={record?.status === 'sick'} onClick={() => markAttendance(student.studentId, 'sick')} label="ล" color="blue" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function AttendanceBtn({ active, onClick, label, color }: { active: boolean; onClick: () => void; label: string; color: string }) {
  const colors: Record<string, string> = {
    green: active ? 'bg-green-600 text-white' : 'bg-green-50 text-green-600 hover:bg-green-100',
    red: active ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600 hover:bg-red-100',
    yellow: active ? 'bg-accent text-white' : 'bg-accent/20 text-accent hover:bg-accent/30',
    blue: active ? 'bg-secondary text-white' : 'bg-secondary/20 text-secondary hover:bg-secondary/30'
  };

  return (
    <button onClick={onClick} className={cn('w-8 h-8 rounded-lg text-[10px] font-bold transition-all active:scale-90', colors[color])}>
      {label}
    </button>
  );
}
