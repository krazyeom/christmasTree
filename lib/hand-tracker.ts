'use client';

export interface HandPoint {
  x: number;
  y: number;
  z: number;
}

export interface HandTrackingState {
  active: boolean;
  starting?: boolean;
  handDetected: boolean;
  tipX: number; // 0..1 normalized (mirrored horizontally)
  tipY: number; // 0..1 normalized
  thumbX: number;
  thumbY: number;
  isPinching: boolean;
  fingerCount: number;
  pinchDistance: number;
  velocityX: number;
  velocityY: number;
  landmarks: HandPoint[] | null;
  error?: string;
}

export type HandStateListener = (state: HandTrackingState) => void;

export function countExtendedFingers(landmarks: HandPoint[]): number {
  if (landmarks.length < 21) return 0;
  const wrist = landmarks[0];
  const indexMcp = landmarks[5];
  const fingerCount = [
    { tip: 8, pip: 6, mcp: 5 },
    { tip: 12, pip: 10, mcp: 9 },
    { tip: 16, pip: 14, mcp: 13 },
    { tip: 20, pip: 18, mcp: 17 },
  ].reduce((count, finger) => {
    const tip = landmarks[finger.tip];
    const pip = landmarks[finger.pip];
    const mcp = landmarks[finger.mcp];
    const tipReach = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
    const pipReach = Math.hypot(pip.x - wrist.x, pip.y - wrist.y);
    const fingerLength = Math.hypot(tip.x - mcp.x, tip.y - mcp.y);
    const palmScale = Math.hypot(indexMcp.x - wrist.x, indexMcp.y - wrist.y);
    return count + (tipReach > pipReach + palmScale * 0.12 && fingerLength > palmScale * 0.65 ? 1 : 0);
  }, 0);
  const thumbTip = landmarks[4];
  const thumbIp = landmarks[3];
  const thumbExtended = Math.hypot(thumbTip.x - indexMcp.x, thumbTip.y - indexMcp.y)
    > Math.hypot(thumbIp.x - indexMcp.x, thumbIp.y - indexMcp.y) + 0.025;
  return Math.min(5, fingerCount + (thumbExtended ? 1 : 0));
}

class HandTrackerService {
  private videoEl: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private handLandmarker: any = null;
  private animId: number | null = null;
  private listeners = new Set<HandStateListener>();
  private genToken = 0;
  private isStarting = false;
  private lastTime = -1;
  private lastTipX = 0.5;
  private lastTipY = 0.5;
  private smoothedVx = 0;
  private smoothedVy = 0;

  private state: HandTrackingState = {
    active: false,
    handDetected: false,
    tipX: 0.5,
    tipY: 0.5,
    thumbX: 0.5,
    thumbY: 0.5,
    isPinching: false,
    fingerCount: 0,
    pinchDistance: 1,
    velocityX: 0,
    velocityY: 0,
    landmarks: null,
  };

  public subscribe(listener: HandStateListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(partial: Partial<HandTrackingState>) {
    this.state = { ...this.state, ...partial };
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  public getState(): HandTrackingState {
    return this.state;
  }

  public getVideoElement(): HTMLVideoElement | null {
    return this.videoEl;
  }

  public async start(): Promise<boolean> {
    if (this.state.active || this.isStarting) return true;
    this.isStarting = true;
    const currentToken = ++this.genToken;

    this.notify({ active: true, error: undefined, handDetected: false });

    let stream: MediaStream | null = null;
    let video: HTMLVideoElement | null = null;
    let landmarker: typeof this.handLandmarker = null;
    const releaseAttempt = () => {
      stream?.getTracks().forEach(track => track.stop());
      if (video) {
        video.pause();
        video.srcObject = null;
        video.remove();
      }
      landmarker?.close();
      landmarker = null;
    };
    const cancelled = () => {
      if (this.genToken === currentToken) return false;
      releaseAttempt();
      return true;
    };

    try {
      if (!window.isSecureContext) {
        throw new Error('카메라는 HTTPS 주소에서 사용할 수 있습니다. 지금은 화면을 터치해서 눈을 움직여보세요.');
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('이 브라우저는 카메라를 지원하지 않습니다. 화면 터치로 눈을 움직여보세요.');
      }
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30, max: 30 },
        },
        audio: false,
      });
      if (cancelled()) return false;
      video = document.createElement('video');
      video.playsInline = true;
      video.muted = true;
      video.autoplay = true;
      video.srcObject = stream;
      this.stream = stream;
      this.videoEl = video;
      this.notify({ starting: true });
      await video.play();
      if (cancelled()) return false;

