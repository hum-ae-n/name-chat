# Edge Cases & Tiebreakers

Read when the main decision tree produces a tie or when no prefix feels right. These are the situations that genuinely came up in Rocky's chat history.

## Tiebreaker reference (full version)

The main SKILL.md has a short version. Here's the full reasoning behind each rule:

### ART vs READ — ART wins

Many ART chats begin as READ. Rocky pastes an article, reacts to it, and the reaction becomes a Substack response. Classifying by the starting state mislabels the chat. The work product is what matters: if anything publishable came out, it's ART.

Test: did Claude help produce a draft long-form piece (>500 words, intended for Substack/op-ed)? If yes → ART.

### LI vs READ — LI wins

Pasted-post-in / drafted-comment-out is the most common LinkedIn pattern. Even though the chat started with "look at this post", the work product is the comment. LI captures that.

Test: did Claude help draft a LinkedIn comment, post, or principle? If yes → LI.

### CLIENT vs KAI — depends on commercial pipeline

Both can involve named external parties. The discriminator is whether money is on the line.

- "Pitching to Wärtsilä" with no engagement letter, exploring what to offer → KAI
- "Wärtsilä Deployment Readiness Quote" with a reference code and a price → CLIENT

Test: is there a quote, SOW, tender response, or signed engagement? If yes → CLIENT.

### CLIENT vs EXN — EXN wins if expert-network-mediated

Atlas Copco shows up in both: as a paid M&A advisory client (CLIENT) and as the subject of expert-network calls (EXN). The mediating relationship determines the prefix.

Test: is there an expert-network broker (GLG, Guidepoint, Dialectica) involved? If yes → EXN.

### KAI vs CAR — KAI for firm, CAR for Rocky

The simplest discriminator. KAI is about Kaipability the entity. CAR is about Rocky the individual professional.

- "Should Kaipability bid for the ARIA Activation Partner role?" → KAI
- "Should I apply for the ARIA CTrO role personally?" → CAR

When both are true (e.g. Rocky positions himself for a role partly to legitimise Kaipability), classify by the dominant work product: CV/application material → CAR; firm pitch/strategy → KAI.

### COMS vs KAI — message vs strategy

COMS is the prefix for chats where the dominant output is a private message to a named recipient (email, DM, text, Slack). KAI is for firm-level strategy thinking.

Test: if you removed the email/message, would the chat still feel like a substantive deliverable?

- Yes → KAI (the thinking was the work; the email was a tail)
- No → COMS (the message was the work; the thinking was the means)

Examples:
- "Help me think through how Kaipability should respond to ARIA's shape, then maybe draft something to Kathleen" — KAI (strategy is the lift)
- "Draft a reply to Vicente Orts on his Bessemer message" — COMS (the message is the lift)

### COMS vs CLIENT — commercial context wins

The moment a quote, tender, scope, or contract enters the email, it's CLIENT not COMS. The commercial pipeline determines the prefix, not the medium.

- "Email to Saab procurement about the SOW" → CLIENT
- "Email to a Saab engineer about an industry topic we both care about" → COMS

### COMS vs CAR — pursuit context wins

Cover letters, recruiter replies, fellowship applications, board nomination responses → CAR. The role-pursuit context determines the prefix, not the email medium.

- "Cover letter for the CTrO role" → CAR
- "Email to a CTrO panel member I already know, asking for a coffee" → COMS (the email is relationship-building, not application material)

### TOOL vs anything else — TOOL only when the tool is the point

The HTML diagram Claude generates as part of a strategy session is NOT enough to make the chat TOOL. The diagram is a side output of the strategy. TOOL is when the chat exists primarily to produce or improve a piece of software/code.

- "Build me a chat naming skill" → TOOL (the skill is the output)
- "Walk me through the Wärtsilä offering and make me an HTML diagram of it" → KAI (the strategy is the output, the diagram is a side artifact, flag [DOC])

### EXN vs READ — EXN wins if any expert-network workflow

Rocky sometimes analyses industries that overlap with his expert network coverage. The rule: if any part of the chat involved an expert-network workflow (screener, brief, prep), it's EXN. Otherwise it's READ.

Test: did Rocky use the consultation-requests skill, mention a screener, or work on call prep? If yes → EXN.

---

## Recurring edge cases

### The "skill being tested" chat

Some chats exist to develop or test a skill (e.g. "Running legend skill on Yellow Cake"). Two prefixes apply: TOOL (skill development) and the topic-domain prefix (LIFE for Yellow Cake personal investment).

Rule: classify by **primary intent**. If the chat is primarily about debugging the skill and the topic is a test case, it's TOOL. If the chat is primarily about the topic and the skill is the means, classify by the topic.

Example:
- "Run the legend skill on Yellow Cake" → LIFE (the skill ran cleanly; the output was Yellow Cake analysis)
- "The legend skill keeps misclassifying — let me debug it with Yellow Cake" → TOOL

### Multi-session work on the same article / quote / pitch

Same topic, multiple chats over several days. Each chat gets its own date, but topic should be consistent enough to group. Include a version number or session signal when useful.

