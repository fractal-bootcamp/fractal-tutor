# Fractal AI Tutor: Philosophy, V1 Spec, and Roadmap

## Context

This document captures the thinking behind an AI tutoring system for Fractal Tech, a 12-week coding accelerator. It draws on Andy Matuschak's "How Might We Learn?" vision while remaining grounded in what's actually buildable today.

---

## Part 1: Philosophy

### The HMWL Vision and Its Limits

Matuschak's HMWL presents a compelling synthesis: bring guided learning into authentic contexts, suffuse explicit learning with authentic purpose, and make sure learning actually works (via spaced repetition, dynamic practice, etc.). The demo imagines an AI that can see across your whole desktop, pull context autonomously, synthesize dynamic media, and track your understanding over time.

Most of this is not buildable with current technology. But we don't need the full vision to make meaningful progress.

### What Fractal Already Solves

HMWL assumes intrinsic motivation—arguably the hardest problem in education. Fractal's students are already motivated: they're paying, they want jobs, they're career-changers who chose this. The program also provides:

- **Community**: cohorts of 15-30, instructors who hold high standards
- **Authentic doing**: real projects with Saturday demos, not toy exercises
- **Taste in curriculum**: curated resources, not generic bootcamp content
- **Stakes**: the demo deadline creates urgency and meaning

This means we can focus on the guidance/scaffolding side without solving motivation.

### The Centaur Model

The core bet is that AI + human (the centaur) is dramatically more effective than either alone. An expert programmer using AI well might be 10x more productive. The hypothesis is that we can teach this meta-skill—AI fluency—to junior engineers, making them genuinely employable in a way that pure coding instruction wouldn't.

In the first 6 weeks, students don't use AI coding agents. They use AI aggressively as a tutor and helper, but it doesn't write large amounts of code for them. The reasoning: you need conceptual grounding before you can effectively direct an AI coder. The AI coding agent should not replace your understanding; it should amplify it.

### Why Students Fail with AI Tutors

When students use AI tutors naively, several failure modes emerge:

1. **Rabbit holes**: The AI makes a small mistake or follows a bad breadcrumb. Because the student has low context and doesn't understand what they're building, the error compounds. Student and AI wander into the wilderness together, with nobody stepping back to ask "wait, what are we actually trying to do?"

2. **Smuggled assumptions**: Students don't have conceptual clarity, so they ask questions with bad assumptions baked in. The AI answers the question as asked, which leads them further astray. Current AI doesn't push back on confused questions the way an expert human would.

3. **XY problem**: Student asks "how do I split a string on a comma?" when what they actually need is JSON.parse(). Answering correctly makes things worse. The student is asking about their attempted solution, not their actual problem.

4. **"Please fix" loops**: The student pastes an error, says "please fix," and 80% of the time the AI fixes it. This works locally but is poisonous for learning—the student makes forward progress without updating their mental model. They're watching someone else make contact with the problem instead of making contact themselves.

5. **Lack of metacognition**: Students don't know what they don't know. They can't notice the contradictions in their own flawed world models. Metacognition is difficult and requires bandwidth that's already consumed by the act of learning. Experts have automated enough that they have spare cycles for metacognition; novices don't.

### The Instructor's Role

When students come for help, the goal is not to solve their problem directly. It's to diagnose: why didn't the AI help you? What went wrong in that conversation? 

This often reveals:
- Bad questions with smuggled assumptions
- Missing context the student didn't know to provide
- Fundamental misconceptions that need correction
- Inability to detect AI errors due to lack of domain knowledge

The AI tutor should move toward doing some of this diagnostic work, so instructor time can focus on the hardest cases.

### Design Principles

**Mechanistic over agentic**: If we can engineer a solution (via context, prompting, structure), prefer that over relying on the AI's judgment. AI judgment is unreliable; engineered systems are predictable and debuggable.

**Empirical over theoretical**: We're on the frontier. Fundamental assumptions could be invalidated by the next model release. Build small, get feedback, iterate. Don't build a cathedral based on untested hypotheses.

**Context over conversation**: Students don't know what context is relevant. If the AI can fetch context directly (from the file system, terminal, open tabs), it will do better than relying on students to provide it.

