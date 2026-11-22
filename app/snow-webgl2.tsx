'use client';

import { useEffect, useRef, useState } from 'react';
import type { HandTrackingState } from '@/lib/hand-tracker';

interface SnowWebGL2Props {
  theme: number;
  snow: boolean;
  motion: boolean;
  burst: number;
  handState: HandTrackingState;
  pointerPos: { x: number; y: number; active: boolean; isDown: boolean };
  onStatusChange?: (status: {
    supported: boolean;
    active: boolean;
    particleCount: number;
    handActive: boolean;
  }) => void;
}

const VS_SIM = `#version 300 es
precision highp float;

layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_velocity;
layout(location = 2) in vec4 a_meta; // x: phase, y: size, z: life, w: mass

out vec3 v_position;
out vec3 v_velocity;
out vec4 v_meta;

uniform float u_time;
uniform float u_dt;
uniform vec2 u_handPos;       // clip space [-1, 1]
uniform vec2 u_handVelocity;  // clip space velocity
uniform int u_handActive;
uniform int u_isPinching;
uniform float u_burst;
uniform vec2 u_resolution;

// 간단한 의사 난수 생성 함수
float rand(vec2 co) {
  return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec3 pos = a_position;
  vec3 vel = a_velocity;
  vec4 meta = a_meta;

  float phase = meta.x;
  float size = meta.y;
  float life = meta.z;
  float mass = meta.w;

  float dt = clamp(u_dt, 0.001, 0.05);

  // 1. 기본 중력 및 낙하
  float fallSpeed = (0.28 + mass * 0.35);
  vel.y = -fallSpeed;

  // 2. 가로 바람 진동
  float wind = sin(u_time * 0.9 + phase * 6.28) * (0.04 + mass * 0.03);
  vel.x = mix(vel.x, wind, dt * 2.0);

  // 3. 손 / 포인터 인터랙션 (손가락 추적 또는 마우스/터치)
  if (u_handActive == 1) {
    vec2 toHand = u_handPos - pos.xy;
    // 종횡비 보정
    float aspect = u_resolution.x / max(u_resolution.y, 1.0);
    toHand.x *= aspect;
    float dist = length(toHand);

    if (u_isPinching == 1) {
      // [핀치 제스처: 소용돌이 흡인 블랙홀 효과]
      if (dist < 0.85) {
        vec2 normDir = normalize(toHand);
        vec2 tangent = vec2(-normDir.y, normDir.x);
        float pullStrength = (1.0 - smoothstep(0.0, 0.85, dist)) * 4.2;
        float vortexStrength = (1.0 - smoothstep(0.0, 0.85, dist)) * 3.5;

        vel.xy += (normDir * pullStrength + tangent * vortexStrength) * dt * (1.2 / max(mass, 0.5));
      }
    } else {
      // [열린 손 / 포인터 이동: 바람 밀쳐내기 및 반발 효과]
      if (dist < 0.32) {
        vec2 pushDir = normalize(pos.xy - u_handPos);
        float pushStrength = (1.0 - dist / 0.32) * 1.8;
        vel.xy += pushDir * pushStrength * dt;

        // 손의 이동 속도 전달 (돌풍)
        vel.xy += u_handVelocity * (1.0 - dist / 0.32) * 0.8;
      }
    }
  }

  // 4. 버스트(선물 클릭) 파동 효과
  if (u_burst > 0.05) {
    vec2 fromCenter = pos.xy;
    float cDist = length(fromCenter);
    vec2 bDir = normalize(fromCenter + vec2(0.001, 0.001));
    vel.xy += bDir * (u_burst * 2.5 / (cDist + 0.2)) * dt;
  }

  // 감쇠
  vel.x *= 0.98;
  vel.z *= 0.98;

  // 위치 갱신
  pos += vel * dt;

  // 5. 화면 경계 재배치 (리사이클)
  if (pos.y < -1.15) {
    pos.y = 1.15 + rand(vec2(phase, u_time)) * 0.15;
    pos.x = (rand(vec2(u_time, phase)) * 2.0 - 1.0);
    pos.z = (rand(vec2(phase * 2.1, u_time)) * 2.0 - 1.0);
    vel.x = 0.0;
  }
  if (pos.x < -1.25) pos.x = 1.2;
  if (pos.x > 1.25) pos.x = -1.2;

  v_position = pos;
  v_velocity = vel;
  v_meta = meta;
}
`;

const FS_SIM = `#version 300 es
precision highp float;
void main() {
  // 시뮬레이션 패스에서는 변환 피드백만 기록
}
`;

