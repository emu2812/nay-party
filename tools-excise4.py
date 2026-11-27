#!/usr/bin/env python3
"""Round 28b excision: remove son-san, keo-co, cao-boi from
engine1 + engine2 + page. Anchor-verified; aborts on mismatch."""

def load(p):
    return open(p).read().split('\n')

def save(p, lines):
    open(p, 'w').write('\n'.join(lines))

def find(lines, anchor, start=0):
    hits = [i for i in range(start, len(lines)) if anchor in lines[i]]
    assert len(hits) == 1, f'anchor {anchor!r}: {len(hits)} hits'
    return hits[0]

def find_first(lines, anchor, start=0):
    for i in range(start, len(lines)):
        if anchor in lines[i]:
            return i
    raise AssertionError('not found: ' + anchor)

def block_end(lines, s):
    depth = 0
    for i in range(s, len(lines)):
        for ch in lines[i]:
            if ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0:
                    return i
    raise AssertionError('no end from ' + str(s))

def elseif_span(lines, anchor, start=0):
    s = find_first(lines, anchor, start)
    assert '} else if' in lines[s], lines[s]
    depth = 1
    for i in range(s + 1, len(lines)):
        done = False
        for ch in lines[i]:
            if ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0:
                    return (s, i)
    raise AssertionError('no sibling for ' + anchor)

def ifblock(lines, anchor, start=0):
    s = find_first(lines, anchor, start)
    return (s, block_end(lines, s) + 1)

def funcgroup(lines, first_fn, next_fn):
    s = find_first(lines, 'function ' + first_fn + '(')
    e = find_first(lines, 'function ' + next_fn + '(', start=s + 1)
    assert s < e
    return (s, e)

def apply(p, spans, edits, label):
    lines = load(p)
    for (i, old, new) in edits:
        assert old in lines[i], (label, lines[i])
        lines[i] = lines[i].replace(old, new)
    spans = sorted(set(spans))
    merged = []
    for (s, e) in spans:
        if merged and s < merged[-1][1]:
            merged[-1] = (merged[-1][0], max(merged[-1][1], e))
        else:
            merged.append((s, e))
    n0 = len(lines)
    for (s, e) in sorted(merged, reverse=True):
        assert 0 <= s < e <= len(lines), (label, s, e)
        del lines[s:e]
    save(p, lines)
    print(f'{label}: {n0} -> {len(lines)} ({n0 - len(lines)} removed)')

G3 = ['son-san', 'keo-co', 'cao-boi']

# ---------------- engine1 ----------------
p = 'src/engine1.mjs'
lines = load(p)
spans, edits = [], []
for gid in G3:
    spans.append((find(lines, "'" + gid + "': { name:"),) * 0 + (find(lines, "'" + gid + "': { name:"), find(lines, "'" + gid + "': { name:") + 1))
i = find(lines, '// Kéo Co: knot = TUG_STEP')
j = find(lines, 'const BOT_TUG')
spans.append((i, j + 1))
i = find(lines, '// Sơn Sàn: 18x10 grid')
spans.append((i, find(lines, 'const SPLAT_MS', start=i) + 1))
i = find(lines, '// Cao Bồi: after a random hidden delay')
j = find(lines, 'const DUEL_WINDOW_MS', start=i)
spans.append((i, j + 1))
apply(p, spans, edits, 'engine1')

# ---------------- engine2 ----------------
p = 'src/engine2.mjs'
lines = load(p)
spans, edits = [], []
for gid in G3:
    spans.append(elseif_span(lines, "} else if (g.id === '" + gid + "') {"))
for gid, fn in [('keo-co', 'stepTug'), ('son-san', 'stepSplat'), ('cao-boi', 'stepDuel')]:
    i = find(lines, "if (g.id === '" + gid + "') return " + fn)
    spans.append((i, i + 1))
spans.append(funcgroup(lines, 'tugKnot', 'collectMoves'))
spans.append(funcgroup(lines, 'splatCell', 'stepDuel'))
spans.append(funcgroup(lines, 'stepDuel', 'stepShared'))
gv = find(lines, 'function gameView')
for gid in G3:
    spans.append(elseif_span(lines, "} else if (g.id === '" + gid + "') {", start=gv))
