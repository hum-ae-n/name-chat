# Audit Cadence

The naming system rots without periodic cleanup. New chats accumulate with default titles. Older chats develop inconsistencies. Prefixes drift in scope. This file specifies the monthly audit procedure that keeps the system live.

## Recommended cadence

**First Monday of each month, ~20 minutes.** Set a calendar block. The audit pays for itself in search time saved over the following month.

If skipped for two consecutive months, the backlog gets harder to clear. Three months and the system needs a rescue audit (1-2 hours) rather than maintenance (20 min).

## What to do in 20 minutes

### Step 1: Pull the last 30 days of chats (5 min)

Use `recent_chats` with `after` set to 30 days ago. Scan the titles.

Identify three buckets:

- **Already named correctly** — leave alone
- **Default auto-titles still in place** — rename now
- **Inconsistent or vague names** — flag for rename

Target: zero default titles older than 30 days.

### Step 2: Rename the default-title chats (10 min)

For each chat with a default title, apply the standard procedure (see SKILL.md Step 2). Most should be obvious from the first few messages. Don't agonise.

If a chat is genuinely useless (test prompts, abandoned threads, dead-ends), use a clear stub like:
- `LIFE | Abandoned Thread | YYYY-MM-DD`
- `READ | Quick Read No Output | YYYY-MM-DD`

This stops them showing up in future searches but doesn't pretend they were productive.

### Step 3: Health check on prefix distribution (5 min)

Roughly count how many chats fell into each prefix over the last 30 days. Expected distribution (Rocky's pattern post-COMS addition, May 2026 onward):

```
EXN     20-25%   (expert network volume is high)
KAI     12-18%   (firm work, reduced slightly by COMS)
ART     10-15%   (article cadence)
LI       5-10%   (public LinkedIn cadence)
COMS     3-7%    (peer/mentor/contact email drafting)
READ    15-20%   (industry/policy reading)
CAR      5-10%
CLIENT   5-15%   (varies with engagement pipeline)
TOOL     5-10%
LIFE    10-15%
```

### Red flags to watch for

- **READ above 30%** — READ is becoming a dustbin. Consider splitting into READ-ART (precursor reading) and READ-INTEL (industry intelligence) OR adjusting other prefixes to absorb some of it.
- **TOOL below 5% for three consecutive months** — TOOL isn't earning its place. Consider folding into KAI or CLIENT.
- **COMS below 3% for three consecutive months** — COMS isn't earning its place. Fold back into KAI/CAR.
- **COMS above 10% consistently** — boundary with KAI may need re-examining; some strategy chats are being collapsed into their email output.
- **CAR at zero** — either no active career moves (fine) or career chats are being misclassified as KAI/COMS (fix).
- **New unofficial prefix appearing** — someone (Claude or Rocky) invented `INV` or `STRAT`. Decide: promote to official (rare) or reclassify into existing ten (usual).

## What NOT to do in an audit

- **Don't re-rename chats from prior months unless they're misclassified.** Stable names are searchable names. Don't churn.
- **Don't add new flags retroactively.** [DOC] is fine to add when missed; status flags are deliberately not in the system.
- **Don't merge or split prefixes during the audit.** That's a refactor decision, made deliberately, not during routine maintenance.

## Quarterly refactor decision (every 3 months)

Once a quarter, ask:

1. **Has any prefix grown unwieldy (>30% of chats consistently)?** Consider splitting.
2. **Has any prefix died (<5% of chats consistently)?** Consider folding.
3. **Are there ≥10 chats that didn't fit any prefix?** Consider whether a new prefix is justified.
4. **Has Rocky's working pattern shifted?** (e.g. moved from advisory to operating role — might change CLIENT/CAR/KAI balance significantly)

Refactors should be rare. Once a year is typical. The nine-prefix system was designed to be stable.

## Rescue audit (if maintenance lapses)

If three or more months have passed since the last audit:

1. **Don't try to rename everything.** Rename the last 60 days. Older chats are mostly historical record.
2. **Pull a sample of 30 chats from the unrenamed backlog and check prefix distribution.** Make sure the pattern is still healthy.
3. **Identify any chats that have become reference material** (frequently searched, used as context for new work). Rename these as priority.
4. **Set a recovery cadence**: weekly 10-minute audits for one month, then back to monthly.
