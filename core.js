const { useState, useEffect, useCallback, useRef, useMemo } = React;

const SAVE_KEY = "manabi_save";
const RUNTIME_ASSETS = new Map();
function deepClone(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}
function arrayLast(arr) {
  return arr && arr.length ? arr[arr.length - 1] : undefined;
}
function findLastCompat(arr, predicate) {
  if (!Array.isArray(arr)) return undefined;
  for (let i = arr.length - 1; i >= 0; i--) {
    const v = arr[i];
    if (predicate(v, i, arr)) return v;
  }
  return undefined;
}

const DEFAULT_GAME_DATA = {
  encounter: { min: 12, variance: 14 },
};
let GAME_DATA = typeof structuredClone === "function"
  ? structuredClone(DEFAULT_GAME_DATA)
  : JSON.parse(JSON.stringify(DEFAULT_GAME_DATA));

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const MAP_SIZE = 50;
const VIEW_SIZE = 9;
const INT_COLS = 12;
const INT_ROWS = 12;

const TILE = {
  GRASS: "grass", TOWN: "town", SCHOOL: "school", CAVE: "cave", HOME: "home",
  FOREST: "forest", WATER: "water", MOUNTAIN: "mountain", SEA: "sea",
  LAKE: "lake", BRIDGE: "bridge", DESERT: "desert",
};

const INT = {
  FLOOR: "floor", WALL: "wall", EXIT: "exit", NPC: "npc",
  SHELF: "shelf", DESK: "desk", BOARD: "board", COUNTER: "counter", FOUNTAIN: "fountain", CHEST: "chest",
  STAIRS_DOWN: "stairs_down", STAIRS_UP: "stairs_up",
};

const TILE_STYLE = {
  [TILE.GRASS]:    "linear-gradient(135deg,#2f9e44,#2b8a3e)",
  [TILE.FOREST]:   "linear-gradient(135deg,#1b5e20,#2e7d32)",
  [TILE.WATER]:    "linear-gradient(135deg,#1971c2,#1c7ed6)",
  [TILE.SEA]:      "linear-gradient(135deg,#0b3d91,#1565c0)",
  [TILE.LAKE]:     "linear-gradient(135deg,#4dabf7,#74c0fc)",
  [TILE.MOUNTAIN]: "linear-gradient(135deg,#6c757d,#495057)",
  [TILE.BRIDGE]:   "linear-gradient(135deg,#8d6e63,#6d4c41)",
  [TILE.DESERT]:   "linear-gradient(135deg,#e9c46a,#ddb451)",
  [TILE.TOWN]:     "linear-gradient(135deg,#ffadad,#ff8fa3)",
  [TILE.SCHOOL]:   "linear-gradient(135deg,#ffe066,#ffd43b)",
  [TILE.HOME]:     "linear-gradient(135deg,#ffd8a8,#ffc078)",
  [TILE.CAVE]:     "linear-gradient(135deg,#868e96,#495057)",
};


const INT_STYLE = {
  [INT.FLOOR]:    "#b8b5ad", [INT.WALL]:     "#4b3a2a",
  [INT.EXIT]:     "#22c55e", [INT.NPC]:      "#b8b5ad",
  [INT.SHELF]:    "#7a4f2a", [INT.DESK]:     "#9a6b3f",
  [INT.BOARD]:    "#2f5d36", [INT.COUNTER]:  "#6f5440",
  [INT.FOUNTAIN]: "#3b82f6", [INT.CHEST]:    "#8b5a2b",
  [INT.STAIRS_DOWN]: "#6b7280", [INT.STAIRS_UP]: "#94a3b8",
};

// 洞窟専用タイルスタイル（暗い岩・土・地下水）
const CAVE_INT_STYLE = {
  [INT.FLOOR]:    "#2a1a0a",
  [INT.WALL]:     "#0d0804",
  [INT.EXIT]:     "#22c55e",
  [INT.NPC]:      "#2a1a0a",
  [INT.SHELF]:    "#3d2015",
  [INT.BOARD]:    "#1a0d05",
  [INT.FOUNTAIN]: "#0a1a2a",
  [INT.CHEST]:    "#513218",
  [INT.STAIRS_DOWN]: "#4b5563",
  [INT.STAIRS_UP]: "#64748b",
};

const SPECIAL_POS = {
  village:      { x: 23, y: 25 },   // dist= 2 Zone A（はじまりの村）
  town:         { x: 19, y: 19 },   // dist=12 初心者ゾーン終盤
  castle:       { x: 22, y: 16 },   // dist= ? 王城（重要拠点）
  school:       { x: 35, y: 14 },   // dist=21 中堅ゾーン
  home:         { x: 38, y: 38 },   // dist=26 上級ゾーン（回復地点）
  cave:         { x: 42, y: 42 },   // dist=34 最終ゾーン（ボス）
  manabiVillage:{ x:  2, y:  2 },   // dist=46 世界の端（まなびの村）
  nazoVillage:  { x:  5, y: 45 },   // dist=40 謎の村（仙人マンたちの村）
  catVillage:   { x: 46, y:  6 },   // dist=40 猫の村
};

const WORLD_MARKERS = {
  [`${SPECIAL_POS.village.y},${SPECIAL_POS.village.x}`]: "village",
  [`${SPECIAL_POS.town.y},${SPECIAL_POS.town.x}`]: "castleTown",
  [`${SPECIAL_POS.castle.y},${SPECIAL_POS.castle.x}`]: "castleTown",
  [`${SPECIAL_POS.school.y},${SPECIAL_POS.school.x}`]: "school",
  [`${SPECIAL_POS.home.y},${SPECIAL_POS.home.x}`]: "home",
  [`${SPECIAL_POS.cave.y},${SPECIAL_POS.cave.x}`]: "cave",
  [`${SPECIAL_POS.manabiVillage.y},${SPECIAL_POS.manabiVillage.x}`]: "village",
  [`${SPECIAL_POS.nazoVillage.y},${SPECIAL_POS.nazoVillage.x}`]: "mysticVillage",
  [`${SPECIAL_POS.catVillage.y},${SPECIAL_POS.catVillage.x}`]: "catVillage",
};

function getWorldLandmarkType(tile, x, y) {
  const key = `${y},${x}`;
  if (WORLD_MARKERS[key]) return WORLD_MARKERS[key];
  if (tile === TILE.SCHOOL) return "school";
  if (tile === TILE.HOME) return "home";
  if (tile === TILE.CAVE) return "cave";
  if (tile === TILE.BRIDGE) return "bridge";
  if (tile === TILE.TOWN) return "village";
  return "";
}

const SCREEN = {
  TITLE: "title", NAME: "name", GENDER: "gender", PROLOGUE: "prologue",
  MAP: "map", INTERIOR: "interior", EVENT: "event", BATTLE: "battle",
  GAMEOVER: "gameover", ENDING: "ending",
};

function getEncounterCounter() {
  const min = GAME_DATA.encounter?.min ?? 12;
  const variance = GAME_DATA.encounter?.variance ?? 14;
  return min + Math.floor(Math.random() * variance);
}

