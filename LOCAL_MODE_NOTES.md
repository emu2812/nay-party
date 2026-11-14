# Local Mode (play directly on web, keyboard players at host screen) — work notes

Task started: 2026-11-14 ~21:39 +07. Base HEAD: 645aa3e, suite green 589 assertions.
Rules: additive only; no commit, no deploy; don't touch TICK_MS/transport/watchdog/rules/scoring/view fields/action names existing clients depend on.

## Design decisions
- scheme assignment: LOWEST UNUSED scheme index (0..3) instead of literal "count of locals".
  Rationale: if a local seat is removed in the lobby and a new one added, count-based
  assignment would duplicate a scheme (two players sharing one keyboard layout).
  Lowest-unused equals count in the no-removal flow the spec/tests describe (0, then 1, ...),
  and the cap check still uses the count (>= 4 -> error).
- Local player object omits the `token` field entirely (undefined).
- Auth hardening (structural, additive): all five player-token lookup sites gain a
  `!p.local` guard so a tokenless seat can NEVER be claimed — not even by a request
  that omits its token (undefined === undefined would otherwise match a tokenless seat
  in the HTTP /action lookup). No behavior change for phone players (they always have
  tokens and are never local).
- gameView ma-soi seat branch gets a null guard `if (seat && w)`: g.wolf is null during
  the countdown phase, so gameView(room,'player',seat) THROWS during countdown today
  (verified by probe on HEAD: phone /state during ma-soi countdown returns 500
  "Cannot read properties of null (reading 'roles')"). This is a pre-existing bug;
  the guard is required so buildView can build localViews during countdown without
  breaking the host view, and it also fixes the phone 500. Fields during countdown
  are simply absent, consistent with the existing `w ? ... : ...` guards in that branch.
- Client role labels in panels reuse the page's existing WOLF_ROLE_NAMES map
  (Sói 🐺 / Tiên Tri 🔮 / Bảo Vệ 🛡️ / Phù Thủy 🧙 / Dân Làng 🧑‍🌾) instead of the
  brief's slightly different spellings — same keys, consistent with what phones show.
