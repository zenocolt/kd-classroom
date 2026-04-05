import { useMemo, useState } from 'react';
import { BookOpen, ChevronRight, Edit, Plus, Trash2, X } from 'lucide-react';
import { Subject } from '../types';
import { SubjectsPageProps } from '../types/views/management';
import { cn } from '../lib/utils';
import { getSubjectCardGradient } from '../utils/domain/subjectHelpers';
import { useSubjectActions } from '../hooks/useSubjectActions';
import { ConfirmDialog } from '../components/shared/ConfirmDialog';

export function SubjectsPage({ subjects, user, onSubjectClick }: SubjectsPageProps) {
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

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">จัดการรายวิชา</h2>
            <p className="text-gray-500 mt-1">สร้างและจัดการรายวิชาทั้งหมดในระบบ</p>
          </div>
          <div className="flex items-center gap-3">
            {invalidRoomSubjects.length > 0 && (
              <button
                onClick={() => setIsMigratingRooms(true)}
                className="inline-flex items-center gap-2 px-5 py-3 border border-amber-200 text-sm font-bold rounded-xl text-amber-700 bg-amber-50 hover:bg-amber-100 transition-all"
              >
                เติมห้องรายวิชาเก่า ({invalidRoomSubjects.length})
              </button>
            )}
            <button
              onClick={openCreateForm}
              className="inline-flex items-center gap-2 px-5 py-3 border border-transparent text-sm font-bold rounded-xl text-white bg-primary hover:bg-primary/90 transition-all"
            >
              <Plus className="w-4 h-4" />
              เพิ่มรายวิชา
            </button>
          </div>
        </div>
      </div>

      {isFormOpen && (
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 space-y-5">
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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {subjects.map((subject: Subject, index: number) => {
          const gradient = getSubjectCardGradient(index);
          return (
            <div
              key={subject.id}
              className={cn(
                'relative rounded-3xl p-6 text-white overflow-hidden group hover:shadow-2xl transition-all duration-300',
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
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold">{subject.name}</h3>
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
