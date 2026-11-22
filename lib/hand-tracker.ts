'use client';

export interface HandPoint {
  x: number;
  y: number;
  z: number;
}

export interface HandTrackingState {
  active: boolean;
  handDetected: boolean;
  tipX: number; // 0..1 normalized (mirrored horizontally)
  tipY: number; // 0..1 normalized
  thumbX: number;
  thumbY: number;
  isPinching: boolean;
  pinchDistance: number;
  velocityX: number;
  velocityY: number;
  landmarks: HandPoint[] | null;
  error?: string;
}

export type HandStateListener = (state: HandTrackingState) => void;

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

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('이 브라우저는 카메라 미디어 장치를 지원하지 않습니다.');
      }

      // 1. WebCam 권한 요청
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30, max: 30 },
        },
        audio: false,
      });

      if (this.genToken !== currentToken) {
        stream.getTracks().forEach((t) => t.stop());
        return false;
      }

      this.stream = stream;

      // 2. 비디오 엘리먼트 준비
      if (!this.videoEl) {
        const video = document.createElement('video');
        video.setAttribute('playsinline', 'true');
        video.setAttribute('muted', 'true');
        video.muted = true;
        video.autoplay = true;
        this.videoEl = video;
      }

      this.videoEl.srcObject = stream;
      await this.videoEl.play();

      if (this.genToken !== currentToken) {
        this.stop();
        return false;
      }

      // 3. MediaPipe Hand Landmarker 로딩
      if (!this.handLandmarker) {
        const { HandLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
        const vision = await FilesetResolver.forVisionTasks('/mediapipe/wasm');

        if (this.genToken !== currentToken) {
          this.stop();
          return false;
        }

        this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: '/mediapipe/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        if (this.genToken !== currentToken) {
          this.stop();
          return false;
        }
      }

      this.isStarting = false;
      this.lastTime = -1;
      this.startLoop();
      return true;
    } catch (err: any) {
      if (this.genToken !== currentToken) return false;
      this.isStarting = false;
      this.stop();
      const message =
        err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError'
          ? '카메라 접근 권한이 거부되었습니다. 주소창 권한 설정을 확인해주세요.'
          : err?.name === 'NotFoundError'
          ? '사용 가능한 웹캠 장치를 찾을 수 없습니다.'
          : err?.message || '카메라를 초기화하지 못했습니다.';
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
    }

    this.notify({
      active: false,
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

            // 속도 계산 (검지 기준)
            const instantVx = (index.x - this.lastTipX) * 30;
            const instantVy = (index.y - this.lastTipY) * 30;
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
