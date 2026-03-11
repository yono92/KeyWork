// 32x32 도트 아바타 파츠 데이터
// 각 파츠는 [x, y, paletteIndex][] 형태의 픽셀 좌표 배열
// paletteIndex 0 = 투명, 1 = 외곽선, 2-4 = 피부색(skin 파라미터), 5-7 = 헤어색(hairColor 파라미터)

import type { AvatarConfig } from "@/lib/supabase/types";

// ── 기본 아바타 설정 ──
export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  skin: 0,
  hair: 0,
  hairColor: 0,
  eyes: 0,
  mouth: 0,
  hat: -1,
  accessory: -1,
};

// ── 16색 레트로 팔레트 ──
// 인덱스 2-4, 5-7은 skin/hairColor 세트에 따라 동적 교체
export const BASE_PALETTE = [
  "transparent",  // 0
  "#1a1a2e",      // 1 — 외곽선
  "#f5d6b8",      // 2 — 피부 밝은 (동적)
  "#d4a574",      // 3 — 피부 중간 (동적)
  "#b07848",      // 4 — 피부 어둠 (동적)
  "#3d2817",      // 5 — 헤어 밝은 (동적)
  "#2a1b0f",      // 6 — 헤어 중간 (동적)
  "#1a1008",      // 7 — 헤어 어둠 (동적)
  "#ffffff",      // 8 — 하이라이트/눈 흰자
  "#1e1e1e",      // 9 — 눈동자/진한 검정
  "#ef4444",      // 10 — 빨강
  "#22c55e",      // 11 — 초록
  "#3b82f6",      // 12 — 파랑
  "#ffe000",      // 13 — 노랑
  "#00e5ff",      // 14 — 시안
  "#888899",      // 15 — 회색
];

// ── 피부색 세트 (6종) ──
// [밝은, 중간, 어둠]
export const SKIN_COLORS: [string, string, string][] = [
  ["#f5d6b8", "#d4a574", "#b07848"], // 0: 밝은
  ["#ffe0c0", "#e8c8a0", "#c8a878"], // 1: 복숭아
  ["#f0c090", "#d0a070", "#b08050"], // 2: 중간
  ["#c89060", "#a87040", "#885830"], // 3: 탄
  ["#906030", "#704820", "#503418"], // 4: 갈색
  ["#604020", "#483018", "#302010"], // 5: 진한
];

// ── 헤어 컬러 세트 (8종) ──
// [밝은, 중간, 어둠]
export const HAIR_COLORS: [string, string, string][] = [
  ["#3d2817", "#2a1b0f", "#1a1008"], // 0: 갈색
  ["#1a1a1e", "#111114", "#08080a"], // 1: 검정
  ["#d4a030", "#b08020", "#886018"], // 2: 금발
  ["#c04020", "#982818", "#701810"], // 3: 빨강
  ["#f0f0f0", "#c8c8c8", "#989898"], // 4: 은발
  ["#e87830", "#c06020", "#984810"], // 5: 주황
  ["#6040a0", "#483080", "#302060"], // 6: 보라
  ["#2080c0", "#1860a0", "#104878"], // 7: 파랑
];

// ── 파츠 타입 ──
export type Pixel = [number, number, number]; // [x, y, paletteIndex]

export interface PartDef {
  id: number;
  label: string;
  pixels: Pixel[];
}