async function bootstrapRuntimeAssets() {
  const supportsImageBitmap = typeof createImageBitmap === "function";
  const requests = [
    fetch("./game-data.json", { cache: "no-cache" }),
    supportsImageBitmap
      ? fetch("data:image/svg+xml;utf8," + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'><rect width='32' height='32' fill='%23111'/><circle cx='16' cy='16' r='10' fill='%23ffd43b'/><circle cx='13' cy='14' r='2' fill='%23111'/><circle cx='19' cy='14' r='2' fill='%23111'/><rect x='10' y='20' width='12' height='2' fill='%23111'/></svg>"))
      : Promise.resolve(null),
  ];

  const [configResponse, iconResponse] = await Promise.all(requests);
  if (configResponse?.ok) {
    const configJson = await configResponse.json();
    GAME_DATA = Object.assign({}, DEFAULT_GAME_DATA, configJson || {});
  } else {
    GAME_DATA = Object.assign({}, DEFAULT_GAME_DATA);
  }

  if (iconResponse?.ok && supportsImageBitmap) {
    const iconBlob = await iconResponse.blob();
    const bitmap = await createImageBitmap(iconBlob);
    RUNTIME_ASSETS.set("titleIcon", bitmap);
  }
}

function sortBagItems(bag = []) {
  return [...bag].sort((a, b) => {
    if ((b.count ?? 0) !== (a.count ?? 0)) return (b.count ?? 0) - (a.count ?? 0);
    return String(a.name ?? "").localeCompare(String(b.name ?? ""), "ja");
  });
}

function normalizeSavedPlayer(data) {
  const normalized = Object.assign({}, data);
  normalized.visited = new Set(data.visited || []);
  normalized.bag = sortBagItems(data.bag || []);
  normalized.openedChests = data.openedChests || [];
  normalized.nazoFlags = data.nazoFlags || [];
  normalized.nazoSpellLearned = data.nazoSpellLearned || false;
  normalized.storyFlags = data.storyFlags || [];
  // 古いセーブ形式だと encounterCounter が無くなっている可能性があるため復元
  const ec = Number(data.encounterCounter);
  normalized.encounterCounter = Number.isFinite(ec) ? ec : getEncounterCounter();
  normalized.equip = Object.assign({ weapon: null, armor: null, accessory: null }, data.equip || {});
  return normalized;
}

// ─── SHOP ITEMS（3段階）──────────────────────────────────────────────────────
const SHOP_ITEMS_T1 = [
  { id:"iron_sword",    name:"てつのつるぎ",   slot:"weapon",    atkBonus:5,  defBonus:0,  cost:30,  desc:"こうげき+5",        type:"equip" },
  { id:"leather_armor", name:"かわのよろい",   slot:"armor",     atkBonus:0,  defBonus:4,  cost:25,  desc:"まもり+4",          type:"equip" },
  { id:"magic_ring",    name:"まほうのゆびわ", slot:"accessory", atkBonus:1,  defBonus:1,  cost:40,  desc:"こうげき+1 まもり+1", type:"equip" },
  { id:"herb",          name:"やくそう",       atkBonus:0, defBonus:0, cost:10, desc:"HP+20", type:"item" },
  { id:"potion",        name:"キズぐすり",     atkBonus:0, defBonus:0, cost:20, desc:"HP+40", type:"item" },
  { id:"antidote",      name:"どくけしそう",   atkBonus:0, defBonus:0, cost:15, desc:"どくを　なおす", type:"item" },
];

const SHOP_ITEMS_T2 = [
  { id:"steel_sword",   name:"はがねのつるぎ", slot:"weapon",    atkBonus:10, defBonus:0,  cost:120, desc:"こうげき+10",       type:"equip" },
  { id:"chain_mail",    name:"くさりかたびら", slot:"armor",     atkBonus:0,  defBonus:7,  cost:100, desc:"まもり+7",          type:"equip" },
  { id:"fire_ring",     name:"ほのおのゆびわ", slot:"accessory", atkBonus:2,  defBonus:2,  cost:150, desc:"こうげき+2 まもり+2", type:"equip" },
  { id:"potion",        name:"キズぐすり",     atkBonus:0, defBonus:0, cost:20, desc:"HP+40", type:"item" },
  { id:"mega_potion",   name:"まんたんのくすり", atkBonus:0, defBonus:0, cost:50, desc:"HP+80", type:"item" },
];

const SHOP_ITEMS_T3 = [
  { id:"dragon_sword",  name:"りゅうのつるぎ", slot:"weapon",    atkBonus:16, defBonus:0,  cost:300, desc:"こうげき+16",       type:"equip" },
  { id:"magic_armor",   name:"まほうのよろい", slot:"armor",     atkBonus:0,  defBonus:12, cost:280, desc:"まもり+12",         type:"equip" },
  { id:"holy_charm",    name:"せいなるおまもり", slot:"accessory", atkBonus:3,  defBonus:5,  cost:350, desc:"こうげき+3 まもり+5", type:"equip" },
  { id:"mega_potion",   name:"まんたんのくすり", atkBonus:0, defBonus:0, cost:50, desc:"HP+80", type:"item" },
];

// 装備IDから装備データを引くための辞書
const EQUIP_DICT = {};
[...SHOP_ITEMS_T1, ...SHOP_ITEMS_T2, ...SHOP_ITEMS_T3]
  .filter(i => i.type === "equip")
  .forEach(i => { EQUIP_DICT[i.id] = i; });

const SHOP_ITEMS = SHOP_ITEMS_T1; // 後方互換

// ─── ITEMS ────────────────────────────────────────────────────────────────────
const ITEMS = {
  herb:        { name:"やくそう", heal:20 },
  potion:      { name:"キズぐすり", heal:40 },
  mega_potion: { name:"まんたんのくすり", heal:80 },
  antidote:    { name:"どくけしそう", heal:0, curePoison:true },
  neko_konnyaku: { name:"ねこねここんにゃく", heal:0 },
};

// ─── NPC PALETTE ──────────────────────────────────────────────────────────────
// key = "row,col" (マップ座標) → body/hair カラー
const NPC_PALETTE = {
  village: {
    "3,2":   { body:"#34d399", hair:"#065f46" }, // 宿屋主人
    "3,11":  { body:"#60a5fa", hair:"#1e3a8a" }, // 道具屋店主
    "10,2":  { body:"#fbbf24", hair:"#92400e" }, // 子ども
    "10,10": { body:"#a78bfa", hair:"#ede9fe" }, // みちびきの老人
  },
  town: {
    "2,3": { body:"#78716c", hair:"#1a0a00" }, // ゴラン（武器屋・無骨）
    "2,6": { body:"#0ea5e9", hair:"#c8834a" }, // カモメ（旅商人・海色）
    "5,2": { body:"#6b7280", hair:"#d1d5db" }, // ライモン（元詩人・白髪）
    "5,13": { body:"#374151", hair:"#111827" }, // ミズキ（内向き・暗色）
    "9,4": { body:"#f97316", hair:"#fbbf24" }, // ネコ（オレンジ猫）
    "9,11": { body:"#b45309", hair:"#1a0a00" }, // ヒロシ（ガサツな男・土色）
    "13,3": { body:"#c8834a", hair:"#f59e0b" }, // イヌ（茶色の犬）
    "13,12": { body:"#e879f9", hair:"#831843" }, // ルナ（パリビ・紫ドレス）
    "11,8": { body:"#fca5a5", hair:"#7c2d12" }, // 宿屋女将
  },
  school: {
    "2,2": { body:"#1d4ed8", hair:"#1a0a00" }, // ミナミ先生
    "2,9": { body:"#be185d", hair:"#7c2d12" }, // ソノコ先生
    "8,2": { body:"#f59e0b", hair:"#92400e" }, // チビスケ
    "8,8": { body:"#374151", hair:"#111827" }, // コウスケ
  },
  cave: {
    "9,2": { body:"#7f1d1d", hair:"#1a0a00" }, // ぼろぼろの冒険者
    "1,5": { body:"#1a0a2a", hair:"#0a0015" }, // 謎の存在（ボス）
  },
  manabiVillage: {
    "2,2":  { body:"#c084fc", hair:"#581c87" }, // 国語先生（紫・文学）
    "2,10": { body:"#60a5fa", hair:"#1e3a8a" }, // 算数先生（青・論理）
    "5,2":  { body:"#4ade80", hair:"#14532d" }, // 理科先生（緑・自然）
    "5,8":  { body:"#fb923c", hair:"#7c2d12" }, // 社会先生（オレンジ・地図）
    "8,2":  { body:"#facc15", hair:"#713f12" }, // ポケモンマスター（黄）
    "8,10": { body:"#e2e8f0", hair:"#64748b" }, // 村の長老（白・グレー）
  },
  nazoVillage: {
    "2,3":  { body:"#fbbf24", hair:"#fffbeb" }, // 仙人マン（金・白）
    "2,9":  { body:"#fb7185", hair:"#fecdd3" }, // はなくん（ピンク）
    "5,2":  { body:"#94a3b8", hair:"#1e293b" }, // 猫くん（グレー）
    "5,8":  { body:"#bae6fd", hair:"#e0f2fe" }, // 雲まん（空色）
    "8,5":  { body:"#1e293b", hair:"#475569" }, // 忍者（黒）
  },
  catVillage: {
    "2,2": { body:"#f9a8d4", hair:"#7c2d12" },
    "2,5": { body:"#fdba74", hair:"#7c2d12" },
    "2,8": { body:"#fde68a", hair:"#92400e" },
    "8,3": { body:"#93c5fd", hair:"#1e3a8a" },
    "8,6": { body:"#a7f3d0", hair:"#065f46" },
  },
};

// ─── MAP GENERATION ───────────────────────────────────────────────────────────
function generateMapGrid() {
  const tiles   = [TILE.GRASS, TILE.FOREST, TILE.WATER, TILE.MOUNTAIN, TILE.SEA, TILE.LAKE, TILE.DESERT];
  const weights = [30, 18, 10, 12, 10, 8, 12];
  const total   = weights.reduce((a, b) => a + b, 0);

  const pickTile = () => {
    let roll = Math.random() * total;
    for (let i = 0; i < tiles.length; i++) { roll -= weights[i]; if (roll <= 0) return tiles[i]; }
    return TILE.GRASS;
  };

  let grid = Array.from({ length: MAP_SIZE }, () =>
    Array.from({ length: MAP_SIZE }, () => pickTile()));

  const smoothOnce = (src) => {
    const next = src.map(row => [...row]);
    for (let y = 1; y < MAP_SIZE - 1; y++) {
      for (let x = 1; x < MAP_SIZE - 1; x++) {
        const around = [];
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) around.push(src[y+dy][x+dx]);
        const cnt = new Map();
        around.forEach(t => cnt.set(t, (cnt.get(t) || 0) + 1));
        let best = src[y][x], bestC = cnt.get(best) || 0;
        tiles.forEach(t => { const c = cnt.get(t) || 0; if (c > bestC) { best = t; bestC = c; } });
        next[y][x] = best;
      }
    }
    return next;
  };

  grid = smoothOnce(grid);
  grid = smoothOnce(grid);

  for (let x = 2; x < MAP_SIZE - 2; x += 8) {
    const oy = Math.floor(Math.random() * 17) - 8;
    const y  = Math.max(1, Math.min(MAP_SIZE - 2, Math.floor(MAP_SIZE / 2) + oy));
    grid[y][x] = TILE.BRIDGE;
    if (grid[y][x-1] === TILE.GRASS) grid[y][x-1] = TILE.WATER;
    if (grid[y][x+1] === TILE.GRASS) grid[y][x+1] = TILE.WATER;
  }

  grid[Math.floor(MAP_SIZE/2)][Math.floor(MAP_SIZE/2)] = TILE.GRASS;
  grid[SPECIAL_POS.village.y][SPECIAL_POS.village.x]             = TILE.TOWN;
  grid[SPECIAL_POS.town.y][SPECIAL_POS.town.x]                   = TILE.TOWN;
  grid[SPECIAL_POS.castle.y][SPECIAL_POS.castle.x]               = TILE.TOWN;
  grid[SPECIAL_POS.school.y][SPECIAL_POS.school.x]               = TILE.SCHOOL;
  grid[SPECIAL_POS.home.y][SPECIAL_POS.home.x]                   = TILE.HOME;
  grid[SPECIAL_POS.cave.y][SPECIAL_POS.cave.x]                   = TILE.CAVE;
  grid[SPECIAL_POS.manabiVillage.y][SPECIAL_POS.manabiVillage.x] = TILE.TOWN;
  grid[SPECIAL_POS.nazoVillage.y][SPECIAL_POS.nazoVillage.x]    = TILE.TOWN;
  grid[SPECIAL_POS.catVillage.y][SPECIAL_POS.catVillage.x]      = TILE.TOWN;
  return grid;
}

