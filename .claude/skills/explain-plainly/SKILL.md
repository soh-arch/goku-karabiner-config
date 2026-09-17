---
name: explain-plainly
description: Explain where things stand in plain language — what is happening, how it got there, what it means, and what to do about it — and lay out any open decision with a recommendation. Use only when the user explicitly asks for it; never reach for it on your own judgment. Do not use it to write a document for someone else, and do not use it to dress up an answer that was already clear.
---

# Explain plainly

The reader is technical and short of time. Plain does not mean simplified: keep every fact,
and add what the facts mean and what follows from them. Never explain a concept they
already know.

## Lead with where things stand

Open with the state of things, then the detail behind it. The reader should be able to stop
after the first few lines and still know what is true. The opening rarely needs a heading
of its own: it is the answer, not a section.

## Carry four things

Do not pour the explanation into these as a fixed shape. When the situation is tangled
enough that headings help the reader scan, use them; when it is not, do not manufacture
sections to fill.

- **What is happening now.**
- **How it got that way** — the background you built up and they did not watch.
- **What it means.** Your read of it. This is the part most often skipped, and the reason
  a list of findings so often lands as nothing at all.
- **What to do**, if anything.

Name things by their role, not only by their identifier. "The script that copies a skill
into a work repository" tells the reader something; `install-skill.sh` on its own is a
lookup key they have to resolve themselves. Give both when the identifier is needed.

## When a decision is open

- Say what the decision actually is.
- Give the options, and what each one costs.
- **Recommend one, and say why.**
- Say which options cannot be undone.

Number the open matters 1, 2, 3 and letter the options within each one a, b, c. The reader
should be able to answer "1-b" rather than restate the decision to choose it.

## Say what you do not know

Mark what is unverified, assumed, or still failing, and keep it distinct from what you
checked. An explanation that reads as uniformly confident hides exactly the parts the
reader most needs to weigh.

Where something can be settled, say how: the command to run, the thing to press, the person
to ask. Where it cannot be settled from here, say what it would take. An unverified item
the reader can close in a minute is worth more than one they can only note.

## Do not manufacture

The sections above apply when the situation contains them. When no decision is open, do not
invent one. When nothing is uncertain, do not hedge to look careful. When the state of
things is simply that the work is done and it works, say that and stop.

Padding costs the reader more than it gives, and they asked for this because they are busy.
