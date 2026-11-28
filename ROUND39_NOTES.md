# ROUND 39 — Full keyboard/button audit (2026-11-28)

User order (~18:51): "check lại hết các phím chơi nhé vì các phím chơi
đang không hoạt động hoặc hoạt động không đúng với nội dung" — audit
every play key; keys are dead or don't match the content.

## Instruments

- `rig-keys.mjs` — A: mapping audit (synthetic key events with exact
  `code`s, reads LK[seat].pad). B: per-game effects on the mirror
  engine via scheme-0 keys. C: panel games (quiz/row/tien-len/ludo/wolf).
- `rig-keys2.mjs` — isolated rechecks (bomber corridor, shared axes
  with the star parked so bot owners stop fighting the measurement).
- `rig-keys3.mjs` — Part D: player-page keyboard with REAL keyboard
  events (arrows + WASD merged set, F answers the quiz).
- `probe-bomber-keys.mjs`, `probe-wolf-vote.mjs`, `probe-box-a.mjs` —
  engine-level probes for cases the page rigs can't isolate.
- `rig-keys4.mjs` — post-fix page-level verification.

## Verified WORKING (no change)

- Mapping: all 32 physical keys (4 schemes × 8 bits) land on exactly
  the right seat+bit, zero cross-talk.
- Effects in all 15 pad games: directions move the right way; dodge A
  jump/B dash; tank A fire; bomber A bomb/B dash; defend A fire;
  fight A attack/X heavy/B dash/Y jump; temple A jump; soccer A kick/
  B dash/Y jump; frog aim+A jump/B gulp; fly A boost/B brake; shell
  U/D angle, L/R power, X flip, A fire; box movement/B dash; steal/
  crown movement/A shove/B dash.
- Panel keys: quiz B = answer 2, Y = answer 4 (both seats); rowing A
  registers strokes; tien-len R cursor, A toggle on/off; ludo A rolls
  (phase → pick); wolf D moves the vote cursor, A confirms the vote.
- Player-page keyboard: ArrowRight and W both move the blob on the
  server path; F answers quiz choice 1.

False alarms during the audit (instruments, not product): bomber U/D
"dead" = teleported the blob inside a pillar cell + corner walls
(engine probe: D descends, U climbs 1.5u); fight L/Y "wrong" = bot
knockback mid-measurement (isolated recheck passes); frog "never
starts" = rig seated 6 in a max-4 game; fly "null" = planes live in
g.blobs, not g.planes; shared R "dead" = the bot owning L pushed the
other way (star parked → +x full speed); wolf A "dead" = rig read the
view-only field g.voted instead of engine g.votes (probe: vote lands).

## 🐛 REAL BUG 1 — Đẩy Hộp: the A button did nothing

GAME_CTL said "A: đẩy mạnh", the phone button said "Đẩy", but
simulateBoxTick never read mv.shove: the summed push intent used only
directions, at a constant step. FIX (engine2 simulateBoxTick): a
contact player holding A counts double in the summed intent and the
push step scales up to 1.5× by the team's average weight; the ≥2
people rule is unchanged and bots (which never set shove) are
unaffected. Proof: engine probe crate dx in 2 s = 3.20 plain → 4.80
with A; page-level with real keys on both local seats = 3.20 → 4.65.
Phone A label is now "ĐẨY MẠNH" and the hint mentions holding A.

## 🐛 REAL BUG 2 — Chung Một Thân: A "Đẩy" and B "Lướt" buttons were dead

simulateSharedTick reads only the four directions — the game has no
A/B mechanics at all, yet the phone panel rendered A/B buttons and
GAME_CTL claimed "A: đẩy". FIX (page): the shared-game phone panel
renders the disc alone; GAME_CTL now reads "D-Pad: mỗi người lái một
hướng của thân chung". Verified on a live player page: disc present,
zero .abtn elements.

## Content fixes (help text vs reality)

- nguoi-que GAME_CTL: added "Y: nhảy" (jump existed, unlisted).
- da-bong GAME_CTL: added "Y: nhảy".
- thu-thanh GAME_CTL: "D-Pad: ngắm" → "di chuyển · A: bắn slime ·
  B: lướt" (you move your defender; the guns auto-aim; B dash existed
  but was unlisted).
- cuop-sao GAME_CTL: "D-Pad: bay" → "chạy" (blobs run; nothing flies).

## Battery + deploy

local-test 700 · deep-drive 504/0 (one known tien-len pump flake on
the first run, green on rerun) · discrim PASS · laser 21/21 · chess
21/21 · hostile 105/0 · rig-local-all FLAGGED 0 · page script
node --check OK · rig-keys A 33/33, B/C/D all green after instrument
fixes · rig-keys4 post-fix 4/4.
Deploy 2026-11-28 ~19:5x: deployment e1f5cdb5f17c4a93af54077cce8203d3,
build b94cea56a6; live sha256 c77d8ca1… byte-identical to the rig
page; /api/version matches; live quickstart OK.
