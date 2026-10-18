import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import {
  CREDITS, COSTS, HIT_ON, applyEmpireLosses, applyRebelLosses, battleOutcome, bombRun, canAdd, cannonFire,
  empireAttack, empireCapacity, empireFighters, hitsOf, allocSuperHits, rebelAttack, rebelCount, spent, wipeEmpireFighters,
  type Die, type EmpireAlloc, type EmpireBuy, type Imperials, type RebelBuy, type Rebels,
} from "./logic";
import { sfx, setMuted, isMuted } from "./sfx";
import { Btn, DiceTray, Panel, ShipIcon, Stepper } from "./ui";
import { DeathStar, Vader } from "./ships";
import { CockpitFrame, FINALE_FLASH, FinaleScene, ShaftView, SpaceDogfight, TrenchPOV } from "./TrenchPOV";
import { Starfield, jumpToHyperspace } from "./Starfield";
import { ShipRow, simpleStates, superStates } from "./fleet";

type Phase = "title" | "briefing" | "buyEmpire" | "buyRebel" | "battle" | "cleared" | "trench" | "finale" | "over";
type Pending = { empireHits: number; rebelHits: number } | null;
type TrenchStep = 1 | 2 | "bomb";
type StartFleet = { xwing: number; ywing: number; tie: number; superTie: number };
type TrenchRecord = { label: string; hits: number; detail: string; xLost?: number; yLost?: number; shots?: number; xHits?: number; xShots?: number; yHits?: number; yShots?: number };
type RoundRecord = {
  round: number; rebelHits: number; empireHits: number;
  xLost: number; yLost: number; tieLost: number; superLost: number; superDamaged: number;
  rebelShots?: number; empireShots?: number;
};

const ROLL_MS = 1100;
const SAVE_KEY = "trench-warfare-save";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loadSave = (): any => { try { return JSON.parse(sessionStorage.getItem(SAVE_KEY) ?? "null"); } catch { return null; } };
export const clearSave = () => { try { sessionStorage.removeItem(SAVE_KEY); } catch { /* ignore */ } };
const plural = (n: number, word: string, many = word + "s") => `${n} ${n === 1 ? word : many}`;
type Reveal = { cards: { side: "rebel" | "empire"; title: string; hits: number; note?: string | undefined }[]; next?: string | undefined; label?: string | undefined; go?: (() => void) | undefined };