      const { HandLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
      if (cancelled()) return false;
      const vision = await FilesetResolver.forVisionTasks('/mediapipe/wasm');
      if (cancelled()) return false;
      const options = {
        baseOptions: { modelAssetPath: '/mediapipe/hand_landmarker.task' },
        runningMode: 'VIDEO' as const,
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      };
      try {
        landmarker = await HandLandmarker.createFromOptions(vision, {
          ...options, baseOptions: { ...options.baseOptions, delegate: 'GPU' },
        });
      } catch {
        if (cancelled()) return false;
        landmarker = await HandLandmarker.createFromOptions(vision, {
          ...options, baseOptions: { ...options.baseOptions, delegate: 'CPU' },
        });
      }
      if (cancelled()) return false;
      this.handLandmarker = landmarker;
      this.isStarting = false;
      this.lastTime = -1;
      this.smoothedVx = this.smoothedVy = 0;
      this.notify({ starting: false });
      this.startLoop();
      return true;
    } catch (err: unknown) {
      releaseAttempt();
      if (this.genToken !== currentToken) return false;
      this.stop();
      const error = err instanceof Error ? err : null;
      const message =
        error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError'
          ? '카메라 접근 권한이 거부되었습니다. 주소창 권한 설정을 확인해주세요.'
          : error?.name === 'NotFoundError'
          ? '사용 가능한 카메라를 찾을 수 없습니다.'
          : error?.message?.startsWith('카메라') || error?.message?.startsWith('이 브라우저')
          ? error.message
          : '손인식을 시작하지 못했습니다. 다시 시도하거나 화면 터치를 사용해주세요.';
      this.notify({ active: false, error: message });
      return false;
    }
  }

  public stop() {
    this.genToken++;
    this.isStarting = false;

    if (this.animId !== null) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      this.stream = null;
    }

    if (this.videoEl) {
      this.videoEl.pause();
      this.videoEl.srcObject = null;
      this.videoEl.remove();
      this.videoEl = null;
    }
    this.handLandmarker?.close();
    this.handLandmarker = null;

    this.notify({
      active: false,
      starting: false,
      handDetected: false,
      landmarks: null,
      isPinching: false,
      velocityX: 0,
      velocityY: 0,
    });
  }

  private startLoop() {
    const loop = (timestamp: number) => {
      if (!this.state.active || !this.videoEl || !this.handLandmarker) return;

      if (this.videoEl.readyState >= 2 && this.videoEl.currentTime !== this.lastTime) {
        this.lastTime = this.videoEl.currentTime;

        try {
          const results = this.handLandmarker.detectForVideo(this.videoEl, timestamp);
          if (results && results.landmarks && results.landmarks.length > 0) {
            const rawMarks = results.landmarks[0];
            // 거울 모드: x 좌표를 반전(1 - x)하여 사용자가 화면을 마주볼 때 직관적으로 일치하도록 함
            const landmarks: HandPoint[] = rawMarks.map((pt: any) => ({
              x: 1 - pt.x,
              y: pt.y,
              z: pt.z,
            }));

            // 랜드마크 인덱스:
            // 4: 엄지 손가락 끝 (Thumb Tip)
            // 8: 검지 손가락 끝 (Index Tip)
            // 0: 손목 (Wrist)
            // 9: 중지 중수지관절 (MCP)
            const thumb = landmarks[4];
            const index = landmarks[8];

            const dx = thumb.x - index.x;
            const dy = thumb.y - index.y;
            const dz = (thumb.z - index.z) * 0.8;
            const pinchDistance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            // 핀치 감지 임계값 (0.07 이하일 때 핀치 인식)
            const isPinching = pinchDistance < 0.075;

            const detectedFingerCount = countExtendedFingers(landmarks);

            // 속도 계산 (검지 기준)
            const instantVx = this.state.handDetected ? (index.x - this.lastTipX) * 30 : 0;
            const instantVy = this.state.handDetected ? (index.y - this.lastTipY) * 30 : 0;
            this.smoothedVx = this.smoothedVx * 0.6 + instantVx * 0.4;
            this.smoothedVy = this.smoothedVy * 0.6 + instantVy * 0.4;

            this.lastTipX = index.x;
            this.lastTipY = index.y;

            this.notify({
              handDetected: true,
              tipX: index.x,
              tipY: index.y,
              thumbX: thumb.x,
              thumbY: thumb.y,
              isPinching,
              fingerCount: detectedFingerCount,
              pinchDistance,
              velocityX: this.smoothedVx,
              velocityY: this.smoothedVy,
              landmarks,
            });
          } else {
            this.notify({
              handDetected: false,
              landmarks: null,
              isPinching: false,
              fingerCount: 0,
              velocityX: 0,
              velocityY: 0,
            });
          }
        } catch {
          // 일시적 프레임 오류 무시
        }
      }

      this.animId = requestAnimationFrame(loop);
    };

    this.animId = requestAnimationFrame(loop);
  }
}

export const handTracker = new HandTrackerService();
