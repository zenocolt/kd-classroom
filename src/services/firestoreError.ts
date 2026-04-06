import { auth } from '../firebase';
import { FirestoreErrorInfo, OperationType } from '../types';
import { notify } from '../utils/notify';

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const message = error instanceof Error ? error.message : String(error);

  let userMessage = 'เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล';
  if (message.includes('insufficient permissions')) {
    userMessage = 'คุณไม่มีสิทธิ์ในการดำเนินการนี้';
  } else if (message.includes('quota exceeded')) {
    userMessage = 'เกินโควตาการใช้งานฐานข้อมูล โปรดลองใหม่ในวันพรุ่งนี้';
  }

  const errInfo: FirestoreErrorInfo = {
    error: message,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map((provider) => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL,
      })) || []
    },
    operationType,
    path
  };

  console.error('Firestore Error: ', JSON.stringify(errInfo));
  notify({
    type: 'error',
    title: 'ไม่สามารถดำเนินการได้',
    message: userMessage,
  });
  throw new Error(JSON.stringify(errInfo));
}
