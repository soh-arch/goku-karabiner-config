---
name: execute-task-brief
description: Carry out work set down in a task brief, specification, or handoff document written by someone who is not present while the work happens. Use when handed such a document — it states a problem, what must hold, and what done looks like — rather than a request made in conversation. Do not use for an ordinary request you can simply act on, and do not use to write a brief.
---

# Execute a task brief

## Read all of it first

Read the brief through before touching anything, including the parts that look like
background. Requirements written later often qualify the ones written earlier, and the
constraints that matter most are usually not in the section listing requirements.

## Verify the facts before relying on them

Everything the brief asserts was true when it was written, which is not the same as true
now. Paths move, files change, dependencies get upgraded.

Check each fact at the moment you are about to depend on it. When one no longer holds,
**say so and stop to think** — do not silently adapt and carry on. A stale fact often
means the brief's author was reasoning about a situation that no longer exists, and the
requirement built on it may need revisiting rather than patching.

## The completion criteria are the contract

They are what you are being measured against, not a checklist to skim. Work through them
one at a time at the end and report the result of each. Where a criterion can be checked
mechanically, check it mechanically rather than asserting it.

If a criterion cannot be met, say which one and why. Do not report completion with a
criterion quietly unmet.

## Requirements are yours to satisfy, not to follow

Where the brief states what must be true and leaves the means open, choose the means
yourself and get on with it. That delegation is deliberate. Do not go back for permission
on a decision that was handed to you.

Where the brief states a decision concretely, implement that decision. If you think it is
wrong, say why and what you would do instead — then implement it as specified unless the
author changes it.

## Stay inside the scope

Work the brief excludes stays excluded, even when fixing it would be easy and obviously
right. Note what you found and leave it. Widening the scope is the author's call, not
yours.

The exception is a defect in your own work. Finding and fixing that is part of doing the
job properly.

## Ask sparingly

Ask about what the brief itself flags as needing the author's decision, and about anything
that genuinely blocks you. Everything else, decide and record.

## Report honestly

Separate what passed, what you skipped and why, what you changed your mind about, and
anything you got wrong along the way. State outcomes plainly: a criterion that failed
failed, and a step you could not verify is unverified, not assumed.
