# Kerala PSC Question Database — AI-Optimized Content Strategy (Updated for New PSC Pattern)

---

## 0. System Objective

Build a **high-quality, scalable Kerala PSC question database** using:

- AI-assisted generation
- Human-reviewed validation
- Structured content production
- PYQ-based multiplication
- Modern PSC pattern alignment

Goal:
- 5,000–10,000 verified questions
- Strong Malayalam quality
- Low repetition fatigue
- Concept-oriented preparation, not just memory-based recall

Core operating rule:

> **AI generates. Validator hardens. Refiner improves. Humans approve. System scales.**

---

## 1. Question Structure

Every question should follow this schema.

```json
{
  "text": {
    "en": "Who founded Travancore kingdom?",
    "ml": "തിരുവിതാംകൂർ രാജ്യത്തിന്റെ സ്ഥാപകൻ ആര്?"
  },
  "options": [
    { "key": "A", "en": "Marthanda Varma", "ml": "മാർത്താണ്ഡ വർമ്മ" },
    { "key": "B", "en": "Rama Varma", "ml": "രാമ വർമ്മ" },
    { "key": "C", "en": "Dharma Raja", "ml": "ധർമ്മ രാജ" },
    { "key": "D", "en": "Sree Chithira", "ml": "ശ്രീചിത്തിര" }
  ],
  "correctOption": "A",
  "explanation": {
    "en": "Marthanda Varma unified southern principalities into Travancore and is regarded as its founder.",
    "ml": "മാർത്താണ്ഡ വർമ്മ തെക്കൻ നാട്ടുരാജ്യങ്ങളെ ഏകീകരിച്ച് തിരുവിതാംകൂറിനെ ശക്തിപ്പെടുത്തിയതിനാൽ സ്ഥാപകനായി കണക്കാക്കപ്പെടുന്നു."
  },
  "topicId": "history",
  "subTopic": "kerala_history",
  "difficulty": 2,
  "examTags": ["ldc", "lgs", "degree"],
  "tags": ["travancore", "rulers", "kerala"],
  "questionStyle": "direct"
}
```

### Required Fields

- `text.en`, `text.ml`
- `options[4]`
- `correctOption`
- `explanation.en`, `explanation.ml`
- `topicId`
- `subTopic`
- `difficulty`
- `examTags`
- `tags`
- `questionStyle`

### Recommended Metadata for Production

```json
{
  "sourceType": "pyq",
  "sourceRef": "Kerala PSC LDC 2024 Set A",
  "parentQuestionId": "optional",
  "createdBy": "ai",
  "status": "review",
  "isVerified": false
}
```

---

## 2. Quality Rules

| Rule | Why |
|------|-----|
| **Exactly 4 options** | PSC standard format |
| **Exactly 1 clearly correct answer** | Ambiguity destroys trust |
| **Distractors must be plausible** | Random options create fake learning |
| **Explanation mandatory** | Learning happens in explanation |
| **Malayalam must sound natural** | Users immediately detect machine tone |
| **Tag by exam type** | LDC/LGS/Degree/Police coverage differs |
| **Difficulty 1–5** | Needed for quiz balancing and personalization |
| **Question style must be tagged** | Important for new PSC-pattern coverage |

### Difficulty Scale

```text
1 ⭐     — Direct fact
2 ⭐⭐   — Specific recall
3 ⭐⭐⭐  — Concept + elimination / multi-step recall
4 ⭐⭐⭐⭐ — Statement-based / negative / close options
5 ⭐⭐⭐⭐⭐— Analytical / inference / tricky application
```

### Question Style Definitions

```text
direct     — Straight factual recall
concept    — Tests understanding, relation, or application
statement  — Based on 2 or more statements
negative   — NOT / incorrect / exception based
indirect   — Asks around the fact rather than directly naming it
```

---

## 3. Updated for the New PSC Pattern

### Core Shift

The exam should not be treated as purely memory-based anymore.

Your database must include:
- direct fact questions
- concept-based questions
- statement-based questions
- negative/elimination questions
- indirect current affairs questions
- higher-difficulty variants from every strong PYQ

### Target Question Mix

Use this broad mix across the database:

```text
40% direct/basic
35% concept/application
15% statement-based
10% negative / high-trickiness
```

### Content Principle

> Every question should test **understanding**, not only **memory**, whenever the source safely allows it.

---

## 4. New High-Priority Question Types

### 4.1 Statement-Based Questions

Example:

```text
Consider the following statements:
1. Narayana Guru founded SNDP Yogam.
2. Ayyankali was associated with the upliftment of Pulaya community.
Which of the above is correct?
```

Target: **20–30% of medium/hard quiz sets**

### 4.2 Negative / Elimination Questions

Example:

```text
Which of the following is NOT a river in Kerala?
```

Use mostly at difficulty **3–5**.

### 4.3 Indirect / Concept Questions

Example:

```text
The ruler associated with the foundation of Travancore belongs to which historical phase of Kerala?
```

### 4.4 Current Affairs — Indirect Framing

Avoid shallow questions like:

```text
Who won X award?
```

