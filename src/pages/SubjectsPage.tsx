import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, ChevronRight, Edit, Plus, Trash2, X } from 'lucide-react';
import { Subject } from '../types';
import { SubjectsPageProps } from '../types/views/management';
import { cn } from '../lib/utils';
import { getSubjectCardGradient } from '../utils/domain/subjectHelpers';
import { useSubjectActions } from '../hooks/useSubjectActions';
import { ConfirmDialog } from '../components/shared/ConfirmDialog';

const SUBJECTS_FILTERS_STORAGE_KEY = 'subjects.filters.v1';
const FILTER_PERSISTENCE_KEY = 'filters.persistence.enabled';

export function SubjectsPage({ subjects, user, quickAction = 'none', quickActionVersion = 0, onOpenPersistenceSettings, onSubjectClick }: SubjectsPageProps) {
  const { isSaving, handleCreateSubject, handleUpdateSubject, handleDeleteSubject, handleMigrateSubjectRooms } = useSubjectActions(user.uid);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [deletingSubject, setDeletingSubject] = useState<Subject | null>(null);
  const [isMigratingRooms, setIsMigratingRooms] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [level, setLevel] = useState('');
  const [room, setRoom] = useState('1');
  const [department, setDepartment] = useState('เทคโนโลยีสารสนเทศ');

  const isEditing = useMemo(() => !!editingSubject, [editingSubject]);
  const invalidRoomSubjects = useMemo(
    () => subjects.filter((subject) => subject.room !== '1' && subject.room !== '2'),
    [subjects]
  );
  const [showInvalidRoomOnly, setShowInvalidRoomOnly] = useState(false);
  const [highlightInvalidBanner, setHighlightInvalidBanner] = useState(false);
  const [showRestoreToast, setShowRestoreToast] = useState(false);
  const [persistFilters, setPersistFilters] = useState(() => localStorage.getItem(FILTER_PERSISTENCE_KEY) !== '0');
  const invalidRoomBannerRef = useRef<HTMLDivElement | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoreToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const visibleSubjects = useMemo(
    () => (showInvalidRoomOnly ? invalidRoomSubjects : subjects),
    [showInvalidRoomOnly, invalidRoomSubjects, subjects]
  );

  useEffect(() => {
    if (!persistFilters) return;
    try {
      const raw = localStorage.getItem(SUBJECTS_FILTERS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { showInvalidRoomOnly?: boolean };
      const restored = Boolean(parsed.showInvalidRoomOnly);
      setShowInvalidRoomOnly(restored);
      if (restored) {
        setShowRestoreToast(true);
        if (restoreToastTimerRef.current) clearTimeout(restoreToastTimerRef.current);
        restoreToastTimerRef.current = setTimeout(() => setShowRestoreToast(false), 2200);
      }
    } catch {
      // Ignore malformed local storage and keep defaults.
    }
  }, [persistFilters]);

  useEffect(() => {
    if (!persistFilters) return;
    localStorage.setItem(SUBJECTS_FILTERS_STORAGE_KEY, JSON.stringify({ showInvalidRoomOnly }));
  }, [persistFilters, showInvalidRoomOnly]);

  useEffect(() => {
    const onToggle = (event: Event) => {
      const customEvent = event as CustomEvent<{ enabled?: boolean }>;
      const enabled = customEvent.detail?.enabled ?? localStorage.getItem(FILTER_PERSISTENCE_KEY) !== '0';
      setPersistFilters(Boolean(enabled));
    };

    window.addEventListener('filters-persistence-changed', onToggle as EventListener);
    return () => window.removeEventListener('filters-persistence-changed', onToggle as EventListener);
  }, []);

  const resetAllFilters = () => {
    setShowInvalidRoomOnly(false);
  };

  const resetForm = () => {
    setCode('');
    setName('');
    setLevel('');
    setRoom('1');
    setDepartment('เทคโนโลยีสารสนเทศ');
    setEditingSubject(null);
    setIsFormOpen(false);
  };

  const openCreateForm = () => {
    setEditingSubject(null);
    setCode('');
    setName('');
    setLevel('');
    setRoom('1');
    setDepartment('เทคโนโลยีสารสนเทศ');
    setIsFormOpen(true);
  };

  const openEditForm = (subject: Subject) => {
    setEditingSubject(subject);
    setCode(subject.code);
    setName(subject.name);
    setLevel(subject.level || '');
    setRoom(subject.room || '1');
    setDepartment(subject.department || 'เทคโนโลยีสารสนเทศ');
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;

    const payload = {
      code: code.trim(),
      name: name.trim(),
      level: level.trim(),
      room,
      department: department.trim() || 'เทคโนโลยีสารสนเทศ',
    };

    const success = isEditing && editingSubject
      ? await handleUpdateSubject(editingSubject.id, payload)
      : await handleCreateSubject(payload);

    if (success) resetForm();
  };

  const confirmDelete = async () => {
    if (!deletingSubject) return;
    const success = await handleDeleteSubject(deletingSubject);
    if (success) setDeletingSubject(null);
  };

  const confirmMigrateRooms = async () => {
    const success = await handleMigrateSubjectRooms(
      invalidRoomSubjects.map((subject) => subject.id),
      '1'
    );

    if (success) {
      setIsMigratingRooms(false);
    }
  };

  useEffect(() => {
    if (quickAction === 'invalid-room') {
      setShowInvalidRoomOnly(true);
      setHighlightInvalidBanner(true);
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = setTimeout(() => {
        setHighlightInvalidBanner(false);
      }, 1600);
      requestAnimationFrame(() => {
        invalidRoomBannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [quickAction, quickActionVersion]);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      if (restoreToastTimerRef.current) clearTimeout(restoreToastTimerRef.current);
    };
  }, []);

  return (
    <div className="space-y-6 md:space-y-8">
      {showRestoreToast && (
        <div className="fixed right-4 top-20 z-40 rounded-xl bg-gray-900 text-white text-xs px-3 py-2 shadow-xl">
          กู้คืนตัวกรองล่าสุดแล้ว
        </div>
      )}

      <div className="bg-white rounded-3xl p-5 sm:p-8 shadow-sm border border-gray-100">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">จัดการรายวิชา</h2>
            <p className="text-gray-500 mt-1">สร้างและจัดการรายวิชาทั้งหมดในระบบ</p>
            <div className="mt-2">
              <button
                type="button"
                onClick={() => onOpenPersistenceSettings?.()}
                title="ON: จำตัวกรองล่าสุดไว้ | OFF: ไม่จำและล้างค่าที่เคยจำ"
                aria-label="เปิดหน้า Settings เพื่อจัดการการจำค่าตัวกรอง"
                className={cn(
                  'inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors',
                  'hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-primary/30',
                  persistFilters ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                )}
              >
                Persistence: {persistFilters ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={resetAllFilters}
              disabled={!showInvalidRoomOnly}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl border border-gray-200 text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              รีเซ็ตตัวกรองทั้งหมด
            </button>
            {invalidRoomSubjects.length > 0 && (
              <button
                onClick={() => setIsMigratingRooms(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 sm:px-5 sm:py-3 border border-amber-200 text-sm font-bold rounded-xl text-amber-700 bg-amber-50 hover:bg-amber-100 transition-all"
              >
                เติมห้องรายวิชาเก่า ({invalidRoomSubjects.length})
              </button>
            )}
            <button
              onClick={openCreateForm}
              className="inline-flex items-center gap-2 px-4 py-2.5 sm:px-5 sm:py-3 border border-transparent text-sm font-bold rounded-xl text-white bg-primary hover:bg-primary/90 transition-all"
            >
              <Plus className="w-4 h-4" />
              เพิ่มรายวิชา
            </button>
          </div>
        </div>
      </div>

      {showInvalidRoomOnly && (
        <div
          ref={invalidRoomBannerRef}
          className={cn(
            'rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs sm:text-sm text-red-700 flex items-center justify-between gap-3 transition-all',
            highlightInvalidBanner
              ? 'ring-2 ring-red-300 shadow-[0_0_0_8px_rgba(239,68,68,0.2)] opacity-100'
              : 'opacity-95'
          )}
        >
          <span>กำลังแสดงเฉพาะรายวิชาที่ห้องไม่ถูกต้อง (จาก badge เมนูล่าง)</span>
          <button
            type="button"
            onClick={() => setShowInvalidRoomOnly(false)}
            className="font-semibold underline underline-offset-2"
          >
            แสดงทั้งหมด
          </button>
        </div>
      )}

      {isFormOpen && (
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-5 sm:p-8 shadow-sm border border-gray-100 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900">
              {isEditing ? 'แก้ไขรายวิชา' : 'เพิ่มรายวิชาใหม่'}
            </h3>
            <button
              type="button"
              onClick={resetForm}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="รหัสวิชา"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              required
            />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ชื่อวิชา"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              required
            />
            <input
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              placeholder="ระดับชั้น เช่น ปวช.2"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
            <select
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            >
              <option value="1">ห้อง 1</option>
              <option value="2">ห้อง 2</option>
            </select>
            <input
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="แผนก"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={resetForm}
              className="px-5 py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 disabled:opacity-60"
            >
              {isSaving ? 'กำลังบันทึก...' : isEditing ? 'บันทึกการแก้ไข' : 'เพิ่มรายวิชา'}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-8">
        {visibleSubjects.map((subject: Subject, index: number) => {
          const gradient = getSubjectCardGradient(index);
          return (
            <div
              key={subject.id}
              className={cn(
                'relative rounded-3xl p-5 sm:p-6 text-white overflow-hidden group hover:shadow-2xl transition-all duration-300',
                gradient
              )}
            >
              <div className="absolute -right-8 -top-8 w-28 h-28 bg-white/10 rounded-full"></div>
              <div className="absolute -left-4 -bottom-4 w-16 h-16 bg-white/5 rounded-full"></div>
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-5 gap-2">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditForm(subject)}
                      className="p-2 rounded-lg bg-white/15 hover:bg-white/25 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingSubject(subject)}
                      className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <button onClick={() => onSubjectClick(subject.id)} className="text-left w-full">
                  <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <h3 className="text-xl sm:text-2xl font-bold">{subject.name}</h3>
                    <ChevronRight className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
                  </div>
                </button>
                <div className="space-y-2 text-sm font-medium bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/20">
                  <div className="flex justify-between">
                    <span className="text-white/80">ระดับชั้น:</span>
                    <span>{subject.level || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/80">แผนก:</span>
                    <span>{subject.department}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/80">ห้อง:</span>
                    <span>{subject.room || '1'}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {visibleSubjects.length === 0 && (
        <div className="bg-white rounded-3xl border border-gray-100 p-8 text-center text-gray-400">ไม่พบรายวิชาตามตัวกรองที่เลือก</div>
      )}

      {deletingSubject && (
        <ConfirmDialog
          title="ลบรายวิชา?"
          message={`คุณต้องการลบรายวิชา ${deletingSubject.name} หรือไม่`}
          confirmLabel="ลบรายวิชา"
          cancelLabel="ยกเลิก"
          onConfirm={confirmDelete}
          onCancel={() => setDeletingSubject(null)}
          variant="danger"
        />
      )}

      {isMigratingRooms && (
        <ConfirmDialog
          title="เติมห้องให้รายวิชาเก่า?"
          message={`จะอัปเดตรายวิชา ${invalidRoomSubjects.length} รายการที่ยังไม่มีห้องหรือข้อมูลห้องไม่ถูกต้อง ให้เป็นห้อง 1`}
          confirmLabel={isSaving ? 'กำลังอัปเดต...' : 'อัปเดตข้อมูล'}
          cancelLabel="ยกเลิก"
          onConfirm={confirmMigrateRooms}
          onCancel={() => setIsMigratingRooms(false)}
          variant="primary"
        />
      )}
    </div>
  );
}
