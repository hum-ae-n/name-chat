# Kaipability Chat Namer

One-click chat rename for claude.ai. No API key. No data leaves the browser.

## What it does

Click the red tag icon. The extension types "rename this chat" and sends it.
Claude's naming skill classifies the conversation and responds with the
formatted name in a code span. The extension detects it, copies it to your
clipboard, and shows a toast. You paste it as the chat title.

**One click → wait → copied.**

```
PREFIX | Topic | YYYY-MM-DD [flags]
```

## The full loop

1. You click the tag icon (or Ctrl+Shift+K)
2. Extension injects "rename this chat" into the input and sends
3. Claude's naming skill triggers, reads the conversation, classifies it
4. Claude responds: `` `TOOL | Chrome extension chat namer | 2026-06-15 [DOC]` ``
5. Extension watches the DOM, finds the `<code>` element matching the pattern
6. Auto-copies the name to clipboard
7. Toast: "Copied: TOOL | Chrome extension chat namer | 2026-06-15 [DOC]"
8. You click the chat title in the sidebar and paste

## Security

- No API keys stored or needed
- No conversation data leaves the browser
- No background service worker
- No external network requests
- Content script only runs on claude.ai
- Extension source is fully readable (~280 lines of JS)

## Install

1. Unzip this folder
2. Chrome → `chrome://extensions/` → enable Developer mode
3. Click Load unpacked → select the `claude-toolkit` folder
4. Open any chat on claude.ai

## Skill dependency

This extension depends on Claude's naming skill outputting the proposed name
in backtick code spans. See `SKILL-UPDATE.md` for the exact changes needed
to the chat-naming skill.

## Files

```
claude-toolkit/
├── manifest.json       # MV3, minimal permissions
├── content.js          # Button, prompt injection, response watcher
├── content.css         # Button and toast styles
├── SKILL-UPDATE.md     # Skill changes needed for the contract
└── icons/              # Extension icons
```

## Version history

- **v2.1.0** — Added response watcher. Auto-copies name from Claude's response.
- v2.0.0 — Rebuilt. No API calls. Triggers Claude's naming skill directly.
- v1.0.0 — API-based classification (retired for security reasons).
