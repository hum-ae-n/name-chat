---
name: chat-naming
description: >
  Generate a properly formatted chat name (or batch-rename a list of chats) using
  Rocky's ten-prefix taxonomy. Use when Rocky asks to "rename this chat", "suggest
  a chat rename", "rename these chats", "tidy up my chat list", "what should this
  chat be called", "fix the chat title", or "name this conversation". Also use when
  Rocky pastes a list of chat titles for renaming, or when Claude has finished a
  substantial piece of work and the chat title is still the auto-generated stub
  (offer a rename before signing off). Also fires in elicitation mode on "add a
  naming convention", "show me the taxonomy", "what are the categories", "remind me
  of the index", or "which prefix" — in elicitation mode, show the taxonomy index
  and let Rocky decide, do not auto-classify. Do NOT use for naming files,
  documents, artifacts, skills, or projects — chat names only. Do NOT use for
  general taxonomy or filing system design unrelated to Rocky's chat history.
---

# Chat Naming

Generate scannable, sortable chat names that survive at scale. The naming convention is bottom-up from observed chat types, not an idealised taxonomy. Nine prefixes, one format, two flags.

## Why this exists

Default chat titles are auto-generated from the first message and almost always rubbish ("View options", "The p", "Good"). After 200 chats they become unfindable. A consistent convention restores searchability and gives at-a-glance triage. The system survives if it's small enough to hold in the head — ten prefixes is the working ceiling. Adding more invites rot.

## Format

```
PREFIX | Topic | YYYY-MM-DD [flags]
```

- **PREFIX** — one of the nine codes below
- **Topic** — 3 to 10 words, sentence case (proper nouns retain case), no pipes, no slashes
- **YYYY-MM-DD** — the chat's working date (date the work was done, not when renamed)
- **flags** — optional, space-separated, in square brackets

The pipe `|` is the separator. Pipes scan better than dashes because topic names already use dashes.

### Flags

Only two flags. Adding more invites rot.

- **[DOC]** — a downloadable artifact was created (.docx, .xlsx, .pptx, .pdf, .html, .jsx, .zip). Files written for Claude's own scratch don't count; only deliverables intended for export.
- **[>]** — the chat clearly diverged mid-conversation from its original topic. Use sparingly; if you're tempted on every other chat, the prefix is wrong.

Status flags like [PUB] or [OPEN] are NOT used. Status belongs in a tracker, not a chat name. Maintenance cost on status flags decays fast and they go stale silently.

## The ten prefixes

| Prefix | Meaning | Primary signal |
|---|---|---|
| **EXN** | Expert Network — screeners, prep, call briefs, post-call notes | GLG, Guidepoint, Dialectica, "screener", "expert call" |
| **KAI** | Kaipability — business strategy, positioning, offerings, internal architecture | "Kaipability", offering design, founding principles, internal pitch |
| **CLIENT** | Client-facing deliverables — quotes, proposals, tender responses, named-client work | Saab, Atlas Copco, Wärtsilä, named tender, paid engagement |
| **ART** | Article / writing — Substack pieces, long-form posts, publishable analytical writing | Substack draft, response article, op-ed, principle-to-publication arc |
| **LI** | LinkedIn — public comment/reaction drafts, principle posts, micro-content | Screengrab in, comment out, "post or comment" |
| **COMS** | Communications — private email / DM / message drafting to a named recipient | "draft an email", "reply to [name]", message_compose tool, peer / mentor / contact outreach |
| **READ** | Reading & reacting — analysing someone else's content with no published output | Pasted article, event recap, fact-check, sense-making with no deliverable |
| **CAR** | Career & personal positioning — role pursuit, trajectory decisions, personal brand | CTrO, ARIA pursuit, CV review, perception gap, career trajectory |
| **TOOL** | Build / technical — code, websites, embeds, skills, scripts, video prompts | HTML, Python, Carrd embed, Veo prompt, skill development |
| **LIFE** | Personal / admin — family, travel, shopping, personal finance, household | Travel, groceries, kids' content, household admin, personal investments |

Read `references/prefix-guide.md` for detailed criteria and worked examples per prefix.

## Two modes

