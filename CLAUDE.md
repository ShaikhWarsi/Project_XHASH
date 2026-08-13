# CLAUDE.md — EurionKnowledge Brain

You are running inside a **Knowledge OS**.

This is not memory. This is a system for loading, using, and compounding
institutional knowledge across every project you work on.

The structure:

```
inbox/          — Raw input waiting to be processed
projects/       — 4 categories: college, research, startup, mvps
knowledge/      — Cross-project: decisions, lessons, patterns, anti-patterns
logs/           — Session history for AI to read later
current_state.md — Executive dashboard
goals.md        — Master objectives
memory_map.json — Navigation index
```

---

## WORKFLOW

### 1. INBOX CHECK
Before anything else, check `inbox/`. If there are unprocessed items:
- Read each one
- Determine: trash / reference / project file / lesson / task / decision
- File it in the appropriate place
- Delete from inbox
- Log what was processed to `logs/`

### 2. LOAD CONTEXT
Read `memory_map.json`. Parse the user's request. Load only relevant files:
- Project matches: `projects/{category}/{project}/{summary,state,goals,tasks}.md`
- Knowledge matches: `knowledge/decisions/`, `knowledge/lessons/`, `knowledge/patterns/`, etc.
- General: `current_state.md`, `goals.md`
- Check `knowledge/decisions/` for approaching review dates

### 3. PLAN
State what you're about to do. Reference loaded context. Identify risks, blockers, open questions.

### 4. WORK
Execute the task.

### 5. REFLECT
Ask: What happened? Why? What did I learn? What would I do differently? Is there an anti-pattern?

### 6. UPDATE (THRESHOLD-GATED)

**MINOR** — No files updated:
- Code cleanup, formatting, typos, comments, trivial fixes

**MEDIUM** — Update project files:
- Finished feature, found blocker, new task, bug discovered
- Update: `state.md` (progress %, blockers, changes with WHY + evidence + confidence)
- Update: `tasks.md` (check off, add new)
- Update: `goals.md` (mark progress)

**MAJOR** — Update institutional knowledge:
- Architecture changed, lesson learned, big decision, pivot, new anti-pattern
- Update: project files (as above)
- Update: `knowledge/decisions/{id}.md` (if decision made)
- Update: `knowledge/lessons/`, `knowledge/patterns/`, or `knowledge/anti-patterns/`
- Update: `current_state.md` (priorities, blockers, assumptions)
- Update: `goals.md`

Every update entry must include:
- **WHAT** changed
- **WHY** it changed
- **EVIDENCE** (commit hash, error, conversation reference)
- **CONFIDENCE** (high/medium/low)

### 7. LOG
If work was medium or major, write a summary to `logs/{YYYY-MM-DD}.md`:
- What was worked on
- What was completed (with WHY + evidence)
- Lessons/patterns discovered
- Blockers found
- What's next

### 8. SURFACE DECISIONS
Before ending, check if any project has a `## Decision Required` block in its `state.md` that hasn't been resolved. Surface it to the user.

---

## DECISION PROTOCOL

When you encounter a `## Decision Required` block in a state.md:

**If waiting:** Surface it with deadline and options. Ask the user to decide.

**If decided:** Move to `knowledge/decisions/{project}-{topic}.md` with:
```
# {Title}

**Decided:** {date}
**Status:** {accepted/rejected/deferred}

## Problem
{one-line description}

## Options Considered
- A: {description}
- B: {description}
- C: {description}

## Chosen
{which option}

## Why
{reasoning}

## Evidence
{proof, references}

## Confidence
{high/medium/low}

## Anticipated Consequences
{what you expect to happen}

## Review Date
{6 months out}
```
Then remove the block from project `state.md`.

---

## KNOWLEDGE FORMATS

### lesson/
```markdown
# {Title}

**Learned:** {date}
**Related:** {project list}
**Confidence:** {high/medium/low}

## What Happened
{description}

## Why It Matters
{significance}

## The Lesson
{actionable takeaway}

## Evidence
{proof}
```

### anti-pattern/
```markdown
# {Title}

**Identified:** {date}
**Related:** {project list}

## The Anti-Pattern
{description of the bad approach}

## Why It Fails
{reasons it's harmful}

## Prefer Instead
{what to do instead}

## Example
{concrete example}
```

---

## AUTO-TRIGGER

Activate whenever user mentions:
- **Categories:** college, research, startup, mvps
- **Projects:** eurion, prix, looksmax, examai, vit, memory-systems, ai-ceo
- **Knowledge:** knowledge, lesson, decision, pattern, anti-pattern, inbox
- **Context:** "what did we do", "where are we", "what's the status", "what should I work on", "what's next"

---

## BEHAVIORAL GUIDELINES

**Think Before Coding** — State assumptions explicitly. Surface tradeoffs. If uncertain, ask.

**Simplicity First** — Minimum code that solves the problem. No features beyond what was asked. If it could be 50 lines and you wrote 200, rewrite it.

**Surgical Changes** — Touch only what you must. Match existing style. Don't "improve" adjacent code. Remove imports/variables/functions that YOUR changes made unused.

**Goal-Driven Execution** — Define success criteria. Loop until verified.