const MAP_GRID = generateMapGrid();

// ─── SIGN MAP（道標：各特殊地点の近傍に1本だけ配置）──────────────────────────
// key="y,x" → { name, arrow }
const SIGN_MAP = (() => {
  const signs = {};
  const locs = [
    { pos: SPECIAL_POS.village,       name: 'はじまりの村' },
    { pos: SPECIAL_POS.town,          name: 'いずみの街' },
    { pos: SPECIAL_POS.school,        name: 'まなびの学校' },
    { pos: SPECIAL_POS.home,          name: 'ながれぼしの家' },
    { pos: SPECIAL_POS.cave,          name: 'くらやみの洞窟' },
    { pos: SPECIAL_POS.manabiVillage, name: 'まなびの村' },
    { pos: SPECIAL_POS.nazoVillage,   name: '謎の村' },
    { pos: SPECIAL_POS.catVillage,    name: '猫の村' },
  ];
  // 近すぎる案内を避けるため、まず遠距離(6〜8マス)を優先して配置する。
  // 迷ったときに見つける「道しるべ」として機能させる。
  const OFFSETS = [
    [-8,0,'→'], [8,0,'←'], [0,-8,'↓'], [0,8,'↑'],
    [-6,0,'→'], [6,0,'←'], [0,-6,'↓'], [0,6,'↑'],
    [-5,-2,'↘'], [5,-2,'↙'], [-5,2,'↗'], [5,2,'↖'],
    [-4,0,'→'], [4,0,'←'], [0,-4,'↓'], [0,4,'↑'],
  ];
  const NO_SIGN = [TILE.TOWN, TILE.SCHOOL, TILE.HOME, TILE.CAVE, TILE.SEA, TILE.LAKE, TILE.WATER];
  const isNearAnotherSign = (x, y) => Object.keys(signs).some((k) => {
    const [sy, sx] = k.split(",").map(Number);
    return Math.abs(sx - x) + Math.abs(sy - y) <= 4;
  });

  locs.forEach(({ pos, name }) => {
    for (const [dx, dy, arrow] of OFFSETS) {
      const sx = pos.x + dx, sy = pos.y + dy;
      if (sx < 1 || sy < 1 || sx >= MAP_SIZE - 1 || sy >= MAP_SIZE - 1) continue;
      if (NO_SIGN.includes(MAP_GRID[sy][sx])) continue;
      if (isNearAnotherSign(sx, sy)) continue;
      const key = `${sy},${sx}`;
      if (!signs[key]) {
        signs[key] = { name, arrow };
        break; // 1地点につき1本だけ
      }
    }
  });
  return signs;
})();

// ─── INTERIOR MAPS ────────────────────────────────────────────────────────────
function parseIntMap(rows) {
  const cm = { W: INT.WALL, ".": INT.FLOOR, E: INT.EXIT, N: INT.NPC,
               S: INT.SHELF, D: INT.DESK, B: INT.BOARD, C: INT.COUNTER, F: INT.FOUNTAIN, T: INT.CHEST,
               U: INT.STAIRS_UP, V: INT.STAIRS_DOWN };
  return rows.map(r => r.split("").map(c => cm[c] ?? INT.FLOOR));
}

const TOWN_IMAP = parseIntMap([
  "WWWWWWWWWWWWWWWWWW",
  "W..CCCC..CCCC....W",  // 北区：露店エリア（左右に市場）
  "W..N..N..........W",  // 通りに面した住民配置
  "W..CCCC..CCCC....W",
  "W.SSSS....SSSS...W",  // 生活区：棚のある建物
  "W.N..D....D..N...W",  // 住民と机（家・仕事場）
  "W......TTF.......W",  // 中央広場：宝箱2つ＋泉
  "W................W",
  "W...CCCCCCCC.....W",  // 南区：宿屋/道具屋の大カウンター
  "W...N......N.....W",
  "W...CCCCCCCC.....W",
  "W.......N........W",  // 宿屋女将
  "W................W",
  "W..N........N....W",
  "W................W",
  "W........E.......W",
  "W................W",
  "WWWWWWWWWWWWWWWWWW",
]);

// 学校内部：奥へ抜けられる通路を確保（机で詰まらない設計）
const SCHOOL_IMAP = parseIntMap([
  "WWWWWWWWWWWW",
  "WBBBBBBBBBBW", // 黒板ライン
  "W..N....N..W", // 先生（左右）
  "W.D.D..D.D.W", // 机（中央通路あり）
  "W..........W",
  "W.D.D..D.D.W",
  "W....WW....W", // 廊下の仕切り（左右から回り込める）
  "W..........W",
  "W..N....N..W", // 生徒
  "W..........W",
  "W....E.....W",
  "WWWWWWWWWWWW",
]);