# NUDGE_PHASES entry + padNudge splat branch
i = find(lines, "'son-san': 'splat',")
edits.append((i, "'son-san': 'splat', ", ''))
spans.append(ifblock(lines, "if (g.id === 'son-san') {", start=find(lines, 'function padNudge')))
# pad handler: tug press sub-block + guard clauses
spans.append(ifblock(lines, "if (g.id === 'keo-co' && g.phase === 'pull'"))
i = find(lines, "g.id !== 'keo-co'")
edits.append((i, " && g.id !== 'keo-co'", ''))
i = find(lines, "g.id !== 'son-san'")
edits.append((i, " && g.id !== 'son-san'", ''))
# tap handler: cao-boi block
spans.append(ifblock(lines, "if (g.id === 'cao-boi') {", start=find(lines, "if (a === 'tap') {")))
apply(p, spans, edits, 'engine2')

# ---------------- page ----------------
p = 'src/page.mjs'
lines = load(p)
spans, edits = [], []
for gid in G3:
    i = find(lines, '.g-' + gid + ' {')
    spans.append((i, i + 1))
    i = find(lines, "'" + gid + "': '🎮")
    spans.append((i, i + 1))
i = find(lines, "'keo-co': 20000")
edits.append((i, ", 'keo-co': 20000", ''))
i = find(lines, "'keo-co': '#064A38'")
spans.append((i, i + 1))
i = find(lines, "'son-san': '#0E7490', 'cao-boi': '#7C2D12'")
spans.append((i, i + 1))
i = find(lines, 'function noX2')
edits.append((i, " || id === 'keo-co'", ''))
edits.append((i, " || id === 'son-san'", ''))
i = find(lines, 'function isActionGame')
edits.append((i, " || id === 'keo-co'", ''))
edits.append((i, " || id === 'son-san'", ''))
hs = find(lines, 'function hostStage')
for gid in G3:
    spans.append(elseif_span(lines, "} else if (g.id === '" + gid + "') {", start=hs))
vs = find(lines, 'function viewSig')
for gid in ['keo-co', 'son-san']:
    spans.append(elseif_span(lines, "} else if (g.id === '" + gid + "') {", start=vs))
i = find(lines, 'var FIELD_GAMES')
edits.append((i, "'son-san': 1, ", ''))
i = find(lines, "case 'cao-boi':", start=find(lines, 'function playerCtrlKey'))
spans.append((i, i + 2))
i = find(lines, 'var PRED_GAMES')
edits.append((i, "'son-san': 1, ", ''))
spans.append(ifblock(lines, "if (g.id === 'keo-co') {", start=find(lines, 'function patchPositions')))
i = find(lines, "g.id === 'son-san') && g.blobs")
edits.append((i, " || g.id === 'son-san'", ''))
spans.append(ifblock(lines, "if (g.id === 'son-san' && g.grid) {", start=find(lines, 'function patchPositions')))
i = find(lines, 'var PFIELD_PHASES')
edits.append((i, "'son-san': 'splat', ", ''))
spans.append(ifblock(lines, "if (g.id === 'son-san' && g.grid) {", start=find(lines, 'function pfieldHTML')))
ps = find(lines, 'function playerHTML')
i = find(lines, "g.id === 'son-san') {", start=ps)
edits.append((i, " || g.id === 'son-san'", ''))
for gid in ['cao-boi', 'keo-co']:
    spans.append(elseif_span(lines, "} else if (g.id === '" + gid + "') {", start=ps))
spans.append(ifblock(lines, "if (bit === 'b' && S.view && S.view.game && S.view.game.id === 'keo-co'"))
for anchor in ["else if (g.id === 'cao-boi') { if (bit === 'a') { sfxTap(); act({ action: 'tap' }); } }",
               "else if (g.id === 'cao-boi') { if (bit === 'a') localAct(seat, { action: 'tap' }); }"]:
    hits = [i for i, l in enumerate(lines) if anchor in l]
    assert hits, anchor
    for i in hits:
        spans.append((i, i + 1))
i = find(lines, 'var LK_PAD_GAMES')
edits.append((i, "'son-san': 1, ", ''))
for gid in ['cao-boi', 'keo-co']:
    i = find(lines, "if (g.id === '" + gid + "') return '<div class=\"lpline\">")
    spans.append((i, i + 1))
i = find(lines, "(v.game.id === 'cao-boi'")
edits.append((i, "(v.game.id === 'cao-boi' && (v.game.phase === 'wait' || v.game.phase === 'go')) || ", ''))
edits.append((i, "(v.game.id === 'keo-co' && v.game.phase === 'pull') || ", ''))
edits.append((i, "(v.game.id === 'son-san' && v.game.phase === 'splat') || ", ''))
apply(p, spans, edits, 'page')
print('excise4 done')
