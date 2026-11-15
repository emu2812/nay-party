# Smoothness wave — notes (audit trail)

Base: working tree with uncommitted local-keyboard-mode changes (suite 638–639
assertions green, discrim green). This wave must not disturb that work.
No commit, no deploy from this agent.

## Step 0 — how time actually flows (read before designing)

### advance() / step() / steppers

- `advance(room)` (worker.mjs ~1426): calls `playlistAutoStart(room)`, then
  loops `step(room)` up to 40 times while it returns true.
- `step(room)` (~1446): returns false unless phase is 'playing' with a game.
  Countdown is handled here (wall-clock `endsAt` → `beginRound`). Otherwise it
  dispatches to one `stepX(room, t)` per game id, `t = now()` (Date.now).
- Every tick-based stepper (stepArena, stepDodge, stepSteal, stepCrown,
  stepSplat, stepShared, stepBox, stepTank, stepBomber, stepDefend,
  stepFight, stepTemple, stepSoccer, stepFrog, stepCannon…) has the SAME
  tick block shape:

  ```js
  if (t >= g.nextTickAt) {
    simulateXTick(room);              // exactly ONE tick
    g.nextTickAt += TICK_MS;          // TICK_MS = 125
    if (g.nextTickAt <= t) g.nextTickAt = t + TICK_MS;  // SNAP
    return true;
  }
  return false;
  ```

  Exact catch-up semantics today: when a caller arrives behind by k ticks
  (t − nextTickAt ≈ k·125ms, k ≥ 1), the stepper simulates **exactly 1 tick**,
  advances nextTickAt by 125ms, then — because it is still ≤ t — **snaps
  nextTickAt to t + 125ms, discarding the remaining k−1 ticks of sim time**.
  The stepper returns true; advance() calls step() again; the new nextTickAt
  is in the future so it returns false. Net: **per advance() call, a ticking
  game simulates at most 1 tick, however far behind it was.** Motion that
  "should" have happened during a late-alarm gap is skipped, so on the TV
  the world teleports — the judder source named in the task.
- Kéo Co is separate: `stepTug` uses TUG_TICK_MS = 500 with the same
  1-step-then-snap shape on its own schedule. Untouched by this wave.
- Phase timers (countdown, question/reveal windows, match ends) are all
  wall-clock `endsAt` compared against `t`; they do not depend on tick
  counts and are unaffected by tick catch-up policy.
- Callers of advance(): the Durable Object alarm handler (line ~858/867
  region: advance before/after dispatch), the WS message pipeline
  (advance → dispatch action → advance → save → broadcast), and the HTTP
  action pipeline (~5733/5750/5800/5803: same advance–dispatch–advance
  shape). So a pad action is always processed with the sim first advanced
  to "now", then advanced again after the pad is stored — a tick that is
  already due at dispatch time fires in the SAME request with the NEW pad.
  The residual onset delay is only the fractional remainder of the current
  tick: (nextTickAt − t) ∈ (0, 125ms].
- `_syncAlarm` (~789): arms the DO alarm at Date.now()+TICK_MS whenever a
  game (or a playlist intermission) is live AND ≥1 socket is connected;
  the alarm handler advances + broadcasts + re-arms. HTTP polling is the
  fallback driver when no socket is connected.

### How the tests drive time (decisive for Change 1)

Both harnesses replace Date.now with a fake clock (`now` variable,
`tick(ms)` advances it) and drive the real worker fetch API.

- discrim-check.mjs: measurements use `step125` — advance fake time in
  exactly 125ms steps with one state read per step, so the sim is never
  behind by ≥2 ticks during a measured segment: exactly 1 tick per
  advance() call, snap never fires. `pumpD` uses 250ms steps but only to
  REACH a phase (countdown is wall-clock; no ticking happens there).
  This is why the discrim expectations hold today:
  - Tank dx 5.330 = 16 ticks × STEP_X (1/3 u) over 2000ms of step125.
  - Bomb fuse 2000ms = 16 ticks of step125 loop iterations.
  - Crown +40/10s: approach + hold are driven in 125ms steps; the crown
    stepper banks +1 per 2 ticks survived (accumulator), 80 ticks → +40.
  - Temple run dx 5.200 = 16 ticks × 0.325 u at step125 cadence.
  None of these would be affected by catch-up that only fires when a
  stepper is behind by ≥2 ticks **within one advance() call** — discrim
  never creates that situation during measurements.
- tests/local-test.mjs: mostly the same 125ms discipline, BUT the
  deterministic Audit I (and several playX drives) deliberately use
  **250ms pump steps during live ticking games** and DEFINE one pump step
  as exactly one sim tick. See Change 1 below — this is the blocker.

## CHANGE 1 — catch-up stepping: **NOT DONE (blocked by the Step-0 gate)**

