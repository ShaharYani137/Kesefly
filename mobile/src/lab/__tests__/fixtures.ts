/**
 * Offline data from the day-trader-skill pack's own tests (MIT, see
 * ../__fixtures__/LICENSE-day-trader-skill). Read by tests only; never bundled into the app.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';

const DIR = join(__dirname, '..', '__fixtures__');

export function fixture(name: string): string {
  const buf = readFileSync(join(DIR, name));
  return name.endsWith('.gz') ? gunzipSync(buf).toString('utf8') : buf.toString('utf8');
}