// ─── 王城マップ（重要拠点）────────────────────────────────────────────────────
const CASTLE_IMAP = parseIntMap([
  "WWWWWWWWWWWWWWWWWWWW",
  "WBBBBBBBBBBBBBBBBBBW",
  "W.....N......N.....W", // 兵士（左）/兵士（右）
  "W..................W",
  "W..CCCCCCCCCCCCCC..W", // 大広間の柵/カウンター風
  "W..C............C..W",
  "W..C....TTTT....C..W", // 宝箱（将来拡張用）
  "W..C............C..W",
  "W..CCCC..CC..CCCC..W",
  "W.......N..........W", // 姫
  "W..................W",
  "W.....N............W", // 王
  "W..................W",
  "W........E.........W",
  "WWWWWWWWWWWWWWWWWWWW",
]);

// ─── 洞窟マップ ───────────────────────────────────────────────────────────────
// 上に進むほど「奥」= 深部。S=岩, F=地下水脈, B=石碑, N=NPC
const CAVE_FLOORS = {
  1: parseIntMap([
    "WWWWWWWWWWWW",
    "W..........W",
    "W.S..F..S..W",
    "W..........W",
    "W.......T..W",
    "WWWWW.WWWWWW",
    "W..........W",
    "W.N........W",
    "W....E.....W",
    "W....V.....W",
    "WWWWWWWWWWWW",
  ]),
  2: parseIntMap([
    "WWWWWWWWWWWW",
    "W....U.....W",
    "W..........W",
    "W.S.T...S..W",
    "WWWWW.WWWWWW",
    "W..........W",
    "W..F.......W",
    "W..........W",
    "W....V.....W",
    "WWWWWWWWWWWW",
  ]),
  3: parseIntMap([
    "WWWWWWWWWWWW",
    "W....N.....W",
    "W..S.....S.W",
    "W..........W",
    "WWWWWW.WWWWW",
    "W..........W",
    "W.S..F..B..W",
    "W..........W",
    "W....U.....W",
    "WWWWWWWWWWWW",
  ]),
};
const CAVE_IMAP = CAVE_FLOORS[1];

// ─── はじまりの村マップ ────────────────────────────────────────────────────────
const VILLAGE_IMAP = parseIntMap([
  "WWWWWWWWWWWWWW",
  "W............W",
  "W.CCCC..CCCC.W",  // 左:宿屋 右:武器防具屋
  "W.N..C..C..N.W",  // [3,2]=宿屋主人 [3,11]=店主
  "W.CCCC..CCCC.W",
  "W....T..T....W",  // 宝箱2つ
  "W............W",
  "W....F.......W",  // 泉
  "W............W",
  "W.CCCC.......W",
  "W.N..C....N..W",  // [10,2]=子ども [10,10]=みちびき老人
  "W.CCCC.......W",
  "W.....E......W",
  "WWWWWWWWWWWWWW",
]);

// ─── まなびの村マップ（世界の端、教科先生6人）────────────────────────────────
const MANABI_VILLAGE_IMAP = parseIntMap([
  "WWWWWWWWWWWW",  // row 0
  "W.B.......BW",  // row 1: 黒板x2
  "W.N.......NW",  // row 2: [2,2]=国語先生 [2,10]=算数先生
  "W..........W",  // row 3
  "W..........W",  // row 4
  "W.N..F..N..W",  // row 5: [5,2]=理科先生 [5,8]=社会先生 泉[5,5]
  "WWWWWW.WWWWW",  // row 6: 仕切り
  "W..........W",  // row 7
  "W.N.......NW",  // row 8: [8,2]=ポケモンマスター [8,10]=長老
  "W..........W",  // row 9
  "W....E.....W",  // row 10: 出口
  "WWWWWWWWWWWW",  // row 11
]);

// ─── 謎の村マップ（仙人マン・はなくん・猫くん・雲まん・忍者）────────────────────
const NAZO_VILLAGE_IMAP = parseIntMap([
  "WWWWWWWWWWWW",  // row 0
  "W..........W",  // row 1
  "W..N.....N.W",  // row 2: [2,3]=仙人マン [2,9]=はなくん
  "W..........W",  // row 3
  "W..........W",  // row 4
  "W.N..F..N..W",  // row 5: [5,2]=猫くん [5,5]=泉 [5,8]=雲まん
  "WWWWWW.WWWWW",  // row 6: 仕切り
  "W..........W",  // row 7
  "W....N.....W",  // row 8: [8,5]=忍者
  "W..........W",  // row 9
  "W....E.....W",  // row 10: 出口
  "WWWWWWWWWWWW",  // row 11
]);

// ─── 猫の村マップ ───────────────────────────────────────────────────────────────
const CAT_VILLAGE_IMAP = parseIntMap([
  "WWWWWWWWWWWW",
  "W..........W",
  "W.N..N..N..W",
  "W..........W",
  "W....F.....W",
  "W..........W",
  "WWWWWW.WWWWW",
  "W..........W",
  "W..N..N....W",
  "W..........W",
  "W....E.....W",
  "WWWWWWWWWWWW",
]);

const INTERIOR_MAPS = {
  village: VILLAGE_IMAP, town: TOWN_IMAP, school: SCHOOL_IMAP,
  castle: CASTLE_IMAP,
  cave: CAVE_IMAP, manabiVillage: MANABI_VILLAGE_IMAP, nazoVillage: NAZO_VILLAGE_IMAP,
  catVillage: CAT_VILLAGE_IMAP,
};

const CAVE_EVENTS_BY_FLOOR = {
  1: {
    "7,2": { messages: [
      "ぼろぼろの　冒険者：「……き、きみか。",
      "この洞窟は　普通じゃない。",
      "奥に進むほど……気が遠くなる。",
      "……俺の装備、持ってけ。俺には　もう　必要ない。",
      "代わりに……　倒してきてくれ。頼む。",
    ], shop: true, shopItems: "T3" },
    "2,5": { messages: [
      "地の底から　湧き出る　冷たい泉。",
      "飲んでみた。",
      "なぜか　気持ちが　落ち着いた。",
      "HPが　5　回復した！",
    ], heal: 5 },
  },
  2: {
    "6,3": { messages: [
      "地下水脈が　静かに　流れている。",
      "ひんやりした空気で　頭がさえた。",
      "HPが　6　回復した！",
    ], heal: 6 },
  },
  3: {
    "1,5": { messages: [
      "……。",
      "……よく　ここまで　来た。",
      "ずっと　待っていた。",
      "では　見せてやろう……闇の力を。",
    ], boss: true },
    "6,8": { messages: [
      "古い　石碑が　ある。",
      "『ちからは　おそれを　こえた　さきに　ある』",
      "……だれが　刻んだのか　わからない。",
    ]},
    "6,5": { messages: [
      "地の底から　湧き出る　冷たい泉。",
      "飲んでみた。",
      "なぜか　気持ちが　落ち着いた。",
      "HPが　5　回復した！",
    ], heal: 5 },
  },
};

const CAVE_TREASURES_BY_FLOOR = {
  1: {
    "4,8": { id: "cave:1:4,8", itemId: "antidote", amount: 1, messages: ["宝箱を　あけた！", "どくけしそうを　てにいれた！"] },
  },
  2: {
    "3,4": { id: "cave:2:3,4", itemId: "mega_potion", amount: 1, messages: ["宝箱を　あけた！", "まんたんのくすりを　てにいれた！"] },
  },
  3: {},
};

