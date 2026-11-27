# ROUND 30 — PERF FLOOR + SIDE-BY-SIDE VISUAL COMPARISON

Deployment 1198f79e, build a1ad2ebfe6, commit e40235d. Triggered by
the user 2026-11-27 22:22 ("graphics are improving — keep minimizing
until smoothness is 100%"), 22:23 ("graphics must sit even closer to
the big sites — Google them and compare directly against your own
screenshots"), 22:26 ("reduce everything until latency is
0.0000000000000000s — really zero").

## The latency demand — answered with physics and a measurement

Literal 0.000s latency is impossible on any hardware: one screen
refresh at 60 Hz is 16.7 ms, and input must wait for the next frame
to be shown. What was done instead: everything reducible was cut,
and the real press-to-pixel latency was MEASURED in local play on
the weak profile (software rendering + 4x CPU throttle) with a
capture-phase keydown stamp vs the first transform change of the
player's own blob (client-side prediction moves it the same frame):

  presses: 14.8 / 17.1 / 21.2 / 24.6 / 28.1 / 29.4 ms
  median 24.6 ms, worst 29.4 ms — 1–2 display frames on a
  deliberately crippled profile. On a real GPU machine this sits
  at the one-frame floor (~16.7 ms). Discrete actions (jump, dash,
  bomb) resolve at the next 62.5 ms sim step by design.

## Profile first (rig-prof2, real local play, weak profile, 8 s)

dat-bom: idle 79.7%, browser (program) 14.4%, patchPositions 1.2%,
writePos 1.1%, rafLoop 0.7%, GC 0.2%, localApply 0.2%.
day-ra: idle 67.0%, (program) 27.7%, patchPositions 1.0%,
writePos 0.9%, GC 0.8%. Conclusion: the JS side was already lean;
the remaining named costs were unguarded DOM writes and per-apply
querySelectorAll sweeps inside patchPositions and the sync*
helpers, plus browser paint.

## Cuts applied

- Every unguarded per-apply DOM write in patchPositions is now
  value-cached: blob opacity (setOp), lives hearts + my-lives
  (setT), crystal HP/hearts, kill counts, soccer scoreboard.
- syncDyn / syncDynIdx / syncBlasts prune dead nodes from a JS
  registry (S._dynReg) instead of a querySelectorAll sweep over
  the field on every apply.
- dat-bom soft blocks: node list cached on the field element,
  display writes guarded per element.
- Frog display writes guarded.
After: dat-bom frame histogram (30 s, weak profile, in game):
1801 frames, 60 fps, 0 frames >34 ms, max 31 ms.

## Visual pass 2 — direct side-by-side comparison

References downloaded to ~/workspace/nay-party-refs/ (the user's own
Tien Len screenshot, a Werewolves Online night screen, a Super
Bomberman R arena) and composited side-by-side with my own
screenshots (cmp-*.png), viewed, fixed, re-shot, compared again.

- Tien Len vs the user's reference: seats now carry the coin/score
  line under the name (🪙 N, like the reference's chip counts);
  the table grew (felt 440→500 px tall, stage max-width 940→1140).
- Ma Soi vs Werewolves Online: star field (tiled radial-gradient
  dots — background-image survives the perf strip), pine-tree
  silhouettes at the scene edges, moon halo, deeper sky (#0C1830),
  and lit windows on every house (first attempt targeted the wrong
  selector — houses are div.whouse, not i — caught by zooming into
  my own screenshot; fixed to .whouse::after + position:relative,
  verified in the zoom crop).
- Dat Bom vs Bomberman: the floor is now a true two-green
  checkerboard like the reference's grass tiles (was a dark floor
  with a near-invisible checker), soft blocks gained brick lines,
  hard blocks a lighter top edge.

## Verification

- Battery: local-test 702 PASS, deep-drive 463/0, discrim PASS,
  laser 21/21.
- rig-latency: median 24.6 ms press-to-pixel (weak profile).
- rig-prof2 profiles quoted above; rig-frames3 histogram above.
- Screenshots + composites inspected by eye (cmp-tien-len2,
  cmp-wolf2, cmp-bomber2 in ~/workspace/nay-party-refs/).
- Live: page byte-identical to the rig page (sha256 f724de97…),
  build a1ad2ebfe6, live probe quickStart xe-tank -> playing.

## Honest limits

- "100% smooth / 0.000s" cannot be promised: the floor is one
  display frame plus, for remote players, the network itself.
  Everything above that floor that this codebase controlled has
  been measured and cut; the user's machine remains the verdict.
