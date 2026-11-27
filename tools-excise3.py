#!/usr/bin/env python3
"""Round 28 excision: remove 5 games (ma-soi, ke-gia-mao, chia-cuop,
ca-ngua, giai-ma-chung) from engine1.mjs + engine2.mjs.
Anchor-verified, bottom-up deletions. Aborts on any mismatch."""
import sys

def load(path):
    with open(path) as f:
        return f.read().split('\n')

def save(path, lines):
    with open(path, 'w') as f:
        f.write('\n'.join(lines))

def find(lines, anchor, start=0):
    hits = [i for i in range(start, len(lines)) if anchor in lines[i]]
    assert len(hits) == 1, f'anchor {anchor!r}: {len(hits)} hits'
    return hits[0]

def find_first(lines, anchor, start=0):
    for i in range(start, len(lines)):
        if anchor in lines[i]:
            return i
    raise AssertionError('not found: ' + anchor)

def block_end(lines, start):
    """Line index where the brace block opened on `start` closes
    (the line whose first closing brace returns depth to 0)."""
    depth = 0
    for i in range(start, len(lines)):
        for ch in lines[i]:
            if ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0:
                    return i
    raise AssertionError('no block end from ' + str(start))

def elseif_span(lines, anchor, start=0):
    """For a '} else if (...) {' branch: delete [start, end) where
    end is the next sibling line (kept: its '}' closes the previous
    branch instead)."""
    s = find_first(lines, anchor, start)
    assert '} else if' in lines[s], lines[s]
    # The line's leading '}' closes the PREVIOUS branch; the block
    # this line opens has depth 1. Scan on until depth returns to 0:
    # that line is the next sibling (kept — its '}' now closes the
    # previous branch instead of ours).
    depth = 1
    e = None
    for i in range(s + 1, len(lines)):
        for ch in lines[i]:
            if ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0:
                    e = i
                    break
        if e is not None:
            break
    assert e is not None, 'no sibling end for ' + anchor
    return (s, e)  # delete s..e-1

def ifblock_span(lines, anchor):
    """Standalone if/function block: delete [start, end] inclusive."""
    s = find(lines, anchor)
    e = block_end(lines, s)
    return (s, e + 1)

def funcgroup_span(lines, first_fn, next_fn):
    s = find_first(lines, 'function ' + first_fn + '(')
    e = find_first(lines, 'function ' + next_fn + '(', start=s + 1)
    assert s < e
    return (s, e)

def apply(path, spans, label):
    lines = load(path)
    n0 = len(lines)
    for (s, e) in sorted(spans, reverse=True):
        assert 0 <= s < e <= len(lines), (label, s, e)
        del lines[s:e]
    save(path, lines)
    print(f'{label}: {n0} -> {len(lines)} lines ({n0 - len(lines)} removed)')

# ---------------- engine1.mjs ----------------
p = 'src/engine1.mjs'
lines = load(p)
spans = []
# IMPOSTOR_BANK 61..80 (1-based) -> idx 60..79 inclusive
i = find(lines, 'export const IMPOSTOR_BANK')
assert lines[i + 19] == '];', lines[i + 19]
spans.append((i, i + 20))
# GAMES entries (single lines)
for gid in ['chia-cuop', 'ke-gia-mao', 'giai-ma-chung']:
    i = find(lines, "'" + gid + "': { name:")
    spans.append((i, i + 1))
# IMP comment + const (2 comment lines + const line before wolf comment)
i = find(lines, 'const IMP_ANSWER_MS')
assert lines[i - 1].startswith('//'), lines[i - 1]
assert lines[i - 2].startswith('//'), lines[i - 2]
spans.append((i - 2, i + 1))
# Decode block: comment .. DECODE_SYMBOLS '];'
i = find(lines, '// Giải Mã Chung: levels escalate')
j = find(lines, 'const DECODE_SYMBOLS')
k = j
while lines[k] != '];':
    k += 1
spans.append((i, k + 1))
apply(p, spans, 'engine1')

# ---------------- engine2.mjs ----------------
p = 'src/engine2.mjs'
lines = load(p)
spans = []
# createGame chia totalRounds line
i = find(lines, "if (gameId === 'chia-cuop')")
spans.append((i, i + 1))
# chiaBotChoice + IMP_CHAT_LINES blocks
spans.append(ifblock_span(lines, 'function chiaBotChoice'))
i = find(lines, 'const IMP_CHAT_LINES')
k = i
while lines[k] != '];':
    k += 1
spans.append((i, k + 1))
# init branches (createGame else-if chain)
for gid in ['chia-cuop', 'ke-gia-mao', 'giai-ma-chung']:
    spans.append(elseif_span(lines, "} else if (g.id === '" + gid + "') {"))
# step dispatch lines
for gid, fn in [('chia-cuop', 'stepChia'), ('ke-gia-mao', 'stepImpostor'),
                ('giai-ma-chung', 'stepDecode')]:
    i = find(lines, "if (g.id === '" + gid + "') return " + fn)
    spans.append((i, i + 1))
# dedicated function groups
spans.append(funcgroup_span(lines, 'stepChia', 'collectMoves'))
spans.append(funcgroup_span(lines, 'stepImpostor', 'wolfWinner'))
spans.append(funcgroup_span(lines, 'startDecodeLevel', 'platOverlap'))
# gameView branches (search only after gameView begins)
gv = find(lines, 'function gameView')
for gid in ['chia-cuop', 'ke-gia-mao', 'giai-ma-chung']:
    spans.append(elseif_span(lines, "} else if (g.id === '" + gid + "') {", start=gv))
# playerAction: chia pad sub-block
spans.append(ifblock_span(lines, "if (g.id === 'chia-cuop' && g.phase === 'choose'"))
# whole handlers serving only removed games
spans.append(ifblock_span(lines, "if (a === 'choose') {"))
spans.append(ifblock_span(lines, "if (a === 'symbol') {"))
# impostor sub-branch inside 'answer'
i = find(lines, "if (a === 'answer') {")
j = find(lines, "if (g.id === 'ke-gia-mao') {", start=i)
depth = 0
e = None
for n in range(j, len(lines)):
    for ch in lines[n]:
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                e = n
                break
    if e is not None:
        break
spans.append((j, e + 1))
apply(p, spans, 'engine2')
print('excision done')
