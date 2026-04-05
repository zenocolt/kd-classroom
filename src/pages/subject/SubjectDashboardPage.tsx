import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { format } from 'date-fns';
import {
  ArrowLeft,
  CheckCircle,
  Edit,
  ExternalLink,
  FileText,
  LayoutDashboard,
  Plus,
  Trash2,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { QuickAccessCardProps } from '../../types/views/shared';
import { CourseContentViewProps, SlidesViewProps, SubjectDashboardProps } from '../../types/views/subject';
import { useSlideActions } from '../../hooks/useSlideActions';
import { useCourseContentActions } from '../../hooks/useCourseContentActions';
import { doesStudentBelongToSubject } from '../../utils/domain/subjectHelpers';

export function SubjectDashboard({
  subject,
  students,
  attendance,
  scores,
  slides,
  courseContent,
  user,
  subView,
  onSubViewChange,
  onBack,
  onNavigateAttendance,
  onNavigateScores
}: SubjectDashboardProps) {
  if (!subject) return null;

  const subjectRoom = subject.room || '1';
  const subjectStudents = students.filter((s) => doesStudentBelongToSubject(s, subject));

  const subjectScores = scores.filter((s) => s.subjectId === subject.id);
  const subjectAttendance = attendance.filter((a) => a.subjectId === subject.id);
  const subjectSlides = slides.filter((s) => s.subjectId === subject.id);
  const subjectContent = courseContent.filter((c) => c.subjectId === subject.id);

  if (subView === 'slides') {
    return <SlidesView subject={subject} slides={subjectSlides} user={user} onBack={() => onSubViewChange('main')} />;
  }

  if (subView === 'content') {
    return <CourseContentView subject={subject} content={subjectContent} user={user} onBack={() => onSubViewChange('main')} />;
  }

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
      <header className="flex items-center gap-6">
        <button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100 hover:bg-page-bg transition-colors text-gray-500">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h2 className="text-4xl font-bold text-gray-900 tracking-tight mb-1">{subject.name}</h2>
          <p className="text-gray-500 font-medium">{subject.code} • {subject.level} • ห้อง {subjectRoom} • {subject.department}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <QuickAccessCard icon={<CheckCircle />} label="การเข้าเรียน" onClick={onNavigateAttendance} color="bg-green-100 text-green-600" />
        <QuickAccessCard icon={<FileText />} label="งานที่มอบหมาย" onClick={onNavigateScores} color="bg-primary/10 text-primary" />
        <QuickAccessCard icon={<LayoutDashboard />} label="สไลด์การสอน" onClick={() => onSubViewChange('slides')} color="bg-secondary/20 text-secondary" />
        <QuickAccessCard icon={<FileText />} label="เนื้อหาบทเรียน" onClick={() => onSubViewChange('content')} color="bg-accent/20 text-accent" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-page-bg flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900">รายชื่อนักเรียน</h3>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{subjectStudents.length} คน</span>
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-white shadow-sm">
                <tr className="text-[10px] uppercase tracking-widest font-bold text-gray-400">
                  <th className="px-6 py-4">นักเรียน</th>
                  <th className="px-6 py-4">รหัสนักเรียน</th>
                  <th className="px-6 py-4 text-right">ผลการเรียน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-page-bg">
                {subjectStudents.map((student) => {
                  const studentScores = subjectScores.filter((s) => s.studentId === student.studentId);
                  const avg = studentScores.length > 0
                    ? (studentScores.reduce((acc, s) => acc + (s.score / s.maxScore), 0) / studentScores.length * 100).toFixed(0)
                    : 0;
                  return (
                    <tr key={student.id} className="hover:bg-page-bg/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-page-bg rounded-full flex items-center justify-center text-xs font-bold text-primary">
                            {student.name.charAt(0)}
                          </div>
                          <span className="font-semibold text-gray-900">{student.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{student.studentId}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex flex-col items-end">
                          <span className={cn('font-bold', Number(avg) >= 80 ? 'text-green-600' : Number(avg) >= 50 ? 'text-accent' : 'text-red-500')}>{avg}%</span>
                          <div className="w-16 h-1 bg-gray-100 rounded-full mt-1 overflow-hidden">
                            <div className={cn('h-full rounded-full', Number(avg) >= 80 ? 'bg-green-500' : Number(avg) >= 50 ? 'bg-accent' : 'bg-red-500')} style={{ width: `${avg}%` }}></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-6">สถิติรายวิชา</h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">การเข้าเรียนเฉลี่ย</span>
                <span className="font-bold text-gray-900">
                  {subjectStudents.length > 0 ? (subjectAttendance.filter((a) => a.status === 'present').length / (subjectStudents.length || 1) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">คะแนนเฉลี่ย</span>
                <span className="font-bold text-gray-900">
                  {subjectScores.length > 0 ? (subjectScores.reduce((acc, s) => acc + (s.score / s.maxScore), 0) / subjectScores.length * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">จำนวนงานที่มอบหมาย</span>
                <span className="font-bold text-gray-900">{new Set(subjectScores.map((s) => s.description)).size}</span>
              </div>
            </div>
          </div>

          <div className="bg-primary p-6 rounded-3xl shadow-lg shadow-primary/20 text-white">
            <h4 className="font-bold mb-2">บันทึกจากผู้สอน</h4>
            <p className="text-sm opacity-80 leading-relaxed">
              การเตรียมตัวสอบปลายภาคจะเริ่มในสัปดาห์หน้า โปรดตรวจสอบให้แน่ใจว่าคะแนนสอบกลางภาคทั้งหมดสรุปเสร็จสิ้นภายในวันศุกร์นี้
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function SlidesView({ subject, slides, user, onBack }: SlidesViewProps) {
  const {
    isAdding, editingSlide, isDeleting,
    title, setTitle, url, setUrl,
    openCreate, openEdit, cancelForm,
    handleSubmit, requestDelete, cancelDelete, confirmDelete,
  } = useSlideActions(subject.id, user.uid);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100 hover:bg-page-bg transition-colors text-gray-500">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-4xl font-bold text-gray-900 tracking-tight mb-1">สไลด์การสอน</h2>
            <p className="text-gray-500 font-medium">{subject.name} ({subject.code})</p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="bg-primary text-white px-6 py-3 rounded-2xl font-semibold flex items-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
        >
          <Plus className="w-5 h-5" />
          เพิ่มสไลด์
        </button>
      </header>

      <AnimatePresence>
        {(isAdding || editingSlide) && (
          <motion.form
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            onSubmit={handleSubmit}
            className="bg-white p-8 rounded-3xl shadow-xl border border-primary/20 space-y-6"
          >
            <h3 className="text-xl font-bold text-gray-900">{editingSlide ? 'แก้ไขสไลด์' : 'เพิ่มสไลด์ใหม่'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">หัวข้อสไลด์</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="เช่น บทที่ 1 แนะนำรายวิชา" className="w-full p-4 bg-page-bg border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary outline-none" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">URL สไลด์ (Google Slides / Canva / อื่นๆ)</label>
                <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://docs.google.com/presentation/..." className="w-full p-4 bg-page-bg border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary outline-none" required />
              </div>
            </div>
            <div className="flex justify-end gap-4">
              <button type="button" onClick={cancelForm} className="px-6 py-3 rounded-2xl font-semibold text-gray-500 hover:bg-page-bg transition-colors">ยกเลิก</button>
              <button type="submit" className="bg-primary text-white px-8 py-3 rounded-2xl font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">บันทึก</button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {slides.map((slide) => (
          <div key={slide.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all group">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-secondary/20 rounded-2xl flex items-center justify-center text-primary">
                <LayoutDashboard className="w-6 h-6" />
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => openEdit(slide)} className="p-2 text-gray-400 hover:text-primary hover:bg-page-bg rounded-lg transition-colors">
                  <Edit className="w-4 h-4" />
                </button>
                <button onClick={() => requestDelete(slide.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">{slide.title}</h3>
            <a href={slide.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-3 bg-page-bg text-primary font-bold rounded-xl hover:bg-secondary/20 transition-all">
              <ExternalLink className="w-4 h-4" />
              เปิดสไลด์
            </a>
          </div>
        ))}
        {slides.length === 0 && !isAdding && !editingSlide && (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-gray-100">
            <LayoutDashboard className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400 font-medium">ยังไม่มีสไลด์การสอนในวิชานี้</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isDeleting && (
          <ConfirmDialog
            title="ลบสไลด์การสอน?"
            message="คุณแน่ใจหรือไม่ว่าต้องการลบสไลด์นี้? การดำเนินการนี้ไม่สามารถย้อนกลับได้"
            confirmLabel="ลบสไลด์"
            cancelLabel="ยกเลิก"
            onConfirm={confirmDelete}
            onCancel={cancelDelete}
            variant="danger"
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function CourseContentView({ subject, content, user, onBack }: CourseContentViewProps) {
  const {
    isAdding, editingContent, isDeleting,
    title, setTitle, description, setDescription, url, setUrl,
    openCreate, openEdit, cancelForm,
    handleSubmit, requestDelete, cancelDelete, confirmDelete,
  } = useCourseContentActions(subject.id, user.uid);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100 hover:bg-page-bg transition-colors text-gray-500">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-4xl font-bold text-gray-900 tracking-tight mb-1">เนื้อหาบทเรียน</h2>
            <p className="text-gray-500 font-medium">{subject.name} ({subject.code})</p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="bg-accent text-white px-6 py-3 rounded-2xl font-semibold flex items-center gap-2 hover:bg-accent/90 transition-all shadow-lg shadow-accent/20"
        >
          <Plus className="w-5 h-5" />
          เพิ่มเนื้อหา
        </button>
      </header>

      <AnimatePresence>
        {(isAdding || editingContent) && (
          <motion.form initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl shadow-xl border border-accent/20 space-y-6">
            <h3 className="text-xl font-bold text-gray-900">{editingContent ? 'แก้ไขเนื้อหา' : 'เพิ่มเนื้อหาใหม่'}</h3>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">หัวข้อเนื้อหา</label>
                  <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="เช่น บทที่ 2 พื้นฐานการเขียนโปรแกรม" className="w-full p-4 bg-page-bg border-none rounded-2xl text-sm focus:ring-2 focus:ring-accent outline-none" required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">URL แนบ (ถ้ามี)</label>
                  <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/resource" className="w-full p-4 bg-page-bg border-none rounded-2xl text-sm focus:ring-2 focus:ring-accent outline-none" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">รายละเอียดเนื้อหา</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="อธิบายเนื้อหาบทเรียนโดยสังเขป..." rows={4} className="w-full p-4 bg-page-bg border-none rounded-2xl text-sm focus:ring-2 focus:ring-accent outline-none resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-4">
              <button type="button" onClick={cancelForm} className="px-6 py-3 rounded-2xl font-semibold text-gray-500 hover:bg-page-bg transition-colors">ยกเลิก</button>
              <button type="submit" className="bg-accent text-white px-8 py-3 rounded-2xl font-semibold hover:bg-accent/90 transition-all shadow-lg shadow-accent/20">บันทึก</button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        {content.map((item) => (
          <div key={item.id} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all group flex items-start justify-between gap-6">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-accent/10 rounded-2xl flex items-center justify-center text-accent">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{item.title}</h3>
                  <p className="text-xs text-gray-400">อัปเดตเมื่อ: {item.timestamp ? format(item.timestamp.toDate(), 'd MMM yyyy') : '...'}</p>
                </div>
              </div>
              {item.description && <p className="text-gray-600 text-sm leading-relaxed max-w-2xl">{item.description}</p>}
              {item.url && (
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-accent font-bold text-sm hover:underline">
                  <ExternalLink className="w-4 h-4" />
                  ดูแหล่งข้อมูลเพิ่มเติม
                </a>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => openEdit(item)} className="p-3 text-gray-400 hover:text-accent hover:bg-accent/10 rounded-xl transition-colors">
                <Edit className="w-5 h-5" />
              </button>
              <button onClick={() => requestDelete(item.id)} className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
        {content.length === 0 && !isAdding && !editingContent && (
          <div className="py-20 text-center bg-white rounded-3xl border-2 border-dashed border-gray-100">
            <FileText className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400 font-medium">ยังไม่มีเนื้อหาบทเรียนในวิชานี้</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isDeleting && (
          <ConfirmDialog
            title="ลบเนื้อหาบทเรียน?"
            message="คุณแน่ใจหรือไม่ว่าต้องการลบเนื้อหานี้? การดำเนินการนี้ไม่สามารถย้อนกลับได้"
            confirmLabel="ลบเนื้อหา"
            cancelLabel="ยกเลิก"
            onConfirm={confirmDelete}
            onCancel={cancelDelete}
            variant="danger"
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function QuickAccessCard({ icon, label, onClick, color }: QuickAccessCardProps) {
  return (
    <button onClick={onClick} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-all flex flex-col items-center gap-3 group">
      <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110', color)}>
        {React.cloneElement(icon as React.ReactElement<{ className: string }>, { className: 'w-6 h-6' })}
      </div>
      <span className="text-sm font-bold text-gray-700">{label}</span>
    </button>
  );
}
