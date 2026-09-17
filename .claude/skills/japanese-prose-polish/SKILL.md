---
name: japanese-prose-polish
description: Rewrite the Japanese prose of a finished document into natural Japanese using Gemini 3.8 Flash, then mechanically verify that no heading, number, URL, code or proper noun drifted. Use when a Japanese README or other finished document reads like translated English — stiff connectives, personified subjects, missing sentence subjects. Do not use for drafting, restructuring, fact-checking, or for English text.
---

# Japanese prose polish

Claude writes Japanese that is grammatical but reads like translated English: it
personifies inanimate subjects, drops the connectives a Japanese reader expects, and
strings noun phrases together where a verb should carry the logic. Gemini 3.8 Flash is
noticeably better at this particular register. This skill delegates *only* that rewrite
to Gemini and keeps every other judgment on this side.

## When to use this

Use it on a **finished** Japanese document that a human will read — a README, a design
note, a report. Run it as the last step, after the content is settled.

Do not use it to draft, restructure, translate, summarize, or fact-check. Gemini is not
trusted for any of those here; it is trusted for one thing only, which is how Japanese
sentences sound. Do not run it on English text or on source code.

## Prerequisites

`agy` (Antigravity CLI) must be on `PATH` and signed in, and `python3` must be available.
Check the remaining weekly quota at any time:

```bash
agy --print-timeout 90s -p="/usage"
```

That command is not a model call and costs nothing, which is why the script can afford to
run it on both sides of the work.

## Usage

```bash
scripts/polish.sh <file> [low|medium|high]
```

The effort level defaults to `high` and should stay there — see *Model and effort* below.
The result is written next to the input as `<name>.polished.<ext>`; the original is never
modified.

| Exit | Meaning |
| --- | --- |
| 0 | polished, mechanical check passed |
| 1 | mechanical check found drift |
| 2 | environment problem (`agy` or `python3` missing, quota unreadable) |
| 3 | refused: not enough weekly quota left |

Before anything is sent, the script reads the remaining weekly quota and the size of the
file, and refuses the run rather than starting one it cannot finish. Afterwards it reads
the quota again and prints what the run actually cost.

Relative paths resolve against the caller's working directory, so the skill can be invoked
from any project.

## How the work is divided

The script handles the two steps a machine can settle. The remaining step is yours.

1. **Fenced code blocks are withheld.** Every ` ``` ` block is replaced with an opaque
   placeholder before the call and restored verbatim afterwards. Gemini never sees the
   code, so it cannot rewrite it, and the tokens are not spent. A missing or duplicated
   placeholder aborts the run.
2. **Facts are checked mechanically** by `scripts/check-drift.sh`. Headings, fenced block
   contents, inline code spans, URLs and numbers must match byte for byte. Identifiers and
   proper nouns are judged by vocabulary rather than by count: losing a name or inventing
   one fails, while repeating a name that is already in the text only warns, because that
   is what restoring an omitted subject looks like.
3. **Nuance must be reviewed by hand.** Read the diff the script prints. The mechanical
   check cannot see a claim being softened, two sentences being merged, or a particle
   being swapped. Report anything in this class to the user rather than accepting it
   silently.

The third step is not optional. In testing, a run at `medium` effort turned
「目視確認は必須。強く推奨します。」into「目視確認を強く推奨します。」— it merged two
sentences and downgraded a requirement to a recommendation, and the mechanical check
passed it.

## What Gemini is told

The prompt lives inside `scripts/polish.sh` and is written in Japanese on purpose: it
instructs a Japanese proofreader, and every measurement behind this skill was made with
that exact wording. Do not translate it.

It forbids changing meaning, facts, numbers, proper nouns, headings, the mix of polite and
plain forms, noun-ending sentences, the strength of assertions, English fragments, and the
placeholders. It asks for four things: undo translationese and personification, restore
omitted connectives and subjects, cut empty filler, and remove redundancy.

## Model and effort

The model is pinned to `gemini-3.8-flash-high`. The quality this skill depends on was
measured on Gemini 3.8 Flash specifically, not on the Gemini line in general, so never let
a newer generation be picked up automatically.

Effort was compared across `low`, `medium` and `high`. `low` unified a deliberately mixed
writing style; `medium` merged sentences and weakened an assertion on a real README;
`high` was the only level that left every constraint intact there. `high` is not perfect —
on a different sample it deleted a short phrase — which is why step 3 exists.

## Cost

Every invocation carries roughly 13,000 tokens of fixed overhead regardless of payload
size, so the dominant cost is per call, not per byte. Polishing ten sections in ten calls
costs several times what one call over the whole document costs. **Never split a document
to polish it.** Batch separate short files into one call instead.

The quota is weekly. On the Plus plan there is no shorter rolling window to wait out: once
the week is spent, it is spent until the reset time `/usage` reports.

How much a run costs is **not predictable from the input**. The reply and the reasoning the
model does at high effort are charged as well, and two measurements disagree by more than a
factor of three:

| Input | Prompt-only floor | Actually charged |
| --- | --- | --- |
| ~4,096 bytes | 1.3 % | 1.3 % |
| 7,924 bytes | 1.4 % | 5 % |

So the preflight figure is a floor, not a forecast. The gate reserves three times the floor
before agreeing to run, and every run prints the floor next to what was really charged, so
the factor can be corrected as more numbers come in. Treat the second row as the honest
expectation until there is more data.

## Known limitations

- Tables have not been exercised. A document with a large table may need extra review.
- Nothing longer than about 4 KB has been measured; quality at greater length is unknown.
- Output varies between runs on the same input. Two runs of the same README produced
  different — both acceptable — results, so a clean run is not a guarantee about the next.
- The effort comparison rests on one sample per level. Treat the ranking as provisional.
