---
name: visual-design-direction
description: The house visual direction for anything people look at — web UI, product screens, dashboards, documents, slides, diagrams, data visualizations, design systems. It covers the typography, whitespace and restraint that carry structure, and the use of color as a semantic instrument for meaning, state and priority rather than as decoration. Apply when designing, prototyping, implementing or reviewing such work, unless the user or the project asks for a different brand or design system. Do not apply to backend code, debugging, tests, infrastructure or general research.
---

> Create a contemporary product experience that feels intelligent, warm, and built to endure, using a paper-like foundation and the quiet depth of ink-like colors rather than a cold, sterile digital aesthetic.
> Establish order through typography, whitespace, fine rules, and restrained motion; do not rely on loud decoration or repetitive, off-the-shelf SaaS patterns to demand attention.
> Treat color not as decoration, but as a semantic instrument for communicating meaning, state, priority, and the nature of an action.

## Color Palette

### Neutrals

Use a warm ivory foundation to create a matte material quality reminiscent of paper, earth, and soft ink. Neutrals establish the page ground, information hierarchy, rules, and body text.

```text
bg            #F7F3ED
bg-sunken     #F0ECE4
surface       #FFFEFB

border-subtle #D8D3CB
border        #B5B0A7
border-strong #908A80

text-faint    #736D62
text-muted    #534C41
text          #231E16
```

### Indigo — Ink

Express calm judgment, trust, clarity, and primary direction. Use for information, primary actions, and states that help the user move forward.

```text
subtle        #DDEBF4
line          #93B1C3
graphic       #22759E
solid         #22759E
text          #316A89
```

### Celadon — Sage

Express harmony, stability, restoration, and healthy progress. Use for success, completion, normal operation, and reassuring states.

```text
subtle        #E1ECE0
line          #9CB29A
graphic       #648F5F
solid         #4F794A
text          #486E44
```

### Ochre

Express attention, deliberation, pause, and confirmation. Do not use it to create urgency; use it where the user should stop briefly and make a considered decision.

```text
subtle        #F3E7DC
line          #C0A892
graphic       #7E4A01
solid         #9B621B
text          #845C32
```

### Bengara — Clay

Express consequential intent, irreversible actions, problems, and risk. Treat it as a color of weight and deliberate judgment rather than a mechanical or alarming warning signal.

```text
subtle        #F7E5E2
line          #C7A49E
graphic       #9F4A3E
solid         #AB5649
text          #8E554B
```

## Using Saturation and Lightness

- **Low-saturation, high-lightness `subtle`**: Use for contextual backgrounds, quiet state indication, selected regions, and notification surfaces. It should provide context without becoming the visual subject.
- **Mid-tone `line`**: Use for colored boundaries, dividers, and gentle state cues. Let it quietly support structure rather than creating excessive cards or containment.
- **Deep `graphic`**: Use for icons, data visualization, diagrams, and non-textual emphasis. It provides a clear visual core in dense information contexts.
- **Strongest `solid`**: Use for primary buttons, selected states, active operations, and high-emphasis labels. Use sparingly to make action priority unmistakable.
- **Composed dark `text`**: Use for links, stateful copy, and semantically meaningful labels. Never rely on color alone; pair it with language, icons, placement, and form.

Do not scatter chromatic colors merely as attractive accents. Use them as part of the information architecture: they should help people understand what is happening, where attention belongs, and which action to take.

## Contrast

Every `text` token clears WCAG AA for normal text (4.5:1) on all three grounds, and so does white on any `solid`. Two measured exceptions do not, and neither is visible from the hex values:

- `text-faint` on `bg-sunken` — 4.35:1
- the four `solid` tones on `bg-sunken` — 4.28:1 to 4.34:1

So on `bg-sunken`, set copy in `text` or `text-muted`, and reach for a color's `text` tone rather than its `solid` one.

Of the three neutral borders, only `border-strong` reaches the 3:1 a UI boundary needs (3.10:1 against `bg`). `border` is 1.95:1 and `border-subtle` 1.35:1, which is why they read as rules rather than as edges.