**The instructor can't be the user**: Experts have lost access to the beginner's mind. The system must be tested on actual students, not just on the instructor's intuitions about what would help.

---

## Part 2: V1 Specification

### Form Factor

VS Code extension with a sidebar chat interface. This is where students already work, so there's no context-switching friction.

### Context Access

The extension has access to:
- Current file and cursor position
- Open tabs (file names and contents)
- Integrated terminal output
- Project file system

This allows the AI to see what the student is actually doing, not just what they claim to be doing. The JSON.parse test case: if a student asks "how do I split a string on a comma?" while their cursor is in a file called data.json, the AI should notice the mismatch and probe further.

### Context Engineering

Open question: how much context to include by default vs. make available via tools?

Hypothesis: High-signal context (current file, cursor position, recent terminal output) should be included always. Low-signal context (list of all open tabs, full file tree) should be available via tools for selective retrieval.

This needs empirical testing. The answer might be "dump everything" if context windows are large enough and it doesn't pollute the response. Or it might be "selective retrieval" if too much context creates noise.

### System Prompt

The prompt should encode:
- The pedagogical philosophy (don't just give answers, probe for understanding)
- Aggressive context-gathering before responding
- Detection of XY problems and smuggled assumptions
- Pushback on confused questions
- Awareness that it's talking to a learner, not an expert

The prompt should NOT:
- Be annoying or preachy
- Refuse to help when directness is appropriate
- Get in the way of flow when the student actually knows what they're doing

The prompt needs its own design conversation. It should be something the instructor can stand behind as genuinely tasteful.

### Feedback Mechanism

A "complaint" button that captures:
- The full conversation history
- All context from the extension (files, terminal, etc.)
- A free-text field for the student to describe what went wrong

This gets sent to a server for instructor review. The goal is to capture failure cases at the moment they happen, with full context, so we can diagnose and improve.

### Success Criteria

What does "working" look like?

- Students report that it's better than vanilla ChatGPT
- Instructor observes fewer "rabbit hole" escalations
- When students do escalate, the conversation history shows the AI at least tried to gather context and push back on confused questions
- Students can articulate why the tutor was or wasn't helpful (sign that they're developing metacognition about AI use)

---

## Part 3: Roadmap

### Layer 2: Curriculum Integration and Personalization

- RAG over Fractal's canon of resources (Git tutorials, database guides, design principles, etc.)
- AI can reference and quote canonical materials in responses
- Basic persistent student model: track what concepts have come up, where confusion has been observed
- Model updates as student demonstrates understanding

### Layer 3: Spaced Repetition Integration

- Analyze conversation history to identify concepts the student has encountered
- Auto-generate Anki cards for definitions, syntax, system behaviors
- Surface cards via spaced repetition algorithm
- Low cost to student: just do their normal work, then 5 minutes/day of review

Note: Auto-generated cards may be mediocre compared to expert-written cards. But mediocre cards with low friction may beat perfect cards that require effortful metacognition to create. Needs testing.

### Layer 4: Attention and Desktop Integration

- With user consent, periodic screenshots or activity monitoring
- Gentle nudges when off-task for extended periods ("We noticed you've been on TikTok for 15 minutes. Is that intentional?")
- Not surveillance/reporting—just prompts for self-reflection
- Helps rebuild relationship to work for students who've been beaten down by school

### Layer 5: Beyond VS Code

- Eventually the tutor leaks outside VS Code (browser, other apps, desktop-wide)
- Electron app or system overlay
- This happens organically when the VS Code extension hits its limits

---

## Open Questions

1. **What makes a good prompt?** Needs its own deep conversation about pedagogical philosophy and what "tasteful" tutoring looks like.

2. **Context engineering specifics**: What's the right balance of always-included vs. tool-accessible context? Needs empirical testing.

3. **How to evaluate quality?** Beyond student complaints, what metrics indicate the tutor is actually improving learning outcomes?

4. **Model choice**: Currently leaning Claude Opus for conversational quality. May need to revisit as models evolve.

5. **When does v1 ship?** Timeline relative to next cohort start date.

---

## References

- Andy Matuschak, "How Might We Learn?" (2024): https://andymatuschak.org/hmwl/
- Andy Matuschak, "Exorcising us of the Primer" (2024): https://andymatuschak.org/primer/