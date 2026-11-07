/**
 * Build the standalone release APK and install it on the connected Android phone.
 * Usage (from `mobile/`): npm run apk
 *
 * The APK bundles the JavaScript, so the installed app runs without Metro or the PC.
 * Needs: `android/` generated once with `npx expo prebuild --platform android`,
 * USB debugging on, and the phone listed by `adb devices`.
 */
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const androidDir = path.join(__dirname, '..', 'android');
const isWin = process.platform === 'win32';
const gradlew = path.join(androidDir, isWin ? 'gradlew.bat' : 'gradlew');
const apk = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');

/** Quote paths for the Windows shell (paths may contain spaces). */
const q = (p) => (isWin ? `"${p}"` : p);

function run(cmd, args, cwd) {
  console.log(`\n> ${path.basename(cmd.replace(/"/g, ''))} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: isWin });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

if (!fs.existsSync(gradlew)) {
  console.error('No android/ folder. Run once: npx expo prebuild --platform android');
  process.exit(1);
}

run(q(gradlew), ['app:assembleRelease', '-x', 'lint', '-x', 'test', '-PreactNativeArchitectures=arm64-v8a'], androidDir);
run('adb', ['install', '-r', q(apk)], androidDir);
run('adb', ['shell', 'monkey', '-p', 'com.kesefly.app', '-c', 'android.intent.category.LAUNCHER', '1'], androidDir);
console.log('\nKesefly installed and opened on the phone.');
