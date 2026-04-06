import React, { useEffect, useMemo, useRef, useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { Timestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  BellRing,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock,
  Edit,
  MessagesSquare,
  Plus,
  Trash2,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { Assignment, Student, Subject, Submission } from '../types';
import { cn } from '../lib/utils';
import { ConfirmDialog } from '../components/shared/ConfirmDialog';
import { ThaiDatePicker } from '../components/ThaiDatePicker';
import { useAssignmentActions } from '../hooks/useAssignmentActions';
import { notify } from '../utils/notify';
import { doesStudentBelongToSubject } from '../utils/domain/subjectHelpers';

// ─── Props ────────────────────────────────────────────────────────────────────

interface AssignmentsPageProps {
  user: FirebaseUser;
  assignments: Assignment[];
  submissions: Submission[];
  subjects: Subject[];
  students: Student[];
  initialSubjectId?: string | null;
  onBackToSubject?: () => void;
}

function findScrollContainer(element: HTMLElement | null): HTMLElement | null {
  let current = element?.parentElement ?? null;
  while (current) {
    const { overflowY } = window.getComputedStyle(current);
    if ((overflowY === 'auto' || overflowY === 'scroll') && current.scrollHeight > current.clientHeight) {
      return current;
    }
    current = current.parentElement;
  }
  return document.scrollingElement instanceof HTMLElement ? document.scrollingElement : null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDueDate(ts: Timestamp): string {
  const date = ts.toDate();
  return format(date, 'dd/MM/yyyy HH:mm');
}

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

function getDueDateStatus(ts: Timestamp): 'overdue' | 'today' | 'tomorrow' | 'upcoming' {
  const due = ts.toDate();
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
  const startOfDayAfter = new Date(startOfTomorrow);
  startOfDayAfter.setDate(startOfDayAfter.getDate() + 1);

  if (due < now) return 'overdue';
  if (due < startOfTomorrow) return 'today';
  if (due < startOfDayAfter) return 'tomorrow';
  return 'upcoming';
}

// ─── Sub-component: Assignment Detail (submission tracking) ───────────────────

interface AssignmentDetailProps {
  assignment: Assignment;
  subject: Subject | undefined;
  students: Student[];
  submissions: Submission[];
  userId: string;
  onBack: () => void;
  onBackToList: () => void;
  onBackToSubject?: () => void;
  onDeleteAssignment: (a: Assignment) => void;
  onEditAssignment: (a: Assignment) => void;
}

function AssignmentDetail({
  assignment,
  subject,
  students,
  submissions,
  userId,
  onBack,
  onBackToList,
  onBackToSubject,
  onDeleteAssignment,
  onEditAssignment,
}: AssignmentDetailProps) {
  const { isSaving, handleToggleSubmission, handleSendRoomReminder, handleSendGroupSummary } = useAssignmentActions(userId);
  const [isReminderConfirmOpen, setIsReminderConfirmOpen] = useState(false);
  const [isGroupSummaryConfirmOpen, setIsGroupSummaryConfirmOpen] = useState(false);

  // Students enrolled in this assignment's subject
  const subjectStudents = useMemo(
    () => (subject ? students.filter((s) => doesStudentBelongToSubject(s, subject)) : []),
    [students, subject]
  );

  // Submissions for this assignment, keyed by studentId (Firestore doc ID)
  const submissionMap = useMemo(() => {
    const map = new Map<string, Submission>();
    submissions
      .filter((s) => s.assignmentId === assignment.id)
      .forEach((s) => map.set(s.studentId, s));
    return map;
  }, [submissions, assignment.id]);

  const submittedCount = useMemo(
    () => subjectStudents.filter((s) => submissionMap.get(s.id)?.status === 'submitted').length,
    [subjectStudents, submissionMap]
  );

  const dueDateStatus = getDueDateStatus(assignment.due_date);
  const pendingStudentDocIds = useMemo(
    () => subjectStudents.filter((s) => submissionMap.get(s.id)?.status !== 'submitted').map((s) => s.id),
    [subjectStudents, submissionMap]
  );

  const statusLabel: Record<typeof dueDateStatus, string> = {
    overdue: 'เลยกำหนด',
    today: 'ครบกำหนดวันนี้',
    tomorrow: 'ครบกำหนดพรุ่งนี้',
    upcoming: 'ยังไม่ครบกำหนด',
  };

  const statusColor: Record<typeof dueDateStatus, string> = {
    overdue: 'bg-red-100 text-red-700',
    today: 'bg-amber-100 text-amber-700',
    tomorrow: 'bg-yellow-100 text-yellow-800',
    upcoming: 'bg-green-100 text-green-700',
  };

  const toggle = async (student: Student) => {
    const existing = submissionMap.get(student.id);
    const currentStatus = existing?.status ?? 'not_submitted';
    const newStatus = currentStatus === 'submitted' ? 'not_submitted' : 'submitted';
    await handleToggleSubmission(existing?.id ?? null, assignment.id, student.id, newStatus);
  };

  const sendRoomReminder = async () => {
    if (pendingStudentDocIds.length === 0) {
      notify({
        type: 'info',
        title: 'ไม่ต้องทวงเพิ่มแล้ว',
        message: 'ทุกคนในห้องนี้ส่งงานเรียบร้อยแล้ว',
      });
      return;
    }

    const result = await handleSendRoomReminder(assignment.id, pendingStudentDocIds);
    if (!result) return;

    notify({
      type: result.failed > 0 ? 'warning' : 'success',
      title: `ส่งทวงงานสำเร็จ ${result.sent} คน`,
      message:
        `กลุ่มที่เลือก ${result.requested} คน • ยังไม่ส่งจริง ${result.pending} คน • ` +
        `ไม่มี LINE ${result.skippedNoLine} คน • ส่งไม่สำเร็จ ${result.failed} คน`,
      durationMs: 7000,
    });
  };

  const sendGroupSummary = async () => {
    if (!subject?.lineGroupId) {
      notify({
        type: 'warning',
        title: 'วิชานี้ยังไม่ผูกไลน์กลุ่ม',
        message: `ให้พิมพ์คำสั่งในไลน์กลุ่มว่า bind: ${subject?.code ?? 'รหัสวิชา'} เพื่อเชื่อมกลุ่มก่อน`,
        actionLabel: subject?.code ? `คัดลอก bind: ${subject.code}` : undefined,
        onAction: subject?.code
          ? async () => {
              try {
                await navigator.clipboard.writeText(`bind: ${subject.code}`);
                notify({
                  type: 'success',
                  title: 'คัดลอกคำสั่งแล้ว',
                  message: `นำไปส่งในไลน์กลุ่มของวิชา ${subject.name}`,
                });
              } catch {
                notify({
                  type: 'info',
                  title: 'คัดลอกอัตโนมัติไม่สำเร็จ',
                  message: `ให้พิมพ์คำสั่งนี้ในไลน์กลุ่มแทน: bind: ${subject.code}`,
                });
              }
            }
          : undefined,
        durationMs: 7000,
      });
      return;
    }

    const result = await handleSendGroupSummary(assignment.id);
    if (!result) return;

    notify({
      type: 'success',
      title: 'ส่งสรุปเข้ากลุ่มแล้ว',
      message: `วิชา ${result.subjectName} • นักเรียนที่ยังไม่ส่ง ${result.pending} คน`,
      durationMs: 6500,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      {/* Header */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors font-medium text-sm mt-1"
          >
            <ArrowLeft className="w-4 h-4" />
            กลับ
          </button>
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-gray-400 sm:text-sm">
            {subject && onBackToSubject ? (
              <button
                type="button"
                onClick={onBackToSubject}
                className="text-left text-gray-500 transition-colors hover:text-gray-800"
              >
                {subject.code} • {subject.name}
              </button>
            ) : (
              <span className="text-gray-500">{subject ? `${subject.code} • ${subject.name}` : 'รายวิชา'}</span>
            )}
            <ChevronRight className="w-4 h-4 text-gray-300" />
            <button
              type="button"
              onClick={onBackToList}
              className="transition-colors hover:text-gray-700"
            >
              งานที่มอบหมาย
            </button>
            <ChevronRight className="w-4 h-4 text-gray-300" />
            <span className="text-gray-700">รายละเอียดงาน</span>
          </div>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-end">
          <button
            onClick={() => setIsGroupSummaryConfirmOpen(true)}
            className="flex min-h-[56px] items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-3 text-center text-sm font-semibold leading-tight text-sky-700 transition-colors hover:bg-sky-100 sm:min-h-0 sm:px-4 sm:py-2"
          >
            <MessagesSquare className="h-4 w-4 shrink-0" />
            ส่งสรุปเข้ากลุ่ม
          </button>
          <button
            onClick={() => setIsReminderConfirmOpen(true)}
            disabled={isSaving || pendingStudentDocIds.length === 0}
            className="flex min-h-[56px] items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-3 py-3 text-center text-sm font-semibold leading-tight text-primary transition-colors hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0 sm:px-4 sm:py-2"
          >
            <BellRing className="h-4 w-4 shrink-0" />
            {isSaving ? 'กำลังส่ง...' : `ทวงงานห้องนี้ (${pendingStudentDocIds.length})`}
          </button>
          <button
            onClick={() => onEditAssignment(assignment)}
            className="flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-3 text-center text-sm font-medium text-gray-700 transition-colors hover:bg-page-bg sm:min-h-0 sm:px-4 sm:py-2"
          >
            <Edit className="h-4 w-4 shrink-0" />
            แก้ไข
          </button>
          <button
            onClick={() => onDeleteAssignment(assignment)}
            className="flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-red-200 px-3 py-3 text-center text-sm font-medium text-red-600 transition-colors hover:bg-red-50 sm:min-h-0 sm:px-4 sm:py-2"
          >
            <Trash2 className="h-4 w-4 shrink-0" />
            ลบ
          </button>
        </div>
      </header>

      {/* Assignment Info Card */}
      <div className="space-y-3 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:p-8 sm:space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
          <div>
            <h2 className="mb-1 text-xl font-bold text-gray-900 sm:text-2xl">{assignment.title}</h2>
            <p className="text-gray-500 text-sm">{subject?.name ?? '—'}</p>
          </div>
          <span className={cn('px-3 py-1 rounded-full text-xs font-semibold', statusColor[dueDateStatus])}>
            {statusLabel[dueDateStatus]}
          </span>
        </div>

        {assignment.description && (
          <p className="text-gray-600 text-sm leading-relaxed">{assignment.description}</p>
        )}

        <div className="flex items-start gap-2 text-sm text-gray-500 sm:items-center">
          <Calendar className="w-4 h-4 text-primary" />
          <span>กำหนดส่ง: <span className="font-semibold text-gray-800">{formatDueDate(assignment.due_date)}</span></span>
        </div>
      </div>

      <AnimatePresence>
        {isReminderConfirmOpen && (
          <ConfirmDialog
            title="ส่งทวงงานรายห้อง"
            message={`ต้องการส่งข้อความทวงงานให้ ${pendingStudentDocIds.length} คนในห้องนี้ใช่ไหม ระบบจะส่งเฉพาะคนที่ยังไม่ส่งงานและผูก LINE แล้ว`}
            confirmLabel="ส่งทวงงาน"
            cancelLabel="ยกเลิก"
            variant="warning"
            onCancel={() => setIsReminderConfirmOpen(false)}
            onConfirm={async () => {
              setIsReminderConfirmOpen(false);
              await sendRoomReminder();
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isGroupSummaryConfirmOpen && (
          <ConfirmDialog
            title="ส่งสรุปเข้ากลุ่มวิชา"
            message={subject?.lineGroupId
              ? `ต้องการส่งสรุปรายชื่อนักเรียนที่ยังไม่ส่งงานเข้ากลุ่มของวิชา ${subject.name} ใช่ไหม`
              : `วิชานี้ยังไม่ผูกไลน์กลุ่ม ระบบจะแนะนำคำสั่ง bind ให้แทน`}
            confirmLabel={subject?.lineGroupId ? 'ส่งเข้ากลุ่ม' : 'ดูวิธีผูกกลุ่ม'}
            cancelLabel="ยกเลิก"
            variant="info"
            onCancel={() => setIsGroupSummaryConfirmOpen(false)}
            onConfirm={async () => {
              setIsGroupSummaryConfirmOpen(false);
              await sendGroupSummary();
            }}
          />
        )}
      </AnimatePresence>

      {/* Submission Tracking */}
      <div className="space-y-4 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:p-8 sm:space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="flex items-center gap-2 text-base font-bold text-gray-900 sm:text-lg">
            <Users className="w-5 h-5 text-primary" />
            การส่งงาน
          </h3>
          <div className="flex items-center gap-3 pl-7 sm:pl-0">
            <span className="text-sm text-gray-500">
              ส่งแล้ว{' '}
              <span className="font-bold text-primary">{submittedCount}</span>
              /{subjectStudents.length} คน
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{
              width: subjectStudents.length > 0
                ? `${(submittedCount / subjectStudents.length) * 100}%`
                : '0%',
            }}
          />
        </div>

        {subjectStudents.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">ไม่มีนักเรียนในวิชานี้</p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {subjectStudents.map((student) => {
              const sub = submissionMap.get(student.id);
              const submitted = sub?.status === 'submitted';
              return (
                <li key={student.id} className="flex items-center justify-between gap-3 py-2.5 sm:gap-4 sm:py-3">
                  <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {student.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{student.name}</p>
                      <p className="text-xs text-gray-400">{student.studentId}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggle(student)}
                    className={cn(
                      'flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-all sm:px-3',
                      submitted
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    )}
                  >
                    {submitted ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        ส่งแล้ว
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5" />
                        ยังไม่ส่ง
                      </>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </motion.div>
  );
}

// ─── Sub-component: Assignment Form ──────────────────────────────────────────

interface AssignmentFormProps {
  subjects: Subject[];
  initialData?: Assignment;
  isSaving: boolean;
  onSave: (data: { title: string; description: string; subjectId: string; dueDateStr: string }) => void;
  onCancel: () => void;
}

function AssignmentForm({ subjects, initialData, isSaving, onSave, onCancel }: AssignmentFormProps) {
  const [title, setTitle] = useState(initialData?.title ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [subjectId, setSubjectId] = useState(initialData?.subjectId ?? (subjects[0]?.id ?? ''));
  const [isSubjectOpen, setIsSubjectOpen] = useState(false);
  const selectedSubject = subjects.find((s) => s.id === subjectId);
  const initialDue = useMemo(() => {
    if (initialData?.due_date) return initialData.due_date.toDate();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 0, 0);
    return tomorrow;
  }, [initialData]);
  const [dueDateObj, setDueDateObj] = useState<Date>(
    new Date(initialDue.getFullYear(), initialDue.getMonth(), initialDue.getDate())
  );
  const [dueHour, setDueHour] = useState(format(initialDue, 'HH'));
  const [dueMinute, setDueMinute] = useState(format(initialDue, 'mm'));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !subjectId) return;
    const dueDate = new Date(dueDateObj);
    dueDate.setHours(Number(dueHour), Number(dueMinute), 0, 0);
    const dueDateStr = format(dueDate, "yyyy-MM-dd'T'HH:mm");
    onSave({ title: title.trim(), description: description.trim(), subjectId, dueDateStr });
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="bg-white p-8 rounded-3xl shadow-xl border border-primary/20 space-y-6"
    >
      <h3 className="text-lg font-bold text-gray-900">
        {initialData ? 'แก้ไขงาน' : 'สร้างงานใหม่'}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Title */}
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-bold text-gray-700">ชื่องาน *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="เช่น รายงานบทที่ 3"
            required
            className="w-full px-4 py-3 bg-page-bg border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
          />
        </div>

        {/* Description */}
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-bold text-gray-700">คำอธิบาย</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="รายละเอียดเพิ่มเติมเกี่ยวกับงานนี้..."
            rows={3}
            className="w-full px-4 py-3 bg-page-bg border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none transition-all resize-none"
          />
        </div>

        {/* Subject */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700">รายวิชา *</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsSubjectOpen((v) => !v)}
              className={cn(
                'w-full flex items-center justify-between gap-3 p-4 bg-page-bg rounded-2xl text-sm transition-all outline-none',
                isSubjectOpen ? 'ring-2 ring-primary' : 'focus:ring-2 focus:ring-primary'
              )}
            >
              <div className="flex items-center gap-2 truncate">
                <BookOpen className="w-4 h-4 text-primary shrink-0" />
                <span className={cn('truncate', selectedSubject ? 'text-gray-800 font-medium' : 'text-gray-400')}>
                  {selectedSubject ? `${selectedSubject.code} - ${selectedSubject.name}` : 'เลือกรายวิชา'}
                </span>
              </div>
              <ChevronDown className={cn('w-4 h-4 text-gray-400 shrink-0 transition-transform', isSubjectOpen && 'rotate-180')} />
            </button>
            {isSubjectOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsSubjectOpen(false)} />
                <div className="absolute top-full mt-2 left-0 right-0 z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  <ul className="py-2 max-h-56 overflow-y-auto">
                    {subjects.map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSubjectId(s.id);
                            setIsSubjectOpen(false);
                          }}
                          className={cn(
                            'w-full text-left px-4 py-3 text-sm transition-colors flex items-center gap-3',
                            subjectId === s.id ? 'bg-primary/10 text-primary font-semibold' : 'text-gray-700 hover:bg-page-bg'
                          )}
                        >
                          <div className={cn('w-2 h-2 rounded-full shrink-0', subjectId === s.id ? 'bg-primary' : 'bg-gray-200')} />
                          <div>
                            <div className="font-semibold">{s.code} - {s.name}</div>
                            <div className="text-[11px] text-gray-400">{s.level} · ห้อง {s.room || '1'}</div>
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

        {/* Due date + time */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-700">กำหนดส่ง (วันและเวลา) *</label>
          <div className="space-y-3">
            <ThaiDatePicker
              value={dueDateObj}
              onChange={(date) => setDueDateObj(date)}
              className="w-full"
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-semibold">ชั่วโมง</label>
                <select
                  value={dueHour}
                  onChange={(e) => setDueHour(e.target.value)}
                  className="w-full p-3 bg-page-bg border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary outline-none"
                >
                  {HOUR_OPTIONS.map((hour) => (
                    <option key={hour} value={hour}>{hour}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-semibold">นาที</label>
                <select
                  value={dueMinute}
                  onChange={(e) => setDueMinute(e.target.value)}
                  className="w-full p-3 bg-page-bg border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary outline-none"
                >
                  {MINUTE_OPTIONS.map((minute) => (
                    <option key={minute} value={minute}>{minute}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-page-bg transition-colors"
        >
          ยกเลิก
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-60"
        >
          {isSaving ? 'กำลังบันทึก...' : initialData ? 'บันทึกการแก้ไข' : 'สร้างงาน'}
        </button>
      </div>
    </motion.form>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function AssignmentsPage({
  user,
  assignments,
  submissions,
  subjects,
  students,
  initialSubjectId,
  onBackToSubject,
}: AssignmentsPageProps) {
  const {
    isSaving,
    handleCreateAssignment,
    handleUpdateAssignment,
    handleDeleteAssignment,
  } = useAssignmentActions(user.uid);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [deletingAssignment, setDeletingAssignment] = useState<Assignment | null>(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [filterSubjectId, setFilterSubjectId] = useState<string>(initialSubjectId ?? 'all');
  const [isSubjectFilterOpen, setIsSubjectFilterOpen] = useState(false);
  const listViewRef = useRef<HTMLDivElement | null>(null);
  const savedScrollTopRef = useRef(0);
  const shouldRestoreScrollRef = useRef(false);

  useEffect(() => {
    setFilterSubjectId(initialSubjectId ?? 'all');
  }, [initialSubjectId]);

  useEffect(() => {
    if (selectedAssignmentId || !shouldRestoreScrollRef.current) return;

    const restoreScroll = () => {
      const container = findScrollContainer(listViewRef.current);
      if (container) {
        container.scrollTo({ top: savedScrollTopRef.current, behavior: 'auto' });
      }
      shouldRestoreScrollRef.current = false;
    };

    const frameId = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(restoreScroll);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [selectedAssignmentId]);

  const selectedAssignment = useMemo(
    () => assignments.find((a) => a.id === selectedAssignmentId) ?? null,
    [assignments, selectedAssignmentId]
  );

  // Sorted newest-first, with overdue at the top
  const filteredAssignments = useMemo(() => {
    const base = filterSubjectId === 'all'
      ? assignments
      : assignments.filter((a) => a.subjectId === filterSubjectId);

    return [...base].sort((a, b) => {
      const statusOrder = { overdue: 0, today: 1, tomorrow: 2, upcoming: 3 };
      const aStatus = getDueDateStatus(a.due_date);
      const bStatus = getDueDateStatus(b.due_date);
      if (statusOrder[aStatus] !== statusOrder[bStatus]) {
        return statusOrder[aStatus] - statusOrder[bStatus];
      }
      return a.due_date.toMillis() - b.due_date.toMillis();
    });
  }, [assignments, filterSubjectId]);

  // Summary strip
  const overdueCount = useMemo(
    () => assignments.filter((a) => getDueDateStatus(a.due_date) === 'overdue').length,
    [assignments]
  );
  const dueSoonCount = useMemo(
    () =>
      assignments.filter(
        (a) =>
          getDueDateStatus(a.due_date) === 'today' ||
          getDueDateStatus(a.due_date) === 'tomorrow'
      ).length,
    [assignments]
  );

  const subjectMap = useMemo(() => {
    const m = new Map<string, Subject>();
    subjects.forEach((s) => m.set(s.id, s));
    return m;
  }, [subjects]);

  const contextSubject = useMemo(
    () => (initialSubjectId ? subjectMap.get(initialSubjectId) ?? null : null),
    [initialSubjectId, subjectMap]
  );

  const openAssignmentDetail = (assignmentId: string) => {
    const container = findScrollContainer(listViewRef.current);
    savedScrollTopRef.current = container?.scrollTop ?? 0;
    setSelectedAssignmentId(assignmentId);
  };

  const returnToAssignmentList = () => {
    shouldRestoreScrollRef.current = true;
    setSelectedAssignmentId(null);
  };

  // Students per subject for bulk-initialising submissions
  const getStudentsForSubject = (subjectId: string) => {
    const subject = subjectMap.get(subjectId);
    if (!subject) return [];
    return students
      .filter((s) => doesStudentBelongToSubject(s, subject))
      .map((s) => s.id);
  };

  const openCreate = () => {
    setEditingAssignment(null);
    setIsFormOpen(true);
  };

  const openEdit = (a: Assignment) => {
    setEditingAssignment(a);
    setIsFormOpen(true);
    setSelectedAssignmentId(null);
  };

  const handleSave = async (data: {
    title: string;
    description: string;
    subjectId: string;
    dueDateStr: string;
  }) => {
    let ok = false;
    if (editingAssignment) {
      ok = await handleUpdateAssignment(editingAssignment.id, data);
    } else {
      const studentIds = getStudentsForSubject(data.subjectId);
      const createdAssignmentId = await handleCreateAssignment(data, studentIds);
      ok = Boolean(createdAssignmentId);
      if (createdAssignmentId) {
        notify({
          type: 'success',
          title: 'สร้างงานสำเร็จ',
          message: `เพิ่มงาน "${data.title}" เรียบร้อยแล้ว`,
          actionLabel: 'เปิดงานนี้',
          onAction: () => setSelectedAssignmentId(createdAssignmentId),
          durationMs: 6500,
        });
      }
    }
    if (ok) {
      setIsFormOpen(false);
      if (editingAssignment) {
        notify({
          type: 'success',
          title: 'บันทึกการแก้ไขแล้ว',
          message: `อัปเดตงาน "${data.title}" เรียบร้อย`,
        });
      }
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingAssignment) return;
    const ok = await handleDeleteAssignment(deletingAssignment);
    if (ok) {
      setDeletingAssignment(null);
      if (selectedAssignmentId === deletingAssignment.id) setSelectedAssignmentId(null);
    }
  };

  // ── Detail view ──
  if (selectedAssignment) {
    return (
      <AssignmentDetail
        assignment={selectedAssignment}
        subject={subjectMap.get(selectedAssignment.subjectId)}
        students={students}
        submissions={submissions}
        userId={user.uid}
        onBack={returnToAssignmentList}
        onBackToList={returnToAssignmentList}
        onBackToSubject={contextSubject && onBackToSubject ? onBackToSubject : undefined}
        onDeleteAssignment={(a) => {
          setDeletingAssignment(a);
          setSelectedAssignmentId(null);
        }}
        onEditAssignment={openEdit}
      />
    );
  }

  // ── List view ──
  return (
    <motion.div
      ref={listViewRef}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      {/* Page header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          {contextSubject && onBackToSubject && (
            <button
              onClick={onBackToSubject}
              className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-800"
            >
              <ArrowLeft className="w-4 h-4" />
              กลับไปวิชา {contextSubject.code}
            </button>
          )}
          <h2 className="text-4xl font-bold text-gray-900 tracking-tight mb-2">งานที่มอบหมาย</h2>
          <p className="text-gray-500">
            {contextSubject
              ? `สร้างและติดตามการส่งงานของ ${contextSubject.name}`
              : 'สร้างและติดตามการส่งงานของนักเรียน'}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="bg-primary text-white px-6 py-3 rounded-2xl font-semibold flex items-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
        >
          <Plus className="w-5 h-5" />
          สร้างงานใหม่
        </button>
      </header>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <p className="text-3xl font-bold text-gray-900">{assignments.length}</p>
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
            <ClipboardList className="w-4 h-4" /> งานทั้งหมด
          </p>
        </div>
        <div className={cn('rounded-2xl p-5 border shadow-sm', overdueCount > 0 ? 'bg-red-50 border-red-100' : 'bg-white border-gray-100')}>
          <p className={cn('text-3xl font-bold', overdueCount > 0 ? 'text-red-600' : 'text-gray-900')}>
            {overdueCount}
          </p>
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
            <XCircle className="w-4 h-4" /> เลยกำหนด
          </p>
        </div>
        <div className={cn('rounded-2xl p-5 border shadow-sm', dueSoonCount > 0 ? 'bg-amber-50 border-amber-100' : 'bg-white border-gray-100')}>
          <p className={cn('text-3xl font-bold', dueSoonCount > 0 ? 'text-amber-600' : 'text-gray-900')}>
            {dueSoonCount}
          </p>
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
            <Clock className="w-4 h-4" /> ใกล้ครบกำหนด
          </p>
        </div>
      </div>

      {/* Form */}
      <AnimatePresence>
        {isFormOpen && (
          <AssignmentForm
            subjects={subjects}
            initialData={editingAssignment ?? undefined}
            isSaving={isSaving}
            onSave={handleSave}
            onCancel={() => setIsFormOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Filter row */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-gray-500 font-medium">กรองตามวิชา:</span>
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsSubjectFilterOpen((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-primary/50 transition-all"
          >
            {filterSubjectId === 'all'
              ? 'ทุกวิชา'
              : subjectMap.get(filterSubjectId)?.name ?? 'เลือกวิชา'}
            <ChevronDown className="w-4 h-4" />
          </button>
          <AnimatePresence>
            {isSubjectFilterOpen && (
              <motion.ul
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="absolute top-12 left-0 z-10 bg-white border border-gray-100 rounded-2xl shadow-xl min-w-[200px] py-1 overflow-hidden"
              >
                <li>
                  <button
                    className={cn(
                      'w-full text-left px-4 py-2.5 text-sm hover:bg-page-bg transition-colors',
                      filterSubjectId === 'all' && 'font-semibold text-primary'
                    )}
                    onClick={() => { setFilterSubjectId('all'); setIsSubjectFilterOpen(false); }}
                  >
                    ทุกวิชา
                  </button>
                </li>
                {subjects.map((s) => (
                  <li key={s.id}>
                    <button
                      className={cn(
                        'w-full text-left px-4 py-2.5 text-sm hover:bg-page-bg transition-colors',
                        filterSubjectId === s.id && 'font-semibold text-primary'
                      )}
                      onClick={() => { setFilterSubjectId(s.id); setIsSubjectFilterOpen(false); }}
                    >
                      {s.code} – {s.name}
                    </button>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
        {filterSubjectId !== 'all' && (
          <button
            onClick={() => setFilterSubjectId('all')}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            ล้างตัวกรอง
          </button>
        )}
      </div>

      {/* Assignment list */}
      {filteredAssignments.length === 0 ? (
        <div className="text-center py-24 text-gray-300 space-y-3">
          <ClipboardList className="w-16 h-16 mx-auto" />
          <p className="text-lg font-medium">ยังไม่มีงานที่มอบหมาย</p>
          <p className="text-sm">กดปุ่ม "สร้างงานใหม่" เพื่อเริ่มต้น</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAssignments.map((a) => {
            const subject = subjectMap.get(a.subjectId);
            const dueDateStatus = getDueDateStatus(a.due_date);
            const assignmentSubmissions = submissions.filter((s) => s.assignmentId === a.id);
            const subjectStudents = subject
              ? students.filter((s) => doesStudentBelongToSubject(s, subject))
              : [];
            const submittedCount = assignmentSubmissions.filter(
              (s) => s.status === 'submitted'
            ).length;

            const rowStatusColor: Record<typeof dueDateStatus, string> = {
              overdue: 'border-l-red-400',
              today: 'border-l-amber-400',
              tomorrow: 'border-l-yellow-400',
              upcoming: 'border-l-green-400',
            };

            const badgeColor: Record<typeof dueDateStatus, string> = {
              overdue: 'bg-red-100 text-red-700',
              today: 'bg-amber-100 text-amber-700',
              tomorrow: 'bg-yellow-100 text-yellow-800',
              upcoming: 'bg-green-100 text-green-700',
            };

            const statusLabel: Record<typeof dueDateStatus, string> = {
              overdue: 'เลยกำหนด',
              today: 'วันนี้',
              tomorrow: 'พรุ่งนี้',
              upcoming: 'ยังไม่ครบกำหนด',
            };

            const dueDateText = formatDueDate(a.due_date);

            return (
              <motion.button
                key={a.id}
                layout
                onClick={() => openAssignmentDetail(a.id)}
                className={cn(
                  'w-full rounded-2xl border border-gray-100 border-l-4 bg-white p-4 text-left shadow-sm sm:p-5',
                  'hover:shadow-md hover:-translate-y-0.5 transition-all',
                  rowStatusColor[dueDateStatus]
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900 sm:text-base">{a.title}</p>
                    <p className="mt-0.5 text-xs text-gray-400">{subject?.name ?? '—'}</p>
                  </div>
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-gray-300" />
                </div>

                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', badgeColor[dueDateStatus])}>
                      {statusLabel[dueDateStatus]}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                      <Calendar className="h-3.5 w-3.5 text-primary" />
                      กำหนดส่ง {dueDateText}
                    </span>
                  </div>
                  {subjectStudents.length > 0 && (
                    <span className="text-xs text-gray-400 sm:text-right">
                      ส่ง {submittedCount}/{subjectStudents.length}
                    </span>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between gap-3 sm:hidden">
                    {subjectStudents.length > 0 && (
                      <span className="text-[11px] text-gray-300">แตะเพื่อดูรายละเอียด</span>
                    )}
                </div>
                {/* Mini progress bar */}
                {subjectStudents.length > 0 && (
                  <div className="mt-3 w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/50 rounded-full transition-all"
                      style={{ width: `${(submittedCount / subjectStudents.length) * 100}%` }}
                    />
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Delete confirm dialog */}
      <AnimatePresence>
        {deletingAssignment && (
          <ConfirmDialog
            title="ลบงานที่มอบหมาย?"
            message={`คุณแน่ใจหรือไม่ว่าต้องการลบ "${deletingAssignment.title}"? การลบจะลบบันทึกการส่งงานทั้งหมดที่เกี่ยวข้องด้วย`}
            confirmLabel="ลบงาน"
            cancelLabel="ยกเลิก"
            onConfirm={handleConfirmDelete}
            onCancel={() => setDeletingAssignment(null)}
            variant="danger"
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
