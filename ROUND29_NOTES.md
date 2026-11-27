# ROUND 29 — SMOOTHNESS (REAL CAUSES), CARD TABLE + VILLAGE ART, LONGER/HARDER GAMES

Deployment 86beb10f, build c2232f76e6, commit a64f467. Triggered by the
user 2026-11-27 21:51–22:00: still not smooth at all, stages too
simple, matches too short and too easy, verify with real video/photos
not code, study real games' screenshots (they sent a casino-style
Tien Len table as the reference), "do you lack an image person?".

## Smoothness — what was actually found (measured, weak profile)

1. **The view was rebuilt 4x more often than the sim moved.**
   localTick called localApply() on EVERY animation frame (60 Hz)
   while the sim steps at 16 Hz: buildView (players, standings, game
   view, one private view per keyboard seat) + render + patch ran 4x
   per step — allocation churn whose GC pauses read as judder while
   average fps stays 60. Fix: `advance()` now RETURNS its step count
   (steppers only return true when they acted — verified for TL:
   returns true only on a bot move/timeout/end), and localTick
   applies only when stepped > 0 or the phase key changed (plus 1/s
   in non-playing phases for countdown labels). Actions still apply
   instantly via localDispatch; rafLoop interpolation is untouched.
   FIRST ATTEMPT keyed the gate on g.tickCount — froze Tiến Lên
   solid (card games never increment tickCount; the view never
   re-applied after the deal). Caught by screenshot inspection, not
   by tests. The advance-count gate replaced it; the TL table now
   fills with played cards in local mode (screenshot proof).
2. **CSS animations stripped during play.** A bisect on dat-bom
   (kill animations -> fps recovers) led to `#app.perf *` gaining
   `animation: none !important`. The poison class: infinite bomb
   pulses, a layout-animating blast flash (width/padding keyframes),
   whole-field shake transforms. Telegraphs that were animated are
   now static shapes: laser WARN = striped bar (low red / high twin
   violet bars), FIRE = solid; the blast flash got its mid-size as
   base style so it still reads without keyframes.
3. **moveEl anchor guard:** a repeated target position no longer
   resets the interpolation window (views repeat positions between
   steps). Kept from the first analysis; harmless and correct.
4. **Measurement traps recorded:** (a) a 30 s frame histogram that
   "showed dat-bom at 15 fps" was measuring the LOBBY after a
   rejected startGame (8 seats > dat-bom max 6) — the live check
   proceeded without asserting; in-game dat-bom at a legal 6 seats
   measures 60 fps, 0 frames >50 ms over 30 s. (b) Static headless
   pages starve rAF (~15 Hz, main thread 95% idle) — a harness
   artifact, not a product state. (c) rig-frame-cost's setup failed
   to start its game and profiled the lobby — always assert the
   phase before trusting a profile.

## Visual pass (references: user's casino Tien Len screenshot +
## Google image search of real Tien Len / Werewolves Online UIs)

- **Tien Len = a real table.** Wooden rim (rounded stadium shape),
  green felt with a gold inner border, players seated AROUND the
  table on an ellipse (avatar in a gold ring, name plate, a FAN of
  three card-backs with a xN count badge, "Cai" / "Bo luot" badges,
  gold highlight on the turn seat). Centre: the played combo as BIG
  fanned cards (rank over suit, red suits red) with the combo name
  on a gold chip ("DOI THONG"). Hand cards are two-line rank/suit.
- **Ma Soi = a village scene.** Night-sky panel (day phases turn
  the sky light), moon/sun disc, house silhouettes along the
  bottom, players in a ring around the phase emblem + caption,
  per-seat status chips (sleeping / voted / dead + revealed role).
  The old wolfcard grid is gone; phase panels (dawn deaths, chat,
  tallies, reveal rows) remain below the scene.
- **Arenas = framed pitches.** Every .afield gets a dark wood
  frame; each field game gets its own flat floor tone + a faint
  static checker; Ne Laze gets a grid; Da Bong gets mowing stripes
  + centre line + centre circle. The overlaid stage banner now sits
  on a dark HUD plate instead of floating over the arena.
- All decoration is static (build-time) — nothing repaints per
  frame; perf strip still governs play.

## Longer + harder (engine constants)

- Cướp Sao 45→75s · Giữ Vương Miện 45→75s · Né Laze 75→105s ·
  Chung Một Thân 60→90s · Đẩy Hộp 75→105s · Xe Tăng 75→105s ·
  Đặt Bom 75→105s · Thủ Thành 60→90s · Đá Bóng 90→120s ·
  Chèo Thuyền 45→60 nhịp. (Đẩy Ra 90s, Người Que 90s, Đền 200s,
  Ếch 120s/màn, Đại Bác 360s already long; Đố Vui stays 8 câu —
  its scripted test math is exact and a quiz round already runs
  ~2–3 phút.)
- Né Laze harder: spawn gap 34→30 start, floor 17→13 ticks, ramp
  every 160 ticks (was 192), second beam from tick 320 (was 400)
  at 40% (was 35%).
- Tests followed the constants (test-side only): shared tier jump
  61s→91s, box jump 76s→106s, row scripts extended to 60 beats
  (545m Vàng / 440m Bạc / 280m Đồng recomputed).

## Verification

- Battery: local-test 702 assertions PASS · deep-drive 463/0 (one
  intermittent TL pump timeout on the first run — passed on rerun;
  the known TL flake family) · discrim PASS (7) · laser 21/21.
- rig-local-all: FLAGGED 0 (19/19 local engagement).
- Weak profile frame histogram (30 s, in-game, legal seats):
  dat-bom 60 fps / 0 frames >50 ms; day-ra 59.8 fps.
- Embedded page script extracted from the rig page + node --check.
- Screenshots inspected by eye: r29-tien-len.png (oval table, DOI
  THONG fanned centre), r29-ma-soi.png (night village ring),
  r29-dat-bom.png (checker floor + frame), r29-da-bong.png (striped
  pitch, centre circle).
- VIDEO: r29-gameplay.mp4 — 279 real screencast frames of live
  dat-bom bot combat (12 s), frame at 7 s inspected (blocks blown,
  bomb placed, HUD plate readable).
- Live: page byte-identical to the rig page (sha256 a11bfebf…),
  build c2232f76e6, live probe quickStart xe-tank -> playing.

## Honest limits

- The user's own machine remains the final smoothness verdict; the
  measured board here is clean, and the two real costs found this
  round (view-rebuild churn, CSS animation repaints) are removed.
- The gameplay video is recorded on the test rig (SwiftShader);
  screencast delivery caps at ~24 fps in headless — the in-page
  meter during capture read 58–60 fps.