// ── 얼굴 베이스 (피부) ──
// 얼굴 + 목 + 어깨 윤곽
const faceBase: Pixel[] = (() => {
  const px: Pixel[] = [];
  // 얼굴 외곽 (둥근 직사각형 형태, y:6~18, x:10~21)
  // 윗 외곽
  for (let x = 12; x <= 19; x++) px.push([x, 6, 1]);
  px.push([11, 7, 1]); px.push([20, 7, 1]);
  px.push([10, 8, 1]); px.push([21, 8, 1]);
  // 양쪽 외곽 (y:9~16)
  for (let y = 9; y <= 16; y++) { px.push([10, y, 1]); px.push([21, y, 1]); }
  // 아래 외곽 (턱)
  px.push([10, 17, 1]); px.push([21, 17, 1]);
  px.push([11, 18, 1]); px.push([20, 18, 1]);
  for (let x = 12; x <= 19; x++) px.push([x, 19, 1]);
  // 피부 채우기
  for (let x = 12; x <= 19; x++) px.push([x, 7, 2]);
  for (let x = 11; x <= 20; x++) px.push([x, 8, 2]);
  for (let y = 9; y <= 16; y++) for (let x = 11; x <= 20; x++) px.push([x, y, 2]);
  for (let x = 11; x <= 20; x++) px.push([x, 17, 2]);
  for (let x = 12; x <= 19; x++) px.push([x, 18, 2]);
  // 귀
  px.push([9, 11, 1]); px.push([9, 12, 1]); px.push([9, 13, 1]);
  px.push([22, 11, 1]); px.push([22, 12, 1]); px.push([22, 13, 1]);
  px.push([9, 12, 3]); // 귀 안쪽
  px.push([22, 12, 3]);
  // 목
  for (let x = 14; x <= 17; x++) { px.push([x, 20, 1]); px.push([x, 21, 3]); }
  px.push([13, 20, 1]); px.push([18, 20, 1]);
  // 어깨/몸통 상단
  for (let x = 8; x <= 23; x++) px.push([x, 24, 1]);
  for (let x = 7; x <= 24; x++) px.push([x, 25, 15]);
  for (let x = 7; x <= 24; x++) px.push([x, 26, 15]);
  for (let x = 7; x <= 24; x++) px.push([x, 27, 15]);
  for (let x = 8; x <= 23; x++) px.push([x, 28, 15]);
  // 어깨~몸통 연결
  for (let x = 9; x <= 22; x++) px.push([x, 22, 1]);
  for (let x = 9; x <= 22; x++) px.push([x, 23, 15]);
  px.push([8, 23, 1]); px.push([23, 23, 1]);
  return px;
})();

export const SKIN_PARTS: PartDef[] = [
  { id: 0, label: "Default", pixels: faceBase },
];

// ── 눈 스타일 (8종) ──
export const EYE_PARTS: PartDef[] = [
  { id: 0, label: "Normal", pixels: [
    // 왼쪽 눈 (흰자+동자)
    [12, 11, 8], [13, 11, 8], [14, 11, 8],
    [12, 12, 8], [13, 12, 9], [14, 12, 9],
    [12, 13, 1], [13, 13, 1], [14, 13, 1],
    // 오른쪽 눈
    [17, 11, 8], [18, 11, 8], [19, 11, 8],
    [17, 12, 9], [18, 12, 9], [19, 12, 8],
    [17, 13, 1], [18, 13, 1], [19, 13, 1],
  ]},
  { id: 1, label: "Round", pixels: [
    [12, 11, 1], [13, 11, 1], [14, 11, 1],
    [12, 12, 8], [13, 12, 9], [14, 12, 8],
    [12, 13, 1], [13, 13, 1], [14, 13, 1],
    [17, 11, 1], [18, 11, 1], [19, 11, 1],
    [17, 12, 8], [18, 12, 9], [19, 12, 8],
    [17, 13, 1], [18, 13, 1], [19, 13, 1],
  ]},
  { id: 2, label: "Angry", pixels: [
    [12, 10, 1], [14, 11, 1],
    [12, 11, 8], [13, 11, 8], [14, 11, 8],
    [12, 12, 8], [13, 12, 9], [14, 12, 9],
    [12, 13, 1], [13, 13, 1], [14, 13, 1],
    [17, 11, 8], [18, 11, 8], [19, 11, 8],
    [19, 10, 1], [17, 11, 1],
    [17, 12, 9], [18, 12, 9], [19, 12, 8],
    [17, 13, 1], [18, 13, 1], [19, 13, 1],
  ]},
  { id: 3, label: "Happy", pixels: [
    [12, 11, 1], [13, 11, 1], [14, 11, 1],
    [12, 12, 8], [13, 12, 9], [14, 12, 8],
    [13, 13, 1],
    [17, 11, 1], [18, 11, 1], [19, 11, 1],
    [17, 12, 8], [18, 12, 9], [19, 12, 8],
    [18, 13, 1],
  ]},
  { id: 4, label: "Sleepy", pixels: [
    [12, 12, 1], [13, 12, 1], [14, 12, 1],
    [12, 13, 8], [13, 13, 9], [14, 13, 8],
    [17, 12, 1], [18, 12, 1], [19, 12, 1],
    [17, 13, 8], [18, 13, 9], [19, 13, 8],
  ]},
  { id: 5, label: "Dot", pixels: [
    [13, 12, 9], [18, 12, 9],
  ]},
  { id: 6, label: "Star", pixels: [
    [12, 11, 13], [13, 12, 13], [14, 11, 13],
    [13, 11, 13], [13, 13, 13],
    [17, 11, 13], [18, 12, 13], [19, 11, 13],
    [18, 11, 13], [18, 13, 13],
  ]},
  { id: 7, label: "X Eyes", pixels: [
    [12, 11, 9], [14, 11, 9],
    [13, 12, 9],
    [12, 13, 9], [14, 13, 9],
    [17, 11, 9], [19, 11, 9],
    [18, 12, 9],
    [17, 13, 9], [19, 13, 9],
  ]},
];

