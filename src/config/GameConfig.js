export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

// 오브젝트 이동 속도
export const OBJECT_SPEED = 350;

// HP 설정
export const MAX_HP = 12;
export const HP_DRAIN_INTERVAL = 2000; // ms

// 도어 위치 (원작 기준)
export const LEFT_DOOR_X = 180;
export const RIGHT_DOOR_X = 370;
export const DOOR_Y = 360;

// 상어 위치
export const SHARK_X = 540;
export const SHARK_Y = 360;

// 스폰 위치
export const SPAWN_X = 1300;
export const SPAWN_Y = 360;

// 난이도 테이블
export const DIFFICULTY = [
  { score: 0,     interval: 1000, pool: ['fish01', 'ruby', 'trash01'] },
  { score: 1001,  interval: 800,  pool: ['fish01', 'ruby', 'trash01'] },
  { score: 3501,  interval: 800,  pool: ['fish01', 'ruby', 'trash01', 'trash02'] },
  { score: 6001,  interval: 600,  pool: ['fish01', 'ruby', 'trash01', 'trash02'] },
  { score: 10001, interval: 600,  pool: ['fish01', 'fish02', 'ruby', 'trash01', 'trash02'] },
  { score: 15001, interval: 600,  pool: ['fish01', 'fish02', 'ruby', 'trash01', 'trash02', 'trash03'] },
  { score: 20001, interval: 600,  pool: ['fish01', 'fish02', 'fish03', 'ruby', 'trash01', 'trash02', 'trash03'] },
];

// 점수 테이블
export const SCORE = {
  SHARK_EAT_FISH:   100,
  SHARK_EAT_RUBY:  -150,
  SHARK_EAT_TRASH: -150,
  BOX_MISS_FISH:   -100,
  BOX_CATCH_RUBY:    70,
  BOX2_CATCH_TRASH:  70,
};

// HP 변화 테이블
export const HP_CHANGE = {
  SHARK_EAT_FISH_EVERY2: 1,  // 물고기 2마리마다 +1
  SHARK_EAT_RUBY:        -1,
  SHARK_EAT_TRASH:       -1,
  BOX_MISS_FISH:         -1,
};

// 상어 레벨업 EXP 요구량 [exp1, exp2, exp3, exp4]
export const LEVEL_EXP_REQ = {
  0:  [30,  30,  0,   0],
  2:  [50,  50,  0,   0],
  3:  [100, 100, 0,   0],
  4:  [150, 150, 0,   0],
  5:  [200, 200, 100, 0],
  6:  [250, 250, 150, 0],
  7:  [300, 300, 200, 0],
  8:  [350, 350, 250, 0],
  9:  [400, 400, 300, 100],
};

// 레벨 순서
export const LEVEL_SEQUENCE = [0, 2, 3, 4, 5, 6, 7, 8, 9, 10];
