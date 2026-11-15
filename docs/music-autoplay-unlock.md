# 오디오 즉시 재생 및 곡 자동 연속 재생 명세서

## 1. 개요
크리스마스 캐럴 오르골 재생기에서 사용자가 곡을 선택했을 때 멈춤/재시작 없이 즉시 새 곡으로 전환되고, 한 곡이 종료되면 다음 곡으로 자연스럽게 자동 연속 재생되도록 개선한 오디오 스케줄링 명세서입니다.

---

## 2. 핵심 개선 사항

### A. 무지연 곡 즉각 전환 (`changeSong`) ([lib/music.ts](file:///home/krazyeom/dev/christmasTree/lib/music.ts))
* 기존에는 셀렉트 박스에서 곡을 변경해도 재생 루프 타이머가 이전 곡의 예약 큐를 유지하고 있어, 일시정지 후 재생 버튼을 다시 눌러야만 곡이 바뀌는 문제가 있었습니다.
* `changeSong(newSong: number)` 메서드를 신설하여, 오디오 컨텍스트가 `running` 상태일 때 기존 타이머를 즉시 해제하고 `next` 타임스탬프를 `currentTime + 0.05s`로 즉각 리셋하여 새 곡의 첫 음이 지체 없이 연주되도록 개선했습니다.

### B. 곡 자동 연속 재생 파이프라인 (Auto Next Song Play)
* `schedule()` 내부에서 현재 곡의 모든 음표(`song.notes.length`) 연주가 완료되었을 때:
  1. 0.8초간의 은은한 여운 간격(`this.next += 0.8 / musicSpeed`)을 부여합니다.
  2. 다음 곡 인덱스로 자동 순환 전환(`(song + 1) % songs.length`)합니다.
  3. `onSongChange` 콜백을 호출하여 UI의 드롭다운 선택 상태(`song`)도 동기화되어 화면에 현재 연주 중인 곡명이 실시간으로 표시됩니다.

### C. UI 정리 ([app/page.tsx](file:///home/krazyeom/dev/christmasTree/app/page.tsx))
* 인사말 편집 폼 하단에 노출되던 불필요한 설정 안내 문구(`기본 문구는 lib/config.ts에서 바꿀 수 있습니다.`)를 완전히 제거하여 화면을 정돈했습니다.