// ── 입 스타일 (6종) ──
export const MOUTH_PARTS: PartDef[] = [
  { id: 0, label: "Smile", pixels: [
    [14, 16, 1], [15, 17, 1], [16, 17, 1], [17, 16, 1],
  ]},
  { id: 1, label: "Flat", pixels: [
    [14, 16, 1], [15, 16, 1], [16, 16, 1], [17, 16, 1],
  ]},
  { id: 2, label: "Open", pixels: [
    [14, 15, 1], [15, 15, 1], [16, 15, 1], [17, 15, 1],
    [14, 16, 10], [15, 16, 10], [16, 16, 10], [17, 16, 10],
    [14, 17, 1], [15, 17, 1], [16, 17, 1], [17, 17, 1],
  ]},
  { id: 3, label: "Grin", pixels: [
    [13, 16, 1], [14, 16, 8], [15, 16, 8], [16, 16, 8], [17, 16, 8], [18, 16, 1],
    [14, 17, 1], [15, 17, 1], [16, 17, 1], [17, 17, 1],
  ]},
  { id: 4, label: "Cat", pixels: [
    [13, 15, 1], [14, 16, 1], [15, 17, 1], [16, 17, 1], [17, 16, 1], [18, 15, 1],
  ]},
  { id: 5, label: "O", pixels: [
    [15, 15, 1], [16, 15, 1],
    [14, 16, 1], [17, 16, 1],
    [15, 17, 1], [16, 17, 1],
  ]},
];

