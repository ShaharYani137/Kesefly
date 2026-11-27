/**
 * Expo Router hook for links that open the app from outside (deep links, universal links).
 * Strips query params so an outside link cannot pre-fill or auto-run anything
 * (see src/state/deep-links.ts). In-app navigation is not affected.
 */
import { stripExternalParams } from '@/state/deep-links';

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    return stripExternalParams(path);
  } catch {
    return '/';
  }
}