// key = "y,x"
const INTERIOR_EVENTS = {
  // ─── はじまりの村 ────────────────────────────────────────────────────────────
  village: {
    "3,2": { messages: [
      "宿屋の主人：「いらっしゃい、旅人さん。",
      "ひと晩　休んでいくかい？",
      "ゆっくり休んで、HPとMPが　全回復した！",
    ], heal: 999, inn: true, fixedNpc: true },
    "3,11": { messages: [
      "道具屋の店主：「武器と防具、旅の基本だよ。",
      "カウンター越しに　気軽に見ていって！",
    ], shop: true, fixedNpc: true },
    "7,5": { messages: [
      "小さな泉が　ある。",
      "飲んでみると　体が　温かくなった。",
      "HPが　8　回復した！",
    ], heal: 8 },
    "10,2": { messages: [
      "子ども：「ねえ！　旅人さんって　強い？",
      "ドランゴって　どんな顔してるの？",
      "ぼくも　いつか　旅に　出るんだ！",
      "……でも　まだ　こわくて。",
      "きみを　見てたら　少し　勇気が　出てきた！",
      "HPが　3　回復した！",
    ], heal: 3 },
    "10,10": { messages: [
      "みちびきの　おじいさん：「戻ってきたか。",
      "街道は　まだ危ない。焦らず　育っていけ。",
      "次は　東のいずみの街で　情報を集めるといいぞ。",
    ]},
  },
  town: {
    // 武器屋 ゴラン（無口で無骨、でも本質を突く）
    "2,3": { messages: [
      "ゴラン（武器屋）：「……旅人か。",
      "おまえ　その装備じゃ　ドランゴには　勝てん。",
      "まあ　俺の店の武器を　買っていけ。",
      "カウンターで　買えるぞ。",
    ], shop: true, fixedNpc: true },
    // カウンターで話す = 武器屋として機能
    // カモメ（陽気な旅商人、情報屋）
    "2,6": { messages: [
      "カモメ（旅商人）：「よお旅人！　あんたも　ドランゴを　倒しに来たか？",
      "東の洞窟に　住んでるって噂だぜ。",
      "俺？　俺は戦わんよ。生きてる方が　商売になるからな！　ハハハ！",
      "でも……本当に　この世界を　救えるのは　あんたしかいない気がする。",
      "なんとなくな。直感だ。",
    ], fixedNpc: true },
    // ライモン（山月記スタイル：かつては偉大だった詩人、今は落ちぶれ）
    "5,2": { messages: [
      "ライモン（老人）：「……詩人だった頃の私は　もっと　声が大きかった。",
      "ドランゴが　この世界を　支配してから……",
      "人々の　笑い声が　消えた。歌が　消えた。",
      "私の言葉も　届かなくなった。",
      "……だが　勇者よ。おまえの　足音には　詩がある。",
      "行け。私には　もう　行けないが。",
    ]},
    // ミズキ（太宰治スタイル：自己否定、でも深い優しさ）
    "5,13": { messages: [
      "ミズキ：「……。",
      "どうせ　僕には　何もできない。",
      "ドランゴを　倒す勇気なんて　ない。",
      "……でも。",
      "あなたみたいな人が　いてくれるなら。",
      "少しだけ　この世界も　悪くないかと　思えてくる。",
    ]},
    // ネコ（謎めいた猫、核心を突く）
    "9,4": { messages: [
      "ネコ：「にゃ。",
      "……洞窟の奥には　気をつけるにゃ。",
      "ドランゴは　おそれを　食って　大きくなる。",
      "おそれなければ　小さくなるにゃ。",
      "……にゃ。",
    ]},
    // ヒロシ（ガサツだが義侠心がある）
    "9,11": { messages: [
      "ヒロシ（がっちり男）：「おう！　旅人か！",
      "俺も　ドランゴぶっ殺しに行こうとしたんだけどよ、",
      "なんか　足がもつれてコケてよ。恥ずかしくてよ。やめた。",
      "でもよ、マジで　頼むわ。",
      "俺の娘が　ドランゴのせいで　笑わなくなったんだ。",
      "……頼むな。本当に。",
    ]},
    // イヌ（犬らしい全力さ、シンプルな応援）
    "13,3": { messages: [
      "イヌ：「わんわん！",
      "わん　わわん！",
      "……（しっぽを　ぶんぶん　振っている）",
      "なんだか　元気が　出てきた。",
      "HPが　3　回復した！",
    ], heal: 3 },
    // ルナ（パリジェンヌ風、軽薄そうで実は鋭い）
    "13,12": { messages: [
      "ルナ（おしゃれな女）：「あら、旅人じゃないの。珍しいわ。",
      "ドランゴって　アクセサリーとか　持ってるのかしら。",
      "なんかキラキラしてそう。",
      "……冗談よ。でも本気でも　あるわ。",
      "世界が　暗くなると　おしゃれも　できないの。",
      "はやく　終わらせてきてよね。",
    ]},
    "11,8": { messages: [
      "宿屋の女将：「旅人さん、顔色がわるいよ。",
      "うちで休んでいきな。HPとMPを　整えておいき！",
    ], heal: 999, inn: true, fixedNpc: true },
  },
  cave: {
    // 最奥の謎の存在（ボス戦トリガー）
    "1,5": { messages: [
      "……。",
      "……よく　ここまで　来た。",
      "ずっと　待っていた。",
      "では　見せてやろう……闇の力を。",
    ], boss: true },
    // 古い石碑（隣接して調べる）
    "6,8": { messages: [
      "古い　石碑が　ある。",
      "『ちからは　おそれを　こえた　さきに　ある』",
      "……だれが　刻んだのか　わからない。",
    ]},
    // 地下の泉（上に立って調べる）
    "6,5": { messages: [
      "地の底から　湧き出る　冷たい泉。",
      "飲んでみた。",
      "なぜか　気持ちが　落ち着いた。",
      "HPが　5　回復した！",
    ], heal: 5 },
    // 道に迷った冒険者
    "9,2": { messages: [
      "ぼろぼろの　冒険者：「……き、きみか。",
      "この洞窟は　普通じゃない。",
      "奥に進むほど……気が遠くなる。",
      "……俺の装備、持ってけ。俺には　もう　必要ない。",
      "代わりに……　倒してきてくれ。頼む。",
    ], shop: true, shopItems: "T3" },
  },
  // ─── まなびの村（世界の端、小学5年向け教科NPC）────────────────────────────
  manabiVillage: {
    // 国語先生
    "2,2": { messages: [
      "コクゴ先生：「よく　ここまで　来たね！",
      "言葉は　剣よりも　強いことがある。",
      "「継続は力なり」という　言葉を　知ってるかい？",
      "毎日　少しずつ　続けることが　力になるんだ。",
      "物語の　主人公は　みんな　迷い　悩みながら　前へ進んだ。",
      "きみも　そうだよ。",
    ]},
    // 算数先生
    "2,10": { messages: [
      "サンスウ先生：「算数はね、　魔法なんだよ！",
      "問題：1から100まで　全部　足すと　いくつ？",
      "……答えは　5050！",
      "ガウスという　天才が　10歳のときに　解いた問題だ。",
      "コツは　「工夫して　考えること」。",
      "きみにも　絶対　できるよ！",
    ]},
    // 理科先生
    "5,2": { messages: [
      "リカ先生：「植物って　本当に　すごいよ！",
      "光合成でね、太陽の　エネルギーを　食べ物に　変えるんだ。",
      "ドランゴが　光を　奪ったら　この世界の　草も　枯れちゃう。",
      "だから　きみの　旅は　理科的にも　大事なんだ！",
      "自然を　守ることが　科学の　第一歩だよ。",
    ]},
    // まなびの村の泉
    "5,5": { messages: [
      "世界の　果ての　泉。",
      "吸い込まれそうなくらい　澄んでいる。",
      "HPが　15　回復した！",
    ], heal: 15 },
    // 社会先生
    "5,8": { messages: [
      "シャカイ先生：「地図を　見たことがあるか？",
      "この村は　世界の　北西の　端っこにある。",
      "南東の　洞窟まで　距離は　約44マス。",
      "人が　集まる場所には　必ず　理由がある。",
      "地形、資源、交通……　社会は　全部　つながっているんだ。",
    ]},
    // ポケモンマスター
    "8,2": { messages: [
      "ポケモンマスター：「やあ！　待ってたよ！",
      "ポケモンって　実は　理科の　教科書なんだ！",
      "カイオーガは　水を　作り出す……海洋生態系だね。",
      "グラードンは　大地を　広げる……プレートテクトニクスだ。",
      "好きなことから　学ぶのが　一番　強い！",
      "HPが　10　回復した！",
    ], heal: 10 },
    // 村の長老
    "8,10": { messages: [
      "長老：「……よく　来た。ここは　世界の　果て。",
      "算数も　国語も　理科も　社会も……",
      "全ては　「知らないことへの　恐れ」を　なくすための　旅だ。",
      "学ぶとは　恐れを　越えること。",
      "おまえは　すでに　勇者だ。",
      "まなびの旅は　まだ　続く。　行け。",
    ]},
    // 黒板（左）
    "1,2": { messages: [
      "黒板に　書いてある：",
      "「知ることは　力なり」",
      "「Learning is Power」",
    ]},
    // 黒板（右）
    "1,10": { messages: [
      "黒板に　書いてある：",
      "「この村に　たどり着いたきみは",
      "　もう　立派な　冒険者だ」",
    ]},
  },
  // ─── 謎の村（仙人マンと4人の謎解きNPC）────────────────────────────────────────
  nazoVillage: {
    // 仙人マン（謎解き完了チェック → 魔法授与。動的処理はInteriorMapScreen内で上書き）
    "2,3": { messages: [
      "仙人マン：「……ほほう。　旅人よ。",
      "この村の　謎を　4つ　解いてみよ。",
      "はなくん・猫くん・雲まん・忍者、",
      "4人　全員に　会って　謎を　聞くのじゃ。",
      "それができたとき……　魔法を　授けよう。",
    ]},
    // はなくん
    "2,9": { messages: [
      "はなくん：「やあ！　花の　謎を　出すよ！",
      "問い：春に　咲いて　やがて　散る花の名は？",
      "答え……　さくら！　桜！",
      "散るからこそ　美しい。　はかなさが　花の　命なんだ。",
      "きみも　きっと　咲く　時がくる。",
    ], flag: "hana" },
    // 猫くん
    "5,2": { messages: [
      "猫くん：「にゃ〜。　謎を　教えてあげる　にゃ。",
      "問い：夜に　輝いて　消えていく　ものは？",
      "……そう、　星　だ　にゃ。",
      "でも　本当は　消えてない　にゃ。",
      "見えなくなるだけで、　そこに　ある　にゃ。",
    ], flag: "neko" },
    // 泉
    "5,5": { messages: [
      "霧の　中の　静かな泉。",
      "底が　見えないほど　深い……",
      "飲んでみると　心が　澄んだ。",
      "HPが　12　回復した！",
    ], heal: 12 },
    // 雲まん
    "5,8": { messages: [
      "雲まん：「ふわ〜　ふわ〜……。",
      "謎を　出すよ〜。",
      "問い：形が　変わり続けるのに　消えない　ものは？",
      "……正解は　雲！　ぼく！",
      "どんな形にでも　なれる。　それが　自由　だよ〜。",
    ], flag: "kumo" },
    // 忍者
    "8,5": { messages: [
      "忍者：「……シッ。",
      "謎を　出す。　よく　聞け。",
      "問い：見えなくても　そこに　いる。　動いても　音がしない。　これは　何だ？",
      "……正解は　影（かげ）だ。",
      "強さとは　目立つことでは　ない。",
      "静かに　在ること——　それが　真の　力だ。",
    ], flag: "ninja" },
  },
  catVillage: {
    "2,2": {
      catTalk: true,
      lockedMessages: ["ネコ：「にゃー。」", "ネコは　こちらを　見ている……。"],
      unlockedMessages: ["ネコ長：「おお、ねこねここんにゃくの香り…！」", "これで　やっと　人の言葉で話せるにゃ。", "森の奥で猫又が　たまに落とす　秘薬なんだにゃ。"],
    },
    "2,5": {
      catTalk: true,
      lockedMessages: ["ネコ：「しゃー！」", "まだ　警戒されている。"],
      unlockedMessages: ["三毛ネコ：「ようこそ、猫の村へ。」", "こんにゃくを持つ者は　友だちにゃ。"],
    },
    "2,8": {
      catTalk: true,
      lockedMessages: ["ネコ：「にゃー…」"],
      unlockedMessages: ["黒ネコ：「猫又を見かけたら　森をよく探すにゃ。」", "夜の森で会いやすいらしいにゃ。"],
    },
    "8,3": {
      catTalk: true,
      lockedMessages: ["ネコ：「しゃー…」"],
      unlockedMessages: ["白ネコ：「猫又は　きまぐれに現れる。」", "でも森を歩けば　いつか必ず会えるにゃ。"],
    },
    "8,6": {
      catTalk: true,
      lockedMessages: ["ネコ：「にゃ！」"],
      unlockedMessages: ["子ネコ：「おみやげ　ありがとにゃ！」", "村のみんな、君のこと好きになったにゃ。"],
    },
    "4,5": { messages: ["猫の泉。丸い波紋が静かに広がっている。", "HPが　8　回復した！"], heal: 8 },
  },
  school: {
    "2,2": { messages: [
      "ミナミ先生：「よく　来た。この世界に　来たからには　やることがある。",
      "黒板を　見なさい。",
      "『おそれをこえた　さきに　ちからは　ある』",
      "ドランゴを　倒すには　まず　自分の　おそれを知ることだ。",
      "攻撃力が　2　上がった！",
    ], buff: { type: "attack", val: 2 } },
    "2,9": { messages: [
      "ソノコ先生：「あなたが　旅人ね。",
      "ドランゴが　現れてから　子供たちが　学校に　来なくなった。",
      "みんな　こわくて　家から　出られないの。",
      "……だから　お願い。",
      "あの子たちに　また　笑顔を　返して。",
    ]},
    "8,2": { messages: [
      "チビスケ：「勇者だ！　勇者が　来た！",
      "ドランゴって　どんな顔してるの！？",
      "かっこいい？　こわい？　でっかい？",
      "倒したら　教えてよ！！",
      "……絶対　帰ってきてよ。",
    ]},
    "8,8": { messages: [
      "コウスケ（がり勉）：「……。",
      "……ドランゴのこと、調べてる。",
      "……弱点は、おそれのない心、らしい。",
      "……俺じゃ　行けないから……　これ　使ってくれ。",
    ], shop: true, shopItems: "T2" },
  },
  // ─── 王城（城の王・姫・兵士）───────────────────────────────────────────────
  castle: {
    "2,6": { messages: [
      "兵士：「王様は　奥の間に　いらっしゃる。",
      "旅人よ、ここは　王城だ。",
      "無礼は　するなよ。」",
    ], fixedNpc: true },
    "2,13": { messages: [
      "兵士：「姫様は　城の中を　見回っておられる。",
      "……この国は　闇に　おびえている。」",
    ], fixedNpc: true },
    "9,8": { messages: [
      "姫：「旅人さん……。",
      "あなたの目は　逃げない人の目。",
      "……どうか　王様のお話を　聞いて。」",
      "心が　すこし　強くなった気がした。",
      "HPが　3　回復した！",
    ], heal: 3, fixedNpc: true },
    "11,6": { messages: [
      "王：「よく来た、旅人よ。",
      "ドランゴが　この世界を　闇で　覆っている。",
      "勇者よ……と呼ぶには　まだ早い。",
      "だが、そなたの歩みは　確かだ。",
      "まずは　まなびの学校へ向かい、",
      "『おそれをこえる言葉』を　受け取るのだ。",
      "そして　洞窟へ行け。",
      "姫と民を　救ってくれ。」",
      "『王の使命』を　受けた！",
    ], flag: "story:royalQuest", fixedNpc: true },
  },
};

