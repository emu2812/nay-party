#!/usr/bin/env python3
"""Test surgery for the restore round: local-test back to wolf+ngua,
minus chia/impostor/decode/splat/tug/duel."""
lines = open('tests/local-test.mjs').read().split('\n')

def find(anchor, start=0):
    hits = [i for i in range(start, len(lines)) if anchor in lines[i]]
    assert len(hits) == 1, (anchor, hits)
    return hits[0]

def find_first(anchor, start=0):
    for i in range(start, len(lines)):
        if anchor in lines[i]:
            return i
    raise AssertionError('not found: ' + anchor)

def block_end(s):
    depth = 0
    for i in range(s, len(lines)):
        for ch in lines[i]:
            if ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0:
                    return i
    raise AssertionError('no end')

spans = []
# playthrough functions for removed games
for fn, nxt in [('playTug', 'playChia'), ('playChia', 'playSteal'),
                ('playSplat', 'playDuel'), ('playDuel', 'main')]:
    s = find_first('async function ' + fn + '()')
    e = find_first('async function ' + nxt + '()', start=s + 1)
    spans.append((s, e))
# their collect lines
for fn in ['playTug', 'playChia', 'playSplat', 'playDuel']:
    spans.append((find('collect(await ' + fn + '());'),) * 1 and (find('collect(await ' + fn + '());'), find('collect(await ' + fn + '());') + 1))
# impostor + decode sections (verified boundaries)
spans.append((1556, 1742))
spans.append((1742, 1841))
# splat + duel audit sections (Audit I tail)
s = find('  // --- Sơn Sàn: scripted paths paint hand-counted cells')
e = find("console.log('Audit J:")
spans.append((s, e))
# local impostor secrecy block (verified boundary)
spans.append((3638, 3666))
# tg tug-countdown block: bare { } around the Kéo Co comment
c = find('    // Kéo Co counts presses inside the pad action handler')
s = c - 1
assert lines[s].strip() == '{', lines[s]
spans.append((s, block_end(s) + 1))
# son-san nudge sub-block
c = find('    // --- son-san: the nudge clamps')
s = c - 1
assert lines[s].strip() == '{', lines[s]
spans.append((s, block_end(s) + 1))
# mx versus leg: tug block from startGame keo-co to the continue after results
s = find("  await mxDrv.act({ action: 'startGame', game: 'keo-co' });")
e = find("  await mxDrv.act({ action: 'continue' });", start=s)
spans.append((s, e))
for (a, b) in sorted(set(spans), reverse=True):
    del lines[a:b]
txt = '\n'.join(lines)

def rep(old, new, n=1):
    global txt
    assert txt.count(old) == n, (old[:70], txt.count(old))
    txt = txt.replace(old, new)

rep("import worker, { QUIZ_BANK, IMPOSTOR_BANK, RoomStore, BALLISTICS, TL } from '../worker.mjs';",
    "import worker, { QUIZ_BANK, RoomStore, BALLISTICS, TL } from '../worker.mjs';")
# mx versus leg replacement (do-vui, generic banking properties)
rep("  await mxDrv.act({ action: 'toChoosing' });",
    """  await mxDrv.act({ action: 'toChoosing' });
  await mxDrv.act({ action: 'startGame', game: 'do-vui' });
  await pumpD(mxDrv, 125, (s) => s.game && s.game.phase === 'question', 'mixed quiz begins');
  mv = await pumpD(mxDrv, 125, (s) => s.phase === 'results', 'mixed quiz results', 3000);
  assert(mv.lastGame.id === 'do-vui' && mv.lastGame.teamResult === null
    && typeof mv.lastGame.points[1] === 'number' && typeof mv.lastGame.points[2] === 'number',
    'mixed: the versus game banks per-player points with NO teamResult, got ' + JSON.stringify(mv.lastGame));""")
# homepage assertions
rep("home.text.indexOf('Né Laze') >= 0 && home.text.indexOf('Kéo Co') >= 0 && home.text.indexOf('Chia Hay Cướp') >= 0, 'page lists the 3 new games (Né Laze, Kéo Co, Chia Hay Cướp)'",
    "home.text.indexOf('Né Laze') >= 0 && home.text.indexOf('Ma Sói') >= 0 && home.text.indexOf('Cờ Cá Ngựa') >= 0, 'page lists Né Laze, Ma Sói, Cờ Cá Ngựa'")
rep("home.text.indexOf('25 game') >= 0, 'homepage footer counts all 25 games'",
    "home.text.indexOf('19 game') >= 0, 'homepage footer counts all 19 games'")
