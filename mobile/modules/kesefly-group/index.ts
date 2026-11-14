/**
 * Local Expo module (iOS only): the App Group this install was signed with.
 * Sideloading renames or drops the group, so the hard-coded name is not always right
 * (ios/AppGroupResolver.swift). Returns null on Android, on web, in Expo Go, and when the
 * install has no App Group (free Apple ID through Sideloadly).
 */
import { requireOptionalNativeModule } from 'expo-modules-core';

type Native = { appGroup(): string | null };

const native = requireOptionalNativeModule<Native>('KeseflyGroup');

export function appGroup(): string | null {
  try {
    return native?.appGroup() ?? null;
  } catch {
    return null;
  }
}
