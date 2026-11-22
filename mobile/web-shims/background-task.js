// Web stand-in for expo-background-task (see README.md).
export const BackgroundTaskResult = { Success: 1, Failed: 2 };
export const BackgroundTaskStatus = { Restricted: 1, Available: 2 };
export async function registerTaskAsync() {}
export async function unregisterTaskAsync() {}
export async function getStatusAsync() {
  return BackgroundTaskStatus.Restricted;
}
