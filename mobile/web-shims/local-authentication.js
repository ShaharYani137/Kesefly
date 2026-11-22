// Web stand-in for expo-local-authentication (see README.md): no biometrics, so the PIN is used.
export const AuthenticationType = { FINGERPRINT: 1, FACIAL_RECOGNITION: 2, FACIAL: 2, IRIS: 3 };
export const SecurityLevel = { NONE: 0, SECRET: 1, BIOMETRIC_WEAK: 2, BIOMETRIC_STRONG: 3 };
export async function hasHardwareAsync() {
  return false;
}
export async function isEnrolledAsync() {
  return false;
}
export async function supportedAuthenticationTypesAsync() {
  return [];
}
export async function getEnrolledLevelAsync() {
  return SecurityLevel.NONE;
}
export async function authenticateAsync() {
  return { success: false, error: 'not_available' };
}
