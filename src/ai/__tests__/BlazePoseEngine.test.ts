/**
 * Unit tests for parseDetections and parseLandmarks.
 * Uses synthetic Float32Array fixtures with known values at known offsets.
 * No RN runtime or native module required — pure logic tests.
 */

import { parseDetections, parseLandmarks, parseWorldLandmarks } from '../BlazePoseEngine';
import { LM, LANDMARK_COUNT, STRIDE, TENSOR_SIZE } from '../PoseTypes';
import type { PoseLandmark } from '../PoseTypes';

// ─────────────────────────────────────────────────────────
// SYNC NOTICE: This test file imports the REAL parse functions from
// BlazePoseEngine.ts.  Any future changes to BlazePoseEngine.ts that
// alter function signatures, output shapes, error message text, or
// runtime length assertions MUST be accompanied by corresponding
// updates here.  The TypeScript compiler catches signature mismatches,
// but magic-number constants (2254, 12) and error message strings
// are duplicated from the source.  If you change them there, grep for
// them here too.
// ─────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────
// parseDetections
// ─────────────────────────────────────────────────────────

describe('parseDetections', () => {
  it('returns empty for zero-length input', () => {
    expect(parseDetections(new Float32Array(0))).toEqual([]);
  });

  it('returns empty when all scores are below threshold', () => {
    const buf = new Float32Array(24); // 2 anchors * 12 floats
    // anchor 0: score = 0.1
    buf[4] = 0.1;
    // anchor 1: score = 0.3
    buf[12 + 4] = 0.3;
    expect(parseDetections(buf)).toEqual([]);
  });

  it('finds a detection above threshold', () => {
    const buf = new Float32Array(12); // 1 anchor
    // [ymin, xmin, ymax, xmax, score, kp0x, kp0y, ...]
    buf[0] = 0.1; // ymin
    buf[1] = 0.2; // xmin
    buf[2] = 0.8; // ymax
    buf[3] = 0.7; // xmax
    buf[4] = 0.85; // score
    const result = parseDetections(buf);
    expect(result.length).toBe(1);
    expect(result[0].score).toBeCloseTo(0.85, 4);
    expect(result[0].bbox).toEqual({
      x: 0.2,
      y: 0.1,
      w: 0.5,  // 0.7 - 0.2
      h: 0.7,  // 0.8 - 0.1
    });
  });

  it('sorts by score desc and keeps top-k (k=1)', () => {
    const buf = new Float32Array(36); // 3 anchors
    buf[4] = 0.55;   // anchor 0 score
    buf[12 + 4] = 0.95; // anchor 1 score
    buf[24 + 4] = 0.75; // anchor 2 score
    const result = parseDetections(buf);
    expect(result.length).toBe(1);
    expect(result[0].score).toBeCloseTo(0.95, 4);
  });

  it('skips zero-area bounding boxes', () => {
    const buf = new Float32Array(24);
    buf[0] = 0.5; buf[1] = 0.5; buf[2] = 0.5; buf[3] = 0.5; buf[4] = 0.8; // 0 width+height
    buf[12] = 0.1; buf[12 + 1] = 0.2; buf[12 + 2] = 0.8; buf[12 + 3] = 0.7; buf[12 + 4] = 0.6;
    const result = parseDetections(buf);
    expect(result.length).toBe(1);
    expect(result[0].score).toBeCloseTo(0.6, 4);
  });

  it('accepts non-multiple-of-12 buffers (truncates)', () => {
    const buf = new Float32Array(15);
    buf[4] = 0.6;
    expect(() => parseDetections(buf)).not.toThrow();
  });

  it('throws when parseDetections sees mismatched buffer length', () => {
    // Detector outputs 27048 floats (2254 * 12)
    const buf = new Float32Array(27000); // too small
    expect(() => parseDetections(buf)).toThrow(/Buffer length mismatch/);
  });
});
// End of parseDetections tests — imports BlazePoseEngine.parseDetections directly.


// ─────────────────────────────────────────────────────────
// parseLandmarks — stride math
// ─────────────────────────────────────────────────────────

