# ROUND 32 + 33 NOTES (2026-11-27, ~23:05 → 2026-11-28 ~00:05)

## ROUND 32 — the dead render buffer (deployed 23:16, dep 48182614, build 812d5e6a70, commit 1a40fa1)

User escalation 23:00–23:03: the Round 31 gameplay video visibly juddered, and
ALL games judder on their machine. Conceded on both counts — the video proof
was real: ffprobe of r31-gameplay.mp4 showed the ne-dan segment at half rate
with ONE 932 ms frozen frame, and the burned-in meter read "khựng 8".

Recorder-vs-game separation (rig-truth.mjs, ne-dan): WITHOUT recording the
in-page rAF log is clean (720 frames/12 s, 0 frames >34 ms); WITH the CDP
screencast running on this shared sandbox CPU the page itself degrades
(31 frames >34 ms). A screencast is a contaminated witness; evidence standard
is now rig-truth (burned-in counter + in-page rAF log) and CFR-normalised
files whose frame timing is probed before sending.

THE BUG: `serverNow()` returns MILLISECONDS, but rafLoop rendered at
`nowS − S._rDelayCur/1000` and moveEl projected corrections the same way —
the adaptive render delay (the p90 jitter buffer) has been ≈0.04–0.24 ms
instead of 40–240 ms since its introduction. On the server path (any remote
human in the room, every phone client) movers rendered at "now", almost
always past the newest anchor, inside the extrapolation branch where the
non-ballistic velocity decay (down to 0.6× past 200 ms) plus the correction
spring turned bunched Wi-Fi deliveries (p90 gap 121 ms, silences 200–300 ms)
into a slow-down/surge cycle: movement judder at a steady 60 fps, invisible
to every fps counter. Local mode has an empty gap history → delay 0 either
way → local measurements kept coming back clean while the user's real
(mixed/remote) sessions juddered. Live cadence itself is healthy with a
steady pump (ws-push-probe: push gaps median 61 ms, p90 91 ms, max 150 ms).

Fix: both `/1000` removed; extrapolation decay removed for all movers
(decay = 1) — pad-driven movers keep sim speed during a delivery hole, so
decaying only manufactured the surge half of the cycle. A/B honesty:
rig-motion4's max yank halved (37 px → 15.8 px) but its lurch % is
bot-steering-dominated; rig-motion5 cannot validate render-delay behaviour
(rig poll transit dominates). The warrant is the units proof + the mechanism
matching the symptom exactly. Controls after the fix: local cruise sd
0.14–0.15 (unchanged), dat-bom weak histogram 60 fps / 0 frames >50 ms.

## ROUND 33 — content + adversarial hardening (dep a224badb build cc3652d572 commit fb1c6b0; hierarchy dep 5c690ca4 build 70fa81251f commit 11b2c42)

