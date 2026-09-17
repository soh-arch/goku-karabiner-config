#!/usr/bin/env python3
"""Pre-commit checks for this repo.

    python3 scripts/check.py

Catches the mistakes a build does not: a rule that can never fire because
an earlier one always wins, an unbalanced bracket or tag, a stray
non-ASCII character in code. Everything here is a property of the files
themselves, checkable without Karabiner, Raycast or a browser.

What it does NOT catch, and no amount of static checking will:

  * a wrong Raycast slug. It is a well-formed string that simply matches no
    command, and it fails silently. Slugs come from Raycast's own Copy
    Deeplink — see NOTES.md.
  * a key code macOS ignores. `goku` rejects names it doesn't know, and the
    rest only the machine can tell you.
  * a binding in the wrong tier. That is a design question.

One structural limit worth knowing: rules are read one per line, which is
how every rule in these files is written. A rule wrapped across lines would
be skipped silently rather than checked.

Exit status is 0 when every check passes, 1 otherwise.
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EDNS = ["AbcAct.edn", "HyMeCO.edn", "HySCOT.edn"]
HTML = "docs/index.html"

VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input",
        "link", "meta", "source", "track", "wbr"}


def blank_noncode(text):
    """Replace comment and string *contents* with spaces, keeping offsets.

    Both are places where a bracket or a non-ASCII character is ordinary
    text rather than code, so neither should reach the checks below. Line
    and column numbers are preserved so reports still point at the source.
    """
    out = []
    in_string = False
    in_comment = False
    i = 0
    while i < len(text):
        c = text[i]
        if c == "\n":
            in_comment = False
            out.append(c)
        elif in_comment:
            out.append(" ")
        elif in_string:
            if c == "\\" and i + 1 < len(text):
                out.append("  ")
                i += 2
                continue
            out.append('"' if c == '"' else " ")
            if c == '"':
                in_string = False
        elif c == '"':
            in_string = True
            out.append(c)
        elif c == ";":
            in_comment = True
            out.append(" ")
        else:
            out.append(c)
        i += 1
    return "".join(out)


def check_brackets(problems):
    pairs = {")": "(", "]": "[", "}": "{"}
    for name in EDNS:
        path = ROOT / name
        if not path.exists():
            continue
        stack, line = [], 1
        for ch in blank_noncode(path.read_text()):
            if ch == "\n":
                line += 1
            elif ch in "([{":
                stack.append((ch, line))
            elif ch in ")]}":
                if not stack or stack[-1][0] != pairs[ch]:
                    problems.append(f"{name}:{line}: unexpected `{ch}`")
                    break
                stack.pop()
        else:
            for ch, ln in stack:
                problems.append(f"{name}:{ln}: `{ch}` is never closed")


def check_ascii(problems):
    """Non-ASCII belongs in comments and strings, not in bare code."""
    for name in EDNS:
        path = ROOT / name
        if not path.exists():
            continue
        for n, line in enumerate(blank_noncode(path.read_text()).split("\n"), 1):
            stray = sorted({c for c in line if ord(c) > 127})
            if stray:
                shown = " ".join(f"`{c}` (U+{ord(c):04X})" for c in stray)
                problems.append(f"{name}:{n}: non-ASCII outside a comment "
                                f"or string: {shown}")


# A rule's from-spec is the first token: `:##h`, `:!Sopen_bracket`, `:tab`.
RULE = re.compile(r"^\s*\[(:[^\s\]\[]+)\s")
COND = re.compile(r"\[((?::!?[A-Za-z][\w-]*\s*)+)\]")


def parse_rules(text):
    """Yield (line, from-spec, {condition: bool}) for every guarded rule."""
    for n, raw in enumerate(blank_noncode(text).split("\n"), 1):
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
        yield n, m.group(1), conds


def covers(earlier, later):
    """True when `earlier` matches every state `later` does.

    Then `later` can never fire: Karabiner takes the first match in file
    order. Note this is subset, not overlap — a rule that merely overlaps
    still fires in the states the other one doesn't claim, which is how the
    terminal overrides and the auxiliary-key blocks are meant to work.
    """
    return all(later.get(k) == v for k, v in earlier.items())


def check_unreachable(problems):
    seen = {}
    for line, key, conds in parse_rules((ROOT / "AbcAct.edn").read_text()):
        for other_line, other in seen.get(key, []):
            if covers(other, conds):
                problems.append(
                    f"AbcAct.edn:{line}: `{key}` can never fire — line "
                    f"{other_line} matches every state this rule does, "
                    f"and comes first")
                break
        seen.setdefault(key, []).append((line, conds))


def strip_html_noncode(text):
    """Blank comments and the contents of script/style, keeping offsets."""
    def blank(m):
        return re.sub(r"[^\n]", " ", m.group(0))
    text = re.sub(r"<!--.*?-->", blank, text, flags=re.S)
    text = re.sub(r"(<(script|style)\b[^>]*>)(.*?)(</\2\s*>)",
                  lambda m: m.group(1) + blank(
                      re.match(r".*", m.group(3), re.S)) + m.group(4),
                  text, flags=re.S | re.I)
    return text


def check_html_tags(problems):
    path = ROOT / HTML
    if not path.exists():
        return
    text = strip_html_noncode(path.read_text())
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
            problems.append(f"{HTML}:{line}: `</{tag}>` closes {expected}")
            return
    for tag, line in stack:
        problems.append(f"{HTML}:{line}: `<{tag}>` is never closed")


def main():
    problems = []
    for check in (check_brackets, check_ascii,
                  check_unreachable, check_html_tags):
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