// ── 헤어 스타일 (10종) ──
export const HAIR_PARTS: PartDef[] = [
  { id: 0, label: "Short", pixels: (() => {
    const px: Pixel[] = [];
    for (let x = 11; x <= 20; x++) { px.push([x, 4, 6]); px.push([x, 5, 5]); }
    for (let x = 10; x <= 21; x++) { px.push([x, 6, 5]); px.push([x, 7, 6]); }
    for (let x = 10; x <= 11; x++) { px.push([x, 8, 6]); px.push([x, 9, 7]); }
    for (let x = 20; x <= 21; x++) { px.push([x, 8, 6]); px.push([x, 9, 7]); }
    // 외곽
    for (let x = 11; x <= 20; x++) px.push([x, 3, 1]);
    px.push([10, 4, 1]); px.push([21, 4, 1]);
    px.push([9, 5, 1]); px.push([22, 5, 1]);
    px.push([9, 6, 1]); px.push([22, 6, 1]);
    return px;
  })()},
  { id: 1, label: "Long", pixels: (() => {
    const px: Pixel[] = [];
    for (let x = 11; x <= 20; x++) { px.push([x, 4, 6]); px.push([x, 5, 5]); }
    for (let x = 10; x <= 21; x++) { px.push([x, 6, 5]); px.push([x, 7, 6]); }
    // 좌우 긴 머리
    for (let y = 8; y <= 20; y++) { px.push([9, y, 6]); px.push([10, y, 5]); }
    for (let y = 8; y <= 20; y++) { px.push([21, y, 5]); px.push([22, y, 6]); }
    for (let x = 11; x <= 20; x++) px.push([x, 3, 1]);
    px.push([10, 4, 1]); px.push([21, 4, 1]);
    px.push([8, 5, 1]); px.push([23, 5, 1]);
    for (let y = 6; y <= 20; y++) { px.push([8, y, 1]); px.push([23, y, 1]); }
    return px;
  })()},
  { id: 2, label: "Spiky", pixels: (() => {
    const px: Pixel[] = [];
    for (let x = 10; x <= 21; x++) { px.push([x, 5, 5]); px.push([x, 6, 6]); px.push([x, 7, 6]); }
    // 스파이크
    px.push([11, 2, 5]); px.push([12, 3, 5]); px.push([12, 4, 6]);
    px.push([15, 1, 5]); px.push([15, 2, 6]); px.push([15, 3, 5]); px.push([15, 4, 6]);
    px.push([16, 1, 5]); px.push([16, 2, 6]); px.push([16, 3, 5]); px.push([16, 4, 6]);
    px.push([19, 2, 5]); px.push([19, 3, 5]); px.push([19, 4, 6]);
    px.push([20, 3, 5]); px.push([20, 4, 6]);
    // 외곽
    px.push([10, 1, 1]); px.push([11, 1, 1]);
    px.push([14, 0, 1]); px.push([17, 0, 1]);
    px.push([18, 1, 1]); px.push([20, 2, 1]); px.push([21, 2, 1]);
    px.push([9, 4, 1]); px.push([22, 4, 1]);
    return px;
  })()},
  { id: 3, label: "Buzz", pixels: (() => {
    const px: Pixel[] = [];
    for (let x = 11; x <= 20; x++) px.push([x, 5, 7]);
    for (let x = 10; x <= 21; x++) px.push([x, 6, 6]);
    for (let x = 10; x <= 21; x++) px.push([x, 7, 7]);
    for (let x = 11; x <= 20; x++) px.push([x, 4, 1]);
    px.push([10, 5, 1]); px.push([21, 5, 1]);
    px.push([9, 6, 1]); px.push([22, 6, 1]);
    return px;
  })()},
  { id: 4, label: "Ponytail", pixels: (() => {
    const px: Pixel[] = [];
    for (let x = 11; x <= 20; x++) { px.push([x, 4, 6]); px.push([x, 5, 5]); }
    for (let x = 10; x <= 21; x++) { px.push([x, 6, 5]); px.push([x, 7, 6]); }
    for (let y = 8; y <= 10; y++) { px.push([10, y, 6]); px.push([21, y, 6]); }
    // 포니테일 (오른쪽)
    for (let y = 6; y <= 18; y++) { px.push([23, y, 5]); px.push([24, y, 6]); }
    px.push([22, 6, 5]); px.push([22, 7, 5]);
    px.push([25, 6, 1]);
    for (let y = 7; y <= 18; y++) px.push([25, y, 1]);
    for (let x = 11; x <= 20; x++) px.push([x, 3, 1]);
    px.push([10, 4, 1]); px.push([21, 4, 1]);
    px.push([9, 5, 1]); px.push([22, 5, 1]);
    return px;
  })()},
  { id: 5, label: "Mohawk", pixels: (() => {
    const px: Pixel[] = [];
    // 모호크 중앙 줄기
    for (let y = 0; y <= 7; y++) { px.push([15, y, 5]); px.push([16, y, 5]); }
    for (let y = 0; y <= 5; y++) { px.push([14, y, 6]); px.push([17, y, 6]); }
    for (let x = 10; x <= 21; x++) { px.push([x, 6, 6]); px.push([x, 7, 7]); }
    // 외곽
    px.push([13, 0, 1]); px.push([18, 0, 1]);
    px.push([9, 6, 1]); px.push([22, 6, 1]);
    return px;
  })()},
  { id: 6, label: "Curly", pixels: (() => {
    const px: Pixel[] = [];
    for (let x = 10; x <= 21; x++) { px.push([x, 4, 5]); px.push([x, 5, 6]); }
    for (let x = 9; x <= 22; x++) { px.push([x, 6, 5]); px.push([x, 7, 6]); }
    // 컬 (양쪽 볼록)
    for (let y = 8; y <= 14; y++) {
      px.push([8, y, 5]); px.push([9, y, 6]);
      px.push([22, y, 6]); px.push([23, y, 5]);
    }
    // 외곽
    for (let x = 10; x <= 21; x++) px.push([x, 3, 1]);
    px.push([9, 4, 1]); px.push([22, 4, 1]);
    px.push([8, 5, 1]); px.push([23, 5, 1]);
    for (let y = 6; y <= 14; y++) { px.push([7, y, 1]); px.push([24, y, 1]); }
    return px;
  })()},
  { id: 7, label: "Side Part", pixels: (() => {
    const px: Pixel[] = [];
    for (let x = 10; x <= 21; x++) { px.push([x, 4, 6]); px.push([x, 5, 5]); }
    for (let x = 10; x <= 21; x++) { px.push([x, 6, 5]); px.push([x, 7, 6]); }
    // 왼쪽으로 쓸어넘긴 앞머리
    for (let x = 8; x <= 13; x++) { px.push([x, 7, 5]); px.push([x, 8, 6]); }
    px.push([7, 8, 5]); px.push([7, 9, 6]);
    // 외곽
    for (let x = 10; x <= 21; x++) px.push([x, 3, 1]);
    px.push([9, 4, 1]); px.push([22, 4, 1]);
    px.push([8, 5, 1]); px.push([22, 5, 1]);
    px.push([7, 6, 1]); px.push([6, 7, 1]); px.push([6, 8, 1]); px.push([6, 9, 1]);
    return px;
  })()},
  { id: 8, label: "Bald", pixels: (() => {
    const px: Pixel[] = [];
    // 빛나는 대머리 하이라이트
    px.push([14, 6, 8]); px.push([15, 6, 8]);
    return px;
  })()},
  { id: 9, label: "Afro", pixels: (() => {
    const px: Pixel[] = [];
    for (let x = 9; x <= 22; x++) { px.push([x, 2, 5]); px.push([x, 3, 6]); }
    for (let x = 8; x <= 23; x++) {
      px.push([x, 4, 5]); px.push([x, 5, 6]);
      px.push([x, 6, 5]); px.push([x, 7, 6]);
    }
    for (let y = 8; y <= 12; y++) {
      px.push([7, y, 5]); px.push([8, y, 6]);
      px.push([23, y, 6]); px.push([24, y, 5]);
    }
    // 외곽
    for (let x = 9; x <= 22; x++) px.push([x, 1, 1]);
    px.push([8, 2, 1]); px.push([23, 2, 1]);
    px.push([7, 3, 1]); px.push([24, 3, 1]);
    for (let y = 4; y <= 12; y++) { px.push([6, y, 1]); px.push([25, y, 1]); }
    return px;
  })()},
];

