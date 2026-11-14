# Tiến Lên Miền Nam — work notes

Task started: 2026-11-14 ~22:50 +07. Base: working tree with uncommitted
catch-up + keyboard-flexibility waves (suite 673 green, discrim 7/7) on
live HEAD 8d37f20.
Rules: additive only for existing games; no commit, no deploy; client code
inside the PAGE template literal must contain NO backticks and NO
backslashes.

## Design decisions
- Sub-state lives in `g.tl` (mirrors ca-ngua's `g.ng`); `tl: null` added
  to the createGame literal next to `wolf: null, ng: null`.
- Match end flows through a 5s 'tlWin' banner phase (finishTimedRound,
  like finishNgua's 'ngWin'); stepTienLen turns 'tlWin' into endGame,
  which banks g.points (assigned at finish time via placementAt).
- `leader` semantics: the seat of the last play maker; while the table
  is empty it equals `turn` (the player about to lead). The TV "Cái"
  marker reads this field.
- Server table object is exactly the contracted {seat, cards, kind,
  len, top} — no cached tier; tlBeats recomputes the table's combo from
  its cards via tlComboOf. To make that work for combo objects too,
  tlComboOf's return also carries `cards` (the sorted set); g.tl.table
  still stores only the contracted fields.
- Trick flow clarification (a first test draft got this wrong): after
  a lead is beaten, the turn cycles back around to the opener — the
  trick closes only when every active player except the last play
  maker has passed, opener included.
- Turn timer TL_TURN_MS = 30000 (wall-clock turnEndsAt, g.endsAt kept
  in sync for the client timer bars, phaseDur exposed like ca-ngua).
  Bots act at actAt = turn start + TL_BOT_MS (900, mirrors NGUA_BOT_MS)
  through stepTienLen — the same advance path as human timeouts.
- Timeout: a leader auto-plays their lowest single — for the 3♠ holder
  that IS card 0 (hands sort by (rank, suit)), so the first-play rule
  satisfies itself; a follower auto-passes. Mirrors ca-ngua timeouts.
- act() SESSION TRAP (same family as localAct): act() clears the phone
  session when an error contains 'không hợp lệ', and the mandated
  Tiến Lên errors 'Bài không hợp lệ.' / 'Bộ bài này không hợp lệ.'
  contain exactly that substring. The phone's Đánh/Bỏ buttons therefore
  send through a dedicated tlSend() that applies the view on success
  and only toasts errors — a rejected play can never log the player
  out, and their card selection survives (selection lives in S.tlSel,
  keyed by the myHand signature; it resets only when the hand changes).
- Tới trắng placements: winner first; everyone else still holds 13
  cards, so the remaining-card-count ordering ties completely and the
  rest fall back to ascending seat order (simplification per brief).
- Tới trắng 'dseq4' detection: a run of 4 consecutive ranks (top rank
  <= A) each holding >= 2 cards counts — a rank with 3-4 cards still
  supplies a pair.
- instantWin() check order follows the brief: dragon, sixpairs,
  quad3, dseq4.
- Bots enumerate candidates: every suit subset of each rank group
  (<= 15 per rank) for single/pair/triple/quad, plus two suit variants
  (cheapest, strongest-top) per sequence / double-sequence window.
  Break-bomb penalty: a candidate that spends some but not all cards
  of a held quad, or pair-cards of a held dseq run, without being that
  bomb, is flagged and sorted last by Vừa/Khó.
- Bot heuristics (as implemented):
  - Follow, Dễ: 25% pass even with beaters; else a random beater,
    preferring non-bombs (bombs only when they are the only beaters).
  - Follow, Vừa: cheapest beater by (breaksBomb, top strength) —
    bombs compete on equal footing.
  - Follow, Khó: cheapest non-bomb beater first. Bombs only when they
    are the only beaters: vs a single/pair of 2s, plays the cheapest
    sufficient tier when hand <= 6 or the table player's count <= 2,
    else passes; vs a non-2 play, bombs only when hand <= 4 or the
    table player's count <= 2, else passes.
  - Lead (Vừa/Khó): sort by (leads-a-2 single/pair last, most cards,
    lowest top); Dễ leads a random candidate. The match's first lead
    is filtered to combos containing card 0 (3♠).
- Local panels: custom branch — LK state gains tlSel/tlCur/tlSig per
  seat; scheme l/r moves the cursor (repeats allowed), A toggles the
  card at the cursor, B plays the selection, X passes. Selection and
  cursor reset when the hand signature changes. lkOptions stays null
  for tien-len (no pick list), so the dedicated key branch runs before
  the generic pick-list handling.
- The three shared h2/countdown ternaries that special-case ca-ngua
  (no "Vòng 1/1" suffix) gain `|| g.id === 'tien-len'`; noX2 gains
  'tien-len' too. Existing games' rendering is unchanged.

## View contract (as built)
Server g.tl fields: hands {seat:[ids]}, table {seat, cards, kind, len,
top} | null, passed {seat:true}, turn, leader, finished [seats],
firstPlay, turnEndsAt, actAt, log [<=8 strings], instantWin
{seat, kind} | null, winner (seat | null).
gameView public: id, phase ('countdown' | 'cards' | 'tlWin'), counts
{seat:n}, table (contract shape), turn, leader, passed, finished,
log, firstPlay, turnEndsAt, phaseDur, instantWin, winner.
gameView player branch adds: myHand [ids sorted], myTurn, myPassed,
mustInclude3, myRank (1-based | null).
TL export: { comboOf(cards), beats(play, table), instantWin(hand) }.

## Client (as built)
- Host stage: `.g-tien-len` teal felt; center `.tltable` panel with the
  table cards as `.tlcard2` chips (♦♥ red via `.red`), combo name and
  owner; player chips with 🂠 counts, turn outline, 'Cái' marker,
  '✋ Bỏ' passed badge, 🏆 finish rank; log lines under the table;
  'tlWin' banner with the tới trắng kind label when instantWin is set.
- Phone: hand as tappable `button.tlcard` chips (selected = lifted +
  gold outline), selection in S.tlSel keyed by the myHand signature;
  Đánh bài / Bỏ lượt / Bỏ chọn buttons; sends go through tlSend (see
  the session-trap note above); table cards also shown mini on the
  phone; finished players get a rank banner.
- Local panels: hand as `.tlp` chips (cursor = outline, selected =
  gold); lkTlSync resets selection/cursor on hand-signature change;
  lkTienLenKey handles l/r cursor, A toggle, B play, X pass.
- Catalogue bookkeeping updated with the new game: home footer now
  reads "25 game … 18 game đấu + 7 game hợp tác" and lists Tiến Lên
  Miền Nam; suite count assertions moved 24 -> 25 games, 17 -> 18
  versus.

## Tests — Audit X in tests/local-test.mjs (+70 assertions)
- TL.comboOf: single/pair/triple/quad (+tier 2, top = highest suit),
  seq 3 and 5, dseq 3 pairs (tier 1) and 4 pairs (tier 3); invalids:
  seq/dseq containing a 2, 2-card run, pair+single mix, two
  non-consecutive pairs, duplicate / out-of-range / empty /
  non-integer.
- TL.beats matrix: same-type up/down, seq length mismatch, dseq-3 over
  single 2, dseq-3 NOT over pair of 2s, quad over pair of 2s, quad
  over dseq-3, dseq-4 over quad, tier-3 longer dseq wins, quad vs quad
  by rank, non-bomb over bomb fails, pair over single fails, bomb
  over pair of Aces / single Ace fails, seq over bomb fails, empty
  table lead.
- TL.instantWin: one crafted hand per kind (dragon, sixpairs, quad3,
  dseq4) + an ordinary hand -> null.
- Scenario A (phone + 3 bots, staged hands): exact error strings for
  not-in-hand, pass-while-leading, first-play-without-3♠, invalid
  combo, out-of-turn; lead accepted; turn returns to the opener after
  both bots pass; trick closes onto the last play maker with passed
  flags cleared; full match pays 300/200/100/50 in finish order.
- Scenario B (2 phones + 1 bot, staged): secrecy — the phone's myHand
  is exact, and a structural walk of the host game view finds none of
  the hidden card ids in any array, and no myHand field at all; pass
  marks myPassed; the bot finishes mid-trick; the passed player is
  rejected re-entering with 2♥ ('Bạn đã bỏ lượt vòng này rồi.'); a
  weaker single gets the beat-it error; the trick closes over the
  finished bot and the lead skips it; passed flags reset next trick;
  points follow finish order 3-1-2 (300/200/100).
- Scenario C (phone + bot, staged): idle leader auto-plays the lowest
  single (3♠ on turn one) after 30 s; the 2-seat match completes
  (300/200).
- Scenario D (2 phones, staged): idle follower auto-passes after
  30 s; the trick closes back to the leader, follower's count intact.
- Scenario E (natural deal; phone + local seat + 2 bots): localViews
  carries exactly the local seat with its own 13-card hand; idle
  humans ride the timeouts and the full match pays exactly
  300/200/100/50.

## Progress log
- Server: registry, constants, createGame `tl: null`, beginRound deal
  + tới trắng, step dispatch, engine + bots, gameView, playerAction
  'play'/'pass' — DONE.
- Client: CSS, GCOLORS, noX2, h2 ternaries, viewSig, host stage,
  phone branch + tlSend + selection commands, local panels — DONE.
  Page script re-parsed OK via new Function; no backticks/backslashes
  introduced; no ${ anywhere in the PAGE template.
- Tests: Audit X — DONE. Final: `node tests/local-test.mjs` =
  ALL TESTS PASSED, 743 assertions (673 baseline + 70 new);
  `node tests/discrim-check.mjs` = 7/7 PASS, numbers unchanged.
  Stability: stress-ran the suite 4x consecutively — all green
  (743/743/744/742; the variance is the redeal helper's conditional
  assertion plus the pre-existing ±1 suite flake). One real flake was
  found and fixed during this work: a natural deal can itself be a
  tới trắng (~1% per 4-hand deal), which skips the 'cards' phase the
  staged scenarios pump for — scenarios A–D now enter through a
  dealCards() helper that plays an instant-win deal out, replays,
  and re-deals (the 744-assertion run exercised exactly that path).
  No commit, no deploy (per instructions).
