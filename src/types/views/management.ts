import { User as FirebaseUser } from 'firebase/auth';
import { Subject, UserProfile } from '../index';

export interface SubjectsPageProps {
  subjects: Subject[];
  user: FirebaseUser;
  quickAction?: 'none' | 'invalid-room';
  quickActionVersion?: number;
  onOpenPersistenceSettings?: () => void;
  onSubjectClick: (id: string) => void;
}

export interface SettingsPageProps {
  user: FirebaseUser;
  profile: UserProfile | null;
  persistenceFocusToken?: number;
  onProfileUpdate: (updatedProfile: Partial<UserProfile>) => Promise<void>;
}

export interface UsersPageProps {
  users: UserProfile[];
}