const INTERIOR_TREASURES = {
  village: {
    "5,5": { id: "village:5,5", itemId: "herb", amount: 1, messages: ["宝箱を　あけた！", "やくそうを　てにいれた！"] },
    "5,8": { id: "village:5,8", gold: 18, messages: ["宝箱を　あけた！", "18ゴールドを　てにいれた！"] },
  },
  town: {
    "6,7": { id: "town:6,7", itemId: "potion", amount: 1, messages: ["宝箱を　あけた！", "キズぐすりを　てにいれた！"] },
    "6,8": { id: "town:6,8", gold: 35, messages: ["宝箱を　あけた！", "35ゴールドを　てにいれた！"] },
  },
};

function findExitPos(map) {
  for (let y = 0; y < map.length; y++)
    for (let x = 0; x < map[y].length; x++)
      if (map[y][x] === INT.EXIT) return { x, y };
  return { x: 5, y: 10 };
}

/** 洞窟の階段移動後：階段マスではなく、歩ける隣接マスに立たせる（壁めり込み・階段ループ防止） */
function caveStairLandingPos(targetMap, stairX, stairY, descendedOntoUpStair) {
  const rows = targetMap.length;
  const cols = targetMap[0]?.length ?? 0;
  const deltas = descendedOntoUpStair
    ? [[0, 1], [0, -1], [-1, 0], [1, 0]]
    : [[0, -1], [0, 1], [-1, 0], [1, 0]];
  const blocking = new Set([
    INT.WALL, INT.SHELF, INT.DESK, INT.BOARD, INT.COUNTER, INT.CHEST, INT.NPC,
    INT.STAIRS_UP, INT.STAIRS_DOWN,
  ]);
  for (const [dx, dy] of deltas) {
    const x = stairX + dx;
    const y = stairY + dy;
    if (x < 0 || y < 0 || x >= cols || y >= rows) continue;
    if (blocking.has(targetMap[y][x])) continue;
    return { x, y };
  }
  return { x: stairX, y: stairY };
}

