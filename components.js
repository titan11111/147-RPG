// ─── MINIMAP ─────────────────────────────────────────────────────────────────
const MINI_COLOR = {
  grass:"#2f9e44", forest:"#1b5e20", water:"#1971c2", mountain:"#6c757d",
  sea:"#0b3d91", lake:"#4dabf7", bridge:"#8d6e63", desert:"#e9c46a",
  town:"#ff8fa3", school:"#ffd43b", home:"#ffc078", cave:"#495057",
  snow:"#c8dce8", onsen:"#4dd0e1",
};

const MINI_R = 12; // プレイヤー周囲±12タイルを表示
const MINI_PX = 4; // 1タイル = 4px
const MINI_SIZE = (MINI_R * 2 + 1) * MINI_PX; // = 100px

function MiniMap({ player }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, MINI_SIZE, MINI_SIZE);

    const cx = player.pos.x, cy = player.pos.y;
    for (let dy = -MINI_R; dy <= MINI_R; dy++) {
      for (let dx = -MINI_R; dx <= MINI_R; dx++) {
        const wx = wrapCoord(cx + dx, MAP_SIZE);
        const wy = wrapCoord(cy + dy, MAP_SIZE);
        const px = (dx + MINI_R) * MINI_PX, py = (dy + MINI_R) * MINI_PX;
        ctx.fillStyle = MINI_COLOR[MAP_GRID[wy][wx]] ?? "#333";
        ctx.fillRect(px, py, MINI_PX, MINI_PX);
      }
    }
    // 特殊地点
    Object.values(SPECIAL_POS).forEach(({ x, y }) => {
      const px = (x - cx + MINI_R) * MINI_PX, py = (y - cy + MINI_R) * MINI_PX;
      if (px >= 0 && py >= 0 && px < MINI_SIZE && py < MINI_SIZE) {
        ctx.fillStyle = "#ffd700";
        ctx.fillRect(px, py, MINI_PX, MINI_PX);
      }
    });
    // プレイヤー（常に中央）
    const mid = MINI_R * MINI_PX;
    ctx.fillStyle = "#fff";
    ctx.fillRect(mid, mid, MINI_PX, MINI_PX);
  }, [player.pos.x, player.pos.y]);

  return (
    <canvas ref={canvasRef} width={MINI_SIZE} height={MINI_SIZE}
      style={{ position:"absolute", top:4, right:4, width:78, height:78,
               imageRendering:"pixelated", border:"1px solid #888",
               borderRadius:2, opacity:0.92, background:"#111" }} />
  );
}

// ─── HERO SPRITE (Canvas shapes) ─────────────────────────────────────────────
function HeroSprite({ gender, direction = "down", animStep = 0, size = 30 }) {
  const canvasRef  = useRef(null);
  const bodyColor  = gender === "female" ? "#f9a8d4" : "#93c5fd";
  const hairColor  = gender === "female" ? "#7c2d12" : "#1a0a00";
  const frame      = animStep % 2;
  const legOffset  = frame === 0 ?  3 : -3;  // 足の前後（より大きく）
  const armSwing   = frame === 0 ?  2 : -2;  // 腕の振り（足と逆）
  const bodyBob    = frame === 0 ?  0 : -1;  // 体の上下バウンス
  const facingLeft = direction === "left";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, size, size);

    const s = size;
    const cx = s / 2;
    const bb = bodyBob; // body bob shorthand

    if (facingLeft) { ctx.save(); ctx.translate(s, 0); ctx.scale(-1, 1); }

    // 影（地面）
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.ellipse(cx, s * 0.92, s * 0.22, s * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();

    // 足（左右交互 + ブラウス色）
    ctx.fillStyle = "#374151";
    ctx.fillRect(cx - 5, s * 0.60 + legOffset  + bb, 4, s * 0.24);
    ctx.fillRect(cx + 1, s * 0.60 - legOffset  + bb, 4, s * 0.24);

    // 腕（胴体より先に描くと腕が後ろに見える）
    ctx.fillStyle = bodyColor;
    ctx.fillRect(cx - 9, s * 0.36 - armSwing + bb, 3, s * 0.20); // 左腕
    ctx.fillRect(cx + 6, s * 0.36 + armSwing + bb, 3, s * 0.20); // 右腕

    // 胴体
    ctx.fillRect(cx - 6, s * 0.35 + bb, 12, s * 0.28);

    // 頭
    ctx.fillStyle = "#fde68a";
    ctx.beginPath();
    ctx.arc(cx, s * 0.22 + bb, s * 0.18, 0, Math.PI * 2);
    ctx.fill();

    // 髪
    ctx.fillStyle = hairColor;
    ctx.beginPath();
    ctx.arc(cx, s * 0.18 + bb, s * 0.16, Math.PI, 0);
    ctx.fill();

    // 目
    const eyeX = direction === "up" ? cx : cx + (facingLeft ? -2 : 2);
    if (direction !== "up") {
      ctx.fillStyle = "#1a0a00";
      ctx.beginPath();
      ctx.arc(eyeX - 2, s * 0.22 + bb, 1.5, 0, Math.PI * 2);
      ctx.arc(eyeX + 2, s * 0.22 + bb, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    if (facingLeft) ctx.restore();
  }, [gender, direction, animStep, size, bodyColor, hairColor, legOffset, armSwing, bodyBob, facingLeft]);

  return <canvas ref={canvasRef} width={size} height={size}
           style={{ imageRendering:"pixelated", display:"block" }} />;
}

// ─── NPC SPRITE (Canvas shapes) ──────────────────────────────────────────────
function NpcSprite({ bodyColor = "#a3e635", hairColor = "#1a0a00", size = 28, role = "villager" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, size, size);

    const s = size;
    const cx = s / 2;

    // 足
    ctx.fillStyle = "#4b5563";
    ctx.fillRect(cx - 4, s * 0.65, 3, s * 0.2);
    ctx.fillRect(cx + 1, s * 0.65, 3, s * 0.2);

    if (role === "princess") {
      ctx.fillStyle = "#f472b6";
      ctx.beginPath();
      ctx.moveTo(cx - 6, s * 0.66);
      ctx.lineTo(cx + 6, s * 0.66);
      ctx.lineTo(cx + 9, s * 0.9);
      ctx.lineTo(cx - 9, s * 0.9);
      ctx.closePath();
      ctx.fill();
    }

    // 胴体
    ctx.fillStyle = bodyColor;
    ctx.fillRect(cx - 5, s * 0.38, 10, s * 0.28);

    // 頭
    ctx.fillStyle = "#fde68a";
    ctx.beginPath();
    ctx.arc(cx, s * 0.25, s * 0.17, 0, Math.PI * 2);
    ctx.fill();

    // 髪
    ctx.fillStyle = hairColor;
    ctx.beginPath();
    ctx.arc(cx, s * 0.21, s * 0.15, Math.PI, 0);
    ctx.fill();

    if (role === "king" || role === "princess") {
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.moveTo(cx - 6, s * 0.08);
      ctx.lineTo(cx - 3, s * 0.02);
      ctx.lineTo(cx, s * 0.08);
      ctx.lineTo(cx + 3, s * 0.02);
      ctx.lineTo(cx + 6, s * 0.08);
      ctx.lineTo(cx + 6, s * 0.14);
      ctx.lineTo(cx - 6, s * 0.14);
      ctx.closePath();
      ctx.fill();
    }

    if (role === "king") {
      ctx.fillStyle = "#fef3c7";
      ctx.fillRect(cx - 2, s * 0.43, 4, s * 0.1);
      ctx.fillStyle = "#991b1b";
      ctx.fillRect(cx - 8, s * 0.36, 2, s * 0.28);
      ctx.fillRect(cx + 6, s * 0.36, 2, s * 0.28);
    }

    if (role === "guard") {
      ctx.fillStyle = "#94a3b8";
      ctx.fillRect(cx + 7, s * 0.28, 1.5, s * 0.52);
      ctx.fillStyle = "#e2e8f0";
      ctx.beginPath();
      ctx.moveTo(cx + 8, s * 0.24);
      ctx.lineTo(cx + 12, s * 0.3);
      ctx.lineTo(cx + 8, s * 0.34);
      ctx.closePath();
      ctx.fill();
    }

    // 目
    ctx.fillStyle = "#1a0a00";
    ctx.beginPath();
    ctx.arc(cx - 2, s * 0.25, 1.2, 0, Math.PI * 2);
    ctx.arc(cx + 2, s * 0.25, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }, [bodyColor, hairColor, size, role]);

  return <canvas ref={canvasRef} width={size} height={size}
           style={{ imageRendering:"pixelated", display:"block" }} />;
}

// 猫の村の NPC（人型ではなくネコのシルエット。毛色は NPC_PALETTE の body/hair を流用）
function CatNpcSprite({ furColor = "#fca5a5", markColor = "#7c2d12", size = 28 }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const s = size;
    const cx = s / 2;
    ctx.clearRect(0, 0, s, s);
    ctx.imageSmoothingEnabled = false;

    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.beginPath();
    ctx.ellipse(cx, s * 0.9, s * 0.24, s * 0.075, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = furColor;
    ctx.lineWidth = Math.max(2, s * 0.085);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.18, s * 0.7);
    ctx.quadraticCurveTo(cx + s * 0.38, s * 0.52, cx + s * 0.32, s * 0.26);
    ctx.stroke();

    ctx.fillStyle = furColor;
    ctx.beginPath();
    ctx.ellipse(cx, s * 0.64, s * 0.24, s * 0.19, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.32)";
    ctx.lineWidth = Math.max(1, s * 0.028);
    ctx.stroke();

    ctx.strokeStyle = markColor;
    ctx.lineWidth = Math.max(1, s * 0.022);
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.06, s * 0.54);
    ctx.quadraticCurveTo(cx - s * 0.02, s * 0.62, cx - s * 0.1, s * 0.7);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.08, s * 0.56);
    ctx.quadraticCurveTo(cx + s * 0.12, s * 0.65, cx + s * 0.02, s * 0.72);
    ctx.stroke();

    ctx.fillStyle = furColor;
    ctx.beginPath();
    ctx.arc(cx, s * 0.36, s * 0.21, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.32)";
    ctx.lineWidth = Math.max(1, s * 0.028);
    ctx.stroke();

    const ear = (side) => {
      ctx.fillStyle = furColor;
      ctx.beginPath();
      ctx.moveTo(cx + side * s * 0.05, s * 0.22);
      ctx.lineTo(cx + side * s * 0.2, s * 0.05);
      ctx.lineTo(cx + side * s * 0.17, s * 0.23);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(254,205,211,0.95)";
      ctx.beginPath();
      ctx.moveTo(cx + side * s * 0.08, s * 0.2);
      ctx.lineTo(cx + side * s * 0.16, s * 0.1);
      ctx.lineTo(cx + side * s * 0.14, s * 0.21);
      ctx.closePath();
      ctx.fill();
    };
    ear(-1);
    ear(1);

    ctx.fillStyle = "#fef9c3";
    ctx.beginPath();
    ctx.ellipse(cx - s * 0.07, s * 0.34, s * 0.048, s * 0.062, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + s * 0.07, s * 0.34, s * 0.048, s * 0.062, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.ellipse(cx - s * 0.07, s * 0.34, s * 0.016, s * 0.05, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + s * 0.07, s * 0.34, s * 0.016, s * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#fda4af";
    ctx.beginPath();
    ctx.moveTo(cx, s * 0.4);
    ctx.lineTo(cx - s * 0.028, s * 0.46);
    ctx.lineTo(cx + s * 0.028, s * 0.46);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = Math.max(0.8, s * 0.018);
    for (let i = -1; i <= 1; i++) {
      const y = s * 0.42 + i * s * 0.028;
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.18, y);
      ctx.lineTo(cx - s * 0.32, y + i * s * 0.012);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + s * 0.18, y);
      ctx.lineTo(cx + s * 0.32, y + i * s * 0.012);
      ctx.stroke();
    }
  }, [furColor, markColor, size]);

  return <canvas ref={canvasRef} width={size} height={size}
           style={{ imageRendering:"pixelated", display:"block" }} />;
}

function DogNpcSprite({ furColor = "#c8834a", earColor = "#7c2d12", size = 28 }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const s = size;
    const cx = s / 2;
    ctx.clearRect(0, 0, s, s);
    ctx.imageSmoothingEnabled = false;

    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.beginPath();
    ctx.ellipse(cx, s * 0.88, s * 0.24, s * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();

    // 胴体
    ctx.fillStyle = furColor;
    ctx.beginPath();
    ctx.ellipse(cx, s * 0.62, s * 0.24, s * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();

    // しっぽ
    ctx.strokeStyle = earColor;
    ctx.lineWidth = Math.max(2, s * 0.08);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.16, s * 0.64);
    ctx.quadraticCurveTo(cx + s * 0.35, s * 0.5, cx + s * 0.28, s * 0.3);
    ctx.stroke();

    // 頭
    ctx.fillStyle = furColor;
    ctx.beginPath();
    ctx.arc(cx, s * 0.34, s * 0.2, 0, Math.PI * 2);
    ctx.fill();

    // 耳
    const ear = (side) => {
      ctx.fillStyle = earColor;
      ctx.beginPath();
      ctx.moveTo(cx + side * s * 0.08, s * 0.2);
      ctx.lineTo(cx + side * s * 0.2, s * 0.08);
      ctx.lineTo(cx + side * s * 0.16, s * 0.26);
      ctx.closePath();
      ctx.fill();
    };
    ear(-1);
    ear(1);

    // 鼻口
    ctx.fillStyle = "#1f2937";
    ctx.beginPath();
    ctx.arc(cx, s * 0.38, Math.max(1.2, s * 0.028), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = Math.max(1, s * 0.02);
    ctx.beginPath();
    ctx.moveTo(cx, s * 0.39);
    ctx.lineTo(cx, s * 0.45);
    ctx.stroke();

    // 目
    ctx.fillStyle = "#111827";
    ctx.beginPath();
    ctx.arc(cx - s * 0.065, s * 0.31, Math.max(1.2, s * 0.022), 0, Math.PI * 2);
    ctx.arc(cx + s * 0.065, s * 0.31, Math.max(1.2, s * 0.022), 0, Math.PI * 2);
    ctx.fill();

    // 足
    ctx.fillStyle = "#4b5563";
    ctx.fillRect(cx - s * 0.16, s * 0.72, s * 0.08, s * 0.12);
    ctx.fillRect(cx + s * 0.08, s * 0.72, s * 0.08, s * 0.12);
  }, [furColor, earColor, size]);

  return <canvas ref={canvasRef} width={size} height={size}
           style={{ imageRendering:"pixelated", display:"block" }} />;
}

// ─── TILE CANVAS GRAPHICS ────────────────────────────────────────────────────

function _drawGrass(ctx, w, h) {
  ctx.fillStyle = "#3a8a3a";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#2a6030";
  ctx.lineWidth = 1.5;
  [[4,20,4,12],[9,24,9,17],[14,18,14,10],[19,22,19,14],
   [24,26,24,19],[29,20,29,12],[31,24,31,18],
   [6,30,6,25],[16,30,16,24],[25,29,25,23]].forEach(([x1,y1,x2,y2])=>{
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  });
}

function _drawForest(ctx, w, h) {
  ctx.fillStyle = "#1a5c1a";
  ctx.fillRect(0, 0, w, h);
  // 木1（左）
  ctx.fillStyle = "#5c3a1a";
  ctx.fillRect(5, 22, 4, 10);
  ctx.fillStyle = "#2a7a2a";
  ctx.beginPath(); ctx.moveTo(7,7); ctx.lineTo(1,23); ctx.lineTo(13,23); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#3a9a3a";
  ctx.beginPath(); ctx.moveTo(7,11); ctx.lineTo(2,24); ctx.lineTo(12,24); ctx.closePath(); ctx.fill();
  // 木2（右）
  ctx.fillStyle = "#5c3a1a";
  ctx.fillRect(23, 20, 4, 12);
  ctx.fillStyle = "#2a7a2a";
  ctx.beginPath(); ctx.moveTo(25,5); ctx.lineTo(18,21); ctx.lineTo(32,21); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#3a9a3a";
  ctx.beginPath(); ctx.moveTo(25,9); ctx.lineTo(19,22); ctx.lineTo(31,22); ctx.closePath(); ctx.fill();
  // 小さな葉ハイライト
  ctx.fillStyle = "#4caf50";
  ctx.fillRect(6,12,3,2); ctx.fillRect(24,10,3,2);
}

function _drawMountain(ctx, w, h) {
  ctx.fillStyle = "#868e96";
  ctx.fillRect(0, 0, w, h);
  // 岩肌テクスチャ
  ctx.fillStyle = "#6c757d";
  [[0,22,17,12],[16,26,18,8]].forEach(([x,y,rw,rh])=>ctx.fillRect(x,y,rw,rh));
  // 山1（左）
  ctx.fillStyle = "#495057";
  ctx.beginPath(); ctx.moveTo(2,h); ctx.lineTo(13,10); ctx.lineTo(24,h); ctx.closePath(); ctx.fill();
  // 山2（右・高い）
  ctx.fillStyle = "#5a6268";
  ctx.beginPath(); ctx.moveTo(14,h); ctx.lineTo(27,4); ctx.lineTo(h,h); ctx.closePath(); ctx.fill();
  // 雪帽子
  ctx.fillStyle = "#f0f4f8";
  ctx.beginPath(); ctx.moveTo(13,10); ctx.lineTo(9,19); ctx.lineTo(17,19); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(27,4); ctx.lineTo(22,14); ctx.lineTo(32,14); ctx.closePath(); ctx.fill();
  // 雪のライン
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(9,19); ctx.lineTo(12,22); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(32,14); ctx.lineTo(29,18); ctx.stroke();
}

function _drawSea(ctx, w, h) {
  ctx.fillStyle = "#0b3d91";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#1565c0";
  ctx.lineWidth = 1.5;
  [8,17,26].forEach(y=>{
    ctx.beginPath();
    ctx.moveTo(0,y);
    ctx.bezierCurveTo(8,y-4,16,y+4,24,y);
    ctx.bezierCurveTo(29,y-2,33,y+2,34,y);
    ctx.stroke();
  });
  // 白波
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  [[4,7,5,1],[18,16,5,1],[28,25,4,1]].forEach(([x,y,rw,rh])=>ctx.fillRect(x,y,rw,rh));
}

function _drawWater(ctx, w, h) {
  ctx.fillStyle = "#1971c2";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#74c0fc";
  ctx.lineWidth = 1.5;
  [9,18,27].forEach(y=>{
    ctx.beginPath();
    ctx.moveTo(0,y);
    ctx.bezierCurveTo(9,y-3,17,y+3,25,y);
    ctx.bezierCurveTo(30,y-1,33,y+1,h,y);
    ctx.stroke();
  });
}

function _drawLake(ctx, w, h) {
  ctx.fillStyle = "#4dabf7";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#a5d8ff";
  ctx.lineWidth = 1;
  [[10,12,7],[24,22,6],[14,27,4]].forEach(([cx,cy,r])=>{
    ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx,cy,r*0.45,0,Math.PI*2); ctx.stroke();
  });
}

function _drawDesert(ctx, w, h) {
  ctx.fillStyle = "#e9c46a";
  ctx.fillRect(0, 0, w, h);
  // 砂丘
  ctx.fillStyle = "#ddb451";
  ctx.beginPath();
  ctx.moveTo(0,h);
  ctx.bezierCurveTo(8,18,26,12,h,22);
  ctx.lineTo(h,h); ctx.closePath(); ctx.fill();
  // 砂粒
  ctx.fillStyle = "#c9a42c";
  [[7,14],[14,20],[22,10],[28,17],[5,27],[19,29]].forEach(([x,y])=>{
    ctx.fillRect(x,y,1.5,1.5);
  });
  // 小石
  ctx.fillStyle = "#b8943f";
  ctx.beginPath(); ctx.arc(26,8,2,0,Math.PI*2); ctx.fill();
}

function _drawBridge(ctx, w, h) {
  // 水背景
  ctx.fillStyle = "#1971c2";
  ctx.fillRect(0, 0, w, h);
  // 橋板
  ctx.fillStyle = "#8d6e63";
  ctx.fillRect(0, 7, w, 20);
  // 板の継ぎ目
  ctx.strokeStyle = "#6d4c41";
  ctx.lineWidth = 1;
  [12,19,26].forEach(y=>{
    ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke();
  });
  // 欄干（横）
  ctx.fillStyle = "#4e342e";
  ctx.fillRect(0, 5, w, 2);
  ctx.fillRect(0, 27, w, 2);
  // 欄干（縦ポスト）
  ctx.fillStyle = "#5d4037";
  [4,12,20,28].forEach(x=>{
    ctx.fillRect(x, 2, 2, h-2);
  });
}

