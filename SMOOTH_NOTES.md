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