Prescribed design: when behind by k ≥ 2 ticks, simulate up to 4 ticks per
advance() call before snapping.

Step-0 finding: local-test.mjs's deterministic audits are hand-computed
against the CURRENT 1-tick-per-call semantics at 250ms pump cadence:

- `padTicks(drv, tok, pad, n)` (local-test ~697): each iteration sends a
  pad, advances fake time **250ms**, reads state once. The audit comments
  treat n iterations as exactly n sim ticks ("Right x8 ticks at 1/3 u/tick
  = 2.67 units"). That identity holds ONLY because each state read's
  advance() simulates exactly 1 tick and snaps the other 125ms away.
  At 250ms cadence the sim is behind by exactly k=2 ticks at every call,
  so the prescribed k≥2 catch-up would simulate 2 ticks per iteration:
  8 padTicks → 16 ticks → 5.33u instead of 2.67u.
- Concrete expectation that breaks: Audit I Sơn Sàn —
  "walking right 8 ticks owns exactly 3 cells" (cells are 1.6u wide;
  2.67u crosses 2 boundaries). At 16 ticks the blob travels 5.33u and
  owns ~5–6 cells. The assertion `counts[1] === 3` cannot survive, and
  the following hand-counted expectations (exactly 4 cells after 16 down
  ticks, exactly 10 after the 3×3 burst) cascade from it.
- Same pattern in `driveSeat` (250ms steps, per-tick deadband math) and
  the crown lockout re-grab drive (padTicks steps counted against
  CROWN_LOCK_TICKS).
- Independently: many full-match drives pump at 200/250/1000ms steps
  through bot matches whose bots draw Math.random per tick. Changing
  ticks-per-call changes the number of RNG draws before every assertion
  point, so exact placement/points assertions across the suite are at
  risk even where no hand-computed distance is involved.

Per the task's explicit gate — "If your Step-0 reading shows this design
would alter any existing test expectation, STOP that part, document why,
and keep current semantics (report it as not-done rather than forcing
it)" — Change 1 is **not implemented**. Current 1-step-then-snap
semantics are kept everywhere, including the test additions the task
listed for Change 1 (their premise — a 500ms gap yielding ~4 ticks —
is exactly the behaviour change the existing expectations forbid).
A controlled experiment confirming the mechanism on one stepper is
recorded below.

What WOULD make catch-up safe in the future (out of scope here): re-base
Audit I's drives to 125ms steps (2 state reads per current padTicks
iteration) so the harness's cadence matches the sim's, then enable
catch-up. That is a test-harness migration, not a tolerance change.

### Experiment log (Change 1 mechanism, one stepper, reverted)

Applied the prescribed catch-up loop (up to 4 sims per call) to
stepSplat ONLY and ran the full suite. Result: the suite aborts at
Audit I with —
`ASSERT FAILED: splat: walking right 8 ticks owns exactly 3 cells, got 4`
— exactly the hand-computed expectation identified above (the count is
4 rather than the ~5–6 estimated in the analysis because painting
records the cell occupied at each tick end; the mechanism — extra ticks
per 250ms pump step — is confirmed, not merely inferred).
The experiment edit was reverted immediately (stepSplat restored to the
1-step-then-snap form verbatim). Change 1 stays NOT DONE.

## CHANGE 2 — onset nudge: design from the steppers

Pad handler: `playerAction` (~5473). The branch validates the game id,
builds `np` (new pad), keeps `prev = g.pad[seat]` (previous stored pad),
handles Kéo Co / Chia Hay Cướp edges, then stores `g.pad[seat] = np`.
The nudge hooks in right after the store, inside this branch — local
keyboard seats flow through the same playerAction (hostDispatch →
playerAction), so they get it for free; forSeat behaviour untouched.

Pipeline fact that bounds the design: requests run advance() BEFORE
dispatch and again AFTER, so at dispatch time `g.nextTickAt > t` in any
live tick phase (a due tick was just simulated, or none was due). The
nudge covers only the fractional remainder:
frac = clamp(1 − (g.nextTickAt − t)/TICK_MS, 0, 1); skip when
g.nextTickAt <= t (a tick is somehow still due — the trailing advance()
will fire it with the new pad in this same request) or frac <= 0.

Trigger conditions (all must hold): game in the table below; g.phase is
that game's live play phase (this alone excludes 'countdown', whose
g.phase is literally 'countdown'); at least one DIRECTION bit
(u/d/l/r, !!-coerced) differs between prev and np; the sender's entity
exists and is alive; the new pad's direction vector (dx, dy) — computed
exactly as the steppers compute it, dx = r−l, dy = d−u — is non-zero.

Per-game movement facts (mirror, base step only — no dash ×3, no dash
cooldown side effects, no facing changes, no collisions/pickups/deaths):