The skill operates in one of two modes. Detect which before doing anything else.

### Auto-classify mode (default)

Rocky has asked Claude to rename a chat or has just finished work on a chat whose title is the auto-generated stub. Claude reads the chat, applies the decision tree, presents the proposed name. Rocky corrects if needed.

Trigger phrases: "rename this chat", "suggest a rename", "what should this be called", "fix the chat title", "rename these chats" (batch).

### Elicitation mode

Rocky wants to see the taxonomy and decide for himself. Claude does NOT auto-classify in this mode. Claude presents the index and gets out of the way.

Trigger phrases: "add a naming convention", "show me the taxonomy", "what are the categories", "remind me of the index", "which prefix", "what are my options".

Behaviour: show the taxonomy index (see "Taxonomy index card" below), say something close to *"Here you go — you decide"*, and stop. Do not propose a name. Do not narrow the options. If Rocky then picks a prefix or asks for a recommendation, switch to auto-classify mode and proceed.

The point of elicitation mode is to surface the system without forcing a choice. Some chats are genuinely ambiguous and Rocky's judgment trumps the decision tree. Some renames are pedagogical — Rocky is reminding himself of the system. Either way, show the index, let him pick.

### Taxonomy index card

When in elicitation mode (or when Rocky explicitly asks for the index), present this card verbatim:

```
Format: PREFIX | Topic | YYYY-MM-DD [flags]

| Code   | Domain              | Use for                                            |
|--------|---------------------|---------------------------------------------------|
| EXN    | Expert network      | Screeners, call prep, post-call briefs            |
| KAI    | Kaipability firm    | Strategy, offerings, principles, fundraising       |
| CLIENT | Named client work   | Quotes, proposals, tenders, paid engagements      |
| ART    | Article / long-form | Substack, op-eds, response pieces                  |
| LI     | LinkedIn (public)   | Comments, principle posts, micro-content           |
| COMS   | Communications      | Private email, DM, message to named recipient     |
| READ   | Read & react        | Analysing someone else's content, no publication   |
| CAR    | Career / Rocky      | Role pursuit, trajectory, CV, personal positioning |
| TOOL   | Build / technical   | Code, HTML, scripts, skills, video prompts         |
| LIFE   | Personal / admin    | Family, travel, household, personal finance        |

Decision order (stop at first match):
Artifact produced? → flag [DOC]
Then: EXN → CLIENT → ART → LI → TOOL → CAR → COMS → KAI → READ → LIFE

Flags (only two):
  [DOC]  downloadable artifact produced
  [>]    chat diverged from its starting topic

Tiebreakers:
  ART beats READ. LI beats READ.
  CLIENT beats KAI / COMS when money's on the table.
  CAR beats COMS when the message is part of role pursuit.
  COMS beats KAI when a named-recipient message is the dominant output.
  EXN beats READ when an expert-network workflow is involved.
  KAI for the firm; CAR for Rocky personally.
```

Close with one line like *"Here you go — you decide."* Then stop.

---

## Decision procedure (auto-classify mode)

### Step 1: Gather what you have

Three input scenarios:

**A. Current chat in progress.** Read the whole conversation context — title, opening message, work done, output produced.

**B. Single chat from history.** Use `conversation_search` or `recent_chats` to retrieve the chat, then read its title + summary or full content.

**C. Batch list provided.** Rocky pastes a list of titles (and possibly summaries). Work through them one by one.

### Step 2: Apply the decision tree

Walk through the questions in order. Stop at the first match.

