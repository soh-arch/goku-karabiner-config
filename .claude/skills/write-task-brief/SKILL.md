---
name: write-task-brief
description: Turn what the user wants done into a task brief that an engineer or a separate session can act on without having seen this conversation, written as a markdown file. Use when work is being handed off to someone who will not have this context — a colleague, a contractor, another agent. Do not use to plan work that will be done here in this session, and do not use to produce a step-by-step procedure.
---

# Write a task brief

The reader is an engineer who can solve problems independently and who has not seen this
conversation. Write for that person.

## Clarify before writing anything

Do not answer the first request with a brief. Answer it by getting the work straight.

- **Name the problem.** Say what you understand the user to be solving, in your own words,
  and let them correct it. A brief built on the wrong problem is worse than no brief.
- **Find the conflicts.** Where two requirements cannot both hold, say so plainly and show
  the two. Do not quietly pick one.
- **Find what is missing.** Ask what you do not know that would change the approach. Some
  of it you can settle yourself by reading the code or the repository — do that first, and
  only ask about what remains.
- **Ask about decisions that are the user's to make.** Present the options and what each
  costs. Recommend one, and leave the choice with them.

Do not turn an assumption into a confirmed requirement. If something is still undecided
when you write, label it as undecided rather than resolving it silently.

## Decide what to settle and what to delegate

Take each requirement in turn and ask whether the user actually cares how it is done.

- When they have already decided, write the decision concretely.
- When they have not, **say the means are the engineer's to choose**, and write the
  properties the result must have instead. Those properties are the requirement.

Both kinds normally appear in the same brief. When you cannot tell which a requirement is,
delegate it: an engineer given too little will ask, while an engineer given a procedure
will follow it past the point where it stops making sense.

Prescribing steps is the failure to avoid. A requirement that reads as a sequence of
actions should be rewritten as the condition that must hold when the work is done.

## What the brief has to carry

Arrange it however the work suggests — there is no fixed template, and a shape borrowed
from a different job will fit badly. Whatever the arrangement, a reader who has seen
nothing else must come away with all of the following.

- **The problem, and why it is worth solving.** Not the task — the problem underneath it.
- **Where the work happens, and what you were doing there.** Name the repository, the
  branch, the environment, the working directory. Say briefly what you were doing when
  this came up, so the engineer can place the work.
- **The facts they cannot see for themselves.** Paths, versions, existing behaviour,
  measurements. Verify each one before you write it. Where a fact may go stale — a path
  containing a session id, a hash that a later commit will change — say so and say how to
  find the current value.
- **What must be true when the work is done.** Prefer conditions that can be checked
  without judgement. A hash, a count, a command that exits zero.
- **What is out of scope,** and who is handling it instead.
- **What to bring back to the user** rather than decide alone.

## Output

Write the brief to a markdown file and tell the user where it is. The file holds the brief
and nothing else — no covering note, no summary of the conversation, no explanation of how
you arrived at it.
