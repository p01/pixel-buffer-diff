const DiffOnly = 1;
const SideBySide = 2;
const MINIMAP_OVERLAY = false;
const MINIMAP_SCALE = 256;
const THRESHOLD = 0.03;
const COLOR32_ADDED = 0x03f00cc00;
const COLOR32_REMOVED = 0x03f0000ff;
const COLOR32_MINIMAP = 0x0407f0000;
const HASH_SPREAD = 0x0f0731337;

/* PBD: Pixel Buffer Diff  */
export const diffImageDatas = (
  baseline: ImageData,
  candidate: ImageData,
  diff: ImageData,
  options?: { threshold?: number, enableMinimap?: boolean,  }
): { diff: number; hash: number; cummulatedDelta: number } => {
  const addMinimapOverlay = options && options.enableMinimap || MINIMAP_OVERLAY;
  const threshold = options && options.threshold || THRESHOLD;
  const { width, height } = baseline;
  const area = width * height;
  const baseline8 = baseline.data;
  const candidate8 = candidate.data;
  const diff8 = diff.data;
  const b8l = baseline8.length;
  const c8l = candidate8.length;
  const d8l = diff8.length;

  if (width !== candidate.width || height !== candidate.height || area * 4 !== b8l || b8l !== c8l) {
    throw new Error("Different baseline and candidate ImageData dimensions");
  }
  const wRatio = diff.width / width;
  const lRatio = d8l / b8l;
  if (diff.height !== height || wRatio !== lRatio || (wRatio !== 1 && wRatio !== 3)) {
    throw new Error("Invalid diff ImageData dimensions");
  }

  const diffType = d8l === b8l ? DiffOnly : SideBySide;
  const bBuffer = baseline8.buffer;
  const cBuffer = candidate8.buffer;
  const dBuffer = diff8.buffer;
  const baseline32 = new Uint32Array(bBuffer, 0, b8l >> 2);
  const candidate32 = new Uint32Array(cBuffer, 0, b8l >> 2);
  const diff32 = new Uint32Array(dBuffer, 0, d8l >> 2);
  // maximum acceptable square distance between two colors;
  // 35215 is the maximum possible value for the YIQ difference metric
  const deltaThreshold = threshold * threshold * 35215;

  let b8i = 0;
  let b32i = 0;
  let d32i = 0;
  let diffCount = 0;

  let hash = 0;
  let hashStart = 0;
  let cummulatedDelta = 0;

  // Quick approx of color theme to figure if the "new" pixels should be dark or light
  // Approx the area to a square and take 1 sample per 128 pixels
  let averageBrightness = 0;
  const brightnessSamples = Math.ceil(Math.sqrt(area) / 128);
  const b8iStep = (b8l / brightnessSamples) & -4;
  for (let i = 0; i < brightnessSamples; i++) {
    averageBrightness +=
      (0.299 * (baseline8[b8i] + candidate8[b8i]) +
        0.587 * (baseline8[b8i + 1] + candidate8[b8i + 1]) +
        0.114 * (baseline8[b8i + 2] + candidate8[b8i + 2])) /
      brightnessSamples /
      2;
    b8i += b8iStep;
  }
  const isDarkTheme = averageBrightness < 128;
  const color32Added = isDarkTheme ? COLOR32_ADDED : COLOR32_REMOVED;
  const color32Removed = isDarkTheme ? COLOR32_REMOVED : COLOR32_ADDED;

  // Diff every pixel
  b8i = 0;
  const miniHeight = Math.ceil(height / MINIMAP_SCALE);
  const miniWidth = Math.ceil(width / MINIMAP_SCALE);
  const miniMap = new Uint8ClampedArray(miniWidth * miniHeight);
  const d32iPadding = diffType === SideBySide ? width : 0;
  const d32iWidth = d32iPadding * 2 + width;
  for (let y = 0; y < height; y++) {
    let miniIndex = Math.floor(y / MINIMAP_SCALE) * miniWidth;
    // For side-by-side diff, copy the baseline and candidate on the sides
    if (d32iPadding > 0) {
      diff32.set(new Uint32Array(bBuffer, b8i, width), d32i);
      d32i += width;
      diff32.set(new Uint32Array(cBuffer, b8i, width), d32i + width);
    }

    let hashIndex = (y ^ HASH_SPREAD) * HASH_SPREAD;
    for (let x = 0; x < width; x++, d32i++, b32i++, b8i += 4, hashIndex++) {
      if ((x % MINIMAP_SCALE) === MINIMAP_SCALE-1) {
        miniIndex++;
      }
      // Quick check against the Uint32
      if (baseline32[b32i] === candidate32[b32i]) {
        continue;
      }

      // Get the r,g,b -> y,i,q => YIQ square delta
      const dr = candidate8[b8i] - baseline8[b8i];
      const dg = candidate8[b8i + 1] - baseline8[b8i + 1];
      const db = candidate8[b8i + 2] - baseline8[b8i + 2];

      const dy = dr * 0.29889531 + dg * 0.58662247 + db * 0.11448223;
      const di = dr * 0.59597799 - dg * 0.27417610 - db * 0.32180189;
      const dq = dr * 0.21147017 - dg * 0.52261711 + db * 0.31114694;

      const delta = dy * dy * 0.5053 + di * di * 0.299 + dq * dq * 0.1957;
      if (delta > deltaThreshold) {
        miniMap[miniIndex]++;
        diffCount++;
        const dyAbs = Math.abs(dy);
        cummulatedDelta += dyAbs / 35215;
        diff32[d32i] =
          (dy > 0 ? color32Added : color32Removed) +
          (Math.min(192, dyAbs * 8) << 24);

        if (hash === 0) {
          hashStart = hashIndex;
        }
        hash += hashIndex;
      }
    }
    d32i += d32iPadding;
  }
  hash -= hashStart;

  // Apply minimap overlay
  if (addMinimapOverlay) {
    for (let i=0; i < miniWidth * miniHeight; i++) {
      const value = miniMap[i]
      if (value > 0) {
        const miniX = i % miniWidth;
        const miniY = i / miniWidth | 0;
        const x0 = miniX * MINIMAP_SCALE
        const x1 = Math.min(x0 + MINIMAP_SCALE, width);
        const y0 = miniY * MINIMAP_SCALE
        const y1 = Math.min(y0 + MINIMAP_SCALE, height);
        d32i = x0 + y0 * d32iWidth + d32iPadding;
        const d32iYinc = d32iWidth - x1 + x0;
        for (let y = y0; y < y1; y++) {
            for (let x = x0; x < x1; x++) {
              diff32[d32i++] |= COLOR32_MINIMAP;
            }
            d32i += d32iYinc;
        }
      }
    }
  }

  return { diff: diffCount, hash, cummulatedDelta };
};

export const diff = (
  baseline8: Uint8Array | Uint8ClampedArray,
  candidate8: Uint8Array | Uint8ClampedArray,
  diff8: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  options?: { threshold?: number; enableMinimap?: boolean }
): { diff: number; hash: number; cummulatedDelta: number } => diffImageDatas({ width, height, data: baseline8 } as ImageData,
  { width, height, data: candidate8 } as ImageData,
  { width: width * diff8.length / baseline8.length, height, data: diff8 } as ImageData, options);