```
1. Was there a downloadable artifact (.docx/.xlsx/.pdf/.pptx/.html/.zip)
   produced for export? → set [DOC] flag.

   FILENAME SHORT-CIRCUIT: scan the artifact filename(s). If any contains:
     - A client reference code in the form NN-AAAA####III[V][N]
       (e.g. 00-WAR1001MRV1, 04-ACG1012MRV2, 06-SAAB1003MRV1)
     - The keywords "Quotation", "Quote", "Tender", "SOW",
       "Statement of Work", or "Proposal" (as a named-client deliverable)
     - A known named client (Saab, Wärtsilä, Wartsila, Atlas Copco,
       Edwards, Rolls-Royce, or any client Rocky has live engagement with)
   → prefix is CLIENT. Stop. Do not walk the rest of the tree.

   This catches the failure mode where the chat *feels* like internal
   strategy (KAI) but actually produced a client deliverable. The
   filename is the ground truth; the chat framing is not.

2. Was this primarily expert-network work (screener, call prep, call notes,
   post-call brief, expert-network admin)?
   → EXN

3. Was this work for a specific named client with money or a real commercial
   pipeline (Saab quote, Atlas Copco tender, Wärtsilä proposal, paid engagement)?
   → CLIENT

4. Was the dominant output a publishable analytical piece (Substack, op-ed,
   long-form post, response article — whether published yet or not)?
   → ART

5. Was the dominant output a LinkedIn comment, reaction, principle post,
   or other public micro-content?
   → LI

6. Was the dominant output a built thing — code, HTML, embed, skill, script,
   video prompt, website page?
   → TOOL

7. Was this about Rocky's own career, role pursuit, perception, trajectory,
   or personal brand positioning (CTrO pursuit, ARIA role, CV review)?
   → CAR

8. Was the dominant output a private email, DM, or message drafted for a
   named recipient (peer, mentor, contact, peer-firm leader) — and not
   covered by CLIENT or CAR above?
   → COMS

9. Was this about Kaipability's business shape — strategy, offerings,
   founding principles, fundraising, internal architecture?
   → KAI

10. Did the chat involve analysing someone else's content (article, event,
    post, report) without producing a publishable output?
    → READ

11. Personal / admin / family / travel / household / personal finance?
    → LIFE
```

### Step 3: Handle ties and ambiguity

Tiebreakers when two prefixes both fit:

- **ART vs READ** — ART wins. Publication is the work product. "We read an article and wrote a response" is ART.
- **LI vs READ** — LI wins. The output is the comment, not the analysis.
- **CLIENT vs KAI** — CLIENT wins if there's a named client and commercial pipeline. KAI wins for generic positioning work even if it references a future client.
- **CLIENT vs EXN** — EXN wins if the chat is screening or call prep for an expert network. CLIENT wins for direct paid work.
- **CLIENT vs COMS** — CLIENT wins. Any email about a quote, contract, tender, or paid engagement is CLIENT, even if the chat's main output is the email itself. Commercial context beats medium.
- **CAR vs COMS** — CAR wins. Cover letters, recruiter replies, fellowship applications, and any other role-pursuit message are CAR, not COMS. Pursuit context beats medium.
- **COMS vs LI** — LI is public (LinkedIn comment/post visible to all). COMS is private (email, DM, direct message).
- **COMS vs KAI** — COMS when a sent message to a named recipient is the dominant output. KAI when the chat is firm-level strategy thinking that happens to produce an email as a side artifact. Test: if you took away the email, would the chat still feel like a substantive deliverable? Yes → KAI. No → COMS.
- **KAI vs CAR** — KAI is about the firm; CAR is about Rocky personally. "Should I take the CTrO role" is CAR. "How should Kaipability position against ARIA" is KAI.
- **TOOL vs KAI** — TOOL when the work product IS the code or page. KAI when the chat is strategy that produced a side artifact.
- **EXN vs READ** — EXN wins if any expert-network workflow was involved (screener, briefing, post-call). READ wins for pure industry intelligence that wasn't called for a client.

When in genuine doubt: pick the prefix that best describes the **dominant output product**, not the starting prompt. Many chats start as one thing and become another; classify by what got made.

### Step 4: Generate the topic

Topic rules:

- 3 to 10 words. Shorter is better.
- Sentence case. Proper nouns keep their case. Acronyms stay capitalised (ARIA, MIT, NHS, IGT/HPT).
- No pipes, slashes, colons. Em dashes and en dashes are fine in topics but Rocky's house style avoids em dashes — use hyphens for compounds.
- Include the distinguishing detail: client name, framework name, panel/event name, version number if relevant (v2, v3).
- Strip filler ("a", "the", "discussion of") unless dropping it makes the topic unreadable.

