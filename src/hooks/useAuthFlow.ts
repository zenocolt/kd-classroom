import { FormEvent, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../firebase';
import { UserProfile } from '../types';
import {
  ensureUserProfile,
  signInWithEmail,
  signInWithGoogle,
  signOutCurrentUser,
  updateCurrentUserProfile,
} from '../services/authService';

export function useAuthFlow() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const userProfile = await ensureUserProfile(firebaseUser, email);
          setProfile(userProfile);
        } catch (error) {
          console.error('Error fetching profile:', error);
        }
      } else {
        setProfile(null);
      }

      setIsAuthReady(true);
      setLoading(false);
    });

    return unsubscribe;
  }, [email]);

  const handleGoogleLogin = async () => {
    try {
      setAuthError(null);
      await signInWithGoogle();
    } catch (error) {
      console.error('Login failed:', error);
      setAuthError('การเข้าสู่ระบบด้วย Google ล้มเหลว โปรดลองใหม่อีกครั้ง');
    }
  };

  const handleEmailAuth = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    try {
      await signInWithEmail(email, password, isRegistering);
    } catch (error: any) {
      console.error('Auth error:', error);
      if (error.code === 'auth/email-already-in-use') setAuthError('อีเมลนี้ถูกใช้งานแล้ว');
      else if (error.code === 'auth/invalid-credential') setAuthError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      else if (error.code === 'auth/weak-password') setAuthError('รหัสผ่านควรมีอย่างน้อย 6 ตัวอักษร');
      else setAuthError('การยืนยันตัวตนล้มเหลว: ' + error.message);
    }
  };

  const handleLogout = () => signOutCurrentUser();

  const handleProfileUpdate = async (updatedProfile: Partial<UserProfile>) => {
    if (!user) return;
    await updateCurrentUserProfile(user, updatedProfile);
    setProfile((prev) => (prev ? { ...prev, ...updatedProfile } : null));
  };

  return {
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
  };
}
