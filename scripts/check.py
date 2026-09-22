#!/usr/bin/env python3
"""Pre-commit check for AbcAct.edn.

    python3 scripts/check.py

Finds rules that can never fire: an earlier rule on the same key matches
every state a later one does, and Karabiner takes the first match in file
order. Nothing else reports this — the later rule just never runs.

Rules are read one per line, which is how every rule in the file is
written. A rule wrapped across lines would be skipped silently.

Exit status is 0 when the check passes, 1 otherwise.
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def blank_noncode(text):
    """Replace comment and string *contents* with spaces, keeping offsets.

    A bracket or `;` inside either must not be read as rule structure.
    Line numbers are preserved so reports still point at the source.
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


def main():
    problems = []
    check_unreachable(problems)
    if problems:
        for p in problems:
            print(p)
        print(f"\n{len(problems)} problem(s).")
        return 1
    print("ok")
    return 0


if __name__ == "__main__":
    sys.exit(main())
