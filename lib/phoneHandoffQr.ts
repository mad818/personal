export const PHONE_HANDOFF_QR_VERSION = 6;
export const PHONE_HANDOFF_QR_MAX_BYTES = 134;

const QR_SIZE = 21 + (PHONE_HANDOFF_QR_VERSION - 1) * 4;
const QUIET_ZONE = 4;
const DATA_CODEWORDS = 136;
const BLOCK_DATA_CODEWORDS = 68;
const ERROR_CODEWORDS_PER_BLOCK = 18;
const ALIGNMENT_CENTERS = [6, 34];
const FORMAT_POLY = 0x537;
const FORMAT_MASK = 0x5412;
const GF_PRIMITIVE = 0x11d;

export type PhoneHandoffQrMatrix = {
  size: number;
  quietZone: number;
  path: string;
  encodedBytes: number;
};

type QrBase = {
  modules: Array<Array<boolean | null>>;
  isFunction: boolean[][];
};

function range(length: number) {
  return Array.from({ length }, (_, index) => index);
}

function getBit(value: number, index: number) {
  return ((value >>> index) & 1) !== 0;
}

function setFunctionModule(
  base: QrBase,
  x: number,
  y: number,
  isDark: boolean,
) {
  if (x < 0 || y < 0 || x >= QR_SIZE || y >= QR_SIZE) return;
  base.modules[y][x] = isDark;
  base.isFunction[y][x] = true;
}

function drawFinder(base: QrBase, x: number, y: number) {
  for (const dy of range(9)) {
    for (const dx of range(9)) {
      const xx = x + dx - 1;
      const yy = y + dy - 1;
      const inPattern = dx >= 1 && dx <= 7 && dy >= 1 && dy <= 7;
      const patternX = dx - 1;
      const patternY = dy - 1;
      const isDark =
        inPattern &&
        (patternX === 0 ||
          patternX === 6 ||
          patternY === 0 ||
          patternY === 6 ||
          (patternX >= 2 && patternX <= 4 && patternY >= 2 && patternY <= 4));
      setFunctionModule(base, xx, yy, isDark);
    }
  }
}

function drawAlignment(base: QrBase, cx: number, cy: number) {
  for (const dy of range(5)) {
    for (const dx of range(5)) {
      const offsetX = dx - 2;
      const offsetY = dy - 2;
      const distance = Math.max(Math.abs(offsetX), Math.abs(offsetY));
      setFunctionModule(
        base,
        cx + offsetX,
        cy + offsetY,
        distance === 2 || distance === 0,
      );
    }
  }
}

function drawTiming(base: QrBase) {
  for (let i = 8; i <= QR_SIZE - 9; i += 1) {
    const isDark = i % 2 === 0;
    setFunctionModule(base, i, 6, isDark);
    setFunctionModule(base, 6, i, isDark);
  }
}

function computeFormatBits(mask: number) {
  const errorCorrectionLevelL = 1;
  const data = (errorCorrectionLevelL << 3) | mask;
  let remainder = data;
  for (let i = 0; i < 10; i += 1) {
    remainder =
      (remainder << 1) ^ (((remainder >>> 9) & 1) !== 0 ? FORMAT_POLY : 0);
  }
  return ((data << 10) | (remainder & 0x3ff)) ^ FORMAT_MASK;
}

function drawFormatBits(
  modules: Array<Array<boolean | null>>,
  isFunction: boolean[][],
  mask: number,
) {
  const bits = computeFormatBits(mask);
  const set = (x: number, y: number, isDark: boolean) => {
    modules[y][x] = isDark;
    isFunction[y][x] = true;
  };

  for (let i = 0; i <= 5; i += 1) set(8, i, getBit(bits, i));
  set(8, 7, getBit(bits, 6));
  set(8, 8, getBit(bits, 7));
  set(7, 8, getBit(bits, 8));
  for (let i = 9; i < 15; i += 1) set(14 - i, 8, getBit(bits, i));

  for (let i = 0; i < 8; i += 1) {
    set(QR_SIZE - 1 - i, 8, getBit(bits, i));
  }
  for (let i = 8; i < 15; i += 1) {
    set(8, QR_SIZE - 15 + i, getBit(bits, i));
  }
  set(8, QR_SIZE - 8, true);
}

function makeBase(): QrBase {
  const base: QrBase = {
    modules: range(QR_SIZE).map(() =>
      Array<boolean | null>(QR_SIZE).fill(null),
    ),
    isFunction: range(QR_SIZE).map(() => Array<boolean>(QR_SIZE).fill(false)),
  };

  drawFinder(base, 0, 0);
  drawFinder(base, QR_SIZE - 7, 0);
  drawFinder(base, 0, QR_SIZE - 7);
  drawAlignment(base, ALIGNMENT_CENTERS[1], ALIGNMENT_CENTERS[1]);
  drawTiming(base);
  drawFormatBits(base.modules, base.isFunction, 0);
  return base;
}