const VS_RENDER = `#version 300 es
precision highp float;

layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_velocity;
layout(location = 2) in vec4 a_meta;

out float v_alpha;
out float v_sparkle;

uniform float u_time;
uniform vec2 u_resolution;
uniform float u_pointScale;

void main() {
  gl_Position = vec4(a_position.xy, 0.0, 1.0);

  float size = a_meta.y;
  float phase = a_meta.x;
  float depth = (a_position.z + 1.0) * 0.5; // 0..1

  // 반짝임 효과
  float sparkle = sin(u_time * 3.0 + phase * 18.0) * 0.5 + 0.5;
  v_sparkle = sparkle;

  // 깊이에 따른 크기 및 투명도
  float pSize = size * u_pointScale * (0.65 + depth * 0.85);
  gl_PointSize = clamp(pSize, 1.5, 18.0);

  v_alpha = 0.35 + depth * 0.55 + sparkle * 0.15;
}
`;

const FS_RENDER = `#version 300 es
precision highp float;

in float v_alpha;
in float v_sparkle;
out vec4 fragColor;

uniform int u_theme;

void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord);
  if (dist > 0.5) discard;

  // 부드러운 가우시안 글로우 원형
  float core = smoothstep(0.5, 0.08, dist);
  float halo = smoothstep(0.5, 0.0, dist) * 0.4;
  float intensity = core + halo;

  vec3 baseColor = vec3(0.92, 0.97, 0.94); // 클래식 기본 흰색/민트빛
  if (u_theme == 1) {
    baseColor = vec3(1.0, 0.94, 0.84);   // 샴페인 골드빛
  } else if (u_theme == 2) {
    baseColor = vec3(0.88, 0.85, 1.0);    // 오로라 보랏빛
  }

  // 중심 코어는 밝은 백색
  vec3 finalColor = mix(baseColor, vec3(1.0, 1.0, 1.0), core * 0.85);

  fragColor = vec4(finalColor, (intensity * v_alpha) * 0.92);
}
`;