Prefer:

```text
The person who won X award is associated with which field?
```

### 4.5 Higher-Difficulty Variants

Every useful PYQ should produce at least **1 harder version**.

---

## 5. AI Generation Rules

AI must follow these rules strictly:

### Core Rules
- Return structured JSON only
- Exactly 4 options
- Exactly 1 clearly correct answer
- No ambiguity
- Explanation mandatory
- Malayalam must be natural and PSC-friendly
- Prefer understanding-based framing where safe
- Prefer safer clarity over clever wording

### Distractor Rules
- Distractors must belong to the same topic domain
- They should be believable to a learner
- Avoid joke-like or obviously wrong distractors

### Current Affairs Rule
- Prefer field, institution, state, theme, or context-based framing
- Avoid fragile ultra-temporal trivia unless explicitly building CA sets

### Safe Generation Rule
If the source is weak or incomplete:
- do **not** invent unsupported facts
- generate the safest directly supported question possible

---

## 6. AI Agent Workflow

Use a controlled multi-step pipeline:

```text
Source → Generator → Validator → Malayalam Refiner → Human Review → Save
                                              ↓
                                       Variant Generator
                                              ↓
                                      Variant Validation
                                              ↓
                                           Approve
```

### Agent Responsibilities

#### Generator
Creates the first draft question from source text.

#### Validator
Checks:
- factual correctness
- ambiguity
- distractor quality
- difficulty correctness
- question style correctness

#### Malayalam Refiner
Improves Malayalam naturalness without changing meaning or answer.

#### Variant Generator
Creates 5 targeted variations:
1. Reverse question
2. Concept-based version
3. Negative/elimination version
4. Statement-based version
5. Higher-difficulty version

---

## 7. PYQ Variation Engine

One PYQ should generate **4–6 quality questions**.

### Method 1: Reverse Question

```text
ORIGINAL: Founder of Travancore? → Marthanda Varma
VARIANT:  Marthanda Varma is known as founder of ___?
```

### Method 2: Change Focus

```text
ORIGINAL: Year Travancore was founded? → 1729
VARIANT:  Who was ruling Travancore in 1729?
VARIANT:  Which kingdom was founded in 1729?
VARIANT:  What major event happened in Kerala in 1729?
```

### Method 3: Negative Framing

```text
ORIGINAL: Which is a river in Kerala? → Periyar
VARIANT:  Which of the following is NOT a river in Kerala?
```

### Method 4: Match / Pair Split

```text
Q1: Velu Thampi Dalawa is associated with ___?
Q2: Pazhassi Raja operated mainly in ___?
Q3: Kundara Proclamation was issued by ___?
```

### Method 5: Statement-Based Conversion

```text
Convert a direct question into statement evaluation form.
```

### Method 6: Higher-Difficulty Upgrade

```text
EASY:  Who was the last ruler of Cochin?
MEDIUM: In what year did Cochin merge with India?
HARD: Which is the correct sequence in the integration of Travancore, Cochin, and Malabar?
```

### Variation Rule

For every approved PYQ-derived question, attempt to generate:
- 1 reverse version
- 1 concept version
- 1 negative version
- 1 statement-based version
- 1 harder version

---

## 8. Topic Prioritization

### Weight Distribution

| Topic | LDC % | LGS % | Degree % | Police % | Priority |
|-------|------:|------:|---------:|---------:|----------|
| Kerala History & Culture | 15 | 15 | 12 | 15 | 🔴 Critical |
| Indian History | 10 | 10 | 12 | 10 | 🔴 Critical |
| Geography (Kerala + India) | 12 | 12 | 10 | 12 | 🔴 Critical |
| Indian Polity & Constitution | 12 | 12 | 15 | 12 | 🔴 Critical |
| General Science | 12 | 12 | 10 | 12 | 🟡 High |
| Current Affairs | 15 | 15 | 15 | 15 | 🟡 High |
| Malayalam & English | 8 | 8 | 8 | 8 | 🟡 High |
| Reasoning & Mental Ability | 8 | 8 | 8 | 8 | 🟢 Medium |
| IT & Cyber Laws | 3 | 3 | 5 | 3 | 🟢 Medium |
| Renaissance & Social Reform | 5 | 5 | 5 | 5 | 🔴 Critical |

### High Repeat Subtopics

```text
Kerala Renaissance leaders
Indian Constitution (Articles 1–32, Amendments, Rights)
Kerala Geography (rivers, districts, wildlife, backwaters)
Freedom movement (national + Kerala)
Panchayati Raj & Local Self Government
IT basics, cyber laws, RTI
```

### Production Order

```text
Phase 1 (0–2000):
  Kerala History + Renaissance
  Indian Polity
  Kerala Geography
  Current Affairs
  General Science
  Indian History

Phase 2 (2000–5000):
  PYQ variations
  Deep subtopics
  Malayalam/English grammar
  Reasoning sets

Phase 3 (5000+):
  Niche topics
  High-difficulty variants
  Mock papers
```

---

## 9. Daily Quiz Strategy

### Composition Formula (20 Questions)

