# ROUND 28 — REMOVE 5 GAMES + EVENT-JUDDER FIX (2026-11-27)

Deployment 153390ca, build 1babcdb2d9, commit b124af0. Live page byte-identical to rig page (sha256 0f072cca…).

## Part 1 — Removed 5 games (user order 20:54 "bỏ một số game cực chán đi cho nhẹ nhàng")

User did not name games; selection under full authority = the five zero-action wait/discuss/turn games:
**Ma Sói (ma-soi), Kẻ Giả Mạo (ke-gia-mao), Chia Hay Cướp (chia-cuop), Cờ Cá Ngựa (ca-ngua), Giải Mã Chung (giai-ma-chung)**.
Kept: do-vui (speed pressure), tien-len (real strategy). Result: **20 games (14 versus + 6 co-op)**. Reversible via git (parent d7bc300).

Excision: engine1 −107 lines, engine2 −1026 lines, page −620 lines, tests cleaned.
Collateral found by the battery and restored: `collectMoves` (shared arena helper that sat between chia functions) and `TL_RANKS`/`TL_SUITS` (sat between finishNgua and tlRank). Diff-scan of deleted lines confirmed nothing else unrelated was removed.
Tests adapted, not just deleted: co-op list 7→6, catalog 25→20, versus 18→14; playlist seat-gate tests re-based (unknown-id filter for the 2-seat case; Tiến Lên max-4 runtime skip with a white-box seat-ADD for the 3-seat case); deep-drive D5 phone-mode rewritten from Ma Sói to Tiến Lên (host seat plays via myView + forSeat); Part E secrecy blocks for the 3 removed secret games deleted; a tới-trắng retry guard added to deep-drive's tien-len secrecy block (same guard local-test already had).
Page footer rewritten: "20 game: … — 14 game đấu + 6 game hợp tác!".

⚠️ Excision-tool lesson: the first page excision run had DUPLICATE spans (the phone-pad and local-pad one-liner lists overlapped) and ate 3 extra lines (a function-closing `}` among them) — page script died with "Unexpected end of input" while `node --check` on page.mjs still passed (the script is a template-literal string). Fix: dedupe/merge spans before applying, and ALWAYS syntax-check the EXTRACTED page script after an excision. tools-excise-page.py now dedupes.

## Part 2 — Death/score judder (user report 20:58 "mỗi lần chết hay đạt được nó bị giật do đổi khung hình")

ROOT CAUSE (code-proven): `viewSig()` — the page's rebuild trigger — carried event-varying data:
- top level: `v.players` (includes score, liveScore AND mood — mood flips on deaths/crown/lead changes), `v.standings`, `v.gap`, `v.bubble` (bot quips, every few seconds);
- per game: alive/lives strings (day-ra ak, ne-dan ak2, xe-tank tk, dat-bom bk, nguoi-que fk + myDmg), crown holder, crystal HP + kills, deliveries, hearts/checks/gems (shared/temple/frog), soccer scoreboard + goalInfo.
Every death, every point, every bot quip therefore rebuilt the ENTIRE page DOM mid-play — one heavy frame exactly at the event, as the user described.

FIX (src/page.mjs only): those fields are out of the signature. Everything they drove was ALREADY painted in place by patchPositions (blob opacity/hearts, crystal HP, kills, deliveries, checks, gems, frog hearts/flies, soccer scoreboard, crown holder class, banked counts) — plus two additions:
- `patchScoreboard(v)`: key-cached painter for `.scorebar`/`.gapline` (standings order + liveScore + gap), called every frame from patchPositions. Unit-probe validated: reversed standings + fake 777 scores repaint in place, gap line follows, 0 errors.
- Bot bubble: removed from the main sig; added to renderMySeat's own sig (panel-local repaint) + renderMySeat() now also called from patchPositions.

MEASURED (weak profile, local mode, 1 local seat + 5 bots fighting, 20 s per game): day-ra / ne-dan / dat-bom / xe-tank / cuop-sao / da-bong each had **2 rebuilds total** (phase flips only) with deaths and life losses demonstrably happening (dat-bom 2 dead, ne-dan 7 hits, day-ra 3 lives lost, xe-tank 5 lost); long tasks 0–1 per 20 s (max 70 ms, at a phase flip). Weak sweep after: day-ra 59, ne-dan 60, dat-bom 61, cuop-sao 61 fps, 0 rebuilds/5 s.

## Verification
local-test 694 ✓ · laser 21/21 ✓ · discrim PASS ✓ · deep-drive 462/0 ✓ · rig-local-all FLAGGED 0 (20/20) ✓ · rig-ui-shot 26 cards (20 + 6 featured), 26/26 controls ✓ · live byte-identical ✓ · live probe: ma-soi correctly rejected ("Không có game này."), quickStart xe-tank → playing ✓.

Not changed: do-vui/tien-len/cao-boi/can-goc signatures (turn-based; their rebuilds land on natural beats — question reveal, card play, boom pause). Soccer goals still flip phase to 'goal' (celebration beat, ball reset) — one rebuild at a pause, not mid-motion.
