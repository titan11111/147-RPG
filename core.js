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
const WORLD_SCALE = 1.5;
const MAP_SIZE = Math.round(50 * WORLD_SCALE);
const VIEW_SIZE = 9;
const INT_COLS = 12;
const INT_ROWS = 12;

function scaleWorldCoord(value) {
  return Math.max(1, Math.min(MAP_SIZE - 2, Math.round(value * WORLD_SCALE)));
}

const TILE = {
  GRASS: "grass", TOWN: "town", SCHOOL: "school", CAVE: "cave", HOME: "home",
  FOREST: "forest", WATER: "water", MOUNTAIN: "mountain", SEA: "sea",
  LAKE: "lake", BRIDGE: "bridge", DESERT: "desert",
  SNOW: "snow", ONSEN: "onsen",
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
  [TILE.SNOW]:     "linear-gradient(135deg,#e8f4f8,#b8d4e8)",
  [TILE.ONSEN]:    "linear-gradient(135deg,#80deea,#4dd0e1)",
};


const INT_STYLE = {
  [INT.FLOOR]:    "#b8b5ad", [INT.WALL]:     "#4b3a2a",
  [INT.EXIT]:     "#22c55e", [INT.NPC]:      "#b8b5ad",
  [INT.SHELF]:    "#7a4f2a", [INT.DESK]:     "#9a6b3f",
  [INT.BOARD]:    "#2f5d36", [INT.COUNTER]:  "#6f5440",
  [INT.FOUNTAIN]: "#3b82f6", [INT.CHEST]:    "#8b5a2b",
  [INT.STAIRS_DOWN]: "#6b7280", [INT.STAIRS_UP]: "#94a3b8",
};