- `ART | Manufacturing Fetishism v2 | 2026-04-01 [DOC]`
- `ART | Manufacturing Fetishism v5 | 2026-04-02 [DOC]`

If the chats are functionally identical and just slipped onto different days, consider whether one should absorb the other after the fact. Don't sweat this — date-based separation is fine.

### Chat that started in one category and ended in another

Use the [>] flag. Classify by the **dominant work product** — usually the last quarter of the chat.

Example: chat opens with "look at this article" (READ), then mid-session Rocky pivots to "actually let's draft a LinkedIn response" and the rest is the comment draft. → `LI | Topic | YYYY-MM-DD [>]`

The [>] tells you to expect divergence; the prefix tells you where it ended up.

### One- or two-message chats

Some chats are tiny — Rocky pastes something and gets a one-paragraph reaction. Apply the convention anyway. Brevity doesn't change the prefix logic.

Example: pasted Eric Schmidt commencement post + one-paragraph reaction → `LI | Comment - Eric Schmidt Commencement | 2026-05-18`

### Chats where Claude did most of the talking (long Claude outputs, short Rocky prompts)

The prefix follows the OUTPUT, not the input. If Rocky said "go" and Claude produced a 4,000-word strategy doc, the chat is still classified by what Claude produced.

### The "find a previous chat" chat

Rocky sometimes asks Claude to search past conversations to surface an old discussion. These admin-style chats are usually low-value and don't deserve elaborate names. Default to:

- `KAI | Finding [Topic] Chat | YYYY-MM-DD` (if searching for Kaipability work)
- `EXN | Finding [Topic] Chat | YYYY-MM-DD` (if searching for expert-call material)

Or absorb the rename into the next substantive chat that picks up the thread.

### Strategy/principle workshopping with no immediate deliverable

Sessions where Rocky and Claude iterate on a principle, frame, or thesis without producing a final artifact. These usually become LI posts or articles later. Classify by likely destination:

- Aphorism / principle iteration → LI (most principles become LI posts)
- Long-form thesis development → ART (working toward Substack)
- Pure positioning thinking with no public destination → KAI or CAR

If genuinely uncertain, KAI is the safe default for firm-related thinking.

### Investment / portfolio analysis

Three sub-cases:

1. **Personal portfolio** (Yellow Cake, retail investment decisions) → LIFE
2. **Industry intelligence on a former employer or adjacent firm** (Atlas Copco VTBA, Edwards Vacuum) → READ if no commercial relationship, EXN if expert-network framed
3. **Investment thesis for a paying client** → CLIENT

---

## Common mistakes

### Naming by starting prompt instead of ending output

The most frequent error. Rocky often opens with a question that suggests one category, then the chat drifts into another. Classify by what got built.

### Adding new prefixes ad hoc

The system survives because it's small. COMS was added deliberately via audit (May 2026) because the data justified it. Resist the urge to invent INV (investment), INTEL (industry intelligence), POLICY (policy work), STRAT (strategy), or META (meta-work). Force-fit into the existing ten. If after six months a prefix genuinely doesn't exist for ≥10 chats, then propose a refactor — but only via the audit process.

### Status flags beyond [DOC] and [>]

Flags like [PUB], [SUBMITTED], [OPEN], [DONE], [WIP] decay. The first time Rocky submits a quote, [PUB] feels useful. By chat 50, it's been forgotten on 30% of them and the inconsistency is worse than not having it. Status belongs in a tracker, not chat names.

### Over-long topics

Anything beyond ~10 words becomes hard to scan. Trim ruthlessly. "Kaipability's evolution from advisory to capability institution" → "Evolution Advisory to Capability Institution". The prefix already says it's Kaipability.

### Using underscores or camelCase in topics

Topics are human-readable. Spaces are fine. Avoid `evolution_advisory_to_capability` and `EvolutionAdvisoryToCapability`. Use plain English: `Evolution Advisory to Capability Institution`.

### Inconsistent date format

Always YYYY-MM-DD. Not DD-MM-YYYY, not "May 18 2026", not "18/05/2026". Sortability depends on this.

### Including time of day

Don't. Date is enough. If two chats happened on the same day on the same topic, version them (`v1`, `v2`) or add a hint (`morning`, `afternoon`) — but more often, one is a duplicate and should be addressed in audit.

---

## When to ask Rocky rather than guess

Most renames don't need confirmation — the prefix is obvious. Ask only when:

1. **No prefix fits cleanly and you're tempted to invent a new one.** Surface the ambiguity rather than force-fit.
2. **The chat is two unrelated halves and [>] doesn't capture it.** Sometimes a chat is two distinct sessions. Ask whether to rename one and ignore the other, or use [>].
3. **The "current chat" prefix would contradict the rename Rocky asked for in a previous chat.** Surface the conflict.
4. **Batch rename and you've hit a string of ≥5 chats where you're genuinely uncertain.** Pause and ask Rocky to clarify the boundary, rather than guess fifty in a row.

Otherwise: pick the best prefix, present the rename, and move on. Rocky will correct what doesn't fit.