function buildGaloisTables() {
  const exp = Array<number>(512).fill(0);
  const log = Array<number>(256).fill(0);
  let value = 1;
  for (let i = 0; i < 255; i += 1) {
    exp[i] = value;
    log[value] = i;
    value <<= 1;
    if (value & 0x100) value ^= GF_PRIMITIVE;
  }
  for (let i = 255; i < 512; i += 1) exp[i] = exp[i - 255];
  return { exp, log };
}

const GF = buildGaloisTables();

function gfMultiply(a: number, b: number) {
  if (a === 0 || b === 0) return 0;
  return GF.exp[GF.log[a] + GF.log[b]];
}

function multiplyPolynomials(a: number[], b: number[]) {
  const result = Array<number>(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i += 1) {
    for (let j = 0; j < b.length; j += 1) {
      result[i + j] ^= gfMultiply(a[i], b[j]);
    }
  }
  return result;
}

function reedSolomonGenerator(degree: number) {
  let result = [1];
  for (let i = 0; i < degree; i += 1) {
    result = multiplyPolynomials(result, [1, GF.exp[i]]);
  }
  return result;
}

function generateErrorCorrection(data: number[]) {
  const generator = reedSolomonGenerator(ERROR_CODEWORDS_PER_BLOCK);
  const result = Array<number>(ERROR_CODEWORDS_PER_BLOCK).fill(0);
  for (const value of data) {
    const factor = value ^ result[0];
    result.shift();
    result.push(0);
    for (let i = 0; i < ERROR_CODEWORDS_PER_BLOCK; i += 1) {
      result[i] ^= gfMultiply(generator[i + 1], factor);
    }
  }
  return result;
}

function encodeDataCodewords(value: string) {
  const bytes = Array.from(new TextEncoder().encode(value));
  if (bytes.length > PHONE_HANDOFF_QR_MAX_BYTES) return null;

  const bits: number[] = [];
  const append = (numericValue: number, width: number) => {
    for (let i = width - 1; i >= 0; i -= 1) {
      bits.push((numericValue >>> i) & 1);
    }
  };

  append(0b0100, 4);
  append(bytes.length, 8);
  for (const byte of bytes) append(byte, 8);
  for (let i = 0; i < 4 && bits.length < DATA_CODEWORDS * 8; i += 1) {
    bits.push(0);
  }
  while (bits.length % 8 !== 0) bits.push(0);

  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let codeword = 0;
    for (let j = 0; j < 8; j += 1) codeword = (codeword << 1) | bits[i + j];
    codewords.push(codeword);
  }
  const pads = [0xec, 0x11];
  while (codewords.length < DATA_CODEWORDS) {
    codewords.push(pads[codewords.length % 2]);
  }
  return { bytes, codewords };
}

function buildFinalCodewords(dataCodewords: number[]) {
  const blocks = [
    dataCodewords.slice(0, BLOCK_DATA_CODEWORDS),
    dataCodewords.slice(BLOCK_DATA_CODEWORDS, BLOCK_DATA_CODEWORDS * 2),
  ];
  const errorBlocks = blocks.map((block) => generateErrorCorrection(block));
  const result: number[] = [];

  for (let i = 0; i < BLOCK_DATA_CODEWORDS; i += 1) {
    for (const block of blocks) result.push(block[i]);
  }
  for (let i = 0; i < ERROR_CODEWORDS_PER_BLOCK; i += 1) {
    for (const block of errorBlocks) result.push(block[i]);
  }
  return result;
}

function maskBit(mask: number, x: number, y: number) {
  switch (mask) {
    case 0:
      return (x + y) % 2 === 0;
    case 1:
      return y % 2 === 0;
    case 2:
      return x % 3 === 0;
    case 3:
      return (x + y) % 3 === 0;
    case 4:
      return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0;
    case 5:
      return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6:
      return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
    default:
      return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
  }
}

function cloneModules(modules: Array<Array<boolean | null>>) {
  return modules.map((row) => row.slice());
}

function placeData(
  modules: Array<Array<boolean | null>>,
  isFunction: boolean[][],
  codewords: number[],
  mask: number,
) {
  let bitIndex = 0;
  for (let right = QR_SIZE - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < QR_SIZE; vert += 1) {
      const y = ((right + 1) & 2) === 0 ? QR_SIZE - 1 - vert : vert;
      for (let j = 0; j < 2; j += 1) {
        const x = right - j;
        if (isFunction[y][x]) continue;
        const bit =
          bitIndex < codewords.length * 8
            ? getBit(codewords[bitIndex >>> 3], 7 - (bitIndex & 7))
            : false;
        modules[y][x] = bit !== maskBit(mask, x, y);
        bitIndex += 1;
      }
    }
  }
}