// 地底洞窟専用タイルスタイル（暗い土・岩）
const UNDERGROUND_INT_STYLE = {
  [INT.FLOOR]:    "#150f08",
  [INT.WALL]:     "#0a0704",
  [INT.EXIT]:     "#22c55e",
  [INT.NPC]:      "#150f08",
  [INT.FOUNTAIN]: "#0d1a08",
  [INT.CHEST]:    "#3d2010",
  [INT.BOARD]:    "#120a04",
  [INT.SHELF]:    "#1f1008",
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

const CASTLE_INT_STYLE = {
  [INT.FLOOR]: "#3b0d13",
  [INT.WALL]: "#25151b",
  [INT.EXIT]: "#22c55e",
  [INT.NPC]: "#3b0d13",
  [INT.SHELF]: "#7f1d1d",
  [INT.DESK]: "#7c2d12",
  [INT.BOARD]: "#b91c1c",
  [INT.COUNTER]: "#f59e0b",
  [INT.FOUNTAIN]: "#60a5fa",
  [INT.CHEST]: "#d4af37",
};

const VILLAGE_INT_STYLE = {
  [INT.FLOOR]: "#8fbc8f",
  [INT.WALL]: "#4a3a2a",
  [INT.EXIT]: "#22c55e",
  [INT.NPC]: "#8fbc8f",
  [INT.SHELF]: "#7a4f2a",
  [INT.DESK]: "#8b5a2b",
  [INT.BOARD]: "#6b4f2f",
  [INT.COUNTER]: "#9c6b3f",
  [INT.FOUNTAIN]: "#38bdf8",
  [INT.CHEST]: "#8b5a2b",
};

const TOWN_INT_STYLE = {
  [INT.FLOOR]: "#9ca3af",
  [INT.WALL]: "#374151",
  [INT.EXIT]: "#22c55e",
  [INT.NPC]: "#9ca3af",
  [INT.SHELF]: "#6b7280",
  [INT.DESK]: "#65a30d",
  [INT.BOARD]: "#475569",
  [INT.COUNTER]: "#64748b",
  [INT.FOUNTAIN]: "#60a5fa",
  [INT.CHEST]: "#a16207",
};

const SPECIAL_POS = {
  village:       { x: scaleWorldCoord(23), y: scaleWorldCoord(25) }, // Zone A（はじまりの村）
  town:          { x: scaleWorldCoord(19), y: scaleWorldCoord(19) }, // 初心者ゾーン終盤
  castle:        { x: scaleWorldCoord(22), y: scaleWorldCoord(16) }, // 王城（重要拠点）
  artisanVillage:{ x: scaleWorldCoord(12), y: scaleWorldCoord(34) }, // 職人の村（サイド拠点）
  school:        { x: scaleWorldCoord(35), y: scaleWorldCoord(14) }, // 中堅ゾーン
  home:          { x: scaleWorldCoord(38), y: scaleWorldCoord(38) }, // 上級ゾーン（回復地点）
  cave:          { x: scaleWorldCoord(42), y: scaleWorldCoord(42) }, // 最終ゾーン（ボス）
  catCave:       { x: scaleWorldCoord(43), y: scaleWorldCoord(9) },  // 猫又の洞窟（猫の村近く）
  manabiVillage: { x: scaleWorldCoord(2), y: scaleWorldCoord(2) },   // 世界の端（まなびの村）
  nazoVillage:   { x: scaleWorldCoord(5), y: scaleWorldCoord(45) },  // 謎の村（仙人マンたちの村）
  catVillage:    { x: scaleWorldCoord(46), y: scaleWorldCoord(6) },  // 猫の村
  onsen:         { x: scaleWorldCoord(40), y: scaleWorldCoord(36) }, // 雪原の露天温泉（地下への入口）
  southShrine:   { x: scaleWorldCoord(24), y: scaleWorldCoord(29) }, // 南の祠（山脈の北側）
  shipyard:      { x: scaleWorldCoord(27), y: scaleWorldCoord(30) }, // 船入手イベント
  airDock:       { x: scaleWorldCoord(45), y: scaleWorldCoord(32) }, // 飛行船入手イベント
  shipReef:      { x: scaleWorldCoord(33), y: scaleWorldCoord(37) }, // 船専用の寄り道島
  skySanctum:    { x: scaleWorldCoord(44), y: scaleWorldCoord(20) }, // 飛行船専用の天空祠
};

const SAVE_POINT_POS = [
  { x: scaleWorldCoord(23), y: scaleWorldCoord(27), name: "村の南の碑", messages: [
    "旅人の足跡が刻まれた　古い石碑。",
    "王の紋章が　静かに　輝いている……",
    "ここまでの旅が　刻まれた！",
  ]},
  { x: scaleWorldCoord(22), y: scaleWorldCoord(18), name: "王城の碑", messages: [
    "王城の近くに立つ　守護の碑。",
    "剣と盾の紋章が　刻まれている。",
    "ここまでの旅が　刻まれた！",
  ]},
  { x: scaleWorldCoord(29), y: scaleWorldCoord(25), name: "まよい道の碑", messages: [
    "旅の分かれ道に立つ　道標の碑。",
    "「道に迷ったとき　足跡を振り返れ」と　刻まれている。",
    "ここまでの旅が　刻まれた！",
  ]},
];

const WORLD_MARKERS = {
  [`${SPECIAL_POS.village.y},${SPECIAL_POS.village.x}`]:             "village",
  [`${SPECIAL_POS.town.y},${SPECIAL_POS.town.x}`]:                   "castleTown",
  [`${SPECIAL_POS.castle.y},${SPECIAL_POS.castle.x}`]:               "castle",
  [`${SPECIAL_POS.artisanVillage.y},${SPECIAL_POS.artisanVillage.x}`]: "artisan",
  [`${SPECIAL_POS.school.y},${SPECIAL_POS.school.x}`]:               "school",
  [`${SPECIAL_POS.home.y},${SPECIAL_POS.home.x}`]:                   "home",
  [`${SPECIAL_POS.cave.y},${SPECIAL_POS.cave.x}`]:                   "cave",
  [`${SPECIAL_POS.catCave.y},${SPECIAL_POS.catCave.x}`]:             "cave",
  [`${SPECIAL_POS.manabiVillage.y},${SPECIAL_POS.manabiVillage.x}`]: "village",
  [`${SPECIAL_POS.nazoVillage.y},${SPECIAL_POS.nazoVillage.x}`]:     "mysticVillage",
  [`${SPECIAL_POS.catVillage.y},${SPECIAL_POS.catVillage.x}`]:       "catVillage",
  [`${SPECIAL_POS.onsen.y},${SPECIAL_POS.onsen.x}`]:                 "onsen",
  [`${SPECIAL_POS.southShrine.y},${SPECIAL_POS.southShrine.x}`]:     "shrine",
  [`${SPECIAL_POS.shipyard.y},${SPECIAL_POS.shipyard.x}`]:           "shipyard",
  [`${SPECIAL_POS.airDock.y},${SPECIAL_POS.airDock.x}`]:             "airDock",
  [`${SPECIAL_POS.shipReef.y},${SPECIAL_POS.shipReef.x}`]:           "reef",
  [`${SPECIAL_POS.skySanctum.y},${SPECIAL_POS.skySanctum.x}`]:       "shrine",
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

function createSeededRandom(seedText) {
  let hash = 2166136261;
  for (let i = 0; i < seedText.length; i++) {
    hash ^= seedText.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  let state = hash >>> 0;
  return function seededRandom() {
    state += 0x6D2B79F5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SCREEN = {
  TITLE: "title", NAME: "name", GENDER: "gender", PROLOGUE: "prologue",
  MAP: "map", INTERIOR: "interior", EVENT: "event", BATTLE: "battle",
  GAMEOVER: "gameover", ENDING: "ending", MERCHANT: "merchant",
};

function getEncounterCounter() {
  const min = GAME_DATA.encounter?.min ?? 12;
  const variance = GAME_DATA.encounter?.variance ?? 14;
  return min + Math.floor(Math.random() * variance);
}

function getStoryPhase(player) {
  if (!player) return 1;
  const flags = player.storyFlags || [];
  const hasRoyalQuest = flags.includes("story:royalQuest");
  const hasAllKeys = hasBagItem(player, "manabi_proof")
    && hasBagItem(player, "ancient_key")
    && hasBagItem(player, "dragon_scale");
  if (!hasRoyalQuest) return 1;      // 序盤（0〜8分）
  if (!hasAllKeys) return 2;         // 中盤前（8〜18分）
  return 3;                          // 中盤後（18〜26分）
}

function getEncounterCounterForPlayer(player) {
  const phase = getStoryPhase(player);
  if (phase === 1) return 14 + Math.floor(Math.random() * 17); // 14-30
  if (phase === 2) return 12 + Math.floor(Math.random() * 15); // 12-26
  return 11 + Math.floor(Math.random() * 13); // 11-23
}

function getPlayerCombatIndex(player) {
  if (!player) return 1;
  const level = Math.max(1, Number(player.level || 1));
  const atk = Math.max(1, Number(player.atk || 1));
  const def = Math.max(0, Number(player.def || 0));
  const learned = getUnlockedSpells(player);
  const offensiveSpellCount = learned.filter((s) => ["elem", "wind"].includes(s.effect)).length;
  const healSpellCount = learned.filter((s) => s.effect === "heal").length;
  // atk/def は装備込みなので、武器防具の成長も自然に反映される
  const base = level * 1.5 + atk * 0.8 + def * 0.65;
  const spellBonus = offensiveSpellCount * 1.3 + healSpellCount * 0.4;
  return base + spellBonus;
}

function getExpectedCombatIndexForEnemy(recLv) {
  const lv = Math.max(1, Number(recLv || 1));
  // レベル相応の想定戦力。終盤ほど1レベル差の影響をやや大きくする。
  return lv * 2.6 + (lv >= 8 ? (lv - 7) * 0.5 : 0);
}

function tuneEnemyForPhase(enemy, player, options = {}) {
  if (!enemy) return enemy;
  const tuned = deepClone(enemy);
  const isBoss = !!options.isBoss || tuned.id === 38;
  const phase = getStoryPhase(player);

  const recLv = getEnemyRecommendedLevel(tuned.id);
  const playerLv = Math.max(1, Number(player?.level || 1));
  const levelGap = playerLv - recLv;
  // 推奨レベル差による微調整（レベル依存を弱く保つため変化量は小さめ）
  const levelScale = levelGap <= -3 ? 1.06 : levelGap >= 4 ? 0.94 : 1.0;

  if (isBoss) {
    tuned.hp = Math.round((tuned.hp || 0) * 0.92);
    tuned.atk = Math.round((tuned.atk || 0) * 0.95);
    tuned.def = Math.round((tuned.def || 0) * 0.95);
    tuned.hp = Math.round(tuned.hp * levelScale);
    tuned.atk = Math.round(tuned.atk * levelScale);
    tuned.def = Math.round(tuned.def * levelScale);
    tuned.recommendedLevel = recLv;
    return tuned;
  }

  if (phase === 1) {
    // 序盤でもワンパン化しにくいよう、耐久を厚めに保つ
    tuned.hp = Math.max(8, Math.round((tuned.hp || 0) * 1.18));
    tuned.atk = Math.max(1, Math.round((tuned.atk || 0) * 0.92));
    tuned.def = Math.max(1, Math.round((tuned.def || 0) * 1.20));
    if (tuned.poisonRate != null) tuned.poisonRate = Math.min(0.16, tuned.poisonRate);
    tuned.magicRateMult = 0.55;
  } else if (phase === 2) {
    tuned.hp = Math.max(10, Math.round((tuned.hp || 0) * 1.12));
    tuned.atk = Math.max(1, Math.round((tuned.atk || 0) * 0.98));
    tuned.def = Math.max(1, Math.round((tuned.def || 0) * 1.10));
    if (tuned.poisonRate != null) tuned.poisonRate = Math.min(0.22, tuned.poisonRate);
    tuned.magicRateMult = 0.85;
  } else {
    // 終盤は火力だけでなく耐久も伸ばし、短期決着になりすぎないようにする
    tuned.hp = Math.max(14, Math.round((tuned.hp || 0) * 1.08));
    tuned.atk = Math.max(1, Math.round((tuned.atk || 0) * 1.05));
    tuned.def = Math.max(2, Math.round((tuned.def || 0) * 1.08));
    if (tuned.poisonRate != null) tuned.poisonRate = Math.min(0.28, tuned.poisonRate);
    tuned.magicRateMult = 1.0;
  }

  tuned.hp = Math.max(3, Math.round(tuned.hp * levelScale));
  tuned.atk = Math.max(1, Math.round(tuned.atk * levelScale));
  tuned.def = Math.max(0, Math.round(tuned.def * levelScale));

  // レベル・装備・呪文習得をまとめた実戦力差で全敵を微調整
  const playerCombat = getPlayerCombatIndex(player);
  const expectedCombat = getExpectedCombatIndexForEnemy(recLv);
  const combatGap = playerCombat - expectedCombat;
  const cappedGap = clamp(combatGap, -8, 12);
  const hpScaleByGap = 1 + cappedGap * 0.035;   // 最大 +42%
  const atkScaleByGap = 1 + cappedGap * 0.018;  // 最大 +21.6%
  const defScaleByGap = 1 + cappedGap * 0.026;  // 最大 +31.2%
  tuned.hp = Math.max(3, Math.round(tuned.hp * hpScaleByGap));
  tuned.atk = Math.max(1, Math.round(tuned.atk * atkScaleByGap));
  tuned.def = Math.max(0, Math.round(tuned.def * defScaleByGap));

  // 推奨レベル帯ごとの下限値を持たせて、どのエリアでも最低限の手応えを維持
  const minHpByRecLv = recLv <= 2 ? 14 : recLv <= 4 ? 20 : recLv <= 7 ? 30 : recLv <= 10 ? 44 : 60;
  const minDefByRecLv = recLv <= 2 ? 2 : recLv <= 4 ? 2 : recLv <= 7 ? 4 : recLv <= 10 ? 6 : 8;
  tuned.hp = Math.max(minHpByRecLv, tuned.hp);
  tuned.def = Math.max(minDefByRecLv, tuned.def);
  tuned.exp = Math.max(1, Math.round((tuned.exp || 1) * (phase >= 3 ? 1.05 : 1)));
  tuned.gold = Math.max(1, Math.round((tuned.gold || 1) * (phase >= 3 ? 1.05 : 1)));
  tuned.recommendedLevel = recLv;
  return tuned;
}

async function bootstrapRuntimeAssets() {
  const supportsImageBitmap = typeof createImageBitmap === "function";
  const requests = [
    fetch("./game-data.json"),
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
  { id:"iron_sword",    name:"アイアンブレード", slot:"weapon",    atkBonus:5,  defBonus:0,  cost:30,  desc:"こうげき+5",        type:"equip" },
  { id:"leather_armor", name:"レザーメイル",     slot:"armor",     atkBonus:0,  defBonus:4,  cost:25,  desc:"まもり+4",          type:"equip" },
  { id:"magic_ring",    name:"ルーンリング",     slot:"accessory", atkBonus:1,  defBonus:1,  cost:40,  desc:"こうげき+1 まもり+1", type:"equip" },
  { id:"herb",          name:"みどりのハーブ",   atkBonus:0, defBonus:0, cost:10, desc:"HP+20", type:"item" },
  { id:"potion",        name:"いやしのしずく",   atkBonus:0, defBonus:0, cost:20, desc:"HP+40", type:"item" },
  { id:"antidote",      name:"どくけしハーブ",   atkBonus:0, defBonus:0, cost:15, desc:"どくを　なおす", type:"item" },
];

const SHOP_ITEMS_T2 = [
  { id:"steel_sword",   name:"スチールブレード", slot:"weapon",    atkBonus:10, defBonus:0,  cost:120, desc:"こうげき+10",       type:"equip" },
  { id:"chain_mail",    name:"チェインメイル",   slot:"armor",     atkBonus:0,  defBonus:7,  cost:100, desc:"まもり+7",          type:"equip" },
  { id:"fire_ring",     name:"フレアリング",     slot:"accessory", atkBonus:2,  defBonus:2,  cost:150, desc:"こうげき+2 まもり+2", type:"equip" },
  { id:"potion",        name:"いやしのしずく",   atkBonus:0, defBonus:0, cost:20, desc:"HP+40", type:"item" },
  { id:"mega_potion",   name:"げんきのエリクサ", atkBonus:0, defBonus:0, cost:50, desc:"HP+80", type:"item" },
];

const SHOP_ITEMS_T3 = [
  { id:"dragon_sword",  name:"ドラゴブレード",   slot:"weapon",    atkBonus:16, defBonus:0,  cost:300, desc:"こうげき+16",       type:"equip" },
  { id:"magic_armor",   name:"ルーンアーマー",   slot:"armor",     atkBonus:0,  defBonus:12, cost:280, desc:"まもり+12",         type:"equip" },
  { id:"holy_charm",    name:"せいれいのおまもり", slot:"accessory", atkBonus:3,  defBonus:5,  cost:350, desc:"こうげき+3 まもり+5", type:"equip" },
  { id:"mega_potion",   name:"げんきのエリクサ", atkBonus:0, defBonus:0, cost:50, desc:"HP+80", type:"item" },
];

// 装備IDから装備データを引くための辞書
const EQUIP_DICT = {};
[...SHOP_ITEMS_T1, ...SHOP_ITEMS_T2, ...SHOP_ITEMS_T3]
  .filter(i => i.type === "equip")
  .forEach(i => { EQUIP_DICT[i.id] = i; });

const SHOP_ITEMS = SHOP_ITEMS_T1; // 後方互換

// ─── ITEMS ────────────────────────────────────────────────────────────────────
const ITEMS = {
  herb:        { name:"みどりのハーブ", heal:20 },
  potion:      { name:"いやしのしずく", heal:40 },
  mega_potion: { name:"げんきのエリクサ", heal:80 },
  antidote:    { name:"どくけしハーブ", heal:0, curePoison:true },
  neko_konnyaku: { name:"ねこねここんにゃく", heal:0 },
  manabi_proof:  { name:"まなびのあかし",   heal:0, keyItem:true },
  ancient_key:   { name:"ふるびたかぎ",     heal:0, keyItem:true },
  dragon_scale:  { name:"ドラゴンのウロコ", heal:0, keyItem:true },
  recorder:      { name:"道聞きリコーダー", heal:0, keyItem:true, usable:true },
};

// ─── NPC PALETTE ──────────────────────────────────────────────────────────────
// key = "row,col" (マップ座標) → body/hair カラー
const NPC_PALETTE = {
  village: {
    "2,20":  { body:"#ddd6fe", hair:"#4338ca" }, // 隠し語り部
    "6,4":   { body:"#34d399", hair:"#065f46" }, // 宿屋主人
    "6,18":  { body:"#60a5fa", hair:"#1e3a8a" }, // 道具屋店主
    "17,5":  { body:"#fbbf24", hair:"#92400e" }, // 子ども
    "15,12": { body:"#f9a8d4", hair:"#9d174d" }, // おしゃべり女性A
    "17,17": { body:"#a78bfa", hair:"#ede9fe" }, // みちびきの老人
    "18,15": { body:"#fda4af", hair:"#7f1d1d" }, // おしゃべり女性B
  },
  town: {
    "5,6": { body:"#78716c", hair:"#1a0a00" }, // ゴラン（武器屋・無骨）
    "5,10": { body:"#0ea5e9", hair:"#c8834a" }, // カモメ（旅商人・海色）
    "12,5": { body:"#6b7280", hair:"#d1d5db" }, // ライモン（元詩人・白髪）
    "12,29": { body:"#374151", hair:"#111827" }, // ミズキ（内向き・暗色）
    "17,9": { body:"#f97316", hair:"#fbbf24" }, // 情報屋（軽装の青年）
    "17,26": { body:"#b45309", hair:"#1a0a00" }, // ヒロシ（ガサツな男・土色）
    "26,6": { body:"#c8834a", hair:"#f59e0b" }, // イヌ（茶色の犬）
    "26,29": { body:"#e879f9", hair:"#831843" }, // ルナ（パリビ・紫ドレス）
    "22,18": { body:"#fca5a5", hair:"#7c2d12" }, // 宿屋女将
    "16,18": { body:"#93c5fd", hair:"#7c3aed" }, // 変な人（井戸の住人）
  },
  artisanVillage: {
    "2,3":  { body:"#f97316", hair:"#431407" }, // 鍛冶職人
    "2,9":  { body:"#60a5fa", hair:"#1e3a8a" }, // 木工職人
    "6,3":  { body:"#34d399", hair:"#065f46" }, // 染織職人
    "6,14": { body:"#facc15", hair:"#713f12" }, // ガラス職人
    "9,8":  { body:"#f472b6", hair:"#831843" }, // 装飾職人
    "11,7": { body:"#a78bfa", hair:"#4c1d95" }, // 時計職人
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
  catCave: {
    "2,8": { body:"#f97316", hair:"#7c2d12" }, // 猫又
  },
  castle: {
    "4,10": { body:"#fde047", hair:"#7c2d12" }, // 王（y=4, x=10）
    "5,13": { body:"#f9a8d4", hair:"#7c2d12" }, // 姫（y=5, x=13）
    "5,8":  { body:"#94a3b8", hair:"#334155" }, // 大臣（y=5, x=8）
    "36,8": { body:"#64748b", hair:"#1e293b" }, // 城門衛兵（左）（y=36, x=8）
    "36,11":{ body:"#64748b", hair:"#1e293b" }, // 城門衛兵（右）（y=36, x=11）
    "34,6": { body:"#475569", hair:"#0f172a" }, // 城門見張り（左）（y=34, x=6）
    "34,13":{ body:"#475569", hair:"#0f172a" }, // 城門見張り（右）（y=34, x=13）
  },
  manabiVillage: {
    "2,2":  { body:"#c084fc", hair:"#581c87" }, // 国語先生（紫・文学）
    "2,10": { body:"#60a5fa", hair:"#1e3a8a" }, // 算数先生（青・論理）
    "5,2":  { body:"#4ade80", hair:"#14532d" }, // 理科先生（緑・自然）
    "5,8":  { body:"#fb923c", hair:"#7c2d12" }, // 社会先生（オレンジ・地図）
    "8,2":  { body:"#facc15", hair:"#713f12" }, // ヨミコ（読書家・黄）
    "8,10": { body:"#e2e8f0", hair:"#64748b" }, // 村の長老（白・グレー）
  },
  nazoVillage: {
    "2,3":  { body:"#fbbf24", hair:"#fffbeb" }, // 仙人マン（金・白）
    "2,9":  { body:"#fb7185", hair:"#fecdd3" }, // はなくん（ピンク）
    "5,2":  { body:"#94a3b8", hair:"#1e293b" }, // 猫くん（グレー）
    "5,8":  { body:"#bae6fd", hair:"#e0f2fe" }, // 雲まん（空色）
    "8,5":  { body:"#1e293b", hair:"#475569" }, // 忍者（黒）
  },
  southShrine: {
    "5,5": { body:"#7c3aed", hair:"#fde68a" }, // 占い婆さん（紫・金）
  },
  catVillage: {
    "2,2": { body:"#f9a8d4", hair:"#7c2d12" },
    "2,5": { body:"#fdba74", hair:"#7c2d12" },
    "2,8": { body:"#fde68a", hair:"#92400e" },
    "8,3": { body:"#93c5fd", hair:"#1e3a8a" },
    "8,6": { body:"#a7f3d0", hair:"#065f46" },
  },
  underground: {
    "2,2":  { body:"#78716c", hair:"#292524" }, // 偵察兵A（灰土色）
    "2,10": { body:"#57534e", hair:"#1c1917" }, // 兵士（濃い灰）
    "8,2":  { body:"#a8a29e", hair:"#44403c" }, // 古老（薄い灰・老齢）
    "12,5": { body:"#b45309", hair:"#451a03" }, // リーダーガイア（土の金・権威）
  },
};

// ─── MAP GENERATION ───────────────────────────────────────────────────────────
function generateMapGrid() {
  const rand = createSeededRandom("147-RPG-WORLD-V3");
  const tiles   = [TILE.GRASS, TILE.FOREST, TILE.WATER, TILE.MOUNTAIN, TILE.SEA, TILE.LAKE, TILE.DESERT];
  const weights = [30, 18, 10, 12, 10, 8, 12];
  const total   = weights.reduce((a, b) => a + b, 0);

  const pickTile = () => {
    let roll = rand() * total;
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

  // ワールド骨格: 大河・海峡・山脈を先に描いて進行を分割する
  const riverBaseX = Math.floor(MAP_SIZE * 0.33);
  for (let y = 1; y < MAP_SIZE - 1; y++) {
    const cx = riverBaseX + Math.round(Math.sin(y / 7) * 2);
    for (let dx = -1; dx <= 1; dx++) {
      const x = cx + dx;
      if (x > 0 && x < MAP_SIZE - 1) grid[y][x] = TILE.WATER;
    }
    if (y % 16 === 8) {
      // 橋は川の中央1マスではなく、両岸までつながる幅で敷く
      for (let dx = -1; dx <= 1; dx++) {
        const x = cx + dx;
        if (x > 0 && x < MAP_SIZE - 1) grid[y][x] = TILE.BRIDGE;
      }
      // 取り付き口（岸）を最低限の陸地にして渡れる状態を保証
      if (cx - 2 > 0) grid[y][cx - 2] = TILE.GRASS;
      if (cx + 2 < MAP_SIZE - 1) grid[y][cx + 2] = TILE.GRASS;
    }
  }

  const seaBaseX = Math.floor(MAP_SIZE * 0.56);
  for (let y = 1; y < MAP_SIZE - 1; y++) {
    const cx = seaBaseX + Math.round(Math.sin(y / 9) * 2);
    for (let dx = -2; dx <= 2; dx++) {
      const x = cx + dx;
      if (x > 0 && x < MAP_SIZE - 1) grid[y][x] = TILE.SEA;
    }
  }
  // 東側へ渡るための固定橋（海峡を岸まで接続）
  const eastBridgeRows = [
    Math.round(MAP_SIZE * 0.44),
    Math.round(MAP_SIZE * 0.74),
  ];
  eastBridgeRows.forEach((yRaw) => {
    const y = Math.max(1, Math.min(MAP_SIZE - 2, yRaw));
    const cx = seaBaseX + Math.round(Math.sin(y / 9) * 2);
    for (let dx = -2; dx <= 2; dx++) {
      const x = cx + dx;
      if (x > 0 && x < MAP_SIZE - 1) grid[y][x] = TILE.BRIDGE;
    }
    if (cx - 3 > 0) grid[y][cx - 3] = TILE.GRASS;
    if (cx + 3 < MAP_SIZE - 1) grid[y][cx + 3] = TILE.GRASS;
  });

  const ridgeBaseY = Math.floor(MAP_SIZE * 0.66);
  for (let x = 1; x < MAP_SIZE - 1; x++) {
    const cy = ridgeBaseY + Math.round(Math.sin(x / 8) * 2);
    for (let dy = -1; dy <= 1; dy++) {
      const y = cy + dy;
      if (y > 0 && y < MAP_SIZE - 1) grid[y][x] = TILE.MOUNTAIN;
    }
  }

  // ラップ移動で抜け道にならないように外周は海へ
  for (let i = 0; i < MAP_SIZE; i++) {
    grid[0][i] = TILE.SEA;
    grid[MAP_SIZE - 1][i] = TILE.SEA;
    grid[i][0] = TILE.SEA;
    grid[i][MAP_SIZE - 1] = TILE.SEA;
  }

  grid[Math.floor(MAP_SIZE/2)][Math.floor(MAP_SIZE/2)] = TILE.GRASS;
  grid[SPECIAL_POS.village.y][SPECIAL_POS.village.x]             = TILE.TOWN;
  grid[SPECIAL_POS.town.y][SPECIAL_POS.town.x]                   = TILE.TOWN;
  grid[SPECIAL_POS.castle.y][SPECIAL_POS.castle.x]               = TILE.TOWN;
  grid[SPECIAL_POS.artisanVillage.y][SPECIAL_POS.artisanVillage.x] = TILE.TOWN;
  grid[SPECIAL_POS.school.y][SPECIAL_POS.school.x]               = TILE.SCHOOL;
  grid[SPECIAL_POS.home.y][SPECIAL_POS.home.x]                   = TILE.HOME;
  grid[SPECIAL_POS.cave.y][SPECIAL_POS.cave.x]                   = TILE.CAVE;
  grid[SPECIAL_POS.catCave.y][SPECIAL_POS.catCave.x]             = TILE.CAVE;
  grid[SPECIAL_POS.manabiVillage.y][SPECIAL_POS.manabiVillage.x] = TILE.TOWN;
  grid[SPECIAL_POS.nazoVillage.y][SPECIAL_POS.nazoVillage.x]    = TILE.TOWN;
  grid[SPECIAL_POS.catVillage.y][SPECIAL_POS.catVillage.x]      = TILE.TOWN;
  grid[SPECIAL_POS.southShrine.y][SPECIAL_POS.southShrine.x]   = TILE.TOWN;
  grid[SPECIAL_POS.shipyard.y][SPECIAL_POS.shipyard.x]         = TILE.TOWN;
  grid[SPECIAL_POS.airDock.y][SPECIAL_POS.airDock.x]           = TILE.TOWN;
  grid[SPECIAL_POS.shipReef.y][SPECIAL_POS.shipReef.x]         = TILE.TOWN;
  grid[SPECIAL_POS.skySanctum.y][SPECIAL_POS.skySanctum.x]     = TILE.TOWN;
  // セーブポイント（雪ゾーン外に固定）
  SAVE_POINT_POS.forEach(({ y, x }) => { grid[y][x] = TILE.GRASS; });

  // 重要地点の到達保証（海・川・山に埋もれないよう周囲を陸地化）
  const ensureLandAccess = (pos, radius = 1) => {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = pos.x + dx;
        const y = pos.y + dy;
        if (x <= 0 || y <= 0 || x >= MAP_SIZE - 1 || y >= MAP_SIZE - 1) continue;
        if (dx === 0 && dy === 0) continue;
        if ([TILE.SEA, TILE.LAKE, TILE.WATER, TILE.MOUNTAIN].includes(grid[y][x])) {
          grid[y][x] = TILE.GRASS;
        }
      }
    }
  };
  ensureLandAccess(SPECIAL_POS.shipyard, 2);
  ensureLandAccess(SPECIAL_POS.southShrine, 1);
  // 中心タイルは町扱いを維持
  grid[SPECIAL_POS.shipyard.y][SPECIAL_POS.shipyard.x] = TILE.TOWN;
  // 船着き場の南側に接岸可能な海を固定（水辺がないと乗船できないため）
  for (let dy = 3; dy <= 6; dy++) {
    const sy = SPECIAL_POS.shipyard.y + dy;
    for (let dx = -1; dx <= 1; dx++) {
      const sx = SPECIAL_POS.shipyard.x + dx;
      if (sx >= 1 && sy < MAP_SIZE - 1 && ![TILE.TOWN, TILE.SCHOOL, TILE.HOME, TILE.CAVE].includes(grid[sy][sx])) {
        grid[sy][sx] = TILE.SEA;
      }
    }
  }
  grid[SPECIAL_POS.southShrine.y][SPECIAL_POS.southShrine.x] = TILE.TOWN;

  // ─ 雪原生成（洞窟周辺をSNOWタイルで覆う）────────────────────────────────
  const FIXED_TILES = new Set([TILE.SEA, TILE.LAKE, TILE.WATER, TILE.TOWN, TILE.SCHOOL, TILE.HOME, TILE.CAVE]);
  const cx = SPECIAL_POS.cave.x, cy = SPECIAL_POS.cave.y;
  for (let y = 0; y < MAP_SIZE; y++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      if (FIXED_TILES.has(grid[y][x])) continue;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (dist <= Math.round(13 * WORLD_SCALE)) grid[y][x] = TILE.SNOW;
      else if (dist <= Math.round(20 * WORLD_SCALE) && y > Math.round(26 * WORLD_SCALE) && x > Math.round(28 * WORLD_SCALE) && rand() < 0.50) grid[y][x] = TILE.SNOW;
    }
  }
  grid[SPECIAL_POS.onsen.y][SPECIAL_POS.onsen.x] = TILE.ONSEN;

  // ─ 進行ゲートの強制配置 ───────────────────────────────────────────────────
  const inBounds = (x, y) => x >= 1 && y >= 1 && x < MAP_SIZE - 1 && y < MAP_SIZE - 1;
  const paintRing = (pos, radius, tile) => {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
        const x = pos.x + dx;
        const y = pos.y + dy;
        if (!inBounds(x, y)) continue;
        // 重要地点の中心は上書きしない
        if (x === pos.x && y === pos.y) continue;
        if ([TILE.TOWN, TILE.SCHOOL, TILE.HOME, TILE.CAVE, TILE.ONSEN].includes(grid[y][x])) continue;
        grid[y][x] = tile;
      }
    }
  };
  const carveAirDockApproach = () => {
    // 飛行船ドックは「船で接岸して上陸」できるよう西側に潮の回廊を固定する。
    const y = SPECIAL_POS.airDock.y;
    const xs = [SPECIAL_POS.airDock.x - 1, SPECIAL_POS.airDock.x - 2, SPECIAL_POS.airDock.x - 3];
    xs.forEach((x) => {
      if (!inBounds(x, y)) return;
      if ([TILE.TOWN, TILE.SCHOOL, TILE.HOME, TILE.CAVE, TILE.ONSEN].includes(grid[y][x])) return;
      grid[y][x] = TILE.SEA;
    });
    // 接岸地点の北側は草地にして、上陸後の進行方向を読み取りやすくする。
    const dockEdgeX = SPECIAL_POS.airDock.x - 1;
    const dockEdgeY = y - 1;
    if (inBounds(dockEdgeX, dockEdgeY) && ![TILE.TOWN, TILE.CAVE].includes(grid[dockEdgeY][dockEdgeX])) {
      grid[dockEdgeY][dockEdgeX] = TILE.GRASS;
    }
  };

  // Area4: 船専用エリア（海で囲った島）
  [SPECIAL_POS.manabiVillage, SPECIAL_POS.nazoVillage, SPECIAL_POS.catVillage, SPECIAL_POS.shipReef].forEach((pos) => {
    paintRing(pos, 1, TILE.SEA);
    paintRing(pos, 2, TILE.SEA);
  });

  // Area5: 飛行船ドック（山脈の高台）
  paintRing(SPECIAL_POS.airDock, 1, TILE.MOUNTAIN);
  paintRing(SPECIAL_POS.airDock, 2, TILE.MOUNTAIN);
  grid[SPECIAL_POS.airDock.y][SPECIAL_POS.airDock.x] = TILE.TOWN;
  carveAirDockApproach();

  // Area6: 最終洞窟（山脈に囲まれ、飛行船でのみ到達）
  paintRing(SPECIAL_POS.cave, 1, TILE.MOUNTAIN);
  paintRing(SPECIAL_POS.cave, 2, TILE.MOUNTAIN);
  paintRing(SPECIAL_POS.cave, 3, TILE.MOUNTAIN);
  grid[SPECIAL_POS.cave.y][SPECIAL_POS.cave.x] = TILE.CAVE;

  // Area7: 天空祠（飛行船で立ち寄る寄り道ダンジョン）
  paintRing(SPECIAL_POS.skySanctum, 1, TILE.MOUNTAIN);
  paintRing(SPECIAL_POS.skySanctum, 2, TILE.MOUNTAIN);
  grid[SPECIAL_POS.skySanctum.y][SPECIAL_POS.skySanctum.x] = TILE.TOWN;

  return grid;
}

const MAP_GRID = generateMapGrid();

/** 新ゲーム開始位置：はじまりの村の周囲で海・湖以外。草原→森→他の順で優先。 */
function findNewGameStartPosition() {
  const vx = SPECIAL_POS.village.x;
  const vy = SPECIAL_POS.village.y;
  const tileRank = (t) => (
    t === TILE.GRASS ? 0
      : t === TILE.FOREST ? 1
        : t === TILE.DESERT ? 2
          : t === TILE.MOUNTAIN ? 3
            : t === TILE.BRIDGE ? 4
              : t === TILE.WATER ? 5
                : t === TILE.TOWN ? 6
                  : (t === TILE.SCHOOL || t === TILE.HOME || t === TILE.CAVE) ? 7
                    : 8
  );
  let best = { x: vx, y: Math.min(vy + 1, MAP_SIZE - 1) };
  let bestRank = 99;
  for (let ring = 1; ring <= 12; ring++) {
    for (let dy = -ring; dy <= ring; dy++) {
      for (let dx = -ring; dx <= ring; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
        const x = vx + dx;
        const y = vy + dy;
        if (x < 0 || y < 0 || x >= MAP_SIZE || y >= MAP_SIZE) continue;
        if (x === vx && y === vy) continue;
        const t = MAP_GRID[y][x];
        if (t === TILE.SEA || t === TILE.LAKE) continue;
        const r = tileRank(t);
        if (r < bestRank) {
          bestRank = r;
          best = { x, y };
          if (r === 0) return best;
        }
      }
    }
    if (bestRank <= 1) return best;
  }
  return best;
}

// ─── SIGN MAP（道標：各特殊地点の近傍に1本だけ配置）──────────────────────────
// key="y,x" → { name, arrow }
const SIGN_MAP = (() => {
  const signs = {};
  const locs = [
    { pos: SPECIAL_POS.village,       name: 'はじまりの村' },
    { pos: SPECIAL_POS.town,          name: 'いずみの街' },
    { pos: SPECIAL_POS.artisanVillage,name: '職人の村' },
    { pos: SPECIAL_POS.school,        name: 'まなびの学校' },
    { pos: SPECIAL_POS.home,          name: 'ながれぼしの家' },
    { pos: SPECIAL_POS.cave,          name: 'くらやみの洞窟' },
    { pos: SPECIAL_POS.catCave,       name: '猫影の洞窟' },
    { pos: SPECIAL_POS.manabiVillage, name: 'まなびの村' },
    { pos: SPECIAL_POS.nazoVillage,   name: '謎の村' },
    { pos: SPECIAL_POS.catVillage,    name: '猫の村' },
    { pos: SPECIAL_POS.onsen,         name: '雪原の温泉' },
    { pos: SPECIAL_POS.southShrine,   name: '南の祠' },
    { pos: SPECIAL_POS.shipyard,      name: '海鳴りの船着き場' },
    { pos: SPECIAL_POS.airDock,       name: '風読みの飛行船ドック' },
    { pos: SPECIAL_POS.shipReef,      name: '潮騒の環礁' },
    { pos: SPECIAL_POS.skySanctum,    name: '天空の祠' },
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

function buildTownRows() {
  const width = 36;
  const height = 34;
  const rows = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) =>
      x === 0 || y === 0 || x === width - 1 || y === height - 1 ? "W" : ".",
    ),
  );
  const put = (x, y, ch) => {
    if (x < 1 || y < 1 || x >= width - 1 || y >= height - 1) return;
    rows[y][x] = ch;
  };
  const lineH = (x1, x2, y, ch) => { for (let x = x1; x <= x2; x++) put(x, y, ch); };
  const lineV = (x, y1, y2, ch) => { for (let y = y1; y <= y2; y++) put(x, y, ch); };
  const frame = (x1, y1, x2, y2, ch) => {
    lineH(x1, x2, y1, ch); lineH(x1, x2, y2, ch); lineV(x1, y1, y2, ch); lineV(x2, y1, y2, ch);
  };

  // 北区マーケット（左右）
  frame(2, 2, 13, 9, "W");
  frame(22, 2, 33, 9, "W");
  lineH(23, 32, 4, "C");
  lineH(3, 12, 7, "S");
  lineH(23, 32, 7, "S");
  put(7, 9, ".");    // 左店ドア
  put(28, 9, ".");   // 右店ドア

  // 中央大通り
  for (let y = 1; y <= 32; y++) {
    put(17, y, ".");
    put(18, y, ".");
  }
  // 街灯（中央通り）
  [10, 20, 29].forEach((y) => {
    put(16, y, "F");
    put(19, y, "F");
  });

  // 井戸の広場（泉の街らしさ）
  frame(14, 13, 21, 19, "W");
  put(17, 16, "F");
  put(18, 16, "F");
  lineH(15, 20, 15, "C");
  lineH(15, 20, 17, "C");
  // 井戸まわりの花壇
  put(15, 14, "D");
  put(20, 14, "D");
  put(15, 18, "D");
  put(20, 18, "D");

  // 西側住宅区
  frame(2, 11, 12, 18, "W");
  lineH(3, 11, 13, "B");
  put(7, 18, ".");

  // 東側住宅区
  frame(23, 11, 33, 18, "W");
  lineH(24, 32, 13, "B");
  put(28, 18, ".");

  // 南西: 畑エリア
  frame(2, 21, 15, 30, "W");
  lineH(4, 13, 23, "S");
  lineH(4, 13, 25, "S");
  lineH(4, 13, 27, "S");
  lineH(4, 13, 29, "S");
  put(8, 21, ".");

  // 南東: 公園エリア（ベンチと噴水）
  frame(20, 21, 33, 30, "W");
  lineH(22, 31, 23, "B");
  lineH(22, 31, 28, "B");
  put(26, 26, "F");
  put(27, 26, "F");
  lineH(22, 31, 25, "D"); // 花壇
  lineH(22, 31, 27, "D"); // 花壇
  put(22, 22, "F");
  put(31, 22, "F");
  put(22, 29, "F");
  put(31, 29, "F");
  put(27, 21, ".");

  // 住民と宝箱・出口
  put(6, 5, "N");    // ゴラン
  put(10, 5, "N");   // カモメ
  put(5, 12, "N");   // ライモン
  put(29, 12, "N");  // ミズキ
  put(9, 17, "N");   // 情報屋
  put(26, 17, "N");  // ヒロシ
  put(18, 22, "N");  // 宿屋女将
  put(6, 26, "N");   // イヌ
  put(29, 26, "N");  // ルナ
  put(18, 16, "N");  // 変な人（井戸の近く）
  put(6, 24, "T");
  put(28, 24, "T");
  put(18, 32, "E");

  return rows.map((row) => row.join(""));
}
const TOWN_IMAP = parseIntMap(buildTownRows());

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
function buildCastleRows() {
  const width = 20;
  const height = 45; // 旧マップ比で縦を約3倍
  const rows = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) =>
      x === 0 || y === 0 || x === width - 1 || y === height - 1 ? "W" : ".",
    ),
  );
  const put = (x, y, ch) => {
    if (x < 1 || y < 1 || x >= width - 1 || y >= height - 1) return;
    rows[y][x] = ch;
  };
  const lineH = (x1, x2, y, ch) => {
    for (let x = x1; x <= x2; x++) put(x, y, ch);
  };
  const lineV = (x, y1, y2, ch) => {
    for (let y = y1; y <= y2; y++) put(x, y, ch);
  };
  const frame = (x1, y1, x2, y2, ch) => {
    lineH(x1, x2, y1, ch);
    lineH(x1, x2, y2, ch);
    lineV(x1, y1, y2, ch);
    lineV(x2, y1, y2, ch);
  };

  // 城門まわり（手前）
  frame(4, 33, 15, 41, "C");
  frame(6, 35, 13, 39, "C");
  lineV(9, 39, 41, "C");
  lineV(10, 39, 41, "C");
  lineV(11, 39, 41, "C");
  put(10, 42, "E");

  // 長い中央廊下（両脇は城ブロック）
  lineV(6, 8, 38, "C");
  lineV(13, 8, 38, "C");
  lineH(7, 12, 8, "C");
  lineH(7, 12, 38, "C");

  // 松明（廊下沿い）
  [10, 14, 18, 22, 26, 30, 34].forEach((y) => {
    put(5, y, "F");
    put(14, y, "F");
  });

  // 玉座前の謁見エリア（奥）
  frame(4, 2, 15, 8, "C");
  lineH(7, 12, 3, "B"); // 奥の飾り帯
  lineH(7, 12, 7, "B");
  put(10, 4, "N"); // 王（奥の中央）
  put(13, 5, "N"); // 姫（王の右）
  put(8, 5, "N");  // 大臣（王の近く）

  // 城門の衛兵
  put(8, 36, "N");
  put(11, 36, "N");
  put(6, 34, "N");
  put(13, 34, "N");

  // 中央導線を確保（入口→回廊→玉座）
  for (let y = 4; y <= 42; y++) put(10, y, ".");
  for (let y = 9; y <= 41; y++) {
    put(9, y, rows[y][9] === "N" ? "N" : ".");
    put(11, y, rows[y][11] === "N" ? "N" : ".");
  }
  put(10, 4, "N");
  put(13, 5, "N");
  put(8, 5, "N");
  put(8, 36, "N");
  put(11, 36, "N");
  put(6, 34, "N");
  put(13, 34, "N");
  put(10, 42, "E"); // 中央通路ループで上書きされた出口を再配置

  return rows.map((row) => row.join(""));
}
const CASTLE_IMAP = parseIntMap(buildCastleRows());

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
function buildVillageRows() {
  const width = 24;
  const height = 24;
  const rows = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) =>
      x === 0 || y === 0 || x === width - 1 || y === height - 1 ? "W" : ".",
    ),
  );
  const put = (x, y, ch) => {
    if (x < 1 || y < 1 || x >= width - 1 || y >= height - 1) return;
    rows[y][x] = ch;
  };
  const lineH = (x1, x2, y, ch) => { for (let x = x1; x <= x2; x++) put(x, y, ch); };
  const lineV = (x, y1, y2, ch) => { for (let y = y1; y <= y2; y++) put(x, y, ch); };
  const frame = (x1, y1, x2, y2, ch) => {
    lineH(x1, x2, y1, ch); lineH(x1, x2, y2, ch); lineV(x1, y1, y2, ch); lineV(x2, y1, y2, ch);
  };

  // 左: 宿屋 / 右: 武器防具屋
  frame(2, 3, 10, 9, "W");
  frame(13, 3, 21, 9, "W");
  lineH(3, 9, 5, "C");
  lineH(14, 20, 5, "C");
  lineH(3, 9, 7, "S");
  lineH(14, 20, 7, "S");
  put(6, 9, ".");
  put(17, 9, ".");

  // 南側の民家区画
  frame(2, 14, 9, 20, "W");
  frame(14, 14, 21, 20, "W");
  put(5, 14, ".");
  put(17, 14, ".");

  // 中央の小川と広場
  for (let x = 6; x <= 17; x++) put(x, 12, "F");
  put(12, 11, "F");

  // NPC・宝箱・出口
  put(20, 2, "N");  // 隠し語り部
  put(4, 6, "N");   // 宿屋主人
  put(18, 6, "N");  // 店主
  put(5, 17, "N");  // 子ども
  put(12, 15, "N"); // おしゃべり女性A（通路側）
  put(17, 17, "N"); // 老人
  put(15, 18, "N"); // おしゃべり女性B（通路側）
  put(8, 8, "T");
  put(15, 8, "T");
  put(11, 22, "E");

  return rows.map((row) => row.join(""));
}
const VILLAGE_IMAP = parseIntMap(buildVillageRows());

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
  "W.N.......NW",  // row 8: [8,2]=ヨミコ（読書家）  [8,10]=長老
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

