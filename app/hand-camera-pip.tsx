'use client';

import { useEffect, useRef, useState } from 'react';
import { handTracker, type HandTrackingState } from '@/lib/hand-tracker';

// 손 랜드마크 연결선 (MediaPipe Hand Connections)
const HAND_CONNECTIONS = [
  // 엄지
  [0, 1], [1, 2], [2, 3], [3, 4],
  // 검지
  [0, 5], [5, 6], [6, 7], [7, 8],
  // 중지
  [9, 10], [10, 11], [11, 12],
  // 약지
  [13, 14], [14, 15], [15, 16],
  // 소지
  [0, 17], [17, 18], [18, 19], [19, 20],
  // 손바닥 너클
  [5, 9], [9, 13], [13, 17],
];

interface HandCameraPipProps {
  trackingState: HandTrackingState;
  onClose: () => void;
}

export default function HandCameraPip({ trackingState, onClose }: HandCameraPipProps) {
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [minimized, setMinimized] = useState(false);

  // 부착된 비디오 요소를 PiP 컨테이너에 마운트
  useEffect(() => {
    const video = handTracker.getVideoElement();
    const container = videoContainerRef.current;
    if (video && container && !container.contains(video)) {
      video.className = 'pip-video';
      video.style.transform = 'scaleX(-1)'; // 미러링 반전
      container.prepend(video);
    }
  }, [trackingState.active, trackingState.starting, minimized]);

  // 랜드마크 스켈레톤 드로잉
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || minimized) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!trackingState.landmarks || trackingState.landmarks.length < 21) {
      return;
    }

    const w = canvas.width;
    const h = canvas.height;
    const marks = trackingState.landmarks;

    // 1. 관절 연결 뼈대 선 그리기
    ctx.lineWidth = 2;
    ctx.strokeStyle = trackingState.isPinching
      ? 'rgba(255, 209, 102, 0.75)'
      : 'rgba(145, 230, 186, 0.65)';
    ctx.beginPath();
    for (const [a, b] of HAND_CONNECTIONS) {
      const p1 = marks[a];
      const p2 = marks[b];
      ctx.moveTo(p1.x * w, p1.y * h);
      ctx.lineTo(p2.x * w, p2.y * h);
    }
    ctx.stroke();

    // 2. 관절 포인트 그리기
    for (let i = 0; i < marks.length; i++) {
      const p = marks[i];
      const isTip = i === 4 || i === 8 || i === 12 || i === 16 || i === 20;
      const isIndexOrThumb = i === 4 || i === 8;

      ctx.beginPath();
      if (isIndexOrThumb) {
        ctx.arc(p.x * w, p.y * h, trackingState.isPinching ? 6 : 4.5, 0, Math.PI * 2);
        ctx.fillStyle = trackingState.isPinching ? '#ff4d6d' : '#ffd166';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 8;
      } else if (isTip) {
        ctx.arc(p.x * w, p.y * h, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#91e6ba';
        ctx.shadowBlur = 0;
      } else {
        ctx.arc(p.x * w, p.y * h, 2, 0, Math.PI * 2);
        ctx.fillStyle = '#c5e5d5';
        ctx.shadowBlur = 0;
      }
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }, [trackingState, minimized]);

  if (!trackingState.active) return null;

  return (
    <aside
      className={`hand-pip-card ${minimized ? 'minimized' : ''} ${
        trackingState.isPinching ? 'pinching' : ''
      }`}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerMove={(e) => e.stopPropagation()}
      aria-label="손가락 인식 미리보기 패널"
    >
      <div className="pip-header">
        <div className="pip-title">
          <span className={`status-dot ${trackingState.handDetected ? 'live' : 'searching'}`} />
          <span>
            {trackingState.handDetected
              ? trackingState.isPinching
                ? '✨ PINCH 소용돌이'
                : '🖐 손 추적 중'
              : '카메라 인식 대기'}
          </span>
        </div>
        <div className="pip-actions">
          <button
            type="button"
            className="pip-btn"
            onClick={(e) => {
              e.stopPropagation();
              setMinimized((m) => !m);
            }}
            title={minimized ? '패널 펼치기' : '패널 최소화'}
            aria-label={minimized ? '패널 펼치기' : '패널 최소화'}
          >
            {minimized ? '□' : '—'}
          </button>
          <button
            type="button"
            className="pip-btn close"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            title="카메라 끄기"
            aria-label="카메라 끄기"
          >
            ✕
          </button>
        </div>
      </div>

      {!minimized && (
        <div className="pip-body" ref={videoContainerRef}>
          <canvas
            ref={canvasRef}
            className="pip-canvas"
            width={240}
            height={180}
            aria-hidden="true"
          />
          <div className="pip-guidance">
            {trackingState.handDetected ? (
              <span>엄지와 검지를 모으면(Pinch) 눈이 소용돌이칩니다</span>
            ) : (
              <span>카메라 앞에 손을 비추어 눈송이를 움직여보세요</span>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