rep("v.games && v.games.length === 25, 'lobby game list carries all 25 games'",
    "v.games && v.games.length === 19, 'lobby game list carries all 19 games'")
rep("v.games.filter((gm) => gm.cat === 'versus').length === 18, 'exactly 18 games are categorized versus'",
    "v.games.filter((gm) => gm.cat === 'versus').length === 13, 'exactly 13 games are categorized versus'")
rep("'cheo-thuyen,chung-mot-than,day-hop,den-lua-nuoc,ech-op,giai-ma-chung,thu-thanh', 'co-op group is exactly the 7 co-op games (chung-mot-than, day-hop, cheo-thuyen, thu-thanh, giai-ma-chung, den-lua-nuoc, ech-op)'",
    "'cheo-thuyen,chung-mot-than,day-hop,den-lua-nuoc,ech-op,thu-thanh', 'co-op group is exactly the 6 co-op games (chung-mot-than, day-hop, cheo-thuyen, thu-thanh, den-lua-nuoc, ech-op)'")
rep("byId['ke-gia-mao'] === 'versus'", "byId['ma-soi'] === 'versus'")
rep("byId['giai-ma-chung'] === 'coop'", "byId['chung-mot-than'] === 'coop'")
rep("console.log('Audit K: complex games — tanks, bombs, impostor, defence, decode');",
    "console.log('Audit K: complex games — tanks, bombs, defence');")
# Audit D + E vehicles
rep("let sr = await sDrv.act({ action: 'startGame', game: 'cao-boi' });",
    "let sr = await sDrv.act({ action: 'startGame', game: 'do-vui' });")
rep("await fDrv.act({ action: 'startGame', game: 'cao-boi' });",
    "await fDrv.act({ action: 'startGame', game: 'do-vui' });")
# playlist vehicles
rep("const badPl = await plDrv.act({ action: 'playlistStart', games: ['cao-boi'] });",
    "const badPl = await plDrv.act({ action: 'playlistStart', games: ['xe-tank'] });")
rep("const plStart = await plDrv.act({ action: 'playlistStart', games: ['cao-boi', 'ke-gia-mao', 'do-vui'] });",
    "const plStart = await plDrv.act({ action: 'playlistStart', games: ['xe-tank', 'ke-gia-mao', 'do-vui'] });")
rep("plStart.game && plStart.game.id === 'cao-boi'", "plStart.game && plStart.game.id === 'xe-tank'")
rep("await psDrv.act({ action: 'playlistStart', games: ['cao-boi', 'do-vui'] });",
    "await psDrv.act({ action: 'playlistStart', games: ['xe-tank', 'do-vui'] });", n=2)
rep("const psManual = await psDrv.act({ action: 'startGame', game: 'cao-boi' });",
    "const psManual = await psDrv.act({ action: 'startGame', game: 'xe-tank' });")
# runtime skip: ma-soi (min 4) replaces ke-gia-mao; xe-tank replaces cao-boi
rep("const skStart = await skDrv.act({ action: 'playlistStart', games: ['do-vui', 'ke-gia-mao', 'cao-boi'] });",
    "const skStart = await skDrv.act({ action: 'playlistStart', games: ['do-vui', 'ma-soi', 'xe-tank'] });")
rep("'playlist skip: a 3-seat room queues all three games, Kẻ Giả Mạo included'",
    "'playlist skip: a 3-seat room queues all three games, Ma Sói included'")
rep("skAuto.game && skAuto.game.id === 'cao-boi',\n    'playlist skip: seat-gated Kẻ Giả Mạo is skipped at runtime after the seats drop; Cao Bồi starts'",
    "skAuto.game && skAuto.game.id === 'xe-tank',\n    'playlist skip: seat-gated Ma Sói is skipped at runtime after the seats drop; Xe Tăng starts'")
# oct placement vehicle
rep("const sStart = await oct.act({ action: 'startGame', game: 'son-san' });",
    "const sStart = await oct.act({ action: 'startGame', game: 'xe-tank' });")
# Audit U + perf catalog counts
rep("home.text.indexOf('25 game') >= 0 && home.text.indexOf('bigHeadSVG') >= 0",
    "home.text.indexOf('19 game') >= 0 && home.text.indexOf('bigHeadSVG') >= 0")
rep("pLobby.games && pLobby.games.length === 25, 'perf: lobby view carries the full 25-game catalog'",
    "pLobby.games && pLobby.games.length === 19, 'perf: lobby view carries the full 19-game catalog'")
rep("pBack.games && pBack.games.length === 25,", "pBack.games && pBack.games.length === 19,")
open('tests/local-test.mjs', 'w').write(txt)
print('local-test surgery done')