function _drawTown(ctx, w, h) {
  ctx.fillStyle = "#ffadad";
  ctx.fillRect(0, 0, w, h);
  // 石畳路
  ctx.fillStyle = "#c8a898";
  ctx.fillRect(13, 22, 8, h);
  // 家1（左）
  ctx.fillStyle = "#e08070";
  ctx.fillRect(1, 18, 12, 16);
  ctx.fillStyle = "#a855f7";
  ctx.beginPath(); ctx.moveTo(7,6); ctx.lineTo(0,18); ctx.lineTo(14,18); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#7e22ce";
  ctx.beginPath(); ctx.moveTo(7,6); ctx.lineTo(5,10); ctx.lineTo(9,10); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#5c3a1a"; ctx.fillRect(5,25,4,9);
  ctx.fillStyle = "#bfdbfe"; ctx.fillRect(2,20,3,3); ctx.fillRect(9,20,3,3);
  // 家2（右）
  ctx.fillStyle = "#e08070";
  ctx.fillRect(21, 20, 12, 14);
  ctx.fillStyle = "#8b5cf6";
  ctx.beginPath(); ctx.moveTo(27,8); ctx.lineTo(20,20); ctx.lineTo(34,20); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#5c3a1a"; ctx.fillRect(25,27,4,7);
  ctx.fillStyle = "#bfdbfe"; ctx.fillRect(22,22,3,3); ctx.fillRect(29,22,3,3);
}

function _drawSchool(ctx, w, h) {
  ctx.fillStyle = "#ffe066";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#e0c040";
  ctx.fillRect(3, 12, 28, 22);
  ctx.fillStyle = "#8b1a1a";
  ctx.fillRect(3, 9, 28, 3);
  // 窓
  ctx.fillStyle = "#bfdbfe";
  [[5,14],[13,14],[21,14],[27,14]].forEach(([x,y])=>{
    ctx.fillRect(x,y,4,5);
    ctx.strokeStyle="#7090b0"; ctx.lineWidth=0.5; ctx.strokeRect(x,y,4,5);
  });
  ctx.fillStyle = "#5c3a1a"; ctx.fillRect(14,25,6,9);
  // 旗
  ctx.strokeStyle = "#333"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(17,1); ctx.lineTo(17,9); ctx.stroke();
  ctx.fillStyle = "#e74c3c"; ctx.fillRect(17,1,6,4);
}

function _drawHome(ctx, w, h) {
  ctx.fillStyle = "#ffd8a8";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#ffc078";
  ctx.fillRect(5, 16, 24, 18);
  ctx.fillStyle = "#c0392b";
  ctx.beginPath(); ctx.moveTo(17,4); ctx.lineTo(2,16); ctx.lineTo(32,16); ctx.closePath(); ctx.fill();
  // 煙突
  ctx.fillStyle = "#7f8c8d"; ctx.fillRect(22,8,4,8);
  ctx.fillStyle = "#555"; ctx.fillRect(21,6,6,2);
  ctx.fillStyle = "#5c3a1a"; ctx.fillRect(14,22,6,12);
  // ドアノブ
  ctx.fillStyle = "#f0b060";
  ctx.beginPath(); ctx.arc(19,28,1,0,Math.PI*2); ctx.fill();
  // 窓
  ctx.fillStyle = "#bfdbfe"; ctx.fillRect(6,18,6,6); ctx.fillRect(22,18,6,6);
  ctx.strokeStyle = "#7090b0"; ctx.lineWidth = 0.5;
  ctx.strokeRect(6,18,6,6); ctx.strokeRect(22,18,6,6);
  // 窓の十字
  ctx.beginPath(); ctx.moveTo(9,18); ctx.lineTo(9,24); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(6,21); ctx.lineTo(12,21); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(25,18); ctx.lineTo(25,24); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(22,21); ctx.lineTo(28,21); ctx.stroke();
}

function _drawCave(ctx, w, h) {
  ctx.fillStyle = "#495057";
  ctx.fillRect(0, 0, w, h);
  // 岩肌
  ctx.fillStyle = "#343a40";
  [[0,0,16,12],[20,0,14,10],[0,16,12,18],[22,20,12,14]].forEach(([x,y,rw,rh])=>ctx.fillRect(x,y,rw,rh));
  // 鍾乳石（上から垂れる）
  ctx.fillStyle = "#6c757d";
  [[7,0,5,11],[17,0,4,14],[26,0,5,9]].forEach(([x,y,sw,sh])=>{
    ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+sw/2,y+sh); ctx.lineTo(x+sw,y); ctx.closePath(); ctx.fill();
  });
  // 洞窟入口（アーチ）
  ctx.fillStyle = "#111";
  ctx.beginPath();
  ctx.arc(17, 27, 11, Math.PI, 0);
  ctx.lineTo(28,h); ctx.lineTo(6,h); ctx.closePath(); ctx.fill();
}

function drawTile(ctx, tile, w, h) {
  const fns = {
    [TILE.GRASS]:    _drawGrass,
    [TILE.FOREST]:   _drawForest,
    [TILE.MOUNTAIN]: _drawMountain,
    [TILE.SEA]:      _drawSea,
    [TILE.WATER]:    _drawWater,
    [TILE.LAKE]:     _drawLake,
    [TILE.DESERT]:   _drawDesert,
    [TILE.BRIDGE]:   _drawBridge,
    [TILE.TOWN]:     _drawTown,
    [TILE.SCHOOL]:   _drawSchool,
    [TILE.HOME]:     _drawHome,
    [TILE.CAVE]:     _drawCave,
  };
  const fn = fns[tile];
  if (fn) { fn(ctx, w, h); return; }
  ctx.fillStyle = MINI_COLOR[tile] ?? "#333";
  ctx.fillRect(0, 0, w, h);
}

function TileCanvas({ tile, size = 34 }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, size, size);
    drawTile(ctx, tile, size, size);
  }, [tile, size]);
  return (
    <canvas ref={canvasRef} width={size} height={size}
      style={{ position:"absolute", top:0, left:0, imageRendering:"pixelated" }} />
  );
}

// 戦闘スプライト: 通常は `./images/enemy-{id}.png`。未リネームの差し替えPNGがある id のみここでファイル名を指定。
const ENEMY_BATTLE_IMAGE_FILE = {
  5:  "Remove_background_to_create_transparent_PNG-1776601649917.png",  // ミニスライム
  19: "Remove_background_to_create_transparent_PNG-1776601637501.png",  // もりのせいれい
  22: "Remove_background_to_create_transparent_PNG-1776601643472.png",  // まよいぼたる
  35: "Remove_background_to_create_transparent_PNG-1776601602724.png",  // ほねこうもり
};