### New games (catalog now 21: 15 versus + 6 co-op)
- **Cờ Vua (co-vua, 2 seats)**: full rules — legal-move generation with
  king-safety filter, castling, en passant, promotion, checkmate,
  stalemate, insufficient material, fifty-move, threefold repetition.
  Perft gold standards pass (startpos d3 = 8902, Kiwipete d2 = 2039,
  endgame d3 = 2812). Bots: depth 1/2/3 by difficulty. 120 s turn timer
  with auto-move on timeout (house pattern). Board in chess.com palette
  (#EEEED2/#769656), captured rows + move log side panel; playable on the
  big screen (local/hostSeat), the phone panel (flip for black) and the
  myseat panel; phone-audit verified tap e2→e4 lands.
- **Đua Máy Bay (dua-may-bay, 2–8)**: top-down checkpoint air race in the
  wide arena — each pilot races their own coloured gate sequence, first
  to 10 gates wins; momentum flight, A = boost (meter), B = brake, 5
  storm clouds drag. Bots steer gates and dodge clouds. Phone: disc +
  TĂNG TỐC/PHANH + mini-field with own gate ring.

### Người Que weapons
- Pickups spawn every ~9 s on FLOATING platforms only (climbing is the
  risk/reward), max 2 on field: 🗡️ sword (range 3.0/3.2, dmg 14/22,
  heavier knockback) and 🔫 gun (6 rounds, A single shot, X = 3-round
  burst; bullets 1.6 u/tick, dmg 8 + knockback). Ammo out → back to
  fists. Ring-out drops the weapon. Bots detour to pickups when their
  foe is far. Hand indicator on the figure, bullet/pickup rendering via
  syncDyn, panel status line, hints updated. Fight physics untouched
  (discrim apex/air still PASS).

### Board variety (layoutPick — deterministic rotation per room+game)
First match of a game in a room = classic board; rematches cycle.
No Math.random (queued-random tests deal exact layouts; the pick must
not shift their queues).
- Đặt Bom: L1 mirrored pillar grid; L2 open arena (centre cross + 4
  posts, soft density up).
- Xe Tăng: L1 maze (8 blocks), L2 centre fortress (6 blocks). All keep
  the right-hand spawn corridor clear (discrim drives there).
- Đẩy Ra: V1 small arena + faster shrink; V2 centre pillar (blobs are
  pushed out of it; rendered on stage + phone field).
- Người Que: L1/L2 move only the floating platforms (same heights —
  the jump arc is a measured invariant; the x = −2.7 column stays clear
  at mid height in every layout).

### Bugs found by the new checks (both would have shipped otherwise)
1. **shellPathBlocked ReferenceError** — the tank layout patch made a
   standalone helper read `g.tankBlocks` with no `g` in scope; every
   bot tank shell-path check threw inside advance(). Surfaced by
   local-test's bot smoke as a frozen/corrupt match — on the live
   server this class of throw is exactly the user's "đứng hình".
   Fixed by passing the blocks in.
2. **syncLocalResults had no gate** — callable on any room with no
   local game in flight: it folded arbitrary score deltas (clamped
   ±100000/seat) and shoved a fresh room into a fake 'results' phase
   that then refused startGame. Worse, the host page's own 5× retry
   could double-apply a real game's deltas. Fixed: requires
   room.localPlay, which the first successful sync deletes (retries
   are rejected); localPlay now accepts only strict booleans.
   Found by the new hostile-check.

### Verification (all measured, none asserted from code alone)
- Battery: local-test 701–703 (count varies by drive), deep-drive
  505/0 (one known tien-len pump flake, passes on rerun), discrim 7
  PASS, laser 21/21, chess 21/21, **hostile 105/0 (new)**.
- **Hostile check (new, tests/hostile-check.mjs)**: for all 21 games —
  garbage actions (bad types, out-of-range, wrong seat, ghost seat 99),
  500-action pad spam, hostile host actions pre/mid game. No throws,
  every match still reaches results, scores finite. (Idle chess vs the
  strongest bot took ~257k ticks to finish — auto-play works, just
  slow at 120 s/turn.)
- **Glitch audit (new, rig-glitch.mjs)**: rendered trajectories of
  every mover, weak profile, local mode, 12 s × 8 arena games. Freeze
  frames >50 ms: 0–2 per game (sandbox noise level, worst single
  100 ms); teleports: only designed respawns (fight ring-out 18 u,
  star knockback 4.1 u across a dropped-frame gap); overspeed: none;
  disappearances: none (long-faded elements are dead players at the
  designed 0.25 opacity); page errors: 0.
- **Phone audit (rig-phone-audit.mjs): 21/21 OK** — every game's real
  controls render on a 390×844 phone page with correct labels
  (NHẢY/BẮN/ĐẶT BOM/TĂNG TỐC/PHANH/ĐÁNH MẠNH…), held directions and A
  register in padState, chess tap-move lands, Tiến Lên hand renders
  13 cards, Chèo Thuyền's CHÈO! rhythm button registers hits/splashes.
  Chèo Thuyền is a tap game by design (not a pad game).
- **Graphics pass vs Google references**: chess = chess.com palette +
  layout ✓; bomber = Bomberman ✓; ludo ✓; head-soccer ✓; wolf ✓;
  temple = Fireboy & Watergirl structure ✓; cannon = Gunny ✓; quiz =
  Kahoot shape ✓. Xe Tăng was the outlier (orb characters + glowing
  bench blocks on olive) → real top-down tank glyphs (hull + treads +
  turret, barrel still rotates), stone-grey wall blocks with a lit top
  edge, grass-green field — re-shot and verified.
- **Screenshots**: full 21-game sweep (nay-party-shots/r33/) viewed one
  by one via montages; all meters read 60 fps · TẠI CHỖ in local shots.
- **Video**: r32-gameplay.mp4 re-encoded CFR after ffprobe found ONE
  637 ms timestamp gap at a segment join — now 1673 frames, worst gap
  16.667 ms (one frame). r33-fly.mp4 (Đua Máy Bay, rig-truth): same
  treatment, worst gap 16.667 ms. Frame timing is now probed before
  any video is sent.
- rig-local-all FLAGGED 0 (21 games engage local mode; natural-end
  score sync verified against the new gate).
- Live: dep a224badb byte-identical (sha256 884674bc…); live quickStart
  probes — co-vua → 'chess', dua-may-bay → 'fly', nguoi-que → 'fight'.

### Visual hierarchy (user's 23:22 order, done last, dep 5c690ca4)
From the user's own Tiến Lên screenshot: the important thing (the card
to beat) was small, the unimportant things (corner panels repeating
"Trên bàn:") were huge, and the bottom seat was clipped off the felt.
- Centre played cards: 58×84 → 82×118 px, font 25 → 35 px — the table's
  clear focus.
- Local panels: duplicated "Trên bàn:" line deleted (the centre shows
  it, big); hand chips enlarged (they are what the keyboard player
  plays with); panel width 302 → 326 px.
- Seat ring ry 33% → 28%: bottom seat's fan + Cái badge now sit fully
  on the felt.
Verified with rig-tl-hier.mjs replicating the user's exact setup (two
keyboard seats, real key presses F/G to play the 3♠): centre card big,
bottom seat complete, active panel shows its turn status, no
duplication. Battery re-run green; live byte-identical (db357d76…).

## Standing caveats
- Smoothness on the user's own machine remains the final verdict; the
  Round 32 buffer fix targets exactly their mixed/remote sessions.
- Chess with a fully idle player is slow by design (120 s/turn
  auto-move) — same pattern as Cờ Cá Ngựa.