describe('parseLandmarks', () => {
  const FRAME_W = 1080;
  const FRAME_H = 1920;
  const CROP = { x: 100, y: 200, w: 880, h: 1200 };

  it('parses first landmark with correct stride', () => {
    const buf = new Float32Array(TENSOR_SIZE); // 195 = 39*5
    // Set landmark 0: x=0.5, y=0.3, z=-0.1, vis=0.9, presence=0.95
    buf[0] = 0.5;
    buf[1] = 0.3;
    buf[2] = -0.1;
    buf[3] = 0.9;
    buf[4] = 0.95;

    const result = parseLandmarks(buf, FRAME_W, FRAME_H, CROP.x, CROP.y, CROP.w, CROP.h);
    
    // x = cropX + xNorm * cropW = 100 + 0.5 * 880 = 540
    expect(result[0].x).toBeCloseTo(540, 0);
    // y = cropY + yNorm * cropH = 200 + 0.3 * 1200 = 560
    expect(result[0].y).toBeCloseTo(560, 0);
    expect(result[0].z).toBeCloseTo(-0.1, 4);
    expect(result[0].visibility).toBeCloseTo(0.9, 4);
    expect(result[0].presence).toBeCloseTo(0.95, 4);
  });

  it('STRIDE=5 reads second landmark from correct offset', () => {
    const buf = new Float32Array(TENSOR_SIZE);
    // Fill landmark 1 with known values at offset 5
    buf[STRIDE + 0] = 0.7;   // x
    buf[STRIDE + 1] = 0.6;   // y
    buf[STRIDE + 2] = -0.05; // z
    buf[STRIDE + 3] = 0.8;   // visibility
    buf[STRIDE + 4] = 1.0;   // presence

    const result = parseLandmarks(buf, FRAME_W, FRAME_H, CROP.x, CROP.y, CROP.w, CROP.h);
    
    // Verify landmark 1 is at correct stride
    expect(result[1].x).toBeCloseTo(100 + 0.7 * 880, 0);
    expect(result[1].y).toBeCloseTo(200 + 0.6 * 1200, 0);
    expect(result[1].z).toBeCloseTo(-0.05, 4);
    expect(result[1].visibility).toBeCloseTo(0.8, 4);
    expect(result[1].presence).toBeCloseTo(1.0, 4);
    
    // Verify landmark 0 was NOT accidentally written into (all zeros → cropX, cropY)
    expect(result[0].x).toBeCloseTo(CROP.x, 0);
    expect(result[0].y).toBeCloseTo(CROP.y, 0);
    expect(result[0].z).toBeCloseTo(0, 4);
    expect(result[0].visibility).toBeCloseTo(0, 4);
    expect(result[0].presence).toBeCloseTo(0, 4);
  });

  it('returns exactly LANDMARK_COUNT landmarks', () => {
    const buf = new Float32Array(TENSOR_SIZE);
    const result = parseLandmarks(buf, FRAME_W, FRAME_H, CROP.x, CROP.y, CROP.w, CROP.h);
    expect(result.length).toBe(LANDMARK_COUNT);
  });

  it('clamps visibility to [0,1]', () => {
    const buf = new Float32Array(TENSOR_SIZE);
    buf[3] = -0.5;  // negative → 0
    buf[STRIDE + 3] = 2.0; // >1 → 1
    const result = parseLandmarks(buf, FRAME_W, FRAME_H, CROP.x, CROP.y, CROP.w, CROP.h);
    expect(result[0].visibility).toBe(0);
    expect(result[1].visibility).toBe(1);
  });

  it('last landmark (AUX5, index 38) has correct stride offset', () => {
    const buf = new Float32Array(TENSOR_SIZE);
    const lastIdx = LANDMARK_COUNT - 1; // 38
    const lastOffset = lastIdx * STRIDE; // 38 * 5 = 190
    expect(lastOffset).toBe(190);
    // Set values
    buf[lastOffset + 0] = 0.99;
    buf[lastOffset + 3] = 0.88;
    buf[lastOffset + 4] = 0.77;
    
    const result = parseLandmarks(buf, FRAME_W, FRAME_H, CROP.x, CROP.y, CROP.w, CROP.h);
    expect(result[lastIdx].x).toBeCloseTo(100 + 0.99 * 880, 0);
    expect(result[lastIdx].visibility).toBeCloseTo(0.88, 4);
    expect(result[lastIdx].presence).toBeCloseTo(0.77, 4);
  });

  it('throws on mismatched buffer length', () => {
    const shortBuf = new Float32Array(132); // wrong: 33 * 4 (old bug)
    expect(() => parseLandmarks(shortBuf, 1920, 1080, 0, 0, 1920, 1080))
      .toThrow(/Buffer length mismatch.*got 132.*expected 195/);
  });
});
// End of parseLandmarks tests — imports BlazePoseEngine.parseLandmarks directly.

// ─────────────────────────────────────────────────────────
// parseWorldLandmarks
// ─────────────────────────────────────────────────────────

describe('parseWorldLandmarks', () => {
  it('returns null when buffer is too short', () => {
    const buf = new Float32Array(50);
    expect(parseWorldLandmarks(buf)).toBeNull();
  });

  it('parses full world landmarks with stride 3', () => {
    const buf = new Float32Array(LANDMARK_COUNT * 3); // 117
    buf[0] = 1.0; buf[1] = 2.0; buf[2] = 3.0;
    buf[3] = 4.0; buf[4] = 5.0; buf[5] = 6.0;
    
    const result = parseWorldLandmarks(buf);
    expect(result).not.toBeNull();
    expect(result!.length).toBe(LANDMARK_COUNT);
    expect(result![0].x).toBe(1.0);
    expect(result![0].y).toBe(2.0);
    expect(result![0].z).toBe(3.0);
    expect(result![1].x).toBe(4.0);
    // world landmarks always have visibility=1, presence=1
    expect(result![0].visibility).toBe(1);
    expect(result![0].presence).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────
// TENSOR_SIZE invariant
// ─────────────────────────────────────────────────────────

describe('PoseTypes invariants', () => {
  it('TENSOR_SIZE = LANDMARK_COUNT × STRIDE', () => {
    expect(TENSOR_SIZE).toBe(LANDMARK_COUNT * STRIDE);
    expect(TENSOR_SIZE).toBe(195); // 39 * 5
  });

  it('LM has exactly LANDMARK_COUNT entries', () => {
    const entries = Object.values(LM).filter(v => typeof v === 'number');
    expect(entries.length).toBe(LANDMARK_COUNT);
  });
});
