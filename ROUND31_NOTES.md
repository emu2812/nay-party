# ROUND 31 — ALL-GAME VISUAL AUDIT (REAL SCREENSHOTS + VIDEO)

Deployment 872a2d76, build df7ad79db0, commit 5609035. Triggered by
the user 2026-11-27 22:37: "check ALL games so the visuals are as
close to the big sites as possible — I find it too messy (loạn)",
and 22:39: "about smoothness you must look at real images/video,
not just code — everything must be real".

## Method

rig-shots-all.mjs captured all 19 games in real play (1600x900,
local mode / hostJoin+quickStart), montages viewed game by game.
Fixes were re-shot and compared (r31b/). Smoothness evidence this
round is a 27 s gameplay video (day-ra + ne-dan + da-bong, real
screencast frames) with frames inspected mid-clip.

## What the screenshots showed (the "loạn")

1. The shared checkerboard floor (10 arena games) was too strong —
   a busy pattern behind every scene. Calmed: contrast .05 → .026,
   cells 46px → 68px.
2. Score chips overlapped the instruction banner in playhud
   (cuop-sao / giu-vuong-mien / thu-thanh shots: chips ran into the
   centred banner text). Fixed: playhud scorebar capped at 300px,
   wraps into two right-aligned rows, clear of the banner zone.
3. The zone ring (.aring) was a bright 3px cyan ellipse shouting
   over the scene. Softened: 2px, rgba(120,220,255,.5) (the danger
   state still turns red/thick).
4. Chèo Thuyền's stage was a thin 150px strip over a page of empty
   beige. Water height 150 → 300px, boat 56 → 88px.
5. Cờ Cá Ngựa's board was small next to two wide side panels.
   Board column max-width 46% → 50%.
6. Ếch Ộp's frogs were small (44px) on a huge field. Frog SVG
   bumped to 58px on the big screen.
7. Checked and cleared: Đá Bóng players "lined up at the bottom"
   in stills is correct — it is a side-view head-soccer game;
   players run along the ground and jump (engine probe: ball and
   blobs move; video frame shows a bot mid-jump with the ball in
   the air). Đố Vui, Tiến Lên, Ma Sói, Đặt Bom, Căn Góc, Đền read
   clean and close to their references already.

## Verification

- Re-shot day-ra / cuop-sao / cheo-thuyen / da-bong / ca-ngua /
  ech-op after the fixes and viewed them: floors calm, no HUD
  overlap, ring soft, rowing scene substantial, board bigger,
  frogs bigger.
- Video r31-gameplay.mp4 (27 s): frames at 13 s (laser firing,
  bot mid-jump) and 22 s (soccer ball in play) inspected.
- Battery: local-test PASS (701 assertions — count varies ±1
  between runs with drive-dependent assertions; deep-drive has
  shown the same 462/463 variance since Round 29), deep-drive
  462/0, discrim PASS, laser 21/21.
- Live: byte-identical (sha256 a05ef2e9…), build df7ad79db0.
