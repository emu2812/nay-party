/*__ENGINE_BUNDLE__*/
/*__PAGE_V__*/
export default {
  async fetch(request, env, ctx) {
    // A malformed request target must never escape as an unhandled
    // exception: unparseable URLs are served the game page, and every API
    // failure below is a clean JSON ok:false.
    let url = null;
    try { url = new URL(request.url); } catch (e) { /* fall through to the page */ }
    const path = url ? url.pathname : '/';
    if (path === '/engine.js') {
      // The shared game engine (constants, steppers, bots, views,
      // dispatch) served to the host page for LOCAL PLAY mode: rooms
      // with no remote players run the simulation in the page itself,
      // so home-network stalls cannot touch the picture. Versioned by
      // content hash in the URL, hence immutable caching.
      return new Response(ENGINE_JS, { headers: { 'content-type': 'application/javascript; charset=utf-8', 'cache-control': 'public, max-age=31536000, immutable' } });
    }
    if (path === '/api/version') {
      // Build fingerprint of the served page: open tabs poll this
      // between games and reload themselves when a new build ships,
      // so a stale tab can never keep running an old version.
      return new Response(JSON.stringify({ build: PAGE_V }), { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
    }
    if (!path.startsWith('/api/')) {
      return new Response(PAGE, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
    }
    try {
      if (path === '/api/rooms' && request.method === 'POST') {
        let code = null;
        for (let i = 0; i < 10 && !code; i++) {
          const candidate = String(randInt(100000, 999999));
          if (!(await loadRoom(env, candidate))) code = candidate;
        }
        if (!code) return fail('Không tạo được phòng, thử lại nhé.', 500);
        const room = newRoom(code, makeToken());
        await saveRoom(env, room);
        return json({ ok: true, code, hostToken: room.hostToken });
      }
      const m = path.match(/^\/api\/rooms\/(\d{6})\/(join|state|action|ws)$/);
      if (!m) return fail('Không tìm thấy đường dẫn.', 404);
      const code = m[1]; const kind = m[2];
      const room = await loadRoom(env, code);
      if (!room) return fail('Không thấy phòng này. Kiểm tra lại mã nhé.', 404);

      if (kind === 'join' && request.method === 'POST') {
        const rawBody = await request.json().catch(() => null);
        const body = rawBody && typeof rawBody === 'object' && !Array.isArray(rawBody) ? rawBody : {};
        // Joining is open in every phase except mid-game. Late joiners at
        // results/podium/final are spectators for the finished game: that
        // is safe because endGame() has already banked its points into
        // p.score and snapshotted them into lastGame (both immutable by
        // now), and room.game is null in those phases — so nothing the
        // joiner does can touch the finished game. They become a full
        // player from the next createGame(), which snapshots room.players.
        if (room.phase === 'playing') return fail('Phòng đang chơi, đợi ván sau nhé.');
        const name = typeof body.name === 'string' ? body.name.trim().slice(0, 14) : '';
        if (!name) return fail('Hãy nhập tên của bạn.');
        if (room.players.length >= MAX_SEATS) return fail('Phòng đã đủ ' + MAX_SEATS + ' người.');
        let seat = 1;
        while (playerAt(room, seat)) seat += 1;
        const player = { seat, type: 'human', name, token: makeToken(), score: 0 };
        room.players.push(player);
        room.players.sort((x, y) => x.seat - y.seat);
        advance(room);
        await saveRoom(env, room);
        pokeRoom(env, code, ctx);
        return json({ ok: true, seat, playerToken: player.token, color: SEAT_COLORS[seat - 1] });
      }

      if (kind === 'state' && request.method === 'GET') {
        const role = url.searchParams.get('role');
        const token = url.searchParams.get('token') || '';
        let seat = null;
        if (role === 'host') {
          if (token !== room.hostToken) return fail('Phiên màn hình lớn không hợp lệ.', 403);
        } else {
          const p = room.players.find((x) => x.type === 'human' && !x.local && !x.hostSeat && x.token === token);
          if (!p) return fail('Phiên tay cầm không hợp lệ.', 403);
          seat = p.seat;
        }
        advance(room);
        await saveRoom(env, room);
        return json(buildView(room, role === 'host' ? 'host' : 'player', seat));
      }

      if (kind === 'ws' && request.method === 'GET') {
        // WebSocket live channel for this room. Identity is validated
        // exactly like /state (the host token, or the player token that
        // owns a seat) BEFORE any upgrade is attempted, so bad sessions
        // get the same JSON errors as every other route and a missing
        // room the shared 404 above. The room's Durable Object accepts
        // the socket itself (hibernation API): it re-checks the identity
        // headers against its stored room, greets with the personalized
        // view, and owns the tick alarm while a game runs.
        const role = url.searchParams.get('role');
        const token = url.searchParams.get('token') || '';
        let seat = null;
        if (role === 'host') {
          if (token !== room.hostToken) return fail('Phiên màn hình lớn không hợp lệ.', 403);
        } else {
          const p = room.players.find((x) => x.type === 'human' && !x.local && !x.hostSeat && x.token === token);
          if (!p) return fail('Phiên tay cầm không hợp lệ.', 403);
          seat = p.seat;
        }
        if (!env.ROOMS_DO) return fail('Kênh WebSocket chưa khả dụng.', 501);
        if ((request.headers.get('Upgrade') || '').toLowerCase() !== 'websocket') {
          return fail('Yêu cầu này phải là nâng cấp WebSocket.', 400);
        }
        const fwd = new Request('https://room/ws', {
          headers: {
            Upgrade: 'websocket',
            'x-np-role': role === 'host' ? 'host' : 'player',
            'x-np-seat': seat === null ? '' : String(seat),
            'x-np-token': token,
          },
        });
        return roomStub(env, code).fetch(fwd);
      }

      if (kind === 'action' && request.method === 'POST') {
        const rawBody = await request.json().catch(() => null);
        const body = rawBody && typeof rawBody === 'object' && !Array.isArray(rawBody) ? rawBody : {};
        let seat = null; let player = null;
        if (body.role === 'host') {
          if (body.token !== room.hostToken) return fail('Phiên màn hình lớn không hợp lệ.', 403);
        } else {
          player = room.players.find((x) => x.type === 'human' && !x.local && !x.hostSeat && x.token === body.token) || null;
          if (!player) return fail('Phiên tay cầm không hợp lệ.', 403);
          seat = player.seat;
        }
        advance(room);
        const err = body.role === 'host' ? hostDispatch(room, body) : playerAction(room, player, body);
        if (err) { await saveRoom(env, room); pokeRoom(env, code, ctx); return fail(err); }
        advance(room);
        await saveRoom(env, room);
        pokeRoom(env, code, ctx);
        // Pad snapshots are fire-and-forget: clients ignore this response
        // body (the web page's sendPad callback is empty; views arrive via
        // /state polling). Shipping the full ~3.4KB view here would make
        // the controller's serial pad channel wait for a whole download
        // after every snapshot on slow links, so a successful pad gets a
        // tiny ack instead. Errors above keep the existing error JSON.
        if (body.action === 'pad') return json({ ok: true, serverNow: now() });
        return json(buildView(room, body.role === 'host' ? 'host' : 'player', seat));
      }
      return fail('Không tìm thấy đường dẫn.', 404);
    } catch (e) {
      return fail('Lỗi máy chủ: ' + (e && e.message ? e.message : 'không rõ'), 500);
    }
  },
};

// ---------------------------------------------------------------------------
// The game page (single HTML document). NOTE: the client script below is
// written without template literals or backslashes on purpose — it lives
// inside this template literal.
// ---------------------------------------------------------------------------
