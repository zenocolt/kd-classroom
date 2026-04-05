import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { initializeApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { collection, getDocs, getFirestore, writeBatch, type DocumentReference } from 'firebase/firestore';

type SubjectDoc = {
  code?: string;
  name?: string;
  room?: string;
};

function getArgFlag(flag: string) {
  return process.argv.includes(flag);
}

function getArgValue(name: string) {
  const key = `--${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(key));
  return found ? found.slice(key.length) : undefined;
}

function chunkArray<T>(items: T[], chunkSize: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

async function promptForInput(question: string, hide = false) {
  const rl = createInterface({ input, output });

  if (!hide) {
    const value = await rl.question(question);
    rl.close();
    return value.trim();
  }

  const originalWrite = output.write.bind(output);
  output.write = ((chunk: string | Uint8Array) => {
    const text = typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8');
    if (text.includes('\n') || text.includes('\r')) {
      return originalWrite(chunk);
    }
    return true;
  }) as typeof output.write;

  try {
    const value = await rl.question(question);
    output.write = originalWrite;
    output.write('\n');
    rl.close();
    return value.trim();
  } catch (error) {
    output.write = originalWrite;
    rl.close();
    throw error;
  }
}

async function main() {
  const dryRun = getArgFlag('--dry-run');
  const roomFromArg = getArgValue('room');
  const defaultRoom = roomFromArg || process.env.DEFAULT_SUBJECT_ROOM || '1';

  if (defaultRoom !== '1' && defaultRoom !== '2') {
    throw new Error('DEFAULT_SUBJECT_ROOM (or --room) must be 1 or 2');
  }

  const email = process.env.MIGRATION_EMAIL || await promptForInput('Migration email: ');
  const password = process.env.MIGRATION_PASSWORD || await promptForInput('Migration password: ', true);

  if (!email || !password) {
    throw new Error('Migration email and password are required');
  }

  const configPath = resolve(process.cwd(), 'firebase-applet-config.json');
  const firebaseConfig = JSON.parse(readFileSync(configPath, 'utf-8')) as FirebaseOptions & {
    firestoreDatabaseId?: string;
  };

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = firebaseConfig.firestoreDatabaseId
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);

  await signInWithEmailAndPassword(auth, email, password);
  console.log(`Signed in as ${email}`);

  const snapshot = await getDocs(collection(db, 'subjects'));
  const invalidSubjectDocs = snapshot.docs.filter((docSnap) => {
    const data = docSnap.data() as SubjectDoc;
    return data.room !== '1' && data.room !== '2';
  });

  if (invalidSubjectDocs.length === 0) {
    console.log('No subject documents require migration');
    return;
  }

  console.log(`Found ${invalidSubjectDocs.length} subjects to update`);

  if (dryRun) {
    invalidSubjectDocs.slice(0, 20).forEach((docSnap) => {
      const data = docSnap.data() as SubjectDoc;
      const label = data.code || data.name || docSnap.id;
      console.log(`- ${label} (id: ${docSnap.id}) room: ${data.room ?? 'missing'} -> ${defaultRoom}`);
    });
    if (invalidSubjectDocs.length > 20) {
      console.log(`...and ${invalidSubjectDocs.length - 20} more`);
    }
    console.log('Dry run complete, no writes were made');
    return;
  }

  const refs = invalidSubjectDocs.map((docSnap) => docSnap.ref as DocumentReference);
  const chunks = chunkArray(refs, 450);

  for (let i = 0; i < chunks.length; i++) {
    const batch = writeBatch(db);
    chunks[i].forEach((ref) => {
      batch.update(ref, { room: defaultRoom });
    });
    await batch.commit();
    console.log(`Committed batch ${i + 1}/${chunks.length} (${chunks[i].length} docs)`);
  }

  console.log(`Migration complete: updated ${invalidSubjectDocs.length} subjects with room=${defaultRoom}`);
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
