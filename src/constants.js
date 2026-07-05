// Logical canvas size (portrait phone)
export const W = 390;
export const H = 700;

// Field geometry — overhead diamond
export const FX = 195;   // field center x
export const FY = 312;   // field center y

export const HOME   = { x: 195, y: 455 };
export const FIRST  = { x: 325, y: 325 };
export const SECOND = { x: 195, y: 195 };
export const THIRD  = { x: 65,  y: 325 };
export const MOUND  = { x: 195, y: 325 };

export const FENCE_R = 168;

// Layout zones
export const HUD_H  = 70;   // scoreboard height
export const CTRL_Y = 558;  // controls start y

// Fielder home positions (CPU team defending)
export const FIELDER_HOMES = [
  { x: 195, y: 340, role: 'P'  },  // pitcher
  { x: 340, y: 318, role: '1B' },  // first baseman
  { x: 268, y: 248, role: '2B' },  // second baseman
  { x: 122, y: 248, role: 'SS' },  // shortstop
  { x: 55,  y: 318, role: '3B' },  // third baseman
  { x: 88,  y: 195, role: 'LF' },  // left fielder
  { x: 195, y: 150, role: 'CF' },  // center fielder
  { x: 302, y: 195, role: 'RF' },  // right fielder
];

// Game rules
export const INNINGS          = 3;
export const OUTS_PER_INNING  = 3;
export const STRIKES_PER_OUT  = 3;
export const BALLS_PER_WALK   = 4;

// States
export const S = {
  MENU:         'menu',
  PRE_PITCH:    'pre_pitch',
  PITCHING:     'pitching',
  HIT_ANIM:     'hit_anim',
  PLAY_RESULT:  'play_result',
  INNING_END:   'inning_end',
  GAME_OVER:    'game_over',
};

// Pitch definitions
export const PITCHES = [
  { id: 'fast',   label: 'FAST',     speed: 235, curve: 0,  color: '#e63946' },
  { id: 'curve',  label: 'CURVE',    speed: 165, curve: 50, color: '#4cc9f0' },
  { id: 'change', label: 'CHANGE-UP',speed: 120, curve: 18, color: '#f4a261' },
];

// Skin tones used for characters
export const SKINS = ['#FDDCB4', '#D4956A', '#F0C27D', '#8D5524', '#C68642'];
