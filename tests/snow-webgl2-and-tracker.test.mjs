import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import http from 'node:http';

const root = process.cwd();

test('finger count distinguishes one through five extended fingers', async () => {
  const { countExtendedFingers } = await import('../lib/hand-tracker.ts');
  const makeHand = (count) => {
    const points = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
    points[0] = { x: 0.5, y: 0.8, z: 0 };
    const fingers = [
      { mcp: 5, pip: 6, tip: 8, x: 0.3 },
      { mcp: 9, pip: 10, tip: 12, x: 0.43 },
      { mcp: 13, pip: 14, tip: 16, x: 0.56 },
      { mcp: 17, pip: 18, tip: 20, x: 0.69 },
    ];
    for (const finger of fingers) {
      points[finger.mcp] = { x: finger.x, y: 0.62, z: 0 };
      points[finger.pip] = { x: finger.x, y: 0.47, z: 0 };
      points[finger.tip] = { x: finger.x, y: count > 0 && fingers.indexOf(finger) < count ? 0.28 : 0.58, z: 0 };
    }
    points[2] = { x: 0.38, y: 0.72, z: 0 };
    points[3] = { x: 0.34, y: 0.64, z: 0 };
    points[4] = { x: 0.3, y: count === 5 ? 0.52 : 0.68, z: 0 };
    return points;
  };
  for (let count = 1; count <= 5; count++) {
    assert.equal(countExtendedFingers(makeHand(count)), count, `${count} extended fingers should be counted`);
  }
});

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

test('A cancelled camera attempt cannot stop a newer session', async () => {
  const { handTracker } = await import('../lib/hand-tracker.ts');
  const deferred = () => {
    let resolve, reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    return { promise, resolve, reject };
  };
  const requests = [];
  const videos = [];
  const originals = new Map(['window', 'navigator', 'document'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { isSecureContext: true } });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {
    mediaDevices: { getUserMedia: () => { const request = deferred(); requests.push(request); return request.promise; } },
  } });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: {
    createElement: () => {
      const playback = deferred();
      const video = { playback, play: () => playback.promise, pause() {}, remove() {}, srcObject: null };
      videos.push(video);
      return video;
    },
  } });
  const makeStream = () => {
    const track = { stops: 0, stop() { this.stops++; } };
    return { track, getTracks: () => [track] };
  };
  try {
    const oldStream = makeStream();
    const oldStart = handTracker.start();
    requests[0].resolve(oldStream);
    await Promise.resolve();
    handTracker.stop();
    const newStream = makeStream();
    const newStart = handTracker.start();
    requests[1].resolve(newStream);
    await Promise.resolve();
    videos[0].playback.resolve();
    assert.equal(await oldStart, false);
    assert.equal(handTracker.getState().active, true, 'new session must stay active');
    assert.equal(handTracker.getVideoElement(), videos[1]);
    assert.equal(newStream.track.stops, 0, 'stale cleanup must not stop new tracks');
    assert.ok(oldStream.track.stops >= 1);
    handTracker.stop();
    videos[1].playback.reject(new Error('cancelled playback'));
    assert.equal(await newStart, false);
    assert.ok(newStream.track.stops >= 1);
    assert.equal(handTracker.getVideoElement(), null);

    const lateStream = makeStream();
    const lateStart = handTracker.start();
    handTracker.stop();
    requests[2].resolve(lateStream);
    assert.equal(await lateStart, false);
    assert.equal(lateStream.track.stops, 1, 'late permission grant is immediately released');
    assert.equal(handTracker.getState().active, false);
  } finally {
    handTracker.stop();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});