// ── 모자 (8종 + 없음) ──
export const HAT_PARTS: PartDef[] = [
  { id: 0, label: "Cap", pixels: (() => {
    const px: Pixel[] = [];
    for (let x = 10; x <= 21; x++) { px.push([x, 2, 12]); px.push([x, 3, 12]); }
    for (let x = 9; x <= 22; x++) px.push([x, 4, 12]);
    // 챙
    for (let x = 7; x <= 22; x++) px.push([x, 5, 1]);
    // 외곽
    for (let x = 10; x <= 21; x++) px.push([x, 1, 1]);
    px.push([9, 2, 1]); px.push([22, 2, 1]);
    return px;
  })()},
  { id: 1, label: "Beanie", pixels: (() => {
    const px: Pixel[] = [];
    px.push([15, 0, 10]); px.push([16, 0, 10]); // 꼭지
    for (let x = 11; x <= 20; x++) { px.push([x, 1, 10]); px.push([x, 2, 10]); }
    for (let x = 10; x <= 21; x++) { px.push([x, 3, 10]); px.push([x, 4, 8]); }
    for (let x = 10; x <= 21; x++) px.push([x, 5, 10]);
    px.push([10, 1, 1]); px.push([21, 1, 1]);
    px.push([9, 2, 1]); px.push([22, 2, 1]);
    px.push([9, 3, 1]); px.push([22, 3, 1]);
    return px;
  })()},
  { id: 2, label: "Top Hat", pixels: (() => {
    const px: Pixel[] = [];
    for (let y = -2; y <= 4; y++) for (let x = 12; x <= 19; x++) px.push([x, y + 2, 9]);
    for (let x = 8; x <= 23; x++) px.push([x, 5, 9]);
    // 리본
    for (let x = 12; x <= 19; x++) px.push([x, 4, 10]);
    return px;
  })()},
  { id: 3, label: "Crown", pixels: (() => {
    const px: Pixel[] = [];
    for (let x = 10; x <= 21; x++) px.push([x, 4, 13]);
    for (let x = 10; x <= 21; x++) px.push([x, 3, 13]);
    // 뾰족
    px.push([10, 1, 13]); px.push([10, 2, 13]);
    px.push([15, 0, 13]); px.push([15, 1, 13]); px.push([15, 2, 13]); px.push([16, 0, 13]); px.push([16, 1, 13]); px.push([16, 2, 13]);
    px.push([21, 1, 13]); px.push([21, 2, 13]);
    // 보석
    px.push([13, 4, 10]); px.push([16, 3, 12]); px.push([19, 4, 11]);
    // 외곽
    px.push([9, 1, 1]); px.push([9, 3, 1]); px.push([14, 0, 1]); px.push([17, 0, 1]);
    px.push([22, 1, 1]); px.push([22, 3, 1]);
    for (let x = 10; x <= 21; x++) px.push([x, 5, 1]);
    return px;
  })()},
  { id: 4, label: "Headband", pixels: (() => {
    const px: Pixel[] = [];
    for (let x = 9; x <= 22; x++) px.push([x, 6, 10]);
    for (let x = 9; x <= 22; x++) px.push([x, 7, 10]);
    return px;
  })()},
  { id: 5, label: "Bow", pixels: (() => {
    const px: Pixel[] = [];
    // 리본 (왼쪽 위)
    px.push([8, 4, 10]); px.push([9, 4, 10]); px.push([10, 5, 10]);
    px.push([8, 5, 10]); px.push([9, 5, 10]); px.push([10, 4, 10]);
    px.push([11, 5, 10]); px.push([11, 6, 10]);
    px.push([7, 4, 1]); px.push([7, 5, 1]);
    return px;
  })()},
  { id: 6, label: "Halo", pixels: (() => {
    const px: Pixel[] = [];
    for (let x = 10; x <= 21; x++) px.push([x, 1, 13]);
    for (let x = 10; x <= 21; x++) px.push([x, 3, 13]);
    px.push([9, 2, 13]); px.push([22, 2, 13]);
    return px;
  })()},
  { id: 7, label: "Horns", pixels: (() => {
    const px: Pixel[] = [];
    px.push([9, 4, 10]); px.push([10, 3, 10]); px.push([10, 2, 10]); px.push([11, 1, 10]);
    px.push([22, 4, 10]); px.push([21, 3, 10]); px.push([21, 2, 10]); px.push([20, 1, 10]);
    px.push([8, 4, 1]); px.push([9, 3, 1]); px.push([9, 2, 1]); px.push([10, 1, 1]);
    px.push([23, 4, 1]); px.push([22, 3, 1]); px.push([22, 2, 1]); px.push([21, 1, 1]);
    return px;
  })()},
];

