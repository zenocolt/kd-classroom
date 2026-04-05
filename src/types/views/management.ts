import { User as FirebaseUser } from 'firebase/auth';
import { Subject, UserProfile } from '../index';

export interface SubjectsPageProps {
  subjects: Subject[];
  user: FirebaseUser;
  onSubjectClick: (id: string) => void;
}

export interface SettingsPageProps {
  user: FirebaseUser;
  profile: UserProfile | null;
  onProfileUpdate: (updatedProfile: Partial<UserProfile>) => Promise<void>;
}

export interface UsersPageProps {
  users: UserProfile[];
}
