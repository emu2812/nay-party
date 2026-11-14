# Phone Mode (Chơi Trên Điện Thoại) — work notes

Task started: 2026-11-14 ~23:20 +07. Base: working tree with uncommitted
catch-up + keyboard-flexibility + Tiến Lên waves (suite 743 green,
discrim 7/7) on live HEAD 8d37f20.
Rules: additive only; no commit, no deploy; client code inside the PAGE
template literal must contain NO backticks, NO backslashes, NO ${}.

Goal: for turn-based / secret games a group with NO TV plays entirely
on phones — one phone creates the room and its owner ALSO sits in a
seat (hostSeat); friends join via a shareable link; each device's
identity (name) is remembered so players recognize each other and can
rejoin in one tap.

## Design decisions (as built)

- Guard form chosen: the conjunction `!p.local && !p.hostSeat` added at
  all 5 existing token-lookup sites (DO `_acceptWs`, DO
  `webSocketMessage`, HTTP /state, HTTP /ws upgrade, HTTP /action). It
  mirrors the local-seat guard exactly: a seat with no token can never
  be resolved as a phone player, whatever flag made it tokenless.
  Phone players with real tokens are unaffected.
- Removal path chosen: a separate tiny host action 'hostLeave' instead
  of overloading removeBot. removeBot's wire shape (data-seat) and its
  error text ('Ô này không phải Máy.') assume bot/keyboard targets;
  hostLeave names no seat, so it can only ever free the room's single
  hostSeat, and only in lobby/choosing. A side effect falls out for
  free: removeBot structurally refuses a hostSeat (it is human and not
  local, so it lands on the 'Ô này không phải Máy.' branch) — asserted
  in Audit Y.
- My-seat sends: every my-seat command goes through localAct(seat,
  body) — the same forSeat-relay helper the keyboard panels use. It
  stamps host role/token + forSeat, adopts the returned host view, and
  only toasts errors; it never routes through act(), whose
  'không hợp lệ' session-clearing would kick the host out of their own
  room on a mere rules error (e.g. an illegal Tiến Lên play).
- forSeat error string kept: 'Ghế này không phải người chơi bàn phím.'
  fires only for phone/bot/empty targets now; relayable targets are
  seats with p.local || p.hostSeat. The string mentions keyboards but
  is unreachable for the host's own seat (the relay succeeds), and
  changing it would break Audit V's pinned expectations.

## Server

- hostAction 'hostJoin' {name}: lobby/choosing only, else
  'Chỉ nhận ghế chủ phòng được khi đang ở sảnh chờ.'. At most one
  hostSeat per room — second call: 'Chủ phòng đã có ghế rồi.'. Full
  room: 'Phòng đã đủ ' + MAX_SEATS + ' người.'. Name = trim +
  slice(0,14), default 'Chủ phòng'. Seat = lowest free seat from 1.
  Record: {seat, type:'human', hostSeat:true, name, score:0} — NO token
  field, same shape discipline as local seats. Players re-sorted.
- hostAction 'hostLeave': lobby/choosing only, else
  'Chỉ rời ghế được khi đang ở sảnh chờ.'; no hostSeat present:
  'Chủ phòng chưa có ghế.'. Removes the room's single hostSeat.
- hostDispatch: forSeat target resolution extended to
  `p.seat === body.forSeat && (p.local || p.hostSeat)`.
- buildView: every players[] entry gains additive
  `hostSeat: p.hostSeat ? true : undefined` (visible to all roles — it
  is how friends recognize the room owner). Host branch: when a
  hostSeat exists AND room.game is running, attaches
  `view.myView = gameView(room, 'player', hostSeatSeat, t)` — the same
  gating as localViews. Secrecy invariant holds: myView contains ONLY
  the host seat's own private view (its role, its hand, its legal
  moves); localViews keys remain exactly the local seats.