export function Game() {
  const sv = useRef(loadSave()).current;
  const [phase, setPhase] = useState<Phase>(sv?.phase ?? "title");
  const [eBuy, setEBuy] = useState<EmpireBuy>(sv?.eBuy ?? { tie: 0, superTie: 0, cannon: 0 });
  const [rBuy, setRBuy] = useState<RebelBuy>(sv?.rBuy ?? { xwing: 0, ywing: 0 });
  const [rebels, setRebels] = useState<Rebels>(sv?.rebels ?? { xwing: 0, ywing: 0 });
  const [empire, setEmpire] = useState<Imperials>(sv?.empire ?? { tie: 0, superHealthy: 0, superDamaged: 0, cannon: 0 });
  const [dice, setDice] = useState<Die[]>([]);
  const [rolling, setRolling] = useState(false);
  const [pending, setPending] = useState<Pending>(sv?.pending ?? null);
  const [round, setRound] = useState<number>(sv?.round ?? 1);
  const [trenchStep, setTrenchStep] = useState<TrenchStep>(sv?.trenchStep ?? 1);
  const [winner, setWinner] = useState<"rebel" | "empire" | null>(sv?.winner ?? null);
  const [log, setLog] = useState<string[]>(sv?.log ?? []);
  const [mute, setMute] = useState(isMuted());
  const [startFleet, setStartFleet] = useState<StartFleet>(sv?.startFleet ?? { xwing: 0, ywing: 0, tie: 0, superTie: 0 });
  const snapRef = useRef<{ r: Rebels; e: Imperials; rebelHits: number; empireHits: number; rebelShots: number; empireShots: number } | null>(null);
  const [history, setHistory] = useState<RoundRecord[]>(sv?.history ?? []);
  const [trenchHist, setTrenchHist] = useState<TrenchRecord[]>(sv?.trenchHist ?? []);
  const trenchBefore = useRef<{ r: Rebels; hits: number; shots: number } | null>(null);
  const [banner, setBanner] = useState<{ id: number; text: string } | null>(null);
  const [shake, setShake] = useState(0);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [finaleShips, setFinaleShips] = useState<("xwing" | "ywing")[]>(sv?.finaleShips ?? []);
  useEffect(() => {
    try {
      sessionStorage.setItem(SAVE_KEY, JSON.stringify({ phase, eBuy, rBuy, rebels, empire, pending, round, trenchStep, winner, log, startFleet, history, trenchHist, finaleShips }));
    } catch { /* storage unavailable */ }
  }, [phase, eBuy, rBuy, rebels, empire, pending, round, trenchStep, winner, log, startFleet, history, trenchHist, finaleShips]);

  const addLog = (s: string) => setLog((l) => [s, ...l].slice(0, 40));
  const showBanner = (text: string, lost: number) => {
    const id = Date.now();
    setBanner({ id, text });
    setTimeout(() => setBanner((b) => (b?.id === id ? null : b)), 3000);
    if (lost >= 3) setShake(id);
  };

  const finish = (w: "rebel" | "empire", msg: string) => {
    setWinner(w);
    addLog(msg);
    setPhase("over");
    if (w === "rebel") { sfx.bigBoom(); setTimeout(sfx.victory, 900); } else sfx.defeat();
  };

  const reset = () => {
    setPhase("title"); setEBuy({ tie: 0, superTie: 0, cannon: 0 }); setRBuy({ xwing: 0, ywing: 0 });
    setDice([]); setPending(null); setReveal(null); setRound(1); setTrenchStep(1); setWinner(null); setLog([]);
    setHistory([]); setTrenchHist([]); snapRef.current = null;
  };

  const startBattle = () => {
    const r = { ...rBuy };
    const e = { tie: eBuy.tie, superHealthy: eBuy.superTie, superDamaged: 0, cannon: eBuy.cannon };
    setRebels(r); setEmpire(e); setDice([]); setReveal(null); setPending(null); setHistory([]); setTrenchHist([]); setRound(1);
    setStartFleet({ xwing: r.xwing, ywing: r.ywing, tie: e.tie, superTie: e.superHealthy });
    if (rebelCount(r) === 0) return finish("empire", "Empire wins — the Rebellion launched no ships.");
    if (e.tie + e.superHealthy === 0) {
      addLog("The Empire has no fighters. Straight to the trench!");
      setDice([]); setTrenchBrief(true); setPhase("trench");
    } else setPhase("battle");
  };

  const doRoll = (make: () => Die[], after: (d: Die[]) => void) => {
    const d = make();
    setDice(d); setRolling(true); sfx.roll();
    setTimeout(() => {
      setRolling(false);
      const hitDice = d.filter((x) => x.hit), gap = Math.min(90, 900 / Math.max(1, hitDice.length));
      // Rebel hits land on the Empire (right), Imperial hits on the Rebels (left).
      hitDice.forEach((x, i) => setTimeout(() => sfx.hitBoom(i, x.side === "rebel" ? 0.5 : -0.5), i * gap));
      after(d);
    }, ROLL_MS);
  };

  // ---- Phase 2 ----
  const battleDone = battleOutcome(rebels, empire) !== "continue";
  const battleRoll = () => {
    if (battleOutcome(rebels, empire) !== "continue") return;
    doRoll(() => [...rebelAttack(rebels), ...empireAttack(empire)], (d) => {
      const empireHits = hitsOf(d.filter((x) => x.side === "rebel"));
      const rebelHits = hitsOf(d.filter((x) => x.side === "empire"));
      snapRef.current = { r: rebels, e: empire, rebelHits: empireHits, empireHits: rebelHits, rebelShots: d.filter((x) => x.side === "rebel").length, empireShots: d.filter((x) => x.side === "empire").length };
      addLog(`Round ${round}: Rebellion scores ${plural(empireHits, "hit")}, Empire scores ${plural(rebelHits, "hit")}.`);
      let e = empire, r = rebels;
      let eHits = empireHits, rHits = rebelHits;
      let boom = false;
      const eWipe = eHits > 0 && eHits >= empireCapacity(e), rWipe = rHits > 0 && rHits >= rebelCount(r);
      if (eHits >= empireCapacity(e)) { if (eHits > 0) { e = wipeEmpireFighters(e); boom = true; } eHits = 0; }
      if (rHits >= rebelCount(r)) { if (rHits > 0) { r = { xwing: 0, ywing: 0 }; boom = true; } rHits = 0; }
      if (r.xwing === 0 && rHits > 0) { r = applyRebelLosses(r, 0, rHits); rHits = 0; }
      if (r.ywing === 0 && rHits > 0) { r = applyRebelLosses(r, rHits, 0); rHits = 0; }
      const steps: string[] = [];
      if (eHits) steps.push(`Empire removes ${plural(eHits, "hit")} from its fighters`);
      if (rHits) steps.push(`${eHits ? "then " : ""}Rebellion removes ${plural(rHits, "hit")} from its ships`);
      setReveal({
        cards: [
          { side: "rebel", title: "Rebellion", hits: empireHits, note: eWipe ? "Every Imperial fighter destroyed!" : undefined },
          { side: "empire", title: "Empire", hits: rebelHits, note: rWipe ? "Every Rebel ship destroyed!" : undefined },
        ],
        next: steps.length ? steps.join(", ") + "." : empireHits + rebelHits === 0 ? "Nobody was hit this round." : "No choices needed.",
        label: steps.length ? "Assign damage" : "Continue",
        go: () => {
          setReveal(null);
          if (boom) sfx.explosion();
          setEmpire(e); setRebels(r);
          if (eHits || rHits) setPending({ empireHits: eHits, rebelHits: rHits });
          else resolveBattle(r, e);
        },
      });
    });
  };

  const [scene, setScene] = useState<{ dice: Die[]; r: Rebels; e: Imperials; doomed: { rebel: number[]; empire: number[] }; damaged: number[] } | null>(null);
  // After damage is assigned, play the dogfight showing exactly the chosen losses, then finish the round.
  const resolveBattle = (r: Rebels, e: Imperials) => {
    setPending(null);
    const sn = snapRef.current;
    if (!sn) return finishRound(r, e);
    const range = (a: number, n: number) => Array.from({ length: Math.max(0, n) }, (_, i) => a + i);
    const xl = sn.r.xwing - r.xwing, yl = sn.r.ywing - r.ywing;
    const sb = sn.e.superHealthy + sn.e.superDamaged, sa = e.superHealthy + e.superDamaged;
    const sl = sb - sa, sd = Math.max(0, sn.e.superHealthy - e.superHealthy - sl);
    setScene({
      dice, r, e, damaged: range(sn.e.tie + sl, sd),
      doomed: { rebel: [...range(0, xl), ...range(sn.r.xwing, yl)], empire: [...range(0, sn.e.tie - e.tie), ...range(sn.e.tie, sl)] },
    });
  };
  const endScene = () => { if (!scene) return; const { r, e } = scene; setScene(null); finishRound(r, e); };

  const finishRound = (r: Rebels, e: Imperials) => {
    setPending(null);
    const sn = snapRef.current;
    snapRef.current = null;
    if (sn) {
      const supersBefore = sn.e.superHealthy + sn.e.superDamaged;
      const supersAfter = e.superHealthy + e.superDamaged;
      const rec: RoundRecord = {
        round, rebelHits: sn.rebelHits, empireHits: sn.empireHits, rebelShots: sn.rebelShots, empireShots: sn.empireShots,
        xLost: sn.r.xwing - r.xwing, yLost: sn.r.ywing - r.ywing,
        tieLost: sn.e.tie - e.tie, superLost: supersBefore - supersAfter,
        superDamaged: Math.max(0, sn.e.superHealthy - e.superHealthy - (supersBefore - supersAfter)),
      };
      setHistory((h) => [...h, rec]);
      const fmt = (parts: [number, string][]) => parts.filter(([n]) => n > 0).map(([n, l]) => `${n} ${l}`).join(", ") || "nothing";
      const lost = rec.xLost + rec.yLost + rec.tieLost + rec.superLost;
      showBanner(`Round ${round}: Rebellion lost ${fmt([[rec.xLost, "X-wing"], [rec.yLost, "Y-wing"]])} · Empire lost ${fmt([[rec.tieLost, "TIE"], [rec.superLost, "Super TIE"], [rec.superDamaged, "Super TIE damaged"]])}`, lost);
    }
    const out = battleOutcome(r, e);
    if (out === "empire") return finish("empire", "Empire wins — the Rebel fleet is destroyed.");
    if (out === "trench") {
      addLog("Imperial fighters cleared! Begin the trench run.");
      setDice([]);
      setTimeout(() => { setPhase("cleared"); sfx.bigBoom(); setTimeout(sfx.victory, 700); }, 1400);
      return;
    }
    setRound((n) => n + 1);
  };

  // ---- Phase 3 ----
  const trenchRoll = () => {
    if (trenchStep === "bomb") {
      doRoll(() => bombRun(rebels), (d) => {
        setReveal({ cards: [{ side: "rebel", title: hitsOf(d) > 0 ? "Direct hit!" : "All torpedoes missed", hits: hitsOf(d) }] });
        const yd = d.filter((x) => x.unit.startsWith("y")), xd = d.filter((x) => !x.unit.startsWith("y"));
        setTrenchHist((t) => [...t, { label: "Bombing run", hits: hitsOf(d), shots: d.length, xHits: hitsOf(xd), xShots: xd.length, yHits: hitsOf(yd), yShots: yd.length, detail: hitsOf(d) > 0 ? "Death Star destroyed" : "All torpedoes missed" }]);
        if (hitsOf(d) > 0) {
          setWinner("rebel");
          addLog(`Rebellion wins — ${plural(hitsOf(d), "torpedo", "torpedoes")} hit the exhaust port and the Death Star is destroyed!`);
          setFinaleShips(d.filter((x) => x.hit).map((x) => (x.unit.startsWith("y") ? "ywing" : "xwing")));
          setTimeout(() => { setReveal(null); setPhase("finale"); }, 4500);
        }
        else setTimeout(() => { setReveal(null); finish("empire", "Empire wins — every bomb missed and the Death Star survives."); }, 4500);
      });
      return;
    }
    const step = trenchStep;
    sfx.cannon();
    doRoll(() => cannonFire(empire), (d) => {
      let hits = hitsOf(d);
      trenchBefore.current = { r: rebels, hits, shots: d.length };
      addLog(`Cannon round ${step}: ${plural(hits, "hit")}.`);
      const total = hits;
      let r = rebels;
      let wipe = false;
      if (hits >= rebelCount(r)) { if (hits > 0) wipe = true; r = { xwing: 0, ywing: 0 }; hits = 0; }
      else if (hits && r.xwing === 0) { r = applyRebelLosses(r, 0, hits); hits = 0; }
      else if (hits && r.ywing === 0) { r = applyRebelLosses(r, hits, 0); hits = 0; }
      const destroyed = Math.min(total, rebelCount(rebels));
      setReveal({
        cards: [{ side: "empire", title: "Cannons", hits: total, note: total ? `${plural(destroyed, "Rebel ship")} destroyed` : "The Rebels fly through untouched" }],
        next: hits ? `Rebellion chooses which ${plural(hits, "ship")} ${hits === 1 ? "is" : "are"} lost.` : undefined,
        label: hits ? "Assign damage" : "Continue",
        go: () => {
          setReveal(null);
          if (wipe) sfx.shipLost(rebelCount(rebels));
          else if (!hits && total) sfx.shipLost(total);
          setRebels(r);
          if (hits) setPending({ empireHits: 0, rebelHits: hits });
          else {
            const lost = rebelCount(rebels) - rebelCount(r);
            showBanner(`Cannon round ${step}: Rebellion lost ${plural(lost, "ship")}`, lost);
            afterCannon(r, step);
          }
        },
      });
    });
  };

  const afterCannon = (r: Rebels, step: 1 | 2) => {
    setPending(null);
    const b = trenchBefore.current;
    if (b) {
      const xl = b.r.xwing - r.xwing, yl = b.r.ywing - r.ywing;
      const parts = [xl && `${xl} X-wing`, yl && `${yl} Y-wing`].filter(Boolean).join(", ") || "none";
      setTrenchHist((t) => [...t, { label: `Cannon round ${step}`, hits: b.hits, shots: b.shots, detail: `Rebellion lost: ${parts}`, xLost: xl, yLost: yl }]);
      trenchBefore.current = null;
    }
    if (rebelCount(r) === 0) return finish("empire", "Empire wins — the cannons destroyed every ship in the trench.");
    setTrenchStep(step === 1 ? 2 : "bomb");
  };

  // ---- Loss allocation ----
  const onEmpireAllocated = (a: EmpireAlloc) => {
    const e = applyEmpireLosses(empire, a);
    setEmpire(e); sfx.shipLost(a.tie + a.finish);
    addLog(`Empire loses ${a.tie} TIE, ${a.finish} Super TIE destroyed, ${a.damage} Super TIE damaged.`);
    if (pending && pending.rebelHits > 0) setPending({ empireHits: 0, rebelHits: pending.rebelHits });
    else resolveBattle(rebels, e);
  };

  const onRebelAllocated = (x: number, y: number) => {
    const r = applyRebelLosses(rebels, x, y);
    setRebels(r); sfx.shipLost(x + y);
    addLog(`Rebellion loses ${plural(x, "X-wing")} and ${plural(y, "Y-wing")}.`);
    if (phase === "battle") resolveBattle(r, empire);
    else {
      const step = trenchStep === 2 ? 2 : 1;
      showBanner(`Cannon round ${step}: Rebellion lost ${x} X-wing, ${y} Y-wing`, x + y);
      afterCannon(r, step);
    }
  };

  const toggleMute = () => { setMuted(!mute); setMute(!mute); };

  const [trenchBrief, setTrenchBrief] = useState(false);
  const inPlay = phase === "battle" || (phase === "trench" && !trenchBrief);
  const [intro, setIntro] = useState<{ id: number; title: string; sub: string; kind: "plain" | "hyper" | "dive" } | null>(null);
  useEffect(() => {
    const cards: Partial<Record<Phase, [string, string, "plain" | "hyper" | "dive"]>> = {
      buyEmpire: ["Phase 1", "Build your fleet", "plain"],
      battle: ["Phase 2", "Space battle", "hyper"],
      trench: ["Phase 3", "Trench run", "dive"],
    };
    const c = cards[phase];
    if (!c) return;
    const id = Date.now();
    setIntro({ id, title: c[0], sub: c[1], kind: c[2] });
    if (c[2] === "hyper") { sfx.hyperspace(); jumpToHyperspace(); } else if (c[2] === "dive") sfx.whoosh(); else sfx.sting();
    const t = setTimeout(() => setIntro((x) => (x?.id === id ? null : x)), 1900);
    return () => clearTimeout(t);
  }, [phase]);
  const [roundFlip, setRoundFlip] = useState("");
  useEffect(() => {
    if (phase !== "trench") return;
    const label = trenchStep === "bomb" ? "Bombing run" : `Cannon round ${trenchStep}`;
    const d = trenchStep === 1 ? 1900 : 300;
    const a = setTimeout(() => { setRoundFlip(label); sfx.sting(); }, d);
    const b = setTimeout(() => setRoundFlip(""), d + 1300);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [trenchStep, phase]);
  const [faceoff, setFaceoff] = useState(false);
  useEffect(() => {
    if (phase !== "battle" || round < 2) return;
    setRoundFlip(`Round ${round}`); sfx.sting();
    const t = setTimeout(() => setRoundFlip(""), 1300);
    return () => clearTimeout(t);
  }, [round, phase]);
  const prevStep = useRef<TrenchStep>(1);
  useEffect(() => {
    if (phase === "trench" && prevStep.current !== trenchStep) sfx.whoosh();
    prevStep.current = trenchStep;
  }, [trenchStep, phase]);
  return (
    <div className="relative isolate flex h-[100dvh] flex-col overflow-y-auto sm:overflow-hidden text-foreground">
      <Starfield />
      <span className="pointer-events-none fixed bottom-1 left-2 z-50 font-mono text-[10px] text-muted-foreground/70">
        v{__APP_VERSION__} · {__BUILD_DATE__}
      </span>
      {phase !== "title" && (
      <header className="flex shrink-0 items-center justify-between px-6 py-2">
        <span className="font-display text-lg uppercase tracking-[0.25em] text-gold">Trench Warfare</span>
        <div className="flex items-center gap-4">
          {phase !== "briefing" && <PhaseTracker phase={phase} />}
          <button onClick={toggleMute} aria-label={mute ? "Unmute" : "Mute"} className="text-muted-foreground hover:text-foreground">
            {mute ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
        </div>
      </header>
      )}

      {intro && <IntroCard key={intro.id} {...intro} onSkip={() => setIntro(null)} />}
      <main className={`mx-auto w-full max-w-7xl flex-1 px-3 pb-4 sm:min-h-0 sm:px-6 sm:overflow-hidden`}>
        {phase === "title" && <Title mute={mute} onMute={toggleMute} onStart={() => { sfx.blip(); setPhase("briefing"); }} />}
        {phase === "briefing" && <Briefing onGo={() => { sfx.blip(); setPhase("buyEmpire"); }} />}

        {phase === "buyEmpire" && (
          <Shop side="empire" title="Phase 1 · Empire: Build Your Fleet"
            items={[
              { key: "tie", name: "TIE Fighter", stats: [["Battle", HIT_ON.tie]] },
              { key: "superTie", name: "Super TIE", stats: [["Battle", HIT_ON.superTie]], extra: "Takes 2 hits to destroy", hp: true },
              { key: "cannon", name: "Cannon", stats: [["Trench", HIT_ON.cannon]], extra: "Fires only in the trench run · 2 rounds · hits on 6" },
            ]}
            buy={eBuy} setBuy={(b) => setEBuy(b as EmpireBuy)}
            onDone={() => { sfx.blip(); setPhase("buyRebel"); }} doneLabel="Done — Rebellion builds next" />
        )}

        {phase === "buyRebel" && faceoff && <FleetFaceoff r={rBuy} e={eBuy} onDone={() => { setFaceoff(false); startBattle(); }} />}
        {phase === "buyRebel" && !faceoff && (
          <Shop side="rebel" title="Phase 1 · Rebellion: Build Your Fleet"
            items={[
              { key: "xwing", name: "X-wing", stats: [["Battle", HIT_ON.xwing], ["Bombing", HIT_ON.xwingBomb]] },
              { key: "ywing", name: "Y-wing", stats: [["Battle", HIT_ON.ywing], ["Bombing", HIT_ON.ywingBomb]] },
            ]}
            buy={rBuy} setBuy={(b) => setRBuy(b as RebelBuy)}
            onDone={() => { sfx.blip(); setFaceoff(true); }} doneLabel="Done — start the space battle" />
        )}

        {phase === "cleared" && (
          <Cleared r={rebels} start={startFleet} onGo={() => { sfx.blip(); setDice([]); setReveal(null); setPending(null); setTrenchBrief(true); setPhase("trench"); }} />
        )}

        {phase === "trench" && trenchBrief && <TrenchBriefing r={rebels} cannons={empire.cannon} onDone={() => { sfx.blip(); setTrenchBrief(false); }} />}
        {inPlay && (
          <div className="grid gap-4 sm:h-full sm:min-h-0 lg:grid-cols-[1fr_300px]">
            <div key={shake} className={`flex min-h-0 flex-col gap-3 ${shake ? "animate-shake" : ""}`}>
              {phase === "trench" && <TrenchTrack step={trenchStep} r={rebels} />}
              {phase === "battle" && <StrengthBars rebel={rebelCount(rebels)} rebelMax={startFleet.xwing + startFleet.ywing}
                empire={empireFighters(empire)} empireMax={startFleet.tie + startFleet.superTie} empireLabel="Empire" />}
              <div className="grid shrink-0 gap-3 sm:grid-cols-2">
                <RebelFleet r={rebels} start={startFleet} />
                <EmpireFleet e={empire} start={startFleet} showFighters={phase === "battle"} />
              </div>

              <div className="relative sm:min-h-0 sm:flex-1">
                {roundFlip && (
                  <div key={roundFlip} className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                    <span className="animate-roundflip rounded-md border-2 border-gold bg-background/95 px-5 py-3 text-center font-display text-4xl sm:px-10 sm:py-4 sm:text-7xl uppercase tracking-widest text-gold shadow-[0_0_40px_var(--background)] [text-shadow:0_0_18px_var(--gold),0_3px_0_var(--background)]">{roundFlip}</span>
                  </div>
                )}
                <Panel className="flex flex-col sm:h-full" title={phase === "battle" ? `Phase 2 · Space Battle · Round ${round}` :
                  trenchStep === "bomb" ? "Phase 3 · Trench Run · Bombing Run" : `Phase 3 · Trench Run · Cannon Round ${trenchStep} of 2`}>
                  {phase === "trench" && (
                    <div className="mb-2 flex shrink-0 items-center gap-3">
                      <DeathStar className="h-8 w-8 shrink-0" />
                      <p className="text-sm text-muted-foreground">
                        {trenchStep === "bomb"
                          ? `${plural(rebelCount(rebels), "ship")} make${rebelCount(rebels) === 1 ? "s" : ""} the bombing run. X-wings hit on 6, Y-wings on 3 or higher. One hit destroys the Death Star.`
                          : `${plural(empire.cannon, "Imperial cannon")} fire${empire.cannon === 1 ? "s" : ""}. Each roll of 6 destroys one Rebel ship.`}
                      </p>
                    </div>
                  )}
                  <div className="relative flex min-h-0 flex-1 flex-col gap-3 md:flex-row md:items-stretch">
                    {phase === "battle" && scene && <BattleScene key={scene.dice.map((d) => d.id).join()} dice={scene.dice} doomed={scene.doomed} damaged={scene.damaged} onDone={endScene} />}
                    {phase === "battle" ? <>
                      <div className="flex-1"><SideDice side="rebel" title="Rebellion's shots" dice={dice.filter((d) => d.side === "rebel")} rolling={rolling} /></div>
                      <RollButton show={!pending && !rolling && !reveal && !scene && !battleDone} label="Roll battle dice" onClick={battleRoll} />
                      <div className="flex-1"><SideDice side="empire" title="Empire's shots" dice={dice.filter((d) => d.side === "empire")} rolling={rolling} /></div>
                    </> : <>
                      <div className="relative min-h-52 flex-[1.4] sm:min-h-40">
                        <TrenchPOV cannons={empire.cannon} step={String(trenchStep)} rolling={rolling}
                          label={trenchStep === "bomb" ? "Bombing run" : `Cannon round ${trenchStep} of 2`} shipsLeft={rebelCount(rebels)}
                          fire={reveal && !rolling && trenchStep !== "bomb" ? { hits: hitsOf(dice), total: dice.length, key: dice.map((d) => d.id).join(), mask: dice.map((d) => d.hit) } : null}
                          bomb={reveal && !rolling && trenchStep === "bomb" ? { hits: dice.map((d) => d.hit), key: dice.map((d) => d.id).join() } : null}
                          ships={rebels} />
                        {trenchStep === "bomb" && rolling && <TargetingComputer />}
                      </div>
                      <div className="flex-1"><SideDice side={trenchStep === "bomb" && (rolling || reveal) ? "rebel" : "empire"} title={trenchStep === "bomb" && (rolling || reveal) ? "Rebel bombs" : "Imperial cannons"} dice={dice} rolling={rolling} /></div>
                      <RollButton show={!pending && !rolling && !reveal} label={trenchStep === "bomb" ? "Start the bombing run" : "Fire cannons"} onClick={trenchRoll} />
                    </>}
                  </div>
                  {reveal && !rolling && <div key={dice.map((d) => d.id).join()} className="shrink-0 animate-fade-in" style={{ animationDelay: phase === "battle" ? "0s" : trenchStep === "bomb" ? "1.8s" : "0.6s", animationFillMode: "both" }}>{phase === "trench" && trenchStep === "bomb" ? <AfterAction trench={trenchHist} survivors={rebelCount(rebels)} torpedoes={dice} /> : <RevealCard reveal={reveal} />}</div>}
                </Panel>

                {banner && (
                  <div key={banner.id} className="pointer-events-none absolute inset-x-4 top-12 z-10 animate-banner rounded-md border border-gold bg-popover/95 px-4 py-2 text-center font-display text-sm uppercase tracking-wider text-gold shadow-[0_0_24px_-4px_var(--gold)]">
                    💥 {banner.text}
                  </div>
                )}

                {pending && !rolling && (
                  <div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-background/80 p-4 backdrop-blur-sm sm:absolute sm:z-20 sm:rounded-lg sm:bg-background/70">
                    <div className="w-full max-w-md">
                      {pending.empireHits > 0 && <EmpirePicker e={empire} hits={pending.empireHits} onConfirm={onEmpireAllocated} />}
                      {pending.empireHits === 0 && pending.rebelHits > 0 && <RebelPicker r={rebels} hits={pending.rebelHits} onConfirm={onRebelAllocated} />}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="hidden min-h-0 flex-col gap-3 overflow-hidden lg:flex">
              {phase === "battle" && history.length > 0 && <RoundHistory history={history} />}
              {phase === "trench" && <TrenchHistory trench={trenchHist} />}
            </div>
          </div>
        )}

        {phase === "finale" && <Finale ships={finaleShips} onDone={() => setPhase("over")} />}
        {phase === "over" && winner && <Victory winner={winner} log={log} history={history} trench={trenchHist} start={startFleet} r={rebels} e={empire} onAgain={reset} />}
      </main>
    </div>
  );
}

function PhaseTracker({ phase }: { phase: Phase }) {
  const steps: [string, Phase[]][] = [["Build Your Fleet", ["briefing", "buyEmpire", "buyRebel"]], ["Space Battle", ["battle", "cleared"]], ["Trench Run", ["trench", "finale"]]];
  return (
    <ol className="hidden gap-3 font-mono text-[11px] uppercase tracking-widest sm:flex">
      {steps.map(([n, ps], i) => (
        <li key={n} className={ps.includes(phase) ? "text-gold" : "text-muted-foreground"}>{i + 1}. {n}</li>
      ))}
    </ol>
  );
}

function Title({ onStart, mute, onMute }: { onStart: () => void; mute: boolean; onMute: () => void }) {
  return (
    <div className="relative flex min-h-full flex-col items-center py-4 text-center [justify-content:safe_center] sm:h-full sm:py-0">
      <button onClick={onMute} aria-label={mute ? "Unmute" : "Mute"} className="absolute right-0 top-3 text-muted-foreground hover:text-foreground">
        {mute ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </button>
      <p className="mb-4 font-mono text-sm tracking-widest text-holo">A long time ago in a galaxy far, far away....</p>
      <h1 className="font-display text-6xl uppercase leading-none tracking-[0.2em] text-transparent [-webkit-text-stroke:2px_var(--crawl-gold)] drop-shadow-[0_0_24px_var(--crawl-gold)] sm:text-8xl">
        Trench<br />Warfare
      </h1>
      <div className="crawl-wrap my-4 h-40 w-full max-w-xl">
        <div className="crawl font-display text-lg uppercase leading-relaxed tracking-wider">
          <p className="mb-3 text-center">Episode I · The Trench</p>
          <p className="text-justify">It is a period of civil war. The Empire builds TIE fighters and trench cannons. The Rebellion answers with X-wings and Y-wings. First the fleets clash in open space. Then the survivors dive into the trench and run the gauntlet to the Death Star's exhaust port....</p>
        </div>
      </div>
      <div className="mb-6 flex items-center gap-8">
        <ShipIcon unit="xwing" className="h-14 w-14 text-rebel" />
        <span className="font-display text-xl text-muted-foreground">VS</span>
        <ShipIcon unit="tie" className="h-14 w-14 text-empire" />
      </div>
      <Btn onClick={onStart}>Begin</Btn>
    </div>
  );
}

type ShopItem = { key: keyof typeof COSTS; name: string; stats: [string, number][]; extra?: string; hp?: boolean };

function DiceFaces({ from, tone }: { from: number; tone: string }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5, 6].map((n) => (
        <span key={n} className={`flex h-5 w-5 items-center justify-center rounded-sm border font-mono text-[10px] ${
          n >= from ? `border-current ${tone} bg-current/15 font-bold` : "border-border text-muted-foreground/50"}`}>{n}</span>
      ))}
    </span>
  );
}

const SHOP_LABEL: Record<string, string> = { tie: "TIE Fighter", superTie: "Super TIE", cannon: "Cannon", xwing: "X-wing", ywing: "Y-wing" };

type FlyerData = { id: number; unit: string; x0: number; y0: number; x1: number; y1: number; size: number };

function Flyer({ unit, x0, y0, x1, y1, size, color, onDone }: FlyerData & { color: string; onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const dx = x1 - x0, dy = y1 - y0;
    const anim = el.animate([
      { transform: "translate(0,0) scale(1)", opacity: 1 },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 60}px) scale(1.2) rotate(8deg)`, opacity: 1, offset: 0.5 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.7)`, opacity: 0.2 },
    ], { duration: 550, easing: "cubic-bezier(.5,0,.3,1)" });
    anim.onfinish = onDone;
    return () => anim.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div ref={ref} className="pointer-events-none fixed z-50" style={{ left: x0, top: y0, width: size, height: size }}>
      <ShipIcon unit={unit as never} className={`h-full w-full ${color} drop-shadow-[0_0_10px_currentColor]`} />
    </div>
  );
}

