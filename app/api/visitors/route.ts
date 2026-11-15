import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

interface VisitorData {
  total: number;
  today: number;
  lastDate: string;
  sessions: { [id: string]: number }; // sessionId -> lastSeenTimestamp
}

const dataFile = path.join(process.cwd(), '.runtime', 'visitors.json');

function loadData(): VisitorData {
  const todayStr = new Date().toISOString().slice(0, 10);
  try {
    if (fs.existsSync(dataFile)) {
      const raw = fs.readFileSync(dataFile, 'utf8');
      const data: VisitorData = JSON.parse(raw);
      if (data.lastDate !== todayStr) {
        data.today = 0;
        data.lastDate = todayStr;
      }
      return data;
    }
  } catch {
    // ignore parse error
  }
  return {
    total: 1, // 실제 방문자 카운트 (실제 1부터 누적)
    today: 1,
    lastDate: todayStr,
    sessions: {},
  };
}

function saveData(data: VisitorData) {
  try {
    fs.mkdirSync(path.dirname(dataFile), { recursive: true });
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), 'utf8');
  } catch {
    // ignore write error
  }
}

function getActiveCount(sessions: { [id: string]: number }): number {
  const now = Date.now();
  const threshold = now - 120 * 1000; // 최근 2분(120초) 이내 활성 세션
  let count = 0;
  for (const id in sessions) {
    if (sessions[id] > threshold) {
      count++;
    } else {
      delete sessions[id]; // 만료 세션 정리
    }
  }
  return Math.max(1, count); // 현재 열람 중인 사용자 최소 1명
}

export async function GET() {
  const data = loadData();
  const active = getActiveCount(data.sessions);
  saveData(data);
  return NextResponse.json({
    total: data.total,
    today: data.today,
    active,
  });
}

export async function POST(req: Request) {
  const data = loadData();
  let sessionId = '';
  try {
    const body = await req.json().catch(() => ({}));
    sessionId = body.sessionId || '';
  } catch {
    // ignore
  }

  if (!sessionId) {
    sessionId = Math.random().toString(36).substring(2, 12);
  }

  const isNewSession = !data.sessions[sessionId];
  data.sessions[sessionId] = Date.now();

  // 브라우저 최초 세션 방문 시에만 누적 증가 (새로고침 시 무한 증가 방지)
  if (isNewSession) {
    data.total += 1;
    data.today += 1;
  }

  const active = getActiveCount(data.sessions);
  saveData(data);

  return NextResponse.json({
    total: data.total,
    today: data.today,
    active,
    sessionId,
  });
}
