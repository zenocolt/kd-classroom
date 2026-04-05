import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  User,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile } from '../types';

export async function ensureUserProfile(firebaseUser: User, emailFallback: string): Promise<UserProfile> {
  const userDocRef = doc(db, 'users', firebaseUser.uid);
  const userDoc = await getDoc(userDocRef);

  if (userDoc.exists()) {
    return userDoc.data() as UserProfile;
  }

  const newProfile: UserProfile = {
    uid: firebaseUser.uid,
    email: firebaseUser.email || '',
    displayName: firebaseUser.displayName || emailFallback.split('@')[0] || 'ครู',
    role: 'teacher',
    photoURL: firebaseUser.photoURL || ''
  };

  await setDoc(userDocRef, newProfile);
  return newProfile;
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  await signInWithPopup(auth, provider);
}

export async function signInWithEmail(email: string, password: string, isRegistering: boolean) {
  if (isRegistering) {
    await createUserWithEmailAndPassword(auth, email, password);
    return;
  }
  await signInWithEmailAndPassword(auth, email, password);
}

export async function signOutCurrentUser() {
  await signOut(auth);
}

export async function updateCurrentUserProfile(user: User, updatedProfile: Partial<UserProfile>) {
  if (updatedProfile.displayName || updatedProfile.photoURL) {
    await updateProfile(user, {
      displayName: updatedProfile.displayName,
      photoURL: updatedProfile.photoURL
    });
  }

  const userDocRef = doc(db, 'users', user.uid);
  await updateDoc(userDocRef, updatedProfile);
}