// ─── LOCATION EVENTS (outdoor) ────────────────────────────────────────────────
const LOCATION_EVENTS = {
  [`${SPECIAL_POS.village.y},${SPECIAL_POS.village.x}`]: {
    name: "はじまりの村",
    messages: [
      "ここは　はじまりの村。",
      "スタート地点に　一番　近い　集落だ。",
      "旅に　出る前に　休んでいこう。",
      "村の中へ　はいる……",
    ],
    interior: "village",
  },
  [`${SPECIAL_POS.town.y},${SPECIAL_POS.town.x}`]: {
    name: "いずみの街",
    messages: [
      "ここは　いずみの街。",
      "人々が　ドランゴの脅威に　おびえながら　生きている。",
      "街の人に　話を　聞いてみよう。",
      "街の中へ　はいる……",
    ],
    interior: "town",
  },
  [`${SPECIAL_POS.castle.y},${SPECIAL_POS.castle.x}`]: {
    name: "王城アストリア",
    messages: [
      "高い城壁に　守られた　大きな王城。",
      "兵士たちの足音が　ひびく。",
      "この国の　王が　待っている……。",
      "王城の中へ　はいる……",
    ],
    interior: "castle",
  },
  [`${SPECIAL_POS.school.y},${SPECIAL_POS.school.x}`]: {
    name: "まなびの学校",
    messages: [
      "かつては　子どもたちの　笑い声が　あふれていた　学校。",
      "今は　しんと　静まり返っている。",
      "中から　先生の声が　聞こえる……",
      "学校の中へ　はいる……",
    ],
    interior: "school",
  },
  [`${SPECIAL_POS.home.y},${SPECIAL_POS.home.x}`]: {
    name: "ながれぼしの家",
    messages: [
      "廃墟のような　小さな家。",
      "扉に　文字が　刻んである。",
      "『どこにいても　ぼくらは　つながっている』",
      "なぜか　涙が　こぼれそうになった。",
      "HPとMPが　全回復した！",
    ],
    heal: true,
  },
  [`${SPECIAL_POS.cave.y},${SPECIAL_POS.cave.x}`]: {
    name: "くらやみの洞窟",
    messages: [
      "大地から　吹き出す　冷たい風。",
      "洞窟の奥から　うごめく気配……",
      "これが　ドランゴの　すみかだ。",
      "……覚悟を　決めて　踏み込む。",
    ],
    interior: "cave",
  },
  [`${SPECIAL_POS.manabiVillage.y},${SPECIAL_POS.manabiVillage.x}`]: {
    name: "まなびの村",
    messages: [
      "世界の　果てに　ある　静かな村。",
      "ここには　知恵を　持つ　先生たちが　集まっている。",
      "国語・算数・理科・社会……",
      "まなびの村へ　はいる……",
    ],
    heal: true, interior: "manabiVillage",
  },
  [`${SPECIAL_POS.nazoVillage.y},${SPECIAL_POS.nazoVillage.x}`]: {
    name: "謎の村",
    messages: [
      "霧に　包まれた　不思議な村。",
      "住人たちは　皆　謎を　抱えている。",
      "4つの　謎を　解いた者に……　魔法が　宿る。",
      "謎の村へ　はいる……",
    ],
    interior: "nazoVillage",
  },
  [`${SPECIAL_POS.catVillage.y},${SPECIAL_POS.catVillage.x}`]: {
    name: "猫の村",
    messages: [
      "静かな　鈴の音が　風に混じる。",
      "ここは　猫たちの　隠れ里。",
      "猫又の落とす　ねこねここんにゃくを　持っていれば、",
      "猫たちの言葉が　聞こえるらしい……",
      "猫の村へ　はいる……",
    ],
    interior: "catVillage",
  },
};

// ─── ENEMIES ──────────────────────────────────────────────────────────────────
// magic: { name, type:"dmg"|"heal", power } / drop: { id:"herb"|"potion", rate }
const ENEMIES = [
  // ─ Tier1: 初心者 (dist < 14, Lv1-2) ─
  { id: 0,  name:"スライム",       hp: 8, atk: 3, def: 0, exp: 4, gold: 2 },
  { id: 1,  name:"チョウチョ",     hp: 6, atk: 1, def: 0, exp: 3, gold: 2 },
  { id: 2,  name:"タヌキ",         hp:12, atk: 4, def: 1, exp: 6, gold: 3 },
  { id: 3,  name:"カエル",         hp: 9, atk: 3, def: 0, exp: 5, gold: 3 },
  { id: 4,  name:"こうもり",       hp: 7, atk: 3, def: 0, exp: 4, gold: 2, drop:{ id:"herb",   rate:0.3 } },
  { id: 5,  name:"ミニスライム",   hp: 5, atk: 1, def: 0, exp: 3, gold: 1 },
  { id: 6,  name:"どくいもむし",   hp:10, atk: 2, def: 0, exp: 5, gold: 3, poison:true, poisonRate:0.30, magic:{ name:"どくけむり",   type:"dmg", power: 4 } },
  { id: 7,  name:"いたずらゴースト",hp: 8, atk: 4, def: 0, exp: 5, gold: 3, magic:{ name:"おどかし",     type:"dmg", power: 6 } },
  // ─ Tier2: 中堅 (dist 14-22, Lv3-5) ─
  { id: 8,  name:"おばけきのこ",   hp:18, atk: 7, def: 1, exp:10, gold: 5 },
  { id: 9,  name:"ゴブリン",       hp:22, atk: 8, def: 2, exp:13, gold: 7 },
  { id:10,  name:"ツチモグラ",     hp:20, atk: 7, def: 2, exp:11, gold: 6 },
  { id:11,  name:"まどうし",       hp:25, atk:10, def: 2, exp:16, gold: 9, magic:{ name:"ほのお",       type:"dmg", power:10 } },
  { id:12,  name:"ドクロナイト",   hp:24, atk: 9, def: 2, exp:14, gold: 8 },
  { id:13,  name:"まよいびと",     hp:18, atk: 8, def: 1, exp:12, gold: 6, magic:{ name:"おびえ",       type:"dmg", power: 8 } },
  { id:14,  name:"アイスインプ",   hp:20, atk: 9, def: 1, exp:13, gold: 7, magic:{ name:"こおりのいき", type:"dmg", power: 9 }, drop:{ id:"herb", rate:0.25 } },
  { id:15,  name:"サーペント",     hp:22, atk: 8, def: 2, exp:12, gold: 7, drop:{ id:"herb", rate:0.2 } },
  // ─ 森ゾーン (FOREST tile, Lv5-8) ─
  { id:16,  name:"オオカミ",       hp:28, atk:11, def: 3, exp:18, gold:10 },
  { id:17,  name:"クモおとこ",     hp:24, atk:12, def: 2, exp:17, gold: 9 },
  { id:18,  name:"フクロウ鬼",     hp:30, atk:13, def: 3, exp:21, gold:12 },
  { id:19,  name:"もりのせいれい", hp:35, atk:14, def: 4, exp:25, gold:14, magic:{ name:"くさむら",     type:"dmg", power:12 } },
  { id:20,  name:"デビルフォックス",hp:26, atk:12, def: 2, exp:19, gold:11, magic:{ name:"まどわし",     type:"dmg", power:11 } },
  { id:21,  name:"ぬまのぬし",     hp:32, atk:13, def: 4, exp:22, gold:12, drop:{ id:"potion", rate:0.2 } },
  { id:22,  name:"まよいぼたる",   hp:24, atk:11, def: 2, exp:18, gold:10, magic:{ name:"まぼろし",     type:"dmg", power:10 } },
  { id:23,  name:"くろいからす",   hp:28, atk:12, def: 3, exp:20, gold:11 },
  // ─ 山岳ゾーン (MOUNTAIN tile, Lv7-10) ─
  { id:24,  name:"いわゴーレム",   hp:45, atk:16, def: 6, exp:30, gold:18 },
  { id:25,  name:"ガーゴイル",     hp:52, atk:19, def: 7, exp:36, gold:21 },
  { id:26,  name:"やま鬼",         hp:60, atk:22, def: 8, exp:42, gold:25 },
  { id:27,  name:"てっこうちゅう", hp:48, atk:18, def: 7, exp:33, gold:20, drop:{ id:"potion", rate:0.2 } },
  { id:28,  name:"ストーンワイバーン",hp:55, atk:20, def: 7, exp:38, gold:22, magic:{ name:"いわなだれ", type:"dmg", power:16 } },
  { id:29,  name:"ふぶきのせいれい",hp:42, atk:17, def: 6, exp:32, gold:19, magic:{ name:"ふぶき",       type:"dmg", power:15 } },
  // ─ 砂漠ゾーン (DESERT tile, Lv6-9) ─
  { id:30,  name:"サンドワーム",   hp:38, atk:15, def: 3, exp:26, gold:15 },
  { id:31,  name:"ミイラ",         hp:42, atk:17, def: 5, exp:32, gold:18, poison:true, poisonRate:0.25, magic:{ name:"のろい",         type:"dmg", power:13 }, drop:{ id:"potion", rate:0.2 } },
  { id:32,  name:"スコーピオン",   hp:32, atk:18, def: 3, exp:28, gold:16 },
  { id:33,  name:"フェニックス(幼)",hp:36, atk:16, def: 3, exp:28, gold:16, magic:{ name:"ほのおのつばさ",type:"dmg", power:14 } },
  { id:34,  name:"すなあらし",     hp:34, atk:15, def: 4, exp:27, gold:15, magic:{ name:"すなあらし",   type:"dmg", power:11 } },
  { id:35,  name:"ほねこうもり",   hp:38, atk:16, def: 4, exp:29, gold:17, magic:{ name:"くらやみ",     type:"dmg", power:13 }, drop:{ id:"herb", rate:0.25 } },
  // ─ 深部ゾーン (dist > 30, Lv10+) ─
  { id:36,  name:"ダークナイト",   hp:65, atk:23, def:10, exp:48, gold:30 },
  { id:37,  name:"あんこくまじゅつし",hp:55, atk:22, def: 8, exp:45, gold:28, magic:{ name:"じごくのほのお",type:"dmg", power:18 }, drop:{ id:"potion", rate:0.25 } },
  // ─ ボス (洞窟のみ) ─
  { id:38,  name:"ドランゴ",       hp:216, atk:24, def:10, exp:75, gold:50, magic:[
    { name:"やみのいかずち", type:"dmg", power:18 },
    { name:"闇の吐息",     type:"dmg", power:22 },
  ] },
  // ─ 猫の森のレア枠 ─
  { id:39,  name:"猫又",           hp:30, atk:13, def: 3, exp:21, gold:12, drop:{ id:"neko_konnyaku", rate:0.14 } },
];

