export const treeStyles = [
  { id: 'classic', name: '클래식', icon: '*', label: 'classic.ts', description: '문자와 전구로 가득한 크리스마스 트리' },
  { id: 'ribbon', name: '리본', icon: '~', label: 'helix.ts', description: '빛나는 두 줄의 나선형 리본 트리' },
  { id: 'pixel', name: '8-bit', icon: '#', label: 'pixel.ts', description: '레트로 게임 속 계단 모양 픽셀 트리' },
  { id: 'stars', name: '별자리', icon: '+', label: 'stars.ts', description: '별과 궤도로 연결된 우주 속 트리' },
  { id: 'matrix', name: '매트릭스', icon: '01', label: 'matrix.ts', description: '이진수 스트림이 흐르는 초록빛 트리' },
  { id: 'circuit', name: '회로', icon: '{}', label: 'circuit.ts', description: '노드와 회로를 따라 빛이 이동하는 트리' },
] as const;
export type TreeStyle = typeof treeStyles[number]['id'];