| game | phase | entity | per-tick step (stepper) | bounds the stepper applies |
|---|---|---|---|---|
| day-ra | arena | g.blobs[seat] | STEP_X / STEP_Y via simulateTick (MOVE_STEP=0.25 → STEP_X=1/3, STEP_Y=3/16) | NONE — no positional clamp in the stepper; ring-out is evaluated at tick end. Nudge applies the raw fractional step, no clamp (mirrors the stepper); any ring-out is judged by the next regular tick from the nudged position. |
| ne-dan | dodge | g.blobs[seat] | STEP_X / STEP_Y (simulateDodgeTick) | clampRect (CLAMP_X=15.2, CLAMP_Y=8.2) |
| cuop-sao | steal | g.blobs[seat] | STEP_X / STEP_Y via applyMoves (collectMoves family) | clampRect |
| giu-vuong-mien | crown | g.blobs[seat] | STEP_X / STEP_Y via applyMoves; nudge ignores HOLDER_SPEED 0.9 (per task) | clampRect |
| son-san | splat | g.blobs[seat] | STEP_X / STEP_Y via applyMoves clampBox | x ∈ [−14.4, 14.4], y ∈ [−8, 8] (NOT clampRect) |
| xe-tank | tank | g.blobs[seat] | STEP_X / STEP_Y via slideCircle vs TANK_BLOCKS | nudge calls the stepper's own slideCircle(b, dx·frac, dy·frac, 0.8, TANK_BLOCKS, CLAMP_X, CLAMP_Y) — wall sliding + rect clamp identical to a tick; facing (g.facing) NOT touched (per task) |
| thu-thanh | defend | g.blobs[seat] | STEP_X / STEP_Y via moveBlobsWalled(walls=null) | clampRect |
| chung-mot-than | shared | g.shared (shared blob) | STEP_X / STEP_Y, summed per owned axis | clampRect + round to 2dp (as the stepper does) |

chung-mot-than ownership mirror (simulateSharedTick ~2461): each
direction has exactly one owner in g.owners {u,d,l,r}. The sender
contributes mx=+1 iff their pad ix>0 AND owners.r === seat; mx=−1 iff
ix<0 AND owners.l === seat; my likewise with d/u. The nudge computes
ONLY the sender's own contribution from the NEW pad (other players'
inputs are not re-applied — their ticks will move the blob), moves
g.shared by (mx·STEP_X·frac, my·STEP_Y·frac), clampRect, round 2dp.
The stepper also maintains b.vx/b.vy from displacement; the nudge
leaves vx/vy alone (the next tick recomputes them).

