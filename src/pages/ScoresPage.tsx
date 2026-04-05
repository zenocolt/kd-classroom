import React, { useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { BookOpen, ChevronDown, Plus, Users } from 'lucide-react';
import { db } from '../firebase';
import { cn } from '../lib/utils';
import { OperationType, Score, Student, Subject } from '../types';
import { handleFirestoreError } from '../services/firestoreError';
import { doesStudentBelongToSubject } from '../utils/domain/subjectHelpers';

interface ScoresPageProps {
  students: Student[];
  subjects: Subject[];
  scores: Score[];
  user: FirebaseUser;
}

export function ScoresPage({ students, subjects, scores, user }: ScoresPageProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [isStudentOpen, setIsStudentOpen] = useState(false);
  const [isSubjectOpen, setIsSubjectOpen] = useState(false);
  const [isTypeOpen, setIsTypeOpen] = useState(false);

  const selectedStudentObj = students.find((s) => s.studentId === selectedStudent);
  const filteredSubjectsForStudent = selectedStudentObj
    ? subjects.filter((s) => doesStudentBelongToSubject(selectedStudentObj, s))
    : [];

  const selectedSubjectObj = subjects.find((s) => s.id === selectedSubject);

  const scoreTypeOptions: { value: Score['type']; label: string }[] = [
    { value: 'assignment', label: 'งานที่มอบหมาย' },
    { value: 'midterm', label: 'สอบกลางภาค' },
    { value: 'final', label: 'สอบปลายภาค' },
    { value: 'activity', label: 'กิจกรรมในชั้นเรียน' },
  ];

  const [scoreType, setScoreType] = useState<Score['type']>('assignment');
  const [scoreVal, setScoreVal] = useState('');
  const [maxScoreVal, setMaxScoreVal] = useState('');
  const [desc, setDesc] = useState('');

  const handleAddScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !selectedSubject || !scoreVal || !maxScoreVal) return;

    try {
      await addDoc(collection(db, 'scores'), {
        studentId: selectedStudent,
        subjectId: selectedSubject,
        type: scoreType,
        score: Number(scoreVal),
        maxScore: Number(maxScoreVal),
        description: desc,
        teacherId: user.uid,
        timestamp: serverTimestamp()
      });
      setIsAdding(false);
      setScoreVal('');
      setMaxScoreVal('');
      setDesc('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'scores');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-bold text-gray-900 tracking-tight mb-2">คะแนนและเกรด</h2>
          <p className="text-gray-500">จัดการผลการเรียนและคะแนนกิจกรรมของนักเรียน</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-primary text-white px-6 py-3 rounded-2xl font-semibold flex items-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
        >
          <Plus className="w-5 h-5" />
          เพิ่มคะแนนใหม่
        </button>
      </header>

      <div className="grid grid-cols-1 gap-8">
        {isAdding && (
          <motion.form
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleAddScore}
            className="bg-white p-8 rounded-3xl shadow-xl border border-primary/20 space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">นักเรียน</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setIsStudentOpen((v) => !v);
                      setIsSubjectOpen(false);
                      setIsTypeOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center justify-between gap-3 p-4 bg-page-bg rounded-2xl text-sm transition-all outline-none',
                      isStudentOpen ? 'ring-2 ring-primary' : 'focus:ring-2 focus:ring-primary'
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Users className="w-4 h-4 text-primary shrink-0" />
                      <span className={cn('truncate', selectedStudent ? 'text-gray-800 font-medium' : 'text-gray-400')}>
                        {selectedStudentObj ? `${selectedStudentObj.name} (${selectedStudentObj.studentId})` : 'เลือกนักเรียน'}
                      </span>
                    </div>
                    <ChevronDown className={cn('w-4 h-4 text-gray-400 shrink-0 transition-transform', isStudentOpen && 'rotate-180')} />
                  </button>
                  {isStudentOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsStudentOpen(false)} />
                      <div className="absolute top-full mt-2 left-0 right-0 z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <ul className="py-2 max-h-56 overflow-y-auto">
                          {students.map((s) => (
                            <li key={s.id}>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedStudent(s.studentId);
                                  setSelectedSubject('');
                                  setIsStudentOpen(false);
                                }}
                                className={cn(
                                  'w-full text-left px-4 py-3 text-sm transition-colors flex items-center gap-3',
                                  selectedStudent === s.studentId ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-700 hover:bg-page-bg'
                                )}
                              >
                                <div className={cn('w-2 h-2 rounded-full shrink-0', selectedStudent === s.studentId ? 'bg-primary' : 'bg-gray-200')} />
                                <div>
                                  <div className="font-semibold">{s.name}</div>
                                  <div className="text-[11px] text-gray-400">{s.studentId} · {s.department}</div>
                                </div>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">รายวิชา</label>
                <div className="relative">
                  <button
                    type="button"
                    disabled={!selectedStudent}
                    onClick={() => {
                      setIsSubjectOpen((v) => !v);
                      setIsStudentOpen(false);
                      setIsTypeOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center justify-between gap-3 p-4 bg-page-bg rounded-2xl text-sm transition-all outline-none disabled:opacity-40',
                      isSubjectOpen ? 'ring-2 ring-primary' : 'focus:ring-2 focus:ring-primary'
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <BookOpen className="w-4 h-4 text-primary shrink-0" />
                      <span className={cn('truncate', selectedSubject ? 'text-gray-800 font-medium' : 'text-gray-400')}>
                        {selectedSubjectObj ? `${selectedSubjectObj.code} - ${selectedSubjectObj.name}` : (selectedStudent ? 'เลือกวิชา' : 'เลือกนักเรียนก่อน')}
                      </span>
                    </div>
                    <ChevronDown className={cn('w-4 h-4 text-gray-400 shrink-0 transition-transform', isSubjectOpen && 'rotate-180')} />
                  </button>
                  {isSubjectOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsSubjectOpen(false)} />
                      <div className="absolute top-full mt-2 left-0 right-0 z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <ul className="py-2 max-h-56 overflow-y-auto">
                          {filteredSubjectsForStudent.length === 0 ? (
                            <li className="px-4 py-3 text-sm text-gray-400 text-center">ไม่พบวิชาในแผนกนี้</li>
                          ) : (
                            filteredSubjectsForStudent.map((s) => (
                              <li key={s.id}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedSubject(s.id);
                                    setIsSubjectOpen(false);
                                  }}
                                  className={cn(
                                    'w-full text-left px-4 py-3 text-sm transition-colors flex items-center gap-3',
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
                            ))
                          )}
                        </ul>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">ประเภท</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setIsTypeOpen((v) => !v);
                      setIsStudentOpen(false);
                      setIsSubjectOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center justify-between gap-3 p-4 bg-page-bg rounded-2xl text-sm transition-all outline-none',
                      isTypeOpen ? 'ring-2 ring-primary' : 'focus:ring-2 focus:ring-primary'
                    )}
                  >
                    <span className="text-gray-800 font-medium">{scoreTypeOptions.find((o) => o.value === scoreType)?.label}</span>
                    <ChevronDown className={cn('w-4 h-4 text-gray-400 shrink-0 transition-transform', isTypeOpen && 'rotate-180')} />
                  </button>
                  {isTypeOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsTypeOpen(false)} />
                      <div className="absolute top-full mt-2 left-0 right-0 z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <ul className="py-2">
                          {scoreTypeOptions.map((o) => (
                            <li key={o.value}>
                              <button
                                type="button"
                                onClick={() => {
                                  setScoreType(o.value);
                                  setIsTypeOpen(false);
                                }}
                                className={cn(
                                  'w-full text-left px-4 py-3 text-sm transition-colors flex items-center gap-3',
                                  scoreType === o.value ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-700 hover:bg-page-bg'
                                )}
                              >
                                <div className={cn('w-2 h-2 rounded-full shrink-0', scoreType === o.value ? 'bg-primary' : 'bg-gray-200')} />
                                {o.label}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">คะแนน</label>
                <input
                  type="number"
                  value={scoreVal}
                  onChange={(e) => setScoreVal(e.target.value)}
                  placeholder="เช่น 15"
                  className="w-full p-4 bg-page-bg border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary outline-none"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">คะแนนเต็ม</label>
                <input
                  type="number"
                  value={maxScoreVal}
                  onChange={(e) => setMaxScoreVal(e.target.value)}
                  placeholder="เช่น 20"
                  className="w-full p-4 bg-page-bg border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary outline-none"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">รายละเอียด</label>
              <input
                type="text"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="เช่น การบ้านครั้งที่ 1: บทนำ HTML"
                className="w-full p-4 bg-page-bg border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
            <div className="flex justify-end gap-4">
              <button type="button" onClick={() => setIsAdding(false)} className="px-6 py-3 rounded-2xl font-semibold text-gray-500 hover:bg-page-bg transition-colors">
                ยกเลิก
              </button>
              <button type="submit" className="bg-primary text-white px-8 py-3 rounded-2xl font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
                บันทึกคะแนน
              </button>
            </div>
          </motion.form>
        )}

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-page-bg/50 text-[10px] uppercase tracking-widest font-bold text-gray-400">
                  <th className="px-8 py-4">นักเรียน</th>
                  <th className="px-8 py-4">รายวิชา</th>
                  <th className="px-8 py-4">ประเภท</th>
                  <th className="px-8 py-4">รายละเอียด</th>
                  <th className="px-8 py-4">คะแนน</th>
                  <th className="px-8 py-4 text-right">วันที่</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-page-bg">
                {scores
                  .sort((a, b) => b.timestamp?.toMillis() - a.timestamp?.toMillis())
                  .map((score) => {
                    const student = students.find((s) => s.studentId === score.studentId);
                    const subject = subjects.find((s) => s.id === score.subjectId);
                    return (
                      <tr key={score.id} className="hover:bg-page-bg/50 transition-colors">
                        <td className="px-8 py-5">
                          <div className="flex flex-col">
                            <span className="font-semibold text-gray-900">{student?.name || 'ไม่ระบุ'}</span>
                            <span className="text-xs text-gray-400">{score.studentId}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-900">{subject?.name || 'ไม่ระบุ'}</span>
                            <span className="text-[10px] text-gray-400">{subject?.code}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className={cn('px-2 py-1 rounded-lg text-[10px] font-bold uppercase', (score.type === 'midterm' || score.type === 'final') ? 'bg-red-50 text-red-600' : 'bg-secondary/20 text-primary')}>
                            {score.type === 'assignment' ? 'งานที่มอบหมาย' : score.type === 'midterm' ? 'สอบกลางภาค' : score.type === 'final' ? 'สอบปลายภาค' : 'กิจกรรม'}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-sm text-gray-600">{score.description}</td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">{score.score}</span>
                            <span className="text-gray-300">/</span>
                            <span className="text-gray-500 text-xs">{score.maxScore}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-right text-xs text-gray-400">
                          {score.timestamp ? format(score.timestamp.toDate(), 'MMM d, HH:mm') : '...'}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