function getPenalty(modules: Array<Array<boolean | null>>) {
  let penalty = 0;
  const dark = (x: number, y: number) => modules[y][x] === true;

  for (let y = 0; y < QR_SIZE; y += 1) {
    let runColor = dark(0, y);
    let runLength = 1;
    for (let x = 1; x < QR_SIZE; x += 1) {
      if (dark(x, y) === runColor) runLength += 1;
      else {
        if (runLength >= 5) penalty += runLength - 2;
        runColor = dark(x, y);
        runLength = 1;
      }
    }
    if (runLength >= 5) penalty += runLength - 2;
  }

  for (let x = 0; x < QR_SIZE; x += 1) {
    let runColor = dark(x, 0);
    let runLength = 1;
    for (let y = 1; y < QR_SIZE; y += 1) {
      if (dark(x, y) === runColor) runLength += 1;
      else {
        if (runLength >= 5) penalty += runLength - 2;
        runColor = dark(x, y);
        runLength = 1;
      }
    }
    if (runLength >= 5) penalty += runLength - 2;
  }

  for (let y = 0; y < QR_SIZE - 1; y += 1) {
    for (let x = 0; x < QR_SIZE - 1; x += 1) {
      const color = dark(x, y);
      if (
        color === dark(x + 1, y) &&
        color === dark(x, y + 1) &&
        color === dark(x + 1, y + 1)
      ) {
        penalty += 3;
      }
    }
  }

  const finderPattern = [
    true,
    false,
    true,
    true,
    true,
    false,
    true,
    false,
    false,
    false,
    false,
  ];
  const reverseFinderPattern = Array.from(finderPattern).reverse();
  const matches = (values: boolean[]) =>
    values.every((value, index) => value === finderPattern[index]) ||
    values.every((value, index) => value === reverseFinderPattern[index]);

  for (let y = 0; y < QR_SIZE; y += 1) {
    for (let x = 0; x <= QR_SIZE - 11; x += 1) {
      if (matches(range(11).map((i) => dark(x + i, y)))) penalty += 40;
    }
  }
  for (let x = 0; x < QR_SIZE; x += 1) {
    for (let y = 0; y <= QR_SIZE - 11; y += 1) {
      if (matches(range(11).map((i) => dark(x, y + i)))) penalty += 40;
    }
  }

  let darkCount = 0;
  for (let y = 0; y < QR_SIZE; y += 1) {
    for (let x = 0; x < QR_SIZE; x += 1) {
      if (dark(x, y)) darkCount += 1;
    }
  }
  const total = QR_SIZE * QR_SIZE;
  penalty += Math.floor(Math.abs(darkCount * 20 - total * 10) / total) * 10;
  return penalty;
}

function toPath(modules: Array<Array<boolean | null>>) {
  const commands: string[] = [];
  for (let y = 0; y < QR_SIZE; y += 1) {
    for (let x = 0; x < QR_SIZE; x += 1) {
      if (modules[y][x] === true) {
        commands.push(`M${x + QUIET_ZONE} ${y + QUIET_ZONE}h1v1h-1z`);
      }
    }
  }
  return commands.join("");
}

// Encodes the already-visible preferredHqLanUrl. It never embeds tokens.
export function buildPhoneHandoffQrMatrix(
  preferredHqLanUrl: string | null | undefined,
): PhoneHandoffQrMatrix | null {
  if (!preferredHqLanUrl) return null;
  const trimmed = preferredHqLanUrl.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;

  const encoded = encodeDataCodewords(trimmed);
  if (!encoded) return null;
  const finalCodewords = buildFinalCodewords(encoded.codewords);
  const base = makeBase();
  let bestModules: Array<Array<boolean | null>> | null = null;
  let bestPenalty = Number.POSITIVE_INFINITY;

  for (let mask = 0; mask < 8; mask += 1) {
    const modules = cloneModules(base.modules);
    placeData(modules, base.isFunction, finalCodewords, mask);
    drawFormatBits(modules, base.isFunction, mask);
    const penalty = getPenalty(modules);
    if (penalty < bestPenalty) {
      bestPenalty = penalty;
      bestModules = modules;
    }
  }

  if (!bestModules) return null;
  return {
    size: QR_SIZE,
    quietZone: QUIET_ZONE,
    path: toPath(bestModules),
    encodedBytes: encoded.bytes.length,
  };
}
