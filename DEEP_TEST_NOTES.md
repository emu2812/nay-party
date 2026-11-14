# Deep-Test Pass — Nảy Party (all 25 games + modes)

Date: 2026-11-14 (late evening, +07). Base: working tree with the
uncommitted catch-up / keyboard-flexibility / Tiến Lên / phone-mode
waves on live HEAD 8d37f20. Nothing committed, nothing deployed.
Deliverables of this pass: Part A hardening in tests/local-test.mjs,
the new sweep in tests/deep-drive.mjs (630 checks), and these notes.

## Headline result

- **No product bug found.** worker.mjs is untouched by this pass.
  The countdown-view crash family (ke-gia-mao at 645aa3e, ma-soi
  phone view) does NOT recur anywhere: all 25 games × 3 room shapes
  served clean countdown views. All 50 matrix matches (25 games ×
  min/max seats) reached results with zero 'Lỗi máy chủ' strings.
- **Three test-side fixes** (details below): the two assigned flaky
  audits, plus one bug in this pass's own new D5 drive.

## PART A — flaky audit hardening (tests/local-test.mjs only)

### A1. ca-ngua bot smoke (Audit T tail)
- Flake: 'ngua bot game win' pumpD intermittently timed out at
  60000×125ms. Cause (test-side): the idle human's turns burned 30s
  timeouts with RANDOM legal moves, so match length varied wildly.
- Fix: the human is now driven actively with the bot's own
  priorities, read off its myLegal view — finish-home (to === 58)
  > kick (hint contains 'ĐÁ NGỰA') > leave-stable (from === 0) >
  furthest progress (10 + to) — mirroring nguaBotPick without the
  blunder roll. Winner/results/points assertions unchanged
  (winner all-58, lastGame ca-ngua, points [300,200]).
- Idle-timeout coverage is NOT lost: stepNgua's roll/pick timeouts
  stay exercised by Audit T (a)/(c) and the phase pumps above it.

### A2. can-goc snipe scenario (Audit U)
- Flake: on some terrain/wind seeds the 2°×2-power solver grid has
  no shot landing within damage range (or its best shot does not
  connect), so the damage assert threw on solver variance.
- Fix: the scenario is wrapped in attemptSnipeU() with up to 3
  attempts in fresh rooms. Each attempt still opens with the
  deterministic setup assert (two live 100-HP cannons, 160 heights,
  wind in [-6,6]); the solver's pick is probed with the mirror
  integrator — an attempt only proceeds when the probe is a direct
  hit on P2 or lands ≤1.25u from P2's centre (damage ≥25 needs
  ≤~1.30u), and only continues past the boom when the real shot
  actually dealt ≥25. The full assertion set (setAim exact, damage
  ≥25 + hp ≤75, crater carves, elimination 300/200 + standings
  [1,2]) runs on the first qualifying attempt; if all 3 attempts
  find no solution, a final assert fails loudly — that outcome
  would indict the mirror integrator, not luck.
- One cap raised inside the scenario: the final 'cannon results'
  pump 800 → 4000 iterations. If follow-up shots only wound P2,
  the 6-minute match clock ends the match and finishCannon ranks
  the untouched 100-HP P1 first — the same 300/200 + [1,2] the
  assert pins. Intent preserved.

### A3. Six consecutive suite runs after hardening
| run | result |
|---|---|
| 1 | ALL TESTS PASSED — 791 assertions |
| 2 | ALL TESTS PASSED — 792 assertions |
| 3 | ALL TESTS PASSED — 791 assertions |
| 4 | ALL TESTS PASSED — 792 assertions |
| 5 | ALL TESTS PASSED — 792 assertions |
| 6 | ALL TESTS PASSED — 792 assertions |

The ±1 wobble is the pre-existing tới-trắng redeal behaviour
(Audits X/Y assert once per redeal retry; the deal is random) —
documented in PHONE_MODE_NOTES.md, unrelated to these audits.
A final confirmation run after the deep-drive work: 791, green.
Discrim: 7/7 PASS, numbers identical (tank 5.330, bomb fuse
2000ms, crown +40, stickman 4.20/1875ms, temple 3.15/1750ms,
temple run 5.200).

## PART B — countdown-view sweep (tests/deep-drive.mjs)

