// Web stand-in for expo-notifications (see README.md): nothing is scheduled in the browser.
const denied = { status: 'denied', granted: false, canAskAgain: false, expires: 'never', ios: { status: 0 } };

export const SchedulableTriggerInputTypes = {
  CALENDAR: 'calendar',
  DAILY: 'daily',
  DATE: 'date',
  MONTHLY: 'monthly',
  TIME_INTERVAL: 'timeInterval',
  TIME: 'timeInterval',
  WEEKLY: 'weekly',
  YEARLY: 'yearly',
};
export const AndroidImportance = { UNKNOWN: 0, UNSPECIFIED: 1, NONE: 2, MIN: 3, LOW: 4, DEFAULT: 5, HIGH: 6, MAX: 7 };

export function setNotificationHandler() {}
export async function getPermissionsAsync() {
  return denied;
}
export async function requestPermissionsAsync() {
  return denied;
}
export async function scheduleNotificationAsync() {
  return '';
}
export async function cancelScheduledNotificationAsync() {}
export async function cancelAllScheduledNotificationsAsync() {}
export async function getAllScheduledNotificationsAsync() {
  return [];
}
export async function setNotificationChannelAsync() {
  return null;
}
export async function setBadgeCountAsync() {
  return false;
}
export function useLastNotificationResponse() {
  return null;
}
export function addNotificationResponseReceivedListener() {
  return { remove() {} };
}
export function addNotificationReceivedListener() {
  return { remove() {} };
}
