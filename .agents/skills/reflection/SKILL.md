---
name: meta-reflection
description: Use when agent believes it has satisfied a user request - triggers session review to identify improvements to agents, tools, skills, or configurations that would avoid issues or streamline workflows in the future
---

# Meta-Reflection

## Overview

Completing work without reflecting is a missed improvement opportunity.

**Core principle:** Every completed request is a learning opportunity. Capture it before context is lost.

## When to Trigger

```
AFTER satisfying a user request (or believing you have):

1. PAUSE before final response
2. REFLECT on the session
3. IDENTIFY potential improvements
4. PRESENT findings to user
5. IMPLEMENT if approved
```

## The Reflection Protocol

```
FOR each completed request:

1. SESSION REVIEW
   - What did the user ask for?
   - What steps did I take?
   - Where did I struggle or backtrack?
   - What assumptions did I make?
   - What context was missing?

2. FRICTION ANALYSIS
   - Where did I waste effort?
   - What caused confusion or errors?
   - What required multiple attempts?
   - What knowledge would have helped?

3. IMPROVEMENT IDENTIFICATION
   Categories to consider:
   - AGENTS.md: Missing triggers, unclear instructions, missing skills
   - CLAUDE.md / project configs: Wrong assumptions, missing context
   - Skills: Missing skill, skill gaps, skill improvements
   - Tools: Missing capabilities, configuration issues
   - Workflows: Inefficient patterns, missing automation

4. FINDING VALIDATION
   For each potential improvement:
   - Is this generalizable (not one-off)?
   - Would this help future sessions?
   - Is the fix clear and actionable?
   - Which file(s) would change?

5. PRESENTATION
   Present findings to user with:
   - What I observed (specific friction)
   - What I recommend (specific change)
   - Which file(s) to update
   - Ask: "Should I make these updates?"

6. IMPLEMENTATION (if approved)
   - Make the changes
   - Verify changes are correct
   - Summarize what was updated
```

## Categories of Improvements

| Category | Examples | Target Files |
|----------|----------|--------------|
| Missing skill trigger | Skill exists but wasn't invoked | AGENTS.md, skill description |
| Unclear instructions | Misunderstood what to do | SKILL.md, CLAUDE.md |
| Missing skill | No skill for common pattern | New skill creation |
| Wrong assumptions | Assumed incorrect defaults | CLAUDE.md, config files |
| Missing context | Needed project-specific info | CLAUDE.md, .instructions.md |
| Workflow inefficiency | Repeated manual steps | New skill or tool |
| Tool gap | Needed capability not available | Tool configuration |

## Example Findings

**Finding: Missing Skill Trigger**
```
Observation: I used brainstorming principles but didn't invoke the skill.
Recommendation: Add "creative work" to AGENTS.md skill triggers.
File: AGENTS.md
```

**Finding: Unclear Skill Instructions**
```
Observation: Skill said "verify" but didn't specify how.
Recommendation: Add verification command to skill.
File: .github/skills/some-skill/SKILL.md
```

**Finding: Missing Project Context**
```
Observation: I assumed Python 3.8 but project uses 3.12.
Recommendation: Add Python version to CLAUDE.md.
File: CLAUDE.md
```

**Finding: New Skill Opportunity**
```
Observation: I performed this workflow manually multiple times.
Recommendation: Create a skill to capture this pattern.
Action: Create .github/skills/new-pattern/SKILL.md
```

## Presentation Format

```markdown
## Session Reflection

I've completed your request. Before finishing, I reviewed the session for potential improvements:

### Findings

1. **[Category]**: [Brief description]
   - Observed: [What happened]
   - Recommendation: [Specific change]
   - File: [path/to/file]

2. **[Category]**: [Brief description]
   - Observed: [What happened]  
   - Recommendation: [Specific change]
   - File: [path/to/file]

Should I make these updates?
```

## When NOT to Reflect

- Trivial requests (simple questions, quick lookups)
- No friction encountered during session
- User explicitly requests no reflection
- Pure information retrieval with no workflow

## Red Flags - STOP and Reflect

- Multiple attempts to accomplish something
- Confusion about which skill or tool to use
- Backtracking or undoing work
- Missing information that caused errors
- Workarounds for missing capabilities
- "I wish I had known..." moments

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Reflecting on trivial tasks | Only reflect when there was friction |
| Vague recommendations | Be specific: exact file, exact change |
| Implementing without approval | Always ask first |
| One-off fixes | Only recommend generalizable improvements |
| Too many findings | Focus on 1-3 highest impact items |
| Missing the root cause | Ask "why did this happen?" not just "what happened?" |

## The Bottom Line

**Complete work → Reflect → Capture improvements → Get approval → Implement.**

Every friction point is a future improvement. Don't let them slip away with the session context.
