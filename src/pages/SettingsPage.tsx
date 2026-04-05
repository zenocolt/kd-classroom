import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { UserProfile } from '../types';
import { SettingsPageProps } from '../types/views/management';
import { ThaiDatePicker } from '../components/ThaiDatePicker';
import { cn } from '../lib/utils';

const DEFAULT_BRAND_NAME = 'ห้องเรียนครูได้';
const DEFAULT_BRAND_SUBTITLE = 'วิทยาลัยเทคนิคจันทบุรี\nแผนกวิชาเทคโนโลยีสารสนเทศ';
const DEFAULT_PRIMARY_COLOR = '#C94C00';
const PRESET_COLORS = ['#C94C00', '#0F766E', '#1D4ED8', '#BE123C', '#6D28D9', '#15803D'];
const CROP_SIZE = 280;
const STUDENTS_FILTERS_STORAGE_KEY = 'students.filters.v1';
const SUBJECTS_FILTERS_STORAGE_KEY = 'subjects.filters.v1';
const FILTER_PERSISTENCE_KEY = 'filters.persistence.enabled';

export function SettingsPage({ user, profile, persistenceFocusToken = 0, onProfileUpdate }: SettingsPageProps) {
  const today = new Date();
  const initialStartDate = profile?.semesterCalendar?.startDate ? new Date(profile.semesterCalendar.startDate) : today;
  const initialEndDate = profile?.semesterCalendar?.endDate ? new Date(profile.semesterCalendar.endDate) : today;

  const [displayName, setDisplayName] = useState(profile?.displayName || user.displayName || '');
  const [photoURL, setPhotoURL] = useState(profile?.photoURL || user.photoURL || '');
  const [appBrandName, setAppBrandName] = useState(profile?.appBrandName || DEFAULT_BRAND_NAME);
  const [appBrandSubtitle, setAppBrandSubtitle] = useState(profile?.appBrandSubtitle || DEFAULT_BRAND_SUBTITLE);
  const [appLogoUrl, setAppLogoUrl] = useState(profile?.appLogoUrl || '');
  const [appPrimaryColor, setAppPrimaryColor] = useState(profile?.appPrimaryColor || DEFAULT_PRIMARY_COLOR);
  const [pendingLogoSrc, setPendingLogoSrc] = useState('');
  const [termStartDate, setTermStartDate] = useState<Date>(initialStartDate);
  const [termEndDate, setTermEndDate] = useState<Date>(initialEndDate);
  const [termStartNote, setTermStartNote] = useState(profile?.semesterCalendar?.startNote || '');
  const [termEndNote, setTermEndNote] = useState(profile?.semesterCalendar?.endNote || '');
  const [persistFilters, setPersistFilters] = useState(() => localStorage.getItem(FILTER_PERSISTENCE_KEY) !== '0');
  const [highlightPersistenceSection, setHighlightPersistenceSection] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const cropImageRef = useRef<HTMLImageElement | null>(null);
  const cropCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const panRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const isDraggingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const persistenceSectionRef = useRef<HTMLDivElement | null>(null);
  const persistenceHighlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toDateString = (date: Date) => format(date, 'yyyy-MM-dd');

  const redrawCrop = () => {
    const canvas = cropCanvasRef.current;
    const img = cropImageRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = CROP_SIZE;
    canvas.height = CROP_SIZE;
    const baseScale = Math.max(CROP_SIZE / img.naturalWidth, CROP_SIZE / img.naturalHeight);
    const scale = baseScale * zoomRef.current;
    const drawW = img.naturalWidth * scale;
    const drawH = img.naturalHeight * scale;
    const dx = (CROP_SIZE - drawW) / 2 + panRef.current.x;
    const dy = (CROP_SIZE - drawH) / 2 + panRef.current.y;
    ctx.clearRect(0, 0, CROP_SIZE, CROP_SIZE);
    ctx.drawImage(img, dx, dy, drawW, drawH);
  };

  useEffect(() => {
    setDisplayName(profile?.displayName || user.displayName || '');
    setPhotoURL(profile?.photoURL || user.photoURL || '');
    setAppBrandName(profile?.appBrandName || DEFAULT_BRAND_NAME);
    setAppBrandSubtitle(profile?.appBrandSubtitle || DEFAULT_BRAND_SUBTITLE);
    setAppLogoUrl(profile?.appLogoUrl || '');
    setAppPrimaryColor(profile?.appPrimaryColor || DEFAULT_PRIMARY_COLOR);
    setTermStartDate(profile?.semesterCalendar?.startDate ? new Date(profile.semesterCalendar.startDate) : today);
    setTermEndDate(profile?.semesterCalendar?.endDate ? new Date(profile.semesterCalendar.endDate) : today);
    setTermStartNote(profile?.semesterCalendar?.startNote || '');
    setTermEndNote(profile?.semesterCalendar?.endNote || '');
  }, [profile, user.displayName, user.photoURL]);

  useEffect(() => {
    return () => {
      if (persistenceHighlightTimerRef.current) clearTimeout(persistenceHighlightTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!persistenceFocusToken) return;

    persistenceSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightPersistenceSection(true);
    if (persistenceHighlightTimerRef.current) clearTimeout(persistenceHighlightTimerRef.current);
    persistenceHighlightTimerRef.current = setTimeout(() => {
      setHighlightPersistenceSection(false);
    }, 1500);
  }, [persistenceFocusToken]);

  useEffect(() => {
    if (!pendingLogoSrc) {
      cropImageRef.current = null;
      return;
    }
    const img = new Image();
    img.onload = () => {
      cropImageRef.current = img;
      panRef.current = { x: 0, y: 0 };
      zoomRef.current = 1;
      requestAnimationFrame(redrawCrop);
    };
    img.src = pendingLogoSrc;
  }, [pendingLogoSrc]);

  const handleCropMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    lastPosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleCropMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    panRef.current = {
      x: panRef.current.x + (e.clientX - lastPosRef.current.x),
      y: panRef.current.y + (e.clientY - lastPosRef.current.y),
    };
    lastPosRef.current = { x: e.clientX, y: e.clientY };
    redrawCrop();
  };

  const handleCropMouseUp = () => { isDraggingRef.current = false; };

  const handleCropWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    zoomRef.current = Math.min(4, Math.max(1, zoomRef.current + (e.deltaY > 0 ? -0.1 : 0.1)));
    redrawCrop();
  };

  const handleCropTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length !== 1) return;
    isDraggingRef.current = true;
    lastPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleCropTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDraggingRef.current || e.touches.length !== 1) return;
    panRef.current = {
      x: panRef.current.x + (e.touches[0].clientX - lastPosRef.current.x),
      y: panRef.current.y + (e.touches[0].clientY - lastPosRef.current.y),
    };
    lastPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    redrawCrop();
  };

  const handleCropTouchEnd = () => { isDraggingRef.current = false; };

  const resetCropState = () => {
    setPendingLogoSrc('');
    panRef.current = { x: 0, y: 0 };
    zoomRef.current = 1;
    isDraggingRef.current = false;
    cropImageRef.current = null;
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'ไฟล์โลโก้ต้องเป็นรูปภาพเท่านั้น' });
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'ขนาดไฟล์โลโก้ต้องไม่เกิน 3MB' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPendingLogoSrc(reader.result);
        setMessage(null);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const applyCroppedLogo = () => {
    const img = cropImageRef.current;
    if (!img) return;
    const OUT = 256;
    const outCanvas = document.createElement('canvas');
    outCanvas.width = OUT;
    outCanvas.height = OUT;
    const ctx = outCanvas.getContext('2d');
    if (!ctx) return;
    const scaleFactor = OUT / CROP_SIZE;
    const baseScale = Math.max(CROP_SIZE / img.naturalWidth, CROP_SIZE / img.naturalHeight);
    const scale = baseScale * zoomRef.current;
    const drawW = img.naturalWidth * scale * scaleFactor;
    const drawH = img.naturalHeight * scale * scaleFactor;
    const dx = (OUT - drawW) / 2 + panRef.current.x * scaleFactor;
    const dy = (OUT - drawH) / 2 + panRef.current.y * scaleFactor;
    ctx.clearRect(0, 0, OUT, OUT);
    ctx.drawImage(img, dx, dy, drawW, drawH);
    // Compress: JPEG 80% → typically 15–40 KB
    setAppLogoUrl(outCanvas.toDataURL('image/jpeg', 0.82));
    resetCropState();
  };

  const cancelCrop = () => resetCropState();

  const resetThemeDefaults = () => {
    setAppBrandName(DEFAULT_BRAND_NAME);
    setAppBrandSubtitle(DEFAULT_BRAND_SUBTITLE);
    setAppLogoUrl('');
    setAppPrimaryColor(DEFAULT_PRIMARY_COLOR);
    resetCropState();
    setMessage({ type: 'success', text: 'รีเซ็ตธีมกลับค่าเริ่มต้นแล้ว กดบันทึกเพื่อใช้งาน' });
  };

  const clearSavedFilters = () => {
    localStorage.removeItem(STUDENTS_FILTERS_STORAGE_KEY);
    localStorage.removeItem(SUBJECTS_FILTERS_STORAGE_KEY);
    setMessage({ type: 'success', text: 'ล้างค่าตัวกรองที่จำไว้ทั้งหมดแล้ว' });
  };

  const togglePersistFilters = () => {
    const next = !persistFilters;
    setPersistFilters(next);
    localStorage.setItem(FILTER_PERSISTENCE_KEY, next ? '1' : '0');
    if (!next) {
      localStorage.removeItem(STUDENTS_FILTERS_STORAGE_KEY);
      localStorage.removeItem(SUBJECTS_FILTERS_STORAGE_KEY);
    }
    window.dispatchEvent(new CustomEvent('filters-persistence-changed', { detail: { enabled: next } }));
    setMessage({ type: 'success', text: next ? 'เปิดการจำค่าตัวกรองแล้ว' : 'ปิดการจำค่าตัวกรองและล้างค่าที่จำไว้แล้ว' });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      if (termEndDate < termStartDate) {
        setMessage({ type: 'error', text: 'วันปิดภาคเรียนต้องไม่น้อยกว่าวันเปิดเรียน' });
        setIsSaving(false);
        return;
      }

      await onProfileUpdate({
        displayName,
        photoURL,
        appBrandName: appBrandName.trim() || DEFAULT_BRAND_NAME,
        appBrandSubtitle: appBrandSubtitle.trim() || DEFAULT_BRAND_SUBTITLE,
        appLogoUrl,
        appPrimaryColor: appPrimaryColor.trim() || DEFAULT_PRIMARY_COLOR,
        semesterCalendar: {
          startDate: toDateString(termStartDate),
          endDate: toDateString(termEndDate),
          startNote: termStartNote.trim(),
          endNote: termEndNote.trim(),
          updatedAt: new Date().toISOString(),
        },
      } as Partial<UserProfile>);

      setMessage({ type: 'success', text: 'บันทึกโปรไฟล์และปฏิทินภาคเรียนเรียบร้อยแล้ว' });
    } catch {
      setMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-10">
      <header>
        <h2 className="text-4xl font-bold text-gray-900 tracking-tight mb-2">ตั้งค่าโปรไฟล์</h2>
        <p className="text-gray-500">จัดการข้อมูลส่วนตัวและรูปโปรไฟล์ของคุณ</p>
      </header>

      <form onSubmit={handleSave} className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-8">
        <div className="flex flex-col items-center gap-6 mb-4">
          <div className="relative group">
            <img
              src={photoURL || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y'}
              className="w-32 h-32 rounded-[2rem] border-4 border-secondary/20 object-cover shadow-xl"
              alt="Profile"
            />
            <div className="absolute inset-0 bg-black/40 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Settings className="w-8 h-8 text-white animate-spin-slow" />
            </div>
          </div>
          <div className="text-center">
            <h3 className="font-bold text-xl text-gray-900">{displayName || 'คุณครู'}</h3>
            <p className="text-sm text-gray-400">{user.email}</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 ml-1">ชื่อที่แสดง</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="ชื่อ-นามสกุล ของคุณ"
              className="w-full p-4 bg-page-bg border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 ml-1">URL รูปโปรไฟล์</label>
            <input
              type="url"
              value={photoURL}
              onChange={(e) => setPhotoURL(e.target.value)}
              placeholder="https://example.com/photo.jpg"
              className="w-full p-4 bg-page-bg border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
            />
            <p className="text-[10px] text-gray-400 ml-1">วางลิงก์รูปภาพของคุณที่นี่</p>
          </div>

          <div className="bg-page-bg/60 rounded-2xl p-5 border border-gray-100 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h4 className="text-sm font-bold text-gray-800">การตกแต่งหัวแอป</h4>
              <button
                type="button"
                onClick={resetThemeDefaults}
                className="text-xs font-semibold text-gray-600 hover:text-gray-900 hover:underline"
              >
                รีเซ็ตธีมทั้งหมด
              </button>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1">โลโก้ระบบ</label>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white border border-gray-200 rounded-2xl overflow-hidden flex items-center justify-center">
                  {appLogoUrl ? (
                    <img src={appLogoUrl} alt="App logo" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] text-gray-400">ไม่มีโลโก้</span>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="w-full text-sm text-gray-600 file:mr-3 file:px-4 file:py-2 file:rounded-xl file:border-0 file:bg-primary/10 file:text-primary file:font-semibold hover:file:bg-primary/20"
                  />
                  {appLogoUrl && (
                    <button
                      type="button"
                      onClick={() => setAppLogoUrl('')}
                      className="text-xs font-semibold text-red-600 hover:underline"
                    >
                      ลบโลโก้และกลับไปใช้ไอคอนหมวก
                    </button>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-gray-400 ml-1">เลือกรูปแล้วครอปก่อนใช้ ขนาดไฟล์ต้นฉบับไม่เกิน 3MB</p>
            </div>

            {pendingLogoSrc && (
              <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
                <h5 className="text-sm font-bold text-gray-800">ครอปโลโก้</h5>
                <div className="relative inline-block">
                  <canvas
                    ref={cropCanvasRef}
                    width={CROP_SIZE}
                    height={CROP_SIZE}
                    onMouseDown={handleCropMouseDown}
                    onMouseMove={handleCropMouseMove}
                    onMouseUp={handleCropMouseUp}
                    onMouseLeave={handleCropMouseUp}
                    onWheel={handleCropWheel}
                    onTouchStart={handleCropTouchStart}
                    onTouchMove={handleCropTouchMove}
                    onTouchEnd={handleCropTouchEnd}
                    className="rounded-2xl border border-gray-200 cursor-move block"
                    style={{ width: CROP_SIZE, height: CROP_SIZE }}
                  />
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white text-[10px] px-2 py-1 rounded-full pointer-events-none whitespace-nowrap">
                    ลากเพื่อเลื่อน • เลื่อนล้อเมาส์เพื่อซูม
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={applyCroppedLogo}
                    className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90"
                  >
                    ใช้รูปนี้
                  </button>
                  <button
                    type="button"
                    onClick={cancelCrop}
                    className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200"
                  >
                    ยกเลิก
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1">ชื่อระบบ</label>
              <input
                type="text"
                value={appBrandName}
                onChange={(e) => setAppBrandName(e.target.value)}
                placeholder="เช่น ห้องเรียนครูได๋"
                className="w-full p-4 bg-white border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1">ข้อความรองใต้ชื่อระบบ</label>
              <textarea
                value={appBrandSubtitle}
                onChange={(e) => setAppBrandSubtitle(e.target.value)}
                rows={3}
                placeholder="เช่น ชื่อสถานศึกษา หรือคำอธิบายสั้นๆ"
                className="w-full p-4 bg-white border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-primary outline-none transition-all resize-none"
              />
              <p className="text-[10px] text-gray-400 ml-1">ขึ้นบรรทัดใหม่ได้ ระบบจะแสดงผลตามที่พิมพ์</p>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-gray-700 ml-1">สีธีมหลักของระบบ</label>
              <div className="flex items-center gap-3 flex-wrap">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setAppPrimaryColor(color)}
                    className={cn(
                      'w-8 h-8 rounded-full border-2 transition-transform hover:scale-110',
                      appPrimaryColor.toLowerCase() === color.toLowerCase() ? 'border-gray-900' : 'border-white'
                    )}
                    style={{ backgroundColor: color }}
                    aria-label={`เลือกสี ${color}`}
                  />
                ))}
                <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-3 py-2">
                  <input
                    type="color"
                    value={appPrimaryColor}
                    onChange={(e) => setAppPrimaryColor(e.target.value)}
                    className="w-6 h-6 border-0 bg-transparent p-0"
                  />
                  <span className="text-xs font-medium text-gray-600">{appPrimaryColor.toUpperCase()}</span>
                </div>
              </div>
            </div>

            <div
              ref={persistenceSectionRef}
              className={cn(
                'bg-white border border-gray-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-all',
                highlightPersistenceSection && 'ring-2 ring-primary/40 shadow-[0_0_0_8px_rgba(201,76,0,0.15)]'
              )}
            >
              <div>
                <p className="text-sm font-bold text-gray-800">ค่าตัวกรองที่จำไว้</p>
                <p className="text-xs text-gray-500">ล้างค่าฟิลเตอร์หน้า นักเรียน/รายวิชา ที่ระบบบันทึกไว้ในอุปกรณ์นี้</p>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={togglePersistFilters}
                  className={cn(
                    'px-4 py-2 rounded-xl text-sm font-semibold border transition-colors',
                    persistFilters
                      ? 'border-green-200 bg-green-50 text-green-700'
                      : 'border-gray-200 bg-white text-gray-700'
                  )}
                >
                  {persistFilters ? 'จำ filter: เปิด' : 'จำ filter: ปิด'}
                </button>
                <button
                  type="button"
                  onClick={clearSavedFilters}
                  className="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-page-bg"
                >
                  ล้างค่าที่จำไว้ทั้งหมด
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5 pt-2">
          <div>
            <h4 className="text-lg font-bold text-gray-900">ปฏิทินภาคเรียน</h4>
            <p className="text-sm text-gray-500">กำหนดวันเปิดเรียนและวันปิดภาคเรียน พร้อมบันทึกโน้ตสำคัญ</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-page-bg/60 rounded-2xl p-5 space-y-3 border border-gray-100">
              <label className="text-sm font-bold text-gray-700">วันเปิดเรียน</label>
              <ThaiDatePicker
                value={termStartDate}
                onChange={setTermStartDate}
                className="w-full"
                highlightedDates={[
                  { date: termStartDate, type: 'start' },
                  { date: termEndDate, type: 'end' },
                ]}
              />
              <textarea
                value={termStartNote}
                onChange={(e) => setTermStartNote(e.target.value)}
                rows={3}
                placeholder="โน้ตวันเปิดเรียน"
                className="w-full p-3 bg-white border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none resize-none"
              />
            </div>

            <div className="bg-page-bg/60 rounded-2xl p-5 space-y-3 border border-gray-100">
              <label className="text-sm font-bold text-gray-700">วันปิดภาคเรียน</label>
              <ThaiDatePicker
                value={termEndDate}
                onChange={setTermEndDate}
                className="w-full"
                highlightedDates={[
                  { date: termStartDate, type: 'start' },
                  { date: termEndDate, type: 'end' },
                ]}
              />
              <textarea
                value={termEndNote}
                onChange={(e) => setTermEndNote(e.target.value)}
                rows={3}
                placeholder="โน้ตวันปิดภาคเรียน"
                className="w-full p-3 bg-white border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none resize-none"
              />
            </div>
          </div>

          <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 text-sm text-gray-700 space-y-1">
            <p><span className="font-bold text-primary">วันเปิดเรียน:</span> {toDateString(termStartDate)} {termStartNote ? `- ${termStartNote}` : ''}</p>
            <p><span className="font-bold text-primary">วันปิดภาคเรียน:</span> {toDateString(termEndDate)} {termEndNote ? `- ${termEndNote}` : ''}</p>
          </div>
        </div>

        {message && (
          <div
            className={cn(
              'p-4 rounded-2xl text-sm font-medium animate-in fade-in slide-in-from-top-2',
              message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
            )}
          >
            {message.text}
          </div>
        )}

        <div className="pt-4">
          <button
            type="submit"
            disabled={isSaving}
            className="w-full bg-primary text-white py-4 rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <ShieldCheck className="w-5 h-5" />
            )}
            {isSaving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
          </button>
        </div>
      </form>
    </div>
  );
}
