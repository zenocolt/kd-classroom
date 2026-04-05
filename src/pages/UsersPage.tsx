import { ShieldCheck, Settings } from 'lucide-react';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { UsersPageProps } from '../types/views/management';
import { OperationType } from '../types';
import { handleFirestoreError } from '../services/firestoreError';
import { cn } from '../lib/utils';

export function UsersPage({ users }: UsersPageProps) {
  const handleUpdateRole = async (uid: string, newRole: 'admin' | 'teacher') => {
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
        <div>
          <div>
            <h2 className="text-3xl font-bold text-gray-900">จัดการผู้ใช้</h2>
            <p className="text-gray-500 mt-1">จัดการบัญชีผู้ใช้และสิทธิ์การเข้าถึงระบบ</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-page-bg flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">ผู้ใช้ในระบบ</h3>
          <ShieldCheck className="w-5 h-5 text-gray-400" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-page-bg/50 text-[10px] uppercase tracking-widest font-bold text-gray-400">
                <th className="px-8 py-4">ผู้ใช้</th>
                <th className="px-8 py-4">อีเมล</th>
                <th className="px-8 py-4">บทบาท</th>
                <th className="px-8 py-4 text-right">การดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-page-bg">
              {users.map((u) => (
                <tr key={u.uid} className="hover:bg-page-bg/50 transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-bold">
                        {u.displayName?.charAt(0) || u.email.charAt(0)}
                      </div>
                      <span className="font-semibold text-gray-900">{u.displayName || 'ผู้ใช้ไม่มีชื่อ'}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-sm text-gray-500">{u.email}</td>
                  <td className="px-8 py-5">
                    <span
                      className={cn(
                        'px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider',
                        u.role === 'admin' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                      )}
                    >
                      {u.role === 'admin' ? 'ผู้ดูแลระบบ' : 'อาจารย์'}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <select
                      value={u.role}
                      onChange={(e) => handleUpdateRole(u.uid, e.target.value as 'admin' | 'teacher')}
                      className="bg-page-bg border-none rounded-xl text-xs font-bold p-2 focus:ring-2 focus:ring-primary outline-none"
                    >
                      <option value="teacher">ตั้งเป็นอาจารย์</option>
                      <option value="admin">ตั้งเป็นผู้ดูแลระบบ</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-primary/5 p-8 rounded-3xl border border-primary/10">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white shrink-0">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-gray-900 mb-1">การตั้งค่าระบบ</h4>
            <p className="text-sm text-gray-500 mb-4">กำหนดค่าพารามิเตอร์ส่วนกลางของแอปพลิเคชันและปีการศึกษา</p>
            <div className="flex gap-4">
              <button className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors">
                ปีการศึกษา: 2025/2026
              </button>
              <button className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors">
                แผนกวิชา: เทคโนโลยีสารสนเทศ
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