- humanCount needs no change: it counts type 'human', and the hostSeat
  is human, so a phone room of hostSeat + 1 friend (or hostSeat + bots)
  passes the ≥1-human start gates.

## Client

Storage keys (all client-side, on the user's own device):
- localStorage 'np_identity' = {name}: saved on successful join and on
  phone-mode creation (when a name was typed); prefills #joinName and
  #pmName; when an identity exists, a note under the join name input
  reads 'Máy này đã nhớ bạn là <name> 👋' (element #idNote).
- localStorage 'np_recent' = up to 5 entries {code, role, name, token,
  seat, phone?, at}, newest first, deduped by code+role. Saved on TV
  create, phone create, and successful join. Home renders chips
  'Vào lại phòng <code> · <name>'; tapping one probes GET /state with
  the stored role/token — success adopts the session (restoring
  phoneMode from the entry's phone flag), a 'Không thấy phòng này'
  error drops the chip and toasts the existing not-found message.
- sessionStorage 'np_session' gains phoneMode (client-only flag);
  saveSession writes it, clearSession/init restore it.

Home screen:
- New card '📱 Tạo phòng chơi trên điện thoại' between the TV card and
  the join card: one line 'Không cần TV — mỗi người chơi ngay trên
  điện thoại của mình. Bạn tạo phòng, ngồi vào một ghế chơi luôn, rồi
  gửi link mời cho bạn bè.', input #pmName (prefilled from identity),
  button data-cmd="createPhone".
- Invite link: on load, if location.search contains code=XXXXXX
  (6 digits), fillHomeDefaults() types the digits into d0..d5 and
  prefills the name from identity. NO auto-join — one tap on
  'Vào phòng' remains. Implementation note: the digit check is done
  with plain string scans, NOT a regex — a `\d` written with a single
  backslash inside the PAGE template literal is silently eaten
  (shipped bug caught by the rig: the served regex read (d{6}) and
  never matched). Template-literal page code must avoid backslashes
  entirely; that is now doubly confirmed.

Creation flow (createPhone): create room via the existing call, then
immediately hostJoin with the card's name; lands in the lobby with the
seat taken. Sets S.phoneMode = true (restored across reloads via
np_session).

Host lobby (TV and phone hosts alike):
- Share row under the code boxes: '🔗 Link mời bạn bè:' + readonly
  input#shareLink (origin + '/?code=' + code) + 'Sao chép link' button
  (navigator.clipboard.writeText; fallback selects the input text and
  says so).
- When no hostSeat exists: button '🎮 Chủ phòng cũng chơi — ngồi vào
  một ghế' (data-cmd="hostJoinBtn", name from identity).
- seatCard: a hostSeat renders chip 'CHỦ PHÒNG · ĐANG CHƠI' and, in
  lobby/choosing, a 'Rời ghế' button (data-cmd="hostLeave").

My-seat section (#myseat):
- Rendered by renderMySeat() on every render() (before the signature
  early-return, like the local panels), from hostHTML's playing branch
  via mySeatHTML(v) placed directly after the stage div. Present only
  when view.myView exists. Header: '🎮 Ghế của tôi — <name>'. When
  S.phoneMode is set the card gets the .phonemode class (green border
  + glow) so the play area stands out on the creator's phone.
- Interactive games (MYSEAT_INTER): tien-len, ma-soi, ca-ngua,
  ke-gia-mao, do-vui, giai-ma-chung, chia-cuop — full controls driven
  by myView, mirroring the phone views: Tiến Lên selectable hand +
  Đánh bài/Bỏ lượt/Bỏ chọn (tlHandHTML/tlBtnsHTML factored out of the
  phone branch, shared with prefix 'myTl'; selection keyed by hand
  signature in S.myTlSel exactly like the phone's S.tlSel); Ma Sói
  role line, night pick grids per role (wolfVote/wolfGuard/wolfSeer,
  witch save toggle/poison grid/clear/done), day vote grid, dead →
  spectator line; Cá Ngựa roll button + myLegal horse buttons; Kẻ Giả
  Mạo question + answers + vote; Đố Vui answers; Giải Mã Chung symbol
  buttons; Chia Cướp Chia/Cướp buttons + chat log + chat input
  (#myChatText, its draft and focus survive repaints via the section
  signature). Countdown shows '⏳ Chuẩn bị…'. Any other game shows one
  line: 'Game hành động cần màn hình lớn — mở link mời trên một máy
  khác để vào ghế chơi game này.'
- Commands: myAnswer, myVote, myWolf (data-kind carries
  wolfVote/wolfGuard/wolfSeer/wolfPoison), myWitchSave, myWitchClear,
  myWitchDone, myRoll, myMove, mySymbol, myChoose, myChatSend,
  myTlCard, myTlPlay, myTlPass, myTlClear — all in GAME_CMDS except
  myChatSend (mirrors chatSend), all sent via localAct + forSeat.

## Tests

- Audit Y in tests/local-test.mjs (47 assertions): page markers
  (createPhone card, identity/recents plumbing, share row, my-seat
  machinery); hostJoin seat/name/default/second-call exact error/
  mid-game rejection; stored record has NO token key; forgery battery
  (player /state with missing/empty/null/'undefined' token → 403;
  /action with no/null/empty token → 403); removal both ways
  (removeBot refusal exact error, hostLeave frees, rejoin works,
  hostLeave-with-none exact error, hostLeave mid-game rejection);
  start gates (hostSeat + 1 bot starts do-vui); relay scoring (do-vui:
  host answer via forSeat recorded, reveal points identical to a
  phone's identical answer — 200 vs 200; forSeat at a PHONE seat still
  errors with the pinned string); Ma Sói secrecy (myView.myRole ===
  stored role for the host seat; host game view has no myRole/roles at
  night; the phone's role value appears nowhere in the host view
  outside myView; localViews keys unchanged at []); full Tiến Lên flow
  (hostSeat + phone + bot, staged hands, host leads 3♠ / passes /
  finishes entirely through forSeat play/pass; finish order 3-1-2;
  points 300/200/100; host seat banks 200).
- Suite: ALL TESTS PASSED — 789–790 assertions (the count wobbles by
  ±1 between runs because the tới-trắng redeal loops in Audits X/Y
  assert once per retry and the deal is random). Discrim: 7/7 PASS.
- Rig proof ~/workspace/boottest/rig-phone-mode.mjs — ALL PASS (14/14):
  phone viewport 390×844 shows the creation card; createPhone lands in
  the lobby with seat 1 taken under the typed name, #shareLink =
  origin + '/?code=' + code, session carries phoneMode:true, seat card
  labeled 'CHỦ PHÒNG · ĐANG CHƠI'; a second page opening /?code=…
  gets d0..d5 prefilled exactly; after addBot + startGame do-vui via
  API, #myseat renders with the .phonemode emphasis and 4 myAnswer
  buttons; clicking one sets game.answered[1] === true in the host
  view and myView.mine === 0. Screenshot:
  ~/workspace/boottest/phone-mode-myseat.png.

## Unfinished / unverified

- WebSocket transport for relayed sends rides the same hostDispatch as
  HTTP (the DO's webSocketMessage goes through it), and the 5-site
  guard covers the WS lookups — but the local rig cannot do WS
  upgrades, so WS relay is verified by code path only, not by a live
  socket. The live-link probe after deploy should re-check it.
- Physical multi-phone play (several real phones, real network,
  clipboard on mobile browsers) is the user's check — same standing
  disclosure as the APK.
- The 'recent' rejoin probe treats any non-not-found failure as a
  toast and keeps the chip; a room that exists but whose token was
  rotated cannot occur (tokens are per-room, fixed at creation).
- Nothing committed, nothing deployed (per task rules).
