# Chat Naming Skill — Update for Extension Integration

## Summary

The Kaipability Chat Namer Chrome extension triggers the naming skill by sending
"rename this chat" into the conversation. After Claude responds, the extension
watches the DOM for a `<code>` element matching the PREFIX | pattern and auto-copies
it to the clipboard.

For this to work, the skill must output the proposed name in backtick code spans
(which render as `<code>` in the DOM). This is the contract between the skill and
the extension.


## Change 1: Add section after "Proactive use" (before "Audit cadence")

Insert this new section:

---

## Extension integration

The **Kaipability Chat Namer** Chrome extension triggers the naming skill by
injecting "rename this chat" into the chat input and sending it automatically.
After Claude responds, the extension watches for a `<code>` element in the DOM
whose text matches `^(EXN|CLIENT|ART|LI|TOOL|CAR|COMS|KAI|READ|LIFE) \|` and
auto-copies it to the clipboard.

This means the output format in Step 5 is load-bearing. The proposed name MUST
be wrapped in backticks so it renders as a `<code>` element. If the name appears
as plain text, the extension cannot find it.

When the skill is triggered:

1. Do not add preamble ("I'll classify this chat...", "Let me rename...").
2. Output the proposed name in a backtick code span on its own line.
3. Follow with `(was: previous title)` on the next line.
4. Optionally add one short line if the classification was ambiguous and you
   want to flag the tiebreaker logic. Otherwise stop.

The response should be 2-3 lines, not a paragraph.

---


## Change 2: Replace Step 5 output format

Replace the current Step 5 content (lines 238-264 approximately) with:

---

### Step 5: Format and present

**Always wrap the proposed name in backticks.** This is required for the
Kaipability Chat Namer extension to detect and auto-copy the name.

For a single rename, present like this:

`TOOL | Chrome extension chat namer | 2026-06-15 [DOC]`
(was: can we make the icon)

The backticks render as a `<code>` element in the DOM. The extension watches for
this element and copies its text content to the clipboard automatically.

**Always show the previous title alongside the proposed rename.** The old title
is the audit trail — Rocky needs to recognise that the rename refers to the chat
he is thinking of.

If the prior title is genuinely unknown or unrecoverable, say so explicitly:
`(was: <auto-stub, unrecoverable>)`.

For batch renames, use a two-column table with the current title in column 1
and the proposed rename (in backticks) in column 2:

| Current title | Proposed rename |
|---|---|
| Edwards as Ebara competitor | `EXN \| Edwards-Ebara CMP screener | 2026-05-18` |
| View options | `ART \| Substack - Patents come fifth | 2026-05-18 [DOC]` |

For batch renames, run `scripts/format_name.py` to validate format consistency
across the list.

---


## Change 3: Update proactive use wording

Replace the example in "Proactive use" to use backticks:

> Suggest renaming this chat to `KAI | Founding Principles v3 | 2026-05-19 [DOC]`. Use this or want to adjust?

---

## Regex the extension uses

```javascript
const VALID_PREFIXES = ['EXN','CLIENT','ART','LI','TOOL','CAR','COMS','KAI','READ','LIFE'];
const NAME_PATTERN = new RegExp(
  '^(' + VALID_PREFIXES.join('|') + ') \\| .+ \\| \\d{4}-\\d{2}-\\d{2}'
);
```

The extension:
1. Counts existing `<code>` elements before sending the prompt
2. After streaming finishes (2s debounce on DOM mutations), scans only NEW `<code>` elements
3. Tests each against NAME_PATTERN
4. First match → clipboard → toast "Copied: PREFIX | Topic | YYYY-MM-DD"
