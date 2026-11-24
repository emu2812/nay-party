export class RoomStore {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    // Diff memory for broadcasts: socket -> last serialized view sent.
    // Instance-local on purpose — hibernation may drop it, and the worst
    // case is one duplicate state message per socket after a wake.
    this.lastSent = new Map();
  }
  async fetch(request) {
    this._lastDrive = Date.now();
    const path = new URL(request.url).pathname;
    if (path === '/get' && request.method === 'GET') {
      const entry = await this.state.storage.get('room');
      if (!entry) return new Response(null, { status: 404 });
      if (entry.expiresAt <= Date.now()) {
        await this.state.storage.delete('room');
        return new Response(null, { status: 404 });
      }
      return new Response(entry.json, {
        headers: { 'content-type': 'application/json; charset=utf-8' },
      });
    }
    if (path === '/put' && request.method === 'PUT') {
      const text = await request.text();
      await this.state.storage.put('room', {
        json: text,
        expiresAt: Date.now() + ROOM_TTL_SECONDS * 1000,
      });
      return new Response(null, { status: 200 });
    }
    if (path === '/delete' && request.method === 'POST') {
      await this.state.storage.delete('room');
      return new Response(null, { status: 200 });
    }
    if (path === '/ws' && request.method === 'GET') return this._acceptWs(request);
    if (path === '/poke' && request.method === 'POST') {
      try {
        const loaded = await this._loadRoom();
        if (loaded) { this._broadcast(loaded.room); await this._syncAlarm(loaded.room); }
      } catch (e) { /* a poke must never fail the caller's request */ }
      return new Response(null, { status: 200 });
    }
    return new Response(null, { status: 404 });
  }
  // Load the room record exactly as /get sees it (same envelope, same key,
  // same logical expiry), plus the raw stored text for change detection.
  async _loadRoom() {
    const entry = await this.state.storage.get('room');
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      await this.state.storage.delete('room');
      return null;
    }
    let room = null;
    try { room = JSON.parse(entry.json); } catch (e) { return null; }
    return room ? { room, json: entry.json } : null;
  }
  // Persist only when the serialized room actually moved (mirrors the
  // intent of saveRoom's payload dedup on the worker side).
  async _saveIfChanged(loaded) {
    if (JSON.stringify(loaded.room) === loaded.json) return false;
    loaded.room.updatedAt = now();
    const text = JSON.stringify(loaded.room);
    await this.state.storage.put('room', {
      json: text,
      expiresAt: Date.now() + ROOM_TTL_SECONDS * 1000,
    });
    loaded.json = text;
    return true;
  }
  _sockets() {
    try {
      return this.state && typeof this.state.getWebSockets === 'function'
        ? this.state.getWebSockets() : [];
    } catch (e) { return []; }
  }
  _bye(ws) {
    try { ws.send(JSON.stringify({ type: 'bye' })); } catch (e) { /* already gone */ }
    try { ws.close(1001, 'Phòng đã đóng.'); } catch (e) { /* already gone */ }
  }
  // Send this socket its personalized view, but only when it changed.
  // The diff key is the serialized view with serverNow neutralized: the
  // clock field differs on every buildView call and would defeat the
  // compare, pushing every tick to every socket. A dead socket is
  // contained here — it can never break the broadcast or a save.
  _sendState(ws, room) {
    try {
      const att = ws.deserializeAttachment() || {};
      const view = buildView(room, att.role === 'host' ? 'host' : 'player', att.seat || null);
      const diffKey = JSON.stringify(Object.assign({}, view, { serverNow: 0 }));
      if (this.lastSent.get(ws) === diffKey) return;
      this.lastSent.set(ws, diffKey);
      ws.send(JSON.stringify({ type: 'state', view }));
    } catch (e) { /* one dead socket must not affect the others */ }
  }
  _broadcast(room) {
    const sockets = this._sockets();
    for (const ws of sockets) this._sendState(ws, room);
  }
  // Keep a TICK_MS alarm armed exactly while a game is active (or a
  // playlist intermission is pending) and at least one socket is
  // attached; disarm otherwise. Only arms when no alarm is pending,
  // so frequent calls never postpone a due tick.
  async _syncAlarm(room, base) {
    try {
      const st = this.state && this.state.storage;
      if (!st || typeof st.setAlarm !== 'function' || typeof st.getAlarm !== 'function') return;
      const want = !!((room && room.game) || (room && room.phase === 'results' && room.playlistNextAt)) && this._sockets().length > 0;
      const current = await st.getAlarm();
      if (want && current === null) {
        // Metronome arming: the next wake is scheduled off the PREVIOUS
        // wake's target (base, threaded from alarm() via this._alarmFor),
        // not off whenever this handler happens to finish. Handler work
        // plus platform delivery latency used to inflate every cycle
        // from 62.5 ms to ~100 ms, and state pushes inherited the gap.
        // DRIVEN MODE: while any client is actively driving the loop
        // (the host page's tick pump, pad messages, polls — every
        // contact stamps _lastDrive), the alarm demotes itself to a
        // 1 s backstop. Alarm invocations are the free plan's scarcest
        // resource (each bills as a full request — a tick-rate alarm
        // is ~57,600 billed requests per room-hour against a 100,000
        // per DAY free budget, plus a billed row-write per setAlarm),
        // while incoming WebSocket messages bill at 20:1, so the pump
        // is ~50x cheaper per drive. If no client has driven for
        // 250 ms (old page build, frozen host tab), the alarm resumes
        // the full tick metronome — the game never depends on the pump.
        const driven = this._lastDrive && (Date.now() - this._lastDrive) < 250;
        let target = (base || Date.now()) + (driven ? 1000 : TICK_MS);
        const nowMs = Date.now();
        if (target <= nowMs) target = nowMs + 5;
        this._alarmFor = target;
        await st.setAlarm(target);
      }
      if (!want && current !== null && typeof st.deleteAlarm === 'function') { this._alarmFor = 0; await st.deleteAlarm(); }
    } catch (e) { /* best-effort: HTTP lazy advance still works without it */ }
  }
  async _acceptWs(request) {
    // Hibernation API unavailable (local test harness, exotic envs):
    // answer a clean JSON error so the worker passes it through and
    // clients stay on HTTP polling, completely unaffected.
    if (typeof WebSocketPair !== 'function' || !this.state || typeof this.state.acceptWebSocket !== 'function') {
      return fail('Kênh WebSocket chưa khả dụng.', 501);
    }
    const role = request.headers.get('x-np-role') === 'host' ? 'host' : 'player';
    const seatRaw = parseInt(request.headers.get('x-np-seat') || '', 10);
    const seat = role === 'player' && Number.isInteger(seatRaw) ? seatRaw : null;
    const token = request.headers.get('x-np-token') || '';
    const loaded = await this._loadRoom();
    if (!loaded) return fail('Không thấy phòng này. Kiểm tra lại mã nhé.', 404);
    // The worker already validated this identity; re-check it against
    // the stored room anyway so the object never trusts headers alone.
    if (role === 'host') {
      if (token !== loaded.room.hostToken) return fail('Phiên màn hình lớn không hợp lệ.', 403);
    } else {
      const p = loaded.room.players.find((x) => x.type === 'human' && !x.local && !x.hostSeat && x.seat === seat && x.token === token);
      if (!p) return fail('Phiên tay cầm không hợp lệ.', 403);
    }
    const pair = new WebSocketPair();
    const client = pair[0]; const server = pair[1];
    this.state.acceptWebSocket(server, role === 'host' ? ['host'] : ['player', 'seat-' + seat]);
    try { server.serializeAttachment({ role, seat, token }); } catch (e) { /* tags still identify it */ }
    try {
      // Greet exactly like a /state poll would: advance the sim, persist
      // if it moved, then hand this socket its personalized view.
      advance(loaded.room);
      await this._saveIfChanged(loaded);
      this._sendState(server, loaded.room);
      await this._syncAlarm(loaded.room);
    } catch (e) { /* a failed greeting must not break the upgrade */ }
    return new Response(null, { status: 101, webSocket: client });
  }
  async webSocketMessage(ws, message) {
    try {
      if (typeof message !== 'string') return;
      let body = null;
      try { body = JSON.parse(message); } catch (e) { return; }
      if (!body || typeof body !== 'object' || Array.isArray(body)) return;
      if (body.action === 'ping') {
        // App-level RTT probe for the on-screen meter: answer on
        // this socket immediately, without touching room state.
        try { ws.send(JSON.stringify({ type: 'pong', t: body.t || 0 })); } catch (e) {}
        return;
      }
      let att = {};
      try { att = ws.deserializeAttachment() || {}; } catch (e) { /* treated as bad identity below */ }
      const loaded = await this._loadRoom();
      if (!loaded) { this._bye(ws); return; }
      const room = loaded.room;
      // The identity pinned at accept time must still own its seat: a
      // socket never outlives the session it was opened for.
      let player = null;
      if (att.role === 'host') {
        if (!att.token || att.token !== room.hostToken) { this._bye(ws); return; }
      } else {
        player = room.players.find((p) => p.type === 'human' && !p.local && !p.hostSeat && p.seat === att.seat && p.token === att.token) || null;
        if (!player) { this._bye(ws); return; }
      }
      this._lastDrive = Date.now();
      // Tick-pump rate gate: the host page drives the loop with
      // 'tick' messages every ~30 ms while playing; anything faster
      // than 20 ms spacing is redundant (the sim is time-based, so
      // extra advances add nothing) and is dropped before any work.
      if (body.action === 'tick') {
        const nowT = Date.now();
        if (this._lastPumpAt && nowT - this._lastPumpAt < 20) return;
        this._lastPumpAt = nowT;
      }
      // The HTTP action pipeline, verbatim: advance, dispatch, advance,
      // save (even on error — the first advance may have moved the sim),
      // then push the fresh personalized views to every socket.
      advance(room);
      // A 'tick' message is a pure loop-driver: the sender noticed
      // state pushes had gone quiet (the alarm path can stall for
      // seconds at the platform level) and asks the object to advance
      // and broadcast NOW, inside this message handler — the handler
      // path has never shown the alarm path's stalls. No dispatch.
      const err = body.action === 'tick' ? null : (att.role === 'host' ? hostDispatch(room, body) : playerAction(room, player, body));
      if (err) {
        await this._saveIfChanged(loaded);
        try { ws.send(JSON.stringify({ type: 'error', error: err })); } catch (e) { /* socket dying */ }
        this._broadcast(room);
        await this._syncAlarm(room);
        return;
      }
      advance(room);
      await this._saveIfChanged(loaded);
      this._broadcast(room);
      await this._syncAlarm(room);
    } catch (e) { /* a bad message must never crash the object */ }
  }
  webSocketClose(ws) { this.lastSent.delete(ws); }
  webSocketError(ws) { this.lastSent.delete(ws); }
  async alarm() {
    try {
      const loaded = await this._loadRoom();
      const sockets = this._sockets();
      if (!loaded) {
        // The room was deleted/expired under live sockets: say bye first.
        for (const ws of sockets) this._bye(ws);
        return;
      }
      if (sockets.length === 0) { await this._syncAlarm(null); return; }
      // A pending playlist auto-start also keeps the alarm alive: the
      // room sits in results with no game, but the intermission
      // deadline must fire on time even if nobody polls.
      const active = !!loaded.room.game || (loaded.room.phase === 'results' && !!loaded.room.playlistNextAt);
      if (!active) { await this._syncAlarm(null); return; }
      advance(loaded.room);
      // Save BEFORE broadcasting: a broadcast failure (contained per
      // socket in _sendState) can never corrupt or block persistence.
      await this._saveIfChanged(loaded);
      this._broadcast(loaded.room);
      await this._syncAlarm(loaded.room, this._alarmFor || 0); // the fired alarm is spent: re-arm on the metronome base
    } catch (e) { /* an alarm must never throw */ }
  }
}
