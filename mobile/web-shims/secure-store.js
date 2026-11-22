// Web stand-in for expo-secure-store (see README.md). Same async API, backed by localStorage.
const PREFIX = 'kesefly.secure.';
const ls = () => (typeof window !== 'undefined' && window.localStorage ? window.localStorage : null);

export async function getItemAsync(key) {
  try {
    return ls()?.getItem(PREFIX + key) ?? null;
  } catch {
    return null;
  }
}
export async function setItemAsync(key, value) {
  ls()?.setItem(PREFIX + key, String(value));
}
export async function deleteItemAsync(key) {
  ls()?.removeItem(PREFIX + key);
}
export function isAvailableAsync() {
  return Promise.resolve(!!ls());
}
export const AFTER_FIRST_UNLOCK = 0;
export const AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY = 1;
export const ALWAYS = 2;
export const WHEN_PASSCODE_SET_THIS_DEVICE_ONLY = 3;
export const ALWAYS_THIS_DEVICE_ONLY = 4;
export const WHEN_UNLOCKED = 5;
export const WHEN_UNLOCKED_THIS_DEVICE_ONLY = 6;
