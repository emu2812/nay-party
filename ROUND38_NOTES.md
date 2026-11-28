# ROUND 38 — Per-game breaker campaign (2026-11-28)

User order (~16:41): test every game one at a time on the real screen, attack each
as hard as possible, fix each game's defects before moving on.

## Instrument — `~/workspace/boottest/rig-breaker.mjs`

Weak profile (SwiftShader + CPU throttle, 1920×1080), host page on the local rig,
API room + np_session injection, seats = 2 keyboard locals + kho bots. Three chaos
drivers run concurrently: (1) keyChaos — random presses/releases on both local
keyboard schemes every 40–260 ms; (2) garbageChaos — junk host actions every
~0.9–2.3 s (bogus game ids, addBot seat 99/−1, removePlayer 99, kickSeat 0,
quickStart bogus, syncLocalResults with huge deltas, localPlay on:'maybe',
wrong-typed pads, empty/null actions); (3) clickChaos (panel games) — random
clicks on visible game controls every 300–800 ms. In-page sampler (250 ms):
non-finite-number scan of the whole game object, phase-transition log, 30 s
stall detector, DOM-presence check for every alive blob, rAF gap log.
After results: replay ×3 spam, then a 25 s rematch watch. Hooks on
clearSession/localStop/localAbort name the teardown path when a page dies.

## 🐛 REAL BUG 1 — session suicide on a generic error string (found via Đặt Bom)

The page cleared the whole room session when ANY api error contained the
substring 'không hợp lệ' (poll + act). That substring was meant to catch the
auth errors ('Phiên màn hình lớn không hợp lệ.' — all auth errors start with
'Phiên '), but it also matches generic gameplay rejections: 'Hành động không
hợp lệ.' (hostDispatch fallthrough) and 'Đáp án không hợp lệ.' (quiz answer
out of range). After any local game ends (localStop → server path resumes),
the next stray rejected action wiped the host to the home screen. A quiz
player double-tapping an answer as the question flips hits the same wipe.
FIX (src/page.mjs, both sites): clear the session only when the error STARTS
WITH 'Phiên '. Verified: under full garbage+keys chaos the Đặt Bom results
screen now stands firm 30 s (previously died ~1–2.5 s after every results).

## 🐛 REAL BUG 2 — instant "Chơi lại" tap eaten by the results sync (found via Tiến Lên)

At local-results, localTick fires syncLocalResults; while that call is in
flight, act('replay') routed to the mirror and created the rematch ON THE
MIRROR. When the sync response landed, its callback called localStop() —
tearing the mirror (and the brand-new match) down — and applied the server
results view. The tap was silently eaten; the mirror rematch also carried
match 1's startScores snapshot, so its deltas would have been wrong anyway.
FIX (src/page.mjs): start-type actions (replay/startGame/quickStart) arriving
while the mirror is at 'results' are deferred in L.pendingStart; the sync
success callback fires the deferred action after localStop (fresh mirror,
fresh snapshot). If the sync permanently fails (5 retries), the deferred
start fires on the mirror with a re-snapshotted startScores and a reset sync
state. toChoosing/quitToChoosing cancels the deferral.
VERIFIED by `~/workspace/boottest/rig-race.mjs`: replay fired in the same
30 ms poll tick that first saw 'results' (localActive=true) → rematch in
countdown at +2 s, still playing at +20 s.

## Per-game verdicts (breaker, weak profile, local mode)

CLEAN (results reached, rematch engaged, NaN 0, domMiss 0, no real errors):
Đẩy Ra 93 s · Cướp Sao 103 s · Né Laze 83 s · Giữ Vương Miện 103 s ·
Xe Tăng 133 s · Đặt Bom (bug 1) · Người Que 101 s · Đá Bóng 149 s ·
Đua Máy Bay 119 s (maxGap 40 ms) · Căn Góc 169 s · Thủ Thành 91 s ·
Đền Lửa & Nước 183 s · Ếch Ộp 87 s · Chung Một Thân 119 s ·
Tiến Lên 285 s (bug 2) · Đố Vui 143 s (rerun, see below).

LONG-BUT-ALIVE (no defect): Cờ Cá Ngựa — 420 s cap with roll/pick phases
cycling continuously, NaN 0, maxGap 70 ms; random play simply doesn't finish
a ludo game in 7 minutes. Cờ Vua — rig's 30 s stall detector fired at 36 s,
but a chess turn is legally 120 s (CHESS_TURN_MS): engine probe with an idle
human shows the bot moving at once and the idle seat auto-playing at the
timer (4 moves logged in ~262 s: c4 Na6 e4 Rb8). Ma Sói — same class:
WOLF_DISCUSS_MS is 60 s by design; run 1 reached results in 73 s.

RIG ARTIFACTS (not product defects): Đố Vui run 1 "PAGE-DEAD" and Ma Sói
run 1's dead rematch context — clickChaos's bare `button` selector clicked
the topbar "Đổi phòng" (leave-room) button, which clears the session BY
DESIGN. Selector narrowed to game controls only; Đố Vui rerun clean.
Đẩy Hộp / Chèo Thuyền run-1 rematch anomalies (countdown→results; brk null)
occurred in the one window where two rig processes overlapped at a batch
boundary; three independent rechecks (clean rig-rematch for both games,
hooked breaker rerun for Đẩy Hộp — rematch playing, maxGap 37 ms, engine
garbage probe — every junk action rejected, nothing throws) could not
reproduce them. Classified environment noise; both games' match-1 runs
were clean.

Also probed and left alone: a garbage syncLocalResults (no lastGame) on a
server room with localPlay set is accepted and consumes the flag — it needs
a second holder of the host token racing syncs; the page itself never
double-syncs (L.synced guards it). Out of scope.

## Battery + deploy

local-test 700 · deep-drive 504/0 · discrim PASS · laser 21/21 ·
chess 21/21 · hostile 105/0 · rig-local-all FLAGGED 0 · embedded page
script extracted + node --check OK.
Deploy 2026-11-28 ~18:04: deployment 8b3b73346fc54d80a5cdff84687b7db4,
build b7ff0f5304; live page sha256 cb653016… byte-identical to the rig
page; /api/version = b7ff0f5304; live quickstart probe OK.
