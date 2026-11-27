#!/usr/bin/env python3
"""Round 28 excision, page.mjs: remove all UI for the 5 removed
games. Anchor-verified; aborts on mismatch."""
lines = open('src/page.mjs').read().split('\n')
spans = []
edits = []  # (line_idx, old_sub, new_sub)

def find(anchor, start=0, nth=0):
    hits = [i for i in range(start, len(lines)) if anchor in lines[i]]
    assert len(hits) > nth, f'anchor {anchor!r}: {len(hits)} hits, wanted #{nth}'
    return hits[nth]

def find_exact1(anchor, start=0):
    hits = [i for i in range(start, len(lines)) if anchor in lines[i]]
    assert len(hits) == 1, f'anchor {anchor!r}: {len(hits)} hits'
    return hits[0]

def block_end(s, depth0=0):
    depth = depth0
    for i in range(s, len(lines)):
        for ch in lines[i]:
            if ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0:
                    return i
    raise AssertionError('no end from ' + str(s))

def elseif_span(anchor, start=0, nth=0):
    s = find(anchor, start, nth)
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
        # loop continues
    raise AssertionError('no sibling for ' + anchor)

def ifblock(anchor, start=0, nth=0):
    s = find(anchor, start, nth)
    return (s, block_end(s) + 1)

GAMES5 = ['chia-cuop', 'ke-gia-mao', 'giai-ma-chung']

# --- single-line deletions: CSS stage classes, GAME_CTL entries ---
for gid in GAMES5:
    spans.append((find_exact1('.g-' + gid + ' {'),) * 1 and (find_exact1('.g-' + gid + ' {'), find_exact1('.g-' + gid + ' {') + 1))
for gid in GAMES5:
    i = find_exact1("'" + gid + "': '📱")
    spans.append((i, i + 1))

# --- text edits on shared lines ---
def edit(anchor, old, new, nth=0):
    i = find(anchor, 0, nth)
    assert old in lines[i], (anchor, lines[i])
    edits.append((i, old, new))

edit("'ma-soi': '#1E1B4B', 'ca-ngua': '#78350F',", "'ma-soi': '#1E1B4B', 'ca-ngua': '#78350F',", '')  # placeholder replaced below
edits.pop()
pass
# (multi-line edits handled specially after spans; see below)
i = find_exact1("'chia-cuop': '#241457'")
spans.append((i, i + 1))
i = find_exact1("'ke-gia-mao': '#4C1D95'")
spans.append((i, i + 1))
edit("'thu-thanh': '#0E7490', 'giai-ma-chung': '#3730A3'", "'thu-thanh': '#0E7490', 'giai-ma-chung': '#3730A3'", "'thu-thanh': '#0E7490'")
edit("function noX2", " || id === 'giai-ma-chung'", '')
edit("function isActionGame", " || id === 'chia-cuop'", '')
edit('var MYSEAT_INTER', "var MYSEAT_INTER = { 'tien-len': 1, 'ma-soi': 1, 'ca-ngua': 1, 'ke-gia-mao': 1, 'do-vui': 1, 'giai-ma-chung': 1, 'chia-cuop': 1 };", "var MYSEAT_INTER = { 'tien-len': 1, 'ma-soi': 1, 'ca-ngua': 1, 'do-vui': 1 };")
# --- mySeatHTML standalone branches ---
ms = find('function mySeatHTML')
for gid in GAMES5:
    spans.append(ifblock("if (g.id === '" + gid + "') {", start=ms))

# --- hostStage else-if branches ---
hs = find('function hostStage')
for gid in GAMES5:
    spans.append(elseif_span("} else if (g.id === '" + gid + "') {", start=hs))

# --- viewSig else-if branches ---
vs = find('function viewSig')
for gid in GAMES5:
    spans.append(elseif_span("} else if (g.id === '" + gid + "') {", start=vs))

# --- phone sig switch cases ---
sw = find("case 'chia-cuop'")
for gid in ['chia-cuop', 'ke-gia-mao']:
    s = find("case '" + gid + "':", start=sw - 200)
    if lines[s].rstrip().endswith('{'):
        e = block_end(s) + 1  # include the closing '}' line of the case block
    else:
        e = s + 1
        while 'return' not in lines[e - 1]:
            e += 1
    spans.append((s, e))

# --- playerStage (phone) else-if branches ---
ps = find('function playerHTML')
for gid in GAMES5:
    spans.append(elseif_span("} else if (g.id === '" + gid + "') {", start=ps))

# --- phone pad one-liner else-ifs ---
for anchor in ["else if (g.id === 'ke-gia-mao' && g.phase === 'answer')",
               "else if (g.id === 'giai-ma-chung') { beep("]:
    hits = [i for i, l in enumerate(lines) if anchor in l]
    assert hits, anchor
    for i in hits:
        spans.append((i, i + 1))

# --- lkPanelBody standalone branches ---
lk = find('function lkPanelBody')
for gid in ['ke-gia-mao']:
    spans.append(ifblock("if (g.id === '" + gid + "') {", start=lk))

# --- lpLine branches ---
i = find_exact1("if (g.id === 'giai-ma-chung') return '<div class=\"lpline\">")
spans.append((i, i + 1))
spans.append(ifblock("if (g.id === 'chia-cuop') {", start=i))

# --- local pad one-liner else-ifs ---
for anchor in ["else if (g.id === 'ke-gia-mao' && g.phase === 'answer') { if (ci >= 0",
               "else if (g.id === 'giai-ma-chung') { if (ci >= 0)"]:
    hits = [i for i, l in enumerate(lines) if anchor in l]
    assert hits, anchor
    for i in hits:
        spans.append((i, i + 1))

# --- impostor peek block in the local Y handler ---
spans.append(ifblock("if (v && v.game && v.game.id === 'ke-gia-mao'"))

# apply edits first (line-index stable), then spans bottom-up
for (i, old, new) in edits:
    if old.endswith('\n'):
        continue  # handled below
    lines[i] = lines[i].replace(old, new)
pass
# dedupe + drop overlaps (keep the larger span on overlap)
spans = sorted(set(spans))
merged = []
for (s, e) in spans:
    if merged and s < merged[-1][1]:
        merged[-1] = (merged[-1][0], max(merged[-1][1], e))
    else:
        merged.append((s, e))
spans = merged
n0 = len(lines)
for (s, e) in sorted(spans, reverse=True):
    assert 0 <= s < e <= len(lines), (s, e)
    del lines[s:e]
open('src/page.mjs', 'w').write('\n'.join(lines))
print(f'page: {n0} -> {len(lines)} lines ({n0 - len(lines)} removed)')
