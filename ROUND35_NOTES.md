# ROUND 35 — THE ANCHOR-CORRECTION SAWTOOTH (2026-11-28)

User: "vẫn giật lắm nhé" after Round 34. New instrument built for
this round: `~/workspace/boottest/rig-jerk.mjs` — weak profile
(SwiftShader + CPU throttle 4×, 1920×1080), local mode, 60 s per
game, records EVERY rAF delta, in-play longtasks, and the rendered
trajectory of three bot blobs; reports frame-gap distribution plus
a trajectory jerk metric (RMS 2nd difference + velocity sign
reversals) that fps counters cannot see.

## Baseline measurement (Round 34 build)

- day-ra: frames clean (median/p99 16.7/16.8 ms, 3 gaps >34 ms in
  60 s, 1 longtask 56 ms) BUT bot trajectories reversed direction
  **655–886 times per 60 s (11–15×/s)**, jerkRMS 8.5–11.5 px.
- xe-tank: jerkRMS 0–0.9, reversals 0–3 (tanks slow/mostly still).
- ne-dan: jerkRMS ~1.0, reversals ~11 (blobs roam slowly).
- Amplitude tracks the mover's per-tick displacement — fast movers
  judder, slow movers don't.

## Ground truth (engine-only, /tmp/gt-jerk.mjs)

Day-ra sim path, linearly interpolated to 60 Hz (the best any
snapshot renderer can draw): jerkRMS 3.8–5.2 px, reversals 24–35
per match (~1/s). The page was reversing 20–40× more often than
the true path — the renderer was injecting the oscillation.

## Root cause

In `moveEl` (src/page.mjs), the non-predicted branch stored the
anchor-arrival correction as `corr = e.x − (tx + vx·age)` — always
measured against the anchor's EXTRAPOLATED endpoint. Whenever the
render instant sat INSIDE the interpolation window (any engaged
render delay, i.e. the whole server path since Round 32, and any
late frame), `e.x − tx` is not an error — it is the not-yet-
travelled remainder of the segment. Every anchor arrival (16/s)
therefore knocked the mover back by up to a full tick of travel
and the 85 ms spring let it surge forward again: a 16 Hz sawtooth
whose amplitude is the mover's per-tick displacement. Exactly the
measured signature (reversal rate ≈ anchor rate; amplitude ∝
speed; fps untouched).

## Fix

`moveEl` now evaluates the NEW segment at the render instant —
piecewise: before atP → (px,py); inside [atP, atS] → lerp; past
atS → extrapolate with the capped age — and stores
`corr = e.x − segment(rt)`. The correction is now a genuine path
discontinuity only (teleports still snap via the >3u branch;
predicted movers untouched).

A one-tick local render-delay floor (70 ms) was tried FIRST and
measured WORSE (reversals 746–1333) — with the corr bug present,
delay made the knock systematic. After the corr fix, delay 0 and
delay 70 both sit at the floor, so the floor was REMOVED (no added
input lag in non-predicted games). A comment in rafLoop records
this so the floor is not re-added.

## After (same instrument, final build)

- day-ra: reversals **7/13/12** (floor config) and **12/3/15**
  (no-floor config) per 60 s — at the true-path floor. Best frame
  run: 3600 frames, median/p90/p99 16.7/16.7/16.8, max 33.3 ms,
  0 gaps >34 ms, 0 longtasks.
- ne-dan: 3596 frames, max 33.4 ms, 0 gaps >34 ms, 0 longtasks;
  jerkRMS ~1, reversals 6–17 (baseline-clean).
- jerkRMS stays ~8–12 px in day-ra — that residue is the sim's own
  shove corners (ground-truth raw path is 30–42 px), not renderer
  oscillation; the reversal count is the discriminative metric.
- Rig environment note: several runs showed a ~55 s-in disturbance
  (67 ms frame pattern with NO longtasks = renderer starved by the
  shared sandbox, not page code); it appears on pre-fix builds too
  and did not recur in the final runs.

## Regression battery

local-test 700, deep-drive 505/0, discrim PASS, laser 21/21,
chess 21/21, hostile 105/0; embedded page script node --check OK;
rig-local-all FLAGGED 0; rig-glitch 8 games: no overspeed, no
vanish, teleports only the legit ring-out respawn, ghosts only
by-design dead-blob dimming.

## Deploy

2026-11-28 ~11:31, deployment_id c6f25a230255447ba6613e6194b2740c,
build 3f79e20225, live sha256 3120e554… byte-identical to the rig
page; live quickstart probe OK (room 541942, xe-tank playing);
git commit 694e93f pushed.
