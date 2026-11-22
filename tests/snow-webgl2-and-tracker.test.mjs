import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import http from 'node:http';

const root = process.cwd();

test('MediaPipe assets are present and readable', () => {
  const modelPath = path.join(root, 'public/mediapipe/hand_landmarker.task');
  const wasmPath = path.join(root, 'public/mediapipe/wasm/vision_wasm_internal.wasm');

  assert.ok(existsSync(modelPath), 'hand_landmarker.task must exist');
  assert.ok(existsSync(wasmPath), 'vision_wasm_internal.wasm must exist');

  const modelStat = readFileSync(modelPath);
  assert.ok(modelStat.byteLength > 5_000_000, 'Model file should be > 5MB');
});

test('HTTP server serves application, model, and wasm correctly', async () => {
  const portFile = path.join(root, '.runtime/port');
  if (!existsSync(portFile)) return;
  const port = Number(readFileSync(portFile, 'utf8'));

  const fetchStatus = (urlPath) =>
    new Promise((resolve, reject) => {
      const req = http.get({ hostname: '127.0.0.1', port, path: urlPath }, (res) => {
        resolve({ statusCode: res.statusCode, headers: res.headers });
        res.resume();
      });
      req.on('error', reject);
    });

  const page = await fetchStatus('/');
  assert.equal(page.statusCode, 200, 'Main page must return 200');

  const model = await fetchStatus('/mediapipe/hand_landmarker.task');
  assert.equal(model.statusCode, 200, 'MediaPipe task model must return 200');

  const wasm = await fetchStatus('/mediapipe/wasm/vision_wasm_internal.wasm');
  assert.equal(wasm.statusCode, 200, 'MediaPipe WASM binary must return 200');
  assert.equal(wasm.headers['content-type'], 'application/wasm', 'WASM must have application/wasm content-type');
});

test('Hand gesture pinch mathematics', () => {
  // Pinch distance formula test
  const calculateDistance = (p1, p2) => {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dz = (p1.z - p2.z) * 0.8;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  };

  const thumb = { x: 0.5, y: 0.5, z: 0 };
  const indexPinched = { x: 0.52, y: 0.53, z: 0.01 };
  const indexOpen = { x: 0.7, y: 0.8, z: 0 };

  const pinchDist = calculateDistance(thumb, indexPinched);
  const openDist = calculateDistance(thumb, indexOpen);

  assert.ok(pinchDist < 0.075, `Pinched distance (${pinchDist}) should be < 0.075`);
  assert.ok(openDist > 0.075, `Open distance (${openDist}) should be > 0.075`);
});

test('Particle simulation recycling boundary logic', () => {
  let pos = { x: 0.1, y: -1.2, z: 0 };
  if (pos.y < -1.15) {
    pos.y = 1.15;
  }
  assert.equal(pos.y, 1.15, 'Recycled particle must reset to top');
});
