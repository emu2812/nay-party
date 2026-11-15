# PERF NOTES — smoothness wave (2026-11-15)

User report: "lag quá, game không mượt tí nào" on the build at commit
7d3c150. Parent diagnosis (trusted, not redone): WS push cadence is
healthy (p50 gap 127ms); the frame killer is the page itself — rig fps
isolation showed day-ra play at 25.6 fps with all decorative CSS
animations live vs 57.8 fps with them all disabled. This wave removes
that client-side cost without touching TICK_MS, physics, rafLoop /
RAF_TAU, padNudge, catch-up, viewSig, or any game rule. Discrim
numbers identical (7/7).

## 1. Perf mode — decorative infinite animations pause during field play

render() now toggles a `perf` class on #app alongside the playhud
toggle, for BOTH roles, when phase==='playing' && FIELD_GAMES[game.id]
(the home branch removes it together with playhud).

Complete inventory of `infinite` animations in the stylesheet
(grep `infinite` + every @keyframes; `animation-iteration-count`
longhand: none anywhere):

| Selector | Animation | Animates | In perf mode |
|---|---|---|---|
| .blobbob | bob 2.6s | transform | PAUSED |
| .tpool | poolGlow 1.1s alt | **filter: brightness** | PAUSED |
| .tpool::after | poolShine 3.4s | transform/opacity | PAUSED |
| .tgem i | gemBob 1.5s alt | transform | PAUSED |
| .ffly | starBob 1.3s | translate/scale | PAUSED |
| .abomb | bombPulse .5s alt | scale | **RUNNING (whitelist)** |
| .pip.now | ringPulse .6s alt | **filter: brightness** | PAUSED |
| .aring.danger | ringPulse .5s alt | **filter: brightness** | PAUSED |
| .astar | starBob 1.6s | translate/scale | PAUSED |
| .acrown | starBob 2s | translate/scale | PAUSED |
| .agoal | ringPulse 1.1s alt | **filter: brightness** | PAUSED |
| .crownglow | crownPulse 1.5s alt | transform | PAUSED |

Filter-animating infinites: exactly two keyframes — ringPulse
(.pip.now, .aring.danger, .agoal) and poolGlow (.tpool). Verified no
others exist.

Kept running, by explicit re-assertion under #app.perf:
- .abomb / bombPulse — the pulse IS the fuse signal in Đặt Bom.
- .awarn / warnPulse — incoming-fire warning in Né Đạn (its animation
  is actually `warnPulse .28s ease-in-out 2`, finite, so it was never
  in the pause set; the running rule documents/guards the intent).

One-shot feedback untouched: pop, cdPunch, boomPop, spawnPop,
trailFade, shakeA/shakeB, fieldPulse (.afield.pulse is a one-shot
.22s class-triggered pulse, NOT infinite — the parent brief's
"fieldPulse forever" does not occur in this build), fall (confetti,
final screen only).

Note: .afield itself carries no infinite animation in this build; the
giant always-repainting elements were the ring (filter) and the
temple pools (filter), both now frozen mid-animation during play —
their static look (border colour, box-shadow glow) is unchanged.

Rig proof (rig-perf-shot.mjs): during day-ra play #app has .perf;
a probe .astar computes animation-play-state: paused; a probe .abomb
computes running.

## 2. Ring repaint — transform scale instead of width/height

.aring previously resized via style.width/height % every patch with a
.5s linear width/height transition: a 3px-bordered, triple-shadowed
circle up to ~1400px wide repainting continuously as it shrinks.

Now: day-ra / ne-dan rings carry a new `dynring` class (100% x 100%
fixed basis) and patchPositions sets
`transform: translate(-50%,-50%) scale(arenaR * 25 / 300)` — scale is
exactly (arenaR * 25/3)% / 100, the old percentage diameter over the
full-field basis. The width/height transition is removed from .aring;
the 125ms patch cadence steps the shrink. The host HTML also stamps
the initial scale inline so the first frame is already correct.

Scope guard: cuop-sao and giu-vuong-mien also render an #aring, but
theirs is never sized by any code (patchPositions' ring line only
runs for day-ra/ne-dan) — the fixed basis therefore applies ONLY via
.dynring on the day-ra/ne-dan rings; the other rings' markup and
rendering are byte-identical to before. The static decorative rings
(thu-thanh / chung-mot-than, inline 95%/91.1%) are untouched (inline
styles win over the class rule anyway).

One honest delta: the ring's 3px border and shadow blur scale with
the transform (at arenaR 4 the border renders ~1px instead of 3px).
The diameter mapping itself is exact — rig proof at arenaR 9.5:
ring rect 1120x630 vs formula-expected 1120x630 (diff 0 / ~0 px).

## 3. Slim state during play

buildView ships `games: []` while room.phase === 'playing'; the full
25-game catalog returns in lobby/choosing/results/podium/final.

Client reads of the catalog, audited before the change (grep v.games
/ S.view.games / gameMeta over the whole page script):
- hostHTML chooser loops + playlist chips — lobby/choosing only.
- gameMeta() — null-guards a missing/empty catalog.
- Click handlers startLocked / plToggle (via gameMeta) and plRandom /
  plAll (direct S.view.games reads) — those buttons exist only in the
  choosing UI, so the handlers can only fire while the catalog ships.
- Nothing in any playing-phase path (host stage, player page, local
  panels, my-seat) reads the catalog; in-game headers use v.game.name.
So no client change was needed.

Suite: new Audit P pins the contract (lobby 25 / playing host 0 /
playing player 0 / choosing again 25). One existing test read the
catalog from a startGame (playing) response — Audit X's registry-meta
assertion; it now reads the lobby view instead (same data, correct
phase). Test-side only.

Payload (rig API, host view, 1 phone + 1 bot, do-vui):
- before: lobby 4,172 B · playing 4,351 B (25 games inside)
- after:  lobby 4,172 B · playing 643 B (games: [])
- delta during play: **-3,708 B** (the catalog JSON itself; the
  parent's ~2.2KB estimate was conservative — Vietnamese desc strings
  are long). Exceeds the ~1.8KB target.

## 4. Stall recovery — tighter safety poll while playing

poll()'s WS-open gate was a flat 2000ms. It is now phase-aware inside
the same function (no new timers): 900ms while S.view.phase ===
'playing', 2000ms otherwise, both roles. A stalled push channel now
freezes the screen for under a second before the safety poll pulls
fresh state; when the socket is closed the gate never applied anyway.

## Verification numbers

- Suite: ALL TESTS PASSED — 801 assertions (798 + 4 Audit P, ±1
  pre-existing wobble). Discrim: 7/7, numbers identical. Deep-drive:
  629 checks, 0 failures.
- rig-fps2.mjs (1600x900, no throttle), day-ra with 2 bots:
  - lobby: 52.6 → 52.8 fps (unchanged, as expected)
  - **day-ra play: 25.6 → 56.4 fps; frames >50ms: 10.8% → 0.7%**
  - play with ALL animations killed (ceiling reference): 57.8 → 58.0
    fps — perf mode now sits ~1.6 fps under the no-animation ceiling.
- rig-fps.mjs at CPU throttle 4: **play 53.8 fps**, frames >50ms 0.9%
  (target was >= 40).
- Visual: ~/workspace/rig/perf-dayra.png — neon stage unchanged:
  glowing cyan ellipse ring at the exact size, glowing orbs, HUD and
  rule pill in place, screenshot taken mid-play with perf mode on.

Not changed (per brief): TICK_MS, physics constants, rafLoop/RAF_TAU,
padNudge, catch-up stepping, viewSig contents, game rules.
