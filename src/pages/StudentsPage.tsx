import React, { useMemo, useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { addDoc, collection } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { motion } from 'motion/react';
import { AlertCircle, ChevronDown, ChevronRight, Download, Search, Trash2, Upload, UserPlus } from 'lucide-react';
import { db } from '../firebase';
import { cn } from '../lib/utils';
import { useStudyTrackYear } from '../hooks/useStudyTrackYear';
import { Attendance, OperationType, Score, Student } from '../types';
import { handleFirestoreError } from '../services/firestoreError';
import { ConfirmDialog } from '../components/shared/ConfirmDialog';
import { deleteStudentsCascadeBulk } from '../services/studentService';

interface StudentsPageProps {
  students: Student[];
  attendance: Attendance[];
  scores: Score[];
  user: FirebaseUser;
  onStudentClick: (id: string) => void;
}

export function StudentsPage({ students, attendance, scores, user, onStudentClick }: StudentsPageProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [dept, setDept] = useState('เทคโนโลยีสารสนเทศ');
  const { studyTrack, setStudyTrack, year, setYear, yearOptions, normalizeStudentYear, formatYearLabel, normalizeImportedYear } = useStudyTrackYear();
  const [room, setRoom] = useState('1');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [filterRoom, setFilterRoom] = useState<'all' | '1' | '2'>('all');
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | 'good' | 'medium' | 'risk' | 'no-record'>('all');
  const [isDepartmentOpen, setIsDepartmentOpen] = useState(false);
  const [isYearOpen, setIsYearOpen] = useState(false);
  const [isRoomOpen, setIsRoomOpen] = useState(false);
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const STUDENT_ID_REGEX = /^[a-zA-Z0-9-]{5,20}$/;
  const ATTENDANCE_GOOD_THRESHOLD = 80;
  const ATTENDANCE_MEDIUM_THRESHOLD = 60;

  const attendanceFilterLabel: Record<'all' | 'good' | 'medium' | 'risk' | 'no-record', string> = {
    all: 'ทุกสถานะการเข้าเรียน',
    good: `มาเรียนดี (>= ${ATTENDANCE_GOOD_THRESHOLD}%)`,
    medium: `ปานกลาง (${ATTENDANCE_MEDIUM_THRESHOLD}-${ATTENDANCE_GOOD_THRESHOLD - 1}%)`,
    risk: `เสี่ยง (< ${ATTENDANCE_MEDIUM_THRESHOLD}%)`,
    'no-record': 'ยังไม่มีข้อมูลเช็คชื่อ'
  };

  const closeFilterDropdowns = () => {
    setIsDepartmentOpen(false);
    setIsYearOpen(false);
    setIsRoomOpen(false);
    setIsAttendanceOpen(false);
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name || !studentId) return;

    if (!STUDENT_ID_REGEX.test(studentId)) {
      setError('รหัสนักเรียนไม่ถูกต้อง โปรดใช้ตัวอักษรหรือตัวเลข 5-20 ตัว หรือเครื่องหมายขีด (-)');
      return;
    }

    if (students.some((s) => s.studentId === studentId)) {
      setError('รหัสนักเรียนนี้ถูกลงทะเบียนแล้ว');
      return;
    }

    try {
      await addDoc(collection(db, 'students'), {
        name: name.trim(),
        studentId: studentId.trim(),
        department: dept,
        year: `${studyTrack}${year}`,
        room,
        teacherId: user.uid
      });
      setIsAdding(false);
      setName('');
      setStudentId('');
      setRoom('1');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'students');
    }
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const { writeBatch, collection, doc } = await import('firebase/firestore');
        const batch = writeBatch(db);

        let importCount = 0;
        let skipCount = 0;
        let invalidRoomCount = 0;
        const addedIds = new Set<string>();

        data.forEach((row) => {
          const sId = String(row['Student ID'] || row['รหัสนักเรียน'] || row['ID'] || row['id'] || row['studentId'] || '').trim();
          const sName = String(row['Full Name'] || row['ชื่อ-นามสกุล'] || row['Name'] || row['name'] || row['ชื่อ'] || '').trim();
          const sYear = normalizeImportedYear(row as Record<string, unknown>);
          const rawRoom = String(
            row['Room'] ||
            row['Section'] ||
            row['Class'] ||
            row['ห้อง'] ||
            row['ห้องเรียน'] ||
            ''
          ).trim();
          const sRoom = rawRoom;
          const isValidRoom = sRoom === '1' || sRoom === '2';

          if (sId && sName) {
            const isDuplicate = students.some((s) => s.studentId === sId) || addedIds.has(sId);
            const isValid = STUDENT_ID_REGEX.test(sId);

            if (!isValidRoom) {
              invalidRoomCount++;
              skipCount++;
            } else if (!isDuplicate && isValid) {
              const newDocRef = doc(collection(db, 'students'));
              batch.set(newDocRef, {
                name: sName,
                studentId: sId,
                department: dept,
                year: sYear,
                room: sRoom,
                teacherId: user.uid
              });
              addedIds.add(sId);
              importCount++;
            } else {
              skipCount++;
            }
          }
        });

        if (importCount > 0) {
          await batch.commit();
          alert(`นำเข้า ${importCount} นักเรียนสำเร็จ${skipCount > 0 ? ` (ข้าม ${skipCount} รายการ${invalidRoomCount > 0 ? `, ห้องไม่ถูกต้อง ${invalidRoomCount} รายการ` : ''})` : ''}`);
        } else {
          alert(invalidRoomCount > 0 ? 'ไม่พบนักเรียนใหม่ที่ถูกต้องในไฟล์ (พบห้องที่ไม่ใช่ 1/2)' : 'ไม่พบนักเรียนใหม่ที่ถูกต้องในไฟล์');
        }
        setIsAdding(false);
      } catch (error) {
        console.error('Excel import error:', error);
        alert('ไม่สามารถนำเข้าไฟล์ Excel ได้ โปรดตรวจสอบรูปแบบไฟล์');
      } finally {
        setImporting(false);
        e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDeleteAllStudents = async () => {
    if (students.length === 0) {
      setIsDeletingAll(false);
      return;
    }

    setDeletingAll(true);
    try {
      const studentIds = new Set(students.map((s) => s.studentId));
      await deleteStudentsCascadeBulk({
        studentDocIds: students.map((s) => s.id),
        attendanceIds: attendance.filter((a) => studentIds.has(a.studentId)).map((a) => a.id),
        scoreIds: scores.filter((s) => studentIds.has(s.studentId)).map((s) => s.id),
      });
      setIsDeletingAll(false);
      alert('ลบนักเรียนทั้งหมดสำเร็จ');
    } catch (deleteError) {
      handleFirestoreError(deleteError, OperationType.DELETE, 'students');
    } finally {
      setDeletingAll(false);
    }
  };

  const departments = useMemo(() => Array.from(new Set(students.map((s) => s.department))).sort((a, b) => a.localeCompare(b)), [students]);
  const years = ['ปวช.1', 'ปวช.2', 'ปวช.3', 'ปวส.1', 'ปวส.2'];

  const attendanceStatsByStudentId = useMemo(() => {
    const stats = new Map<string, { present: number; absent: number; late: number; sick: number; total: number; rate: number }>();

    for (const student of students) {
      const records = attendance.filter((a) => a.studentId === student.studentId);
      const present = records.filter((r) => r.status === 'present').length;
      const absent = records.filter((r) => r.status === 'absent').length;
      const late = records.filter((r) => r.status === 'late').length;
      const sick = records.filter((r) => r.status === 'sick').length;
      const total = records.length;
      const rate = total > 0 ? ((present + late) / total) * 100 : 0;

      stats.set(student.studentId, { present, absent, late, sick, total, rate });
    }

    return stats;
  }, [students, attendance]);

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesSearch =
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.studentId.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDepartment = filterDepartment === 'all' || student.department === filterDepartment;
      const normalizedYear = normalizeStudentYear(student.year);
      const matchesYear =
        filterYear === 'all' ||
        normalizedYear === filterYear ||
        (filterYear === 'ปวช.1' && normalizedYear === '1') ||
        (filterYear === 'ปวช.2' && normalizedYear === '2') ||
        (filterYear === 'ปวช.3' && normalizedYear === '3');
      const matchesRoom = filterRoom === 'all' || (student.room || '1') === filterRoom;

      const stats = attendanceStatsByStudentId.get(student.studentId) || { total: 0, rate: 0 };
      const matchesAttendance =
        attendanceFilter === 'all' ||
        (attendanceFilter === 'no-record' && stats.total === 0) ||
        (attendanceFilter === 'good' && stats.total > 0 && stats.rate >= ATTENDANCE_GOOD_THRESHOLD) ||
        (attendanceFilter === 'medium' && stats.total > 0 && stats.rate >= ATTENDANCE_MEDIUM_THRESHOLD && stats.rate < ATTENDANCE_GOOD_THRESHOLD) ||
        (attendanceFilter === 'risk' && stats.total > 0 && stats.rate < ATTENDANCE_MEDIUM_THRESHOLD);

      return matchesSearch && matchesDepartment && matchesYear && matchesRoom && matchesAttendance;
    });
  }, [students, searchTerm, filterDepartment, filterYear, filterRoom, attendanceFilter, attendanceStatsByStudentId, normalizeStudentYear]);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-bold text-gray-900 tracking-tight mb-2">นักเรียน</h2>
          <p className="text-gray-500">จัดการรายชื่อและโปรไฟล์นักเรียน</p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => setIsDeletingAll(true)}
            disabled={students.length === 0 || deletingAll}
            className="bg-red-50 text-red-600 px-6 py-3 rounded-2xl font-semibold flex items-center gap-2 hover:bg-red-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-5 h-5" />
            {deletingAll ? 'กำลังลบ...' : 'ลบนักเรียนทั้งหมด'}
          </button>
          <button onClick={() => setIsAdding(true)} className="bg-primary text-white px-6 py-3 rounded-2xl font-semibold flex items-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
            <UserPlus className="w-5 h-5" />
            เพิ่มนักเรียน
          </button>
        </div>
      </header>

      {isAdding && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-8 rounded-3xl shadow-xl border border-primary/20 space-y-8">
          <div className="flex items-center justify-between border-b border-page-bg pb-6">
            <h3 className="text-xl font-bold text-gray-900">เพิ่มนักเรียนใหม่</h3>
            <div className="flex items-center gap-4">
              <a
                href="/sample_students_upload.xlsx"
                download
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all font-semibold text-sm"
              >
                <Download className="w-4 h-4" />
                ไฟล์ตัวอย่าง
              </a>
              <label className="flex items-center gap-2 px-4 py-2 bg-secondary/20 text-primary rounded-xl cursor-pointer hover:bg-secondary/30 transition-all font-semibold text-sm">
                <Upload className="w-4 h-4" />
                {importing ? 'กำลังนำเข้า...' : 'นำเข้าจาก Excel'}
                <input type="file" accept=".xlsx, .xls, .csv" onChange={handleExcelImport} className="hidden" disabled={importing} />
              </label>
            </div>
          </div>

          <form onSubmit={handleAddStudent} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">ชื่อ-นามสกุล</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="ชื่อนักเรียน" className="w-full p-4 bg-page-bg border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary outline-none" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">รหัสนักเรียน</label>
                <input type="text" value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="e.g. 65309010001" className="w-full p-4 bg-page-bg border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary outline-none" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">แผนกวิชา</label>
                <input type="text" value={dept} onChange={(e) => setDept(e.target.value)} className="w-full p-4 bg-page-bg border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">ระดับชั้น</label>
                <select value={studyTrack} onChange={(e) => setStudyTrack(e.target.value as 'ปวช.' | 'ปวส.')} className="w-full p-4 bg-page-bg border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary outline-none">
                  <option value="ปวช.">ปวช.</option>
                  <option value="ปวส.">ปวส.</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">ปี</label>
                <select value={year} onChange={(e) => setYear(e.target.value)} className="w-full p-4 bg-page-bg border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary outline-none">
                  {yearOptions.map((value) => (
                    <option key={value} value={value}>ปี {value}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">ห้อง</label>
                <select value={room} onChange={(e) => setRoom(e.target.value)} className="w-full p-4 bg-page-bg border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary outline-none">
                  <option value="1">ห้อง 1</option>
                  <option value="2">ห้อง 2</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-4">
              <button type="button" onClick={() => setIsAdding(false)} className="px-6 py-3 rounded-2xl font-semibold text-gray-500 hover:bg-page-bg transition-colors">ยกเลิก</button>
              <button type="submit" className="bg-primary text-white px-8 py-3 rounded-2xl font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">ลงทะเบียนนักเรียน</button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="ค้นหาชื่อหรือรหัสนักเรียน" className="w-full pl-11 pr-4 py-3 bg-page-bg border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary outline-none" />
          </div>
          <div className="relative">
            <button type="button" onClick={() => { const next = !isDepartmentOpen; closeFilterDropdowns(); setIsDepartmentOpen(next); }} className={cn('w-full min-w-[220px] px-4 py-3 bg-page-bg rounded-2xl text-sm text-left flex items-center justify-between transition-all', isDepartmentOpen ? 'ring-2 ring-primary' : 'hover:bg-page-bg/80')}>
              <span className="truncate">{filterDepartment === 'all' ? 'ทุกแผนก' : filterDepartment}</span>
              <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform', isDepartmentOpen && 'rotate-180')} />
            </button>
            {isDepartmentOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={closeFilterDropdowns} />
                <div className="absolute top-full mt-2 left-0 z-50 min-w-full bg-white rounded-2xl border border-gray-100 shadow-2xl overflow-hidden">
                  <ul className="py-2 max-h-64 overflow-y-auto">
                    <li>
                      <button type="button" onClick={() => { setFilterDepartment('all'); closeFilterDropdowns(); }} className={cn('w-full text-left px-4 py-2 text-sm transition-colors', filterDepartment === 'all' ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-700 hover:bg-page-bg')}>
                        ทุกแผนก
                      </button>
                    </li>
                    {departments.map((department) => (
                      <li key={department}>
                        <button type="button" onClick={() => { setFilterDepartment(department); closeFilterDropdowns(); }} className={cn('w-full text-left px-4 py-2 text-sm transition-colors', filterDepartment === department ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-700 hover:bg-page-bg')}>
                          {department}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>

          <div className="relative">
            <button type="button" onClick={() => { const next = !isYearOpen; closeFilterDropdowns(); setIsYearOpen(next); }} className={cn('w-full min-w-[180px] px-4 py-3 bg-page-bg rounded-2xl text-sm text-left flex items-center justify-between transition-all', isYearOpen ? 'ring-2 ring-primary' : 'hover:bg-page-bg/80')}>
              <span className="truncate">{filterYear === 'all' ? 'ทุกชั้นปี' : formatYearLabel(filterYear)}</span>
              <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform', isYearOpen && 'rotate-180')} />
            </button>
            {isYearOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={closeFilterDropdowns} />
                <div className="absolute top-full mt-2 left-0 z-50 min-w-full bg-white rounded-2xl border border-gray-100 shadow-2xl overflow-hidden">
                  <ul className="py-2 max-h-64 overflow-y-auto">
                    <li>
                      <button type="button" onClick={() => { setFilterYear('all'); closeFilterDropdowns(); }} className={cn('w-full text-left px-4 py-2 text-sm transition-colors', filterYear === 'all' ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-700 hover:bg-page-bg')}>
                        ทุกชั้นปี
                      </button>
                    </li>
                    {years.map((yearValue) => (
                      <li key={yearValue}>
                        <button type="button" onClick={() => { setFilterYear(yearValue); closeFilterDropdowns(); }} className={cn('w-full text-left px-4 py-2 text-sm transition-colors', filterYear === yearValue ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-700 hover:bg-page-bg')}>
                          {formatYearLabel(yearValue)}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>

          <div className="relative">
            <button type="button" onClick={() => { const next = !isRoomOpen; closeFilterDropdowns(); setIsRoomOpen(next); }} className={cn('w-full min-w-[140px] px-4 py-3 bg-page-bg rounded-2xl text-sm text-left flex items-center justify-between transition-all', isRoomOpen ? 'ring-2 ring-primary' : 'hover:bg-page-bg/80')}>
              <span className="truncate">{filterRoom === 'all' ? 'ทุกห้อง' : `ห้อง ${filterRoom}`}</span>
              <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform', isRoomOpen && 'rotate-180')} />
            </button>
            {isRoomOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={closeFilterDropdowns} />
                <div className="absolute top-full mt-2 left-0 z-50 min-w-full bg-white rounded-2xl border border-gray-100 shadow-2xl overflow-hidden">
                  <ul className="py-2 max-h-64 overflow-y-auto">
                    <li>
                      <button type="button" onClick={() => { setFilterRoom('all'); closeFilterDropdowns(); }} className={cn('w-full text-left px-4 py-2 text-sm transition-colors', filterRoom === 'all' ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-700 hover:bg-page-bg')}>
                        ทุกห้อง
                      </button>
                    </li>
                    {(['1', '2'] as const).map((roomValue) => (
                      <li key={roomValue}>
                        <button type="button" onClick={() => { setFilterRoom(roomValue); closeFilterDropdowns(); }} className={cn('w-full text-left px-4 py-2 text-sm transition-colors', filterRoom === roomValue ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-700 hover:bg-page-bg')}>
                          ห้อง {roomValue}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>

          <div className="relative">
            <button type="button" onClick={() => { const next = !isAttendanceOpen; closeFilterDropdowns(); setIsAttendanceOpen(next); }} className={cn('w-full min-w-[220px] px-4 py-3 bg-page-bg rounded-2xl text-sm text-left flex items-center justify-between transition-all', isAttendanceOpen ? 'ring-2 ring-primary' : 'hover:bg-page-bg/80')}>
              <span className="truncate">{attendanceFilterLabel[attendanceFilter]}</span>
              <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform', isAttendanceOpen && 'rotate-180')} />
            </button>
            {isAttendanceOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={closeFilterDropdowns} />
                <div className="absolute top-full mt-2 left-0 z-50 min-w-full bg-white rounded-2xl border border-gray-100 shadow-2xl overflow-hidden">
                  <ul className="py-2 max-h-64 overflow-y-auto">
                    {(['all', 'good', 'medium', 'risk', 'no-record'] as const).map((value) => (
                      <li key={value}>
                        <button type="button" onClick={() => { setAttendanceFilter(value); closeFilterDropdowns(); }} className={cn('w-full text-left px-4 py-2 text-sm transition-colors', attendanceFilter === value ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-700 hover:bg-page-bg')}>
                          {attendanceFilterLabel[value]}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStudents.map((student) => {
          const attendanceStats = attendanceStatsByStudentId.get(student.studentId) || { present: 0, absent: 0, late: 0, sick: 0, total: 0, rate: 0 };
          return (
            <button key={student.id} onClick={() => onStudentClick(student.id)} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all group text-left w-full">
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 bg-secondary/20 rounded-2xl flex items-center justify-center text-xl font-bold text-primary">{student.name.charAt(0)}</div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-page-bg px-2 py-1 rounded-lg">{formatYearLabel(student.year)}</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">{student.name}</h3>
              <p className="text-sm text-gray-500 mb-4">{student.studentId}</p>
              <div className="mb-4 p-3 rounded-2xl bg-page-bg/70">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">การเข้าเรียน</span>
                  <span className={cn('text-xs font-bold px-2 py-1 rounded-lg', attendanceStats.total === 0 ? 'bg-gray-100 text-gray-500' : attendanceStats.rate >= ATTENDANCE_GOOD_THRESHOLD ? 'bg-green-50 text-green-600' : attendanceStats.rate >= ATTENDANCE_MEDIUM_THRESHOLD ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-600')}>
                    {attendanceStats.total === 0 ? 'ไม่มีข้อมูล' : `${attendanceStats.rate.toFixed(0)}%`}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-[10px] text-gray-500">
                  <span>ม: {attendanceStats.present}</span>
                  <span>ส: {attendanceStats.late}</span>
                  <span>ล: {attendanceStats.sick}</span>
                  <span>ข: {attendanceStats.absent}</span>
                </div>
              </div>
              <div className="pt-4 border-t border-page-bg flex items-center justify-between">
                <span className="text-xs text-gray-400">{student.department} • ห้อง {student.room || '1'}</span>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" />
              </div>
            </button>
          );
        })}
      </div>

      {filteredStudents.length === 0 && (
        <div className="bg-white rounded-3xl border border-gray-100 p-10 text-center text-gray-400">ไม่พบนักเรียนที่ตรงกับเงื่อนไขการค้นหา</div>
      )}

      {isDeletingAll && (
        <ConfirmDialog
          title="ลบนักเรียนทั้งหมด?"
          message="การดำเนินการนี้จะลบนักเรียนทั้งหมด พร้อมข้อมูลการเช็คชื่อและคะแนนที่เกี่ยวข้อง และไม่สามารถย้อนกลับได้"
          confirmLabel={deletingAll ? 'กำลังลบ...' : 'ลบทั้งหมด'}
          cancelLabel="ยกเลิก"
          onConfirm={handleDeleteAllStudents}
          onCancel={() => !deletingAll && setIsDeletingAll(false)}
          variant="danger"
        />
      )}
    </motion.div>
  );
}