// ─── 地下フィールド（ガイア団の地下基地）────────────────────────────────────────
// 温泉の底を抜けて落下した先。地底人（ガイア団）の集落。
const UNDERGROUND_IMAP = parseIntMap([
  "WWWWWWWWWWWWWW",  // row 0
  "W............W",  // row 1
  "W.N.......N..W",  // row 2: [2,2]=偵察兵A  [2,10]=兵士
  "W............W",  // row 3
  "W.....F......W",  // row 4: [4,6]=地底の泉
  "W............W",  // row 5
  "WWWWW.WWWWWWWW",  // row 6: 仕切り（gap at col 5）
  "W............W",  // row 7
  "W.N..........W",  // row 8: [8,2]=古老
  "W............W",  // row 9
  "WWWWWWWWWWWW.W",  // row 10: 仕切り（gap at col 12）
  "W............W",  // row 11
  "W....N..T....W",  // row 12: [12,5]=リーダーガイア  [12,8]=宝箱
  "W.....E......W",  // row 13: 出口
  "WWWWWWWWWWWWWW",  // row 14
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

// ─── 職人の村マップ（広めの工房街）──────────────────────────────────────────────
const ARTISAN_VILLAGE_IMAP = parseIntMap([
  "WWWWWWWWWWWWWWWWWWWW",
  "W..CCCC....CCCC....W",
  "W..N..C..N..C......W",
  "W..CCCC....CCCC....W",
  "W..................W",
  "W.SSSS....SSSS.....W",
  "W..N.....F....N....W",
  "W..................W",
  "W...CCCCCCCCC......W",
  "W...C...N...C......W",
  "W...CCCCCCCCC......W",
  "W.......N..........W",
  "W..........T.......W",
  "W...............E..W",
  "W..................W",
  "WWWWWWWWWWWWWWWWWWWW",
]);

// ─── 猫影の洞窟（猫又の中ボス洞窟）────────────────────────────────────────────
const CAT_CAVE_FLOORS = {
  1: parseIntMap([
    "WWWWWWWWWWWW",
    "W....V.....W",
    "W..........W",
    "W..S...F...W",
    "W..........W",
    "WWWWW.WWWWWW",
    "W..........W",
    "W....T.....W",
    "W..........W",
    "W....E.....W",
    "WWWWWWWWWWWW",
  ]),
  2: parseIntMap([
    "WWWWWWWWWWWW",
    "W....U.....W",
    "W.....F....W",
    "W..S...N...W",
    "W..........W",
    "W....TT....W",
    "WWWWW.WWWWWW",
    "W..........W",
    "W....F.....W",
    "WWWWWWWWWWWW",
  ]),
};
const CAT_CAVE_IMAP = CAT_CAVE_FLOORS[1];

// ─── 南の祠マップ ───────────────────────────────────────────────────────────────
const SOUTH_SHRINE_IMAP = parseIntMap([
  "WWWWWWWWWWWW",  // row 0
  "W..........W",  // row 1
  "W....B.....W",  // row 2: [2,5]=石碑
  "W....F.....W",  // row 3: [3,5]=御神水の泉
  "W..........W",  // row 4
  "W....N.....W",  // row 5: [5,5]=占い婆さん
  "W..........W",  // row 6
  "W..........W",  // row 7
  "W..........W",  // row 8
  "W....E.....W",  // row 9: 出口
  "WWWWWWWWWWWW",  // row 10
]);
const SHIP_REEF_IMAP = parseIntMap([
  "WWWWWWWWWWWW",
  "W..........W",
  "W....N.....W",
  "W..........W",
  "W..F.......W",
  "W.....T....W",
  "W..........W",
  "W....T.....W",
  "W..........W",
  "W....E.....W",
  "WWWWWWWWWWWW",
]);
const SKY_SANCTUM_IMAP = parseIntMap([
  "WWWWWWWWWWWW",
  "W....B.....W",
  "W..T...T...W",
  "W..........W",
  "W....N.....W",
  "W..........W",
  "W..F.......W",
  "W..........W",
  "W.......T..W",
  "W....E.....W",
  "WWWWWWWWWWWW",
]);

const INTERIOR_MAPS = {
  village: VILLAGE_IMAP, town: TOWN_IMAP, school: SCHOOL_IMAP,
  castle: CASTLE_IMAP,
  artisanVillage: ARTISAN_VILLAGE_IMAP,
  catCave: CAT_CAVE_IMAP,
  cave: CAVE_IMAP, manabiVillage: MANABI_VILLAGE_IMAP, nazoVillage: NAZO_VILLAGE_IMAP,
  catVillage: CAT_VILLAGE_IMAP, underground: UNDERGROUND_IMAP,
  southShrine: SOUTH_SHRINE_IMAP,
  shipReef: SHIP_REEF_IMAP, skySanctum: SKY_SANCTUM_IMAP,
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
      "…………。",
      "……よく　ここまで　来た。",
      "おまえが　希望を　持ち込もうとしていることは……",
      "ずっと　見えていた。",
      "だが——",
      "希望は　おそれの　裏側に　ある。",
      "そのことを……　おまえは　知っているか？",
      "……知っているのなら。",
      "この　闇を　抜けてみせろ。",
      "ドランゴが　ゆっくりと　振り返った……！",
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

const CAT_CAVE_EVENTS_BY_FLOOR = {
  1: {
    "3,6": { messages: [
      "湿った壁から　雫が落ちる音が　続いている。",
      "ひんやりした空気で　体が　引き締まった。",
      "HPが　4　回復した！",
    ], heal: 4 },
  },
  2: {
    "2,5": { messages: [
      "青白い湧き水が　ゆらめいている。",
      "ひとくち飲んで　気持ちが落ち着いた。",
      "HPが　6　回復した！",
    ], heal: 6 },
    "3,7": { messages: [
      "洞窟の陰で　猫又が　こちらを見ている……！",
      "素早い爪が　ひらめいた！",
    ], enemyId: 39, mood: "warn", fixedNpc: true },
    "8,5": { messages: [
      "天井から落ちる雫が　青く光っている。",
      "HPが　2　回復した！",
    ], heal: 2, mood: "hope" },
  },
};

const CAVE_TREASURES_BY_FLOOR = {
  1: {
    "4,8": { id: "cave:1:4,8", itemId: "antidote", amount: 1, messages: ["宝箱を　あけた！", "どくけしハーブを　てにいれた！"] },
  },
  2: {
    "3,4": { id: "cave:2:3,4", itemId: "mega_potion", amount: 1, messages: ["宝箱を　あけた！", "げんきのエリクサを　てにいれた！"] },
  },
  3: {},
};

const CAT_CAVE_TREASURES_BY_FLOOR = {
  1: {
    "7,5": { id: "catCave:1:7,5", itemId: "potion", amount: 1, messages: ["苔むした宝箱を　あけた！", "いやしのしずくを　てにいれた！"] },
  },
  2: {
    "5,4": { id: "catCave:2:5,4", gold: 22, messages: ["石の小箱を　あけた！", "22ゴールドを　てにいれた！"] },
    "5,7": { id: "catCave:2:5,7", itemId: "antidote", amount: 1, messages: ["石の小箱を　あけた！", "どくけしハーブを　てにいれた！"] },
  },
};

// key = "y,x"
const INTERIOR_EVENTS = {
  // ─── はじまりの村 ────────────────────────────────────────────────────────────
  village: {
    "2,20": { messages: [
      "フードの語り部：「……短い旅でも、心は動く。",
      "この世界は　迷いを　越えた者に　だけ　やさしい。」",
    ] },
    "6,4": { messages: [
      "宿屋の主人：「いらっしゃい、旅人さん。",
      "ひと晩　休んでいくかい？",
      "ゆっくり休んで、HPとMPが　全回復した！",
    ], heal: 999, inn: true, fixedNpc: true },
    "6,18": { messages: [
      "道具屋の店主：「武器と防具、旅の基本だよ。",
      "カウンター越しに　気軽に見ていって！",
    ], shop: true, fixedNpc: true },
    "11,12": { messages: [
      "小さな泉が　ある。",
      "飲んでみると　体が　温かくなった。",
      "HPが　8　回復した！",
    ], heal: 8 },
    "17,5": { messages: [
      "子ども：「ねえ！　旅人さんって　強い？",
      "ドランゴって　どんな顔してるの？",
      "ぼくも　いつか　旅に　出るんだ！",
      "……でも　まだ　こわくて。",
      "きみを　見てたら　少し　勇気が　出てきた！",
      "HPが　3　回復した！",
    ], heal: 3, mood: "hope" },
    "15,12": { messages: [
      "旅の女性：「あっ、勇者さんだ。",
      "きょうの献立、パンにするか　おにぎりにするかで迷ってるの。」",
      "「世界が大変でも　お腹はすくのよね〜。」",
    ], mood: "hope" },
    "17,17": { messages: [
      "みちびきの　おじいさん：「戻ってきたか。",
      "街道は　まだ危ない。焦らず　育っていけ。",
      "次は　東のいずみの街で　情報を集めるといいぞ。",
    ], mood: "warn" },
    "18,15": { messages: [
      "旅の女性：「さっきまで　ここに猫がいた気がするの。",
      "……でも気のせいかも。たぶん風だったわ。」",
      "「まあ　細かいことは　気にしないのが一番！」",
    ] },
  },
  town: {
    // 武器屋 ゴラン（無口で無骨、でも本質を突く）
    "5,6": { messages: [
      "ゴラン（武器屋）：「……旅人か。",
      "おまえ　その装備じゃ　ドランゴには　勝てん。",
      "まあ　俺の店の武器を　買っていけ。",
      "カウンターで　買えるぞ。",
    ], shop: true, fixedNpc: true },
    // カウンターで話す = 武器屋として機能
    // カモメ（陽気な旅商人、情報屋）
    "5,10": { messages: [
      "カモメ（旅商人）：「よお旅人！　あんたも　ドランゴを　倒しに来たか？",
      "東の洞窟に　住んでるって噂だぜ。",
      "俺？　俺は戦わんよ。生きてる方が　商売になるからな！　ハハハ！",
      "でも……本当に　この世界を　救えるのは　あんたしかいない気がする。",
      "なんとなくな。直感だ。",
    ] },
    // ライモン（山月記スタイル：かつては偉大だった詩人、今は落ちぶれ）
    "12,5": { messages: [
      "ライモン（老人）：「……詩人だった頃の私は　もっと　声が大きかった。",
      "ドランゴが　この世界を　支配してから……",
      "人々の　笑い声が　消えた。歌が　消えた。",
      "私の言葉も　届かなくなった。",
      "……だが　勇者よ。おまえの　足音には　詩がある。",
      "行け。私には　もう　行けないが。",
    ], mood: "sad" },
    // ミズキ（太宰治スタイル：自己否定、でも深い優しさ）
    "12,29": { messages: [
      "ミズキ：「……。",
      "どうせ　僕には　何もできない。",
      "ドランゴを　倒す勇気なんて　ない。",
      "……でも。",
      "あなたみたいな人が　いてくれるなら。",
      "少しだけ　この世界も　悪くないかと　思えてくる。",
    ], mood: "sad" },
    // 路地の情報屋（警告役）
    "17,9": { messages: [
      "情報屋：「おっと、旅人さん。",
      "洞窟の奥は　気をつけたほうがいい。",
      "ドランゴは　おそれを　食って　大きくなるって噂だ。",
      "逆に　おそれなければ　小さくなる……らしいぜ。」",
    ], mood: "warn" },
    // ヒロシ（ガサツだが義侠心がある）
    "17,26": { messages: [
      "ヒロシ（がっちり男）：「おう！　旅人か！",
      "俺も　ドランゴぶっ殺しに行こうとしたんだけどよ、",
      "なんか　足がもつれてコケてよ。恥ずかしくてよ。やめた。",
      "でもよ、マジで　頼むわ。",
      "俺の娘が　ドランゴのせいで　笑わなくなったんだ。",
      "……頼むな。本当に。",
    ], mood: "sad" },
    // イヌ（犬らしい全力さ、シンプルな応援）
    "26,6": { messages: [
      "イヌ：「わんわん！",
      "わん　わわん！",
      "……（しっぽを　ぶんぶん　振っている）",
      "なんだか　元気が　出てきた。",
      "HPが　3　回復した！",
    ], heal: 3 },
    // ルナ（パリジェンヌ風、軽薄そうで実は鋭い）
    "26,29": { messages: [
      "ルナ（おしゃれな女）：「あら、旅人じゃないの。珍しいわ。",
      "ドランゴって　アクセサリーとか　持ってるのかしら。",
      "なんかキラキラしてそう。",
      "……冗談よ。でも本気でも　あるわ。",
      "世界が　暗くなると　おしゃれも　できないの。",
      "はやく　終わらせてきてよね。",
    ] },
    "22,18": { messages: [
      "宿屋の女将：「旅人さん、顔色がわるいよ。",
      "うちで休んでいきな。HPとMPを　整えておいき！",
    ], heal: 999, inn: true, fixedNpc: true },
    "16,18": { messages: [
      "逆立ち学者：「やあ、わたしは　逆立ちでしか歩かない学者だ。",
      "朝は井戸に向かって『今日は右回転！』と叫ぶと　運が上がるらしい。",
      "根拠？　ない！　でも　けっこう当たるんだよね。」",
    ], mood: "hope", fixedNpc: true },
  },
  artisanVillage: {
    "2,3": { messages: [
      "鍛冶職人ガンテツ：「刃は　振るう人間の心を映すんだ。",
      "迷いがある日は　重く、覚悟の日は　軽い。",
      "必要なら　ここの品を見ていきな。」",
    ], shop: true, shopItems: "T2", fixedNpc: true },
    "2,9": { messages: [
      "木工職人ヤチヨ：「橋も机も　一本の木から始まるんだよ。",
      "焦って削ると　すぐ割れる。",
      "旅も　同じさ。急ぐ時ほど　手順を大事にね。」",
    ], fixedNpc: true },
    "6,3": { messages: [
      "染織職人アサギ：「糸は弱く見えて、束ねると強いんだ。",
      "仲間の言葉も　同じだよ。",
      "ほどけた心を　ちゃんと結び直しておいで。」",
    ], mood: "hope", fixedNpc: true },
    "6,14": { messages: [
      "ガラス職人トウカ：「熱と冷えの　境目でしか　美しい形は生まれない。",
      "苦しい時期は　割れる前の　大事な時間さ。」",
    ], fixedNpc: true },
    "9,8": { messages: [
      "装飾職人ルリ：「小さな飾りが　武具の気配を変えるの。",
      "見た目を整えるって　心の向きも整えることなんだよ。」",
      "HPが　6　回復した！",
    ], heal: 6, mood: "hope", fixedNpc: true },
    "11,7": { messages: [
      "時計職人ジク：「時は止まらないが、刻み方は選べる。",
      "君の30分は　君だけのものだ。大事に使いなさい。」",
    ], fixedNpc: true },
    "6,9": { messages: [
      "工房街の　湧き水だ。",
      "焼けた喉が　すっと落ち着いた。",
      "HPが　10　回復した！",
    ], heal: 10 },
  },
  cave: {
    // 最奥の謎の存在（ボス戦トリガー）
    "1,5": { messages: [
      "……。",
      "…………。",
      "……よく　ここまで　来た。",
      "おまえが　希望を　持ち込もうとしていることは……",
      "ずっと　見えていた。",
      "だが——",
      "希望は　おそれの　裏側に　ある。",
      "そのことを……　おまえは　知っているか？",
      "……知っているのなら。",
      "この　闇を　抜けてみせろ。",
      "ドランゴが　ゆっくりと　振り返った……！",
    ], boss: true, mood: "warn" },
    // 古い石碑（隣接して調べる）
    "6,8": { messages: [
      "古い　石碑が　ある。",
      "『ちからは　おそれを　こえた　さきに　ある』",
      "……だれが　刻んだのか　わからない。",
    ], mood: "hope" },
    // 地下の泉（上に立って調べる）
    "6,5": { messages: [
      "地の底から　湧き出る　冷たい泉。",
      "飲んでみた。",
      "なぜか　気持ちが　落ち着いた。",
      "HPが　5　回復した！",
    ], heal: 5, mood: "hope" },
    // 道に迷った冒険者
    "9,2": { messages: [
      "ぼろぼろの　冒険者：「……き、きみか。",
      "この洞窟は　普通じゃない。",
      "奥に進むほど……気が遠くなる。",
      "……俺の装備、持ってけ。俺には　もう　必要ない。",
      "代わりに……　倒してきてくれ。頼む。",
    ], shop: true, shopItems: "T3", mood: "sad" },
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
    // 小5の読書家
    "8,2": { messages: [
      "ヨミコ（読書家）：「あ、旅人だ！　本、読んでる？",
      "わたし、ここで　ずっと　本を　読んでるの。",
      "好きな本は　『銀河鉄道の夜』と　『ハチドリのひとしずく』。",
      "「自分にできる　小さなことを　やり続けること」って　いいよね。",
      "旅も　一歩ずつ、だよ。　がんばって！",
      "HPが　10　回復した！",
    ], heal: 10 },
    // 村の長老
    "8,10": { messages: [
      "長老：「……よく　来た。ここは　世界の　果て。",
      "算数も　国語も　理科も　社会も……",
      "全ては　「知らないことへの　恐れ」を　なくすための　旅だ。",
      "学ぶとは　恐れを　越えること。",
      "おまえは　すでに　勇者だ。",
      "この　「まなびのあかし」を　持っていけ。",
      "……世界の　果てまで　来た　証じゃ。",
    ], giveItem: "manabi_proof" },
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
  // ─── 地下フィールド（ガイア団基地）────────────────────────────────────────
  underground: {
    "2,2": { messages: [
      "偵察兵：「……！　人間か？！　いや……　悪い気配じゃない。」",
      "ここは　地底に住む者たちの　隠れ家だ。",
      "落とし穴から　来たんだろ。",
      "温泉の底が　抜けることは　知られていない。　安心しろ。",
      "奥に　リーダーがいる。　話を　聞いてもらえ。",
    ]},
    "2,10": { messages: [
      "兵士：「よそ者か。　……まあ　いい。",
      "我らガイア団は、ドランゴに　奪われた　地上を　取り戻すため　戦っている。",
      "地上には　3つのあかしが　散っているはずだ。",
      "まなびのあかし・ふるびたかぎ・ドラゴンのウロコ。",
      "それを揃えれば　洞窟の　封印が　解ける。",
    ]},
    "4,6": { messages: [
      "地底から　湧き出る　不思議な泉。",
      "仄かに　光っている……",
      "HPと　MPが　全回復した！",
    ], heal: 999 },
    "8,2": { messages: [
      "古老：「……ずいぶん　遠くから　来たのう。",
      "ドランゴが　現れたのは　百年前じゃった。",
      "あやつは　光を　憎む。　地上の　温もりを　奪いたがる。",
      "かつて　我らは　地上に住んでいた……。",
      "今は　地の底に　潜って　牙を　研いでおる。",
      "……おぬしが　希望だ。",
    ]},
    "12,5": { messages: [
      "ガイア（リーダー）：「……よく　来た。　地上の　旅人よ。",
      "我らは　長年　ドランゴと　戦い続けてきた。",
      "あやつの　急所は　洞窟の　最深部　にある。",
      "3つのあかしを　揃え、洞窟を　進め。",
      "最奥で　ドランゴの　意識体に　触れることが　できる。",
      "……頼んだぞ。地上の　光を　取り戻してくれ。",
      "これを　持っていけ。　地底の　加護を　授けよう。",
      "HPが　全回復した！",
    ], heal: 999 },
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
    "36,8": { messages: [
      "城門衛兵：「王城アストリアへ　ようこそ。",
      "この先は　王の間まで　まっすぐ続く　謁見回廊だ。」",
      "「松明の火に導かれ、迷わず進むがよい。」",
    ], fixedNpc: true },
    "36,11": { messages: [
      "城門衛兵：「不審な者は　ここで食い止める。",
      "だが　お前からは　戦う覚悟が　見える。」",
    ], fixedNpc: true },
    "34,6": { messages: [
      "見張り兵：「城門は　最後の砦だ。",
      "王に会うまで　気を抜くな。」",
    ], fixedNpc: true },
    "34,13": { messages: [
      "見張り兵：「長い回廊の先に　玉座の間がある。",
      "まっすぐ進めば　王の御前だ。」",
    ], fixedNpc: true },
    "5,13": { messages: [
      "姫：「……勇者よ。」",
      "「父である王が　あなたに　使命を　伝えたいと言っています。」",
      "「どうか　玉座の前へ。」",
      "「海鳴りの船着き場は　王城から南東です。」",
      "「山脈の手前を　東へ進み、海のきわを　探してみてください。」",
    ], heal: 3, fixedNpc: true },
    "5,8": { messages: [
      "大臣：「王は　この国の行く末を　案じておられる。",
      "勇者殿、どうか　お力添えを。」",
    ], fixedNpc: true },
    "4,10": { messages: [
      "……玉座の奥から、重厚な声が　響いた。",
      "「……来たか。　待っておった。」",
      "老いた王が　ゆっくりと立ち上がる。",
      "その目には　深い憂いと——　かすかな希望が　ある。",
      "「ドランゴは　東の封印の洞窟に　潜んでいる。」",
      "「されど　あの闇に踏み込むには　3つのしるしが　必要じゃ。」",
      "「ひとつ——　はての地に眠る　『まなびのあかし』。」",
      "「ふたつ——　謎を解く者が持つ　『ふるびたかぎ』。」",
      "「みっつ——　猫の血族が守る　『ドラゴンのウロコ』。」",
      "「3つ揃いし者のみが　洞窟への道を　開けることができる。」",
      "「それと　南の祠を　訪ねよ。」",
      "「祠は　山脈の北側、王城から南東へ進んだ先に　ある。」",
      "「…………頼む。　この国の　子らの笑い声を——　取り戻してくれ。」",
      "王が深々と　頭を垂れた。",
      "王から　使命を　授かった！",
    ], flag: "story:royalQuest", fixedNpc: true },
  },
  // ─── 南の祠 ──────────────────────────────────────────────────────────────────
  southShrine: {
    "2,5": { messages: [
      "石碑に　文字が　刻まれている。",
      "『道に迷いしものよ……",
      "音に耳を澄ませば、",
      "道は　おのずと　開ける』",
    ]},
    "3,5": { messages: [
      "御神水が　静かに　湧き出ている。",
      "一口　飲んでみた。",
      "不思議と　心が　澄んでいく。",
      "HPが　10　回復した！",
    ], heal: 10 },
    "5,5": { messages: [
      "占い婆さん：「……来たか。予言しておったぞ。",
    ]},
  },
  shipReef: {
    "2,5": { messages: [
      "潮騒の精：「ようこそ、旅人。",
      "ここは　船乗りだけが　辿りつく　環礁（かんしょう）だ。",
      "波の記憶を　胸に刻みなさい。",
    ], flag: "story:reefBeacon", fixedNpc: true },
    "4,3": { messages: [
      "潮だまりが　淡く光っている。",
      "しぶきが　不思議と　疲れを癒やしていく。",
      "HPが　12　回復した！",
    ], heal: 12 },
  },
  skySanctum: {
    "4,5": { messages: [
      "風祠の巫女：「空路を越えて　ここまで来たのですね。",
      "勇気と準備を　兼ね備えた者にだけ、風は応えます。",
      "夜明けの洞窟へ向かう前に　この加護を受けなさい。」",
      "風の加護が　体を包んだ！",
      "攻撃力が　2　上がった！",
    ], buff: { type: "attack", val: 2 }, flag: "story:skySanctumCleared", fixedNpc: true },
    "6,3": { messages: [
      "雲のしずくが　器に満ちている。",
      "口に含むと　胸の奥が澄みわたった。",
      "HPが　18　回復した！",
    ], heal: 18 },
  },
};

const INTERIOR_TREASURES = {
  village: {
    "8,8": { id: "village:8,8", itemId: "herb", amount: 1, messages: ["宝箱を　あけた！", "みどりのハーブを　てにいれた！"] },
    "8,15": { id: "village:8,15", gold: 18, messages: ["宝箱を　あけた！", "18ゴールドを　てにいれた！"] },
  },
  town: {
    "24,6": { id: "town:24,6", itemId: "potion", amount: 1, messages: ["畑わきの箱を　あけた！", "いやしのしずくを　てにいれた！"] },
    "24,28": { id: "town:24,28", gold: 35, messages: ["公園ベンチの箱を　あけた！", "35ゴールドを　てにいれた！"] },
  },
  artisanVillage: {
    "12,11": { id: "artisanVillage:12,11", itemId: "mega_potion", amount: 1, messages: ["職人箱を　あけた！", "げんきのエリクサを　てにいれた！"] },
  },
  underground: {
    "12,8": { id: "underground:12,8", itemId: "mega_potion", amount: 2, messages: ["石の宝箱を　あけた！", "げんきのエリクサ×2を　てにいれた！"] },
  },
  shipReef: {
    "5,6": { id: "shipReef:5,6", gold: 55, messages: ["潮騒の箱を　あけた！", "55ゴールドを　てにいれた！"] },
    "7,5": { id: "shipReef:7,5", itemId: "potion", amount: 1, messages: ["潮騒の箱を　あけた！", "いやしのしずくを　てにいれた！"] },
  },
  skySanctum: {
    "2,3": { id: "skySanctum:2,3", itemId: "mega_potion", amount: 1, messages: ["雲上の宝箱を　あけた！", "げんきのエリクサを　てにいれた！"] },
    "2,7": { id: "skySanctum:2,7", gold: 70, messages: ["雲上の宝箱を　あけた！", "70ゴールドを　てにいれた！"] },
    "8,8": { id: "skySanctum:8,8", itemId: "antidote", amount: 1, messages: ["雲上の宝箱を　あけた！", "どくけしハーブを　てにいれた！"] },
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
  [`${SPECIAL_POS.artisanVillage.y},${SPECIAL_POS.artisanVillage.x}`]: {
    name: "職人の村",
    messages: [
      "金属と木の香りが　風に混じる。",
      "ここは　いろんな職人が　腕を磨く　工房の村。",
      "叩く音、削る音、織る音が　重なっている。",
      "職人の村へ　はいる……",
    ],
    interior: "artisanVillage",
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
  [`${SPECIAL_POS.catCave.y},${SPECIAL_POS.catCave.x}`]: {
    name: "猫影の洞窟",
    messages: [
      "猫の村の裏手に　小さな洞窟が口を開けている。",
      "中から　低い唸り声が　聞こえる……。",
      "足元には　猫の足あとが　無数に残っていた。",
      "猫影の洞窟へ　はいる……",
    ],
    interior: "catCave",
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
  [`${SPECIAL_POS.shipReef.y},${SPECIAL_POS.shipReef.x}`]: {
    name: "潮騒の環礁",
    messages: [
      "白い飛沫が　輪を描く　小さな環礁。",
      "船を降りると　潮騒が　やさしく背中を押した。",
      "はじめて辿りついた海路に　心が少し高鳴る。",
      "波の導きに　耳をすませながら　奥へ進む……",
    ],
    mood: "hope",
    interior: "shipReef",
    rewardFlag: "story:reefArrival",
    requireStoryFlag: "story:shipUnlocked",
  },
  [`${SPECIAL_POS.skySanctum.y},${SPECIAL_POS.skySanctum.x}`]: {
    name: "天空の祠",
    messages: [
      "雲を突き抜ける　岩峰の上に　古い祠が眠っている。",
      "飛行船を降りると　風が　鈴のように鳴った。",
      "空に選ばれた者だけが　この門をくぐれるという。",
      "決戦前に　祠の加護を受けられそうだ。",
      "天空の祠へ　はいる……",
    ],
    mood: "hope",
    interior: "skySanctum",
    rewardFlag: "story:skyArrival",
    requireStoryFlag: "story:airshipUnlocked",
  },
  [`${SPECIAL_POS.shipyard.y},${SPECIAL_POS.shipyard.x}`]: {
    name: "海鳴りの船着き場",
    messages: [
      "木の桟橋に　潮の匂いが　しみついている。",
      "船大工：「王命を受けた旅人さんだな。",
      "この船を　託そう。海も川も　渡れるはずだ。」",
      "船を　てにいれた！",
      "海と川を　移動できるようになった！",
      "船大工：「海の向こうに　3つのしるしが眠ってる。",
      "波の音と　道しるべを頼りに　探してみな。」",
    ],
    rewardFlag: "story:shipUnlocked",
    requireStoryFlag: "story:royalQuest",
  },
  [`${SPECIAL_POS.airDock.y},${SPECIAL_POS.airDock.x}`]: {
    name: "風読みの飛行船ドック",
    messages: [
      "崖上のドックに　古い飛行船が眠っている。",
      "整備士：「3つのあかしを　集めたのか。ならば空を託そう。」",
      "飛行船を　てにいれた！",
      "山脈も　海も　越えて進めるようになった！",
      "整備士：「南東の山脈奥に　封印の洞窟がある。",
      "空から　夜明けへの道を　見つけてこい。」",
    ],
    rewardFlag: "story:airshipUnlocked",
    requireStoryFlag: "story:shipUnlocked",
    requireItems: ["manabi_proof", "ancient_key", "dragon_scale"],
  },
  [`${SPECIAL_POS.southShrine.y},${SPECIAL_POS.southShrine.x}`]: {
    name: "南の祠",
    messages: [
      "山脈の北側に　ひっそりと　建つ　小さな祠。",
      "古びた石造りの　扉が　開いている。",
      "中から　お香の匂いが　漂ってくる……",
      "祠の中へ　はいる……",
    ],
    interior: "southShrine",
  },
  [`${SPECIAL_POS.onsen.y},${SPECIAL_POS.onsen.x}`]: {
    name: "雪原の露天温泉",
    messages: [
      "もうもうと　湯気が　立ち上っている。",
      "雪に囲まれた　露天温泉だ。",
      "足を　踏み入れると……",
      "──　底が　ぬけた！",
      "……どこかへ　落ちていく……",
      "……気がつくと　地下に　いた。",
    ],
    interior: "underground",
  },
};

SAVE_POINT_POS.forEach((point) => {
  LOCATION_EVENTS[`${point.y},${point.x}`] = {
    name: point.name,
    messages: point.messages,
    save: true,
  };
});

// ─── ENEMIES ──────────────────────────────────────────────────────────────────
// 戦闘の敵スプライト: `images/enemy-{id}.png`（id は下表 0〜39）。タイトル等には使わない。欠落時は EnemySprite がベクターへフォールバック。
// magic: { name, type:"dmg"|"heal", power } / drop: { id:"herb"|"potion", rate }
const ENEMIES = [
  // ─ Tier1: 初心者 (dist < 14, Lv1-2) ─
  { id: 0,  name:"スライム",       hp: 8, atk: 3, def: 0, exp: 4, gold: 2 },
  { id: 1,  name:"チョウチョ",     hp: 6, atk: 1, def: 0, exp: 3, gold: 2 },
  { id: 2,  name:"タヌキ",         hp:12, atk: 4, def: 1, exp: 6, gold: 3 },
  { id: 3,  name:"カエル",         hp: 9, atk: 3, def: 0, exp: 5, gold: 3 },
  { id: 4,  name:"こうもり",       hp: 7, atk: 3, def: 0, exp: 4, gold: 2, drop:{ id:"herb",   rate:0.3 } },
  { id: 5,  name:"ミニスライム",   hp: 5, atk: 1, def: 0, exp: 3, gold: 1 },
  { id: 6,  name:"どくいもむし",   hp:10, atk: 2, def: 0, exp: 5, gold: 3, poison:true, poisonRate:0.25, magic:{ name:"どくけむり",   type:"dmg", power: 4 } },
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
  { id:38,  name:"ドランゴ",       hp:200, atk:24, def:10, exp:75, gold:50, formImageFile:"enemy-38.png", magic:[
    { name:"ファイアートランスフォーメーション", type:"dmg", power:18, transformFile:"enemy-38.png", transformLabel:"炎竜形態" },
    { name:"バブルトランスフォーメーション",   type:"dmg", power:16, transformFile:"enemy-38mizu.png", transformLabel:"水竜形態" },
    { name:"ダークトランスフォーメーション",   type:"dmg", power:19, transformFile:"enemy-38kuro.png", transformLabel:"闇竜形態" },
    { name:"ライトニングトランスフォーメーション", type:"dmg", power:17, transformFile:"enemy-38hikari.png", transformLabel:"光竜形態" },
  ] },
  // ─ 猫の森のレア枠 ─
  { id:39,  name:"猫又",           hp:30, atk:13, def: 3, exp:21, gold:12, drop:{ id:"neko_konnyaku", rate:1.0 } },
  // ─ レアエンカウント ─
  { id:40,  name:"メタにゃん",     hp:3,  atk:5,  def:99, exp:60, gold:1, flees:true },
];

const ENEMY_BY_ID = Object.fromEntries(ENEMIES.map((e) => [e.id, e]));
const E = (id) => ENEMY_BY_ID[id];
const BOSS_ENEMY = E(38);

// ─── RECORDER HINT SYSTEM ─────────────────────────────────────────────────────
const KEY_ITEM_LOCATIONS = {
  manabi_proof: SPECIAL_POS.manabiVillage,
  ancient_key:  SPECIAL_POS.nazoVillage,
  dragon_scale: SPECIAL_POS.catVillage,
};

function getRecorderHint(playerPos, itemId) {
  const target = KEY_ITEM_LOCATIONS[itemId];
  if (!target) return "……かすかな音が　聞こえた気がした。";
  const dx = target.x - playerPos.x;
  const dy = target.y - playerPos.y;
  const adx = Math.abs(dx), ady = Math.abs(dy);
  let dir;
  if (adx > ady * 1.8)       dir = dx > 0 ? "右" : "左";
  else if (ady > adx * 1.8)  dir = dy > 0 ? "下（南）" : "上（北）";
  else if (dx > 0 && dy < 0) dir = "右斜め上";
  else if (dx > 0 && dy > 0) dir = "右斜め下";
  else if (dx < 0 && dy < 0) dir = "左斜め上";
  else                        dir = "左斜め下";
  return `……${dir}の方から　聞こえた気がした。`;
}

function hasBagItem(player, itemId) {
  return (player?.bag || []).some((i) => i.id === itemId && i.count > 0);
}

function hasStoryFlag(player, flag) {
  return (player?.storyFlags || []).includes(flag);
}

function canUseShip(player) {
  return hasStoryFlag(player, "story:shipUnlocked");
}

function canUseAirship(player) {
  return hasStoryFlag(player, "story:airshipUnlocked");
}

function getPlayerTitle(player) {
  const flags = player?.storyFlags || [];
  if (flags.includes("story:titleStarlight")) return "星あかりの冒険者";
  if (flags.includes("story:drangoDefeated")) return "夜明けの勇者";
  if (flags.includes("story:royalQuest")) return "王命の旅人";
  return "かけだしの旅人";
}

function getMainProgress(player) {
  if (!player) return { done: 0, total: 6, percent: 0, title: "かけだしの旅人" };
  const checks = [
    () => (player.storyFlags || []).includes("story:royalQuest"),
    () => hasBagItem(player, "manabi_proof"),
    () => hasBagItem(player, "ancient_key"),
    () => hasBagItem(player, "dragon_scale"),
    () => player.level >= 8,
    () => (player.storyFlags || []).includes("story:drangoDefeated"),
  ];
  const done = checks.reduce((sum, fn) => sum + (fn() ? 1 : 0), 0);
  const total = checks.length;
  return {
    done,
    total,
    percent: Math.round((done / total) * 100),
    title: getPlayerTitle(player),
  };
}

function getNextObjective(player) {
  if (!player) return "旅の準備を整える";
  const flags = player.storyFlags || [];
  if (!flags.includes("story:royalQuest")) return "王城で王に会い、使命を受ける";
  if (!flags.includes("story:shipUnlocked")) return "海鳴りの船着き場で船を受け取り、海路をひらく";
  if (!hasBagItem(player, "manabi_proof")) return "まなびの村で『まなびのあかし』を手に入れる";
  if (!hasBagItem(player, "ancient_key")) return "謎の村の試練を終えて『ふるびたかぎ』を得る";
  if (!hasBagItem(player, "dragon_scale")) return "猫の村で『ドラゴンのウロコ』を得る";
  if (!flags.includes("story:airshipUnlocked")) return "風読みの飛行船ドックで飛行船を起こす";
  if (!flags.includes("story:skySanctumCleared")) return "天空の祠で風の加護を受け、決戦の準備を整える";
  if (player.level < 8) return "レベル8以上まで鍛える";
  if (!flags.includes("story:drangoDefeated")) return "くらやみの洞窟最深部でドランゴを倒す";
  if (!flags.includes("story:titleStarlight")) return "はじまりの村の隠し語り部を探す";
  return "夜明けを見届けた。もう一度世界を旅しよう";
}
/** 戦闘用。PNG 未配置の id はベクター（`images/enemy-{id}.png` で上書き）。参照用: id→名前 */
const ENEMY_VECTOR_FALLBACK_NAMES = Object.fromEntries(ENEMIES.map((e) => [e.id, e.name]));

// ★ Modern JS ① crypto.getRandomValues() — 暗号強度の乱数生成
function rng(min, max) {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return min + (buf[0] % (max - min + 1));
}
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const wrapCoord = (v, size) => ((v % size) + size) % size;

// ─── 敵ゾーン設計（ストーリー地点対応）────────────────────────────────────────
// スタート(0,0中心) → 町(dist≈12) → 学校(dist≈21) → 家(dist≈26) → 洞窟(dist≈34)
//
// Zone A  dist  0〜 5  : Lv1序盤    チョウチョ・ミニスライム（魔法なし・超安全）
// Zone B  dist  6〜12  : Lv1〜2    スライム・カエル・こうもり（〜町まで）
// Zone C  dist 13〜19  : Lv2〜4    タヌキ・どくいもむし・ゴースト（町〜学校）
// Zone D  dist 20〜25  : Lv4〜6    おばけきのこ・ゴブリン・アイスインプ（学校〜家）
// Zone E  dist 26〜31  : Lv6〜9    ツチモグラ・まどうし・ドクロナイト（家〜洞窟）
// Zone F  dist 32+     : Lv9+      ダークナイト・あんこくまじゅつし（洞窟深部）
function getEnemyForZone(tile, pos, isNight = false) {
  const zoneA = Math.round(5 * WORLD_SCALE);
  const zoneB = Math.round(12 * WORLD_SCALE);
  const zoneC = Math.round(19 * WORLD_SCALE);
  const zoneD = Math.round(25 * WORLD_SCALE);
  const zoneE = Math.round(31 * WORLD_SCALE);
  const mountainMid = Math.round(20 * WORLD_SCALE);
  const mountainDeep = Math.round(28 * WORLD_SCALE);
  const cx = Math.floor(MAP_SIZE / 2), cy = Math.floor(MAP_SIZE / 2);
  const dist = Math.abs(pos.x - cx) + Math.abs(pos.y - cy);

  // ── 山岳タイル：距離で3段階 ──
  if (tile === TILE.MOUNTAIN) {
    if (isNight) {
      if (dist > mountainDeep) return [E(26), E(29), E(25)][rng(0, 2)];
      if (dist > mountainMid) return [E(25), E(28), E(29)][rng(0, 2)];
      return [E(24), E(25), E(27)][rng(0, 2)];
    }
    if (dist > mountainDeep) return [E(26), E(29)][rng(0, 1)];
    if (dist > mountainMid) return [E(25), E(28)][rng(0, 1)];
    return [E(24), E(27)][rng(0, 1)];
  }
  // ── 砂漠タイル：固有モンスター ──
  if (tile === TILE.DESERT) {
    if (isNight) return [E(31), E(34), E(35), E(32), E(30)][rng(0, 4)];
    return [E(30), E(31), E(32), E(33), E(34), E(35)][rng(0, 5)];
  }
  // ── 森タイル：距離で2段階 ──
  if (tile === TILE.FOREST) {
    if (isNight) {
      const pool = dist > 24
        ? [E(18), E(19), E(22), E(23), E(21)]
        : [E(18), E(20), E(22), E(23), E(17)];
      return pool[rng(0, pool.length - 1)];
    }
    const pool = dist > 24
      ? [E(18), E(19), E(21), E(23), E(17)]
      : [E(16), E(17), E(20), E(22), E(18)];
    return pool[rng(0, pool.length - 1)];
  }

  // ── 草原・雪原・その他：6段階ゾーン ──
  // 夜は不死・闇系モンスターが出現
  if (isNight) {
    if (dist <= zoneA) return [E(4),  E(7) ][rng(0, 1)];
    if (dist <= zoneB) return [E(4),  E(7),  E(2),  E(6) ][rng(0, 3)];
    if (dist <= zoneC) return [E(6),  E(7),  E(9),  E(13)][rng(0, 3)];
    if (dist <= zoneD) return [E(12), E(13), E(11), E(14)][rng(0, 3)];
    if (dist <= zoneE) return [E(12), E(13), E(35), E(36)][rng(0, 3)];
    if (rng(1, 18) === 1) return E(40);
    return [E(36), E(37)][rng(0, 1)];
  }
  // Zone A: スタート直後の超安全地帯（魔法なし・物理のみ）
  if (dist <= zoneA) return [E(1), E(5)][rng(0, 1)];
  // Zone B: 〜町までの道中（低atk・魔法なし）
  if (dist <= zoneB) return [E(0), E(1), E(3), E(4)][rng(0, 3)];
  // Zone C: 町〜学校（魔法系が初登場・Lv2以上想定）
  if (dist <= zoneC) return [E(2), E(3), E(6), E(7)][rng(0, 3)];
  // Zone D: 学校〜家（中堅前半・装備強化後想定）
  if (dist <= zoneD) return [E(8), E(9), E(14), E(15)][rng(0, 3)];
  // Zone E: 家〜洞窟（中堅後半）
  if (dist <= zoneE) return [E(10), E(11), E(12), E(13)][rng(0, 3)];
  // Zone F: 洞窟深部でのみメタにゃん 1/18
  if (rng(1, 18) === 1) return E(40);
  return [E(36), E(37)][rng(0, 1)];
}

// 属性呪文の弱点（敵ID）。小さな固定ボーナスのみ（全体バランスを崩さない）
const ELEMENT_SPELL_WEAK = {
  fire:    [14, 19, 22, 29],
  water:   [11, 33, 34],
  thunder: [12, 24, 25, 27, 28],
};

/** プレイヤー向け属性ダメージ（effect:"elem" の呪文用） */
function calcElementSpellDamage(spell, enemy) {
  if (spell.effect !== "elem") return { damage: 0, weak: false };
  let base = spell.power + rng(-1, 2);
  const weakList = ELEMENT_SPELL_WEAK[spell.elem] || [];
  let weak = false;
  if (weakList.includes(enemy.id)) {
    weak = true;
    base += spell.tier === 1 ? 2 : spell.tier === 2 ? 3 : 4;
  }
  const defMit = Math.floor((enemy.def ?? 0) / (spell.tier >= 3 ? 2 : 3));
  return { damage: Math.max(1, base - defMit), weak };
}

/** 風秘術など単体威力呪文（防御で軽減） */
function calcRawSpellDamage(power, enemy) {
  const base = power + rng(-1, 3);
  const defMit = Math.floor((enemy.def ?? 0) / 2);
  return Math.max(1, base - defMit);
}

// 回復・睡眠＋ 火/水/雷 各3段（弱いほどMP安い）＋謎の村秘術
const SPELLS = [
  { name: "ひかりのいぶき", mp: 3, effect: "heal",  power: 26, msg: "体力が回復した！", minLevel: 2 },
  { name: "ゆめしずく",     mp: 3, effect: "sleep", power:  0, msg: "眠りの呪文！", minLevel: 3 },
  { name: "ひのこ",         mp: 2, effect: "elem", elem: "fire",    tier: 1, power:  7, minLevel: 2 },
  { name: "かえん",         mp: 4, effect: "elem", elem: "fire",    tier: 2, power: 13, minLevel: 5 },
  { name: "ごうか",         mp: 6, effect: "elem", elem: "fire",    tier: 3, power: 19, minLevel: 8 },
  { name: "みずたま",       mp: 2, effect: "elem", elem: "water",   tier: 1, power:  7, minLevel: 3 },
  { name: "あわなだれ",     mp: 4, effect: "elem", elem: "water",   tier: 2, power: 13, minLevel: 6 },
  { name: "せいすい",       mp: 6, effect: "elem", elem: "water",   tier: 3, power: 19, minLevel: 9 },
  { name: "びりびり",       mp: 2, effect: "elem", elem: "thunder", tier: 1, power:  7, minLevel: 4 },
  { name: "いなずま",       mp: 4, effect: "elem", elem: "thunder", tier: 2, power: 13, minLevel: 7 },
  { name: "らいめい",       mp: 6, effect: "elem", elem: "thunder", tier: 3, power: 19, minLevel: 10 },
  { name: "せんにんのかぜ", mp: 6, effect: "wind",  power: 22, msg: "仙人の風が吹き荒れる！", secret: true, minLevel: 10 },
];

function getUnlockedSpells(player) {
  const level = Number(player?.level || 1);
  const hasSecret = !!player?.nazoSpellLearned;
  return SPELLS.filter((spell) => {
    if (level < (spell.minLevel || 1)) return false;
    if (spell.secret && !hasSecret) return false;
    return true;
  });
}

function getSpellsLearnedBetweenLevels(fromLevel, toLevel, hasSecretSpell = false) {
  const before = Math.max(0, Number(fromLevel || 0));
  const after = Math.max(before, Number(toLevel || before));
  return SPELLS.filter((spell) => {
    const req = Number(spell.minLevel || 1);
    if (req <= before || req > after) return false;
    if (spell.secret && !hasSecretSpell) return false;
    return true;
  });
}

function getEnemyRecommendedLevel(enemyId) {
  if (enemyId === 38) return 11;
  if (enemyId === 40) return 11;
  if (enemyId === 39) return 7;
  if (enemyId <= 7) return 1 + (enemyId >= 6 ? 1 : 0);      // 1-2
  if (enemyId <= 15) return 3 + ((enemyId - 8) >= 4 ? 1 : 0); // 3-4
  if (enemyId <= 23) return 5 + ((enemyId - 16) >= 4 ? 2 : 1); // 6-7
  if (enemyId <= 29) return 8 + ((enemyId - 24) >= 3 ? 2 : 1); // 9-10
  if (enemyId <= 35) return 7 + ((enemyId - 30) >= 3 ? 2 : 1); // 8-9
  if (enemyId <= 37) return 11;
  return 5;
}

function getEnemyRecommendationRows() {
  const rows = [
    { label: "Lv1-2", ids: [5, 1, 0, 3, 4, 2, 6, 7] },
    { label: "Lv3-4", ids: [8, 9, 10, 11, 12, 13, 14, 15] },
    { label: "Lv6-7", ids: [16, 17, 18, 19, 20, 21, 22, 23, 39] },
    { label: "Lv8-10", ids: [30, 31, 32, 33, 34, 35, 24, 25, 26, 27, 28, 29] },
    { label: "Lv11+", ids: [36, 37, 40] },
    { label: "ボス", ids: [38] },
  ];
  return rows.map((row) => ({
    label: row.label,
    names: row.ids.map((id) => ENEMY_BY_ID[id]?.name).filter(Boolean),
  }));
}

// ─── PLAYER ───────────────────────────────────────────────────────────────────
function makePlayer(name, gender) {
  return {
    name, gender,
    hp: 20, maxHp: 20,        // ← 弱体化（元30）
    mp: 10, maxMp: 10,        // 属性呪文を少し使える程度（序盤でも2〜3ターン）
    atk: 5, def: 2,           // ← 弱体化（元atk:8 def:4）
    exp: 0, level: 1, gold: 30,
    pos: findNewGameStartPosition(),
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
  let next = { ...player };
  let safety = 0;
  while (safety < 50) {
    const threshold = next.level * 15;
    if (next.exp < threshold) break;
    const nextLevel = next.level + 1;
    next = {
      ...next,
      level: nextLevel,
      maxHp: next.maxHp + 4,
      hp: next.maxHp + 4,
      maxMp: next.maxMp + 2,
      mp: next.maxMp + 2,
      // レベル依存を弱め、装備・行動選択の価値を上げる
      atk: nextLevel % 2 === 0 ? next.atk + 1 : next.atk,
      def: nextLevel % 3 === 0 ? next.def + 1 : next.def,
      exp: next.exp - threshold,
    };
    safety += 1;
  }
  return next;
}