function EnemySprite({ enemy, size = 72, flash = false }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !enemy) return;
    const ctx = canvas.getContext("2d");
    const s = size;
    const cx = s / 2;
    const cy = s / 2;
    ctx.clearRect(0, 0, s, s);

    // ドット絵（画像）がある場合は画像で描画する（無ければ従来の図形描画）
    // 戦闘中の敵ドット: `./images/enemy-${id}.png`（透過PNG想定）。タイトル画面とは別。無ければベクター。
    const getEnemyImage = (enemyData) => {
      if (!EnemySprite.__imgCache) EnemySprite.__imgCache = new Map();
      const cache = EnemySprite.__imgCache;
      const file = enemyData?.formImageFile ?? ENEMY_BATTLE_IMAGE_FILE[enemyData?.id] ?? `enemy-${enemyData?.id}.png`;
      if (cache.has(file)) return cache.get(file);
      const img = new Image();
      img.src = `./images/${file}`;
      cache.set(file, img);
      return img;
    };

    const isSlime = enemy.id === 0;
    const isMiniSlime = enemy.id === 5;
    const isDrango = enemy.id === 38;

    const tier = enemy.id >= 36 ? "boss" : enemy.id >= 24 ? "heavy" : enemy.id >= 16 ? "beast" : "basic";
    // 基本色（DQ寄せは「顔」と「輪郭」のほうで調整する）
    const bodyBase = tier === "boss" ? "#7c3aed" : tier === "heavy" ? "#64748b" : tier === "beast" ? "#16a34a" : "#60a5fa";
    const accentBase = tier === "boss" ? "#f59e0b" : tier === "heavy" ? "#eab308" : tier === "beast" ? "#dc2626" : "#22c55e";
    const body = isSlime ? (flash ? "#a7f3d0" : "#34d399") : (isDrango ? (flash ? "#f8fafc" : "#7f1d1d") : bodyBase);
    const accent = isDrango ? (flash ? "#f59e0b" : "#fbbf24") : accentBase;
    const outline = "#0b0f17";

    const img = getEnemyImage(enemy);
    const canUseImage = img && img.complete && img.naturalWidth > 0;
    const drawFromImage = () => {
      ctx.clearRect(0, 0, s, s);
      ctx.imageSmoothingEnabled = false;
      // 影
      ctx.fillStyle = tier === "boss" ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.25)";
      ctx.beginPath();
      ctx.ellipse(cx, s * 0.84, tier === "boss" ? s * 0.30 : s * 0.22, tier === "boss" ? s * 0.09 : s * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();

      // 画像（サイズに合わせて拡大）
      ctx.drawImage(img, 0, 0, s, s);
      if (flash) {
        // 被弾フラッシュ（画像の上に薄く白を重ねるだけ）
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.fillRect(0, 0, s, s);
        ctx.strokeStyle = "rgba(255,255,255,0.55)";
        ctx.lineWidth = Math.max(1, s * 0.02);
        ctx.strokeRect(0.5, 0.5, s - 1, s - 1);
      }
    };

    if (canUseImage) {
      drawFromImage();
      return;
    }

    // 画像が読み込み中なら、できた時点で再描画（失敗は無視）
    if (img && !canUseImage) {
      const onLoad = () => {
        // 画面を離れても描かない
        if (!canvasRef.current) return;
        try {
          ctx.imageSmoothingEnabled = false;
          drawFromImage();
        } catch (_) {}
      };
      const onError = () => {
        // 画像無し扱いで従来描画へ
        // (何もしない)
      };
      img.onload = onLoad;
      img.onerror = onError;
    }

    // ミニスライム（戦闘）：enemy-5.png が無ければ専用ベクター（通常スライムより小さく丸顔）
    if (isMiniSlime) {
      const drawMiniSlimeVector = () => {
        ctx.clearRect(0, 0, s, s);
        ctx.fillStyle = "rgba(0,0,0,0.22)";
        ctx.beginPath();
        ctx.ellipse(cx, s * 0.88, s * 0.15, s * 0.048, 0, 0, Math.PI * 2);
        ctx.fill();
        const cy0 = cy + s * 0.05;
        const r = s * 0.17;
        const g = ctx.createRadialGradient(cx - r * 0.35, cy0 - r * 0.45, r * 0.08, cx, cy0, r);
        g.addColorStop(0, flash ? "#ecfccb" : "#d1fae5");
        g.addColorStop(1, flash ? "#86efac" : "#34d399");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = outline;
        ctx.lineWidth = Math.max(1, s * 0.016);
        ctx.stroke();
        ctx.fillStyle = flash ? "#a7f3d0" : "rgba(16,185,129,0.45)";
        ctx.beginPath();
        ctx.arc(cx - s * 0.055, cy0 + s * 0.03, s * 0.02, 0, Math.PI * 2);
        ctx.arc(cx + s * 0.065, cy0 - s * 0.02, s * 0.016, 0, Math.PI * 2);
        ctx.fill();
        const er = Math.max(1.5, s * 0.03);
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.arc(cx - s * 0.06, cy0 - s * 0.06, er, 0, Math.PI * 2);
        ctx.arc(cx + s * 0.06, cy0 - s * 0.06, er, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(cx - s * 0.052, cy0 - s * 0.068, er * 0.32, 0, Math.PI * 2);
        ctx.arc(cx + s * 0.068, cy0 - s * 0.065, er * 0.32, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(15,23,42,0.88)";
        ctx.lineWidth = Math.max(1, s * 0.014);
        ctx.beginPath();
        ctx.arc(cx, cy0 + s * 0.065, s * 0.04, 0.12 * Math.PI, 0.88 * Math.PI);
        ctx.stroke();
        if (flash) {
          ctx.fillStyle = "rgba(255,255,255,0.22)";
          ctx.fillRect(0, 0, s, s);
        }
      };
      drawMiniSlimeVector();
      return;
    }

    // Shadow
    ctx.fillStyle = tier === "boss" ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(cx, s * 0.84, tier === "boss" ? s * 0.3 : s * 0.22, tier === "boss" ? s * 0.09 : s * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();

    if (tier === "boss") {
      // Boss wings
      ctx.fillStyle = flash ? "#f8fafc" : "#3b0764";
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.14, cy - s * 0.02);
      ctx.quadraticCurveTo(cx - s * 0.5, cy - s * 0.22, cx - s * 0.42, cy + s * 0.18);
      ctx.quadraticCurveTo(cx - s * 0.3, cy + s * 0.08, cx - s * 0.14, cy + s * 0.05);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx + s * 0.14, cy - s * 0.02);
      ctx.quadraticCurveTo(cx + s * 0.5, cy - s * 0.22, cx + s * 0.42, cy + s * 0.18);
      ctx.quadraticCurveTo(cx + s * 0.3, cy + s * 0.08, cx + s * 0.14, cy + s * 0.05);
      ctx.closePath();
      ctx.fill();
    }

    // Body
    ctx.fillStyle = flash ? "#f8fafc" : body;
    ctx.beginPath();
    const bodyR = tier === "boss" ? s * 0.28 : s * 0.22;
    ctx.arc(cx, cy, bodyR, 0, Math.PI * 2);
    ctx.fill();
    // DQっぽいアウトライン（輪郭の統一で「荒さ」を減らす）
    ctx.lineWidth = Math.max(1, s * 0.015);
    ctx.strokeStyle = outline;
    ctx.beginPath();
    ctx.arc(cx, cy, bodyR, 0, Math.PI * 2);
    ctx.stroke();

    // Non-boss archetype details (120% upgrade for regular enemies)
    const archetype = enemy.id % 5; // 0:slime 1:fang 2:shell 3:beast 4:spirit
    if (tier !== "boss") {
      // simple back spikes for heavy/beast
      if (tier === "heavy" || tier === "beast") {
        ctx.fillStyle = flash ? "#f8fafc" : "#1f2937";
        for (let i = 0; i < 2; i++) {
          const px = cx - s * 0.16 + i * s * 0.16;
          ctx.beginPath();
          ctx.moveTo(px, cy - s * 0.16);
          ctx.lineTo(px + s * 0.04, cy - s * 0.28);
          ctx.lineTo(px + s * 0.08, cy - s * 0.16);
          ctx.closePath();
          ctx.fill();
        }
      }

      if (isSlime || archetype === 0) {
        // slime-like: glossy forehead + soft underbelly
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        ctx.beginPath();
        ctx.ellipse(cx - s * 0.05, cy - s * 0.08, s * 0.07, s * 0.04, -0.4, 0, Math.PI * 2);
        ctx.fill();
        // スライムの「ぷつぷつ」（これがないと図形寄せに見える）
        const spotColor = flash ? "#e2e8f0" : "rgba(16,185,129,0.35)";
        ctx.fillStyle = spotColor;
        const spots = [
          { x: cx - s * 0.12, y: cy - s * 0.02, r: s * 0.018 },
          { x: cx + s * 0.10, y: cy + s * 0.01, r: s * 0.022 },
          { x: cx - s * 0.02, y: cy + s * 0.08, r: s * 0.02 },
        ];
        spots.forEach((p) => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        });

        ctx.fillStyle = flash ? "#e2e8f0" : "rgba(219,234,254,0.75)";
        ctx.beginPath();
        ctx.ellipse(cx, cy + s * 0.08, s * 0.1, s * 0.05, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (archetype === 1) {
        // fang type: jaw + fangs
        ctx.fillStyle = flash ? "#f8fafc" : "#111827";
        ctx.fillRect(cx - s * 0.09, cy + s * 0.05, s * 0.18, s * 0.05);
        ctx.fillStyle = "#f8fafc";
        ctx.beginPath();
        ctx.moveTo(cx - s * 0.06, cy + s * 0.1);
        ctx.lineTo(cx - s * 0.03, cy + s * 0.16);
        ctx.lineTo(cx - s * 0.01, cy + s * 0.1);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx + s * 0.06, cy + s * 0.1);
        ctx.lineTo(cx + s * 0.03, cy + s * 0.16);
        ctx.lineTo(cx + s * 0.01, cy + s * 0.1);
        ctx.closePath();
        ctx.fill();
      } else if (archetype === 2) {
        // shell type: armor bands
        ctx.strokeStyle = flash ? "#f8fafc" : "#334155";
        ctx.lineWidth = Math.max(1, s * 0.018);
        for (let i = 0; i < 3; i++) {
          const yy = cy - s * 0.06 + i * s * 0.06;
          ctx.beginPath();
          ctx.moveTo(cx - s * 0.13, yy);
          ctx.lineTo(cx + s * 0.13, yy);
          ctx.stroke();
        }
      } else if (archetype === 3) {
        // beast type: ears/wings
        ctx.fillStyle = flash ? "#f8fafc" : accent;
        ctx.beginPath();
        ctx.moveTo(cx - s * 0.1, cy - s * 0.14);
        ctx.lineTo(cx - s * 0.16, cy - s * 0.26);
        ctx.lineTo(cx - s * 0.03, cy - s * 0.18);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx + s * 0.1, cy - s * 0.14);
        ctx.lineTo(cx + s * 0.16, cy - s * 0.26);
        ctx.lineTo(cx + s * 0.03, cy - s * 0.18);
        ctx.closePath();
        ctx.fill();
      } else {
        // spirit type: orbit ring
        ctx.strokeStyle = `${accent}bb`;
        ctx.lineWidth = Math.max(1, s * 0.02);
        ctx.beginPath();
        ctx.ellipse(cx, cy + s * 0.02, s * 0.2, s * 0.08, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Crown/Horns by tier
    if (tier === "boss" || tier === "heavy") {
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.16, cy - s * 0.15);
      ctx.lineTo(cx - s * 0.05, cy - s * 0.32);
      ctx.lineTo(cx, cy - s * 0.18);
      ctx.lineTo(cx + s * 0.05, cy - s * 0.32);
      ctx.lineTo(cx + s * 0.16, cy - s * 0.15);
      ctx.closePath();
      ctx.fill();
    }

    if (tier === "boss") {
      // Boss core glow
      const coreGrad = ctx.createRadialGradient(cx, cy + s * 0.02, s * 0.02, cx, cy + s * 0.02, s * 0.14);
      coreGrad.addColorStop(0, flash ? "rgba(255,255,255,0.95)" : "rgba(251,191,36,0.95)");
      coreGrad.addColorStop(1, "rgba(251,191,36,0)");
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy + s * 0.02, s * 0.14, 0, Math.PI * 2);
      ctx.fill();

      if (isDrango) {
        // ドランゴの「翼」だけは図形の角度を少し強めて別物感を出す
        ctx.fillStyle = flash ? "#fff" : "#7c2d12";
        for (let i = 0; i < 3; i++) {
          const px = cx - s * 0.14 + i * s * 0.14;
          ctx.beginPath();
          ctx.moveTo(px, cy - s * 0.14);
          ctx.lineTo(px - s * 0.02, cy - s * 0.28);
          ctx.lineTo(px + s * 0.05, cy - s * 0.24);
          ctx.closePath();
          ctx.fill();
        }
      }
    }

    // Eyes
    ctx.fillStyle = flash ? "#fff" : "#111827";
    ctx.beginPath();
    const eyeOffset = tier === "boss" ? s * 0.1 : s * 0.08;
    const eyeRadius = tier === "boss" ? s * 0.035 : s * 0.03;

    if (isSlime) {
      // スライムの目は「上寄り＋小さめ」で顔になる
      const r = Math.max(1, s * 0.022);
      ctx.beginPath();
      ctx.arc(cx - s * 0.08, cy - s * 0.06, r, 0, Math.PI * 2);
      ctx.arc(cx + s * 0.08, cy - s * 0.06, r, 0, Math.PI * 2);
      ctx.fill();
      // 瞳ハイライト
      ctx.fillStyle = flash ? "#fbbf24" : "#0b0f17";
      ctx.beginPath();
      ctx.arc(cx - s * 0.07, cy - s * 0.065, r * 0.35, 0, Math.PI * 2);
      ctx.arc(cx + s * 0.09, cy - s * 0.058, r * 0.35, 0, Math.PI * 2);
      ctx.fill();
    } else if (isDrango) {
      // ドランゴの目：細め（竜っぽい“圧”）
      ctx.fillStyle = flash ? "#fff" : "#111827";
      ctx.beginPath();
      ctx.ellipse(cx - eyeOffset * 0.95, cy - s * 0.045, s * 0.028, s * 0.012, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + eyeOffset * 0.95, cy - s * 0.045, s * 0.028, s * 0.012, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = flash ? "#f59e0b" : "#0b0f17";
      ctx.beginPath();
      ctx.arc(cx - eyeOffset * 0.95, cy - s * 0.047, s * 0.010, 0, Math.PI * 2);
      ctx.arc(cx + eyeOffset * 0.95, cy - s * 0.047, s * 0.010, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // 他タイプの目：archetypeで“顔の型”を分ける
      if (archetype === 1) {
        // キバ：目は丸め、口は牙で表現する前提
        ctx.fillStyle = "rgba(248,250,252,0.95)";
        ctx.beginPath();
        ctx.arc(cx - eyeOffset, cy - s * 0.04, eyeRadius * 1.05, 0, Math.PI * 2);
        ctx.arc(cx + eyeOffset, cy - s * 0.04, eyeRadius * 1.05, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = flash ? accent : "#0b0f17";
        ctx.beginPath();
        ctx.arc(cx - eyeOffset, cy - s * 0.04, eyeRadius * 0.42, 0, Math.PI * 2);
        ctx.arc(cx + eyeOffset, cy - s * 0.04, eyeRadius * 0.42, 0, Math.PI * 2);
        ctx.fill();
      } else if (archetype === 2) {
        // 甲羅：目は小さく上寄せ
        ctx.fillStyle = flash ? "#fff" : "#111827";
        const r = eyeRadius * 0.7;
        ctx.beginPath();
        ctx.arc(cx - eyeOffset * 0.55, cy - s * 0.07, r, 0, Math.PI * 2);
        ctx.arc(cx + eyeOffset * 0.55, cy - s * 0.07, r, 0, Math.PI * 2);
        ctx.fill();
      } else if (archetype === 3) {
        // 獣：目は大きめ、わずかに非対称
        ctx.fillStyle = "rgba(248,250,252,0.95)";
        ctx.beginPath();
        ctx.arc(cx - eyeOffset * 1.05, cy - s * 0.045, eyeRadius * 1.05, 0, Math.PI * 2);
        ctx.arc(cx + eyeOffset * 0.85, cy - s * 0.040, eyeRadius * 1.02, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = flash ? accent : "#0b0f17";
        ctx.beginPath();
        ctx.arc(cx - eyeOffset * 1.05, cy - s * 0.045, eyeRadius * 0.40, 0, Math.PI * 2);
        ctx.arc(cx + eyeOffset * 0.85, cy - s * 0.040, eyeRadius * 0.40, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // 精霊：目を光点っぽく
        ctx.fillStyle = flash ? "#fff" : `${accent}ee`;
        const r = Math.max(1, s * 0.014);
        ctx.beginPath();
        ctx.arc(cx - eyeOffset, cy - s * 0.035, r, 0, Math.PI * 2);
        ctx.arc(cx + eyeOffset, cy - s * 0.035, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Mouth
    if (isSlime) {
      // 口を丸めて「ふにゃ」を作る
      ctx.strokeStyle = flash ? "#1f2937" : "rgba(15,23,42,0.85)";
      ctx.lineWidth = Math.max(1, s * 0.02);
      ctx.beginPath();
      ctx.arc(cx, cy + s * 0.11, s * 0.05, 0, Math.PI, false);
      ctx.stroke();
    } else if (isDrango) {
      // ドランゴの口は開ける（歯っぽい直線を追加）
      ctx.strokeStyle = accent;
      ctx.lineWidth = Math.max(1, s * 0.03);
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.10, cy + s * 0.06);
      ctx.quadraticCurveTo(cx, cy + s * 0.16, cx + s * 0.10, cy + s * 0.06);
      ctx.stroke();
      ctx.fillStyle = flash ? "#fff" : "#0b0f17";
      ctx.fillRect(cx - s * 0.035, cy + s * 0.11, s * 0.03, s * 0.02);
      ctx.fillRect(cx + s * 0.005, cy + s * 0.11, s * 0.03, s * 0.02);
    } else if (archetype === 1) {
      // キバ：口→小さな牙3つ（DQっぽい表情）
      ctx.strokeStyle = accent;
      ctx.lineWidth = Math.max(1, s * 0.02);
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.06, cy + s * 0.08);
      ctx.quadraticCurveTo(cx, cy + s * 0.12, cx + s * 0.06, cy + s * 0.08);
      ctx.stroke();
      ctx.fillStyle = flash ? "#fff" : "#0b0f17";
      const tx = [cx - s * 0.02, cx + s * 0.0, cx + s * 0.02];
      tx.forEach((x, i) => {
        const w = s * (i === 1 ? 0.02 : 0.018);
        const h = s * 0.045;
        ctx.beginPath();
        ctx.moveTo(x, cy + s * 0.11);
        ctx.lineTo(x - w, cy + s * 0.11 + h);
        ctx.lineTo(x + w, cy + s * 0.11 + h);
        ctx.closePath();
        ctx.fill();
      });
    } else if (archetype === 2) {
      // 甲羅：口は直線（殻に引っ込んだ感じ）
      ctx.strokeStyle = accent;
      ctx.lineWidth = Math.max(1, s * 0.02);
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.05, cy + s * 0.10);
      ctx.lineTo(cx + s * 0.05, cy + s * 0.10);
      ctx.stroke();
    } else if (archetype === 3) {
      // 獣：口は開いた形（角張り）
      ctx.strokeStyle = accent;
      ctx.lineWidth = Math.max(1, s * 0.03);
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.07, cy + s * 0.08);
      ctx.quadraticCurveTo(cx - s * 0.01, cy + s * 0.15, cx + s * 0.05, cy + s * 0.10);
      ctx.quadraticCurveTo(cx, cy + s * 0.12, cx - s * 0.07, cy + s * 0.08);
      ctx.stroke();
    } else {
      // 精霊：口は薄い微笑み
      ctx.strokeStyle = flash ? accent : `${accent}cc`;
      ctx.lineWidth = Math.max(1, s * 0.02);
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.04, cy + s * 0.11);
      ctx.quadraticCurveTo(cx, cy + s * 0.14, cx + s * 0.04, cy + s * 0.11);
      ctx.stroke();
    }

    // Simple aura particles
    ctx.fillStyle = `${accent}cc`;
    const particleCount = isDrango ? 6 : isSlime ? 2 : tier === "boss" ? 7 : 3;
    for (let i = 0; i < particleCount; i++) {
      const a = (Math.PI * 2 * i) / particleCount + enemy.id * 0.17;
      ctx.beginPath();
      const pr = tier === "boss" ? s * 0.036 : s * 0.02;
      const px = tier === "boss" ? s * 0.4 : s * 0.32;
      const py = tier === "boss" ? s * 0.31 : s * 0.26;
      ctx.arc(cx + Math.cos(a) * px, cy + Math.sin(a) * py, pr, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [enemy, size, flash]);

  return <canvas ref={canvasRef} width={size} height={size} style={{ imageRendering: "pixelated", display: "block" }} />;
}

function WorldLandmarkIcon({ kind, size = 24 }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !kind) return;
    const ctx = canvas.getContext("2d");
    const s = size;
    ctx.clearRect(0, 0, s, s);

    // base
    const centerX = s / 2;
    const centerY = s / 2;

    if (kind === "bridge") {
      ctx.fillStyle = "#6b4f33";
      ctx.fillRect(s * 0.1, s * 0.52, s * 0.8, s * 0.2);
      ctx.strokeStyle = "#d6b48a";
      ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        const x = s * (0.18 + i * 0.18);
        ctx.beginPath();
        ctx.moveTo(x, s * 0.52);
        ctx.lineTo(x, s * 0.72);
        ctx.stroke();
      }
      return;
    }

    if (kind === "cave") {
      ctx.fillStyle = "#111827";
      ctx.beginPath();
      ctx.ellipse(centerX, s * 0.62, s * 0.34, s * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#0b0f17";
      ctx.beginPath();
      ctx.ellipse(centerX, s * 0.62, s * 0.2, s * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    // house/school/town variants
    const wall = kind === "school" ? "#d9e2ef" : kind === "mysticVillage" ? "#d6d3ff" : kind === "catVillage" ? "#ffe4e6" : "#f2e7d5";
    const roof = kind === "school" ? "#475569" : kind === "castleTown" ? "#7f1d1d" : kind === "mysticVillage" ? "#4c1d95" : kind === "catVillage" ? "#be123c" : "#b45309";
    ctx.fillStyle = roof;
    ctx.beginPath();
    ctx.moveTo(s * 0.16, s * 0.44);
    ctx.lineTo(s * 0.5, s * 0.2);
    ctx.lineTo(s * 0.84, s * 0.44);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = wall;
    ctx.fillRect(s * 0.22, s * 0.44, s * 0.56, s * 0.34);

    if (kind === "castleTown") {
      ctx.fillStyle = "#9ca3af";
      ctx.fillRect(s * 0.1, s * 0.34, s * 0.14, s * 0.44);
      ctx.fillRect(s * 0.76, s * 0.34, s * 0.14, s * 0.44);
      ctx.fillStyle = "#fca5a5";
      ctx.fillRect(s * 0.43, s * 0.56, s * 0.14, s * 0.22);
    } else if (kind === "catVillage") {
      ctx.fillStyle = "#111827";
      ctx.beginPath();
      ctx.arc(s * 0.42, s * 0.64, s * 0.03, 0, Math.PI * 2);
      ctx.arc(s * 0.58, s * 0.64, s * 0.03, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(s * 0.46, s * 0.71);
      ctx.lineTo(s * 0.5, s * 0.67);
      ctx.lineTo(s * 0.54, s * 0.71);
      ctx.strokeStyle = "#111827";
      ctx.lineWidth = 1;
      ctx.stroke();
    } else if (kind === "school") {
      ctx.fillStyle = "#2563eb";
      ctx.fillRect(s * 0.44, s * 0.54, s * 0.12, s * 0.24);
      ctx.fillStyle = "#facc15";
      ctx.fillRect(s * 0.26, s * 0.54, s * 0.12, s * 0.1);
      ctx.fillRect(s * 0.62, s * 0.54, s * 0.12, s * 0.1);
    } else {
      ctx.fillStyle = kind === "home" ? "#16a34a" : "#8b5cf6";
      ctx.fillRect(s * 0.44, s * 0.56, s * 0.12, s * 0.22);
    }
  }, [kind, size]);

  return <canvas ref={canvasRef} width={size} height={size} style={{ imageRendering: "pixelated", display: "block" }} />;
}

function SignPostIcon({ size = 22 }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const s = size;
    ctx.clearRect(0, 0, s, s);
    ctx.fillStyle = "#7c5a3a";
    ctx.fillRect(s * 0.44, s * 0.45, s * 0.12, s * 0.45);
    ctx.fillStyle = "#e6d3ac";
    ctx.fillRect(s * 0.18, s * 0.15, s * 0.64, s * 0.28);
    ctx.strokeStyle = "#6b4f2e";
    ctx.lineWidth = 1;
    ctx.strokeRect(s * 0.18, s * 0.15, s * 0.64, s * 0.28);
  }, [size]);
  return <canvas ref={canvasRef} width={size} height={size} style={{ imageRendering: "pixelated", display: "block" }} />;
}

function InteriorTileIcon({ kind, size = 20, opened = false }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !kind) return;
    const ctx = canvas.getContext("2d");
    const s = size;
    ctx.clearRect(0, 0, s, s);

    if (kind === "exit") {
      ctx.fillStyle = "#16a34a";
      ctx.fillRect(s * 0.2, s * 0.1, s * 0.6, s * 0.8);
      ctx.fillStyle = "#14532d";
      ctx.fillRect(s * 0.48, s * 0.44, s * 0.08, s * 0.08);
      return;
    }
    if (kind === "fountain") {
      ctx.fillStyle = "#1d4ed8";
      ctx.fillRect(s * 0.15, s * 0.58, s * 0.7, s * 0.2);
      ctx.fillStyle = "#93c5fd";
      ctx.beginPath();
      ctx.arc(s * 0.5, s * 0.42, s * 0.18, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    if (kind === "chest") {
      // 典型的なRPG宝箱: 赤いフタ + 茶色の箱 + 金具
      ctx.fillStyle = opened ? "#9ca3af" : "#7a4a23";
      ctx.fillRect(s * 0.16, s * 0.40, s * 0.68, s * 0.34);
      ctx.fillStyle = opened ? "#d1d5db" : "#b91c1c";
      ctx.fillRect(s * 0.16, s * 0.25, s * 0.68, s * 0.17);
      ctx.strokeStyle = opened ? "#6b7280" : "#f59e0b";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(s * 0.20, s * 0.47);
      ctx.lineTo(s * 0.80, s * 0.47);
      ctx.stroke();
      ctx.fillStyle = opened ? "#6b7280" : "#fbbf24";
      ctx.fillRect(s * 0.46, s * 0.46, s * 0.08, s * 0.11);
      return;
    }
    if (kind === "shelf") {
      ctx.fillStyle = "#7c4a2d";
      ctx.fillRect(s * 0.2, s * 0.2, s * 0.6, s * 0.6);
      ctx.strokeStyle = "#c7a17a";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(s * 0.24, s * 0.46);
      ctx.lineTo(s * 0.76, s * 0.46);
      ctx.stroke();
      return;
    }
    if (kind === "desk") {
      ctx.fillStyle = "#6b4f33";
      ctx.fillRect(s * 0.16, s * 0.34, s * 0.68, s * 0.38);
      return;
    }
    if (kind === "board") {
      ctx.fillStyle = "#166534";
      ctx.fillRect(s * 0.12, s * 0.18, s * 0.76, s * 0.56);
      ctx.strokeStyle = "#d1d5db";
      ctx.lineWidth = 1;
      ctx.strokeRect(s * 0.12, s * 0.18, s * 0.76, s * 0.56);
      return;
    }
    if (kind === "counter") {
      ctx.fillStyle = "#7c5c3a";
      ctx.fillRect(s * 0.08, s * 0.28, s * 0.84, s * 0.5);
      return;
    }
    if (kind === "stairsDown") {
      ctx.fillStyle = "#64748b";
      ctx.fillRect(s * 0.14, s * 0.18, s * 0.72, s * 0.64);
      ctx.fillStyle = "#cbd5e1";
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(s * (0.2 + i * 0.14), s * (0.26 + i * 0.1), s * 0.12, s * 0.08);
      }
      return;
    }
    if (kind === "stairsUp") {
      ctx.fillStyle = "#94a3b8";
      ctx.fillRect(s * 0.14, s * 0.18, s * 0.72, s * 0.64);
      ctx.fillStyle = "#1e293b";
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(s * (0.2 + i * 0.14), s * (0.58 - i * 0.1), s * 0.12, s * 0.08);
      }
    }
  }, [kind, size, opened]);
  return <canvas ref={canvasRef} width={size} height={size} style={{ imageRendering: "pixelated", display: "block" }} />;
}

// ─── SHOP OVERLAY ────────────────────────────────────────────────────────────
function ShopOverlay({ player, onBuy, onClose, items = SHOP_ITEMS_T1 }) {
  const [msg, setMsg] = useState(null);
  const buy = (item) => {
    if (item.type === "equip" && (player.equip ?? {})[item.slot] === item.id) {
      setMsg("すでに　そうびしている！"); return;
    }
    if (player.gold < item.cost) { setMsg("ゴールドが　たりない！"); return; }
    onBuy(item);
    setMsg(item.type === "equip" ? `${item.name}を　そうびした！` : `${item.name}を　買った！`);
  };
  const slotLabel = { weapon:"武器", armor:"防具", accessory:"アクセ" };
  return (
    <div className="flex flex-col h-full bg-black text-white p-4 gap-3">
      <p className="text-center text-yellow-300 text-xs border-b border-gray-700 pb-2"
        style={{ fontFamily:"'Courier New',monospace" }}>── ショップ ──</p>
      <p className="text-right text-yellow-400 text-xs">{player.gold}G</p>
      <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
        {items.map(item => {
          const equipped = item.type === "equip" && (player.equip ?? {})[item.slot] === item.id;
          return (
            <button key={item.id}
              className={`border p-2 text-xs flex justify-between items-center gap-1 active:opacity-60 ${equipped ? "border-yellow-500 bg-yellow-900/30" : "border-gray-600"}`}
              onClick={() => buy(item)}>
              <span>{item.name}</span>
              <span className="text-right shrink-0">
                {equipped
                  ? <span className="text-yellow-400">そうびちゅう</span>
                  : <span className="flex gap-2 items-center">
                      {item.slot && <span className="text-gray-500 text-[10px]">{slotLabel[item.slot]}</span>}
                      <span className="text-gray-300">{item.desc}</span>
                      <span className="text-yellow-300">{item.cost}G</span>
                    </span>
                }
              </span>
            </button>
          );
        })}
      </div>
      {msg && <p className="text-center text-green-300 text-xs animate-pulse">{msg}</p>}
      <button className="border-2 border-white py-2 text-xs active:opacity-60"
        style={{ fontFamily:"'Courier New',monospace" }} onClick={onClose}>もどる</button>
    </div>
  );
}

// ─── MESSAGE BOX ─────────────────────────────────────────────────────────────
// ─── CAVE DARKNESS OVERLAY ───────────────────────────────────────────────────
function CaveDarkness({ intPos, TS, cols, rows }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = cols * TS;
    const h = rows * TS;

    // 画面全体を暗くする
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(0,0,0,0.90)";
    ctx.fillRect(0, 0, w, h);

    // プレイヤーの位置だけ消しゴム（ラジアルグラデーション）で光らせる
    const px = intPos.x * TS + TS / 2;
    const py = intPos.y * TS + TS / 2;
    const radius = TS * 2.8;

    const g = ctx.createRadialGradient(px, py, 0, px, py, radius);
    g.addColorStop(0,   "rgba(0,0,0,1)");    // 中心：完全に消す（透過）
    g.addColorStop(0.55,"rgba(0,0,0,0.85)"); // 少し外：ほぼ消す
    g.addColorStop(1,   "rgba(0,0,0,0)");    // 端：消さない（暗い）

    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "source-over";
  }, [intPos.x, intPos.y, TS, cols, rows]);

  return (
    <canvas
      ref={canvasRef}
      width={cols * TS}
      height={rows * TS}
      style={{
        position: "absolute", top: 0, left: 0,
        pointerEvents: "none", imageRendering: "pixelated",
      }}
    />
  );
}

// mood → ウィンドウ演出マップ
const MOOD_STYLE = {
  warn:   { border: "#ef4444", bg: "#1a0000", text: "#fca5a5", speed: 22 }, // 赤・警告
  sad:    { border: "#60a5fa", bg: "#00001a", text: "#bfdbfe", speed: 38 }, // 青・悲しみ（ややゆっくり）
  hope:   { border: "#fde68a", bg: "#0a0a00", text: "#fef9c3", speed: 18 }, // 黄・希望（速め）
  normal: { border: "#ffffff", bg: "#000000", text: "#ffffff", speed: 20 }, // デフォルト白
};

