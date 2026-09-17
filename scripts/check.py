#!/usr/bin/env python3
"""Pre-commit checks for this repo.

    python3 scripts/check.py

Catches the mistakes that a build does not: a rule silently shadowed by an
earlier one, an unbalanced bracket or tag, a stray non-ASCII character in
code. Everything here is a property of the files themselves, checkable
without Karabiner, Raycast or a browser.

What it does NOT catch, and no amount of static checking will:

  * a wrong Raycast slug. It is a well-formed string that simply matches no
    command, and it fails silently. Slugs come from Raycast's own Copy
    Deeplink — see NOTES.md.
  * a key code macOS ignores. `goku` rejects names it doesn't know, and the
    rest only the machine can tell you.
  * a binding in the wrong tier. That is a design question.

Exit status is 0 when every check passes, 1 otherwise.
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EDN = ROOT / "AbcAct.edn"
HTML = ROOT / "docs" / "index.html"

# Tags that never close in HTML.
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input",
        "link", "meta", "source", "track", "wbr"}


def strip_edn_comments(text):
    """Blank out `;` comments, leaving offsets intact."""
    out, in_string = [], False
    for line in text.split("\n"):
        kept, i = [], 0
        while i < len(line):
            c = line[i]
            if in_string:
                kept.append(c)
                if c == "\\" and i + 1 < len(line):
                    kept.append(line[i + 1])
                    i += 2
                    continue
                if c == '"':
                    in_string = False
            elif c == '"':
                in_string = True
                kept.append(c)
            elif c == ";":
                break
            else:
                kept.append(c)
            i += 1
        out.append("".join(kept))
    return "\n".join(out)


def check_edn_brackets(problems):
    text = strip_edn_comments(EDN.read_text())
    pairs = {")": "(", "]": "[", "}": "{"}
    stack = []
    line = 1
    for ch in text:
        if ch == "\n":
            line += 1
        elif ch in "([{":
            stack.append((ch, line))
        elif ch in ")]}":
            if not stack or stack[-1][0] != pairs[ch]:
                problems.append(f"AbcAct.edn:{line}: unexpected `{ch}`")
                return
            stack.pop()
    for ch, ln in stack:
        problems.append(f"AbcAct.edn:{ln}: `{ch}` is never closed")


def check_edn_ascii(problems):
    """Non-ASCII belongs in comments, not in code."""
    for n, line in enumerate(strip_edn_comments(EDN.read_text()).split("\n"), 1):
        stray = sorted({c for c in line if ord(c) > 127})
        if stray:
            shown = " ".join(f"`{c}` (U+{ord(c):04X})" for c in stray)
            problems.append(f"AbcAct.edn:{n}: non-ASCII outside a comment: {shown}")


RULE = re.compile(r"^\s*\[:#*([A-Za-z_0-9]+)\s")
COND = re.compile(r"\[((?::!?[A-Za-z][\w-]*\s*)+)\]")
DES = re.compile(r':des\s+"([^"]+)"')


def parse_rules():
    """Yield (block, line, from-key, {condition: bool}) for guarded rules."""
    block = "?"
    for n, raw in enumerate(strip_edn_comments(EDN.read_text()).split("\n"), 1):
        m = DES.search(raw)
        if m:
            block = m.group(1)
        m = RULE.match(raw)
        if not m:
            continue
        vectors = [v for v in COND.findall(raw)
                   if re.search(r":!?(?:layer|act)-", v)]
        if not vectors:
            continue
        conds = {}
        for tok in vectors[-1].split():
            conds[tok.lstrip(":!")] = not tok.startswith(":!")
        yield block, n, m.group(1), conds


def can_both_match(a, b):
    """True when some input state satisfies both condition sets."""
    return all(a[k] == b[k] for k in a.keys() & b.keys())


def check_rule_overlap(problems):
    """Within one :des block, two rules on the same key must not both match.

    Karabiner fires the first match only, so an overlap means the later
    rule is dead in that state — which never announces itself. Blocks are
    compared separately because some deliberately shadow others (the
    terminal overrides are the standing example).
    """
    seen = {}
    for block, line, key, conds in parse_rules():
        for other_line, other in seen.get((block, key), []):
            if can_both_match(conds, other):
                problems.append(
                    f"AbcAct.edn:{line}: same conditions as line {other_line} "
                    f"for `{key}` in \"{block}\" — one of them can never fire")
        seen.setdefault((block, key), []).append((line, conds))


def check_html_tags(problems):
    if not HTML.exists():
        return
    text = HTML.read_text()
    stack = []
    for m in re.finditer(r"<(/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*?)(/?)>", text):
        closing, tag, _, selfclosing = m.groups()
        tag = tag.lower()
        if tag in VOID or selfclosing:
            continue
        line = text.count("\n", 0, m.start()) + 1
        if not closing:
            stack.append((tag, line))
        elif stack and stack[-1][0] == tag:
            stack.pop()
        else:
            expected = stack[-1][0] if stack else "nothing"
            problems.append(
                f"docs/index.html:{line}: `</{tag}>` closes {expected}")
            return
    for tag, line in stack:
        problems.append(f"docs/index.html:{line}: `<{tag}>` is never closed")


def main():
    problems = []
    for check in (check_edn_brackets, check_edn_ascii,
                  check_rule_overlap, check_html_tags):
        check(problems)
    if problems:
        for p in problems:
            print(p)
        print(f"\n{len(problems)} problem(s).")
        return 1
    print("ok")
    return 0


if __name__ == "__main__":
    sys.exit(main())
