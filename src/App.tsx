/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc, 
  orderBy, 
  serverTimestamp, 
  getDocFromServer
} from 'firebase/firestore';
import { 
  User as FirebaseUser 
} from 'firebase/auth';
import { db, auth } from './firebase';
import { 
  Users, 
  CheckCircle, 
  FileText, 
  LayoutDashboard, 
  LogOut, 
  Plus, 
  Search, 
  UserPlus, 
  Calendar,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  AlertCircle,
  GraduationCap,
  Upload,
  ArrowLeft,
  CalendarDays,
  Trophy,
  Trash2,
  ShieldCheck,
  Settings,
  Menu,
  X,
  ExternalLink,
  Edit,
  BookOpen,
  ClipboardList
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { cn } from './lib/utils';

import { ThaiDatePicker } from './components/ThaiDatePicker';
import { StatusBadge } from './components/StatusBadge';
import { ConfirmDialog } from './components/shared/ConfirmDialog';
import { NotificationCenter } from './components/shared/NotificationCenter';
import { Reminders } from './components/shared/Reminders';
import { DashboardPage } from './pages/DashboardPage';
import { AttendancePage } from './pages/AttendancePage';
import { ScoresPage } from './pages/ScoresPage';
import { StudentsPage } from './pages/StudentsPage';
import { StudentDetailPage } from './pages/StudentDetailPage';
import { SubjectsPage } from './pages/SubjectsPage';
import { SettingsPage } from './pages/SettingsPage';
import { UsersPage } from './pages/UsersPage';
import { SubjectDashboard } from './pages/subject/SubjectDashboardPage';
import { AssignmentsPage } from './pages/AssignmentsPage';
import {
  Assignment,
  Attendance,
  CourseContent,
  OperationType,
  Score,
  SemesterCalendar,
  Slide,
  Student,
  Subject,
  Submission,
  UserProfile,
} from './types';
import { useAuthFlow } from './hooks/useAuthFlow';
import {
  useAssignments,
  useAttendance,
  useCourseContent,
  useScores,
  useSlides,
  useStudents,
  useSubjects,
  useSubmissions,
  useUsers,
} from './hooks/useFirestoreListeners';
import { useStudentDeletion } from './hooks/useStudentDeletion';

const DEFAULT_BRAND_NAME = 'ห้องเรียนครูได้';
const DEFAULT_BRAND_SUBTITLE = 'วิทยาลัยเทคนิคจันทบุรี\nแผนกวิชาเทคโนโลยีสารสนเทศ';
const DEFAULT_PRIMARY_COLOR = '#C94C00';

// --- Components ---

const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  const [hasError, setHasError] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      try {
        const parsed = JSON.parse(event.error.message);
        if (parsed.error) {
          setHasError(true);
          setErrorDetails(parsed.error);
        }
      } catch {
        // Not a JSON error
      }
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-red-100">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">มีบางอย่างผิดปกติ</h2>
          <p className="text-gray-600 mb-6">{errorDetails || "เกิดข้อผิดพลาดที่ไม่คาดคิด โปรดลองใหม่อีกครั้ง"}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-red-600 text-white px-6 py-2 rounded-full font-medium hover:bg-red-700 transition-colors"
          >
            โหลดแอปพลิเคชันใหม่
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default function App() {
  const {
    user,
    profile,
    isAuthReady,
    loading,
    email,
    setEmail,
    password,
    setPassword,
    isRegistering,
    setIsRegistering,
    authError,
    setAuthError,
    handleGoogleLogin,
    handleEmailAuth,
    handleLogout,
    handleProfileUpdate,
  } = useAuthFlow();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'attendance' | 'scores' | 'students' | 'subjects' | 'assignments' | 'users' | 'settings'>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [studentsQuickAction, setStudentsQuickAction] = useState<'none' | 'missing-score' | 'attendance-risk'>('none');
  const [studentsQuickActionVersion, setStudentsQuickActionVersion] = useState(0);
  const [subjectsQuickAction, setSubjectsQuickAction] = useState<'none' | 'invalid-room'>('none');
  const [subjectsQuickActionVersion, setSubjectsQuickActionVersion] = useState(0);
  const [settingsPersistenceFocusToken, setSettingsPersistenceFocusToken] = useState(0);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [assignmentFilterSubjectId, setAssignmentFilterSubjectId] = useState<string | null>(null);
  const [dashboardSubView, setDashboardSubView] = useState<'main' | 'slides' | 'content'>('main');
  const listenersEnabled = isAuthReady && !!user && !!profile;
  const students = useStudents(user, profile, listenersEnabled);
  const subjects = useSubjects(user, profile, listenersEnabled);
  const attendance = useAttendance(user, profile, listenersEnabled);
  const scores = useScores(user, profile, listenersEnabled);
  const slides = useSlides(user, profile, listenersEnabled);
  const courseContent = useCourseContent(user, profile, listenersEnabled);
  const assignments = useAssignments(user, profile, listenersEnabled);
  const submissions = useSubmissions(user, profile, listenersEnabled);
  const users = useUsers(profile, listenersEnabled);
  const [storedBrandName, setStoredBrandName] = useState<string>(DEFAULT_BRAND_NAME);
  const [storedBrandSubtitle, setStoredBrandSubtitle] = useState<string>(DEFAULT_BRAND_SUBTITLE);
  const [storedLogoUrl, setStoredLogoUrl] = useState<string>('');
  const appBrandName = profile?.appBrandName?.trim() || storedBrandName;
  const appBrandSubtitle = profile?.appBrandSubtitle?.trim() || storedBrandSubtitle;
  const appLogoUrl = profile?.appLogoUrl || storedLogoUrl;
  const studentsWithoutScoresCount = useMemo(
    () => students.filter((student) => scores.every((score) => score.studentId !== student.studentId)).length,
    [students, scores]
  );
  const studentsAtRiskAttendanceCount = useMemo(() => {
    return students.filter((student) => {
      const records = attendance.filter((a) => a.studentId === student.studentId);
      if (records.length === 0) return false;
      const presentOrLate = records.filter((r) => r.status === 'present' || r.status === 'late').length;
      const rate = (presentOrLate / records.length) * 100;
      return rate < 60;
    }).length;
  }, [students, attendance]);
  const subjectsNeedingRoomFixCount = useMemo(
    () => subjects.filter((subject) => subject.room !== '1' && subject.room !== '2').length,
    [subjects]
  );
  const assignmentsOverdueCount = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return assignments.filter((a) => a.due_date.toDate() < startOfToday).length;
  }, [assignments]);
  const termEndDate = useMemo(() => new Date('2026-04-15'), []);
  const daysUntilEnd = Math.ceil((termEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const reminderCount = (daysUntilEnd > 0 && daysUntilEnd <= 14 ? 1 : 0) + (studentsWithoutScoresCount > 0 ? 1 : 0);
  const dashboardBadgeVariant: 'warning' | 'info' = daysUntilEnd > 0 && daysUntilEnd <= 14 ? 'warning' : 'info';

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === selectedStudentId) || null,
    [students, selectedStudentId]
  );

  const openSettingsPersistence = () => {
    setActiveTab('settings');
    setSettingsPersistenceFocusToken((token) => token + 1);
  };

  const {
    isDeletingStudent,
    scopedAttendance,
    scopedScores,
    requestDelete,
    cancelDelete,
    confirmDelete,
  } = useStudentDeletion({
    student: selectedStudent,
    attendance,
    scores,
    onDeleted: () => setSelectedStudentId(null),
  });

  useEffect(() => {
    const cachedBrandName = localStorage.getItem('appBrandName');
    const cachedBrandSubtitle = localStorage.getItem('appBrandSubtitle');
    const cachedLogoUrl = localStorage.getItem('appLogoUrl');
    const cachedPrimaryColor = localStorage.getItem('appPrimaryColor');

    if (cachedBrandName) setStoredBrandName(cachedBrandName);
    if (cachedBrandSubtitle) setStoredBrandSubtitle(cachedBrandSubtitle);
    if (cachedLogoUrl) setStoredLogoUrl(cachedLogoUrl);
    if (cachedPrimaryColor) {
      document.documentElement.style.setProperty('--color-primary', cachedPrimaryColor);
    }
  }, []);

  useEffect(() => {
    if (!profile) return;

    const nextBrandName = profile.appBrandName?.trim() || DEFAULT_BRAND_NAME;
    const nextBrandSubtitle = profile.appBrandSubtitle?.trim() || DEFAULT_BRAND_SUBTITLE;
    const nextPrimaryColor = profile.appPrimaryColor?.trim() || DEFAULT_PRIMARY_COLOR;

    setStoredBrandName(nextBrandName);
    setStoredBrandSubtitle(nextBrandSubtitle);
    setStoredLogoUrl(profile.appLogoUrl || '');
    localStorage.setItem('appBrandName', nextBrandName);
    localStorage.setItem('appBrandSubtitle', nextBrandSubtitle);
    localStorage.setItem('appLogoUrl', profile.appLogoUrl || '');
    localStorage.setItem('appPrimaryColor', nextPrimaryColor);
    document.documentElement.style.setProperty('--color-primary', nextPrimaryColor);
  }, [profile]);

  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [activeTab, selectedStudentId, selectedSubjectId]);

  useEffect(() => {
    if (activeTab !== 'students') setStudentsQuickAction('none');
    if (activeTab !== 'subjects') setSubjectsQuickAction('none');
    if (activeTab !== 'assignments') setAssignmentFilterSubjectId(null);
  }, [activeTab]);

  // Test connection
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-page-bg">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary/20 via-white to-accent/20 flex flex-col items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white p-10 rounded-3xl shadow-2xl text-center border border-white/20 backdrop-blur-sm"
        >
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/20 overflow-hidden">
            {appLogoUrl ? (
              <img src={appLogoUrl} alt="App logo" className="w-full h-full object-cover" />
            ) : (
              <GraduationCap className="w-10 h-10 text-white" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">{appBrandName}</h1>
          <p className="text-sm text-gray-500 mb-8 leading-relaxed whitespace-pre-line">{appBrandSubtitle}</p>

          <form onSubmit={handleEmailAuth} className="space-y-4 mb-6 text-left">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider ml-1">อีเมล</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teacher@example.com"
                className="w-full px-4 py-3 bg-page-bg border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider ml-1">รหัสผ่าน</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-page-bg border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                required
              />
            </div>
            
            {authError && (
              <p className="text-xs text-red-500 font-medium ml-1">{authError}</p>
            )}

            <button 
              type="submit"
              className="w-full bg-primary text-white py-3.5 rounded-xl font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-[0.98]"
            >
              {isRegistering ? 'สร้างบัญชี' : 'เข้าสู่ระบบ'}
            </button>
          </form>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-400 font-medium">หรือดำเนินการต่อด้วย</span></div>
          </div>

          <button 
            onClick={handleGoogleLogin}
            className="w-full bg-white border border-gray-200 text-gray-700 py-3 rounded-xl font-semibold text-sm hover:bg-page-bg transition-all flex items-center justify-center gap-3 active:scale-[0.98] mb-6"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
            บัญชี Google
          </button>

          <p className="text-sm text-gray-500">
            {isRegistering ? 'มีบัญชีอยู่แล้วใช่ไหม?' : "ยังไม่มีบัญชีใช่ไหม?"}{' '}
            <button 
              onClick={() => { setIsRegistering(!isRegistering); setAuthError(null); }}
              className="text-primary font-bold hover:underline"
            >
              {isRegistering ? 'เข้าสู่ระบบ' : 'ลงทะเบียนตอนนี้'}
            </button>
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <NotificationCenter />
      <div className="min-h-screen bg-page-bg lg:flex">
        {isMobileSidebarOpen && (
          <button
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            aria-label="ปิดเมนู"
          />
        )}

        {/* Sidebar */}
        <aside
          className={cn(
            'fixed left-0 top-0 z-40 h-dvh w-72 bg-white border-r border-gray-100 flex flex-col transition-transform duration-300 lg:static lg:h-screen',
            isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          )}
        >
          <div className="p-8">
            <div className="flex items-center justify-between gap-3 mb-10">
              <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 overflow-hidden">
                {appLogoUrl ? (
                  <img src={appLogoUrl} alt="App logo" className="w-full h-full object-cover" />
                ) : (
                  <GraduationCap className="w-6 h-6 text-white" />
                )}
              </div>
                <span className="font-bold text-xl text-gray-900 tracking-tight truncate">{appBrandName}</span>
              </div>
              <button
                onClick={() => setIsMobileSidebarOpen(false)}
                className="p-2 rounded-lg text-gray-500 hover:bg-page-bg lg:hidden"
                aria-label="ปิดเมนู"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="space-y-2">
              <NavItem 
                active={activeTab === 'dashboard'} 
                onClick={() => setActiveTab('dashboard')} 
                icon={<LayoutDashboard />} 
                label="แดชบอร์ด" 
              />
              <NavItem 
                active={activeTab === 'attendance'} 
                onClick={() => setActiveTab('attendance')} 
                icon={<CheckCircle />} 
                label="การเช็คชื่อ" 
              />
              <NavItem 
                active={activeTab === 'scores'} 
                onClick={() => setActiveTab('scores')} 
                icon={<FileText />} 
                label="คะแนนและเกรด" 
              />
              <NavItem 
                active={activeTab === 'students'} 
                onClick={() => setActiveTab('students')} 
                icon={<Users />} 
                label="นักเรียน" 
              />
              <NavItem 
                active={activeTab === 'subjects'} 
                onClick={() => setActiveTab('subjects')} 
                icon={<FileText />} 
                label="รายวิชา" 
              />
              <NavItem 
                active={activeTab === 'assignments'} 
                onClick={() => setActiveTab('assignments')} 
                icon={<ClipboardList />} 
                label="งานมอบหมาย" 
              />
              {profile?.role === 'admin' && (
                <NavItem 
                  active={activeTab === 'users'} 
                  onClick={() => setActiveTab('users')} 
                  icon={<ShieldCheck />} 
                  label="การจัดการผู้ใช้" 
                />
              )}
              <NavItem 
                active={activeTab === 'settings'} 
                onClick={() => setActiveTab('settings')} 
                icon={<Settings />} 
                label="ตั้งค่าโปรไฟล์" 
              />
            </nav>
          </div>

          <div className="mt-auto p-8 border-t border-page-bg">
            <div className="flex items-center gap-3 mb-6">
              <img src={user.photoURL || ''} className="w-10 h-10 rounded-full border-2 border-secondary/20" alt="User" />
              <div className="overflow-hidden">
                <p className="font-semibold text-sm text-gray-900 truncate">{user.displayName}</p>
                <p className="text-xs text-gray-500 truncate capitalize">{profile?.role === 'admin' ? 'ผู้ดูแลระบบ' : 'ครู'}</p>
              </div>
            </div>
            <button 
              onClick={() => {
                setIsMobileSidebarOpen(false);
                handleLogout();
              }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-red-600 bg-red-50 font-medium hover:bg-red-100 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              ออกจากระบบ
            </button>
          </div>
        </aside>

        <div
          className="lg:hidden sticky top-0 z-20 bg-page-bg/95 backdrop-blur border-b border-gray-100 px-4 py-3 flex items-center justify-between"
          style={{ paddingTop: 'max(env(safe-area-inset-top), 0px)' }}
        >
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="p-2 rounded-lg bg-white border border-gray-200 text-gray-700"
            aria-label="เปิดเมนู"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center overflow-hidden">
              {appLogoUrl ? (
                <img src={appLogoUrl} alt="App logo" className="w-full h-full object-cover" />
              ) : (
                <GraduationCap className="w-4 h-4 text-white" />
              )}
            </div>
            <span className="text-sm font-bold text-gray-900 truncate max-w-[52vw]">{appBrandName}</span>
          </div>
          <button
            onClick={handleLogout}
            className="px-3 py-2 rounded-lg text-xs font-semibold text-red-600 bg-red-50"
          >
            ออก
          </button>
        </div>

        {/* Main Content */}
        <main
          className="flex-1 min-w-0 p-4 sm:p-6 lg:p-10 overflow-y-auto"
          style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <DashboardPage
                students={students}
                subjects={subjects}
                attendance={attendance}
                scores={scores}
                semesterCalendar={profile?.semesterCalendar}
                reminders={<Reminders students={students} attendance={attendance} scores={scores} />}
              />
            )}
            {activeTab === 'attendance' && <AttendancePage students={students} subjects={subjects} attendance={attendance} user={user} />}
            {activeTab === 'scores' && <ScoresPage students={students} subjects={subjects} scores={scores} user={user} />}
            {activeTab === 'students' && (
              selectedStudentId ? (
                <>
                  <StudentDetailPage 
                    student={selectedStudent}
                    attendance={scopedAttendance}
                    scores={scopedScores}
                    subjects={subjects}
                    onBack={() => setSelectedStudentId(null)}
                    onDelete={requestDelete}
                  />
                  <AnimatePresence>
                    {isDeletingStudent && (
                      <ConfirmDialog
                        title="ลบข้อมูลนักเรียน?"
                        message="คุณแน่ใจหรือไม่ว่าต้องการลบนักเรียนคนนี้? การดำเนินการนี้จะลบโปรไฟล์และบันทึกการเข้าเรียนและคะแนนทั้งหมดที่เกี่ยวข้องอย่างถาวร และไม่สามารถย้อนกลับได้"
                        confirmLabel="ลบนักเรียน"
                        cancelLabel="ยกเลิก"
                        onConfirm={confirmDelete}
                        onCancel={cancelDelete}
                        variant="danger"
                      />
                    )}
                  </AnimatePresence>
                </>
              ) : (
                <StudentsPage
                  students={students}
                  attendance={attendance}
                  scores={scores}
                  user={user}
                  quickAction={studentsQuickAction}
                  quickActionVersion={studentsQuickActionVersion}
                  onOpenPersistenceSettings={openSettingsPersistence}
                  onStudentClick={(id) => setSelectedStudentId(id)}
                />
              )
            )}
            {activeTab === 'subjects' && (
              selectedSubjectId ? (
                <SubjectDashboard 
                  subject={subjects.find(s => s.id === selectedSubjectId) || null}
                  students={students}
                  attendance={attendance}
                  scores={scores}
                  slides={slides}
                  courseContent={courseContent}
                  user={user}
                  subView={dashboardSubView}
                  onSubViewChange={setDashboardSubView}
                  onBack={() => {
                    setSelectedSubjectId(null);
                    setDashboardSubView('main');
                  }}
                  onNavigateAttendance={() => setActiveTab('attendance')}
                  onNavigateAssignments={() => {
                    setAssignmentFilterSubjectId(selectedSubjectId);
                    setActiveTab('assignments');
                  }}
                />
              ) : (
                <SubjectsPage 
                  subjects={subjects} 
                  user={user} 
                  quickAction={subjectsQuickAction}
                  quickActionVersion={subjectsQuickActionVersion}
                  onOpenPersistenceSettings={openSettingsPersistence}
                  onSubjectClick={(id) => setSelectedSubjectId(id)} 
                />
              )
            )}
            {activeTab === 'assignments' && (
              <AssignmentsPage
                user={user}
                assignments={assignments}
                submissions={submissions}
                subjects={subjects}
                students={students}
                initialSubjectId={assignmentFilterSubjectId}
                onBackToSubject={assignmentFilterSubjectId ? () => setActiveTab('subjects') : undefined}
              />
            )}
            {activeTab === 'users' && profile?.role === 'admin' && (
              <UsersPage users={users} />
            )}
            {activeTab === 'settings' && (
              <SettingsPage 
                user={user} 
                profile={profile} 
                persistenceFocusToken={settingsPersistenceFocusToken}
                onProfileUpdate={handleProfileUpdate} 
              />
            )}
          </AnimatePresence>
        </main>

        <nav
          className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-white/95 backdrop-blur border-t border-gray-200 shadow-[0_-10px_30px_rgba(0,0,0,0.06)]"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}
        >
          <div className="grid grid-cols-6 gap-1 px-2 py-2">
            <BottomNavItem
              active={activeTab === 'dashboard'}
              onClick={() => setActiveTab('dashboard')}
              icon={<LayoutDashboard />}
              label="แดชบอร์ด"
              badgeCount={reminderCount}
              badgeVariant={dashboardBadgeVariant}
            />
            <BottomNavItem
              active={activeTab === 'attendance'}
              onClick={() => setActiveTab('attendance')}
              icon={<CheckCircle />}
              label="เช็คชื่อ"
            />
            <BottomNavItem
              active={activeTab === 'students'}
              onClick={() => {
                setStudentsQuickAction('none');
                setActiveTab('students');
              }}
              icon={<Users />}
              label="นักเรียน"
              badges={[
                {
                  count: studentsWithoutScoresCount,
                  variant: 'info',
                  ariaLabel: 'นักเรียนค้างคะแนน',
                  onClick: () => {
                    setStudentsQuickAction('missing-score');
                    setStudentsQuickActionVersion((v) => v + 1);
                    setActiveTab('students');
                  },
                },
                {
                  count: studentsAtRiskAttendanceCount,
                  variant: 'warning',
                  ariaLabel: 'นักเรียนเสี่ยงขาดเรียน',
                  onClick: () => {
                    setStudentsQuickAction('attendance-risk');
                    setStudentsQuickActionVersion((v) => v + 1);
                    setActiveTab('students');
                  },
                },
              ]}
            />
            <BottomNavItem
              active={activeTab === 'subjects'}
              onClick={() => {
                setSubjectsQuickAction('none');
                setActiveTab('subjects');
              }}
              icon={<BookOpen />}
              label="รายวิชา"
              badgeCount={subjectsNeedingRoomFixCount}
              badgeVariant="warning"
              onBadgeClick={() => {
                setSubjectsQuickAction('invalid-room');
                setSubjectsQuickActionVersion((v) => v + 1);
                setActiveTab('subjects');
              }}
            />
            <BottomNavItem
              active={activeTab === 'assignments'}
              onClick={() => setActiveTab('assignments')}
              icon={<ClipboardList />}
              label="งาน"
              badgeCount={assignmentsOverdueCount}
              badgeVariant="warning"
            />
            <BottomNavItem
              active={activeTab === 'settings'}
              onClick={() => setActiveTab('settings')}
              icon={<Settings />}
              label="ตั้งค่า"
            />
          </div>
        </nav>
      </div>
    </ErrorBoundary>
  );
}

function NavItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-medium text-left",
        active 
          ? "bg-secondary/20 text-primary shadow-sm" 
          : "text-gray-500 hover:bg-page-bg hover:text-gray-900"
      )}
    >
      {React.cloneElement(icon as React.ReactElement<{ className: string }>, { className: "w-5 h-5" })}
      <span>{label}</span>
      {active && <motion.div layoutId="active-pill" className="ml-auto w-1.5 h-1.5 bg-primary rounded-full" />}
    </button>
  );
}

function BottomNavItem({
  active,
  onClick,
  icon,
  label,
  badgeCount,
  badgeVariant = 'warning',
  onBadgeClick,
  badges,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badgeCount?: number;
  badgeVariant?: 'warning' | 'info';
  onBadgeClick?: () => void;
  badges?: Array<{ count: number; variant: 'warning' | 'info'; ariaLabel: string; onClick: () => void }>;
}) {
  const badgeText = badgeCount && badgeCount > 99 ? '99+' : badgeCount;
  const normalizedBadges = (badges || []).filter((b) => b.count > 0).slice(0, 2);

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center gap-1 rounded-xl py-1.5 text-[10px] font-semibold transition-colors',
        active ? 'text-primary bg-primary/10' : 'text-gray-500'
      )}
    >
      <span className="relative">
        {React.cloneElement(icon as React.ReactElement<{ className: string }>, { className: 'w-5 h-5' })}
        {normalizedBadges.length > 0 ? (
          <span className="absolute -top-2 -right-4 flex flex-col gap-1">
            {normalizedBadges.map((b, idx) => {
              const text = b.count > 99 ? '99+' : b.count;
              return (
                <span
                  key={`${b.ariaLabel}-${idx}`}
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    b.onClick();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      b.onClick();
                    }
                  }}
                  aria-label={b.ariaLabel}
                  className={cn(
                    'min-w-[18px] h-[18px] px-1 rounded-full text-white text-[9px] leading-[18px] font-bold cursor-pointer',
                    b.variant === 'warning' ? 'bg-red-500' : 'bg-amber-500'
                  )}
                >
                  {text}
                </span>
              );
            })}
          </span>
        ) : (
          !!badgeCount && badgeCount > 0 && (
            <span
              role="button"
              tabIndex={onBadgeClick ? 0 : -1}
              onClick={(e) => {
                if (onBadgeClick) {
                  e.stopPropagation();
                  onBadgeClick();
                }
              }}
              onKeyDown={(e) => {
                if (!onBadgeClick) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onBadgeClick();
                }
              }}
              className={cn(
                'absolute -top-2 -right-3 min-w-[18px] h-[18px] px-1 rounded-full text-white text-[9px] leading-[18px] font-bold',
                onBadgeClick && 'cursor-pointer',
                badgeVariant === 'warning' ? 'bg-red-500' : 'bg-amber-500'
              )}
            >
              {badgeText}
            </span>
          )
        )}
      </span>
      <span>{label}</span>
    </button>
  );
}
