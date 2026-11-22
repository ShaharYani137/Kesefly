/**
 * Scheduled local notifications, grouped by the feature that owns them.
 *
 * Every scheduled notification carries `data.kind`. A feature cancels only its own kind, so
 * rescheduling weekly tips no longer wipes Lab alerts (and the other way around).
 *
 * Notifications scheduled before kinds existed have no `kind`; they were all weekly tips, so
 * the 'tips' kind also clears untagged ones.
 */
import * as Notifications from 'expo-notifications';

export type ScheduledKind = 'tips' | 'lab-time' | 'lab-price';

/** Notification `data` with the owner kind added. */
export function tagged(kind: ScheduledKind, data: Record<string, unknown> = {}): Record<string, unknown> {
  return { ...data, kind };
}

function kindOf(n: Notifications.NotificationRequest): string | undefined {
  const k = (n.content.data as Record<string, unknown> | null | undefined)?.kind;
  return typeof k === 'string' ? k : undefined;
}

/** Scheduled notifications of one kind. */
export async function scheduledOf(kind: ScheduledKind): Promise<Notifications.NotificationRequest[]> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  return all.filter((n) => kindOf(n) === kind || (kind === 'tips' && kindOf(n) === undefined));
}

/** Cancels only the scheduled notifications of `kind` (and filter, when given). Returns how many. */
export async function cancelScheduled(kind: ScheduledKind, keep?: (n: Notifications.NotificationRequest) => boolean): Promise<number> {
  const list = (await scheduledOf(kind)).filter((n) => !keep || !keep(n));
  await Promise.all(list.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
  return list.length;
}