For every game: a room at MIN seats (1 phone + bots; 2 phones for
the 4 secret games), a second room at MIN with a LOCAL seat added
(host view must serve localViews during countdown — the exact path
that crashed for ke-gia-mao), and for the 4 secret games a third
room at MAX seats. startGame + host state + every phone state are
fetched with zero fake-time advance, so every view is built inside
'countdown'. Asserts per response: HTTP 200, no error field,
game.id matches, a phase is present. **Result: every one of the
~340 responses was a clean 'countdown' view. No fix needed.**

## PART C — full-match matrix

Every game driven lobby → 'results' at MIN and at MAX seats
(1 phone + bots; idle phone except: ca-ngua driven with the
bot-priority picker, tien-len driven with a generic legal-play
driver built on the exported TL.comboOf/TL.beats — cheapest beater
or pass, biggest combo on the lead, 3♠-first honoured; ech-op
gets a held rightward pad). Fake durations in the checklist.
One co-op banner check: chung-mot-than @min results carry
lastGame.teamResult {tier, pointsEach} — PASS.

Suite coverage before this pass (for comparison): the main flow
plays full matches of do-vui, day-ra, ne-dan, keo-co, chia-cuop,
cuop-sao, giu-vuong-mien, son-san, cao-boi; Audit J the three
original co-ops; Audit K deterministic drives of xe-tank,
dat-bom, ke-gia-mao, thu-thanh, giai-ma-chung; Audit O full
scripted completions of nguoi-que + den-lua-nuoc; Audit R
do-vui@12, son-san@8, dat-bom@5; Audit S ma-soi@6; Audit T
ca-ngua; Audit U da-bong, ech-op, can-goc; Audit X tien-len with
staged hands. What the matrix adds: a UNIFORM min+max completion
for every game in one sweep — first max-seat completions for
chia-cuop@12 (843s fake), giai-ma-chung@12, keo-co@12,
cheo-thuyen@12, ma-soi@12 (511s), ca-ngua@4 (1063s against 3
bots); first min-seat completions for dat-bom@2, xe-tank@2,
ech-op@2, den-lua-nuoc@2, can-goc@2 (358s — idle turns pass, the
match clock finishes it); and a staged-hands-free tien-len
completion at both 2 and 4 seats.

## PART D — mode flows (all PASS)

- D1 playlist: queue [son-san, cuop-sao, cao-boi] auto-advanced
  through all 3 in order; playlist.pos observed 1 → 2 → 3; chain
  settles at the final game's results.
- D2 quitToChoosing mid-game from day-ra AND from tien-len:
  lands in 'choosing', player scores byte-identical to before
  the aborted game (no points banked).
- D3 replay from results restarts son-san into countdown;
  continue → 'podium'; finish → 'final'.
- D4 a room whose ONLY human is a LOCAL seat (seat 2 + 1 bot, no
  phone ever joins) completes do-vui; the local seat answered
  every question correctly through forSeat relays and banked
  2675 points (the quiz maximum — the drive is exact).
- D5 a phone-mode room (hostJoin host seat + 1 phone + 2 bots)
  completes ma-soi to results; the host seat acted through
  forSeat from its myView (night action per its role, day vote)
  and banked side points.

## PART E — secrecy audits (all PASS)

Technique: 2 pure phone seats (so no localViews/myView exclusion
is in play); pull each phone's private payload from its OWN view
and string-search it in the other phone's and the host's view
JSON, at the moment the secret is live.
- ma-soi (night 1, before any death makes roles public): host
  JSON contains none of "myRole"/"wolfTeam"/"myVictim"/
  "mySeerNotes"/"roles"; every non-wolf phone's JSON contains
  no '"soi"' string anywhere (n=4 deals exactly 1 wolf, so at
  least one phone is always auditable; both were when the wolf
  was a bot).
- ke-gia-mao (answer phase): host JSON contains NEITHER phone's
  question text; the impostor phone (identified from stored
  state) never leaks its fake question to the other phone.
- tien-len (cards phase): A's exact 13-card myHand JSON array
  appears in neither B's view nor the host view; the host game
  view has no myHand field at all (counts only).
- giai-ma-chung (decode): A's mySteps JSON appears in neither
  B's view nor the host view (and symmetrically for B). Phones
  were driven on their own steps so levels advanced until A
  held steps (round-robin deal guarantees them by level 2).

## Fixes

### Product bugs (worker.mjs): NONE
No countdown crash, no stuck phase, no leaked secret, no
'Lỗi máy chủ' anywhere in ~630 deep-drive checks + 50 matches.
worker.mjs is byte-identical to the start of this pass.