Bad topics (too vague to disambiguate at scale):
- `KAI | Strategy discussion | 2026-05-18`
- `READ | Article analysis | 2026-05-13`
- `LI | Comment | 2026-05-11`

Good topics (specific, scannable):
- `KAI | Ontologies & Knowledge Graphs | 2026-05-19`
- `READ | FT Article - Family Firms Less Intelligent | 2026-05-11`
- `LI | Comment - Drucker Quote Inversion Tangen Post | 2026-05-11`

### Step 5: Format and present

**Output format is load-bearing.** Wrap the proposed name — and *only* the name —
in a single inline backtick code span, so it renders as a `<code>` element. The
`Proposed:` label and the `(was: …)` line stay as ordinary text *outside* the
backticks. Never present the name as plain or bold text, and never split it
across lines. This matches the inline `PREFIX | Topic | date` style used
throughout this skill; the Kaipability Chat Namer browser extension detects that
code span and copies the name. Keep the rest of the reply free of backtick spans
where you can — if you must reference a flag like [DOC] in the reasoning, write
it as plain text, not in backticks, so the name is the only code span.

For a single rename, present exactly like this — no preamble:

Proposed: `EXN | Edwards-Ebara CMP screener assessment | 2026-05-18`
(was: Edwards as Ebara competitor)

**Always show the previous title alongside the proposed rename.** This applies to single renames and batch renames alike. The old title is the audit trail — Rocky needs to recognise that the rename refers to the chat he's thinking of.

For batch renames, use a two-column table with the current title in column 1 and the proposed rename in column 2:

| Current title | Proposed rename |
|---|---|
| Edwards as Ebara competitor | EXN \| Edwards-Ebara CMP screener assessment \| 2026-05-18 |
| View options | ART \| Substack - Patents come fifth \| 2026-05-18 [DOC] |

Never present a rename without the prior title visible. If the prior title is genuinely unknown or unrecoverable, say so explicitly: `(was: <auto-stub, unrecoverable>)`.

For batch renames, run `scripts/format_name.py` to validate format consistency across the list. Pass `--artifacts` with any associated artifact filenames to also cross-check the prefix against the file-scan rule from Step 2.

### Step 6: Validate

Before presenting, check each name against:

1. **Prefix is one of the nine.** No improvisation — if nothing fits, pick the closest and use [>] if needed, but resist adding a new prefix. The system is small on purpose.
2. **Topic is 3-10 words and specific.** If you can't tell what the chat was about from the topic alone, it's too vague.
3. **Date is in YYYY-MM-DD format.** Use the date the work was actually done.
4. **Flags are [DOC] and/or [>] only.** No other flags.
5. **The whole name is under ~80 characters.** Long names get truncated in chat lists.

If running a batch rename, `scripts/format_name.py` enforces these mechanically.

## Edge cases

For ambiguous chats, divergence flags, multi-session work, skill-testing sessions, and "rename a chat that's just one or two messages", read `references/edge-cases.md`.

## Proactive use

At the end of a substantive work session, if the chat title is still the auto-generated stub (one to three words, often nonsensical), Claude may proactively offer a rename in one short line:

> "Suggest renaming this chat to `KAI | Founding Principles v3 | 2026-05-19 [DOC]`. Use this or want to adjust?"

This is optional and Rocky-led. Do not nag. If he ignores the offer, move on.

## Audit cadence

The naming system rots without periodic cleanup. Read `references/audit-cadence.md` for the monthly audit procedure (recommended cadence: first Monday of each month, ~20 minutes).

## Reference files

- `references/prefix-guide.md` — Detailed criteria, signal phrases, and worked examples for each of the nine prefixes. Read when classification is non-obvious.
- `references/edge-cases.md` — Tiebreakers, ambiguous classifications, multi-session work, and divergence handling. Read when the decision tree produces ties or when no prefix feels right.
- `references/audit-cadence.md` — Monthly audit procedure and rules for retiring, splitting, or merging prefixes. Read when running periodic cleanup.

## Scripts

- `scripts/format_name.py` — Validates and normalises chat names. Accepts a single name or a list (one per line). Outputs the validated name(s) on stdout and any errors on stderr. Run when batch-renaming or when you want to mechanically verify a proposed name.