// ── 악세서리 (6종 + 없음) ──
export const ACCESSORY_PARTS: PartDef[] = [
  { id: 0, label: "Glasses", pixels: (() => {
    const px: Pixel[] = [];
    // 왼쪽 렌즈
    for (let x = 11; x <= 15; x++) { px.push([x, 10, 1]); px.push([x, 14, 1]); }
    px.push([11, 11, 1]); px.push([11, 12, 1]); px.push([11, 13, 1]);
    px.push([15, 11, 1]); px.push([15, 12, 1]); px.push([15, 13, 1]);
    // 오른쪽 렌즈
    for (let x = 16; x <= 20; x++) { px.push([x, 10, 1]); px.push([x, 14, 1]); }
    px.push([16, 11, 1]); px.push([16, 12, 1]); px.push([16, 13, 1]);
    px.push([20, 11, 1]); px.push([20, 12, 1]); px.push([20, 13, 1]);
    // 다리
    px.push([10, 11, 1]); px.push([9, 11, 1]);
    px.push([21, 11, 1]); px.push([22, 11, 1]);
    return px;
  })()},
  { id: 1, label: "Sunglasses", pixels: (() => {
    const px: Pixel[] = [];
    for (let x = 11; x <= 15; x++) for (let y = 10; y <= 13; y++) px.push([x, y, 9]);
    for (let x = 16; x <= 20; x++) for (let y = 10; y <= 13; y++) px.push([x, y, 9]);
    px.push([15, 11, 1]); px.push([16, 11, 1]); // 브릿지
    px.push([10, 11, 1]); px.push([9, 11, 1]); px.push([21, 11, 1]); px.push([22, 11, 1]);
    // 하이라이트
    px.push([12, 11, 8]); px.push([17, 11, 8]);
    return px;
  })()},
  { id: 2, label: "Blush", pixels: [
    [11, 14, 10], [11, 15, 10],
    [20, 14, 10], [20, 15, 10],
  ]},
  { id: 3, label: "Band-Aid", pixels: [
    [18, 9, 13], [19, 10, 13], [20, 9, 13],
    [19, 9, 13], [19, 11, 13],
  ]},
  { id: 4, label: "Scar", pixels: [
    [19, 10, 4], [20, 11, 4], [19, 12, 4], [20, 13, 4],
  ]},
  { id: 5, label: "Mask", pixels: (() => {
    const px: Pixel[] = [];
    for (let x = 11; x <= 20; x++) { px.push([x, 15, 8]); px.push([x, 16, 8]); px.push([x, 17, 8]); px.push([x, 18, 8]); }
    px.push([10, 14, 1]); px.push([21, 14, 1]);
    for (let x = 11; x <= 20; x++) px.push([x, 14, 1]);
    px.push([10, 15, 1]); px.push([10, 16, 1]); px.push([21, 15, 1]); px.push([21, 16, 1]);
    // 끈
    px.push([9, 13, 8]); px.push([22, 13, 8]);
    return px;
  })()},
];

// ── 카테고리 이름 (i18n) ──
export const CATEGORY_LABELS = {
  skin: { ko: "피부", en: "Skin" },
  hair: { ko: "헤어", en: "Hair" },
  hairColor: { ko: "머리색", en: "Hair Color" },
  eyes: { ko: "눈", en: "Eyes" },
  mouth: { ko: "입", en: "Mouth" },
  hat: { ko: "모자", en: "Hat" },
  accessory: { ko: "악세서리", en: "Acc." },
} as const;