export default function SnowWebGL2({
  theme,
  snow,
  motion,
  burst,
  handState,
  pointerPos,
  onStatusChange,
}: SnowWebGL2Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isSupported, setIsSupported] = useState(true);
  const animRef = useRef<number | null>(null);
  const previousTimeRef = useRef(0);
  const burstDecayRef = useRef(0);

  // 손/포인터 합성 좌표 추적
  const activeInputRef = useRef({
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    isPinching: false,
  });

  useEffect(() => {
    // 손 인식 데이터가 활성 상태이면 손 우선, 아니면 마우스/터치 포인터 반영
    if (handState.active && handState.handDetected) {
      activeInputRef.current = {
        active: true,
        // normalized 0..1 -> clip space -1..1
        x: handState.tipX * 2 - 1,
        y: -(handState.tipY * 2 - 1),
        vx: handState.velocityX * 2,
        vy: -handState.velocityY * 2,
        isPinching: handState.isPinching,
      };
    } else if (pointerPos.active) {
      activeInputRef.current = {
        active: true,
        x: pointerPos.x * 2 - 1,
        y: -(pointerPos.y * 2 - 1),
        vx: 0,
        vy: 0,
        isPinching: pointerPos.isDown,
      };
    } else {
      activeInputRef.current.active = false;
      activeInputRef.current.isPinching = false;
    }
  }, [handState, pointerPos]);

  useEffect(() => {
    if (burst > 0) {
      burstDecayRef.current = 1.0;
    }
  }, [burst]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // WebGL2 컨텍스트 확인
    const gl = canvas.getContext('webgl2', {
      alpha: true,
      antialias: false,
      depth: false,
      powerPreference: 'high-performance',
    });

    if (!gl) {
      setIsSupported(false);
      onStatusChange?.({
        supported: false,
        active: false,
        particleCount: 0,
        handActive: false,
      });
      return;
    }

    // 모바일/저사양/축소 모션 적응형 파티클 수 계산
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const PARTICLE_COUNT = prefersReducedMotion
      ? 12000
      : isMobile
      ? 28000
      : 100000; // 데스크톱 10만 파티클

    // 1. 셰이더 컴파일 유틸
    function createShader(type: number, source: string): WebGLShader | null {
      const shader = gl!.createShader(type);
      if (!shader) return null;
      gl!.shaderSource(shader, source);
      gl!.compileShader(shader);
      if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
        console.error(gl!.getShaderInfoLog(shader));
        gl!.deleteShader(shader);
        return null;
      }
      return shader;
    }

    // 2. 시뮬레이션 프로그램 (Transform Feedback)
    const vsSim = createShader(gl.VERTEX_SHADER, VS_SIM);
    const fsSim = createShader(gl.FRAGMENT_SHADER, FS_SIM);
    if (!vsSim || !fsSim) return;

    const simProg = gl.createProgram()!;
    gl.attachShader(simProg, vsSim);
    gl.attachShader(simProg, fsSim);
    gl.transformFeedbackVaryings(
      simProg,
      ['v_position', 'v_velocity', 'v_meta'],
      gl.SEPARATE_ATTRIBS
    );
    gl.linkProgram(simProg);

    if (!gl.getProgramParameter(simProg, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(simProg));
      return;
    }

    // 3. 렌더 프로그램
    const vsRender = createShader(gl.VERTEX_SHADER, VS_RENDER);
    const fsRender = createShader(gl.FRAGMENT_SHADER, FS_RENDER);
    if (!vsRender || !fsRender) return;

    const renderProg = gl.createProgram()!;
    gl.attachShader(renderProg, vsRender);
    gl.attachShader(renderProg, fsRender);
    gl.linkProgram(renderProg);

    if (!gl.getProgramParameter(renderProg, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(renderProg));
      return;
    }

    // 4. 버퍼 초기화 (VAO A / VAO B 더블 버퍼링)
    const initialPos = new Float32Array(PARTICLE_COUNT * 3);
    const initialVel = new Float32Array(PARTICLE_COUNT * 3);
    const initialMeta = new Float32Array(PARTICLE_COUNT * 4);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // x: -1..1, y: -1..1, z: -1..1
      initialPos[i * 3 + 0] = Math.random() * 2 - 1;
      initialPos[i * 3 + 1] = Math.random() * 2 - 1;
      initialPos[i * 3 + 2] = Math.random() * 2 - 1;

      initialVel[i * 3 + 0] = (Math.random() - 0.5) * 0.05;
      initialVel[i * 3 + 1] = -0.15 - Math.random() * 0.25;
      initialVel[i * 3 + 2] = 0;

      initialMeta[i * 4 + 0] = Math.random(); // phase
      initialMeta[i * 4 + 1] = 2.5 + Math.random() * 4.5; // size
      initialMeta[i * 4 + 2] = 1.0; // life
      initialMeta[i * 4 + 3] = 0.5 + Math.random() * 0.5; // mass
    }

    const posBufA = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, posBufA);
    gl.bufferData(gl.ARRAY_BUFFER, initialPos, gl.STREAM_DRAW);

    const posBufB = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, posBufB);
    gl.bufferData(gl.ARRAY_BUFFER, initialPos, gl.STREAM_DRAW);

    const velBufA = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, velBufA);
    gl.bufferData(gl.ARRAY_BUFFER, initialVel, gl.STREAM_DRAW);

    const velBufB = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, velBufB);
    gl.bufferData(gl.ARRAY_BUFFER, initialVel, gl.STREAM_DRAW);

    const metaBufA = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, metaBufA);
    gl.bufferData(gl.ARRAY_BUFFER, initialMeta, gl.STREAM_DRAW);

    const metaBufB = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, metaBufB);
    gl.bufferData(gl.ARRAY_BUFFER, initialMeta, gl.STREAM_DRAW);

    // VAO A: A 입력
    const vaoA = gl.createVertexArray()!;
    gl.bindVertexArray(vaoA);
    gl.bindBuffer(gl.ARRAY_BUFFER, posBufA);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, velBufA);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, metaBufA);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 0, 0);

    // VAO B: B 입력
    const vaoB = gl.createVertexArray()!;
    gl.bindVertexArray(vaoB);
    gl.bindBuffer(gl.ARRAY_BUFFER, posBufB);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, velBufB);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, metaBufB);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 0, 0);

    // Transform Feedback 객체 2개
    const tfA = gl.createTransformFeedback()!;
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tfA);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, posBufB);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, velBufB);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 2, metaBufB);

    const tfB = gl.createTransformFeedback()!;
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tfB);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, posBufA);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, velBufA);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 2, metaBufA);

    gl.bindVertexArray(null);
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);

    // 유니폼 로케이션
    const uSimTime = gl.getUniformLocation(simProg, 'u_time');
    const uSimDt = gl.getUniformLocation(simProg, 'u_dt');
    const uSimHandPos = gl.getUniformLocation(simProg, 'u_handPos');
    const uSimHandVel = gl.getUniformLocation(simProg, 'u_handVelocity');
    const uSimHandActive = gl.getUniformLocation(simProg, 'u_handActive');
    const uSimPinch = gl.getUniformLocation(simProg, 'u_isPinching');
    const uSimBurst = gl.getUniformLocation(simProg, 'u_burst');
    const uSimRes = gl.getUniformLocation(simProg, 'u_resolution');

    const uRenTime = gl.getUniformLocation(renderProg, 'u_time');
    const uRenTheme = gl.getUniformLocation(renderProg, 'u_theme');
    const uRenPointScale = gl.getUniformLocation(renderProg, 'u_pointScale');

    let currentVAO = vaoA;
    let currentTF = tfA;
    let width = 0;
    let height = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.floor(rect.width * dpr);
      height = Math.floor(rect.height * dpr);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
    };
    resize();
    window.addEventListener('resize', resize);

    onStatusChange?.({
      supported: true,
      active: snow,
      particleCount: PARTICLE_COUNT,
      handActive: activeInputRef.current.active,
    });

    let totalTime = 0;

    const render = (now: number) => {
      if (!snow) {
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        animRef.current = requestAnimationFrame(render);
        return;
      }

      if (!previousTimeRef.current) previousTimeRef.current = now;
      const rawDt = (now - previousTimeRef.current) / 1000;
      previousTimeRef.current = now;
      const dt = Math.min(rawDt, 0.05);

      if (motion) {
        totalTime += dt;
        burstDecayRef.current = Math.max(0, burstDecayRef.current - dt * 1.5);
      }

      const input = activeInputRef.current;

      // --- 패스 1: 시뮬레이션 (Transform Feedback) ---
      if (motion) {
        gl.useProgram(simProg);
        gl.uniform1f(uSimTime, totalTime);
        gl.uniform1f(uSimDt, dt);
        gl.uniform2f(uSimHandPos, input.x, input.y);
        gl.uniform2f(uSimHandVel, input.vx, input.vy);
        gl.uniform1i(uSimHandActive, input.active ? 1 : 0);
        gl.uniform1i(uSimPinch, input.isPinching ? 1 : 0);
        gl.uniform1f(uSimBurst, burstDecayRef.current);
        gl.uniform2f(uSimRes, width, height);

        gl.bindVertexArray(currentVAO);
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, currentTF);

        gl.enable(gl.RASTERIZER_DISCARD);
        gl.beginTransformFeedback(gl.POINTS);
        gl.drawArrays(gl.POINTS, 0, PARTICLE_COUNT);
        gl.endTransformFeedback();
        gl.disable(gl.RASTERIZER_DISCARD);

        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
      }

      // --- 패스 2: 렌더링 ---
      gl.useProgram(renderProg);
      gl.uniform1f(uRenTime, totalTime);
      gl.uniform1i(uRenTheme, theme);
      gl.uniform1f(uRenPointScale, Math.min(window.devicePixelRatio || 1, 2));

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE); // 가산 혼합(Additive Glow)으로 환상적인 눈송이 발광 연출

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      // 출력 버퍼를 렌더링 (Transform Feedback이 기록한 버퍼가 B이면 B를 렌더)
      const renderVAO = currentVAO === vaoA ? vaoB : vaoA;
      gl.bindVertexArray(renderVAO);
      gl.drawArrays(gl.POINTS, 0, PARTICLE_COUNT);
      gl.bindVertexArray(null);

      // 버퍼 핑퐁 교체
      if (motion) {
        currentVAO = currentVAO === vaoA ? vaoB : vaoA;
        currentTF = currentTF === tfA ? tfB : tfA;
      }

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      if (animRef.current !== null) {
        cancelAnimationFrame(animRef.current);
      }
      try {
        gl.deleteProgram(simProg);
        gl.deleteProgram(renderProg);
        gl.deleteBuffer(posBufA);
        gl.deleteBuffer(posBufB);
        gl.deleteBuffer(velBufA);
        gl.deleteBuffer(velBufB);
        gl.deleteBuffer(metaBufA);
        gl.deleteBuffer(metaBufB);
        gl.deleteTransformFeedback(tfA);
        gl.deleteTransformFeedback(tfB);
        gl.deleteVertexArray(vaoA);
        gl.deleteVertexArray(vaoB);
      } catch {
        // cleanup safe
      }
    };
  }, [theme, snow, motion]);

  return (
    <canvas
      ref={canvasRef}
      className="snow-webgl2-canvas"
      aria-hidden="true"
    />
  );
}
