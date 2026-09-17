#!/usr/bin/env python3
"""Hide fenced code blocks from the proofreader, then put them back untouched.

mask.py mask   <src> <masked> <store>
mask.py unmask <polished> <store> <out>
"""
import re
import sys

FENCE = re.compile(r"^(```|~~~).*?^\1[ \t]*$", re.S | re.M)
TOKEN = "@@BLOCK_{:03d}@@"


def mask(src, masked, store):
    text = open(src, encoding="utf-8").read()
    blocks = []

    def take(m):
        blocks.append(m.group(0))
        return TOKEN.format(len(blocks) - 1)

    open(masked, "w", encoding="utf-8").write(FENCE.sub(take, text))
    open(store, "w", encoding="utf-8").write("\0".join(blocks))
    print(len(blocks))


def unmask(polished, store, out):
    text = open(polished, encoding="utf-8").read()
    raw = open(store, encoding="utf-8").read()
    blocks = raw.split("\0") if raw else []
    for i, block in enumerate(blocks):
        token = TOKEN.format(i)
        if text.count(token) != 1:
            sys.exit(f"placeholder {token} appears {text.count(token)} times, expected 1")
        text = text.replace(token, block)
    if "@@BLOCK_" in text:
        sys.exit("unexpected placeholder left in output")
    open(out, "w", encoding="utf-8").write(text)


if __name__ == "__main__":
    (mask if sys.argv[1] == "mask" else unmask)(*sys.argv[2:])