function MessageBox({ lines, onNext, showCursor = true, mood = "normal" }) {
  const [shown, setShown]     = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [done, setDone]       = useState(false);
  const [fast, setFast]       = useState(false);
  const timerRef = useRef(null);
  const boxRef   = useRef(null);
  const ms = MOOD_STYLE[mood] ?? MOOD_STYLE.normal;

  const effectiveLines = useMemo(() => {
    if (!Array.isArray(lines)) return [];
    // 会話が長すぎると「押す回数」が増えて疲れるので、長い時だけ塊にまとめる。
    // 文の雰囲気は壊さないため、結合は全角スペースでつなぐだけにする。
    const desiredMax = 7;
    if (lines.length <= desiredMax) return lines;
    const groupSize = Math.ceil(lines.length / desiredMax);
    const merged = [];
    for (let i = 0; i < lines.length; i += groupSize) {
      merged.push(lines.slice(i, i + groupSize).join("　"));
    }
    return merged;
  }, [lines]);

  useEffect(() => { setShown(0); setCharIdx(0); setDone(false); }, [lines]);

  useEffect(() => {
    if (shown >= effectiveLines.length) { setDone(true); return; }
    if (!effectiveLines[shown]) { setDone(true); return; }
    if (charIdx < effectiveLines[shown].length) {
      const speed = fast ? 6 : ms.speed;
      timerRef.current = setTimeout(() => setCharIdx((c) => c + 1), speed);
      return () => clearTimeout(timerRef.current);
    }
  }, [shown, charIdx, effectiveLines, fast]);

  const advance = () => {
    clearTimeout(timerRef.current);
    const cur = effectiveLines[shown];
    if (!cur) { onNext && onNext(); return; }
    if (charIdx < cur.length) { setCharIdx(cur.length); return; }
    if (shown < effectiveLines.length - 1) { setShown((s) => s + 1); setCharIdx(0); }
    else { onNext && onNext(); }
  };

  const displayLines = effectiveLines.slice(0, shown + 1).map((l, i) => (i < shown ? l : l.slice(0, charIdx)));
  useEffect(() => { if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight; }, [displayLines]);

  return (
    <div ref={boxRef}
      className="w-full border-2 p-4 cursor-pointer select-none h-[124px] overflow-y-auto"
      style={{ fontFamily:"'Courier New',monospace", borderColor: ms.border, background: ms.bg, color: ms.text,
               boxShadow: mood !== "normal" ? `0 0 8px ${ms.border}55` : "none" }}
      onClick={advance}
      onPointerDown={() => setFast(true)}
      onPointerUp={() => setFast(false)}
      onPointerCancel={() => setFast(false)}
      onPointerLeave={() => setFast(false)}
      onKeyDown={(e) => {
        if (e.key === "Shift") setFast(true);
        if (e.key === " " || e.key === "Enter" || e.key === "Escape" || e.key === "x") advance();
      }}
      onKeyUp={(e) => {
        if (e.key === "Shift") setFast(false);
      }}
      tabIndex={0}>
      {displayLines.map((l, i) => <p key={i} className="text-sm leading-6">{l || "　"}</p>)}
      {done && showCursor && <span className="inline-block animate-bounce text-yellow-300 ml-1">▼</span>}
    </div>
  );
}

function HPBar({ label, current, max, color = "green" }) {
  const pct = clamp(Math.round((current / max) * 100), 0, 100);
  const barColor = color === "red" ? "bg-red-500" : pct > 50 ? "bg-green-500" : pct > 25 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-10 text-right text-gray-300">{label}</span>
      <div className="flex-1 bg-gray-800 border border-gray-600 h-3 rounded-sm overflow-hidden">
        <div className={`${barColor} h-full transition-all duration-300`} style={{ width:`${pct}%` }} />
      </div>
      <span className="w-14 text-right text-white">{current}/{max}</span>
    </div>
  );
}

// ─── SCREENS ─────────────────────────────────────────────────────────────────
// タイトル用画像（`147-RPG/images/`）。上から順に最初に読み込めた1枚だけ採用。
// 未配置のスロットはキャンバス／テキストのまま（足りない一覧はリリースノートや返信で明示）。
const TITLE_IMG_BG = [
  "./images/title-bg.png", "./images/title-bg.jpg", "./images/title-background.png",
  "./images/title_sky.png", "./images/night-sky.png", "./images/bg-title.png",
];
const TITLE_IMG_FG = [
  "./images/title-mountains.png", "./images/title-silhouette.png", "./images/title-foreground.png",
  "./images/title-ground.png", "./images/mountains.png", "./images/silhouette.png",
];
const TITLE_IMG_LOGO = [
  "./images/title-logo.png", "./images/logo.png", "./images/manabi-logo.png",
  "./images/title.png", "./images/title-text.png",
];

function loadFirstAvailableImage(paths, onReady) {
  let i = 0;
  let cancelled = false;
  const next = () => {
    if (cancelled) return;
    if (i >= paths.length) {
      onReady(null);
      return;
    }
    const img = new Image();
    const src = paths[i];
    img.onload = () => { if (!cancelled) onReady(img); };
    img.onerror = () => { i++; next(); };
    img.src = src;
  };
  next();
  return () => { cancelled = true; };
}

function TitleScreen({ onStart, hasSave, onContinue }) {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);
  const [phase,       setPhase]       = useState(0); // 0=暗転 1=フラッシュ 2=文字表示 3=スイープ 4=メニュー
  const [revealChar,  setRevealChar]  = useState(0);
  const [swept,       setSwept]       = useState(false);
  const [blink, setBlink] = useState(true);
  const [titleBg, setTitleBg]   = useState(null);
  const [titleFg, setTitleFg]   = useState(null);
  const [titleLogo, setTitleLogo] = useState(null);

  useEffect(() => {
    const c1 = loadFirstAvailableImage(TITLE_IMG_BG, setTitleBg);
    const c2 = loadFirstAvailableImage(TITLE_IMG_FG, setTitleFg);
    const c3 = loadFirstAvailableImage(TITLE_IMG_LOGO, setTitleLogo);
    return () => { c1(); c2(); c3(); };
  }, []);

  const LINE1 = ['ぼ','く','ら','の'];
  const LINE2 = ['ま','な','び','の','旅'];
  const ALL   = [...LINE1, ...LINE2];

  useEffect(() => {
    if (titleLogo && phase >= 2) setRevealChar(ALL.length);
  }, [titleLogo, phase, ALL.length]);

  // ── Canvas（星空 + 雲スクロール + シルエット + 竜）／背景・手前画像があれば合成 ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width  = canvas.offsetWidth;
    const H = canvas.height = canvas.offsetHeight;

    const stars = Array.from({ length: titleBg ? 110 : 200 }, () => ({
      x: Math.random() * W, y: Math.random() * H * 0.78,
      r: Math.random() * 1.5 + 0.3,
      tw: Math.random() * 0.028 + 0.007,
      ph: Math.random() * Math.PI * 2,
    }));
    const clouds = Array.from({ length: 6 }, (_, i) => ({
      x: Math.random() * W, y: H * (0.08 + i * 0.04 + Math.random() * 0.06),
      w: 55 + Math.random() * 75, spd: 0.18 + Math.random() * 0.22,
      a: 0.04 + Math.random() * 0.05,
    }));
    const meteors = [];
    let frame = 0;
    let lastTs = performance.now();
    let dragonX = -120, dragonPhase = 0;

    function drawSilhouette() {
      const hy = H * 0.80;
      // 山脈シルエット
      ctx.fillStyle = 'rgba(12,5,25,0.97)';
      ctx.beginPath();
      ctx.moveTo(0, hy);
      ctx.lineTo(W*0.04, hy - H*0.10);
      ctx.lineTo(W*0.13, hy - H*0.21);
      ctx.lineTo(W*0.19, hy - H*0.14);
      ctx.lineTo(W*0.27, hy - H*0.30); // 城山（高め）
      ctx.lineTo(W*0.34, hy - H*0.17);
      ctx.lineTo(W*0.48, hy - H*0.13);
      ctx.lineTo(W*0.58, hy - H*0.25);
      ctx.lineTo(W*0.70, hy - H*0.16);
      ctx.lineTo(W*0.82, hy - H*0.22);
      ctx.lineTo(W*0.91, hy - H*0.11);
      ctx.lineTo(W,      hy - H*0.09);
      ctx.lineTo(W, H); ctx.lineTo(0, H);
      ctx.closePath(); ctx.fill();

      // 城
      const cx2 = W*0.27, cb = hy - H*0.30;
      const cw2 = W*0.075, ch2 = H*0.11;
      ctx.fillStyle = 'rgba(8,3,18,0.99)';
      ctx.fillRect(cx2 - cw2/2, cb - ch2, cw2, ch2);            // 城壁
      const tw2 = cw2*0.22, th2 = ch2*0.48;
      ctx.fillRect(cx2 - cw2/2 - tw2*0.25, cb - ch2 - th2,      tw2, th2); // 塔左
      ctx.fillRect(cx2 - tw2/2,             cb - ch2 - th2*1.65, tw2, th2*1.65); // 中央高塔
      ctx.fillRect(cx2 + cw2/2 - tw2*0.75, cb - ch2 - th2,      tw2, th2); // 塔右
      // 旗
      ctx.fillStyle = 'rgba(160,40,40,0.85)';
      ctx.beginPath();
      ctx.moveTo(cx2, cb - ch2 - th2*1.65 - 1);
      ctx.lineTo(cx2 + cw2*0.14, cb - ch2 - th2*1.65 + 7);
      ctx.lineTo(cx2,            cb - ch2 - th2*1.65 + 7);
      ctx.fill();

      // 地面
      ctx.fillStyle = 'rgba(6,2,14,1)';
      ctx.fillRect(0, hy, W, H - hy);

      // 地平線グロー
      const gl = ctx.createLinearGradient(0, hy-18, 0, hy+18);
      gl.addColorStop(0,   'rgba(70,25,110,0)');
      gl.addColorStop(0.5, 'rgba(90,35,140,0.12)');
      gl.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = gl;
      ctx.fillRect(0, hy-18, W, 36);
    }

    function drawCloud(c) {
      ctx.save();
      ctx.globalAlpha = c.a;
      ctx.fillStyle = '#b8ccf0';
      ctx.beginPath();
      ctx.ellipse(c.x,           c.y,     c.w*0.50, c.w*0.17, 0, 0, Math.PI*2);
      ctx.ellipse(c.x - c.w*0.2, c.y+3,   c.w*0.30, c.w*0.14, 0, 0, Math.PI*2);
      ctx.ellipse(c.x + c.w*0.2, c.y+3,   c.w*0.34, c.w*0.15, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }

    function drawDragon(x, y, f) {
      ctx.save();
      ctx.translate(x, y);
      const s = 0.68 + 0.04*Math.sin(f*0.09);
      ctx.scale(s, s);
      ctx.fillStyle = 'rgba(70,15,95,0.75)';
      ctx.beginPath(); ctx.ellipse(0, 0, 21, 7, -0.15, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(21, -2, 9, 5, 0.25, 0, Math.PI*2); ctx.fill();
      // 翼上
      ctx.beginPath(); ctx.moveTo(-4,-4);
      ctx.quadraticCurveTo(-14,-28,-28,-18);
      ctx.quadraticCurveTo(-18,-4,-4,-4); ctx.fill();
      // 翼下
      ctx.beginPath(); ctx.moveTo(-4, 4);
      ctx.quadraticCurveTo(-14, 24+4*Math.sin(f*0.14),-24,14);
      ctx.quadraticCurveTo(-17, 4,-4, 4); ctx.fill();
      // 尾
      ctx.beginPath(); ctx.moveTo(-18, 2);
      ctx.quadraticCurveTo(-36, 7+3*Math.sin(f*0.11),-43, 0);
      ctx.strokeStyle = 'rgba(70,15,95,0.75)'; ctx.lineWidth = 4; ctx.stroke();
      ctx.restore();
    }

    if (!titleBg) {
      ctx.fillStyle = "#000008";
      ctx.fillRect(0, 0, W, H);
    }

    function drawCover(img) {
      const sc = Math.max(W / img.width, H / img.height);
      const dw = img.width * sc;
      const dh = img.height * sc;
      const ox = (W - dw) / 2;
      const oy = (H - dh) / 2;
      ctx.drawImage(img, ox, oy, dw, dh);
    }

    function loop(now = performance.now()) {
      const delta = now - lastTs;
      lastTs = now;
      frame += delta / 16.666;

      if (titleBg) {
        ctx.globalAlpha = 1;
        drawCover(titleBg);
        ctx.fillStyle = 'rgba(2,0,18,0.48)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.fillRect(0, 0, W, H * 0.35);
      } else {
        ctx.fillStyle = 'rgba(0,0,8,0.17)';
        ctx.fillRect(0, 0, W, H);
      }

      // 星（背景写真時は控えめ）
      const starMul = titleBg ? 0.55 : 1;
      stars.forEach(s => {
        const a = starMul * (0.15 + 0.55 * ((Math.sin(frame * s.tw + s.ph) + 1) / 2));
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,215,255,${a})`;
        ctx.fill();
      });

      // 流れ星（背景写真時は控えめ）
      if (frame % 95 === 0 && Math.random() < (titleBg ? 0.22 : 0.65)) {
        meteors.push({ x:Math.random()*W*0.8, y:Math.random()*H*0.35, vx:4+Math.random()*3, vy:2+Math.random(), life:35, max:35 });
      }
      for (let i = meteors.length-1; i >= 0; i--) {
        const m = meteors[i], a2 = m.life/m.max;
        const gm = ctx.createLinearGradient(m.x, m.y, m.x-m.vx*7, m.y-m.vy*7);
        gm.addColorStop(0, `rgba(255,240,160,${a2})`);
        gm.addColorStop(1, 'rgba(255,240,160,0)');
        ctx.beginPath(); ctx.moveTo(m.x,m.y); ctx.lineTo(m.x-m.vx*7, m.y-m.vy*7);
        ctx.strokeStyle = gm; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.beginPath(); ctx.arc(m.x, m.y, 1.5, 0, Math.PI*2);
        ctx.fillStyle = `rgba(255,240,160,${a2})`; ctx.fill();
        m.x += m.vx; m.y += m.vy; m.life--;
        if (m.life <= 0) meteors.splice(i, 1);
      }

      // 雲スクロール（背景写真時は薄く）
      clouds.forEach((c) => {
        const prev = c.a;
        if (titleBg) c.a = Math.min(0.055, prev * 0.55);
        drawCloud(c);
        c.a = prev;
        c.x -= c.spd;
        if (c.x + c.w < 0) { c.x = W + c.w; c.y = H * (0.07 + Math.random() * 0.28); }
      });

      if (titleFg) {
        const maxH = H * 0.42;
        const scale = Math.min(W / titleFg.width, maxH / titleFg.height);
        const fw = titleFg.width * scale;
        const fh = titleFg.height * scale;
        const ox = (W - fw) / 2;
        const oy = H - fh;
        ctx.globalAlpha = 1;
        ctx.drawImage(titleFg, ox, oy, fw, fh);
      } else {
        drawSilhouette();
      }

      // 竜（一定周期で横切る）
      dragonPhase++;
      if (dragonPhase % 380 < 190) {
        dragonX += 1.3;
        if (dragonX > W + 100) dragonX = -120;
        const dy = H * 0.21 + 11 * Math.sin(dragonPhase * 0.038);
        ctx.save();
        ctx.globalAlpha = titleBg ? 0.35 : 0.75;
        drawDragon(dragonX, dy, dragonPhase);
        ctx.restore();
      }

      // 金キラキラ（控えめ）
      if (!titleBg && frame % 42 === 0) {
        const sx = Math.random() * W * 0.9;
        const sy = Math.random() * H * 0.6;
        ctx.save();
        ctx.translate(sx, sy);
        for (let k = 0; k < 4; k++) {
          ctx.rotate(Math.PI / 4);
          ctx.beginPath();
          ctx.moveTo(0, -5);
          ctx.lineTo(0, 5);
          ctx.strokeStyle = "rgba(255,215,0,0.22)";
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
        ctx.restore();
      }

      const titleIcon = RUNTIME_ASSETS.get("titleIcon");
      if (titleIcon) {
        ctx.globalAlpha = (titleBg ? 0.38 : 0.72) + 0.22 * Math.sin(frame * 0.08);
        ctx.drawImage(titleIcon, W - 40, 8, 28, 28);
        ctx.globalAlpha = 1;
      }
      animRef.current = requestAnimationFrame(loop);
    }
    loop();
    return () => cancelAnimationFrame(animRef.current);
  }, [titleBg, titleFg]);

  // ── フェーズタイムライン ──
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 200);   // 白フラッシュ
    const t2 = setTimeout(() => setPhase(2), 650);   // 文字逐次表示開始
    const t3 = setTimeout(() => { setPhase(3); setSwept(true); }, 2100); // ライトスイープ
    const t4 = setTimeout(() => setPhase(4), 3000);  // メニュー登場
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  // ── 文字を1つずつ表示（音付き） ──
  const playTick = useCallback(() => {
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const o = ac.createOscillator(), g = ac.createGain();
      o.connect(g); g.connect(ac.destination);
      o.type = 'square';
      o.frequency.setValueAtTime(780 + Math.random()*180, ac.currentTime);
      g.gain.setValueAtTime(0.025, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.055);
      o.start(ac.currentTime); o.stop(ac.currentTime + 0.055);
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (phase < 2 || revealChar >= ALL.length) return;
    const t = setTimeout(() => { setRevealChar(n => n + 1); playTick(); }, 110);
    return () => clearTimeout(t);
  }, [phase, revealChar, ALL.length, playTick]);

  // ── ブリンク ──
  useEffect(() => {
    const t = setInterval(() => setBlink(b => !b), 550);
    return () => clearInterval(t);
  }, []);

  // ── ファンファーレ ──
  const playFanfare = useCallback(() => {
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const chord = (freqs, t, dur, vol=0.06) => {
        freqs.forEach(f => {
          const o = ac.createOscillator(), g = ac.createGain();
          o.connect(g); g.connect(ac.destination);
          o.type = 'sine';
          o.frequency.setValueAtTime(f, t);
          g.gain.setValueAtTime(0, t);
          g.gain.linearRampToValueAtTime(vol, t+0.04);
          g.gain.exponentialRampToValueAtTime(0.001, t+dur);
          o.start(t); o.stop(t+dur);
        });
      };
      const now = ac.currentTime;
      chord([261.63,329.63,392.00], now,       0.7);
      chord([293.66,369.99,440.00], now+0.35,  0.6);
      chord([392.00,493.88,587.33], now+0.7,   1.4, 0.08);
    } catch (_) {}
  }, []);

  const handleStart    = useCallback(() => { playFanfare(); onStart(); },    [playFanfare, onStart]);
  const handleContinue = useCallback(() => { playFanfare(); onContinue(); }, [playFanfare, onContinue]);

  const DOT = "'DotGothic16','Courier New',monospace";

  return (
    <div className="relative flex flex-col items-center justify-center h-full overflow-hidden"
         style={{ background: '#000008' }}>

      {/* Canvas（星・雲・シルエット・竜） */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* 暗転→短いフラッシュ（眩しさ低減） */}
      <div className="absolute inset-0 pointer-events-none" style={{
        zIndex: 8,
        background: "white",
        opacity: phase === 1 ? 0.22 : 0,
        transition: phase === 1 ? "opacity 0.1s ease" : "opacity 0.45s ease",
      }} />

      {/* 中央の色味（控えめ） */}
      <div className="absolute inset-0 pointer-events-none" style={{
        zIndex: 2,
        background: "radial-gradient(ellipse 70% 44% at 50% 40%, rgba(55,30,95,0.09) 0%, transparent 72%)",
      }} />

      {/* コンテンツ */}
      <div className="relative flex flex-col items-center justify-center h-full gap-3 px-4 w-full"
           style={{ zIndex: 10 }}>

        {/* サブタイトル */}
        <p style={{
          fontFamily: DOT, fontSize: 10, letterSpacing: "0.4em",
          color: "#b8922e",
          textShadow: "0 1px 2px rgba(0,0,0,0.75), 0 0 10px rgba(201,162,39,0.35)",
          opacity: phase >= 2 ? 1 : 0,
          transition: "opacity 0.8s ease",
        }}>～ FANTASY RPG ～</p>

        {/* メインタイトル：images にロゴがあれば画像、なければテキスト（発光弱め） */}
        <div style={{ position: "relative", textAlign: "center", overflow: "hidden" }}>
          {titleLogo ? (
            <div style={{ minHeight: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img
                src={titleLogo.src}
                alt=""
                style={{
                  maxWidth: "min(340px, 92vw)",
                  maxHeight: "clamp(76px, 22vh, 168px)",
                  width: "auto",
                  height: "auto",
                  objectFit: "contain",
                  opacity: phase >= 2 ? 1 : 0,
                  transition: "opacity 0.5s ease",
                  filter: "drop-shadow(0 4px 14px rgba(0,0,0,0.85))",
                }}
              />
            </div>
          ) : (
            <h1 style={{
              fontFamily: DOT, fontSize: 38, fontWeight: 700,
              lineHeight: 1.35, letterSpacing: "0.08em",
              color: "#f5f5f0",
              textShadow: "0 2px 4px rgba(0,0,0,0.82), 0 0 12px rgba(201,162,39,0.22)",
              WebkitTextStroke: "0.35px rgba(60,45,20,0.35)",
            }}>
              <div>{LINE1.map((ch, i) => (
                <span key={i} style={{ opacity: revealChar > i ? 1 : 0, transition: "opacity 0.07s ease", display: "inline" }}>{ch}</span>
              ))}</div>
              <div>{LINE2.map((ch, i) => (
                <span key={i + 4} style={{ opacity: revealChar > i + 4 ? 1 : 0, transition: "opacity 0.07s ease", display: "inline" }}>{ch}</span>
              ))}</div>
            </h1>
          )}
          {/* ライトスイープ（弱め・ロゴ時はさらに弱い） */}
          {swept && !titleLogo && (
            <div style={{
              position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
              pointerEvents: "none", overflow: "hidden",
            }}>
              <div style={{
                position: "absolute", top: 0, width: "50%", height: "100%",
                background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent)",
                animation: "title-sweep 0.65s ease forwards",
              }} />
            </div>
          )}
        </div>

        {/* 装飾ライン */}
        <div style={{
          opacity: phase >= 3 ? 1 : 0, transition: 'opacity 0.8s ease',
          display:'flex', alignItems:'center', gap:8, width:'76%',
        }}>
          <div style={{ flex:1, height:1, background:'linear-gradient(90deg,transparent,#c9a227)' }} />
          <span style={{ fontSize: 16, color: "#9a7b2a", textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}>|</span>
          <div style={{ flex:1, height:1, background:'linear-gradient(90deg,#c9a227,transparent)' }} />
        </div>

        <p style={{
          fontFamily: DOT, fontSize: 10, letterSpacing: '0.28em',
          color: 'rgba(155,135,95,0.65)',
          opacity: phase >= 3 ? 1 : 0, transition: 'opacity 0.8s ease',
        }}>MANABI NO TABI</p>

        {/* ボタン群 */}
        <div style={{
          opacity: phase >= 4 ? 1 : 0,
          transform: phase >= 4 ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 0.6s ease, transform 0.6s ease',
          display:'flex', flexDirection:'column', gap:10,
          width:'100%', padding:'0 28px', marginTop:6,
        }}>
          {hasSave && (
            <button onClick={handleContinue} style={{
              fontFamily: DOT, fontSize:12, letterSpacing:'0.2em',
              padding:'13px 0', width:'100%', cursor:'pointer',
              background:'linear-gradient(135deg,rgba(201,162,39,0.17),rgba(201,162,39,0.05))',
              border:'2px solid #c9a227', color:'#f0d060',
              boxShadow: "0 2px 10px rgba(0,0,0,0.45)",
            }}>▶ つづきから</button>
          )}
          <button onClick={handleStart} style={{
            fontFamily: DOT, fontSize:12, letterSpacing:'0.2em',
            padding:'13px 0', width:'100%', cursor:'pointer',
            background: blink
              ? 'linear-gradient(135deg,rgba(255,255,255,0.1),rgba(255,255,255,0.02))'
              : 'rgba(0,0,0,0.01)',
            border: `2px solid ${blink ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.2)'}`,
            color: blink ? '#f0f0f0' : 'rgba(255,255,255,0.32)',
            boxShadow: blink ? '0 2px 12px rgba(0,0,0,0.35)' : 'none',
            transition: 'all 0.3s ease',
          }}>▶ はじめる</button>
        </div>

        <p style={{
          fontFamily: DOT, fontSize:9, color:'rgba(75,75,95,0.6)',
          opacity: phase >= 4 ? 1 : 0, transition: 'opacity 1s ease 0.5s',
        }}>© 2026 Titan Games · For tired adventurers</p>

      </div>

      <style>{`
        @keyframes title-sweep {
          from { left: -60%; }
          to   { left: 160%; }
        }
      `}</style>
    </div>
  );
}