- Local panels live in a dedicated fixed-position container (#localpanels) appended to
  <body>, NOT inside #app innerHTML: render() early-returns on unchanged sig, but peek
  (Y held) and cursor moves must repaint instantly from keyboard handlers. render()
  calls renderLocalPanels() on every invocation (before the sig early-return);
  keyboard handlers call it too. Cursor + peek state live in a client-side LK object
  keyed by seat, outside rendered HTML, as required.

## Seams found
- hostAction ~5305 (addBot 5307, removeBot 5316 — removeBot checks p.type !== 'bot').
- HTTP action dispatch ~5766: `body.role === 'host' ? hostAction : playerAction`;
  pad tiny-ack just below requires body.role !== 'host' (to relax to any role).
- WS dispatch in RoomStore.webSocketMessage ~880: same ternary on att.role.
- Auth lookups (5): HTTP /state, HTTP /ws upgrade, HTTP /action, DO _acceptWs,
  DO webSocketMessage — all `type === 'human' && token === ...` finds.
- buildView 5239: players map (difficulty:undefined pattern for inapplicable fields);
  game field = gameView(room, role, seat, t). gameView is pure (no mutation).
- gameView branches: ke-gia-mao seat fields myQuestion/options/mine/myVote (pair
  null-guarded since 645aa3e); ma-soi seat fields myRole/myAlive/wolfTeam/myWolfVote/
  wolfVotesIn/myGuardPick/myGuardLast/mySeerPick/mySeerNotes/myVictim/mySaveLeft/
  myPoisonLeft/myWitchSave/myWitchPoison/myWitchDone/wolvesIn (seat branch derefs
  w.roles UNGUARDED — see decision above); ca-ngua myTurn/myLegal[{horse,hint,from}]
  (ng-guarded, countdown-safe); giai-ma mySteps (seq||[]-guarded). All other seat
  branches verified countdown-safe (fields pre-initialized in createGame literal).
- playerAction payloads: answer{choice}, vote{seat} (ma-soi + ke-gia-mao),
  wolfVote/wolfGuard/wolfSeer{seat}, wolfWitch{save}|{poison}|{done:true},
  roll{}, move{horse}, symbol{sym}, tap{}, pad{pad{8 bits}}. Server validates all.
- Phone ma-soi pick rules (playerHTML ~8520+): wolfVote — alive, not self, wolf
  teammates INCLUDED (marked); wolfGuard — alive INCLUDING self, myGuardLast row
  shown but disabled; wolfSeer — alive, not self; witch poison — alive, not self;
  day vote — alive, not self. Witch UI shows when !myWitchDone; before wolvesIn it
  shows a waiting line. All mirrored in the local pick lists.
- Lobby: seatCard() renders empty-seat "+ Máy" (lobby/choosing only, seat>=2) and
  the bot branch renders cycleBot/removeBot buttons; human branch shows only a chip.
  hostHTML counts humans by type==='human' (locals count automatically). startCheck
  (5266) gates on humanCount (type filter) — locals pass; message text mentions
  "điện thoại" but per brief item 6 the gate is verify-only, text left unchanged.
- Client: act(body,cb) stamps role+token and POSTs /action (HTTP), applying the
  returned view; data-cmd dispatcher branch handles addBot/removeBot/cycleBot via
  act({action:cmd, seat}). sendPad() pattern: WS bare-object send when open, else
  api() POST with empty cb — mirrored for local pads (with forSeat added).
- render() 7519: rebuilds #app on sig change; viewSig includes v.players JSON
  (local/scheme fields therefore trigger re-render) and host game sig fields
  (phase/voted/aliveMap/turn...) cover panel-relevant changes.

## Seam correction (parent note, 2026-11-14 21:44) — forSeat interception topology
- VERIFIED in the current tree: there is exactly ONE forSeat interception point, the
  shared helper `hostDispatch(room, body)` (worker.mjs ~5330). When body.forSeat is an
  integer it resolves the LOCAL seat (seat match AND p.local) and routes to
  playerAction(room, target, body); a non-local target (empty/bot/phone seat) returns
  'Ghế này không phải người chơi bàn phím.'; without forSeat it falls through to
  hostAction(room, body) unchanged.
- BOTH host entry points call this helper, and nothing else calls hostAction for
  dispatch: HTTP /action (~5801) `body.role === 'host' ? hostDispatch : playerAction`,
  and the Durable Object's webSocketMessage (~859)
  `att.role === 'host' ? hostDispatch : playerAction`.
- The WS pipeline around the dispatch is untouched: advance() before dispatch,
  advance()+save after, error -> {type:'error'} frame to the sender + broadcast,
  success -> broadcast; the DO alarm flow is unchanged.
- The tiny-ack extension for successful 'pad' actions (item 4) is HTTP-only
  (in the /action handler); the WS path sends no per-action ack and needed none —
  its feedback channel is the broadcast state push.

## Progress log
- Server DONE + probe-verified (ad-hoc probe script, since removed): addLocal schemes
  0/1 + names Phím 1/Phím 2; occupied seat rejected; 5th local cap error text exact;
  removeBot removes a local; re-add after removal takes lowest-unused scheme;
  forSeat at a PHONE seat -> 'Ghế này không phải người chơi bàn phím.';
  forSeat at bot/empty seat -> same error; tokenless forgery (player role, no token /
  empty token / null token) -> 403 on /state and /action; room of local+bots starts
  day-ra; host view localViews keys exactly the local seats; phone /state during
  ma-soi countdown now 200 (was 500 on HEAD).
- Extra deviation (noted while mirroring): cheo-thuyen rows via the 'tap' action on
  phones; the brief's discrete-translation list omits it, which would leave local
  players unable to row at all. Added a -> {action:'tap'} for cheo-thuyen phase 'row'
  (identical pattern to cao-boi, which IS in the brief's list).
- Client DONE (follow-up agent, 2026-11-14 evening). All changes inside the PAGE
  script in worker.mjs, purely additive; no existing view field, action name,
  transport or rule touched.
  - CSS (before </style>): #localpanels fixed layer (z-index 55, pointer-events
    none); .lpanel 302px dark-translucent cards positioned by local ORDER
    (0 bottom-left, 1 bottom-right, 2 top-left at top:66px below the HUD,
    3 top-right); .lprow.cur cursor row; .lpsecret wraps long secret text.
  - Lobby: seatCard empty branch gains "+ Phím" (data-cmd="addLocal") next to
    "+ Máy" only while the room has < 4 locals (hostHTML recomputes the locals
    count before the seat loop); the filled local branch shows chip
    'NGƯỜI CHƠI · BÀN PHÍM', the LK_SCHEME_SUMMARY line and a 'Xoá phím' button
    on the existing removeBot wire. Host lobby gains the help line 'Chơi ngay
    trên màn hình này: bấm + Phím để thêm người chơi bằng bàn phím — mỗi người
    một bộ phím, không cần điện thoại.' The data-cmd dispatcher routes addLocal
    through the same act() branch as addBot/removeBot/cycleBot.
  - Engine: the LK block sits immediately before (function init(). LK_SCHEMES
    matches the locked table; no e.code shared between schemes. sendLocalPad
    mirrors sendPad (WS bare object when open, else HTTP api() POST, replies
    ignored).
  - Discrete sends go through a DEDICATED localAct(), NOT act(): act() treats
    any error containing 'không hợp lệ' as a dead session and bounces the host
    to the menu — a mistimed local press (e.g. symbol after the sequence moved
    on -> 'Ký hiệu không hợp lệ.') would otherwise kick the host out of its
    own room. localAct applies the returned host view like act() on success and
    only toasts errors.
  - CONFLICT RESOLVED (brief ambiguity): in ke-gia-mao, Y is BOTH the
    secret-peek key and answer choice 4. Implemented tap/hold discrimination:
    keydown Y raises peek only (stamped); a/b/x translate to answers 0-2
    immediately; on keyup, a Y press held < 300 ms during phase 'answer' with
    mine == null sends choice 3; a hold of 300 ms+ is a pure peek. In ma-soi
    Y is pure peek (nothing competes). Do-vui has no peek, so a/b/x/y all
    answer on keydown as specced.
  - Pick lists: one shared lkOptions(view, seat) builder feeds BOTH the panel
    renderer and the key handler, so what is shown is exactly what A confirms.
    LK[seat] = {pad, peek, yAt, cur, sig}; sig = game|phase|JSON of the option
    acts; any change resets the cursor. u/d move the cursor on keydown
    (repeats allowed); a confirms on a fresh press. Witch rows follow the
    seam notes (waiting line before wolvesIn; Cứu/Độc rows by remaining
    potions; Xong row); guard list excludes myGuardLast; wolf list includes
    teammates; all mirror the phone rules recorded above.
  - Panels: renderLocalPanels() is the FIRST statement of render() (before the
    sig early-return and every role branch), and key handlers call it after
    peek/cursor changes. Inactive (not host, no locals, phase not 'playing')
    -> container emptied + hidden, so the phone page never renders panels or
    the engine (lkActive requires S.role === 'host'). window blur clears all
    pads + peek and pushes the cleared snapshots; key handlers ignore
    input/textarea/select/contentEditable targets and preventDefault every
    mapped code.
  - Build gotcha: a comment in the inserted client code contained BACKTICKS,
    which terminated the worker's PAGE template literal (SyntaxError
    'Unexpected identifier locals'). The client script must never contain
    backticks or backslashes. Fixed by rewording; afterwards
    `node --check worker.mjs`, a page-extract `new Function()` parse, and a
    marker scan all pass.

## Test results
- Formal tests DONE: Audit V added to tests/local-test.mjs (before the Storage
  section). Coverage: page markers (engine + schemes + help line + addLocal
  button present in the served HTML); addLocal scheme order 0-3 and names
  'Phím N'; stored seat has NO 'token' key; occupied-seat rejection; exact cap
  error on the 5th local; removeBot removes a local and re-add takes the
  lowest unused scheme; forgery battery (player /state + /action with
  missing/empty/null/'undefined' tokens -> 403); mid-game addLocal rejected;
  a room whose ONLY human is a local seat (+ bots) starts day-ra; forSeat pad
  lands in the stored sim state and measurably moves the local blob
  (6 x 250 ms ticks, displacement >= 1); forSeat at phone and bot seats
  rejected with the exact error and no pad state written; a plain host pad
  writes nothing; do-vui relayed answer records (answered flag + localViews
  mine) and its reveal points EQUAL a phone player's answering the same
  choice at the same instant (200 = 200); ke-gia-mao secrecy under
  withRandomQueue([0.1, 0.0]) — the phone impostor's FAKE question is ABSENT
  from the whole host-view JSON, the local's REAL question is present via
  localViews, keys exactly ['2'], and a phone view carries no
  locals/localViews; ma-soi structure (localViews keys exactly ['2'], no
  myRole in the host game view, the local sees exactly its stored role) and a
  full idle-local ma-soi match runs to wolfEnd (winner soi) + results; an
  arena match with an idle local completes (regression).
  One test-side fix during bring-up: probing addLocal on seat 1 hits the
  P2-P12 range error before the occupied error (the server validates range
  first, by design) — the occupied check now uses seat 2 after a successful
  add.
- 2026-11-14: `node tests/local-test.mjs` -> ALL TESTS PASSED —
  **639 assertions** (baseline 589, +50). `node tests/discrim-check.mjs` ->
  all PASS (7 checks, incl. the suite-green cross-check).
- Browser smoke on the local rig (Chromium, real time; the rig has no WS
  upgrade, so this exercised the HTTP fallback transport):
  boottest/rig-local-smoke.mjs 16/16 — clicking "+ Phím" creates 'Phím 1'
  with scheme summary + 'Xoá phím'; locals present in the host view; panels
  render during play with the pad-game hint; holding KeyD moved the local
  blob (dx = 2.00) and releasing it stopped the blob (drift 0.00); ma-soi
  panel hides the role, holding Y (KeyE) reveals it, releasing hides it
  again; zero page errors. boottest/rig-local-smoke2.mjs — wolf pick list:
  cursor-down moved to row 2, A confirmed (myWolfVote = that row's seat),
  panel switched to the chosen-prey line.

## Keyboard flexibility wave (2026-11-14, later) — player-page keys + Đổi bộ phím

Built on top of the uncommitted catch-up tree (~659 suite). User principle:
same machine = separate key sets per person; different machines = no
configuration at all, everything works at once; convenience above all.
Additive only; no commit, no deploy.

### Part A — keyboard on the PLAYER page (role 'player')
- Union map KB_MAP = schemes 0 + 1 merged (verified disjoint against
  LK_SCHEMES: scheme 0 uses KeyW/KeyS/KeyA/KeyD + KeyF/KeyG/KeyQ/KeyE;
  scheme 1 uses the four arrows + Comma/Period/KeyM/Slash — no shared
  code). Directions from WASD or arrows; a/b/x/y from either set.
- Merge design (the load-bearing part): the keyboard rides the EXISTING
  padSet machinery under the synthetic pointer id 'kb:<bit>' — the same
  trick each disc direction uses ('<pid>:<bit>'). The sent S.padState
  is therefore the OR of touch claims (S.padPointers/discPointers) and
  keyboard claims: padSet(bit, false, pid) only clears the bit when no
  other claim for it remains, so releasing a key never drops a bit a
  finger holds and vice versa. kbSync(bit) only calls padSet when the
  keyboard aggregate for that bit actually flips. KB_DOWN tracks
  physical keys (two keys can map to one bit — KeyW and ArrowUp are
  both 'u'); a discrete translation fires once per BIT press (the
  0->1 aggregate transition), not once per physical key.
- One consequence inherited from padSet by design: pressing a key for
  a bit a finger already holds produces padSet's fresh-edge cycle
  (false->true sends) — identical to a second finger joining a held
  button; edge-counted games see a new press, which is the semantics
  the touch stack already guarantees for multi-source holds.
- Discrete translations (pkTranslate) reuse the buttons' exact act()
  payloads from runCmd, including answer-once gating on the view's
  mine field: do-vui 'question' a/b/x/y -> answer{choice}; ke-gia-mao
  'answer' a/b/x/y -> answer{choice} (ALL four — on your own screen
  there is no peek conflict, unlike the host panel's Y); giai-ma-chung
  a/b/x/y -> symbol{sym} (with the button's beep); cao-boi a -> tap;
  cheo-thuyen 'row' a -> tap; ca-ngua 'roll' + myTurn a -> roll.
- Guards mirror the host engine: pkActive() = role 'player' + view
  phase 'playing' + game present (countdown included); input/textarea/
  select/contentEditable targets ignored (chat typing never plays);
  preventDefault on every mapped code; repeats never re-fire discrete
  actions. Blur: the engine clears KB_DOWN and re-syncs — the page's
  own touch-stack blur handler (registered earlier) has already zeroed
  padState + padPointers by then, so the re-sync degrades to no-ops
  and a later keyup cannot resurrect a bit.
- Hint: playerHTML appends kbHintHTML() after the game stage during
  play — one small muted line '⌨️ WASD hoặc phím mũi tên để di chuyển
  · F/G/Q/E = A/B/X/Y', returned empty when 'ontouchstart' exists, so
  touch phones see nothing extra. The HOST page/engine is untouched.

### Part B — Đổi bộ phím (cycleScheme)
- Server (hostAction, next to cycleBot): lobby/choosing gate ('Chỉ đổi
  bộ phím được khi đang ở sảnh chờ.'); the seat must be local, else
  'Ghế này không phải người chơi bàn phím.' (same text as the forSeat
  rejection); scheme := first of (cur+1, cur+2, cur+3) mod 4 not used
  by another local seat; if all three are taken ->
  'Cả 3 bộ phím còn lại đều đang có người dùng.'
- The seat's name is NOT changed on rotation: 'Phím N' is
  creation-order naming (addLocal names by scheme+1 at creation); a
  rotated seat keeps its birth name — noted per brief.
- Client: the local seat cell gains 'Đổi bộ phím' (data-cmd=
  cycleScheme) next to 'Xoá phím' in lobby/choosing; the data-cmd
  dispatcher routes it through the same act() branch as addLocal. The
  scheme summary line already renders from the view, so it follows
  automatically.
- Engine robustness: renderLocalPanels() now opens with a scheme
  watch (it runs on every render() call, in every phase — the rotation
  happens in the lobby where the panels themselves are hidden). Each
  LK seat state remembers schemeSeen; on a mismatch the seat's pad is
  zeroed, peek dropped, and the cleared snapshot is pushed via
  sendLocalPad, so no bit can stay stuck under the old mapping.

### Part C — verification
- tests/local-test.mjs Audit V grew by 14 assertions (673 total):
  served-page markers for cycleScheme/KB_MAP/pkTranslate/kbHintHTML;
  cycleScheme rejects phone/bot/empty seats with the exact error;
  rotation skips a used scheme (0 -> 2 while another local holds 1);
  the name does not follow the scheme; host-view locals follow; next
  free (2 -> 3); wrap (3 -> 0); four locals seated -> exact all-taken
  error; mid-game rotation rejected. Suite: ALL TESTS PASSED — 673
  assertions. discrim-check: 7/7 PASS, numbers identical (tank 5.330,
  temple 5.200, crown +40, bomb 2000ms).
- Rig browser proofs: boottest/rig-kb-flex.mjs — 17/17 OK on the local
  rig (HTTP transport; the rig has no WS upgrade, same caveat as the
  earlier smokes). Player page: ArrowRight keydown sets padState.r;
  key release keeps r while a touch-style padSet claim holds (and the
  mirror case for l); real movement ArrowRight dx=+3.87, KeyA
  dx=-4.21, release drift 0.00; no-touch hint line present; KeyF in
  do-vui sets mine=0; chia-cuop chat box receives typed 'wasd' with
  padState fully clear and KB_DOWN empty; host lobby Đổi bộ phím
  click rotates the cell WASD -> Mũi tên and view locals to scheme 1.
- NOT committed, NOT deployed (per brief).

## Unfinished / unverified
- NOT committed, NOT deployed (per brief — the parent agent handles it).
- Local pads over the WS transport were not exercised on the rig (no WS
  upgrade there); sendLocalPad's WS branch is code-identical to the phone's
  proven sendPad path. Worth one live-link check after deploy.
- Physical keyboard feel (four humans on one keyboard, key ghosting on cheap
  keyboards) is inherently the user's real-device check.
- Nothing else pending: client A/B/C and formal tests D are complete.
