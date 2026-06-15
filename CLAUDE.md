# CLAUDE.md

Guidance for Claude Code when working in the **name-chat** repo
(GitHub: `hum-ae-n/name-chat`).

## What this is

A single Chrome **Manifest V3** extension — the **Kaipability Chat Namer** —
that adds one-click conversation renaming to `claude.ai`. It does *not* call any
API or model itself. Instead it drives Claude's own chat-naming skill through the
UI: it types "rename this chat", sends it, then watches the DOM for Claude's
reply and extracts the proposed name.

Everything runs in the browser. No background worker, no network requests, no
API keys, no data leaves the page.

## Repo layout

```
name-chat/
├── claude-toolkit/         # the actual extension (load this folder unpacked)
│   ├── manifest.json       # MV3, permissions: activeTab + clipboardWrite, matches claude.ai/*
│   ├── content.js          # all logic — one IIFE, ~540 lines, no build step
│   ├── content.css         # button, loading spinner, toast styles
│   ├── icons/              # 16 / 48 / 128 px PNGs
│   ├── README.md           # user-facing install + flow doc
│   └── SKILL-UPDATE.md     # the skill ⇄ extension contract (see below)
└── kaipability-chat-namer-v2.zip   # distributable; claude-toolkit/ is its contents
```

There is no `package.json`, bundler, linter, or test suite. `content.js` is
loaded directly by Chrome as a content script.

## How it works (the loop)

1. **Inject button** — `injectButtons()` places a red tag button next to the
   message action buttons (Copy/Retry), with fallbacks to a button group or a
   floating FAB. A `MutationObserver` + SPA URL poller re-injects on navigation.
2. **Trigger** — click (or `Ctrl/Cmd+Shift+K`) runs `handleNamerClick`:
   - `findEditor()` locates the ProseMirror composer.
   - Guards against overwriting unsent text.
   - `injectText()` writes "rename this chat" using 4 fallback strategies
     (`execCommand` → paste event → direct DOM → textarea value setter).
   - `findAndClickSend()` clicks send (aria-label → svg heuristic → Enter key).
3. **Watch** — `startResponseWatcher()` snapshots the count of `main code`
   elements, then observes `main` with a **2s debounce**. When mutations settle
   (or after a **45s timeout**), it scans only the *new* `<code>` elements.
4. **Extract** — `findNameInNewResponse()` tests each new `<code>` against
   `NAME_PATTERN`. First match wins.
5. **Apply** — `tryAutoApplyTitle()` attempts to rename in-place (sidebar rename
   button → inline double-click → header title). On failure it falls back to
   `navigator.clipboard.writeText()` and a toast telling the user to paste.

## The skill ⇄ extension contract (load-bearing)

The extension only works if Claude's naming skill emits the proposed name as a
**backtick code span** (renders as `<code>`) matching:

```js
const VALID_PREFIXES = ['EXN','CLIENT','ART','LI','TOOL','CAR','COMS','KAI','READ','LIFE'];
const NAME_PATTERN = /^(EXN|CLIENT|ART|LI|TOOL|CAR|COMS|KAI|READ|LIFE) \| .+ \| \d{4}-\d{2}-\d{2}/;
```

Naming convention: `PREFIX | Topic | YYYY-MM-DD [flags]`.

If you change `VALID_PREFIXES`, the date format, or the separator in either the
skill or the extension, **change both**. `SKILL-UPDATE.md` documents the exact
skill edits this depends on. Plain-text names (not in backticks) are invisible to
the watcher.

## Working on this code

- **Edit `claude-toolkit/content.js` directly**; reload the extension at
  `chrome://extensions/` and refresh a `claude.ai` chat to test. There is no
  build.
- **Selectors are brittle by nature** — they target `claude.ai`'s live DOM
  (Tailwind classes, aria-labels, ProseMirror). Expect them to break when the
  site changes; that's the main maintenance burden. Keep the multi-strategy
  fallback pattern when touching `injectText`, `findAndClickSend`,
  `injectButtons`, or `tryAutoApplyTitle` — never collapse to a single selector.
- **Re-zip for distribution** after changes:
  ```bash
  cd "claude-toolkit" && zip -r ../kaipability-chat-namer-v2.zip . -x '*.DS_Store'
  ```
- Keep the **privacy invariant**: no network calls, no new host permissions, no
  background service worker. Permissions stay minimal (`activeTab`,
  `clipboardWrite`).
- Bump `version` in `manifest.json` and the README version history together.

## Known gotchas / cleanup candidates

- **Version drift**: README "Version history" lists v2.1.0, manifest says
  `2.0.0`. README also calls `content.js` "~280 lines" — it's ~540. Reconcile
  when editing.
- **Dead/weak selectors**: `tryAutoApplyTitle` Strategy 1 uses
  `nav a[href*="/chat/"].bg-` — `.bg-` is a literal class selector that almost
  never matches claude.ai's actual `bg-*` classes, so auto-apply usually falls
  through to the clipboard path. Verify against the live DOM before relying on it.
- The `content_security_policy.extension_pages` entry is harmless but unused —
  there are no extension pages (popup/options).
- `WATCH_TIMEOUT_MS` (45s) and `DEBOUNCE_MS` (2s) are the tuning knobs if Claude's
  responses get slower or the watcher fires early.

## Conventions

- Vanilla JS, single IIFE, `'use strict'`, guarded by `window.__kaiNamerLoaded`.
- No external dependencies. Keep it that way unless there's a strong reason.
- User-facing feedback is always a `showToast(message, type)` call
  (`error`/`warning`/`success`/`info`) — don't `alert()` or `console.log` for UX.

## Note

The GitHub remote currently contains only a `deleteme` file with a personal
message; the extension source lives in the zip / `claude-toolkit/`. The two are
not yet synced — pushing the toolkit to the remote is a separate, user-approved
step.