function Shop({ side, title, items, buy, setBuy, onDone, doneLabel }: {
  side: "rebel" | "empire"; title: string; items: ShopItem[]; buy: Record<string, number>;
  setBuy: (b: Record<string, number>) => void; onDone: () => void; doneLabel: string;
}) {
  const used = spent(buy);
  const color = side === "rebel" ? "text-rebel" : "text-empire";
  const total = items.reduce((n, it) => n + (buy[it.key] ?? 0), 0);
  const fleetRef = useRef<HTMLElement>(null);
  const [flyers, setFlyers] = useState<FlyerData[]>([]);
  const usedRef = useRef(used);
  const prevUsed = usedRef.current;
  useEffect(() => { usedRef.current = used; }, [used]);
  const launch = (unit: string, btn: HTMLElement) => {
    const icon = btn.closest(".holo-panel")?.querySelector("svg");
    const dest = fleetRef.current;
    if (!icon || !dest) return;
    const a = icon.getBoundingClientRect(), b = dest.getBoundingClientRect();
    setFlyers((l) => [...l, { id: Date.now() + Math.random(), unit, x0: a.left, y0: a.top, size: a.width,
      x1: b.left + b.width / 2 - 20, y1: b.top + 90 }]);
  };
  return (
    <div className="mx-auto flex h-full max-w-6xl flex-col gap-3 pt-1">
      <div className="text-center">
        <h2 className={`font-display text-3xl uppercase tracking-widest ${color}`}>{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Spend up to {CREDITS} credits. Use + and − on each card to add or remove units.{" "}
          {side === "empire" ? "The Empire builds first, then the Rebellion." : "Build the strike force that will take on the Empire."}
        </p>
      </div>
      <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[1.1fr_1fr]">
        <div className="space-y-3 sm:min-h-0 sm:overflow-hidden">
          {items.map((it) => {
            const v = buy[it.key] ?? 0;
            return (
              <div key={it.key} className="holo-panel flex flex-wrap items-center gap-3 rounded-lg p-3 sm:flex-nowrap sm:gap-4">
                <ShipIcon unit={it.key} className={`h-14 w-14 shrink-0 ${color}`} />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <span className="font-display uppercase tracking-wider">{it.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="w-16 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Cost</span>
                    <span className="font-mono text-sm text-gold">{COSTS[it.key]} credits</span>
                  </div>
                  {it.stats.map(([l, n]) => (
                    <div key={l} className="flex items-center gap-2">
                      <span className="w-16 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{l}</span>
                      <span className="hidden sm:contents"><DiceFaces from={n} tone={l === "Bombing" ? "text-gold" : color} /></span>
                      <span className="font-mono text-[11px] text-foreground">{n >= 6 ? "hits on 6" : `hits on ${n} or higher`}</span>
                    </div>
                  ))}
                  {(it.extra || it.hp) && (
                    <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      {it.hp && <span className="flex gap-0.5"><span className="h-2 w-2 rounded-full bg-hit" /><span className="h-2 w-2 rounded-full bg-hit" /></span>}
                      {it.extra}
                    </div>
                  )}
                </div>
                <Stepper value={v} canDec={v > 0} canInc={canAdd(buy, it.key)}
                  onBlocked={() => sfx.denied()}
                  onInc={() => { sfx.chime(); setBuy({ ...buy, [it.key]: v + 1 }); }}
                  onDec={() => { sfx.unblip(); setBuy({ ...buy, [it.key]: v - 1 }); }} />
              </div>
            );
          })}
        </div>
        <section ref={fleetRef} className="holo-panel flex min-h-0 flex-col rounded-lg p-4">
          <div className="mb-1 flex items-baseline justify-between">
            <span className={`font-mono text-xs uppercase tracking-[0.3em] ${color}`}>Your fleet</span>
            <span><span className={`font-display text-3xl ${color}`}>{total}</span> <span className="font-mono text-xs text-muted-foreground">units</span></span>
          </div>
          <p className="font-mono text-sm"><span className="text-gold">{CREDITS - used}</span><span className="text-muted-foreground"> / {CREDITS} credits left</span></p>
          <div className="mb-4 mt-1 flex gap-0.5">
            {Array.from({ length: CREDITS }, (_, i) => {
              const delay = i < used ? Math.max(0, i - prevUsed) * 70 : 0;
              return <span key={i} style={{ transition: "background-color .15s, box-shadow .15s", transitionDelay: `${delay}ms` }}
                className={`h-3 flex-1 rounded-sm ${i < used ? "bg-gold shadow-[0_0_6px_var(--gold)]" : "bg-secondary"}`} />;
            })}
          </div>
          {flyers.map((f) => <Flyer key={f.id} {...f} color={color} onDone={() => setFlyers((l) => l.filter((x) => x.id !== f.id))} />)}
          <div className="flex-1 space-y-4 sm:min-h-0 sm:overflow-hidden">
            {total === 0 && <p className="text-sm text-muted-foreground">Add units to see your fleet assemble here.</p>}
            {items.map((it) => {
              const v = buy[it.key] ?? 0;
              if (!v) return null;
              return (
                <div key={it.key}>
                  <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{SHOP_LABEL[it.key]} × {v}</div>
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: v }, (_, i) => (
                      <ShipIcon key={i} unit={it.key} className={`h-10 w-10 ${color} animate-shipflash`} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
      <div className="shrink-0 pb-2 text-center"><Btn onClick={onDone}>{doneLabel}</Btn></div>
    </div>
  );
}

function Briefing({ onGo }: { onGo: () => void }) {
  const cards = [
    { n: 1, t: "Build your fleet", body: "Each side gets 20 Imperial credits. The Empire builds first, then the Rebellion.",
      art: <div className="flex items-center gap-2"><span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-gold font-display text-gold">20</span><ShipIcon unit="tie" className="h-10 w-10 text-empire" /><ShipIcon unit="xwing" className="h-10 w-10 text-rebel" /></div> },
    { n: 2, t: "Space battle", body: "X-wings and Y-wings against TIEs and Super TIEs. Both sides fire at once. Each player picks which of their own ships are lost. Rounds repeat until one fleet is gone.",
      art: <div className="flex items-center gap-3"><ShipIcon unit="xwing" className="h-10 w-10 text-rebel" /><ShipIcon unit="ywing" className="h-10 w-10 text-rebel" /><span className="font-display text-gold">⚡</span><ShipIcon unit="tie" className="h-10 w-10 text-empire" /><ShipIcon unit="superTie" className="h-10 w-10 text-empire" /></div> },
    { n: 3, t: "Trench run", body: "Survivors fly past two cannon gates, then bomb the Death Star. One hit destroys it.",
      art: <div className="flex items-center gap-2"><ShipIcon unit="xwing" className="h-9 w-9 text-rebel" /><span className="text-muted-foreground">›</span><ShipIcon unit="cannon" className="h-8 w-8 text-empire" /><span className="text-muted-foreground">›</span><ShipIcon unit="cannon" className="h-8 w-8 text-empire" /><span className="text-muted-foreground">›</span><DeathStar className="h-11 w-11" /></div> },
  ];
  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 text-center">
      <h2 className="font-display text-4xl uppercase tracking-widest text-gold drop-shadow-[0_0_20px_var(--gold)]">How it works</h2>
      <div className="grid w-full max-w-5xl gap-4 md:grid-cols-3">
        {cards.map((c, i) => (
          <div key={c.n} className="holo-panel flex animate-fade-in flex-col items-center gap-4 rounded-lg p-5" style={{ animationDelay: `${i * 150}ms`, animationFillMode: "both" }}>
            <span className="font-mono text-xs uppercase tracking-[0.3em] text-holo">Phase {c.n}</span>
            <div className="flex h-14 items-center">{c.art}</div>
            <h3 className="font-display text-xl uppercase tracking-wider">{c.t}</h3>
            <p className="text-sm text-muted-foreground">{c.body}</p>
          </div>
        ))}
      </div>
      <Btn onClick={onGo}>Build Your Fleet</Btn>
    </div>
  );
}

function FleetHeader({ name, count, noun, tone }: { name: string; count: number; noun: string; tone: string }) {
  return (
    <div className="mb-2 flex items-baseline justify-between">
      <span className={`font-mono text-xs uppercase tracking-[0.3em] ${tone}`}>{name}</span>
      <span><span className={`font-display text-3xl ${tone}`}>{count}</span> <span className="font-mono text-xs text-muted-foreground">{noun} left</span></span>
    </div>
  );
}

function RebelFleet({ r, start }: { r: Rebels; start: StartFleet }) {
  return (
    <section className="holo-panel rounded-lg p-3">
      <FleetHeader name="Rebellion" count={rebelCount(r)} noun="ships" tone="text-rebel" />
      <div className="space-y-2">
        <ShipRow unit="xwing" label="X-wing" states={simpleStates(start.xwing, r.xwing)} color="text-rebel" from="left" />
        <ShipRow unit="ywing" label="Y-wing" states={simpleStates(start.ywing, r.ywing)} color="text-rebel" from="left" />
      </div>
    </section>
  );
}

function EmpireFleet({ e, start, showFighters }: { e: Imperials; start: StartFleet; showFighters: boolean }) {
  return (
    <section className="holo-panel min-w-0 rounded-lg p-3">
      {showFighters
        ? <FleetHeader name="Empire" count={empireFighters(e)} noun="fighters" tone="text-empire" />
        : <FleetHeader name="Empire" count={e.cannon} noun="cannons" tone="text-empire" />}
      <div className="space-y-2">
        {showFighters && <>
          <ShipRow unit="tie" label="TIE Fighter" states={simpleStates(start.tie, e.tie)} color="text-empire" from="right" />
          <ShipRow unit="superTie" label="Super TIE" states={superStates(start.superTie, e.superHealthy, e.superDamaged)} color="text-empire" from="right" />
        </>}
        {!showFighters && <ShipRow unit="cannon" label="Cannon" states={simpleStates(e.cannon, e.cannon)} color="text-empire" size="h-7 w-7" from="right" />}
      </div>
    </section>
  );
}

function RollButton({ show, label, onClick }: { show: boolean; label: string; onClick: () => void }) {
  return (
    <div className="flex items-center justify-center md:w-44">
      {show ? <Btn onClick={onClick}>{label}</Btn> : <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">…</span>}
    </div>
  );
}

function TrenchTrack({ step, r }: { step: TrenchStep; r: Rebels }) {
  const steps: [TrenchStep, string, string][] = [[1, "Cannon round 1", "Round 1"], [2, "Cannon round 2", "Round 2"], ["bomb", "Bombing run", "Bomb"]];
  const idx = steps.findIndex(([s]) => s === step);
  const ships = [...Array(r.xwing).fill("xwing"), ...Array(r.ywing).fill("ywing")] as ("xwing" | "ywing")[];
  return (
    <div className="flex shrink-0 items-center gap-2">
      {steps.map(([s, l, short], i) => (
        <div key={String(s)} className="flex min-w-0 flex-1 items-center gap-2">
          <div className={`flex min-w-0 flex-1 items-center justify-center gap-2 rounded-md border-2 px-2 py-1 font-display text-xs uppercase tracking-widest ${
            i === idx ? "border-gold bg-gold/15 text-gold shadow-[0_0_18px_-4px_var(--gold)]"
              : i < idx ? "border-hit/60 text-hit" : "border-border text-muted-foreground"}`}>
            <span className="truncate">{i < idx ? "✓ " : ""}<span className="hidden xl:inline">{l}</span><span className="xl:hidden">{short}</span></span>
            {i === idx && (
              <span key={String(step)} className="flex shrink-0 items-center animate-flyleft">
                {ships.slice(0, 6).map((u, k) => <ShipIcon key={k} unit={u} className="-ml-1 h-4 w-4 rotate-90 text-rebel first:ml-0" />)}
                {ships.length > 6 && <span className="ml-1 font-mono text-[10px] text-rebel">+{ships.length - 6}</span>}
              </span>
            )}
          </div>
          {i < steps.length - 1 && <span className="text-muted-foreground">›</span>}
        </div>
      ))}
    </div>
  );
}

function BattleScene({ dice, doomed, damaged, onDone }: { dice: Die[]; doomed: { rebel: number[]; empire: number[] }; damaged: number[]; onDone: () => void }) {
  const done = useRef(onDone); done.current = onDone;
  useEffect(() => { const t = setTimeout(() => done.current(), 4000); return () => clearTimeout(t); }, []);
  const unitOf = (u: string) => (u in SHOP_LABEL ? u : u.startsWith("super") ? "superTie" : u.startsWith("y") ? "ywing" : u.startsWith("x") ? "xwing" : "tie") as "xwing" | "ywing" | "tie" | "superTie";
  const [fd] = useState(() => dice.map((d) => ({ id: d.id, side: d.side as "rebel" | "empire", kind: unitOf(d.unit), hit: d.hit, value: d.value })));
  const reb = fd.filter((d) => d.side === "rebel").length, emp = fd.length - reb;
  return (
    <div onClick={() => done.current()} className="absolute inset-0 z-10 cursor-pointer overflow-hidden rounded-md border border-border bg-background [animation:titlecard_4s_ease-in-out_forwards]">
      <SpaceDogfight dice={fd} doomed={doomed} damaged={damaged} />
      <CockpitFrame label="Dogfight" right={`${reb} vs ${emp}`} rightTone="text-gold" />
    </div>
  );
}

function TargetingComputer() {
  const [n, setN] = useState(5);
  useEffect(() => { const t = setInterval(() => setN((x) => Math.max(0, x - 1)), ROLL_MS / 6); return () => clearInterval(t); }, []);
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-md bg-background/30 text-hit">
      <div className="relative h-full max-h-56 aspect-square">
        <div className="absolute inset-0 rounded-full border-2 border-hit/70" />
        <div className="absolute inset-[18%] rounded-full border border-hit/50" />
        <div className="absolute inset-[36%] rounded-full border border-hit/40 animate-flicker" />
        <div className="absolute left-1/2 top-0 h-full w-px bg-hit/60" />
        <div className="absolute left-0 top-1/2 h-px w-full bg-hit/60" />
        <div className="absolute left-1/2 top-1/2 h-4 w-6 -translate-x-1/2 -translate-y-1/2 border-2 border-gold shadow-[0_0_14px_var(--gold)]" />
        {[0, 1, 2, 3].map((i) => <div key={i} className="absolute inset-x-[10%] h-px bg-hit/30" style={{ top: `${20 + i * 20}%`, transform: `scaleX(${0.4 + i * 0.2})` }} />)}
      </div>
      <div className="absolute right-4 top-3 font-mono text-xs uppercase tracking-widest">Range</div>
      <div className="absolute right-4 top-7 font-display text-4xl">{String(n * 1000).padStart(5, "0")}</div>
      <div className="absolute bottom-3 left-4 font-mono text-xs uppercase tracking-widest animate-flicker">Targeting computer · torpedoes armed</div>
    </div>
  );
}


function Cleared({ r, start, onGo }: { r: Rebels; start: StartFleet; onGo: () => void }) {
  return (
    <div className="letterbox relative flex min-h-full flex-col items-center py-3 text-center [justify-content:safe_center] sm:h-full sm:py-0">
      <div className="relative mb-3 h-20 w-20 sm:mb-6 sm:h-32 sm:w-32">
        <ShipIcon unit="tie" className="h-20 w-20 text-empire opacity-30 sm:h-32 sm:w-32" />
        <div className="absolute inset-0 animate-boom rounded-full bg-gold" />
      </div>
      <h2 className="font-display text-2xl uppercase tracking-widest text-gold drop-shadow-[0_0_30px_var(--gold)] sm:text-5xl">Imperial fleet destroyed!</h2>
      <p className="mt-2 text-sm text-muted-foreground sm:mt-3 sm:text-base">The skies are clear. {plural(rebelCount(r), "Rebel ship")} survive{rebelCount(r) === 1 ? "s" : ""} to make the trench run.</p>
      <div className="holo-panel mt-3 w-full max-w-md rounded-lg p-3 sm:mt-6 sm:w-auto sm:max-w-none sm:p-4">
        <FleetHeader name="Survivors" count={rebelCount(r)} noun="ships" tone="text-rebel" />
        <div className="space-y-2">
          <ShipRow unit="xwing" label="X-wing" states={simpleStates(start.xwing, r.xwing)} color="text-rebel" />
          <ShipRow unit="ywing" label="Y-wing" states={simpleStates(start.ywing, r.ywing)} color="text-rebel" />
        </div>
      </div>
      <div className="mt-4 sm:mt-6"><Btn onClick={onGo}>Begin the trench run</Btn></div>
    </div>
  );
}

function AbsorbBanner({ hits, assigned, tone }: { hits: number; assigned: number; tone: "rebel" | "empire" }) {
  const c = tone === "rebel" ? "text-rebel" : "text-empire-red";
  const bg = tone === "rebel" ? "bg-rebel" : "bg-empire-red";
  return (
    <div className="mb-3 flex items-center justify-between gap-3 rounded-md border border-border bg-secondary/60 px-3 py-2">
      <div className="flex items-baseline gap-2">
        <span className={`font-display text-5xl leading-none ${c}`}>{hits}</span>
        <span className={`font-display text-sm uppercase tracking-widest ${c}`}>{hits === 1 ? "hit" : "hits"} to absorb</span>
      </div>
      <div className="text-right">
        <div className="mb-1 flex justify-end gap-1">
          {Array.from({ length: hits }, (_, i) => <span key={i} className={`h-3 w-3 rounded-full border border-border ${i < assigned ? bg : "bg-background"}`} />)}
        </div>
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Assigned {assigned} of {hits}</span>
      </div>
    </div>
  );
}

function Finale({ ships, onDone }: { ships: ("xwing" | "ywing")[]; onDone: () => void }) {
  const [stage, setStage] = useState<"drop" | "scene" | "boom">("drop");
  const [skip, setSkip] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const boomed = useRef(false);
  const boom = () => { if (boomed.current) return; boomed.current = true; setStage("boom"); sfx.deathStar(); };
  useEffect(() => {
    sfx.bombDrop();
    const T = timers.current;
    T.push(setTimeout(sfx.explosion, 2200));
    T.push(setTimeout(() => setStage("scene"), 2800));
    T.push(setTimeout(boom, 2800 + FINALE_FLASH * 1000));
    T.push(setTimeout(() => sfx.whoosh(), 5200));
    T.push(setTimeout(() => sfx.victory(), 5400));
    T.push(setTimeout(onDone, 9800));
    return () => T.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const onSkip = () => { if (stage === "drop" || skip) return; setSkip(true); boom(); };
  return (
    <div onClick={onSkip} className={`${stage === "drop" ? "" : "letterbox "}relative flex h-full flex-col items-center justify-center overflow-hidden text-center`}>
      {stage === "drop" && (
        <div className="relative h-80 w-full max-w-3xl">
          <ShaftView torpedoes={Math.max(1, ships.length)} />
          <span className="absolute bottom-2 left-1/2 -translate-x-1/2 font-mono text-xs uppercase tracking-widest text-gold">Down the exhaust shaft…</span>
        </div>
      )}
      {stage !== "drop" && (
        <div className="pointer-events-none absolute inset-0 z-0">
          <FinaleScene ships={ships} skip={skip} />
        </div>
      )}
      {stage !== "drop" && <div className="h-72 w-full max-w-3xl" />}
      {stage === "boom" && (
        <div className="relative z-10 mt-8 animate-fade-in">
          <h2 className="font-display text-5xl uppercase tracking-widest text-gold drop-shadow-[0_0_30px_var(--gold)]">The Death Star is destroyed!</h2>
          <div className="mt-6"><Btn onClick={onDone}>See battle recap</Btn></div>
        </div>
      )}
    </div>
  );
}

function EmpirePicker({ e, hits, onConfirm }: { e: Imperials; hits: number; onConfirm: (a: EmpireAlloc) => void }) {
  const superCap = 2 * e.superHealthy + e.superDamaged;
  const [tie, setTie] = useState(Math.min(hits, e.tie));
  const [sup, setSup] = useState(Math.min(hits - Math.min(hits, e.tie), superCap));
  const used = tie + sup;
  const split = allocSuperHits(e, sup);
  const hint = sup === 0 ? "no Super TIE hits"
    : [split.finish && `${split.finish} destroyed`, split.damage - (split.finish - Math.min(sup, e.superDamaged)) > 0 && `${split.damage - (split.finish - Math.min(sup, e.superDamaged))} damaged`].filter(Boolean).join(", ");
  const step = (f: (n: number) => void, n: number) => { f(n); sfx.blip(); };
  return (
    <Panel title="Empire takes losses" tone="empire">
      <AbsorbBanner hits={hits} assigned={used} tone="empire" />
      <p className="mb-3 text-sm text-muted-foreground">A Super TIE takes 2 hits to destroy. Hits finish off damaged ones first.</p>
      <div className="space-y-2">
        {e.tie > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm">Hit a TIE Fighter</span>
            <Stepper value={tie} canInc={tie < e.tie && used < hits} canDec={tie > 0} onInc={() => step(setTie, tie + 1)} onDec={() => step(setTie, tie - 1)} />
          </div>
        )}
        {superCap > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm">Hit a Super TIE<span className="block font-mono text-[10px] text-muted-foreground">{plural(sup, "hit")} → {hint}</span></span>
            <Stepper value={sup} canInc={sup < superCap && used < hits} canDec={sup > 0} onInc={() => step(setSup, sup + 1)} onDec={() => step(setSup, sup - 1)} />
          </div>
        )}
      </div>
      <div className="mt-4 flex items-center gap-4">
        <Btn disabled={used !== hits} onClick={() => { sfx.clunk(); onConfirm({ tie, ...split }); }}>Confirm losses</Btn>
        <span className="font-mono text-sm text-muted-foreground">{used} / {hits} assigned</span>
      </div>
    </Panel>
  );
}

function RebelPicker({ r, hits, onConfirm }: { r: Rebels; hits: number; onConfirm: (x: number, y: number) => void }) {
  const [x, setX] = useState(Math.min(hits, r.xwing));
  const y = hits - x;
  const ok = x <= r.xwing && y >= 0 && y <= r.ywing;
  return (
    <Panel title="Rebellion takes losses" tone="rebel">
      <AbsorbBanner hits={hits} assigned={ok ? hits : Math.min(x, r.xwing) + Math.max(0, Math.min(y, r.ywing))} tone="rebel" />
      <p className="mb-3 text-sm text-muted-foreground">Choose which of your ships are destroyed.</p>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm">X-wings lost</span>
          <Stepper value={x} canInc={x < Math.min(hits, r.xwing)} canDec={x > 0 && hits - (x - 1) <= r.ywing}
            onInc={() => { setX(x + 1); sfx.blip(); }} onDec={() => { setX(x - 1); sfx.blip(); }} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm">Y-wings lost</span>
          <span className="w-[112px] text-center font-mono text-xl">{y}</span>
        </div>
      </div>
      <div className="mt-4"><Btn disabled={!ok} onClick={() => { sfx.clunk(); onConfirm(x, y); }}>Confirm losses</Btn></div>
    </Panel>
  );
}

function SideDice({ side, title, dice, rolling }: { side: "rebel" | "empire"; title: string; dice: Die[]; rolling: boolean }) {
  const rebel = side === "rebel";
  const hits = hitsOf(dice);
  return (
    <div className={`flex h-full min-h-0 flex-col rounded-lg border-2 p-3 ${rebel ? "border-rebel/50 bg-rebel/5" : "border-empire-red/50 bg-empire-red/5"}`}>
      <div className="mb-2 flex shrink-0 items-start justify-between gap-3">
        <h4 className={`font-display text-sm uppercase tracking-widest ${rebel ? "text-rebel" : "text-empire-red"}`}>{title}</h4>
        {dice.length > 0 && (
          <div className="text-right leading-none">
            <div className={`font-display text-5xl ${rolling ? "text-muted-foreground" : hits > 0 ? "text-hit drop-shadow-[0_0_12px_var(--hit)]" : "text-muted-foreground"}`}>
              {rolling ? "?" : hits}
            </div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">hits</div>
          </div>
        )}
      </div>
      <div className="-mx-2 min-h-0 flex-1 overflow-hidden p-3"><DiceTray dice={dice} rolling={rolling} /></div>
    </div>
  );
}

function RoundHistory({ history }: { history: RoundRecord[] }) {
  const fmt = (parts: [number, string][]) => parts.filter(([n]) => n > 0).map(([n, l]) => `${n} ${l}`).join(", ") || "none";
  return (
    <Panel title="Losses per round">
      <ul className="space-y-3">
        {[...history].reverse().slice(0, 3).map((h) => (
          <li key={h.round} className="rounded-md border border-border p-3">
            <div className="mb-2 font-mono text-xs uppercase tracking-widest text-gold">Round {h.round}</div>
            <div className="mb-2 flex gap-4 font-display">
              <span className="text-rebel">{h.rebelHits} <span className="font-mono text-[10px]">rebel hits</span></span>
              <span className="text-empire-red">{h.empireHits} <span className="font-mono text-[10px]">empire hits</span></span>
            </div>
            <div className="text-xs"><span className="text-rebel">Rebellion lost:</span> {fmt([[h.xLost, "X-wing"], [h.yLost, "Y-wing"]])}</div>
            <div className="text-xs"><span className="text-empire">Empire lost:</span> {fmt([[h.tieLost, "TIE"], [h.superLost, "Super TIE"], [h.superDamaged, "Super TIE damaged"]])}</div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function TrenchHistory({ trench }: { trench: TrenchRecord[] }) {
  return (
    <Panel title="Losses per round">
      <ul className="space-y-3">
        {trench.length === 0 && <li className="font-mono text-xs text-muted-foreground">Awaiting first cannon round…</li>}
        {[...trench].reverse().slice(0, 3).map((t) => (
          <li key={t.label} className="rounded-md border border-border p-3">
            <div className="mb-2 font-mono text-xs uppercase tracking-widest text-gold">{t.label}</div>
            <div className="mb-2 flex gap-4 font-display">
              {!t.label.startsWith("Bomb")
                ? <span className="text-empire-red">{t.hits} <span className="font-mono text-[10px]">cannon hits of {t.shots}</span></span>
                : <span className="text-rebel">{t.hits} <span className="font-mono text-[10px]">torpedo hits</span></span>}
            </div>
            <div className="text-xs">{!t.label.startsWith("Bomb") ? <><span className="text-rebel">Rebellion lost:</span> {t.detail.replace(/^Rebellion lost:\s*/, "")}</> : t.detail}</div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function Victory({ winner, log, history, trench, start, r, e, onAgain }: { winner: "rebel" | "empire"; log: string[]; history: RoundRecord[]; trench: TrenchRecord[]; start: StartFleet; r: Rebels; e: Imperials; onAgain: () => void }) {
  const rebel = winner === "rebel";
  const [splash, setSplash] = useState(!rebel);
  if (splash) return <DefeatSplash onDone={() => setSplash(false)} />;
  const sum = (k: keyof RoundRecord) => history.reduce((a, h) => a + (h[k] ?? 0), 0);
  const maxHits = Math.max(1, ...history.map((h) => Math.max(h.rebelHits, h.empireHits)));
  return (
    <div className="flex min-h-full flex-col items-center sm:h-full sm:overflow-hidden py-2 text-center [justify-content:safe_center]">
      <div className={`relative mb-2 ${history.length > 2 && trench.length > 0 ? "hidden" : ""}`}>
        <DeathStar className={history.length > 2 || trench.length > 0 ? "h-8 w-8" : "h-14 w-14"} />
        {rebel && <div className="absolute inset-0 animate-boom rounded-full bg-gold" />}
      </div>
      <h2 className={`font-display text-4xl uppercase tracking-widest ${rebel ? "text-rebel drop-shadow-[0_0_24px_var(--rebel)]" : "text-empire-red drop-shadow-[0_0_24px_var(--empire-red)]"}`}>
        {rebel ? "The Rebellion wins" : "The Empire wins"}
      </h2>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{log[0]}</p>
      <div className="mt-3 grid w-full max-w-3xl gap-3 text-left sm:grid-cols-2">
        <section className={`holo-panel rounded-lg p-3 ${rebel ? "shadow-[0_0_24px_-6px_var(--rebel)]" : "opacity-80"}`}>
          <FleetHeader name={rebel ? "Rebellion · Victor" : "Rebellion"} count={rebelCount(r)} noun="ships" tone="text-rebel" />
          <div className="space-y-1">
            <ShipRow unit="xwing" label="X-wing" states={simpleStates(start.xwing, r.xwing)} color="text-rebel" size="h-6 w-6" />
            <ShipRow unit="ywing" label="Y-wing" states={simpleStates(start.ywing, r.ywing)} color="text-rebel" size="h-6 w-6" />
          </div>
        </section>
        <section className={`holo-panel rounded-lg p-3 ${!rebel ? "shadow-[0_0_24px_-6px_var(--empire-red)]" : "opacity-80"}`}>
          <FleetHeader name={!rebel ? "Empire · Victor" : "Empire"} count={empireFighters(e)} noun="fighters" tone="text-empire" />
          <div className="space-y-1">
            <ShipRow unit="tie" label="TIE Fighter" states={simpleStates(start.tie, e.tie)} color="text-empire" size="h-6 w-6" />
            <ShipRow unit="superTie" label="Super TIE" states={superStates(start.superTie, e.superHealthy, e.superDamaged)} color="text-empire" size="h-6 w-6" />
            {start.tie + start.superTie === 0 && <p className="font-mono text-[10px] text-muted-foreground">No fighters built · {plural(e.cannon, "cannon")}</p>}
          </div>
        </section>
      </div>
      <RecapStats history={history} trench={trench} start={start} r={r} e={e} />
      <div className="mt-2 w-full max-w-3xl text-left">
        <Panel title="Battle recap">
          {history.length === 0 ? <p className="text-sm text-muted-foreground">No space battle rounds were fought.</p> : (
            <div className="overflow-x-auto"><table className="w-full min-w-[30rem] font-mono text-xs">
              <thead className="text-muted-foreground"><tr className="border-b border-border">
                <th className="py-1 text-left">Round</th><th className="text-rebel">Rebel hits</th><th className="text-empire-red">Empire hits</th>
                <th className="text-left text-rebel">Rebellion lost</th><th className="text-left text-empire">Empire lost</th></tr></thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.round} className="border-b border-border/50">
                    <td className="py-0.5 text-gold">{h.round}</td>
                    <td><HitBar n={h.rebelHits} max={maxHits} tone="bg-rebel text-rebel" /></td>
                    <td><HitBar n={h.empireHits} max={maxHits} tone="bg-empire-red text-empire-red" /></td>
                    <td><LostIcons items={[["xwing", h.xLost], ["ywing", h.yLost]]} tone="text-rebel" /></td>
                    <td><LostIcons items={[["tie", h.tieLost], ["superTie", h.superLost]]} damaged={h.superDamaged} tone="text-empire" /></td>
                  </tr>
                ))}
                <tr className="font-bold">
                  <td className="py-1">Total</td>
                  <td className="text-center text-rebel">{sum("rebelHits")}</td>
                  <td className="text-center text-empire-red">{sum("empireHits")}</td>
                  <td><LostIcons items={[["xwing", sum("xLost")], ["ywing", sum("yLost")]]} tone="text-rebel" /></td>
                  <td><LostIcons items={[["tie", sum("tieLost")], ["superTie", sum("superLost")]]} tone="text-empire" /></td>
                </tr>
              </tbody>
            </table></div>
          )}
          {trench.length > 0 && (
            <div className="mt-2">
              <div className="mb-1 font-mono text-xs uppercase tracking-widest text-gold">Trench run</div>
              <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                {trench.map((t, i) => (
                  <div key={i} className="rounded-md border border-border/60 bg-background/40 px-2 py-1.5">
                    <div className="flex items-baseline justify-between">
                      <span className="uppercase tracking-wider text-muted-foreground">{t.label}</span>
                      <span className={`font-display text-lg ${t.label.startsWith("Bomb") ? "text-rebel" : "text-empire-red"}`}>{t.hits}<span className="ml-0.5 font-mono text-[10px]">hits</span></span>
                    </div>
                    {t.label.startsWith("Bomb")
                      ? <span className="flex items-center gap-2"><DeathStar className={`h-5 w-5 ${t.hits > 0 ? "opacity-40" : ""}`} />{t.hits > 0 ? <span className="text-gold">Destroyed</span> : <span className="text-muted-foreground">Missed</span>}</span>
                      : <span className="flex items-center gap-2"><span className="text-muted-foreground">Lost</span><LostIcons items={[["xwing", t.xLost ?? 0], ["ywing", t.yLost ?? 0]]} tone="text-rebel" /></span>}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="mt-3 flex items-center justify-between"><p className={`font-display uppercase tracking-widest ${rebel ? "text-rebel" : "text-empire-red"}`}>Winner: {rebel ? "Rebellion" : "Empire"}</p><Btn onClick={onAgain}>Play again</Btn></div>
        </Panel>
      </div>
    </div>
  );
}

function RevealCard({ reveal }: { reveal: Reveal }) {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-4 rounded-lg border border-gold/50 bg-popover/80 p-3">
      {reveal.cards.map((c, i) => (
        <div key={i} className="animate-pop text-center" style={{ animationDelay: `${i * 150}ms` }}>
          <div className={`font-display text-sm uppercase tracking-widest ${c.side === "rebel" ? "text-rebel" : "text-empire-red"}`}>{c.title}</div>
          <div className={`font-display text-5xl leading-none ${c.hits > 0 ? "text-hit drop-shadow-[0_0_14px_var(--hit)]" : "text-muted-foreground"}`}>
            {c.hits} <span className="text-2xl">{c.hits === 1 ? "HIT" : "HITS"}</span>
          </div>
          <div className="mt-1 font-mono text-[11px] uppercase text-muted-foreground">{c.note ?? (c.hits === 0 ? "All missed" : "")}</div>
        </div>
      ))}
      {(reveal.next || reveal.go) && (
        <div className="flex flex-col items-center gap-2">
          {reveal.next && <p className="max-w-xs text-sm text-foreground">{reveal.next}</p>}
          {reveal.go && <Btn onClick={() => { sfx.blip(); reveal.go?.(); }}>{reveal.label}</Btn>}
        </div>
      )}
    </div>
  );
}

function IntroCard({ title, sub, kind, onSkip }: { title: string; sub: string; kind: "plain" | "hyper" | "dive"; onSkip: () => void }) {
  return (
    <button onClick={onSkip} aria-label="Skip" className={`fixed inset-0 z-50 flex animate-titlecard items-center justify-center overflow-hidden ${kind === "hyper" ? "bg-background/30" : "bg-background/90"}`}>
      {kind === "dive" && <DeathStar className="absolute h-[80vh] w-[80vh] animate-zoomin opacity-40" />}
      <div className="relative animate-pop text-center">
        <div className="font-mono text-sm uppercase tracking-[0.5em] text-holo">{title}</div>
        <div className="font-display text-6xl uppercase tracking-widest text-gold drop-shadow-[0_0_30px_var(--gold)]">{sub}</div>
      </div>
    </button>
  );
}

function DefeatSplash({ onDone }: { onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 9000); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className="letterbox relative flex h-full flex-col items-center justify-center overflow-hidden text-center">
      <DeathStar className="absolute right-[8%] top-[10%] h-56 w-56 animate-pop opacity-80 drop-shadow-[0_0_40px_var(--empire-red)]" />
      <Vader className="relative h-56 w-56 animate-pop text-empire drop-shadow-[0_0_30px_var(--empire-red)]" />
      <h2 className="mt-4 font-display text-5xl uppercase tracking-widest text-empire-red drop-shadow-[0_0_24px_var(--empire-red)]">The Rebellion is crushed</h2>
      <p className="mt-2 font-mono text-sm uppercase tracking-widest text-muted-foreground">The Empire rules the galaxy</p>
      <div className="mt-6"><Btn onClick={onDone}>See battle recap</Btn></div>
    </div>
  );
}


function FleetFaceoff({ r, e, onDone }: { r: RebelBuy; e: EmpireBuy; onDone: () => void }) {
  const emp = [...Array(e.tie).fill("tie"), ...Array(e.superTie).fill("superTie")] as ("tie" | "superTie")[];
  const reb = [...Array(r.xwing).fill("xwing"), ...Array(r.ywing).fill("ywing")] as ("xwing" | "ywing")[];
  const step = 90, empEnd = emp.length * step, total = empEnd + reb.length * step;
  const [ready, setReady] = useState(false);
  useEffect(() => {
    sfx.hum();
    const timers = [...emp.map((_, i) => setTimeout(sfx.blip, i * step)), ...reb.map((_, i) => setTimeout(sfx.blip, empEnd + 300 + i * step))];
    const a = setTimeout(() => { setReady(true); sfx.sting(); sfx.flyby(-0.9, 0.9, 1.1); }, total + 900);
    const b = setTimeout(onDone, total + 2600);
    return () => [...timers, a, b].forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const size = (n: number) => (n > 12 ? "h-7 w-7" : n > 6 ? "h-10 w-10" : "h-14 w-14");
  const grid = (list: string[], tone: string, base: number, rot: string) => (
    <div className="grid max-w-[22rem] grid-cols-4 gap-3">
      {list.map((u, i) => (
        <div key={i} className="relative animate-pop" style={{ animationDelay: `${base + i * step}ms` }}>
          <ShipIcon unit={u as "tie"} className={`${size(list.length)} ${tone} ${rot}`} />
          <span className="absolute inset-0 animate-burst rounded-full bg-holo/60" style={{ animationDelay: `${base + i * step}ms` }} />
        </div>
      ))}
    </div>
  );
  return (
    <button onClick={onDone} className="letterbox relative flex h-full w-full flex-col items-center justify-center gap-6 text-center" aria-label="Skip">
      <h2 className="font-display text-3xl uppercase tracking-[0.3em] text-gold drop-shadow-[0_0_20px_var(--gold)]">The fleets assemble</h2>
      <div className="flex w-full max-w-5xl items-center justify-between gap-2 px-1 sm:gap-6 sm:px-6">
        <div className="flex flex-col items-center gap-3 animate-flyleft" style={{ animationDelay: `${empEnd}ms` }}>
          <span className="font-mono text-sm uppercase tracking-[0.3em] text-rebel">Rebellion · {reb.length}</span>
          {grid(reb, "text-rebel", empEnd + 300, "rotate-90")}
        </div>
        <span className="font-display text-2xl text-muted-foreground sm:text-4xl">VS</span>
        <div className="flex flex-col items-center gap-3 animate-flyright">
          <span className="font-mono text-sm uppercase tracking-[0.3em] text-empire">Empire · {emp.length}</span>
          {grid(emp, "text-empire", 0, "")}
        </div>
      </div>
      <p className={`font-display text-4xl uppercase tracking-widest text-gold transition-opacity duration-500 ${ready ? "opacity-100" : "opacity-0"}`}>Battle stations!</p>
    </button>
  );
}

function LostIcons({ items, damaged = 0, tone }: { items: ["xwing" | "ywing" | "tie" | "superTie", number][]; damaged?: number; tone: string }) {
  const list = items.flatMap(([u, n]) => Array.from({ length: n }, () => u));
  if (list.length === 0 && damaged === 0) return <span className="text-muted-foreground">none</span>;
  const shown = list.slice(0, 8);
  return (
    <span className="inline-flex flex-wrap items-center gap-0.5 py-0.5">
      {shown.map((u, i) => (
        <span key={i} className="relative inline-block h-5 w-5" title={`${SHOP_LABEL[u] ?? u} destroyed`}>
          <ShipIcon unit={u} className={`h-5 w-5 opacity-50 ${tone}`} />
          <span className="absolute inset-0 flex items-center justify-center font-display text-base leading-none text-empire-red">✕</span>
        </span>
      ))}
      {list.length > shown.length && <span className="ml-1 text-muted-foreground">+{list.length - shown.length}</span>}
      {Array.from({ length: Math.min(damaged, 4) }, (_, i) => (
        <span key={`d${i}`} className="relative inline-block h-5 w-5" title="Super TIE damaged">
          <ShipIcon unit="superTie" className={`h-5 w-5 animate-flicker ${tone}`} />
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-gold" />
        </span>
      ))}
    </span>
  );
}

function StrengthBars({ rebel, rebelMax, empire, empireMax, empireLabel }: { rebel: number; rebelMax: number; empire: number; empireMax: number; empireLabel: string }) {
  const pct = (a: number, b: number) => `${b > 0 ? Math.round((a / b) * 100) : 0}%`;
  return (
    <div className="flex shrink-0 items-center gap-3 font-mono text-[10px] uppercase tracking-widest">
      <span className="w-24 text-rebel">Rebellion {rebel}/{rebelMax}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className="ml-auto h-full rounded-full bg-rebel shadow-[0_0_8px_var(--rebel)] transition-all duration-700" style={{ width: pct(rebel, rebelMax) }} /></div>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-empire-red shadow-[0_0_8px_var(--empire-red)] transition-all duration-700" style={{ width: pct(empire, empireMax) }} /></div>
      <span className="w-24 text-right text-empire-red">{empireLabel} {empire}/{empireMax}</span>
    </div>
  );
}

function AfterAction({ trench, survivors, torpedoes }: { trench: TrenchRecord[]; survivors: number; torpedoes: Die[] }) {
  const cannon = trench.filter((t) => t.label.startsWith("Cannon"));
  const shots = cannon.reduce((a, t) => a + (t.shots ?? 0), 0), hits = cannon.reduce((a, t) => a + t.hits, 0);
  const th = hitsOf(torpedoes);
  const entered = survivors + cannon.reduce((a, t) => a + (t.xLost ?? 0) + (t.yLost ?? 0), 0);
  const Tile = ({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: string }) => (
    <div className="holo-panel flex-1 rounded-md px-3 py-2 text-center">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`font-display text-3xl leading-tight ${tone}`}>{value}</div>
      <div className="font-mono text-[10px] text-muted-foreground">{sub}</div>
    </div>
  );
  return (
    <div>
      <div className="mb-1 text-center font-mono text-xs uppercase tracking-widest text-gold">Trench run · after-action report</div>
      <div className="flex gap-2">
        <Tile label="Cannon lasers hit" value={String(hits)} sub={`of ${shots} fired`} tone="text-empire-red" />
        <Tile label="Cannon lasers missed" value={String(shots - hits)} sub={`over ${plural(cannon.length, "round")}`} tone="text-muted-foreground" />
        <Tile label="Ships survived" value={`${survivors}/${entered}`} sub="made it through the trench" tone="text-rebel" />
        <Tile label="Torpedoes on target" value={`${th}/${torpedoes.length}`} sub={th > 0 ? "Death Star destroyed" : "All missed"} tone={th > 0 ? "text-gold" : "text-empire-red"} />
      </div>
    </div>
  );
}

function HitBar({ n, max, tone }: { n: number; max: number; tone: string }) {
  const [bg, fg] = tone.split(" ");
  return (
    <div className="flex items-center gap-2 pr-3">
      <span className={`w-5 text-right font-display text-base ${fg}`}>{n}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${bg} origin-left animate-[growx_0.8s_ease-out_both]`} style={{ width: `${(n / max) * 100}%` }} />
      </div>
    </div>
  );
}

const rpct = (h: number, n: number) => (n > 0 ? Math.round((h / n) * 100) : 0);

function Ring({ value, tone, label, sub }: { value: number; tone: string; label: string; sub: string }) {
  const c = 2 * Math.PI * 15;
  return (
    <div className="flex items-center gap-2">
      <svg viewBox="0 0 36 36" className="h-10 w-10 shrink-0 -rotate-90">
        <circle cx="18" cy="18" r="15" fill="none" className="stroke-border" strokeWidth="4" />
        <circle cx="18" cy="18" r="15" fill="none" className={tone} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={`${(value / 100) * c} ${c}`} />
      </svg>
      <div className="min-w-0 text-left leading-tight">
        <div className="font-display text-base">{value}%</div>
        <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="font-mono text-[9px] text-muted-foreground">{sub}</div>
      </div>
    </div>
  );
}

function RecapStats({ history, trench, start, r, e }: { history: RoundRecord[]; trench: TrenchRecord[]; start: StartFleet; r: Rebels; e: Imperials }) {
  const rs = history.reduce((a, h) => a + (h.rebelShots ?? 0), 0), rh = history.reduce((a, h) => a + h.rebelHits, 0);
  const es = history.reduce((a, h) => a + (h.empireShots ?? 0), 0), eh = history.reduce((a, h) => a + h.empireHits, 0);
  const cannon = trench.filter((t) => !t.label.startsWith("Bomb"));
  const cs = cannon.reduce((a, t) => a + (t.shots ?? 0), 0), ch = cannon.reduce((a, t) => a + t.hits, 0);
  const bomb = trench.find((t) => t.label.startsWith("Bomb"));
  const rStart = start.xwing + start.ywing, eStart = start.tie + start.superTie;
  const rCred = (start.xwing - r.xwing) * COSTS.xwing + (start.ywing - r.ywing) * COSTS.ywing;
  const rSpent = start.xwing * COSTS.xwing + start.ywing * COSTS.ywing;
  const eCred = (start.tie - e.tie) * COSTS.tie + (start.superTie - e.superHealthy - e.superDamaged) * COSTS.superTie;
  const eSpent = start.tie * COSTS.tie + start.superTie * COSTS.superTie + e.cannon * COSTS.cannon;
  return (
    <div className="holo-panel mt-2 grid w-full max-w-3xl grid-cols-2 gap-x-6 gap-y-3 rounded-lg px-5 py-3 sm:grid-cols-4">
      <Ring value={rpct(rh, rs)} tone="stroke-rebel" label="Rebel accuracy" sub={`${rh} of ${rs} shots`} />
      <Ring value={rpct(bomb?.hits ?? 0, bomb?.shots ?? 0)} tone="stroke-gold" label="Torpedo accuracy"
        sub={bomb ? `X ${bomb.xHits ?? 0}/${bomb.xShots ?? 0} · Y ${bomb.yHits ?? 0}/${bomb.yShots ?? 0}` : "no bombing run"} />
      <Ring value={rpct(eh, es)} tone="stroke-empire-red" label="Empire accuracy" sub={`${eh} of ${es} shots`} />
      <Ring value={rpct(ch, cs)} tone="stroke-empire-red" label="Cannon accuracy" sub={cs ? `${ch} of ${cs} · ${cannon.map((t) => `${rpct(t.hits, t.shots ?? 0)}%`).join(" / ")}` : "not fired"} />
    </div>
  );
}

function TrenchBriefing({ r, cannons, onDone }: { r: Rebels; cannons: number; onDone: () => void }) {
  const reb = [...Array(r.xwing).fill("xwing"), ...Array(r.ywing).fill("ywing")] as ("xwing" | "ywing")[];
  const step = 90, start = 1900;
  useEffect(() => {
    const t = [...reb.map((_, i) => setTimeout(sfx.blip, start + i * step)), setTimeout(sfx.hum, start)];
    return () => t.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const size = (n: number) => (n > 16 ? "h-5 w-5" : n > 12 ? "h-6 w-6 sm:h-7 sm:w-7" : n > 6 ? "h-7 w-7 sm:h-10 sm:w-10" : "h-9 w-9 sm:h-12 sm:w-12");
  const steps: [string, string][] = [
    ["Cannon round 1", `${plural(cannons, "cannon")} fire. Each 6 destroys a Rebel ship.`],
    ["Cannon round 2", "The survivors fly deeper and face the cannons again."],
    ["Bombing run", `X-wings hit on ${HIT_ON.xwingBomb}, Y-wings on ${HIT_ON.ywingBomb} or higher. One hit destroys the Death Star.`],
  ];
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center gap-5 text-center">
      <h2 className="animate-pop font-display text-3xl uppercase tracking-[0.3em] text-gold drop-shadow-[0_0_20px_var(--gold)]" style={{ animationDelay: `${start - 300}ms` }}>Into the trench</h2>
      <div className="flex w-full max-w-5xl items-center justify-between gap-2 px-1 sm:gap-6 sm:px-6">
        <div className="flex flex-col items-center gap-3 animate-flyleft" style={{ animationDelay: `${start}ms` }}>
          <span className="font-mono text-sm uppercase tracking-[0.3em] text-rebel">Rebellion · {plural(reb.length, "ship")}</span>
          <div className="grid max-w-[22rem] grid-cols-4 gap-1 sm:grid-cols-5 sm:gap-2">
            {reb.map((u, i) => (
              <div key={i} className="animate-pop" style={{ animationDelay: `${start + i * step}ms` }}>
                <ShipIcon unit={u} className={`${size(reb.length)} rotate-90 text-rebel`} />
              </div>
            ))}
          </div>
        </div>
        <span className="font-display text-2xl text-muted-foreground sm:text-4xl">VS</span>
        <div className="flex flex-col items-center gap-3 animate-flyright" style={{ animationDelay: `${start}ms` }}>
          <span className="font-mono text-sm uppercase tracking-[0.3em] text-empire">Empire · {plural(cannons, "cannon")}</span>
          {cannons === 0 ? <span className="font-mono text-xs text-muted-foreground">No cannons defend the trench</span> : (
            <div className="grid max-w-[22rem] grid-cols-4 gap-1 sm:grid-cols-5 sm:gap-2">
              {Array.from({ length: cannons }, (_, i) => (
                <div key={i} className="animate-pop" style={{ animationDelay: `${start + i * 50}ms` }}>
                  <ShipIcon unit="cannon" className={`${size(cannons)} text-empire`} />
                </div>
              ))}
            </div>
          )}
          <DeathStar className="h-10 w-10" />
        </div>
      </div>
      <ol className="grid w-full max-w-4xl gap-2 px-6 sm:grid-cols-3">
        {steps.map(([t, d], i) => (
          <li key={t} className="holo-panel animate-pop rounded-lg p-3 text-left" style={{ animationDelay: `${start + 600 + i * 250}ms` }}>
            <div className="font-display text-sm uppercase tracking-widest text-gold">{i + 1}. {t}</div>
            <div className="mt-1 font-mono text-[11px] text-muted-foreground">{d}</div>
          </li>
        ))}
      </ol>
      <div className="animate-pop" style={{ animationDelay: `${start + 1500}ms` }}><Btn onClick={onDone}>Begin the trench run</Btn></div>
    </div>
  );
}