```text
Kerala History/Culture:   3–4
Indian History:           2
Geography:                2–3
Polity/Constitution:      2–3
General Science:          2–3
Current Affairs:          3–4
Language/Reasoning:       2
Renaissance:              1–2
Wild card:                1
```

### Updated Difficulty Curve

```text
Q1–Q5   → Easy
Q6–Q12  → Medium
Q13–Q18 → Hard
Q19–Q20 → Very Hard / boss level
```

### Style Balance per Daily 20

Recommended style target:

```text
Direct:     8
Concept:    6
Statement:  2
Negative:   2
Indirect:   2
```

### Hard Section Recommendation

Within the final 5 hard questions, try to include:
- 2 statement-based
- 2 negative/elimination
- 1 conceptual/inference-heavy

### Anti-Repeat Rules

| Rule | Implementation |
|------|---------------|
| Never repeat same question within 30 days | `questionId NOT IN last_30_days_attempts` |
| Never 2 same subtopics consecutively | shuffle with constraint |
| Prioritize weak areas (30%) | topics with <60% accuracy |
| Include 1–2 unseen questions | freshness |
| Rotate PYQ vs original | 40% PYQ, 60% original |

### Weekly Theme Ideas

| Day | Theme |
|-----|-------|
| Monday | Kerala Focus |
| Tuesday | Polity Tuesday |
| Wednesday | Science Wednesday |
| Thursday | History Throwback |
| Friday | Mixed Challenge |
| Saturday | Current Affairs |
| Sunday | Weak Area Focus |

---

## 10. Personalization Rules

Track:
- accuracy by topic
- accuracy by subtopic
- average time taken
- difficulty tolerance
- recent attempts
- weak topics (<60%)
- style weakness (e.g. poor performance in statement questions)

Serve:
- weak-area quizzes
- smart daily quiz
- style-specific boosters
- topic-specific revision sets
- harder quizzes for strong users

### Smart Personalization Insight

If a user is strong in direct questions but weak in statement-based questions, increase statement-based exposure gradually.

---

## 11. Content Production Pipeline

### Source → Database Flow

```text
SOURCES:
PSC Previous Year Papers (2015–2025+)
PSC syllabus documents
Trusted PSC prep books
Daily newspapers (Mathrubhumi, Manorama, The Hindu where relevant)
Official government releases / schemes / reports

FLOW:
Scan / source collect
→ Extract usable facts / concepts
→ AI draft generation
→ Validation
→ Malayalam refinement
→ Human review
→ Bulk import / save as review
→ Approve
```

### Quality Gate

Every AI-generated question must pass:
- source-supported content
- single correct answer
- plausible distractors
- natural Malayalam
- valid difficulty tag
- valid questionStyle tag
- duplication check
- human approval

No direct publish without review.

---

## 12. Wrong-Option Explanation Enrichment

To improve learning quality, optionally store short reasoning for each option.

Example structure:

```json
{
  "optionWhy": {
    "A": { "en": "Wrong because...", "ml": "തെറ്റാണ്, കാരണം..." },
    "B": { "en": "Correct because...", "ml": "ശരിയാണ്, കാരണം..." },
    "C": { "en": "Wrong because...", "ml": "തെറ്റാണ്, കാരണം..." },
    "D": { "en": "Wrong because...", "ml": "തെറ്റാണ്, കാരണം..." }
  }
}
```

This is especially useful for:
- statement-based questions
- negative questions
- concept questions

---

## 13. Bulk Import Template

```json
[
  {
    "text": { "en": "...", "ml": "..." },
    "options": [
      { "key": "A", "en": "...", "ml": "..." },
      { "key": "B", "en": "...", "ml": "..." },
      { "key": "C", "en": "...", "ml": "..." },
      { "key": "D", "en": "...", "ml": "..." }
    ],
    "correctOption": "A",
    "explanation": { "en": "...", "ml": "..." },
    "topicId": "history",
    "subTopic": "kerala_renaissance",
    "difficulty": 3,
    "examTags": ["ldc", "lgs"],
    "tags": ["narayana_guru", "sndp"],
    "questionStyle": "concept",
    "status": "review",
    "isVerified": false,
    "createdBy": "ai"
  }
]
```

---

## 14. Scale Targets

| Milestone | Questions | Timeline | Daily Quiz Quality |
|-----------|----------:|----------|--------------------|
| MVP | 200 | Week 1 | repeats after ~10 days |
| Usable | 1,000 | Month 1 | repeats after ~50 days |
| Good | 3,000 | Month 3 | rarely repeats |
| Excellent | 5,000+ | Month 6 | very strong personalization |
| Pro | 10,000+ | Year 1 | full mock support |

---

## 15. Final Operating Rules

1. Bad content kills trust faster than missing content.
2. AI should accelerate production, not replace review.
3. Every PYQ should try to generate deeper coverage.
4. Modern PSC prep requires concept + elimination + statement handling.
5. A quiz app becomes valuable when it behaves like a learning system.

### Final Rule

> **This is not just a question bank. It is a structured PSC content system.**
