// ─── APP ─────────────────────────────────────────────────────────────────────
function App() {
  const [screen, setScreen] = useState(SCREEN.TITLE);
  const [player, setPlayer] = useState(null);
  const [tempName, setTempName] = useState("");
  const [currentEvent, setCurrentEvent] = useState(null);
  const [currentEnemy, setCurrentEnemy] = useState(null);
  const [isBoss, setIsBoss] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [pendingMsg, setPendingMsg] = useState(null);
  const [showPending, setShowPending] = useState(false);
  const [interiorType, setInteriorType] = useState(null);
  const [hasSave, setHasSave] = useState(false);
  const [assetsReady, setAssetsReady] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState("day"); // "morning"|"day"|"evening"|"night"
  const gameFrameRef = useRef(null);
  const audioCtxRef = useRef(null);
  const moveLockRef = useRef(0);
  const bgmModeRef = useRef("");
  const bgmTrackRef = useRef("");
  const bgmCycleRef = useRef({
    field: 0,
    town: 0,
    battle: 0
  });
  const bgmAudioMapRef = useRef({});
  const currentBgmRef = useRef(null);
  const moveHintLockRef = useRef(0);
  const gameOverSfxLockRef = useRef(false);
  const hasOwn = useCallback((obj, key) => Object.prototype.hasOwnProperty.call(obj, key), []);
  const canEnterWorldTile = useCallback((tile, actor) => {
    const hasAirship = canUseAirship(actor);
    const hasShip = canUseShip(actor);
    if (hasAirship) return true;
    if (tile === TILE.MOUNTAIN) return false;
    if ([TILE.SEA, TILE.LAKE, TILE.WATER].includes(tile)) return hasShip;
    return true;
  }, []);
  const movementBlockMessage = useCallback((tile, actor) => {
    if (tile === TILE.MOUNTAIN && !canUseAirship(actor)) {
      if (canUseShip(actor)) {
        return ["山脈が　行く手を　ふさいでいる。", "3つのあかしを集め、飛行船ドックを目指そう。"];
      }
      return ["山脈が　行く手を　ふさいでいる。", "飛行船があれば　越えられそうだ。"];
    }
    if ([TILE.SEA, TILE.LAKE, TILE.WATER].includes(tile) && !canUseShip(actor)) {
      return ["水辺が　行く手を　ふさいでいる。", "王城の使命を受けて船着き場へ向かえば、渡れるはずだ。"];
    }
    return null;
  }, []);

  // セーブデータの存在チェック（マウント時）
  useEffect(() => {
    let mounted = true;
    const initRuntime = async () => {
      try {
        await bootstrapRuntimeAssets();
      } catch (_) {
        GAME_DATA = Object.assign({}, DEFAULT_GAME_DATA);
      } finally {
        if (mounted) setAssetsReady(true);
      }
      try {
        if (mounted) setHasSave(!!localStorage.getItem(SAVE_KEY));
      } catch (_) {}
    };
    initRuntime();
    return () => {
      mounted = false;
    };
  }, []);

  // 昼夜サイクル：3分ごとに朝→昼→夕方→夜と切り替え
  useEffect(() => {
    const TOD_CYCLE = ["morning", "day", "evening", "night"];
    const id = setInterval(() => setTimeOfDay(prev => {
      const idx = TOD_CYCLE.indexOf(prev);
      return TOD_CYCLE[(idx + 1) % 4];
    }), 180000);
    return () => clearInterval(id);
  }, []);

  // セーブ（visited は Set → Array に変換して保存）
  const saveGame = useCallback(() => {
    if (!player) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        ...Object.entries(player).reduce((acc, [k, value]) => {
          acc[k] = k === "visited" ? [...value] : value;
          return acc;
        }, {}),
        visited: [...player.visited],
        bag: sortBagItems(player.bag || [])
      }));
      setHasSave(true);
      setPendingMsg(["セーブしました！"]);
    } catch (e) {
      setPendingMsg(["セーブできませんでした。", "（プライベートモードでは保存できません）"]);
    }
    setShowInfo(false);
  }, [player]);

  // タッチスクロール防止（iOS: touchstart で一律 preventDefault すると <button> の合成 click が来ずタップ不能になる）
  useEffect(() => {
    let lastTouchEnd = 0;
    const touchEl = e => {
      const t = e.target;
      if (t instanceof Element) return t;
      if (t && t.parentElement) return t.parentElement;
      return null;
    };
    const isClickableTouchTarget = el => {
      if (!el || !gameFrameRef.current?.contains(el)) return false;
      return !!el.closest('button, a[href], input, select, textarea, label, [role="button"], [tabindex="0"]');
    };
    const isScrollableTouchTarget = el => {
      if (!el || !gameFrameRef.current?.contains(el)) return false;
      return !!el.closest("[data-allow-touch-scroll=\"true\"]");
    };
    const onTE = e => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) e.preventDefault();
      lastTouchEnd = now;
    };
    const onTM = e => {
      if (!gameFrameRef.current?.contains(e.target)) return;
      const el = touchEl(e);
      if (isClickableTouchTarget(el)) return;
      if (isScrollableTouchTarget(el)) return;
      e.preventDefault();
    };
    document.addEventListener("touchstart", onTM, {
      passive: false
    });
    document.addEventListener("touchend", onTE, {
      passive: false
    });
    document.addEventListener("touchmove", onTM, {
      passive: false
    });
    return () => {
      document.removeEventListener("touchstart", onTM);
      document.removeEventListener("touchend", onTE);
      document.removeEventListener("touchmove", onTM);
    };
  }, []);
  const BGM_LIBRARY = useMemo(() => ({
    fieldA: "./bgm-field.mp3",
    townA: "./bgm-town.mp3",
    battleA: "./bgm-battle.mp3",
    bossA: "./bgm-boss.mp3",
    shipA: "./images/蒼き帆の歌.mp3",
    airshipA: "./images/飛空艇.mp3"
  }), []);
  const BGM_SCENES = useMemo(() => ({
    field: ["fieldA"],
    town: ["townA"],
    battle: ["battleA"],
    boss: ["bossA"],
    ship: ["shipA"],
    airship: ["airshipA"]
  }), []);
  const stopBgm = useCallback(() => {
    if (currentBgmRef.current) {
      currentBgmRef.current.pause();
      currentBgmRef.current.currentTime = 0;
      currentBgmRef.current = null;
    }
    bgmModeRef.current = "";
    bgmTrackRef.current = "";
  }, []);
  const playLevelUpSound = useCallback(() => {
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const now = ctx.currentTime;
    const seq = [{
      f: 523.25,
      t: 0
    }, {
      f: 659.25,
      t: 0.12
    }, {
      f: 783.99,
      t: 0.24
    }, {
      f: 1046.50,
      t: 0.36
    }, {
      f: 1318.50,
      t: 0.52
    }, {
      f: 1568.00,
      t: 0.68
    }];
    seq.forEach(({
      f,
      t
    }) => {
      const o = ctx.createOscillator(),
        g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.type = "square";
      o.frequency.setValueAtTime(f, now + t);
      g.gain.setValueAtTime(0.001, now + t);
      g.gain.exponentialRampToValueAtTime(0.07, now + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, now + t + 0.18);
      o.start(now + t);
      o.stop(now + t + 0.22);
    });
  }, []);
  const playKeyItemSound = useCallback(() => {
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
      const o = ctx.createOscillator(),
        g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.type = "square";
      o.frequency.setValueAtTime(freq, now + i * 0.14);
      g.gain.setValueAtTime(0.001, now + i * 0.14);
      g.gain.exponentialRampToValueAtTime(0.07, now + i * 0.14 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.14 + 0.38);
      o.start(now + i * 0.14);
      o.stop(now + i * 0.14 + 0.42);
    });
  }, []);
  const playUiClick = useCallback((isStrong = false) => {
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const base = isStrong ? 1320 : 1046;
    osc.type = "square";
    osc.frequency.setValueAtTime(base, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(base * 0.78, ctx.currentTime + 0.055);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.07, ctx.currentTime + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.06);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.065);
  }, []);
  const playGameOver = useCallback(() => {
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});

    // C5 -> G4 -> E4 -> C4 (ファミコン風の下降音階)
    const notes = [{
      freq: 523,
      time: 0.0
    }, {
      freq: 392,
      time: 0.35
    }, {
      freq: 330,
      time: 0.70
    }, {
      freq: 262,
      time: 1.05
    }];
    const now = ctx.currentTime;
    notes.forEach(({
      freq,
      time
    }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "square";
      osc.frequency.setValueAtTime(freq, now + time);
      gain.gain.setValueAtTime(0.25, now + time);
      gain.gain.exponentialRampToValueAtTime(0.001, now + time + 0.28);
      osc.start(now + time);
      osc.stop(now + time + 0.3);
    });
  }, []);
  const startBgm = useCallback((scene = "field") => {
    if (!bgmAudioMapRef.current.fieldA) return;
    const trackSet = BGM_SCENES[scene] ?? BGM_SCENES.field;
    const cycleIndex = bgmCycleRef.current[scene] ?? 0;
    const picked = trackSet[cycleIndex % trackSet.length];
    bgmCycleRef.current[scene] = (cycleIndex + 1) % trackSet.length;
    if (bgmTrackRef.current === picked && currentBgmRef.current && !currentBgmRef.current.paused) return;
    stopBgm();
    const audio = bgmAudioMapRef.current[picked];
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch(() => {});
    currentBgmRef.current = audio;
    bgmModeRef.current = scene;
    bgmTrackRef.current = picked;
  }, [BGM_LIBRARY, BGM_SCENES, stopBgm]);

  // ロード（Array → Set に戻す）
  const continueGame = useCallback(() => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      setPlayer(normalizeSavedPlayer(data));
      startBgm();
      setScreen(SCREEN.MAP);
    } catch (e) {
      setPendingMsg(["データを　よみこめませんでした。"]);
    }
  }, [startBgm]);
  useEffect(() => {
    const map = {};
    Object.entries(BGM_LIBRARY).forEach(([key, path]) => {
      const audio = new Audio(path);
      audio.preload = "auto";
      audio.loop = true;
      audio.volume = 0.62;
      map[key] = audio;
    });
    bgmAudioMapRef.current = map;
    return () => {
      Object.values(map).forEach(audio => {
        try {
          audio.pause();
          audio.src = "";
        } catch (_) {}
      });
    };
  }, [BGM_LIBRARY]);
  const hasPlayer = !!player;
  useEffect(() => {
    if ([SCREEN.TITLE, SCREEN.GAMEOVER, SCREEN.ENDING].includes(screen)) {
      stopBgm();
      return;
    }
    if (!hasPlayer) {
      stopBgm();
      return;
    }
    if (screen === SCREEN.BATTLE) {
      startBgm(isBoss ? "boss" : "battle");
      return;
    }
    if (screen === SCREEN.INTERIOR) {
      if (interiorType === "shipReef") {
        startBgm("field");
        return;
      }
      if (interiorType === "skySanctum") {
        startBgm("boss");
        return;
      }
      if (["village", "town", "castle", "artisanVillage", "manabiVillage", "nazoVillage", "catVillage", "underground", "southShrine", "shipReef", "skySanctum"].includes(interiorType || "")) {
        startBgm("town");
        return;
      }
      if (interiorType === "cave" || interiorType === "catCave") {
        stopBgm();
        return;
      }
    }
    if (screen === SCREEN.MAP) {
      startBgm("field");
    }
  }, [screen, interiorType, isBoss, hasPlayer, startBgm, stopBgm]);

  // 乗り物BGM切り替え（船・飛空艇タイルに入ったとき）
  const playerPosX = player?.pos?.x;
  const playerPosY = player?.pos?.y;
  const playerFlags = player?.storyFlags;
  useEffect(() => {
    if (screen !== SCREEN.MAP || !player) return;
    const tile = MAP_GRID[player.pos.y][player.pos.x];
    const waterTiles = [TILE.SEA, TILE.LAKE, TILE.WATER];
    if (canUseAirship(player) && (tile === TILE.MOUNTAIN || waterTiles.includes(tile))) {
      startBgm("airship");
    } else if (canUseShip(player) && waterTiles.includes(tile)) {
      startBgm("ship");
    } else if (bgmModeRef.current === "ship" || bgmModeRef.current === "airship") {
      startBgm("field");
    }
  }, [screen, playerPosX, playerPosY, playerFlags, startBgm]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => stopBgm(), [stopBgm]);
  useEffect(() => {
    if (screen !== SCREEN.GAMEOVER) gameOverSfxLockRef.current = false;
  }, [screen]);

  // iOS Safari: 復帰時にBGM再生が止まりやすいので再開を試みる
  useEffect(() => {
    const resumeAudio = () => {
      if (document.visibilityState === "hidden") return;
      const shouldPlay = !!player && ![SCREEN.TITLE, SCREEN.GAMEOVER, SCREEN.ENDING].includes(screen);
      if (!shouldPlay) return;
      if (currentBgmRef.current) {
        if (currentBgmRef.current.paused) currentBgmRef.current.play().catch(() => {});
        return;
      }
      const scene = screen === SCREEN.BATTLE ? isBoss ? "boss" : "battle" : screen === SCREEN.INTERIOR && interiorType === "shipReef" ? "field" : screen === SCREEN.INTERIOR && interiorType === "skySanctum" ? "boss" : screen === SCREEN.INTERIOR && ["village", "town", "castle", "artisanVillage", "manabiVillage", "nazoVillage", "catVillage", "underground", "southShrine", "shipReef", "skySanctum"].includes(interiorType || "") ? "town" : screen === SCREEN.INTERIOR && (interiorType === "cave" || interiorType === "catCave") ? null : "field";
      if (scene) startBgm(scene);
    };
    document.addEventListener("visibilitychange", resumeAudio);
    window.addEventListener("pageshow", resumeAudio);
    return () => {
      document.removeEventListener("visibilitychange", resumeAudio);
      window.removeEventListener("pageshow", resumeAudio);
    };
  }, [player, screen, interiorType, isBoss, startBgm]);

  // ボタン押下時に「ぴこ音」と押し込み打感を追加
  useEffect(() => {
    const frame = gameFrameRef.current;
    if (!frame) return undefined;
    const onPointerDown = e => {
      const button = e.target?.closest?.("button:not(:disabled)");
      if (!button || !frame.contains(button)) return;
      const isPrimary = button.textContent?.trim() === "A" || button.textContent?.trim() === "START";
      playUiClick(!!isPrimary);
      button.classList.add("btn-pressed");
      setTimeout(() => button.classList.remove("btn-pressed"), 90);
    };
    frame.addEventListener("pointerdown", onPointerDown, {
      passive: true
    });
    return () => frame.removeEventListener("pointerdown", onPointerDown);
  }, [playUiClick]);
  const handleLose = useCallback(() => {
    if (gameOverSfxLockRef.current) return;
    gameOverSfxLockRef.current = true;
    stopBgm();
    playGameOver();
    setScreen(SCREEN.GAMEOVER);
  }, [playGameOver, stopBgm]);
  const handleFlee = useCallback(() => {
    startBgm("field");
    setScreen(SCREEN.MAP);
  }, [startBgm]);
  const startGame = () => {
    startBgm("field");
    setScreen(SCREEN.NAME);
  };
  const handleNameConfirm = name => {
    setTempName(name);
    setScreen(SCREEN.GENDER);
  };
  const handleGenderConfirm = gender => {
    setPlayer(makePlayer(tempName, gender));
    setScreen(SCREEN.PROLOGUE);
  };
  const handlePrologueDone = () => {
    setPlayer(p => {
      const v = new Set();
      v.add(`${p.pos.y},${p.pos.x}`);
      return {
        ...p,
        visited: v
      };
    });
    setScreen(SCREEN.MAP);
  };
  const handleMove = (dx, dy) => {
    const now = performance.now();
    if (now - moveLockRef.current < 50) return;
    moveLockRef.current = now;
    setPlayer(prev => {
      const nx = wrapCoord(prev.pos.x + dx, MAP_SIZE);
      const ny = wrapCoord(prev.pos.y + dy, MAP_SIZE);
      const dir = dx === 1 ? "right" : dx === -1 ? "left" : dy === -1 ? "up" : "down";
      const tile = MAP_GRID[ny][nx];
      if (!canEnterWorldTile(tile, prev)) {
        const hint = movementBlockMessage(tile, prev);
        const nowTs = Date.now();
        if (hint && nowTs - moveHintLockRef.current > 1200) {
          moveHintLockRef.current = nowTs;
          setPendingMsg(hint);
        }
        return {
          ...prev,
          direction: dir
        };
      }
      const newVisited = new Set(prev.visited);
      newVisited.add(`${ny},${nx}`);
      let moved = {
        ...prev,
        pos: {
          x: nx,
          y: ny
        },
        visited: newVisited,
        direction: dir,
        animStep: prev.animStep + 1
      };

      // DQ式エンカウント（歩数カウントダウン）
      if ([TILE.GRASS, TILE.FOREST, TILE.DESERT, TILE.MOUNTAIN, TILE.SNOW].includes(tile)) {
        const newCounter = moved.encounterCounter - 1;
        if (newCounter <= 0) {
          const enemy = getEnemyForZone(tile, {
            x: nx,
            y: ny
          }, timeOfDay === "night");
          const tuned = tuneEnemyForPhase(enemy, moved, {
            isBoss: false,
            tile
          });
          setTimeout(() => {
            setCurrentEnemy(tuned);
            setIsBoss(false);
            setScreen(SCREEN.BATTLE);
          }, 100);
          moved = {
            ...moved,
            encounterCounter: getEncounterCounterForPlayer(moved)
          };
        } else {
          moved = {
            ...moved,
            encounterCounter: newCounter
          };
        }
      }
      return moved;
    });
  };
  const handleInvestigate = () => {
    if (!player) return;
    const key = `${player.pos.y},${player.pos.x}`;
    if (!hasOwn(LOCATION_EVENTS, key)) return;
    const mapEvent = LOCATION_EVENTS[key];
    if (mapEvent?.rewardFlag && hasStoryFlag(player, mapEvent.rewardFlag)) {
      const revisitHintByFlag = {
        "story:airshipUnlocked": "飛行船は　いつでも　君の合図を待っている。",
        "story:shipUnlocked": "船は　いつでも　桟橋で待っている。",
        "story:reefArrival": "潮騒が　静かに　帰りを歓迎している。",
        "story:skyArrival": "祠の風鈴が　再訪を祝うように鳴っている。"
      };
      setCurrentEvent({
        messages: ["すでに　この地の力は　受け取っている。", revisitHintByFlag[mapEvent.rewardFlag] || "静かな気配が　旅人を見守っている。"]
      });
      setScreen(SCREEN.EVENT);
      return;
    }
    if (mapEvent?.requireStoryFlag && !hasStoryFlag(player, mapEvent.requireStoryFlag)) {
      const guide = mapEvent.requireStoryFlag === "story:shipUnlocked" ? "まずは海鳴りの船着き場で船を受け取ろう。" : mapEvent.requireStoryFlag === "story:airshipUnlocked" ? "3つのあかしを集め、飛行船ドックで空への道を開こう。" : "王城で使命を受け、3つのあかしを集めてから来よう。";
      setCurrentEvent({
        messages: ["まだ　準備が足りないようだ。", guide]
      });
      setScreen(SCREEN.EVENT);
      return;
    }
    if (Array.isArray(mapEvent?.requireItems) && mapEvent.requireItems.some(itemId => !hasBagItem(player, itemId))) {
      setCurrentEvent({
        messages: ["古い装置が　反応しない……。", "3つのあかしを　そろえる必要がありそうだ。", "まなびの村・謎の村・猫の村を巡ってみよう。"]
      });
      setScreen(SCREEN.EVENT);
      return;
    }
    const caveKey = `${SPECIAL_POS.cave.y},${SPECIAL_POS.cave.x}`;
    if (key === caveKey) {
      if (!hasStoryFlag(player, "story:airshipUnlocked")) {
        setCurrentEvent({
          messages: ["洞窟の周囲は　山脈に囲まれている。", "飛行船がなければ　この先へは進めない。", "風読みの飛行船ドックで　空への道を開こう。"]
        });
        setScreen(SCREEN.EVENT);
        return;
      }
      if (!hasStoryFlag(player, "story:royalQuest")) {
        setCurrentEvent({
          messages: ["洞窟の入口に　重い封印がかかっている。", "王城で使命を受けてからでなければ　進めないようだ。"]
        });
        setScreen(SCREEN.EVENT);
        return;
      }
      const KEY_ITEMS = ["manabi_proof", "ancient_key", "dragon_scale"];
      const ITEM_NAMES = {
        manabi_proof: "まなびのあかし",
        ancient_key: "ふるびたかぎ",
        dragon_scale: "ドラゴンのウロコ"
      };
      const bag = player.bag || [];
      const missing = KEY_ITEMS.filter(id => !bag.some(i => i.id === id && i.count > 0));
      if (missing.length > 0) {
        setCurrentEvent({
          messages: ["なにかが　この先を　阻んでいる……", "3つの　あかしを　集めなければ　入れない。", `まだ　持っていない：${missing.map(id => ITEM_NAMES[id]).join("・")}`]
        });
        setScreen(SCREEN.EVENT);
        return;
      }
    }
    setCurrentEvent(mapEvent);
    setScreen(SCREEN.EVENT);
  };
  const handleEventDone = () => {
    const ev = currentEvent;
    setCurrentEvent(null);
    if (!ev) {
      setScreen(SCREEN.MAP);
      return;
    }
    if (hasOwn(ev, "heal")) setPlayer(p => ({
      ...p,
      hp: p.maxHp,
      mp: p.maxMp
    }));
    if (hasOwn(ev, "buff")) setPlayer(p => ({
      ...p,
      atk: p.atk + ev.buff.val
    }));
    if (hasOwn(ev, "rewardFlag")) {
      setPlayer(p => {
        if (!p) return p;
        const flags = p.storyFlags || [];
        if (flags.includes(ev.rewardFlag)) return p;
        return {
          ...p,
          storyFlags: [...flags, ev.rewardFlag]
        };
      });
    }
    if (hasOwn(ev, "save")) saveGame();
    if (hasOwn(ev, "gotoEnding")) {
      setScreen(SCREEN.ENDING);
      return;
    }
    if (hasOwn(ev, "interior")) {
      setInteriorType(ev.interior);
      setScreen(SCREEN.INTERIOR);
      return;
    }
    if (hasOwn(ev, "boss")) {
      setCurrentEnemy(tuneEnemyForPhase(BOSS_ENEMY, player, {
        isBoss: true
      }));
      setIsBoss(true);
      setScreen(SCREEN.BATTLE);
      return;
    }
    setScreen(SCREEN.MAP);
  };
  const handleBuy = item => {
    setPlayer(p => {
      if (p.gold < item.cost) return p;
      if (item.type === "item") {
        const bag = [...(p.bag || [])];
        const total = bag.reduce((s, i) => s + i.count, 0);
        if (total >= 9) return p;
        const matched = bag.find(i => i.id === item.id);
        const itemData = ITEMS[item.id];
        if (matched) matched.count += 1;else bag.push({
          id: item.id,
          name: itemData.name,
          heal: itemData.heal,
          curePoison: !!itemData.curePoison,
          count: 1
        });
        return {
          ...p,
          gold: p.gold - item.cost,
          bag: sortBagItems(bag)
        };
      }
      // 装備：スロット交換（旧装備との差分だけatk/defを変化）
      const slot = item.slot;
      const oldId = (p.equip ?? {})[slot];
      if (oldId === item.id) return p; // すでに装備中
      const oldItem = oldId ? EQUIP_DICT[oldId] : null;
      const atkDiff = item.atkBonus - (oldItem?.atkBonus ?? 0);
      const defDiff = item.defBonus - (oldItem?.defBonus ?? 0);
      return {
        ...p,
        gold: p.gold - item.cost,
        atk: p.atk + atkDiff,
        def: p.def + defDiff,
        equip: {
          ...(p.equip ?? {}),
          [slot]: item.id
        }
      };
    });
  };
  const handleOpenTreasure = useCallback(treasure => {
    let messages = ["宝箱を　あけた。"];
    setPlayer(prev => {
      if (!prev) return prev;
      const opened = new Set(prev.openedChests || []);
      if (opened.has(treasure.id)) {
        messages = ["宝箱は　からっぽだった。"];
        return prev;
      }
      opened.add(treasure.id);
      let next = {
        ...prev,
        openedChests: [...opened]
      };
      if (treasure.gold) next = {
        ...next,
        gold: next.gold + treasure.gold
      };
      if (treasure.itemId) {
        const bag = [...(next.bag || [])];
        const itemData = ITEMS[treasure.itemId];
        const matched = bag.find(i => i.id === treasure.itemId);
        if (matched) matched.count += treasure.amount || 1;else if (itemData) bag.push({
          id: treasure.itemId,
          name: itemData.name,
          heal: itemData.heal,
          curePoison: !!itemData.curePoison,
          count: treasure.amount || 1
        });
        next = {
          ...next,
          bag: sortBagItems(bag)
        };
      }
      messages = treasure.messages || messages;
      return next;
    });
    return {
      messages
    };
  }, []);
  const handleWin = ({
    exp,
    gold,
    pHp,
    pMp
  }) => {
    let dropMsg = null;
    let levelUpInfo = null;
    setPlayer(prev => {
      let updated = {
        ...prev,
        hp: pHp,
        mp: pMp,
        exp: prev.exp + exp,
        gold: prev.gold + gold
      };
      const dr = currentEnemy.drop;
      if (dr && Math.random() < dr.rate) {
        const itemData = ITEMS[dr.id];
        const bag = [...(updated.bag || [])];
        const total = bag.reduce((s, i) => s + i.count, 0);
        const allowOverCapacity = dr.id === "neko_konnyaku";
        if ((total < 9 || allowOverCapacity) && itemData) {
          const matched = bag.find(i => i.id === dr.id);
          if (matched) matched.count += 1;else bag.push({
            id: dr.id,
            name: itemData.name,
            heal: itemData.heal,
            curePoison: !!itemData.curePoison,
            count: 1
          });
          updated = {
            ...updated,
            bag: sortBagItems(bag)
          };
          dropMsg = `${itemData.name}を　てにいれた！`;
        }
      }
      const prevLevel = updated.level;
      updated = checkLevelUp(updated);
      if (updated.level > prevLevel) {
        const learnedSpells = getSpellsLearnedBetweenLevels(prevLevel, updated.level, updated.nazoSpellLearned).map(spell => spell.name);
        levelUpInfo = {
          name: updated.name,
          level: updated.level,
          learnedSpells
        };
      }
      if (isBoss) {
        const flags = updated.storyFlags || [];
        if (!flags.includes("story:drangoDefeated")) {
          updated = {
            ...updated,
            storyFlags: [...flags, "story:drangoDefeated"]
          };
        }
      } else {
        // 3連戦で崩れにくいよう、勝利後に小回復
        const recoverHp = Math.max(2, Math.floor(updated.maxHp * 0.10));
        const recoverMp = 1;
        updated = {
          ...updated,
          hp: Math.min(updated.maxHp, updated.hp + recoverHp),
          mp: Math.min(updated.maxMp, updated.mp + recoverMp)
        };
      }
      return updated;
    });
    if (isBoss) {
      const hasSecretTitle = (player?.storyFlags || []).includes("story:titleStarlight");
      setCurrentEvent({
        name: "決着",
        mood: "hope",
        gotoEnding: true,
        messages: hasSecretTitle ? ["ドランゴは　崩れ落ちた……。", "闇がほどけ、世界に　朝の光が戻ってくる。", "遠くの港で　船鐘が鳴り、雲上では　祠の鈴が応えた。", "村々に　灯りが戻り、子どもたちの笑い声が　風に広がる。", "『星あかりの冒険者』の名が、遠くで語られはじめた。"] : ["ドランゴは　崩れ落ちた……。", "長い夜が終わり、世界に　朝の光が戻ってくる。", "遠くの港で　船鐘が鳴り、雲上では　祠の鈴が応えた。", "村々に　灯りが戻り、子どもたちの笑い声が　風に広がる。", "旅人の一歩が　この国の夜明けになった。"]
      });
      setScreen(SCREEN.EVENT);
      return;
    }
    const msgs = [`${currentEnemy.name}を　たおした！`, `けいけんちを ${exp}　手に入れた！`, `${gold}ゴールドを　もらった！`];
    msgs.push("深呼吸して　体勢を立て直した。（HP少し回復 / MP+1）");
    if (dropMsg) msgs.push(dropMsg);
    if (levelUpInfo) {
      msgs.push(`🌟 ${levelUpInfo.name}の　レベルが　あがった！`);
      msgs.push(`　★ レベル ${levelUpInfo.level} に　なった！`);
      msgs.push(`HP・MP・こうげきが　上がった！`);
      if (levelUpInfo.learnedSpells && levelUpInfo.learnedSpells.length > 0) {
        levelUpInfo.learnedSpells.forEach(spellName => {
          msgs.push(`✨ あたらしい　じゅもん「${spellName}」を　おぼえた！`);
        });
      }
      setTimeout(() => playLevelUpSound(), 100);
    }
    setPendingMsg(msgs);
    setScreen(SCREEN.MAP);
  };
  useEffect(() => {
    if (pendingMsg) setShowPending(true);
  }, [pendingMsg]);
  const handleWarp = useCallback(pos => {
    setPlayer(prev => {
      if (!prev) return prev;
      const visited = new Set(prev.visited || []);
      visited.add(`${pos.y},${pos.x}`);
      return {
        ...prev,
        pos: {
          x: pos.x,
          y: pos.y
        },
        visited
      };
    });
    setInteriorType(null);
    setScreen(SCREEN.MAP);
    setShowInfo(false);
    setPendingMsg([`${pos.x},${pos.y}へ　しるべ移動した！`]);
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    className: "relative flex items-center justify-center min-h-screen bg-gray-900",
    style: {
      paddingTop: "env(safe-area-inset-top)",
      paddingRight: "env(safe-area-inset-right)",
      paddingBottom: "env(safe-area-inset-bottom)",
      paddingLeft: "env(safe-area-inset-left)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    ref: gameFrameRef,
    className: "relative w-full bg-black overflow-hidden touch-manipulation game-frame",
    style: {
      maxWidth: 390,
      maxHeight: 720,
      border: "2px solid #444"
    }
  }, screen === SCREEN.TITLE && /*#__PURE__*/React.createElement(TitleScreen, {
    onStart: startGame,
    hasSave: hasSave && assetsReady,
    onContinue: continueGame
  }), screen === SCREEN.NAME && /*#__PURE__*/React.createElement(NameInput, {
    onConfirm: handleNameConfirm
  }), screen === SCREEN.GENDER && /*#__PURE__*/React.createElement(GenderScreen, {
    playerName: tempName,
    onConfirm: handleGenderConfirm
  }), screen === SCREEN.PROLOGUE && /*#__PURE__*/React.createElement(PrologueScreen, {
    playerName: player?.name,
    onDone: handlePrologueDone
  }), screen === SCREEN.MAP && player && /*#__PURE__*/React.createElement(MapScreen, {
    player: player,
    onMove: handleMove,
    onInvestigate: handleInvestigate,
    onInfo: () => setShowInfo(true),
    onQuickSave: saveGame,
    timeOfDay: timeOfDay
  }), screen === SCREEN.INTERIOR && player && interiorType && /*#__PURE__*/React.createElement(InteriorMapScreen, {
    interiorType: interiorType,
    player: player,
    onHeal: healData => setPlayer(p => {
      if (!p) return p;
      const amount = typeof healData === "number" ? healData : Number(healData?.amount || 0);
      const fullRecovery = typeof healData === "object" && !!healData?.fullRecovery;
      if (fullRecovery) return {
        ...p,
        hp: p.maxHp,
        mp: p.maxMp
      };
      return {
        ...p,
        hp: Math.min(p.maxHp, p.hp + amount)
      };
    }),
    onBuff: buff => setPlayer(p => ({
      ...p,
      atk: p.atk + (buff.val || 0)
    })),
    onExit: () => setScreen(SCREEN.MAP),
    onInfo: () => setShowInfo(true),
    onBoss: () => {
      setCurrentEnemy(tuneEnemyForPhase(BOSS_ENEMY, player, {
        isBoss: true
      }));
      setIsBoss(true);
      setScreen(SCREEN.BATTLE);
    },
    onEnemyBattle: enemyId => {
      const baseEnemy = ENEMY_BY_ID[enemyId];
      if (!baseEnemy) return;
      setCurrentEnemy(tuneEnemyForPhase(baseEnemy, player, {
        isBoss: false
      }));
      setIsBoss(false);
      setScreen(SCREEN.BATTLE);
    },
    onBuy: handleBuy,
    onOpenTreasure: handleOpenTreasure,
    onFlag: flagKey => setPlayer(p => {
      if (!p) return p;
      if (String(flagKey).startsWith("story:")) {
        const flags = p.storyFlags ?? [];
        if (flags.includes(flagKey)) return p;
        return {
          ...p,
          storyFlags: [...flags, flagKey]
        };
      }
      const flags = p.nazoFlags ?? [];
      if (flags.includes(flagKey)) return p;
      return {
        ...p,
        nazoFlags: [...flags, flagKey]
      };
    }),
    onLearnSpell: () => setPlayer(p => ({
      ...p,
      nazoSpellLearned: true
    })),
    onGiveItem: itemId => {
      if (!itemId) return;
      setPlayer(p => {
        if (!p) return p;
        const itemData = ITEMS[itemId];
        if (!itemData) return p;
        const bag = [...(p.bag || [])];
        if (bag.some(i => i.id === itemId)) return p;
        bag.push({
          id: itemId,
          name: itemData.name,
          heal: 0,
          count: 1
        });
        return {
          ...p,
          bag: sortBagItems(bag)
        };
      });
      playKeyItemSound();
    }
  }), screen === SCREEN.EVENT && currentEvent && /*#__PURE__*/React.createElement(EventScreen, {
    event: currentEvent,
    player: player,
    onDone: handleEventDone
  }), screen === SCREEN.BATTLE && currentEnemy && player && /*#__PURE__*/React.createElement(BattleScreen, {
    key: currentEnemy.id,
    player: player,
    enemy: currentEnemy,
    isBoss: isBoss,
    onWin: handleWin,
    onLose: handleLose,
    onFlee: handleFlee,
    onUseItem: itemId => setPlayer(p => {
      const bag = [...(p.bag || [])];
      const idx = bag.findIndex(i => i.id === itemId);
      if (idx < 0) return p;
      if (bag[idx].count <= 1) bag.splice(idx, 1);else bag[idx] = {
        ...bag[idx],
        count: bag[idx].count - 1
      };
      return {
        ...p,
        bag
      };
    })
  }), screen === SCREEN.GAMEOVER && /*#__PURE__*/React.createElement(GameOverScreen, {
    onRetry: hasSave ? continueGame : () => {
      setPlayer(null);
      setScreen(SCREEN.TITLE);
    }
  }), screen === SCREEN.ENDING && player && /*#__PURE__*/React.createElement(EndingScreen, {
    player: player
  }), showInfo && player && /*#__PURE__*/React.createElement(InfoOverlay, {
    player: player,
    onClose: () => setShowInfo(false),
    onSave: saveGame,
    onWarp: handleWarp,
    onUseRecorder: pos => {
      const KEY_ITEMS = ["manabi_proof", "ancient_key", "dragon_scale"];
      const bag = player.bag || [];
      const missing = KEY_ITEMS.filter(id => !bag.some(i => i.id === id && i.count > 0));
      const hasCat = bag.some(i => i.id === "dragon_scale" && i.count > 0);
      let msgs;
      if (missing.length === 0) {
        msgs = ["リコーダーをふいた……", "♪ ……", "音は何も導かない。", "必要なものは　すべて　集まっている。"];
        if (hasCat) msgs.push("……猫のともだちが　うれしそうに　鳴いた。　にゃ！");
      } else {
        msgs = ["リコーダーをふいた……", "♪ ……"];
        missing.forEach(itemId => msgs.push(getRecorderHint(pos, itemId)));
        if (hasCat) msgs.push("……猫のともだちが　一緒に　耳を澄ませている。");
      }
      setShowInfo(false);
      setPendingMsg(msgs);
    }
  }), showPending && pendingMsg && /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 flex items-end justify-center bg-black/80 p-4 z-40"
  }, /*#__PURE__*/React.createElement(MessageBox, {
    lines: pendingMsg,
    onNext: () => {
      setShowPending(false);
      setPendingMsg(null);
    }
  }))));
}
const root = ReactDOM.createRoot(document.getElementById("app"));
root.render(/*#__PURE__*/React.createElement(App, null));