Excluded per task and re-verified in code: day-hop (crate needs ≥2
contact + intent sum — no clean single-player positional step),
nguoi-que / den-lua-nuoc / ech-op / da-bong (velocity physics —
platStep/ball integrator), can-goc (turn-based aim), keo-co (B-press
edges are already applied instantly in the pad handler), dat-bom
(grid walker with its own cell movement — not in the task's table),
all non-pad games.

One-off head start note: the nudged displacement (< 1 step, ≤ 1/3 u)
is NOT subtracted from the next tick — the next regular tick moves a
full step from the nudged position. That is the task's intended
semantics ("a one-off head start of <1 step").

## CHANGE 2 — implementation record

- `padNudge(room, seat, prev, np, t)` added just above playerAction;
  called from the pad branch immediately after `g.pad[seat] = np;`
  (the single funnel for phone pads, WS pads and local-seat forSeat
  pads — local mode untouched, forSeat behaviour identical).
- Guards, in order: game in NUDGE_PHASES and g.phase === the game's
  live phase ('countdown' excluded by construction); nextTickAt must
  exist and be > t (a still-due tick is left to the trailing advance);
  frac = clamp(1 − (nextTickAt − t)/125, 0, 1) must be > 0; at least
  one direction bit (!!-coerced) changed vs the previous stored pad;
  the new direction vector must be non-zero (for chung-mot-than: the
  sender's OWNED-axis vector must be non-zero).
- Per game: day-ra raw fractional step, no clamp (mirrors stepper);
  ne-dan / cuop-sao / giu-vuong-mien (holder ×0.9 ignored) /
  thu-thanh: step × frac then clampRect; son-san: step × frac then
  clamp to x ±14.4, y ±8; xe-tank: slideCircle with the fractional
  displacement (walls + clamp identical to a tick, facing untouched);
  chung-mot-than: shared blob by the sender's owned axes only,
  clampRect + 2dp rounding like the stepper.
- No other state is written: padPrev, dash/fire cooldowns, facing,
  vx/vy, grids, stars — all left for the next regular tick.

## CHANGE 3 — TV client damping

- Found: `var RAF_TAU = 55;` in the page's rAF interpolation section
  (~line 7980). The loop eases with k = 1 − exp(−dt/RAF_TAU); the
  slowmo variant uses RAF_TAU × 6 (preserved automatically); first
  placement snaps in moveEl (untouched).
- Change: RAF_TAU 55 → 40. (Easing converges ~27% faster; the
  extrapolation lead of up to 1.6 ticks is unchanged, so the tighter
  tau reduces trailing without giving up the lookahead.)

## Test results

- Full suite: **ALL TESTS PASSED — 651 assertions** (base 639 from the
  local-mode tree + 12 new nudge assertions; zero pre-existing
  assertions changed, removed, or re-toleranced). New assertions:
  day-ra frac movement (observed 0.170 vs predicted 0.165 — the delta
  is the views' 2dp rounding, inside the ±0.02 band), button-only
  no-op, same-direction no-double-nudge, no countdown nudge (first
  tick moves exactly one step, 0.330), da-bong exclusion (no movement
  in-request; stored pad drives later ticks), son-san paint-box clamp
  at the wall (x stays 14.4), chung-mot-than non-owner no-op and
  owner step×frac on the shared blob (0.170 vs 0.165).
- discrim-check.mjs: all checks PASS with unchanged numbers — tank
  dx 5.330, bomb fuse exactly 2000ms, crown +40, stickman apex 4.20 /
  air 1875ms, temple apex 3.15 / air 1750ms, temple run dx 5.200.
- The Change-1 experiment (stepSplat catch-up) was run and reverted
  BEFORE these final runs; the final tree's stepSplat is the original
  1-step-then-snap form (Audit I is green again, which pins it).

## Summary for the parent

- Change 1 (catch-up stepping): NOT DONE — blocked by the task's own
  Step-0 gate; mechanism proven by a reverted one-stepper experiment;
  full reasoning + the future unblocking path (re-base Audit I drives
  to 125ms cadence) in the Change 1 section above.
- Change 2 (onset nudge): DONE for all 8 tabled games, with tests.
- Change 3 (RAF_TAU 55 → 40): DONE.
- Files touched by this wave: worker.mjs (padNudge + hook + RAF_TAU),
  tests/local-test.mjs (one appended audit section), this notes file.
  Nothing committed, nothing deployed.

---

# Catch-up stepping — DONE (2026-11-14, follow-up wave)

Change 1 is now shipped in the working tree (not committed, not
deployed — the parent handles shipping). The Step-0 blocker from the
previous wave is removed exactly along the path it predicted: the
harness was re-based to a <=125ms fake-time cadence FIRST and proven
bit-identical under the old advance(), and only then was catch-up
enabled. Final state: **659 assertions green** (651 migrated + 8 new
Audit W), **discrim 7/7 with identical numbers**.

## Part 1 — harness migration (tests only; worker.mjs untouched)

Key insight the migration rests on: the harness defines tick-counting
drives as "1 pump iteration = exactly 1 sim tick". That invariant
survives re-basing IF each iteration still presents the sim with
exactly one due tick — which a 125ms step does (the iteration's own
state read fires the 1 tick). Subdividing a 250ms step into
125+read+125 would fire TWO ticks per iteration and double every
hand-computed distance; that is why tick-counting drives were
re-based (step changed, iteration count unchanged, total fake time
per segment halved — fake time is free) while pure WAITS were
subdivided with the new helper `advanceMs(read, ms)` (<=125ms steps
with a state read after each; total fake time unchanged). Phase-reach
pumps (pump/pumpD) were re-based to a 125ms step with the until-check
still attached to EVERY step — never subdivided with discarded
intermediate reads, because a pump must return at the anchoring read
(the quiz speed bonus depends on answering at the anchor instant;
a discarded read could have stolen the anchor 125ms early). Where a
match-to-results pump's iteration cap encoded a fake-time BUDGET,
caps were scaled by oldStep/125 to preserve the budget.

Re-based (step -> 125ms, iterations unchanged): `pump`/`pumpD`
call sites (27 + 112 in local-test.mjs, 6 in discrim-check.mjs —
discrim's 250ms pumps only reach phase begins and all its
measurements are relative, so its numbers are untouched);
`padTicks` (Audit I's core drive — THE blocker from the previous
wave), `driveSeat`, `leg`, `legQ`, `step2U` (header comment updated),
the Audit I splat spawn tick (tick(250) -> tick(125): fires exactly
tick 1, which the grid assertions pin), the tank bot-smoke loop
(40 iterations = 40 ticks), the bomber chain loop and placement
blast loop (iteration count = tick count vs the 16-tick fuse), the
stickman double-jump minY sampler, the fight chase loop, the
ring-out loop (all 3 tick sites), the temple bot drive (240
iterations = 240 ticks), Audit Q's frog minY sampler, the frog bot
carry loop.
Waits subdivided via `advanceMs` (total time unchanged): playArena /
playDodge held-pad 6x500ms -> 3000ms, playSplat 8x1000ms -> 8000ms,
Audit M's two 250ms ticks -> 500ms, Audit V's pf 500ms idle.
Caps scaled to preserve fake-time budgets: main-match results pumps
300->2400; Audit I results pumps 400->800; bomber cap 500->1000;
impostor discuss 200->800; shared/box 200->400; wolf pumps
6000->16000 and 600->1000; ngua 100->400 and bot-game 30000->60000;
soccer results 600->2400, idle loops 600->2400 / 900->3600 (with
their tick(500) -> tick(125)); cannon results 4000->16000; fight
4000->8000; 8-seat splat 4000->8000; Audit V arena results 300->2400.
(duelToResults' internal 2000 cap left alone: a duel is ~320
iterations at 125ms, ample.)
KEPT jumps — deliberately NOT subdivided, each because the target
stepper is wall-clock-only or the jump's atomicity is the point:
playChia tick(60000)x3 (stepChia has no tick block; subdividing
would shift the choose-phase anchor quantization), impostor audits
tick(45000)x4 (stepImpostor wall-clock), Audit J4 tick(61000) and
J5 tick(76000) (stepShared/stepBox check endsAt BEFORE their tick
branch — the jump crosses endsAt atomically and freezes the check
counters; subdividing would run them away ~+1/tick), decode
tick(80000) + tick(1600) levelup skip (stepDecode wall-clock; its
levelup branch checks endsAt before the decodeAt transition),
playlist tick(8100)/tick(9000) (room in 'results', step() no-ops,
auto-start is wall-clock), the two 6h TTL jumps (no live game),
rowing pressAt jumps + the final exact-landing tick (stepRow
resolves beats from absolute t; presses must land at exact beat
times). Already-conformant and untouched: tick(62)/tick(10) offsets,
all tick(125)/pump(100) sites, the whole nudge section.

PROOF (worker.mjs still the live 8d37f20 build): suite **651
assertions green — same count**, discrim numbers identical (tank
5.330, bomb fuse 2000ms, crown +40, stickman 4.20/1875ms, temple
3.15/1750ms, run 5.200). Suite wall time grew ~11s -> ~29s from the
finer read cadence; expected and harmless.

## Part 2 — catch-up stepping (worker.mjs)

The snap lives inside each stepper's tick block (there is no single
choke point in advance()), so the transform was applied per stepper
— 16 tick blocks: stepArena, stepDodge, stepSteal, stepCrown,
stepSplat, stepShared, stepBox, stepTank, stepBomber, stepDefend,
stepFight, stepTemple, stepSoccer ('soccer' phase), stepFrog
('frog' phase), stepCannon 'shell', and stepCannon 'aim' (not a
simulate block: the current player's held pad applies once per
missed tick, up to 4 — exactly what 4 on-time ticks would do;
padPrev is updated after the first sub-tick, so the A-fire and
X-flip edges still fire exactly once; a fire returns immediately,
as before). stepTug's TUG_TICK_MS block is byte-untouched, as are
stepRow (absolute-time beats), stepChia/stepImpostor/stepWolf/
stepNgua/stepDecode (wall-clock), stepDuel, stepQuiz, and the
soccer 'goal' / frog 'frogClear' / cannon 'boom' wall-clock
branches.

Canonical block (per stepper, phase name and simulate fn vary):

    if (t >= g.nextTickAt) {
      let nCU = 0;
      while (nCU < 4 && t >= g.nextTickAt && g.phase === PH) {
        simulateXTick(room);
        if (room.game !== g) return true; // the tick ended the game
        g.nextTickAt += TICK_MS;
        nCU++;
      }
      if (g.nextTickAt <= t) g.nextTickAt = t + TICK_MS; // resync rest
      return true;
    }

Exact accounting:
- Per advance() call, at most **4 sim ticks total**. advance()'s
  step() loop can only re-enter the same stepper after its block,
  and the block always leaves nextTickAt in (t, t+125] (after the
  last simulated tick, or via the snap), so no second tick block
  can fire ticks within the same call; step() dispatches to exactly
  one stepper per iteration and any post-tick phase transition the
  loop reaches next is a wall-clock branch (countdown flip, goal
  kickoff, frogClear, boom), never another tick block.
- Behind by 0: block not entered. Behind by 1: the while body runs
  exactly once and the snap condition is false — **bit-identical**
  to the old code (this is what kept the migrated 651 green with
  zero assertion changes after Part 2 landed).
- Behind by k in [2,4]: all k ticks simulate; no snap.
- Behind by k > 4 (e.g. a 60s gap, k=480): exactly 4 ticks
  simulate, the remaining backlog is discarded by the snap
  (nextTickAt = t + TICK_MS). **No spiral, ever** — one call never
  does more than 4 ticks of work.
- The phase guard (g.phase === PH) stops the loop the moment a
  tick transitions the phase (soccer goal, frog chamber clear,
  shell impact); advance()'s next step() call re-dispatches,
  identical to the old one-tick-per-call flow.
- endsAt is still checked BEFORE the tick block with call time t,
  so catch-up ticks never run past a match end; all phase timers
  (countdown, question/reveal, turn timers) remain wall-clock
  endsAt and are untouched.
- stepShared keeps its original mid-tick `room.game !== g` early
  return (hearts-out) inside the loop; the other steppers gained
  the same guard (a tick can end the game via finishArena etc.) —
  observable state is identical to the old code, which wrote
  nextTickAt onto the detached game object and returned true.

Alarm findings (_syncAlarm / poke interplay): NO change needed.
_syncAlarm arms the DO alarm at Date.now() + TICK_MS only when a
game (or a playlist intermission) is live AND >=1 socket is
connected AND no alarm is currently set; the alarm() handler
advances, broadcasts, and re-arms via _syncAlarm. Because every
tick block above guarantees nextTickAt is never left in the past
after a step() call (the snap), the alarm can never be armed for a
past instant, and there is no "still behind, continue later" state
to schedule: any backlog beyond 4 ticks is intentionally discarded
by the snap, so the +125ms alarm cadence remains exactly right.
HTTP pokeRoom() paths inherit the same guarantee.

## Part 3 — Audit W (8 new assertions, all passing)

(a) day-ra, 2 humans, pad held left from an exact tick boundary
(nudge frac 0 by construction): one tick(500) jump + one read moved
the blob **-1.33** = exactly 4 ticks (old semantics: -0.33).
(b) Same room, one tick(10000) jump: movement **-1.34** (bounded to
4 ticks, blob alive, phase still 'arena'); the next tick(125) step
moved exactly **-0.33** = 1 tick — proves nextTickAt was snapped
into the future and the sim resynced instead of staying behind.
(c) Countdown integrity: +500ms in one call mid-countdown leaves
the phase untouched; still 'countdown' at start+2999ms; flips to
'arena' at exactly start+3000ms — the wall-clock deadline did not
move by a single tick.
(d) Regression: day-ra at max seats (1 human + 7 bots) driven with
a 500ms single jump injected every 20 steps (20 gaps over the
match) reaches 'results' with placements exactly
[300,200,100,50,40,30,20,10] — no stuck phase, no error.

## Test results (final tree)

- tests/local-test.mjs: **ALL TESTS PASSED — 659 assertions**
  (651 pre-existing, zero changed/removed/re-toleranced, + 8 Audit W).
- tests/discrim-check.mjs: **7/7 PASS, numbers identical** (tank
  5.330, bomb fuse 2000ms, crown +40, stickman 4.20/1875ms, temple
  3.15/1750ms, temple run 5.200).
- Files touched: worker.mjs (16 catch-up tick blocks),
  tests/local-test.mjs (harness migration + Audit W),
  tests/discrim-check.mjs (6 pump steps 250->125), this notes file.
  Nothing committed, nothing deployed.

## SMOOTH3 — tick 125ms -> 62.5ms, dead reckoning by time, faster HTTP fallback (2026-11-15)

Context: after the perf wave (4324372) the user still reported heavy
lag ("vẫn lag lắm"). Parent measurements: WS push cadence p50 125ms
(the tick itself), extrapolation capped at 200ms (any push gap froze
movers mid-glide), HTTP-fallback clients polling at 220ms. This wave
attacks all three. No commit, no deploy from this agent (parent ships).

### Part 1 — TICK_MS 125 -> 62.5

Rescale rule by quantity class (this is the part that bites):
- velocities / per-tick displacements: HALVE.
- per-tick counters (fuses, cooldowns, invulnerability, spawn
  intervals in ticks, brain cadences): DOUBLE.
- per-tick FRICTION FACTORS (multiplicative decay): sqrt-rescale,
  f' = sqrt(f), so decay per second is preserved.
- per-tick PROBABILITIES in every-tick bot brains: p' = 1 - sqrt(1-p).
- ACCELERATIONS (gravity-like, anything whose per-second effect is
  x / T^2): QUARTER. Two places got this wrong in the first draft
  and were caught by tests, not by eye:
  * BALLISTICS (can-goc): grav 0.10 -> 0.025, windK 0.003 -> 0.00075
    (maxV is a velocity -> halved to 0.8; sub stays 4). With grav
    merely halved, the shell range v^2/g halved and the snipe
    solver (which mirrors the export) found no damaging solution
    in 3 fresh rooms — the failure that exposed it.
  * Frog crate glide decrement: 0.03 -> 0.0075 (release speed is
    FROG_RUN, halved; glide distance v^2/2a needs a quartered).
    The 0.015 stop threshold is a velocity and halved normally.
- Platformer gravity/jump: NOT the naive rule. With
  gravity-before-move (semi-implicit Euler), apex/air are set by
  m = V/G. The 125ms arcs were family A (m integer: apex
  G*m(m-1)/2, air 2m-1 ticks). Halving the tick needs air in ticks
  to DOUBLE (even), so the new arcs are family B (m = k+0.5:
  apex G*k^2/2, air 2k ticks), with V nudged -0.0003 so the fall
  penetrates ~0.009u on the exact return tick instead of depending
  on float dust to land. Per-game gravities at the platStep call
  sites: FIGHT_GRAV 0.0373333 (apex 4.20, air 30 ticks = 1875ms),
  TEMP_GRAV 0.0321429 (temple + frog + crates; apex 3.15, air 28 =
  1750ms), SOCCER_GRAV 0.0357143 (apex ~3.50, air 28 = 1750ms, the
  old soccer arc). FROG_JUMP_CARRY = 19.5*TEMP_GRAV - 0.0003: air
  exactly 38 ticks, carry range 38 * 0.1625 = 6.175u — unchanged,
  which is what the frog spike strips (5.2u / 4.9u) are sized
  against. PLAT_MAXFALL 1.3 -> 0.65 (shared).
- Catch-up cap 4 -> 8 in all 16 tick blocks (same 500ms coverage).
  _syncAlarm already arms at Date.now()+TICK_MS, so the DO alarm
  now fires ~16x/s during play with no change. stepTug untouched
  (own 500ms cadence). All *_MS durations and wall-clock bot timers
  unchanged. padNudge unchanged (its fraction derives from TICK_MS).

Per-game inventory (constants/sites touched): arena MOVE_STEP
0.25->0.125 (STEP_X/STEP_Y derive), DASH_CD 24->48, SHOVE_CD 12->24,
DASH_BOOST 2->4 ticks, ring shrink %16->%32; dodge BALL_SPEED
0.2875->0.14375, INVULN 16->32, spawn reset re-derived
max(24, 56-2*floor(tc/192)), setup spawnIn 12->24; crown accumulator
threshold 2->4 ticks (the +1-per-250ms hold), CROWN_LOCK 8->16;
steal GOLD_EVERY 96->192, DROP_LOCK 4->8, STAR_STALE 120->240;
splat PAINT_CD 16->32; shared SHARED_BALL_SPEED 0.2->0.1, spawn
reset max(40, 64-2*floor(tc/384)), spawnIn 10->20; tank SHELL_SPEED
0.6->0.3, SHELL_CD 8->16; bomber BOM_FUSE 16->32 ticks (= 2000ms);
defend spawn formula via DEF_MS/TICK_MS (follows automatically),
big-slime gate tick 160->320, slime speeds 0.14->0.07 / 0.09->0.045,
spawnIn 8->16; bot brainCadence de/vua/kho 4/8/12 -> 8/16/24 (all
three copies); fight FIGHT_RUN 0.34->0.17, ATK_CD 6->12, HITSTUN
6->12, HVY_CD 10->20, HVY_ATK_T 6->12, DASH_CD 16->32, DASH_TICKS
6->12, DASH_SPEED 0.95->0.475, knockback force 0.3+dmg*0.025 ->
0.15+dmg*0.0125, atkT literal 4->8, friction sqrt-rescaled (0.775->
0.8803, 0.938->0.9685, 0.927->0.9628, 0.985->0.9925, 0.742->0.8614,
0.949->0.9742), per-tick brain probabilities sqrt-rescaled; soccer
SOCCER_RUN 0.36->0.18, KICK_CD 6->12, KICK_VX 0.88->0.44, KICK_VY
0.62->0.31, DASH_CD/TICKS/SPEED as fight, ball grav 0.09->0.0225
(x0.25), ball friction x0.94->x0.9695 (sqrt), contact/header/kick
velocities halved, bot ball prediction x4->x8 ticks; temple
TEMP_RUN 0.325->0.1625, bot holdBtn timeout 240->480 ticks, frog
bot swallow timeout 160->320 ticks; frog FROG_RUN 0.325->0.1625,
spit vx 0.5->0.25 / vy -1.0->-0.5, crate glide (above); cannon aim
sweeps angle 2.5->1.25 deg/tick, power 3->1.5/tick, shell trail cap
40->80 points. SHOVE_FORCE 2.7 / STEAL_SHOVE_FORCE 4.5 unchanged
(one-shot displacements, not per-tick motion). HOLDER_SPEED 0.9
unchanged (multiplier). BOX_STEP_MUL follows MOVE_STEP.

### Temple level geometry — one forced change

The two mid-floor side pools shift 0.4 toward the centre (blue
-9.3 -> -8.9, red 6.9 -> 6.5; widths/kinds/bottom pools unchanged).
Reason: at 125ms a jump off the mid floor beside a gate slab
cleared BOTH the slab's head-bonk shadow and the pool's feet band
in one tick (x-step 0.325, first-tick rise 0.90; slab margin was
0.015). At 62.5ms (x-step 0.1625, first-tick rise 0.434 < the 0.45
band depth) NO takeoff position satisfied both — tick 1 needed
x >= 9.55 (pool) and x <= 9.45 (slab) at once — so that jump was
flatly impossible. The shift reopens a 0.3u takeoff window. The
slabs could not move instead: 0.4 further out they overlap the
balcony stairs. Related micro-difference, accepted: a takeoff from
the very lip of any pool (feet box already overlapping the pool's
x-range) now dies on tick 1, where 125ms cleared the band in one
tick; taking off >= ~0.2u back (as the bots do, jumping >= 0.75
ahead, and as a running player does) is unaffected.

### Part 2 — dead reckoning by time (client)

rafLoop lead is now a TIME budget: TICK_MS_CLIENT = 62.5 mirrors
the server tick; lead = clamp(elapsedMs / 62.5, 0, 400 / 62.5)
ticks (was elapsed/125 capped at 1.6 ticks = 200ms). Normal flow
unchanged (elapsed ~62ms -> lead ~1); during push gaps a mover now
glides on its last velocity for up to 400ms instead of freezing at
200ms. No velocity decay added; the existing tau-40 exponential
correction absorbs the snap-back. Shells/slimes/balls share the
moveEl path and get the same treatment.

### Part 3 — HTTP fallback poll

Play-phase fast poll 220ms -> 120ms (the end-of-script interval;
three comments updated). The WS-open safety poll is untouched
(900ms during play / 2000ms otherwise). The unrelated 220ms
setTimeout for the button-press animation was NOT touched.

### Harness migration (tests/)

- discrim-check.mjs: drives re-based to 62.5ms steps (iteration
  caps that encode time budgets doubled). EXPECTATIONS UNTOUCHED.
- local-test.mjs: advanceMs subdivides at 62.5; padTicks runs 2n
  half-steps so n keeps its pre-SMOOTH3 meaning; tick-exact drives
  re-based case by case. Notable re-derivations: crown pickup read
  window (holder takes one 0.15-speed tick before the read);
  Audit J2 position tolerances 0.05 -> 0.09 (the sim rounds blob
  positions to 2dp per tick; over a 16-tick drive the rounding
  drift reaches 16*0.005 = 0.08 — travel per second unchanged);
  Audit J5 box delivery drive rewritten (route one player at a
  time with axis-only pads — diagonal intent has magnitude
  sqrt(2) >= 1.2, so a lone diagonal pusher moves the crate; lanes
  assigned dynamically by current side because the fixed lanes are
  1.42 apart, inside the 1.6 separation distance); fight/xy 250ms
  jump read y 1.65 -> 1.66 (four ticks of the family-B arc);
  temple drives re-choreographed around the shifted pools and the
  lip-takeoff window (approach thresholds 9.9 -> 9.55, green-pool
  takeoffs at 2.15, Lua's return = walk to -5.5 + one jump instead
  of two full jumps); leg() gained a guard that evaluates until()
  before declaring a vanished game (legs that wait for the results
  phase have game == null legitimately).
- deep-drive.mjs: unchanged — it drives at 125ms steps, which under
  catch-up stepping is exactly 2 ticks per step, deterministic.

### Verification (all local, this agent)

- Suite: ALL TESTS PASSED — 803 assertions (was 802; +1 from the
  migration). Discrim: 7/7 with the IDENTICAL numbers (tank 5.330,
  bomb fuse 2000ms, crown +40, stickman apex 4.20 / air 1875ms,
  temple apex 3.15 / air 1750ms, temple run 5.200). Deep-drive:
  630 checks, 0 failures.
- Rig fps2 (rig restarted on the new worker): lobby 52.7, day-ra
  play 55.3 fps (frames >50ms 0.9%), no-anim ceiling 58.3 — no
  regression vs the perf wave's 56.4.
- Rig smoothness (new boottest/rig-smooth.mjs; rig has no WS, so
  the page runs the 120ms HTTP fallback — the stress path): 563
  in-play frames over 10s of bot day-ra, ONE freeze run total,
  longest 17ms, ZERO runs over 250ms.
- Cadence note: the suite drives rooms by repeated 62.5ms steps
  throughout (advanceMs / padTicks / legs), so state changing at
  the 62.5ms cadence is covered implicitly by every audit above.
  Live-link cadence verification is the parent's post-deploy job.
