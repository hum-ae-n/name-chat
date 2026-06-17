# Kaipability Chat Namer

One-click chat rename for claude.ai. No API key. No data leaves the browser.

## What it does

Click the red tag icon in a message's action row. The extension types "rename
this chat" and sends it. Claude's naming skill classifies the conversation and
replies with the formatted name. You select the name and copy it, then paste it
as the chat title.

**One click → Claude proposes the name → you copy it.**

This is **manual mode** (the default): the extension only injects the prompt and
sends it — the robust part that depends solely on the editor and send selectors.
It does not watch the response or auto-copy. An optional `'auto'` mode
(`MODE` in `content.js`) adds response-watching and clipboard copy, but that
depends on claude.ai's response DOM and is off by default.

```
PREFIX | Topic | YYYY-MM-DD [flags]
```

## The full loop (manual mode)

1. You click the tag icon in a message's action row (or Ctrl+Shift+K).
2. Extension injects "rename this chat" into the composer and sends it.
3. Claude's naming skill triggers, reads the conversation, classifies it.
4. Claude replies with the name, e.g. `` `TOOL | Chrome extension chat namer | 2026-06-15 [DOC]` ``.
5. You select the name and copy it (Ctrl/Cmd+C).
6. You click the chat title in the sidebar and paste.

Steps 1–3 are all the extension does in manual mode; 4–6 are you and Claude. The
extension never reads the response, so there's nothing claude.ai can change that
breaks the copy. (In opt-in `'auto'` mode, the extension also watches the reply
and copies the name for you — see `MODE` in `content.js`.)

## Security

- No API keys stored or needed
- No conversation data leaves the browser
- No background service worker
- No external network requests
- Content script only runs on claude.ai
- Extension source is fully readable (~600 lines of JS, single file)

## Install

1. Unzip this folder
2. Chrome → `chrome://extensions/` → enable Developer mode
3. Click Load unpacked → select the `claude-toolkit` folder
4. Open any chat on claude.ai

## Skill dependency

In **manual mode** the extension only triggers Claude's naming skill — it doesn't
parse the reply, so it works with whatever the skill outputs. You just need the
`chat-naming` skill installed on claude.ai so "rename this chat" produces a name.

In **auto mode** the extension reads the name from the reply, so it expects the
name in a backtick code span. See `SKILL-UPDATE.md` for the skill-side contract.

## Files

```
claude-toolkit/
├── manifest.json       # MV3, minimal permissions (activeTab, clipboardWrite)
├── content.js          # Button injection, prompt inject + send; opt-in auto-copy watcher
├── content.css         # Button and toast styles
├── SKILL-UPDATE.md     # Skill changes needed for the contract
└── icons/              # Extension icons (red tag)
```

## Version history

- **v2.5.0** — Manual mode is now the default (`MODE = 'manual'`): one click
  injects "rename this chat" and sends; you copy the name from Claude's reply.
  Drops all dependence on the fragile response-watching/clipboard path (kept as
  opt-in `'auto'`). Removed the floating fallback button entirely and gated
  injection to chat pages, so no stray icon appears on the Chats list or
  elsewhere — the tag lives only in the message action row.
- **v2.4.3** — Fixed the real "No name found" cause: claude.ai renders code
  spans with non-breaking spaces ( ), which defeated the space-based regex
  even though the name looked correct. Names are now whitespace-normalized
  before matching (all three detection layers). Added a console diagnostic that
  dumps the recent code/bold texts when a name can't be matched.
- **v2.4.2** — Fixed the button drifting to the top-right Share bar. Injection
  now anchors to the newest per-message Copy/Retry button *inside the
  conversation*, explicitly skipping the header/Share/sticky top bar, and drops
  the over-broad `[data-testid*="action"]` selector that caused the drift.
- **v2.4.1** — Read the ```chatname block by scanning `<pre>` text with the name
  pattern, instead of a `code[class*="chatname"]` selector. claude.ai shows the
  info string as a header label *outside* the `<code>`, so the class-based
  selector missed it; scanning `<pre>` is robust to that and to token spans. Skill
  output is unchanged — no need to re-upload the skill for this one.
- **v2.4.0** — Deterministic name channel. The skill now emits the name in a
  ```chatname fenced block; the extension reads that block's text verbatim
  (`SELECTORS.nameBlock`) instead of guessing which code span holds the name.
  The previous code/bold/plain-text matching stays as a fallback, so older skill
  output still works. Requires re-uploading the updated skill to claude.ai.
- **v2.3.2** — Fixed the watcher hanging on "Waiting for Claude…". Replaced the
  mutation-triggered settle check with a steady interval poller, so the
  quiet-window fallback fires even after the DOM stops changing (the old timer
  couldn't re-check once mutations ceased). Clipboard copy now falls back to
  `execCommand` and always surfaces the name even if the browser blocks the copy.
- **v2.3.1** — Extension icon redesigned: a red tag on a rounded square,
  matching the in-page button and floating FAB (replaces the placeholder "K").
- **v2.3.0** — Tolerant name extraction. The matcher now finds the name
  *anywhere* in an element (not anchored to the start), so leading labels like
  "Proposed: " no longer break it, and it extracts just the name. Scans
  `code` + `strong` + `b`, with a plain-text fallback over the whole reply, so
  the name is detected whether the skill wraps it in backticks, bolds it, or
  leaves it bare. Multi-line code blocks are handled.
- **v2.2.0** — Hardening pass. All claude.ai selectors centralized into one
  `SELECTORS` block. Stream-completion detected via the Stop→Send button
  transition (finishes the moment a valid name appears, instead of a blind
  timer). Clipboard is now the guaranteed primary path; auto-apply is an
  opt-in, non-blocking bonus (`AUTO_APPLY`, off by default). Health-check
  toast when the DOM changes.
- v2.1.0 — Added response watcher. Auto-copies name from Claude's response.
- v2.0.0 — Rebuilt. No API calls. Triggers Claude's naming skill directly.
- v1.0.0 — API-based classification (retired for security reasons).
