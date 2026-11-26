import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import type { NotificationRecord, NotificationType, UserRole } from '../types';
import { sanitizeIdSegment } from '../schemas/validation';

function makeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return sanitizeIdSegment(`${prefix}_${Date.now()}_${rand}`);
}

export async function createNotification(params: {
  recipientId: string;
  senderId: string;
  title: string;
  message: string;
  type: NotificationType;
  relatedEntityId?: string;
  targetRoute?: string;
}): Promise<string> {
  const notificationId = makeId('ntf');
  const path = `notifications/${notificationId}`;
  try {
    const payload: Record<string, unknown> = {
      notificationId,
      recipientId: params.recipientId,
      senderId: params.senderId,
      title: params.title.slice(0, 160),
      message: params.message.slice(0, 600),
      type: params.type,
      read: false,
      createdAt: serverTimestamp(),
    };
    if (params.relatedEntityId) payload.relatedEntityId = params.relatedEntityId.slice(0, 128);
    if (params.targetRoute) payload.targetRoute = params.targetRoute.slice(0, 200);
    await setDoc(doc(db, 'notifications', notificationId), payload);
    return notificationId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function logActivity(params: {
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  entityType: string;
  entityId: string;
  details?: string;
}): Promise<void> {
  const activityId = makeId('act');
  const path = `activityLogs/${activityId}`;
  try {
    const payload: Record<string, unknown> = {
      activityId,
      actorId: params.actorId,
      actorName: params.actorName.slice(0, 120),
      actorRole: params.actorRole,
      action: params.action.slice(0, 160),
      entityType: params.entityType.slice(0, 60),
      entityId: sanitizeIdSegment(params.entityId),
      timestamp: serverTimestamp(),
    };
    if (params.details) payload.details = params.details.slice(0, 600);
    await setDoc(doc(db, 'activityLogs', activityId), payload);
  } catch (error) {
    // Non-blocking audit log fallback if transient permission issue occurs
    console.warn('Activity log write skipped:', error);
  }
}

export function subscribeNotifications(
  userId: string,
  role: UserRole,
  callback: (items: NotificationRecord[]) => void
): Unsubscribe {
  const q =
    role === 'admin'
      ? query(collection(db, 'notifications'), where('recipientId', 'in', [userId, 'admin_broadcast']))
      : query(collection(db, 'notifications'), where('recipientId', '==', userId));

  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .map((d) => d.data() as NotificationRecord)
        .sort((a, b) => {
          const tA = a.createdAt && typeof a.createdAt === 'object' && 'toMillis' in a.createdAt ? a.createdAt.toMillis() : 0;
          const tB = b.createdAt && typeof b.createdAt === 'object' && 'toMillis' in b.createdAt ? b.createdAt.toMillis() : 0;
          return tB - tA;
        });
      callback(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    }
  );
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const path = `notifications/${notificationId}`;
  try {
    await updateDoc(doc(db, 'notifications', notificationId), { read: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function markAllNotificationsRead(notifications: NotificationRecord[]): Promise<void> {
  const unread = notifications.filter((n) => !n.read);
  if (unread.length === 0) return;
  try {
    const batch = writeBatch(db);
    unread.slice(0, 450).forEach((item) => {
      batch.update(doc(db, 'notifications', item.notificationId), { read: true });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'notifications/batch');
  }
}
