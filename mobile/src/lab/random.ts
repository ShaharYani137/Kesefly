/**
 * Seeded random numbers: the Mersenne Twister (MT19937) exactly as CPython's `random.Random`
 * uses it. Same seed, same draws as the day-trader-skill pack's Python, so the Time Machine
 * reproduces its numbers to the last digit and a replay can be repeated on any phone.
 *
 * Only what the Time Machine needs: integer seeds, getrandbits(k <= 32), randbelow, randint,
 * choice and random().
 */
const N = 624;
const M = 397;

export class PyRandom {
  private mt = new Uint32Array(N);
  private i = N + 1;

  constructor(seed: number) {
    // CPython: init_by_array with the absolute seed split into 32-bit words (little end first).
    let s = Math.abs(Math.trunc(seed));
    const key: number[] = [];
    do {
      key.push(s % 0x1_0000_0000);
      s = Math.floor(s / 0x1_0000_0000);
    } while (s > 0);
    this.initByArray(key);
  }

  private initGenrand(s: number) {
    const mt = this.mt;
    mt[0] = s >>> 0;
    for (let i = 1; i < N; i++) {
      const prev = mt[i - 1] ^ (mt[i - 1] >>> 30);
      mt[i] = (Math.imul(1812433253, prev) + i) >>> 0;
    }
    this.i = N;
  }

  private initByArray(key: number[]) {
    this.initGenrand(19650218);
    const mt = this.mt;
    let i = 1;
    let j = 0;
    for (let k = Math.max(N, key.length); k > 0; k--) {
      const prev = mt[i - 1] ^ (mt[i - 1] >>> 30);
      mt[i] = ((mt[i] ^ Math.imul(prev, 1664525)) + key[j] + j) >>> 0;
      i++;
      j++;
      if (i >= N) {
        mt[0] = mt[N - 1];
        i = 1;
      }
      if (j >= key.length) j = 0;
    }
    for (let k = N - 1; k > 0; k--) {
      const prev = mt[i - 1] ^ (mt[i - 1] >>> 30);
      mt[i] = ((mt[i] ^ Math.imul(prev, 1566083941)) - i) >>> 0;
      i++;
      if (i >= N) {
        mt[0] = mt[N - 1];
        i = 1;
      }
    }
    mt[0] = 0x80000000;
  }

  /** Next 32-bit unsigned integer. */
  uint32(): number {
    const mt = this.mt;
    if (this.i >= N) {
      let kk = 0;
      for (; kk < N - M; kk++) {
        const y = (mt[kk] & 0x80000000) | (mt[kk + 1] & 0x7fffffff);
        mt[kk] = mt[kk + M] ^ (y >>> 1) ^ (y & 1 ? 0x9908b0df : 0);
      }
      for (; kk < N - 1; kk++) {
        const y = (mt[kk] & 0x80000000) | (mt[kk + 1] & 0x7fffffff);
        mt[kk] = mt[kk + (M - N)] ^ (y >>> 1) ^ (y & 1 ? 0x9908b0df : 0);
      }
      const y = (mt[N - 1] & 0x80000000) | (mt[0] & 0x7fffffff);
      mt[N - 1] = mt[M - 1] ^ (y >>> 1) ^ (y & 1 ? 0x9908b0df : 0);
      this.i = 0;
    }
    let y = mt[this.i++];
    y ^= y >>> 11;
    y ^= (y << 7) & 0x9d2c5680;
    y ^= (y << 15) & 0xefc60000;
    y ^= y >>> 18;
    return y >>> 0;
  }

  /** k random bits, 1 <= k <= 32. */
  getrandbits(k: number): number {
    return this.uint32() >>> (32 - k);
  }

  /** Uniform integer in [0, n), CPython's _randbelow_with_getrandbits. */
  randbelow(n: number): number {
    if (n <= 0) return 0;
    const k = 32 - Math.clz32(n); // n.bit_length()
    let r = this.getrandbits(k);
    while (r >= n) r = this.getrandbits(k);
    return r;
  }

  /** Uniform integer in [a, b], both included. */
  randint(a: number, b: number): number {
    return a + this.randbelow(b - a + 1);
  }

  choice<T>(seq: readonly T[]): T {
    return seq[this.randbelow(seq.length)];
  }

  /** Float in [0, 1) with 53 random bits. */
  random(): number {
    const a = this.uint32() >>> 5;
    const b = this.uint32() >>> 6;
    return (a * 67108864 + b) / 9007199254740992;
  }
}