const ENEMY_BY_ID = Object.fromEntries(ENEMIES.map((e) => [e.id, e]));
const E = (id) => ENEMY_BY_ID[id];
const BOSS_ENEMY = E(38);

// ★ Modern JS ① crypto.getRandomValues() — 暗号強度の乱数生成
function rng(min, max) {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return min + (buf[0] % (max - min + 1));
}
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// ─── 敵ゾーン設計（ストーリー地点対応）────────────────────────────────────────
// スタート(0,0中心) → 町(dist≈12) → 学校(dist≈21) → 家(dist≈26) → 洞窟(dist≈34)
//
// Zone A  dist  0〜 5  : Lv1序盤    チョウチョ・ミニスライム（魔法なし・超安全）
// Zone B  dist  6〜12  : Lv1〜2    スライム・カエル・こうもり（〜町まで）
// Zone C  dist 13〜19  : Lv2〜4    タヌキ・どくいもむし・ゴースト（町〜学校）
// Zone D  dist 20〜25  : Lv4〜6    おばけきのこ・ゴブリン・アイスインプ（学校〜家）
// Zone E  dist 26〜31  : Lv6〜9    ツチモグラ・まどうし・ドクロナイト（家〜洞窟）
// Zone F  dist 32+     : Lv9+      ダークナイト・あんこくまじゅつし（洞窟深部）
function getEnemyForZone(tile, pos) {
  const cx = Math.floor(MAP_SIZE / 2), cy = Math.floor(MAP_SIZE / 2);
  const dist = Math.abs(pos.x - cx) + Math.abs(pos.y - cy);

  // ── 山岳タイル：距離で3段階 ──
  if (tile === TILE.MOUNTAIN) {
    if (dist > 28) return [E(26), E(29)][rng(0, 1)];
    if (dist > 20) return [E(25), E(28)][rng(0, 1)];
    return [E(24), E(27)][rng(0, 1)];
  }
  // ── 砂漠タイル：固有モンスター ──
  if (tile === TILE.DESERT) {
    return [E(30), E(31), E(32), E(33), E(34), E(35)][rng(0, 5)];
  }
  // ── 森タイル：距離で2段階 ──
  if (tile === TILE.FOREST) {
    const pool = dist > 24
      ? [E(18), E(19), E(21), E(23), E(39)]
      : [E(16), E(17), E(20), E(22), E(39)];
    return pool[rng(0, pool.length - 1)];
  }

  // ── 草原・その他：6段階ゾーン ──
  // Zone A: スタート直後の超安全地帯（魔法なし・物理のみ）
  if (dist <=  5) return [E(1), E(5)][rng(0, 1)];
  // Zone B: 〜町までの道中（低atk・魔法なし）
  if (dist <= 12) return [E(0), E(1), E(3), E(4)][rng(0, 3)];
  // Zone C: 町〜学校（魔法系が初登場・Lv2以上想定）
  if (dist <= 19) return [E(2), E(3), E(6), E(7)][rng(0, 3)];
  // Zone D: 学校〜家（中堅前半・装備強化後想定）
  if (dist <= 25) return [E(8), E(9), E(14), E(15)][rng(0, 3)];
  // Zone E: 家〜洞窟（中堅後半・高atk・高def）
  if (dist <= 31) return [E(10), E(11), E(12), E(13)][rng(0, 3)];
  // Zone F: 洞窟深部（最終ゾーン・ドランゴはランダム出現しない）
  return [E(36), E(37)][rng(0, 1)];
}

const SPELLS = [
  { name: "ひかりのいぶき", mp: 3, effect: "heal",  power: 28, msg: "体力が回復した！" },
  { name: "あかつきのひ",   mp: 4, effect: "fire",  power: 15, msg: "炎が燃えさかる！" },
  { name: "ゆめしずく",     mp: 3, effect: "sleep", power:  0, msg: "眠りの呪文！" },
  // 謎の村クリア報酬（仙人マンの秘術）
  { name: "せんにんのかぜ", mp: 6, effect: "wind",  power: 25, msg: "仙人の風が吹き荒れる！", secret: true },
];

// ─── PLAYER ───────────────────────────────────────────────────────────────────
function makePlayer(name, gender) {
  return {
    name, gender,
    hp: 20, maxHp: 20,        // ← 弱体化（元30）
    mp:  8, maxMp:  8,        // ← 弱体化（元12）
    atk: 5, def: 2,           // ← 弱体化（元atk:8 def:4）
    exp: 0, level: 1, gold: 30,
    pos: { x: Math.floor(MAP_SIZE/2), y: Math.floor(MAP_SIZE/2) },
    visited: new Set(),
    direction: "down",
    animStep: 0,
    encounterCounter: getEncounterCounter(), // DQ式：歩数でエンカウント
    bag: [],
    openedChests: [],
    equip: { weapon: null, armor: null, accessory: null },
    nazoFlags: [],          // 謎の村で話したNPC記録
    nazoSpellLearned: false, // せんにんのかぜ習得フラグ
    storyFlags: [],         // 進行フラグ（王の使命など）
  };
}

function checkLevelUp(player) {
  const threshold = player.level * 15; // 元20から短縮
  if (player.exp < threshold) return player;
  return {
    ...player,
    level:  player.level + 1,
    maxHp:  player.maxHp + 4,
    hp:     player.maxHp + 4,
    maxMp:  player.maxMp + 2,
    mp:     player.maxMp + 2,
    atk:    player.atk + 1,
    def:    player.level % 2 === 1 ? player.def + 1 : player.def,
    exp:    player.exp - threshold,
  };
}

