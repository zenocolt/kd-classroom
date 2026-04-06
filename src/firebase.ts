import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import firebaseConfig from '../firebase-applet-config.json';

const config = firebaseConfig as typeof firebaseConfig & { firestoreDatabaseId?: string };

const app = initializeApp(config);
export const db = config.firestoreDatabaseId
	? getFirestore(app, config.firestoreDatabaseId)
	: getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app, 'asia-southeast1');