### Test-side fixes
1. Audit T ca-ngua bot smoke — active bot-priority drive (A1).
2. Audit U can-goc snipe — 3-attempt solver wrap (A2).
3. deep-drive D5 (this pass's own new code): the drive read
   myView.game.*, but buildView attaches myView as the seat's
   gameView ITSELF (fields at top level — verified against
   Audit Y and by direct probe: myView.myRole etc.). The first
   deep-drive run failed exactly that one check while the room
   still completed on timeouts; fixed to read myView.* and the
   re-run is fully green with the host seat acting for real.

## Final verification state
- tests/local-test.mjs: 6/6 consecutive green after hardening
  (791–792 assertions) + a 7th confirmation run (791).
- tests/discrim-check.mjs: 7/7 PASS, numbers unchanged.
- tests/deep-drive.mjs: exit 0 — 630 checks passed, 0 failures.
- Not committed, not deployed (parent's step; the protocol's
  fresh drive on the live link belongs to that step).

## Per-game checklist (25 rows)

Countdown = host + phone(s) (+local host) views inside 'countdown'
(Part B). Durations are fake-time to results (Part C).
Secrecy only applies to the 4 secret games (Part E).

| game | min match | max match | countdown views | secrecy | verdict |
|---|---|---|---|---|---|
| do-vui (2–12) | OK · 176s @2 | OK · 176s @12 | OK | n/a | PASS |
| day-ra (2–8) | OK · 93s @2 | OK · 43s @8 | OK | n/a | PASS |
| ne-dan (2–8) | OK · 60s @2 | OK · 78s @8 | OK | n/a | PASS |
| keo-co (2–12) | OK · 10s @2 | OK · 10s @12 | OK | n/a | PASS |
| chia-cuop (2–12) | OK · 166s @2 | OK · 843s @12 | OK | n/a | PASS |
| cuop-sao (2–8) | OK · 48s @2 | OK · 48s @8 | OK | n/a | PASS |
| giu-vuong-mien (2–8) | OK · 48s @2 | OK · 48s @8 | OK | n/a | PASS |
| son-san (2–8) | OK · 43s @2 | OK · 43s @8 | OK | n/a | PASS |
| cao-boi (2–8) | OK · 53s @2 | OK · 55s @8 | OK | n/a | PASS |
| xe-tank (2–8) | OK · 78s @2 | OK · 78s @8 | OK | n/a | PASS |
| dat-bom (2–6) | OK · 11s @2 | OK · 11s @6 | OK | n/a | PASS |
| ke-gia-mao (3–12) | OK · 321s @3 | OK · 321s @12 | OK (min+local+max) | OK (Part E) | PASS |
| ma-soi (4–12) | OK · 160s @4 | OK · 511s @12 | OK (min+local+max) | OK (Part E) | PASS |
| ca-ngua (2–4) | OK · 175s @2 | OK · 1063s @4 | OK | n/a | PASS |
| tien-len (2–4) | OK · 16s @2 | OK · 45s @4 | OK (min+local+max) | OK (Part E) | PASS |
| chung-mot-than (2–8) | OK · 47s @2 (+team tier banner) | OK · 63s @8 | OK | n/a | PASS |
| day-hop (2–6) | OK · 78s @2 | OK · 78s @6 | OK | n/a | PASS |
| cheo-thuyen (2–12) | OK · 48s @2 | OK · 48s @12 | OK | n/a | PASS |
| thu-thanh (2–8) | OK · 46s @2 | OK · 63s @8 | OK | n/a | PASS |
| giai-ma-chung (2–12) | OK · 78s @2 | OK · 78s @12 | OK (min+local+max) | OK (Part E) | PASS |
| nguoi-que (2–8) | OK · 24s @2 | OK · 71s @8 | OK | n/a | PASS |
| den-lua-nuoc (2–6) | OK · 203s @2 | OK · 203s @6 | OK | n/a | PASS |
| da-bong (2–8) | OK · 161s @2 | OK · 101s @8 | OK | n/a | PASS |
| ech-op (2–4) | OK · 29s @2 | OK · 29s @4 | OK | n/a | PASS |
| can-goc (2–8) | OK · 358s @2 | OK · 244s @8 | OK | n/a | PASS |

Mode flows (Part D) verdicts: playlist chain PASS · quit
day-ra PASS · quit tien-len PASS · replay/podium/finish PASS ·
local-seat-only do-vui PASS (2675 banked) · phone-mode ma-soi
PASS. Overall deep-drive: **630 checks, 0 failures, exit 0.**
