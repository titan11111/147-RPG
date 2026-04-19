// ─── APP ─────────────────────────────────────────────────────────────────────
function App() {
  const [screen, setScreen]           = useState(SCREEN.TITLE);
  const [player, setPlayer]           = useState(null);
  const [tempName, setTempName]       = useState("");
  const [currentEvent, setCurrentEvent] = useState(null);
  const [currentEnemy, setCurrentEnemy] = useState(null);
  const [isBoss, setIsBoss]           = useState(false);
  const [showInfo, setShowInfo]       = useState(false);
  const [pendingMsg, setPendingMsg]   = useState(null);
  const [showPending, setShowPending] = useState(false);
  const [interiorType, setInteriorType] = useState(null);
  const [hasSave, setHasSave]         = useState(false);
  const [assetsReady, setAssetsReady] = useState(false);
  const gameFrameRef = useRef(null);
  const audioCtxRef  = useRef(null);
  const moveLockRef  = useRef(0);
  const bgmModeRef   = useRef("");
  const bgmTrackRef  = useRef("");
  const bgmCycleRef  = useRef({ field: 0, town: 0, battle: 0 });
  const bgmAudioMapRef = useRef({});
  const currentBgmRef = useRef(null);
  const hasOwn = useCallback((obj, key) => Object.prototype.hasOwnProperty.call(obj, key), []);

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
      try { if (mounted) setHasSave(!!localStorage.getItem(SAVE_KEY)); } catch (_) {}
    };
    initRuntime();
    return () => { mounted = false; };
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
        bag: sortBagItems(player.bag || []),
      }));
      setHasSave(true);
      setPendingMsg(["セーブしました！"]);
    } catch (e) {
      setPendingMsg(["セーブできませんでした。", "（プライベートモードでは保存できません）"]);
    }
    setShowInfo(false);
  }, [player]);

  // タッチスクロール防止
  useEffect(() => {
    let lastTouchEnd = 0;
    const onTE = (e) => { const now = Date.now(); if (now - lastTouchEnd <= 300) e.preventDefault(); lastTouchEnd = now; };
    const onTM = (e) => { if (gameFrameRef.current?.contains(e.target)) e.preventDefault(); };
    document.addEventListener("touchstart", onTM, { passive: false });
    document.addEventListener("touchend", onTE, { passive: false });
    document.addEventListener("touchmove", onTM, { passive: false });
    return () => {
      document.removeEventListener("touchstart", onTM);
      document.removeEventListener("touchend", onTE);
      document.removeEventListener("touchmove", onTM);
    };
  }, []);

  const BGM_LIBRARY = useMemo(() => ({
    fieldA:  "./bgm-field.mp3",
    townA:   "./bgm-town.mp3",
    battleA: "./bgm-battle.mp3",
    bossA:   "./bgm-boss.mp3",
  }), []);
  const BGM_SCENES = useMemo(() => ({
    field:  ["fieldA"],
    town:   ["townA"],
    battle: ["battleA"],
    boss:   ["bossA"],
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
      Object.values(map).forEach((audio) => {
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
      if (["village", "town", "castle", "manabiVillage", "nazoVillage", "catVillage"].includes(interiorType || "")) {
        startBgm("town");
        return;
      }
      if (interiorType === "cave") {
        stopBgm();
        return;
      }
    }
    if (screen === SCREEN.MAP) {
      startBgm("field");
    }
  }, [screen, interiorType, isBoss, hasPlayer, startBgm, stopBgm]);

  useEffect(() => () => stopBgm(), [stopBgm]);

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
      const scene = screen === SCREEN.BATTLE
        ? (isBoss ? "boss" : "battle")
        : (screen === SCREEN.INTERIOR && ["village", "town", "castle", "manabiVillage", "nazoVillage", "catVillage"].includes(interiorType || ""))
          ? "town"
          : (screen === SCREEN.INTERIOR && interiorType === "cave")
            ? null
            : "field";
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
    const onPointerDown = (e) => {
      const button = e.target?.closest?.("button:not(:disabled)");
      if (!button || !frame.contains(button)) return;
      const isPrimary = button.textContent?.trim() === "A" || button.textContent?.trim() === "START";
      playUiClick(!!isPrimary);
      button.classList.add("btn-pressed");
      setTimeout(() => button.classList.remove("btn-pressed"), 90);
    };
    frame.addEventListener("pointerdown", onPointerDown, { passive: true });
    return () => frame.removeEventListener("pointerdown", onPointerDown);
  }, [playUiClick]);

  const handleLose = useCallback(() => { stopBgm(); setScreen(SCREEN.GAMEOVER); }, [stopBgm]);
  const handleFlee = useCallback(() => { startBgm("field"); setScreen(SCREEN.MAP); }, [startBgm]);

  const startGame = () => { startBgm("field"); setScreen(SCREEN.NAME); };

  const handleNameConfirm = (name) => { setTempName(name); setScreen(SCREEN.GENDER); };

  const handleGenderConfirm = (gender) => {
    setPlayer(makePlayer(tempName, gender));
    setScreen(SCREEN.PROLOGUE);
  };

  const handlePrologueDone = () => {
    setPlayer(p => {
      const v = new Set();
      v.add(`${Math.floor(MAP_SIZE/2)},${Math.floor(MAP_SIZE/2)}`);
      return { ...p, visited: v };
    });
    setScreen(SCREEN.MAP);
  };

  const handleMove = (dx, dy) => {
    const now = performance.now();
    if (now - moveLockRef.current < 70) return;
    moveLockRef.current = now;
    setPlayer(prev => {
      const nx = clamp(prev.pos.x + dx, 0, MAP_SIZE - 1);
      const ny = clamp(prev.pos.y + dy, 0, MAP_SIZE - 1);

      const dir =
        dx ===  1 ? "right" : dx === -1 ? "left" :
        dy === -1 ? "up"    : "down";

      const tile = MAP_GRID[ny][nx];
      if ([TILE.SEA, TILE.LAKE].includes(tile)) return { ...prev, direction: dir };

      const newVisited = new Set(prev.visited);
      newVisited.add(`${ny},${nx}`);
      let moved = { ...prev, pos: { x: nx, y: ny }, visited: newVisited, direction: dir, animStep: prev.animStep + 1 };

      // DQ式エンカウント（歩数カウントダウン）
      if ([TILE.GRASS, TILE.FOREST, TILE.DESERT, TILE.MOUNTAIN].includes(tile)) {
        const newCounter = moved.encounterCounter - 1;
        if (newCounter <= 0) {
          const enemy = getEnemyForZone(tile, { x: nx, y: ny });
          setTimeout(() => { setCurrentEnemy(enemy); setIsBoss(false); setScreen(SCREEN.BATTLE); }, 100);
          moved = { ...moved, encounterCounter: getEncounterCounter() };
        } else {
          moved = { ...moved, encounterCounter: newCounter };
        }
      }
      return moved;
    });
  };

  const handleInvestigate = () => {
    if (!player) return;
    const key = `${player.pos.y},${player.pos.x}`;
    if (!hasOwn(LOCATION_EVENTS, key)) return;
    setCurrentEvent(LOCATION_EVENTS[key]);
    setScreen(SCREEN.EVENT);
  };

  const handleEventDone = () => {
    const ev = currentEvent;
    setCurrentEvent(null);
    if (!ev) {
      setScreen(SCREEN.MAP);
      return;
    }
    if (hasOwn(ev, "heal"))     setPlayer(p => ({ ...p, hp: p.maxHp, mp: p.maxMp }));
    if (hasOwn(ev, "buff"))     setPlayer(p => ({ ...p, atk: p.atk + ev.buff.val }));
    if (hasOwn(ev, "interior")) { setInteriorType(ev.interior); setScreen(SCREEN.INTERIOR); return; }
    if (hasOwn(ev, "boss"))     { setCurrentEnemy(BOSS_ENEMY); setIsBoss(true); setScreen(SCREEN.BATTLE); return; }
    setScreen(SCREEN.MAP);
  };

  const handleBuy = (item) => {
    setPlayer(p => {
      if (p.gold < item.cost) return p;
      if (item.type === "item") {
        const bag = [...(p.bag || [])];
        const total = bag.reduce((s, i) => s + i.count, 0);
        if (total >= 9) return p;
        const matched = bag.find(i => i.id === item.id);
        const itemData = ITEMS[item.id];
        if (matched) matched.count += 1;
        else bag.push({ id:item.id, name:itemData.name, heal:itemData.heal, curePoison: !!itemData.curePoison, count:1 });
        return { ...p, gold: p.gold - item.cost, bag: sortBagItems(bag) };
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
        equip: { ...(p.equip ?? {}), [slot]: item.id },
      };
    });
  };

  const handleOpenTreasure = useCallback((treasure) => {
    let messages = ["宝箱を　あけた。"];
    setPlayer((prev) => {
      if (!prev) return prev;
      const opened = new Set(prev.openedChests || []);
      if (opened.has(treasure.id)) {
        messages = ["宝箱は　からっぽだった。"];
        return prev;
      }
      opened.add(treasure.id);
      let next = { ...prev, openedChests: [...opened] };
      if (treasure.gold) next = { ...next, gold: next.gold + treasure.gold };
      if (treasure.itemId) {
        const bag = [...(next.bag || [])];
        const itemData = ITEMS[treasure.itemId];
        const matched = bag.find((i) => i.id === treasure.itemId);
        if (matched) matched.count += (treasure.amount || 1);
        else if (itemData) bag.push({ id: treasure.itemId, name: itemData.name, heal: itemData.heal, curePoison: !!itemData.curePoison, count: treasure.amount || 1 });
        next = { ...next, bag: sortBagItems(bag) };
      }
      messages = treasure.messages || messages;
      return next;
    });
    return { messages };
  }, []);

  const handleWin = ({ exp, gold, pHp, pMp }) => {
    let dropMsg = null;
    setPlayer(prev => {
      let updated = { ...prev, hp: pHp, mp: pMp, exp: prev.exp + exp, gold: prev.gold + gold };
      const dr = currentEnemy.drop;
      if (dr && Math.random() < dr.rate) {
        const itemData = ITEMS[dr.id];
        const bag = [...(updated.bag || [])];
        const total = bag.reduce((s, i) => s + i.count, 0);
        if (total < 9 && itemData) {
          const matched = bag.find(i => i.id === dr.id);
          if (matched) matched.count += 1;
          else bag.push({ id:dr.id, name:itemData.name, heal:itemData.heal, curePoison: !!itemData.curePoison, count:1 });
          updated = { ...updated, bag: sortBagItems(bag) };
          dropMsg = `${itemData.name}を　てにいれた！`;
        }
      }
      updated = checkLevelUp(updated);
      return updated;
    });
    if (isBoss) { setScreen(SCREEN.ENDING); return; }
    const msgs = [`${currentEnemy.name}を　たおした！`, `けいけんちを ${exp}　手に入れた！`, `${gold}ゴールドを　もらった！`];
    if (dropMsg) msgs.push(dropMsg);
    setPendingMsg(msgs);
    setScreen(SCREEN.MAP);
  };

  useEffect(() => { if (pendingMsg) setShowPending(true); }, [pendingMsg]);

  const handleWarp = useCallback((pos) => {
    setPlayer((prev) => {
      if (!prev) return prev;
      const visited = new Set(prev.visited || []);
      visited.add(`${pos.y},${pos.x}`);
      return { ...prev, pos: { x: pos.x, y: pos.y }, visited };
    });
    setInteriorType(null);
    setScreen(SCREEN.MAP);
    setShowInfo(false);
    setPendingMsg([`${pos.x},${pos.y}へ　ルーラした！`]);
  }, []);

  return (
    <div
      className="relative flex items-center justify-center min-h-screen bg-gray-900"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingRight: "env(safe-area-inset-right)",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
      }}
    >
      <div ref={gameFrameRef}
        className="relative w-full bg-black overflow-hidden touch-manipulation game-frame"
        style={{ maxWidth:390, maxHeight:720, border:"2px solid #444" }}>

        {screen === SCREEN.TITLE    && <TitleScreen onStart={startGame} hasSave={hasSave && assetsReady} onContinue={continueGame} />}
        {screen === SCREEN.NAME     && <NameInput onConfirm={handleNameConfirm} />}
        {screen === SCREEN.GENDER   && <GenderScreen playerName={tempName} onConfirm={handleGenderConfirm} />}
        {screen === SCREEN.PROLOGUE && <PrologueScreen playerName={player?.name} onDone={handlePrologueDone} />}
        {screen === SCREEN.MAP      && player && (
          <MapScreen player={player} onMove={handleMove} onInvestigate={handleInvestigate} onInfo={() => setShowInfo(true)} />
        )}
        {screen === SCREEN.INTERIOR && player && interiorType && (
          <InteriorMapScreen
            interiorType={interiorType}
            player={player}
            onHeal={amt => setPlayer(p => ({ ...p, hp: Math.min(p.maxHp, p.hp + amt) }))}
            onBuff={buff => setPlayer(p => ({ ...p, atk: p.atk + (buff.val || 0) }))}
            onExit={() => setScreen(SCREEN.MAP)}
            onInfo={() => setShowInfo(true)}
            onBoss={() => { setCurrentEnemy(BOSS_ENEMY); setIsBoss(true); setScreen(SCREEN.BATTLE); }}
            onBuy={handleBuy}
            onOpenTreasure={handleOpenTreasure}
            onFlag={flagKey => setPlayer(p => {
              if (!p) return p;
              if (String(flagKey).startsWith("story:")) {
                const flags = p.storyFlags ?? [];
                if (flags.includes(flagKey)) return p;
                return { ...p, storyFlags: [...flags, flagKey] };
              }
              const flags = p.nazoFlags ?? [];
              if (flags.includes(flagKey)) return p;
              return { ...p, nazoFlags: [...flags, flagKey] };
            })}
            onLearnSpell={() => setPlayer(p => ({ ...p, nazoSpellLearned: true }))}
          />
        )}
        {screen === SCREEN.EVENT    && currentEvent && (
          <EventScreen event={currentEvent} player={player} onDone={handleEventDone} />
        )}
        {screen === SCREEN.BATTLE   && currentEnemy && player && (
          <BattleScreen key={currentEnemy.id} player={player} enemy={currentEnemy} isBoss={isBoss}
            onWin={handleWin} onLose={handleLose} onFlee={handleFlee}
            onUseItem={(itemId) => setPlayer(p => {
              const bag = [...(p.bag || [])];
              const idx = bag.findIndex(i => i.id === itemId);
              if (idx < 0) return p;
              if (bag[idx].count <= 1) bag.splice(idx, 1);
              else bag[idx] = { ...bag[idx], count: bag[idx].count - 1 };
              return { ...p, bag };
            })} />
        )}
        {screen === SCREEN.GAMEOVER && <GameOverScreen onRetry={hasSave ? continueGame : () => { setPlayer(null); setScreen(SCREEN.TITLE); }} />}
        {screen === SCREEN.ENDING   && player && <EndingScreen player={player} />}

        {showInfo && player && <InfoOverlay player={player} onClose={() => setShowInfo(false)} onSave={saveGame} onWarp={handleWarp} />}
        {showPending && pendingMsg && (
          <div className="absolute inset-0 flex items-end justify-center bg-black/80 p-4 z-40">
            <MessageBox lines={pendingMsg} onNext={() => { setShowPending(false); setPendingMsg(null); }} />
          </div>
        )}
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("app"));
root.render(<App />);