function NameInput({ onConfirm }) {
  const [name, setName] = useState("");
  return (
    <div className="flex flex-col items-center justify-center h-full bg-black text-white gap-6 px-6">
      <div className="border-2 border-white w-full p-6 text-center">
        <p className="text-sm mb-4" style={{ fontFamily:"'Courier New',monospace" }}>あなたの　なまえを　おしえてください。</p>
        <input className="bg-black border-b-2 border-yellow-400 text-white text-center text-lg outline-none w-48 pb-1"
          style={{ fontFamily:"'Courier New',monospace" }} maxLength={8} value={name}
          onChange={e => setName(e.target.value)} placeholder="なまえ" autoFocus />
      </div>
      <button className="border-2 border-white px-8 py-3 text-sm disabled:opacity-30"
        style={{ fontFamily:"'Courier New',monospace" }}
        disabled={!name.trim()} onClick={() => onConfirm(name.trim())}>けってい</button>
    </div>
  );
}

// ─── 性別選択画面 (NEW) ───────────────────────────────────────────────────────
function GenderScreen({ playerName, onConfirm }) {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-black text-white gap-8 px-6">
      <div className="border-2 border-white w-full p-6 text-center">
        <p className="text-sm mb-2 text-yellow-300" style={{ fontFamily:"'Courier New',monospace" }}>
          {playerName}
        </p>
        <p className="text-sm mb-8" style={{ fontFamily:"'Courier New',monospace" }}>
          あなたは　男の子？　女の子？
        </p>
        <div className="flex justify-center gap-6">
          <button
            className="border-2 border-blue-400 text-blue-300 px-8 py-5 text-base active:opacity-60 flex flex-col items-center gap-2"
            style={{ fontFamily:"'Courier New',monospace" }}
            onClick={() => onConfirm("male")}>
            <span className="text-3xl">♂</span>
            <span>男の子</span>
          </button>
          <button
            className="border-2 border-pink-400 text-pink-300 px-8 py-5 text-base active:opacity-60 flex flex-col items-center gap-2"
            style={{ fontFamily:"'Courier New',monospace" }}
            onClick={() => onConfirm("female")}>
            <span className="text-3xl">♀</span>
            <span>女の子</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function PrologueScreen({ playerName, onDone }) {
  const canvasRef = useRef(null);
  const lines = [
    `${playerName}は　目を　さました。`,
    "……ここは　どこだ？",
    "見覚えのない　広い草原。",
    "空の色が　少し　おかしい。",
    "雲が　黒ずんでいる。遠くに　暗い山が　見える。",
    "そのとき　声が　聞こえた。",
    "「……勇者よ。よく　来た。」",
    "「この世界は　今　ドランゴという　闇の竜に　支配されている。」",
    "「人々の　笑顔が　消えた。光が　消えた。」",
    "「どうか……この世界を　救ってほしい。」",
    "声は　消えた。",
    `${playerName}は　ゆっくり　立ち上がった。`,
    "まずは　誰かに　話を　聞いてみよう。",
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    const DPR = Math.max(1, window.devicePixelRatio || 1);
    let rafId = null;
    let t = 0;
    const stars = Array.from({ length: 48 }, () => ({
      x: Math.random(),
      y: Math.random() * 0.55,
      r: Math.random() * 1.4 + 0.4,
      tw: Math.random() * 0.03 + 0.01,
      ph: Math.random() * Math.PI * 2,
    }));

    const resize = () => {
      const w = canvas.clientWidth || 320;
      const h = canvas.clientHeight || 210;
      canvas.width = Math.floor(w * DPR);
      canvas.height = Math.floor(h * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const W = canvas.width / DPR;
      const H = canvas.height / DPR;
      t += 1;

      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#040918");
      sky.addColorStop(0.6, "#111328");
      sky.addColorStop(1, "#24170f");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      stars.forEach((s) => {
        const a = 0.2 + 0.8 * ((Math.sin(t * s.tw + s.ph) + 1) * 0.5);
        ctx.fillStyle = `rgba(225,232,255,${a})`;
        ctx.beginPath();
        ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Distant moonlight haze
      const haze = ctx.createRadialGradient(W * 0.73, H * 0.2, 6, W * 0.73, H * 0.2, W * 0.35);
      haze.addColorStop(0, "rgba(173,196,255,0.22)");
      haze.addColorStop(1, "rgba(173,196,255,0)");
      ctx.fillStyle = haze;
      ctx.fillRect(0, 0, W, H);

      const baseY = H * 0.72;
      ctx.fillStyle = "rgba(18,10,25,0.97)";
      ctx.beginPath();
      ctx.moveTo(0, baseY);
      ctx.lineTo(W * 0.08, baseY - H * 0.12);
      ctx.lineTo(W * 0.22, baseY - H * 0.05);
      ctx.lineTo(W * 0.33, baseY - H * 0.2);
      ctx.lineTo(W * 0.48, baseY - H * 0.08);
      ctx.lineTo(W * 0.58, baseY - H * 0.18);
      ctx.lineTo(W * 0.73, baseY - H * 0.06);
      ctx.lineTo(W * 0.86, baseY - H * 0.14);
      ctx.lineTo(W, baseY - H * 0.08);
      ctx.lineTo(W, H);
      ctx.lineTo(0, H);
      ctx.closePath();
      ctx.fill();

      // Ground silhouette
      ctx.fillStyle = "#08060f";
      ctx.fillRect(0, H * 0.75, W, H * 0.25);

      // Hero silhouette
      const hx = W * 0.5;
      const bounce = Math.sin(t * 0.06) * 1.5;
      ctx.fillStyle = "rgba(8,8,10,0.98)";
      ctx.fillRect(hx - 6, H * 0.74 + bounce, 12, 22);
      ctx.beginPath();
      ctx.arc(hx, H * 0.71 + bounce, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(hx - 12, H * 0.77 + bounce, 5, 15);
      ctx.fillRect(hx + 7, H * 0.77 + bounce, 5, 15);

      // Slow drifting cloud
      const cx = ((t * 0.45) % (W + 120)) - 70;
      ctx.fillStyle = "rgba(165,176,205,0.18)";
      ctx.beginPath();
      ctx.ellipse(cx, H * 0.28, 42, 16, 0, 0, Math.PI * 2);
      ctx.ellipse(cx - 20, H * 0.29, 26, 12, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 22, H * 0.29, 30, 13, 0, 0, Math.PI * 2);
      ctx.fill();

      // Subtitle badge
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(W * 0.32, H * 0.04, W * 0.36, 24);
      ctx.strokeStyle = "rgba(235,198,87,0.55)";
      ctx.strokeRect(W * 0.32, H * 0.04, W * 0.36, 24);
      ctx.fillStyle = "#f5d879";
      ctx.font = "bold 12px 'DotGothic16','Courier New',monospace";
      ctx.textAlign = "center";
      ctx.fillText("PROLOGUE", W * 0.5, H * 0.04 + 16);

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className="flex flex-col justify-end h-full bg-black p-4 gap-3">
      <div className="flex-1 border border-gray-700 overflow-hidden">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>
      <MessageBox lines={lines} onNext={onDone} />
    </div>
  );
}

// ─── MAP SCREEN (スプライト + キーボード対応) ─────────────────────────────────
function MapScreen({ player, onMove, onInvestigate, onInfo, onQuickSave, isNight = false }) {
  const handleMovePointer = (dx, dy) => (e) => {
    e.preventDefault();
    onMove(dx, dy);
  };
  const { pos } = player;
  const key = `${pos.y},${pos.x}`;
  const event = LOCATION_EVENTS[key];
  const signData = SIGN_MAP[key];
  const canInvestigate = Boolean(event);
  const half   = Math.floor(VIEW_SIZE / 2);
  const viewRows = Array.from({ length: VIEW_SIZE }, (_, vy) =>
    Array.from({ length: VIEW_SIZE }, (_, vx) => {
      const x = wrapCoord(pos.x - half + vx, MAP_SIZE);
      const y = wrapCoord(pos.y - half + vy, MAP_SIZE);
      return { x, y, tile: MAP_GRID[y][x] };
    }),
  );

  // 昼夜サイクル（isNight = リアルタイム3分切り替え）
  const timeLabel = isNight ? "夜" : "昼";
  const nightOverlay = isNight ? "rgba(0,15,70,0.48)" : "rgba(0,0,0,0)";

  const tileName = {
    [TILE.GRASS]:"草原",[TILE.FOREST]:"森",[TILE.WATER]:"川",[TILE.MOUNTAIN]:"山岳",
    [TILE.SEA]:"海",[TILE.LAKE]:"湖",[TILE.BRIDGE]:"橋",[TILE.DESERT]:"砂漠",
    [TILE.TOWN]:"街",[TILE.SCHOOL]:"学校",[TILE.HOME]:"家",[TILE.CAVE]:"洞窟",
    [TILE.SNOW]:"雪原",[TILE.ONSEN]:"温泉",
  };
  const currentTile = MAP_GRID[pos.y][pos.x];
  const progress = getMainProgress(player);
  const objective = getNextObjective(player);
  const hasShip = canUseShip(player);
  const hasAirship = canUseAirship(player);

  // キーボード操作
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "ArrowUp"    || e.key === "w") { e.preventDefault(); onMove(0, -1); }
      else if (e.key === "ArrowDown"  || e.key === "s") { e.preventDefault(); onMove(0,  1); }
      else if (e.key === "ArrowLeft"  || e.key === "a") { e.preventDefault(); onMove(-1, 0); }
      else if (e.key === "ArrowRight" || e.key === "d") { e.preventDefault(); onMove( 1, 0); }
      else if (e.key === "Enter" || e.key === " ")      { e.preventDefault(); onInvestigate(); }  // A = はなす
      else if (e.key === "i" || e.key === "Escape" || e.key === "x") { e.preventDefault(); onInfo(); }  // B = メニュー
      else if (e.key === "q") { e.preventDefault(); onQuickSave && onQuickSave(); } // START = クイックセーブ
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onMove, onInvestigate, onInfo, onQuickSave]);

  useEffect(() => {
    let rafId = null;
    let lock = false;
    const pollGamepad = () => {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      const gp = pads && pads[0];
      if (gp && !lock) {
        const axX = gp.axes?.[0] ?? 0;
        const axY = gp.axes?.[1] ?? 0;
        if (Math.abs(axX) > 0.65 || Math.abs(axY) > 0.65) {
          lock = true;
          if (Math.abs(axX) > Math.abs(axY)) onMove(axX > 0 ? 1 : -1, 0);
          else onMove(0, axY > 0 ? 1 : -1);
          setTimeout(() => { lock = false; }, 110);
        } else if (gp.buttons?.[0]?.pressed) {
          lock = true;
          onInvestigate();
          setTimeout(() => { lock = false; }, 140);
        } else if (gp.buttons?.[1]?.pressed) {
          lock = true;
          onInfo();
          setTimeout(() => { lock = false; }, 140);
        }
      }
      rafId = requestAnimationFrame(pollGamepad);
    };
    rafId = requestAnimationFrame(pollGamepad);
    return () => cancelAnimationFrame(rafId);
  }, [onMove, onInvestigate, onInfo]);

  return (
    <div className="flex flex-col h-full bg-black text-white px-2 py-3 gap-3">
      {/* ステータス */}
      <div className="border border-gray-600 p-2 text-xs grid grid-cols-2 gap-1">
        <span className="text-yellow-300">{player.name}</span>
        <span className="text-right text-gray-400">Lv.{player.level}　<span className="text-blue-300">{timeLabel}</span></span>
        <HPBar label="HP" current={player.hp} max={player.maxHp} />
        <HPBar label="MP" current={player.mp} max={player.maxMp} color="blue" />
        <span className="text-[10px] text-cyan-200">称号：{progress.title}</span>
        <span className="text-right text-[10px] text-gray-300">進行率 {progress.percent}%</span>
        <div className="col-span-2 bg-gray-800 border border-gray-700 h-2 rounded overflow-hidden">
          <div className="bg-cyan-500 h-full transition-all duration-500" style={{ width: `${progress.percent}%` }} />
        </div>
      </div>

      {/* マップビュー + ミニマップ */}
      <div className="flex justify-center relative">
        <div className="relative">
          <div className="inline-grid gap-0.5" style={{ gridTemplateColumns:`repeat(${VIEW_SIZE},34px)` }}>
            {viewRows.map((row) =>
              row.map(({ x, y, tile }) => {
                const isPlayer = pos.x === x && pos.y === y;
                const isSign   = Boolean(SIGN_MAP[`${y},${x}`]);
                const landmarkType = getWorldLandmarkType(tile, x, y);
                return (
                  <div key={`${y}-${x}`}
                    className={`relative w-[34px] h-[34px] flex items-center justify-center text-base border transition-all duration-150 ${isPlayer ? "border-yellow-400 scale-110" : "border-gray-700/40"}`}>
                    <TileCanvas tile={tile} size={34} />
                    <span style={{ position:"relative", zIndex:1, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      {isPlayer
                        ? <HeroSprite gender={player.gender} direction={player.direction} animStep={player.animStep} size={30} />
                        : isSign ? <SignPostIcon size={22} />
                        : landmarkType ? <WorldLandmarkIcon kind={landmarkType} size={24} /> : null}
                    </span>
                  </div>
                );
              })
            )}
          </div>
          {/* 昼夜オーバーレイ */}
          {nightOverlay !== "rgba(0,0,0,0)" && (
            <div className="absolute inset-0 pointer-events-none" style={{ background: nightOverlay }} />
          )}
        </div>
        <MiniMap player={player} />
      </div>

      {/* 現在地 */}
      <div className={`border p-2 text-xs text-center ${canInvestigate ? "border-yellow-500 text-yellow-200" : "border-gray-700 text-gray-300"}`}>
        {signData
          ? `道しるべ ${signData.arrow} ${signData.name}`
          : event ? `現在地 ${event.name}`
          : `現在地 ${tileName[currentTile]} (${pos.x},${pos.y})`}
        <div className="mt-1 text-[10px] text-gray-400">
          {canInvestigate ? "A/Enterで　はいる" : "SELECTで　メニュー / Qでクイックセーブ"}
        </div>
        <div className="mt-1 text-[10px] text-cyan-300">次の目的：{objective}</div>
        <div className="mt-1 text-[10px] text-sky-200">
          移動手段：{hasAirship ? "飛行船（山脈・海・川を越えられる）" : hasShip ? "船（海・川を渡れる）" : "徒歩（陸地のみ）"}
        </div>
        {(player.bag || []).some(i => i.id === "dragon_scale" && i.count > 0) && (
          <div className="mt-1 text-[10px] text-yellow-300">🐱 猫のともだちが　ついてきている　にゃ</div>
        )}
      </div>

      {/* コントロール */}
      <div className="mt-auto border-2 border-zinc-500 bg-zinc-800 rounded-md p-3 shadow-[inset_0_2px_0_rgba(255,255,255,0.25)]">
        <div className="flex justify-between items-end gap-2">
          {/* 十字キー */}
          <div className="grid grid-cols-3 gap-1 w-[126px]">
            <div />
            <button className="w-10 h-10 bg-zinc-700 border border-zinc-400 text-white active:scale-95" onPointerDown={handleMovePointer(0,-1)}>▲</button>
            <div />
            <button className="w-10 h-10 bg-zinc-700 border border-zinc-400 text-white active:scale-95" onPointerDown={handleMovePointer(-1,0)}>◀</button>
            <div className="w-10 h-10 bg-zinc-900 border border-zinc-700 rounded-sm" />
            <button className="w-10 h-10 bg-zinc-700 border border-zinc-400 text-white active:scale-95" onPointerDown={handleMovePointer(1,0)}>▶</button>
            <div />
            <button className="w-10 h-10 bg-zinc-700 border border-zinc-400 text-white active:scale-95" onPointerDown={handleMovePointer(0,1)}>▼</button>
            <div />
          </div>
          {/* SELECT / START */}
          <div className="flex flex-col justify-end items-center gap-2 pb-1">
            <button className="px-3 py-1 bg-zinc-700 border border-zinc-400 text-[9px] rounded-full active:scale-95 leading-tight text-center" onClick={onInfo}>SELECT</button>
            <button className="px-3 py-1 bg-zinc-700 border border-zinc-400 text-[9px] rounded-full active:scale-95 leading-tight text-center" onClick={() => onQuickSave && onQuickSave()}>START</button>
          </div>
          {/* B / A ボタン */}
          <div className="flex gap-2 pb-1 items-end">
            <button className="w-12 h-12 rounded-full bg-red-700 border-2 border-red-400 text-white text-sm active:scale-95" onClick={onInfo}>B</button>
            <button
              className={`w-12 h-12 rounded-full border-2 text-sm active:scale-95 ${canInvestigate ? "bg-red-700 border-red-400 text-white animate-pulse" : "bg-zinc-900 border-zinc-700 text-zinc-500"} ${canInvestigate ? "" : "cursor-not-allowed"}`}
              disabled={!canInvestigate}
              onClick={canInvestigate ? onInvestigate : undefined}
            >
              A
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── INTERIOR MAP SCREEN (NEW) ────────────────────────────────────────────────
function InteriorMapScreen({ interiorType, player, onHeal, onBuff, onExit, onInfo, onBoss, onEnemyBattle, onBuy, onFlag, onLearnSpell, onOpenTreasure, onGiveItem }) {
  const isCave = interiorType === "cave";
  const isCatCave = interiorType === "catCave";
  const isDungeon = isCave || isCatCave;
  const dungeonFloors = isCave ? CAVE_FLOORS : isCatCave ? CAT_CAVE_FLOORS : null;
  const maxDungeonFloor = dungeonFloors ? Math.max(...Object.keys(dungeonFloors).map(Number)) : 1;
  const [currentFloor, setCurrentFloor] = useState(1);
  const map = isDungeon
    ? ((dungeonFloors && dungeonFloors[currentFloor]) || (dungeonFloors && dungeonFloors[1]) || CAVE_FLOORS[1])
    : (INTERIOR_MAPS[interiorType] ?? TOWN_IMAP);
  const events = isCave
    ? (CAVE_EVENTS_BY_FLOOR[currentFloor] ?? {})
    : isCatCave
      ? (CAT_CAVE_EVENTS_BY_FLOOR[currentFloor] ?? {})
      : (INTERIOR_EVENTS[interiorType] ?? {});
  const treasures = isCave
    ? (CAVE_TREASURES_BY_FLOOR[currentFloor] ?? {})
    : isCatCave
      ? (CAT_CAVE_TREASURES_BY_FLOOR[currentFloor] ?? {})
      : (INTERIOR_TREASURES[interiorType] ?? {});
  const exitPos = findExitPos(map);
  const rows = map.length;
  const cols = map[0]?.length ?? 12;
  const isUnderground = interiorType === "underground";
  const isCastle = interiorType === "castle";
  const isVillage = interiorType === "village";
  const isTown = interiorType === "town";
  const tileStyle = isDungeon
    ? CAVE_INT_STYLE
    : isUnderground
      ? UNDERGROUND_INT_STYLE
      : isCastle
        ? CASTLE_INT_STYLE
        : isVillage
          ? VILLAGE_INT_STYLE
          : isTown
            ? TOWN_INT_STYLE
            : INT_STYLE;
  const title = isCave ? `くらやみの洞窟 B${currentFloor}`
    : isCatCave ? `猫影の洞窟 B${currentFloor}`
    : isUnderground ? "地下フィールド ─ ガイア団基地"
    : interiorType === "village" ? "はじまりの村 (内部)"
    : interiorType === "town" ? "いずみの街 (内部)"
    : interiorType === "artisanVillage" ? "職人の村 (工房街)"
    : interiorType === "catCave" ? "猫影の洞窟"
    : interiorType === "castle" ? "王城アストリア (城門〜玉座の間)"
    : interiorType === "manabiVillage" ? "まなびの村 (内部)"
    : interiorType === "nazoVillage" ? "謎の村 (内部)"
    : interiorType === "catVillage" ? "猫の村 (内部)"
    : interiorType === "southShrine" ? "南の祠"
    : "まなびの学校 (内部)";

  const [intPos, setIntPos] = useState({ x: exitPos.x, y: Math.max(0, exitPos.y - 1) });
  const [intDir, setIntDir] = useState("up");
  const [animStep, setAnimStep] = useState(0);
  const [intEvent, setIntEvent] = useState(null);
  const [showShop, setShowShop] = useState(false);
  const [currentShopItems, setCurrentShopItems] = useState(SHOP_ITEMS_T1);
  const [usedBuffKeys, setUsedBuffKeys] = useState(new Set());
  const openedChestSet = useMemo(() => new Set(player.openedChests || []), [player.openedChests]);
  const interactKeys = useMemo(() => {
    const keys = new Set();
    const add = (x, y) => { if (Number.isFinite(x) && Number.isFinite(y)) keys.add(`${y},${x}`); };
    add(intPos.x, intPos.y);
    const dirDelta = intDir === "up"
      ? { dx: 0, dy: -1 }
      : intDir === "down"
        ? { dx: 0, dy: 1 }
        : intDir === "left"
          ? { dx: -1, dy: 0 }
          : { dx: 1, dy: 0 };
    const fx = intPos.x + dirDelta.dx;
    const fy = intPos.y + dirDelta.dy;
    add(fx, fy);
    const forwardTile = map[fy]?.[fx];
    const passTalkTiles = new Set([INT.DESK, INT.COUNTER, INT.SHELF, INT.BOARD]);
    if (passTalkTiles.has(forwardTile)) add(fx + dirDelta.dx, fy + dirDelta.dy);
    [[-1,0],[1,0],[0,-1],[0,1]].forEach(([dy, dx]) => add(intPos.x + dx, intPos.y + dy));
    return keys;
  }, [intPos.x, intPos.y, intDir, map]);

  useEffect(() => {
    if (isDungeon) setCurrentFloor(1);
  }, [interiorType, isDungeon]);

  const npcAnchors = useMemo(() => {
    return Object.keys(events).map((key) => {
      const [y, x] = key.split(",").map(Number);
      if (map[y]?.[x] !== INT.NPC) return null;
      const ev = events[key];
      if (ev?.guard && typeof ev.passCondition === "function" && ev.passCondition(player)) return null;
      return { eventKey: key, anchorX: x, anchorY: y, x, y, fixed: !!events[key].fixedNpc };
    }).filter(Boolean);
  }, [events, map, player]);
  const [npcStates, setNpcStates] = useState([]);
  const prevInteriorTypeRef = useRef(null);
  useEffect(() => {
    setNpcStates(npcAnchors.map((n) => ({ ...n })));
  }, [npcAnchors]);
  useEffect(() => {
    const switchedInterior = prevInteriorTypeRef.current !== interiorType;
    prevInteriorTypeRef.current = interiorType;
    if (isDungeon && !switchedInterior) return;
    setIntPos({ x: exitPos.x, y: Math.max(0, exitPos.y - 1) });
  }, [exitPos.x, exitPos.y, interiorType, isDungeon]);

  const npcByPos = useMemo(() => {
    const byPos = {};
    npcStates.forEach((n) => { byPos[`${n.y},${n.x}`] = n; });
    return byPos;
  }, [npcStates]);

  const canInvestigateNow = useMemo(() => {
    for (const k of interactKeys) {
      if (npcByPos[k]) return true;
      if (treasures[k]) return true;
      const [sy, sx] = k.split(",").map(Number);
      if (events[k] && map[sy]?.[sx] !== INT.NPC) return true;
    }
    return false;
  }, [interactKeys, npcByPos, treasures, events, map]);

  const resolveEventForNpc = useCallback((eventKey) => {
    let ev = events[eventKey];
    if (!ev) return null;
    if (ev.guard) {
      const canPass = typeof ev.passCondition === "function" ? ev.passCondition(player) : false;
      return {
        ...ev,
        messages: canPass ? (ev.passMessages || ev.messages || []) : (ev.blockMessages || ev.messages || []),
      };
    }
    if (interiorType === "nazoVillage" && eventKey === "2,3") {
      const ALL_FLAGS = ["hana", "neko", "kumo", "ninja"];
      const flags = player.nazoFlags ?? [];
      const hasAll = ALL_FLAGS.every((f) => flags.includes(f));
      const hasAncientKey = (player.bag || []).some((i) => i.id === "ancient_key" && i.count > 0);
      if (hasAll && !player.nazoSpellLearned) {
        ev = { messages: [
          "仙人マン：「……ほほう！",
          "全ての　謎を　解いたか！　見事じゃ！",
          "では　授けよう——　せんにんのかぜ！",
          "この風は　あらゆる　敵を　薙ぎ払う。",
          "MP6が　必要じゃが……それだけの　価値はある。",
          "そして……この　「ふるびたかぎ」も　持っていくがよい。",
          "ドランゴの　すみかへの　扉を　開ける　鍵じゃ。",
        ], learnSpell: true, giveItem: "ancient_key" };
      } else if (player.nazoSpellLearned) {
        ev = { messages: hasAncientKey ? [
          "仙人マン：「……すでに　魔法は　授けた。",
          "せんにんのかぜは　使いこなせておるか？",
          "強い風は　使い所が　肝心じゃ。",
        ] : [
          "仙人マン：「……ふるびたかぎを　まだ　持っていないのか。",
          "ほれ、持っていきなさい。",
        ], giveItem: hasAncientKey ? null : "ancient_key" };
      } else {
        const remaining = ALL_FLAGS.filter((f) => !flags.includes(f));
        const nameMap = { hana: "はなくん", neko: "猫くん", kumo: "雲まん", ninja: "忍者" };
        ev = { messages: [
          "仙人マン：「……まだじゃ。",
          `残りの謎解き：${remaining.map((f) => nameMap[f]).join("・")}`,
          "4人　全員の　謎を　聞いてからこい。",
        ]};
      }
    }
    if (interiorType === "village" && eventKey === "1,11") {
      const hasAllKeys = hasBagItem(player, "manabi_proof") && hasBagItem(player, "ancient_key") && hasBagItem(player, "dragon_scale");
      const earned = (player.storyFlags || []).includes("story:titleStarlight");
      if (hasAllKeys && player.level >= 8 && !earned) {
        ev = { messages: [
          "語り部：「……おまえは　もう　恐れだけで　歩いていない。」",
          "「学び」「謎」「猫の絆」を　抱え、なお進んだ。",
          "いまより　おまえを『星あかりの冒険者』と呼ぼう。",
          "称号を　授かった！",
        ], flag: "story:titleStarlight", mood: "hope" };
      } else if (earned) {
        ev = { messages: [
          "語り部：「星あかりの冒険者よ。",
          "短い旅でも　人の心を　照らすことはできる。」",
        ], mood: "hope" };
      } else {
        ev = { messages: [
          "語り部：「称号は　力ではなく　歩みの証。",
          "3つのしるしを　抱え、さらに己を鍛えて　戻ってこい。」",
        ]};
      }
    }
    if (interiorType === "catCave" && eventKey === "3,7") {
      const hasKonnyaku = (player.bag || []).some((i) => i.id === "neko_konnyaku" && i.count > 0);
      if (hasKonnyaku) {
        ev = { messages: [
          "猫又：「にゃ。」",
          "猫又は　満足そうに　しっぽを振っている。",
        ]};
      }
    }
    if (interiorType === "catVillage" && ev.catTalk) {
      const hasKonnyaku = (player.bag || []).some((i) => i.id === "neko_konnyaku" && i.count > 0);
      const hasDragonScale = (player.bag || []).some((i) => i.id === "dragon_scale" && i.count > 0);
      if (eventKey === "2,2" && hasKonnyaku && !hasDragonScale) {
        ev = { messages: [
          ...ev.unlockedMessages,
          "ネコ長：「そうじゃ……お礼に　これを。",
          "ドランゴの　うろこじゃ。　あやつを　倒した者が　落としていった。",
          "「ドラゴンのウロコ」を　てにいれた！",
        ], giveItem: "dragon_scale" };
      } else if (eventKey === "2,2" && hasDragonScale) {
        ev = { messages: [
          "ネコ長：「ウロコは　もう　渡したにゃ。",
          "ドランゴを　たのんだにゃ……！",
        ]};
      } else {
        ev = { messages: hasKonnyaku ? ev.unlockedMessages : ev.lockedMessages };
      }
    }
    if (interiorType === "school" && eventKey === "8,8") {
      const hasQuest  = (player.storyFlags || []).includes("story:royalQuest");
      const hasJoined = (player.storyFlags || []).includes("story:kousuke_join");
      if (hasQuest && !hasJoined) {
        ev = { messages: [
          "コウスケ（がり勉）：「……王様の使命を　受けたんだろ。",
          "……弱点は、おそれのない心、らしい。",
          "俺は　行けないけど……",
          "俺の分まで　頑張ってくれ。",
          "洞窟でピンチになったら　俺のことを思い出してくれ。",
          "コウスケが　こころで　ともに　戦う！",
        ], flag: "story:kousuke_join", shop: true, shopItems: "T2" };
      }
    }
    if (interiorType === "southShrine" && eventKey === "5,5") {
      const hasRecorder = (player.bag || []).some(i => i.id === "recorder" && i.count > 0);
      if (!hasRecorder) {
        ev = { messages: [
          "占い婆さん：「……来たか。予言しておったぞ。",
          "旅人よ、この道聞きリコーダーを持っていきなさい。",
          "ふけば……まだ手に入れていないものの方角が、",
          "かすかに　聞こえてくるはずじゃ。",
          "「道聞きリコーダー」を　てにいれた！",
        ], giveItem: "recorder" };
      } else {
        ev = { messages: [
          "占い婆さん：「リコーダーは　もう　持っておるじゃろう。",
          "ふけば……まだ集めていないものの方角が　分かるはずじゃ。",
          "じょうほう画面を開いて　使ってみるがよい。",
        ]};
      }
    }
    return ev;
  }, [events, interiorType, player]);

  const triggerEvent = useCallback((eventKey) => {
    const ev = resolveEventForNpc(eventKey);
    if (!ev) return false;
    if (ev.heal) onHeal({ amount: ev.heal, fullRecovery: !!ev.inn || ev.heal >= 999 });
    if (ev.buff && onBuff && !usedBuffKeys.has(eventKey)) {
      onBuff(ev.buff);
      setUsedBuffKeys((s) => new Set([...s, eventKey]));
    }
    if (ev.flag && onFlag) onFlag(ev.flag);
    if (ev.learnSpell && onLearnSpell) onLearnSpell();
    if (ev.giveItem && onGiveItem) onGiveItem(ev.giveItem);
    setIntEvent(ev);
    return true;
  }, [resolveEventForNpc, onHeal, onBuff, usedBuffKeys, onFlag, onLearnSpell]);

  useEffect(() => {
    const movableInteriors = ["village", "town", "artisanVillage", "manabiVillage", "nazoVillage", "catVillage", "underground", "southShrine"];
    if (!movableInteriors.includes(interiorType)) return undefined;
    if (intEvent || showShop) return undefined;
    const timer = setInterval(() => {
      setNpcStates((prev) => {
        const taken = new Set(prev.map((n) => `${n.y},${n.x}`));
        return prev.map((npc) => {
          if (npc.fixed || Math.random() < 0.45) return npc;
          const candidates = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]];
          for (let i = candidates.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
          }
          for (const [dx, dy] of candidates) {
            const nx = npc.x + dx;
            const ny = npc.y + dy;
            if (nx < 1 || ny < 1 || nx >= cols - 1 || ny >= rows - 1) continue;
            const tile = map[ny][nx];
            if ([INT.WALL, INT.SHELF, INT.DESK, INT.BOARD, INT.COUNTER, INT.CHEST, INT.EXIT].includes(tile)) continue;
            if (`${ny},${nx}` === `${intPos.y},${intPos.x}`) continue;
            if (`${ny},${nx}` !== `${npc.y},${npc.x}` && taken.has(`${ny},${nx}`)) continue;
            taken.delete(`${npc.y},${npc.x}`);
            taken.add(`${ny},${nx}`);
            return { ...npc, x: nx, y: ny };
          }
          return npc;
        });
      });
    }, 820);
    return () => clearInterval(timer);
  }, [interiorType, map, cols, rows, intPos.x, intPos.y, intEvent, showShop]);

  const tryMove = useCallback((dx, dy) => {
    const dir = dx === 1 ? "right" : dx === -1 ? "left" : dy === -1 ? "up" : "down";
    setIntDir(dir);
    const nx = intPos.x + dx;
    const ny = intPos.y + dy;
    if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) return;

    const npc = npcByPos[`${ny},${nx}`];
    if (npc) { triggerEvent(npc.eventKey); return; }

    const tile = map[ny][nx];
    if (tile === INT.EXIT) { onExit(); return; }
    if (tile === INT.STAIRS_DOWN && isDungeon && currentFloor < maxDungeonFloor) {
      const nextFloor = currentFloor + 1;
      const nextMap = dungeonFloors?.[nextFloor];
      if (!nextMap) return;
      let stair = { x: nx, y: ny };
      for (let y = 0; y < nextMap.length; y++) {
        for (let x = 0; x < nextMap[y].length; x++) {
          if (nextMap[y][x] === INT.STAIRS_UP) stair = { x, y };
        }
      }
      const spawn = caveStairLandingPos(nextMap, stair.x, stair.y, true);
      setCurrentFloor(nextFloor);
      setIntPos(spawn);
      return;
    }
    if (tile === INT.STAIRS_UP && isDungeon) {
      if (currentFloor <= 1) { onExit(); return; }
      const prevFloor = currentFloor - 1;
      const prevMap = dungeonFloors?.[prevFloor];
      if (!prevMap) return;
      let stair = { x: nx, y: ny };
      for (let y = 0; y < prevMap.length; y++) {
        for (let x = 0; x < prevMap[y].length; x++) {
          if (prevMap[y][x] === INT.STAIRS_DOWN) stair = { x, y };
        }
      }
      const spawn = caveStairLandingPos(prevMap, stair.x, stair.y, false);
      setCurrentFloor(prevFloor);
      setIntPos(spawn);
      return;
    }
    if ([INT.WALL, INT.SHELF, INT.DESK, INT.BOARD, INT.COUNTER, INT.CHEST].includes(tile)) return;

    setIntPos({ x: nx, y: ny });
    setAnimStep((s) => s + 1);
  }, [intPos, cols, rows, map, npcByPos, triggerEvent, onExit, isDungeon, currentFloor, dungeonFloors, maxDungeonFloor]);

  const investigate = useCallback(() => {
    // ドラクエ的：机/カウンター越しに正面のNPCへ話しかけられるようにする
    const dirDelta = intDir === "up"
      ? { dx: 0, dy: -1 }
      : intDir === "down"
        ? { dx: 0, dy: 1 }
        : intDir === "left"
          ? { dx: -1, dy: 0 }
          : { dx: 1, dy: 0 };
    const fx = intPos.x + dirDelta.dx;
    const fy = intPos.y + dirDelta.dy;
    const forwardKey = `${fy},${fx}`;
    const forwardTile = map[fy]?.[fx];
    const passTalkTiles = new Set([INT.DESK, INT.COUNTER, INT.SHELF, INT.BOARD]);
    const forward2Key = passTalkTiles.has(forwardTile)
      ? `${fy + dirDelta.dy},${fx + dirDelta.dx}`
      : null;

    const checkKeys = [
      `${intPos.y},${intPos.x}`,
      forwardKey,
      ...(forward2Key ? [forward2Key] : []),
      ...[[-1,0],[1,0],[0,-1],[0,1]].map(([dy, dx]) => `${intPos.y + dy},${intPos.x + dx}`),
    ];
    for (const k of checkKeys) {
      const npc = npcByPos[k];
      if (npc) {
        if (triggerEvent(npc.eventKey)) return;
      }
      if (treasures[k]) {
        const reward = onOpenTreasure ? onOpenTreasure(treasures[k]) : { messages: ["宝箱をあけた。"] };
        setIntEvent({ messages: reward.messages || treasures[k].messages || ["宝箱をあけた。"] });
        return;
      }
      if (events[k] && map[Number(k.split(",")[0])]?.[Number(k.split(",")[1])] !== INT.NPC) {
        if (triggerEvent(k)) return;
      }
    }
  }, [intPos, intDir, npcByPos, triggerEvent, treasures, onOpenTreasure, events, map]);

  useEffect(() => {
    const handler = (e) => {
      if (intEvent) return;
      if (e.key === "ArrowUp" || e.key === "w") { e.preventDefault(); tryMove(0, -1); }
      else if (e.key === "ArrowDown" || e.key === "s") { e.preventDefault(); tryMove(0, 1); }
      else if (e.key === "ArrowLeft" || e.key === "a") { e.preventDefault(); tryMove(-1, 0); }
      else if (e.key === "ArrowRight" || e.key === "d") { e.preventDefault(); tryMove(1, 0); }
      else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); investigate(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [tryMove, investigate, intEvent]);

  const handleMovePointer = (dx, dy) => (e) => { e.preventDefault(); tryMove(dx, dy); };

  if (showShop) {
    return (
      <div className="relative flex flex-col h-full bg-black text-white">
        <ShopOverlay player={player} items={currentShopItems} onBuy={(item) => onBuy && onBuy(item)} onClose={() => setShowShop(false)} />
      </div>
    );
  }

  const handleIntEventDone = () => {
    if (!intEvent) return;
    const ev = intEvent;
    setIntEvent(null);
    if (ev.enemyId && onEnemyBattle) { onEnemyBattle(ev.enemyId); return; }
    if (ev.boss && onBoss) { onBoss(); return; }
    if (ev.shop) {
      const itemsMap = { T2: SHOP_ITEMS_T2, T3: SHOP_ITEMS_T3 };
      setCurrentShopItems(ev.shopItems ? (itemsMap[ev.shopItems] ?? ev.shopItems) : SHOP_ITEMS_T1);
      setShowShop(true);
    }
  };

  // ビューポート：大きなマップ（ダンジョン以外）はプレイヤー中心の 11×11 窓で表示
  const INT_VIEW = 11;
  const useViewport = !isDungeon && (rows > 13 || cols > 13);
  const viewW = useViewport ? Math.min(cols, INT_VIEW) : cols;
  const viewH = useViewport ? Math.min(rows, INT_VIEW) : rows;
  const TS = Math.max(20, Math.floor(336 / viewW));
  const camX = useViewport ? Math.max(0, Math.min(cols - viewW, intPos.x - Math.floor(viewW / 2))) : 0;
  const camY = useViewport ? Math.max(0, Math.min(rows - viewH, intPos.y - Math.floor(viewH / 2))) : 0;
  const renderCells = useViewport
    ? Array.from({ length: viewH }, (_, vy) =>
        Array.from({ length: viewW }, (_, vx) => {
          const mx = camX + vx;
          const my = camY + vy;
          return { x: mx, y: my, tile: map[my]?.[mx] ?? INT.WALL };
        })
      )
    : map.map((row, y) => row.map((tile, x) => ({ x, y, tile })));
  return (
    <div className={`relative flex flex-col h-full ${isDungeon ? "bg-gray-950" : isUnderground ? "bg-stone-950" : "bg-black"} text-white px-2 py-3 gap-2`}>
      <div className={`border p-2 text-xs text-center ${isDungeon ? "border-gray-800 text-gray-400" : isUnderground ? "border-stone-700 text-amber-600" : "border-gray-600 text-yellow-300"}`}>{title}</div>
      <div className="flex justify-center">
        <div className="relative" style={{ width: viewW * TS, height: viewH * TS }}>
        <div className="inline-grid gap-0" style={{ gridTemplateColumns: `repeat(${viewW},${TS}px)`, border: `1px solid ${isCave ? "#222" : isUnderground ? "#1c1008" : "#444"}` }}>
          {renderCells.map((row) => row.map(({ x, y, tile }) => {
            const isPlayer = intPos.x === x && intPos.y === y;
            const npc = npcByPos[`${y},${x}`];
            const chestKey = isDungeon ? `${interiorType}:${currentFloor}:${y},${x}` : `${interiorType}:${y},${x}`;
            const chestOpened = openedChestSet.has(chestKey);
            const displayTile = tile === INT.NPC ? INT.FLOOR : tile;
            const key = `${y},${x}`;
            const isHintCell = interactKeys.has(key) && !isPlayer;
            const canInteractHere = Boolean(npc) || Boolean(treasures[key]) || (events[key] && map[y]?.[x] !== INT.NPC);
            return (
              <div
                key={`${y}-${x}`}
                className="flex items-center justify-center"
                style={{
                  width: TS,
                  height: TS,
                  background: tileStyle[displayTile] ?? "#333",
                  boxShadow: isHintCell && canInteractHere ? "inset 0 0 0 2px rgba(250,204,21,0.85)" : "none",
                }}
              >
                {isPlayer
                  ? <HeroSprite gender={player.gender} direction={intDir} animStep={animStep} size={TS - 2} />
                  : npc
                    ? (() => {
                      const p = (NPC_PALETTE[interiorType] ?? {})[npc.eventKey];
                      const sz = TS - 2;
                      if (interiorType === "catVillage") {
                        return <CatNpcSprite furColor={p?.body ?? "#fca5a5"} markColor={p?.hair ?? "#7c2d12"} size={sz} />;
                      }
                      if (interiorType === "town" && npc.eventKey === "26,6") {
                        return <DogNpcSprite furColor={p?.body ?? "#c8834a"} earColor={p?.hair ?? "#7c2d12"} size={sz} />;
                      }
                      const role = interiorType === "castle"
                        ? npc.eventKey === "4,10"
                          ? "king"
                          : npc.eventKey === "5,13"
                            ? "princess"
                            : npc.eventKey === "36,8" || npc.eventKey === "36,11" || npc.eventKey === "34,6" || npc.eventKey === "34,13"
                              ? "guard"
                              : "villager"
                        : "villager";
                      return <NpcSprite bodyColor={p?.body ?? "#a3e635"} hairColor={p?.hair ?? "#1a0a00"} size={sz} role={role} />;
                    })()
                    : tile === INT.CHEST
                      ? <InteriorTileIcon kind="chest" size={TS - 4} opened={chestOpened} />
                      : tile === INT.EXIT
                        ? <InteriorTileIcon kind="exit" size={TS - 4} />
                        : tile === INT.FOUNTAIN
                          ? <InteriorTileIcon kind="fountain" size={TS - 4} />
                          : tile === INT.SHELF
                            ? <InteriorTileIcon kind="shelf" size={TS - 4} />
                            : tile === INT.DESK
                              ? <InteriorTileIcon kind="desk" size={TS - 4} />
                              : tile === INT.BOARD
                                ? <InteriorTileIcon kind="board" size={TS - 4} />
                                : tile === INT.COUNTER
                                  ? <InteriorTileIcon kind="counter" size={TS - 4} />
                                  : tile === INT.STAIRS_DOWN
                                    ? <InteriorTileIcon kind="stairsDown" size={TS - 4} />
                                    : tile === INT.STAIRS_UP
                                      ? <InteriorTileIcon kind="stairsUp" size={TS - 4} />
                                  : null}
              </div>
            );
          }))}
        </div>
        {isDungeon && <CaveDarkness intPos={intPos} TS={TS} cols={cols} rows={rows} />}
        </div>
      </div>
      <p className="text-[10px] text-center text-gray-400">
        {isDungeon ? "A/Enterで調べる（机越しOK） ／ 階段で階層移動" : "A/Enterで調べる（机越しOK） ／ 出口へ乗ると外へ"}
      </p>

      <div className="mt-auto border-2 border-zinc-500 bg-zinc-800 rounded-md p-3 shadow-[inset_0_2px_0_rgba(255,255,255,0.25)]">
        <div className="flex justify-between items-end gap-2">
          <div className="grid grid-cols-3 gap-1 w-[126px]">
            <div />
            <button className="w-10 h-10 bg-zinc-700 border border-zinc-400 text-white active:scale-95" onPointerDown={handleMovePointer(0,-1)}>▲</button>
            <div />
            <button className="w-10 h-10 bg-zinc-700 border border-zinc-400 text-white active:scale-95" onPointerDown={handleMovePointer(-1,0)}>◀</button>
            <div className="w-10 h-10 bg-zinc-900 border border-zinc-700 rounded-sm" />
            <button className="w-10 h-10 bg-zinc-700 border border-zinc-400 text-white active:scale-95" onPointerDown={handleMovePointer(1,0)}>▶</button>
            <div />
            <button className="w-10 h-10 bg-zinc-700 border border-zinc-400 text-white active:scale-95" onPointerDown={handleMovePointer(0,1)}>▼</button>
            <div />
          </div>
          <div className="flex flex-col justify-end items-center gap-2 pb-1">
            <button className="px-3 py-1 bg-zinc-700 border border-zinc-400 text-[9px] rounded-full active:scale-95 leading-tight text-center" onClick={onInfo}>SELECT</button>
            <button className="px-3 py-1 bg-zinc-700 border border-zinc-400 text-[9px] rounded-full active:scale-95 leading-tight text-center" onClick={investigate}>START</button>
          </div>
          <div className="flex gap-2 pb-1 items-end">
            <button className="w-12 h-12 rounded-full bg-red-700 border-2 border-red-400 text-white text-sm active:scale-95" onClick={onInfo}>B</button>
            <button
              className={`w-12 h-12 rounded-full border-2 text-sm active:scale-95 ${canInvestigateNow ? "bg-red-700 border-red-400 text-white animate-pulse" : "bg-zinc-900 border-zinc-700 text-zinc-500"} ${canInvestigateNow ? "" : "cursor-not-allowed"}`}
              disabled={!canInvestigateNow}
              onClick={canInvestigateNow ? investigate : undefined}
            >
              A
            </button>
          </div>
        </div>
      </div>
      {intEvent && (
        <div className="absolute inset-x-2 bottom-3 z-20">
          <MessageBox lines={intEvent.messages} onNext={handleIntEventDone} mood={intEvent.mood ?? "normal"} />
        </div>
      )}
    </div>
  );
}

function EventScreen({ event, player, onDone }) {
  const msgs = [...event.messages];
  if (event.heal) msgs.push(`${player.name}の　体力が　全回復した！`);
  if (event.buff) msgs.push(`こうげき力が　${event.buff.val}　あがった！`);
  if (event.boss) msgs.push("……なにかが　でてきた！");
  if (event.interior) msgs.push("さあ、中へ　はいろう。");
  return (
    <div className="flex flex-col justify-end h-full bg-black p-4 gap-4">
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg mb-2 tracking-widest">SCENE</div>
          <p className="text-yellow-300 text-xs">{event.name}</p>
        </div>
      </div>
      <MessageBox lines={msgs} onNext={onDone} mood={event.mood ?? "normal"} />
    </div>
  );
}

function BattleScreen({ player, enemy: initEnemy, isBoss, onWin, onLose, onFlee, onUseItem }) {
  // ★ Modern JS ② structuredClone() — ディープクローンで敵データを独立コピー
  const [enemy, setEnemy]   = useState(() => { const e = deepClone(initEnemy); e.curHp = initEnemy.hp; return e; });
  // 敵ターンは setTimeout 経由で古いクロージャが走ることがあるため、魔法一覧は props 由来で固定する
  const enemyMagics = useMemo(() => {
    const m = initEnemy?.magic;
    if (!m) return [];
    return Array.isArray(m) ? m : [m];
  }, [initEnemy]);
  const [pHp, setPHp]           = useState(player.hp);
  const [pMp, setPMp]           = useState(player.mp);
  const [log, setLog]           = useState([`${initEnemy.name}が　あらわれた！`]);
  const [phase, setPhase]       = useState("command");
  const [sleeping, setSleeping] = useState(false);
  const [enemyFlash, setEnemyFlash] = useState(false);
  const [poisoned, setPoisoned] = useState(false);
  const [poisonTurns, setPoisonTurns] = useState(0);
  const [fearDebuffTurns, setFearDebuffTurns] = useState(0);
  const [turnSerial, setTurnSerial] = useState(0);
  const [busy, setBusy] = useState(false);
  const [bossIntroDone, setBossIntroDone] = useState(!isBoss);
  const [bossCharging, setBossCharging] = useState(false);
  const [playerHitFlash, setPlayerHitFlash] = useState(false);
  const [playerShakeX, setPlayerShakeX] = useState(0);
  const logRef = useRef(null);
  const prevFearRef = useRef(0);
  const damageFxTimerRef = useRef(null);
  const damageSfxCtxRef = useRef(null);
  const storyPhase = getStoryPhase(player);
  const availableSpells = useMemo(() => getUnlockedSpells(player), [player]);
  const enemyRecommendedLevel = initEnemy?.recommendedLevel ?? getEnemyRecommendedLevel(initEnemy?.id);

  useEffect(() => {
    if (!isBoss) {
      setBossIntroDone(true);
      setBossCharging(false);
      return;
    }
    setBossIntroDone(false);
    setBossCharging(false);
    addLog("洞窟の闇が　脈打つ……");
    addLog("ドランゴの目が　赤く　光った！");
    const t = setTimeout(() => setBossIntroDone(true), 1100);
    return () => clearTimeout(t);
  }, [isBoss]);

  // おそれレベル：HP比率から自動計算
  const fearLevel = useMemo(() => {
    if (pHp <= player.maxHp * 0.25) return 2;
    if (pHp <= player.maxHp * 0.5)  return 1;
    return 0;
  }, [pHp, player.maxHp]);

  // コウスケ同行フラグ（ボス戦除く）
  const hasCompanion = !isBoss && (player.storyFlags || []).includes("story:kousuke_join");

  const addLog = (msg) => setLog(prev => [...prev.slice(-11), msg]);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [log]);

  const triggerPlayerDamageFx = useCallback((damage = 1) => {
    const power = clamp(Number(damage || 1), 1, 40);
    setPlayerHitFlash(true);
    setPlayerShakeX((Math.random() < 0.5 ? -1 : 1) * (power >= 16 ? 8 : power >= 9 ? 6 : 4));
    if (damageFxTimerRef.current) clearTimeout(damageFxTimerRef.current);
    damageFxTimerRef.current = setTimeout(() => {
      setPlayerHitFlash(false);
      setPlayerShakeX(0);
    }, 130);

    if (!damageSfxCtxRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) damageSfxCtxRef.current = new Ctx();
    }
    const ctx = damageSfxCtxRef.current;
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const now = ctx.currentTime;

    // 低いノイズ感のある被弾音
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(240 + power * 2, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.055, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);

    // 高域の一瞬アタック
    const hitOsc = ctx.createOscillator();
    const hitGain = ctx.createGain();
    hitOsc.type = "square";
    hitOsc.frequency.setValueAtTime(980, now);
    hitOsc.frequency.exponentialRampToValueAtTime(320, now + 0.04);
    hitGain.gain.setValueAtTime(0.0001, now);
    hitGain.gain.exponentialRampToValueAtTime(0.035, now + 0.004);
    hitGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
    hitOsc.connect(hitGain);
    hitGain.connect(ctx.destination);
    hitOsc.start(now);
    hitOsc.stop(now + 0.055);
  }, []);

  // おそれレベルが上がったときにログ表示
  useEffect(() => {
    if (fearLevel > prevFearRef.current) {
      if (fearLevel === 2) addLog(`${player.name}は　きょうふに　とりつかれた！ こうげき-4！`);
      else if (fearLevel === 1) addLog(`${player.name}は　おそれを　感じている…… こうげき-2！`);
    }
    prevFearRef.current = fearLevel;
  }, [fearLevel, player.name]);

  const doEnemyTurn = useCallback((curPHp) => {
    // 逃走フラグ付き敵（メタにゃん等）：80%の確率で逃げ出す
    if (enemy.flees && rng(1, 10) <= 8) {
      addLog(`${enemy.name}は　すばやく　にげだした！`);
      setTimeout(() => onFlee(), 900);
      return curPHp;
    }
    if (sleeping) { addLog(`${enemy.name}は　ねむっている…`); setSleeping(false); return curPHp; }
    if (isBoss && bossCharging) {
      setBossCharging(false);
      const burstBase = Math.max(1, Math.round((enemy.atk || 1) * 1.45));
      const burstCap = Math.max(6, Math.floor(player.maxHp * 0.45));
      const dmg = Math.min(burstCap, Math.max(1, burstBase - Math.floor(player.def / 3) + rng(-1, 2)));
      const next = Math.max(0, curPHp - dmg);
      addLog(`${enemy.name}の　終焉の波動！ ${player.name}に ${dmg}の　ダメージ！`);
      setPHp(next);
      triggerPlayerDamageFx(dmg);
      return next;
    }
    const mgPool = enemyMagics;
    const magicChance = Math.max(0.15, Math.min(0.5, (1 / 3) * (enemy.magicRateMult ?? (storyPhase === 1 ? 0.55 : storyPhase === 2 ? 0.85 : 1))));
    if (mgPool.length && Math.random() < magicChance) {
      const mg = mgPool[rng(0, mgPool.length - 1)];
      if (mg.transformFile) {
        setEnemy((e) => ({ ...e, formImageFile: mg.transformFile, formLabel: mg.transformLabel || "" }));
        addLog(`${enemy.name}の　身体が　${mg.transformLabel || "異形"}に　変わった！`);
      }
      if (mg.type === "heal") {
        setEnemy(e => ({ ...e, curHp: Math.min(e.hp, e.curHp + mg.power) }));
        addLog(`${enemy.name}は　${mg.name}を　となえた！　HPが　かいふく！`);
        return curPHp;
      } else if (mg.type === "fear") {
        setFearDebuffTurns(3);
        addLog(`${enemy.name}は　${mg.name}を　となえた！`);
        addLog(`${player.name}の　こころに　やみが　宿る……（こうげき-3、3ターン）`);
        return curPHp;
      } else {
        const raw = Math.max(1, mg.power - Math.floor(player.def / 3) + rng(-1, 2));
        const cap = Math.max(4, Math.floor(player.maxHp * (isBoss ? 0.4 : 0.34)));
        const dmg = Math.min(cap, raw);
        const next = Math.max(0, curPHp - dmg);
        const verb = mg.transformFile ? "はなった" : "となえた";
        addLog(`${enemy.name}は　${mg.name}を　${verb}！　${player.name}に ${dmg}の　ダメージ！`);
        setPHp(next);
        triggerPlayerDamageFx(dmg);
        return next;
      }
    }
    if (isBoss && !bossCharging && rng(1, 100) <= 22) {
      setBossCharging(true);
      addLog(`${enemy.name}は　闇を　集めている……！`);
      return curPHp;
    }
    const raw = Math.max(1, enemy.atk - player.def + rng(-2, 2));
    const cap = Math.max(4, Math.floor(player.maxHp * (isBoss ? 0.38 : 0.32)));
    const dmg = Math.min(cap, raw);
    const next = Math.max(0, curPHp - dmg);
    addLog(`${enemy.name}の　こうげき！ ${player.name}に ${dmg}の　ダメージ！`);
    if (enemy.poison && Math.random() < (enemy.poisonRate ?? 0)) {
      setPoisoned(true);
      setPoisonTurns(5);
      addLog(`${player.name}は　どくに　おかされた！`);
    }
    setPHp(next);
    triggerPlayerDamageFx(dmg);
    return next;
  }, [enemy, player, sleeping, enemyMagics, onFlee, isBoss, bossCharging, storyPhase, triggerPlayerDamageFx]);

  useEffect(() => {
    if (turnSerial <= 0 || !poisoned || poisonTurns <= 0) return;
    const dmg = Math.max(1, Math.floor(player.maxHp * 0.06));
    setPHp((h) => Math.max(1, h - dmg));
    addLog(`どくの　ダメージ！ ${dmg}の　ダメージ！`);
    triggerPlayerDamageFx(Math.max(1, Math.floor(dmg * 0.6)));
    const nextTurns = poisonTurns - 1;
    setPoisonTurns(nextTurns);
    if (nextTurns <= 0) {
      setPoisoned(false);
      addLog("どくが　きえた！");
    }
  }, [turnSerial, poisoned, poisonTurns, player.maxHp, triggerPlayerDamageFx]);

  useEffect(() => () => {
    if (damageFxTimerRef.current) clearTimeout(damageFxTimerRef.current);
  }, []);

  const attack = () => {
    if (busy || !bossIntroDone) return;
    setBusy(true);
    const isCritical = rng(1, 100) <= 3;
    // おそれペナルティ
    const fearPenalty = fearLevel === 2 ? 4 : fearLevel === 1 ? 2 : 0;
    const darkPenalty = fearDebuffTurns > 0 ? 3 : 0;
    const effectiveAtk = Math.max(1, player.atk - fearPenalty - darkPenalty);
    const dmg = isCritical
      ? Math.max(2, Math.floor(effectiveAtk * 1.8) + rng(2, 5))
      : Math.max(1, effectiveAtk - (enemy.def ?? 0) + rng(-1, 2));
    let curEHp = Math.max(0, enemy.curHp - dmg);
    if (isCritical) addLog("たましいの　ひとうち！");
    addLog(`${player.name}の　こうげき！ ${enemy.name}に ${dmg}の　ダメージ！`);
    setEnemyFlash(true);
    setTimeout(() => setEnemyFlash(false), 90);
    setEnemy(e => ({ ...e, curHp: curEHp }));
    if (fearDebuffTurns > 0) setFearDebuffTurns(t => t - 1);
    if (curEHp <= 0) return setTimeout(() => { setBusy(false); onWin({ exp: enemy.exp, gold: enemy.gold, pHp, pMp }); }, 220);
    // コウスケ援護（20%）
    if (hasCompanion && rng(1, 5) === 1) {
      const compDmg = rng(5, 10);
      curEHp = Math.max(0, curEHp - compDmg);
      addLog(`コウスケの　こころが　助けに来た！ ${compDmg}の　ダメージ！`);
      setEnemy(e => ({ ...e, curHp: curEHp }));
      if (curEHp <= 0) return setTimeout(() => { setBusy(false); onWin({ exp: enemy.exp, gold: enemy.gold, pHp, pMp }); }, 220);
    }
    setTimeout(() => {
      const n = doEnemyTurn(pHp);
      setTurnSerial((t) => t + 1);
      if (n <= 0) setTimeout(onLose, 380);
      setBusy(false);
    }, 300);
  };

  const castSpell = (spell) => {
    if (pMp < spell.mp) return addLog("MPが　たりない！");
    if (busy || !bossIntroDone) return;
    setBusy(true);
    let newPHp = pHp, newEHp = enemy.curHp;
    if (spell.effect === "heal") {
      const g = spell.power;
      newPHp = Math.min(player.maxHp, pHp + g);
      setPHp(newPHp);
      addLog(`${spell.name}！ HPが ${g}　回復した！`);
    } else if (spell.effect === "elem") {
      const { damage, weak } = calcElementSpellDamage(spell, enemy);
      newEHp = Math.max(0, enemy.curHp - damage);
      setEnemy((e) => ({ ...e, curHp: newEHp }));
      addLog(`${spell.name}！ ${enemy.name}に ${damage}の　ダメージ！${weak ? "　強烈な一撃をお見舞いした！" : ""}`);
      if (isBoss && bossCharging) {
        setBossCharging(false);
        addLog("闇の集束を　かき消した！");
      }
    } else if (spell.effect === "wind") {
      const d = calcRawSpellDamage(spell.power, enemy);
      newEHp = Math.max(0, enemy.curHp - d);
      setEnemy((e) => ({ ...e, curHp: newEHp }));
      addLog(`${spell.name}！ ${enemy.name}に ${d}の　ダメージ！`);
      if (isBoss && bossCharging) {
        setBossCharging(false);
        addLog("闇の集束を　吹き飛ばした！");
      }
    } else if (spell.effect === "sleep") {
      if (enemy.id === 38) {
        addLog(`${spell.name}！　ドランゴには　きかなかった！`);
      } else {
        setSleeping(true);
        addLog(`${spell.name}！ ${enemy.name}は　ねむった！`);
      }
    }
    setPMp((m) => m - spell.mp);
    setPhase("command");
    if (newEHp <= 0) return setTimeout(() => { setBusy(false); onWin({ exp: enemy.exp, gold: enemy.gold, pHp: newPHp, pMp: pMp-spell.mp }); }, 220);
    setTimeout(() => {
      const n = doEnemyTurn(newPHp);
      setTurnSerial((t) => t + 1);
      if (n <= 0) setTimeout(onLose, 380);
      setBusy(false);
    }, 300);
  };

  const flee = () => {
    if (isBoss) return addLog("ボスからは　にげられない！");
    if (busy || !bossIntroDone) return;
    setBusy(true);
    if (rng(0,1)) { setBusy(false); onFlee(); }
    else {
      addLog("にげられなかった！");
      const n = doEnemyTurn(pHp);
      setTurnSerial((t) => t + 1);
      if (n <= 0) setTimeout(onLose, 380);
      setTimeout(() => setBusy(false), 170);
    }
  };

  useEffect(() => {
    if (pHp <= 0) {
      const t = setTimeout(onLose, 800);
      return () => clearTimeout(t);
    }
  }, [pHp, onLose]);

  const enemyPct = clamp(Math.round((enemy.curHp / enemy.hp) * 100), 0, 100);

  return (
    <div
      className="relative flex flex-col h-full bg-black text-white p-3 gap-3"
      style={{
        transform: `translateX(${playerShakeX}px)`,
        transition: playerShakeX !== 0 ? "transform 40ms linear" : "transform 120ms ease-out",
      }}
    >
      {playerHitFlash && <div className="absolute inset-0 z-10 pointer-events-none bg-red-500/15" />}
      <div className="border-2 border-gray-600 p-3 flex flex-col items-center gap-2">
        <div className={`${enemy.curHp < enemy.hp * 0.3 ? "opacity-60" : ""}`}
          style={{
            filter: enemy.curHp <= 0 ? "grayscale(1)" : "",
            transform: isBoss && enemyFlash ? "translateX(2px)" : "none",
            transition: "transform 70ms linear",
          }}>
          <EnemySprite enemy={enemy} size={isBoss ? 108 : 84} flash={enemyFlash} />
        </div>
        <p className="text-sm font-bold">{enemy.name}</p>
        {enemy.formLabel && <p className="text-[10px] text-fuchsia-300">{enemy.formLabel}</p>}
        <p className="text-[10px] text-gray-300">推奨Lv {enemyRecommendedLevel}</p>
        <div className="w-full bg-gray-800 border border-gray-600 h-3 rounded overflow-hidden">
          <div className="bg-red-500 h-full transition-all duration-500" style={{ width:`${enemyPct}%` }} />
        </div>
      </div>
      {isBoss && !bossIntroDone && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/85">
          <div className="text-center">
            <p className="text-red-300 text-lg tracking-widest animate-pulse">BOSS BATTLE</p>
            <p className="text-yellow-200 text-xs mt-2">闇が揺れる……ドランゴが襲いかかる！</p>
          </div>
        </div>
      )}
      <div className="border border-gray-700 p-2 grid grid-cols-1 gap-1">
        <HPBar label="HP" current={pHp} max={player.maxHp} />
        <HPBar label="MP" current={pMp} max={player.maxMp} color="blue" />
        {poisoned && <p className="text-[10px] text-purple-300">状態：どく ({poisonTurns})</p>}
        {fearLevel === 2 && <p className="text-[10px] text-red-400">状態：きょうふ（こうげき-4）</p>}
        {fearLevel === 1 && <p className="text-[10px] text-orange-300">状態：おびえ（こうげき-2）</p>}
        {fearDebuffTurns > 0 && <p className="text-[10px] text-red-300">やみのことば（こうげき-3、残{fearDebuffTurns}T）</p>}
        {isBoss && bossCharging && <p className="text-[10px] text-yellow-300">ドランゴが　闇を集束中（次ターン大技）</p>}
        {hasCompanion && <p className="text-[10px] text-cyan-300">コウスケが　ともに　戦っている</p>}
      </div>

      {/* 最新ログ黄色 / 敵行動を赤（Safari互換） */}
      <div ref={logRef} className="border border-gray-800 p-2 bg-gray-950 h-[92px] overflow-y-auto">
        {(() => {
          const latestMsg    = arrayLast(log);
          const lastEnemyMsg = findLastCompat(log, (l) => l.startsWith(enemy.name));
          return log.map((l, i) => (
            <p key={`${l}-${i}`}
              className={`text-xs leading-5 ${l === latestMsg ? "text-yellow-200 font-semibold" : l === lastEnemyMsg ? "text-red-300" : "text-gray-400"}`}>
              {l}
            </p>
          ));
        })()}
      </div>

      {phase === "command" && (
        busy ? (
          <p className="text-xs text-center text-gray-400">敵のターン…</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {[
              { label:"たたく",      action: attack,              color:"border-white text-white" },
              { label:"じゅもん",    action: () => setPhase("spell"), color:"border-blue-400 text-blue-400" },
              { label:"どうぐ",      action: () => setPhase("item"), color: player.bag && player.bag.length > 0 ? "border-green-500 text-green-400" : "border-gray-500 text-gray-500" },
              { label:"にげる",      action: flee,                color:"border-yellow-600 text-yellow-600" },
            ].map(({ label, action, color }) => (
              <button
                key={label}
                className={`border-2 ${color} py-3 text-sm active:opacity-60`}
                style={{ fontFamily:"'Courier New',monospace" }}
                onClick={action}
              >
                {label}
              </button>
            ))}
          </div>
        )
      )}
      {phase === "spell" && (
        <div className="flex flex-col gap-2 max-h-[240px] overflow-y-auto pr-1">
          <p className="text-xs text-center text-blue-300">── じゅもんを　えらべ ──</p>
          {availableSpells.length === 0 && (
            <p className="text-xs text-center text-gray-500">まだ　おぼえた　じゅもんが　ない！</p>
          )}
          {availableSpells.map(s => (
            <button key={s.name} className={`border border-blue-600 py-2 text-xs flex justify-between px-4 ${pMp<s.mp?"opacity-40":""}`}
              disabled={busy || pMp < s.mp}
              onClick={() => castSpell(s)}>
              <span className="text-blue-300">{s.secret ? "秘術 " : ""}{s.name}</span>
              <span className="text-gray-400">MP {s.mp}</span>
            </button>
          ))}
          <button className="border border-gray-700 text-gray-500 py-2 text-xs" disabled={busy} onClick={() => setPhase("command")}>もどる</button>
        </div>
      )}
      {phase === "item" && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-center text-green-300">── どうぐを　えらべ ──</p>
          {(player.bag || []).filter(item => (item.heal ?? 0) > 0 || item.curePoison).length === 0 && (
            <p className="text-xs text-center text-gray-500">どうぐが　ない！</p>
          )}
          {(player.bag || []).filter(item => (item.heal ?? 0) > 0 || item.curePoison).map(item => (
            <button key={item.id}
              className="border border-green-600 py-2 text-xs flex justify-between px-4"
              disabled={busy}
              onClick={() => {
                if (busy || !bossIntroDone) return;
                setBusy(true);
                const healed = Math.min(player.maxHp - pHp, item.heal || 0);
                const newPHp = pHp + healed;
                if ((item.heal || 0) > 0) {
                  setPHp(newPHp);
                  addLog(`${item.name}を　つかった！　HPが ${healed}　回復した！`);
                } else {
                  addLog(`${item.name}を　つかった！`);
                }
                if (item.curePoison) {
                  if (poisoned) {
                    setPoisoned(false);
                    setPoisonTurns(0);
                    addLog("どくが　なおった！");
                  } else {
                    addLog("なにも　おこらなかった。");
                  }
                }
                onUseItem && onUseItem(item.id);
                setPhase("command");
                setTimeout(() => {
                  const n = doEnemyTurn(newPHp);
                  setTurnSerial((t) => t + 1);
                  if(n<=0) setTimeout(onLose,380);
                  setBusy(false);
                }, 300);
              }}>
              <span className="text-green-300">{item.name} ×{item.count}</span>
              <span className="text-gray-400">{item.curePoison ? "どく回復" : `HP+${item.heal}`}</span>
            </button>
          ))}
          <button className="border border-gray-700 text-gray-500 py-2 text-xs" disabled={busy} onClick={() => setPhase("command")}>もどる</button>
        </div>
      )}
    </div>
  );
}

function InfoOverlay({ player, onClose, onSave, onWarp, onUseRecorder }) {
  const equip = player.equip ?? {};
  const eqName = (id) => id ? (EQUIP_DICT[id]?.name ?? id) : "なし";
  const progress = getMainProgress(player);
  const objective = getNextObjective(player);
  const WARP_POINTS = [
    { name: "はじまりの村", pos: SPECIAL_POS.village },
    { name: "いずみの街", pos: SPECIAL_POS.town },
    { name: "職人の村", pos: SPECIAL_POS.artisanVillage },
    { name: "まなびの学校", pos: SPECIAL_POS.school },
    { name: "ながれぼしの家", pos: SPECIAL_POS.home },
  ];
  const hasRoyalQuest = (player.storyFlags || []).includes("story:royalQuest");
  return (
    <div className="absolute inset-0 bg-black/95 flex flex-col text-white p-4 gap-3 z-50">
      <p className="text-center text-yellow-300 text-sm border-b border-gray-700 pb-2"
        style={{ fontFamily:"'Courier New',monospace" }}>── じょうほう ──</p>
      <div className="border border-gray-700 p-3 text-xs space-y-1" style={{ fontFamily:"'Courier New',monospace" }}>
        <p>なまえ ：{player.name}（{player.gender === "male" ? "男の子" : "女の子"}）</p>
        <p>レベル ：{player.level}　　EXP：{player.exp}</p>
        <p>HP     ：{player.hp} / {player.maxHp}</p>
        <p>MP     ：{player.mp} / {player.maxMp}</p>
        <p>こうげき：{player.atk}　　まもり：{player.def}</p>
        <p>ゴールド：{player.gold}G</p>
        <div className="border-t border-gray-700 mt-2 pt-2 space-y-1">
          <p className="text-cyan-300">称号：{progress.title}</p>
          <p className="text-cyan-200">進行率：{progress.percent}%（{progress.done}/{progress.total}）</p>
          <div className="bg-gray-800 border border-gray-700 h-2 rounded overflow-hidden">
            <div className="bg-cyan-500 h-full transition-all duration-500" style={{ width: `${progress.percent}%` }} />
          </div>
          <p className="text-[10px] text-gray-300">次の目的：{objective}</p>
        </div>
        <div className="border-t border-gray-700 mt-2 pt-2 space-y-1">
          <p className="text-yellow-400">── そうび ──</p>
          <p>武器　：{eqName(equip.weapon)}</p>
          <p>防具　：{eqName(equip.armor)}</p>
          <p>アクセ：{eqName(equip.accessory)}</p>
        </div>
        {player.bag && player.bag.length > 0 && (
          <div className="border-t border-gray-700 pt-2">
            <p>どうぐ：{player.bag.map(i => `${i.name}×${i.count}`).join(" / ")}</p>
            {player.bag.some(i => i.id === "recorder" && i.count > 0) && (
              <button
                className="mt-2 w-full border border-purple-500 text-purple-300 text-xs py-1 active:opacity-60"
                onClick={() => onUseRecorder && onUseRecorder(player.pos)}
              >♪ リコーダーをふく</button>
            )}
          </div>
        )}
        {player.nazoSpellLearned && (
          <p className="text-blue-300 border-t border-gray-700 pt-2">せんにんのかぜ　習得済み</p>
        )}
        {(player.storyFlags || []).includes("story:kousuke_join") && (
          <p className="text-cyan-300 border-t border-gray-700 pt-2">仲間：コウスケが　こころで　ともに　戦う</p>
        )}
        {(player.bag || []).some(i => i.id === "dragon_scale" && i.count > 0) && (
          <p className="text-yellow-300 border-t border-gray-700 pt-2">仲間：猫のともだち（にゃ）</p>
        )}
        <div className="border-t border-gray-700 mt-2 pt-2 space-y-1">
          <p className="text-yellow-400">── しめい ──</p>
          <p className={`${hasRoyalQuest ? "text-green-300" : "text-gray-500"}`}>
            {hasRoyalQuest ? "王の使命：受領" : "王の使命：未"}
          </p>
        </div>
      </div>
      {player.level >= 2 && (
        <div className="border border-blue-700 p-2">
          <p className="text-xs text-blue-300 mb-2">── 旅のしるべ ──</p>
          {WARP_POINTS
            .filter((wp) => player.visited?.has(`${wp.pos.y},${wp.pos.x}`))
            .map((wp) => (
              <button
                key={wp.name}
                className="block w-full border border-blue-600 text-blue-200 text-xs py-1 mb-1 active:opacity-60"
                onClick={() => onWarp && onWarp(wp.pos)}
              >
                {wp.name}へ　移動
              </button>
            ))}
        </div>
      )}
      <button className="border-2 border-yellow-400 text-yellow-300 py-3 text-sm active:opacity-60"
        style={{ fontFamily:"'Courier New',monospace" }} onClick={onSave}>セーブする</button>
      <button className="border-2 border-white py-2 text-sm active:opacity-60"
        style={{ fontFamily:"'Courier New',monospace" }} onClick={onClose}>とじる</button>
    </div>
  );
}

function GameOverScreen({ onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-black text-white gap-8">
      <div className="text-center">
        <p className="text-2xl mb-4 tracking-widest">GAME OVER</p>
        <h2 className="text-2xl tracking-widest mb-2" style={{ fontFamily:"'Courier New',monospace" }}>ゲームオーバー</h2>
        <p className="text-xs text-gray-400">でも　たびびとは　また　たちあがる。</p>
      </div>
      <button className="border-2 border-white px-8 py-3 text-sm" style={{ fontFamily:"'Courier New',monospace" }} onClick={onRetry}>もういちど</button>
    </div>
  );
}

// 固定の星配置（シード固定疑似乱数）
const STARS = Array.from({ length: 60 }, (_, i) => {
  const x = ((i * 7919 + 13) % 1000) / 1000;
  const y = ((i * 6271 + 37) % 1000) / 1000;
  const r = i % 3 === 0 ? 1.5 : 1.0;
  return [x, y * 0.7, r];
});

function lerp(a, b, t) { return a + (b - a) * Math.min(1, Math.max(0, t)); }

function DawnCanvas({ progress }) {
  const canvasRef = React.useRef(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;

    // 空のグラデーション（夜 → 夜明け）
    const r1 = Math.floor(lerp(0,  42, progress));
    const g1 = Math.floor(lerp(0,  10, progress));
    const b1 = Math.floor(lerp(16, 74, progress));
    const skyTop = `rgb(${r1},${g1},${b1})`;

    const r2 = Math.floor(lerp(0,  80, progress));
    const g2 = Math.floor(lerp(0,  30, progress));
    const b2 = Math.floor(lerp(20, 60, progress));
    const skyBot = `rgb(${r2},${g2},${b2})`;

    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, skyTop);
    grad.addColorStop(1, skyBot);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // 地平線のオレンジのグロー（progress後半から）
    if (progress > 0.5) {
      const glow = ctx.createRadialGradient(W/2, H*0.72, 0, W/2, H*0.72, H*0.4);
      const alpha = Math.min(1, (progress - 0.5) * 2 * 0.5);
      glow.addColorStop(0, `rgba(255,120,30,${alpha})`);
      glow.addColorStop(1, "rgba(255,80,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);
    }

    // 星（progressに応じてフェードアウト）
    const starAlpha = Math.max(0, 1 - progress * 2);
    if (starAlpha > 0) {
      ctx.fillStyle = `rgba(255,255,255,${starAlpha})`;
      STARS.forEach(([sx, sy, sr]) => {
        ctx.beginPath();
        ctx.arc(sx * W, sy * H, sr, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }, [progress]);

  return (
    <canvas ref={canvasRef} width={360} height={640}
      style={{ position:"absolute", inset:0, width:"100%", height:"100%", opacity:0.85 }} />
  );
}

function EndingScreen({ player }) {
  const [shown, setShown] = useState(0);
  const title = getPlayerTitle(player);
  const hasSecretTitle = (player.storyFlags || []).includes("story:titleStarlight");
  const lines = [
    "ドランゴが　たおれた。",
    "……静かだった。",
    "ほんとうに　静かだった。",
    "暗かった空が　ゆっくりと　晴れていく。",
    "どこかで　子供の　笑い声が　聞こえた。",
    "———",
    "ライモンは　ひとり、　詩を　書き始めた。",
    "言葉が　また　動いた。　うたが　戻った。",
    "———",
    "ミズキが　窓を　開けた。",
    "空が　青かった。",
    "「……悪くない」と　小声で　言った。",
    "———",
    "ヒロシの娘が　笑った。",
    "ヒロシは　それを　見て　泣いた。",
    "———",
    "ネコが　にゃ、と言った。",
    "ただそれだけだった。　でも　十分だった。",
    "———",
    `そして　${player.name}は　草原に　立っていた。`,
    "……帰り方は　わからない。",
    "でも　今は　それでよかった。",
    "風が　吹いた。",
    hasSecretTitle
      ? `称号『${title}』が　夜明けの空に　輝いた。`
      : `称号『${title}』を　胸に　あたらしい朝へ歩き出す。`,
  ];
  useEffect(() => {
    if (shown < lines.length - 1) {
      const t = setTimeout(() => setShown(s => s + 1), 1800);
      return () => clearTimeout(t);
    }
  }, [shown, lines.length]);
  return (
    <div style={{ position:"relative", width:"100%", height:"100%", background:"#000010",
                  display:"flex", flexDirection:"column", alignItems:"center",
                  justifyContent:"center", overflow:"hidden" }}>

      {/* 夜明けCanvas（背景） */}
      <DawnCanvas progress={shown / Math.max(1, lines.length - 1)} />

      {/* テキスト層（Canvas の上に重ねる） */}
      <div style={{ position:"relative", zIndex:10, width:"100%",
                    display:"flex", flexDirection:"column", alignItems:"center",
                    gap:"1.5rem", padding:"0 1.5rem" }}>
        <p style={{ fontSize:"1.5rem", letterSpacing:"0.25em",
                    animation:"pulse 2s infinite",
                    color: shown > lines.length * 0.7 ? "#fde68a" : "#ffffff" }}>
          ENDING
        </p>
        <div style={{ textAlign:"center", fontFamily:"'Courier New',monospace" }}>
          {lines.slice(0, shown + 1).map((l, i) => (
            <p key={i} style={{
              fontSize:"0.875rem", lineHeight:"1.75rem",
              transition:"opacity 0.7s",
              color: i === shown ? "#fde68a" : "rgba(209,213,219,0.6)"
            }}>
              {l === "———" ? <span style={{ color:"rgba(255,255,255,0.2)" }}>———</span> : l}
            </p>
          ))}
        </div>
        {shown >= lines.length - 1 && (
          <p style={{ fontSize:"0.75rem", color:"rgba(156,163,175,0.6)",
                      marginTop:"1rem", animation:"pulse 2s infinite" }}>
            ～ THE END ～
          </p>
        )}
      </div>
    </div>
  );
}

