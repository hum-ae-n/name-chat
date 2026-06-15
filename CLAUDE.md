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
3. **Watch** — `startResponseWatcher()` snapshots the count of response `<code>`
   elements, then observes `main`. It finishes as soon as **both** a valid name
   has appeared **and** the stream has settled — settled means the Stop button is
   gone (`isStreaming()`), or `QUIET_MS` of no mutations as a fallback. Hard
   give-up at `WATCH_TIMEOUT_MS` (45s).
4. **Extract** — `findNameInNewResponse()` tests each new `<code>` against
   `NAME_PATTERN`. First match wins.
5. **Apply** — clipboard is the **guaranteed primary path**:
   `navigator.clipboard.writeText()` + a toast telling the user to paste.
   `tryAutoApplyTitle()` (in-place sidebar rename) is an **opt-in, non-blocking
   bonus**, gated behind the `AUTO_APPLY` flag (default `false`).

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
- **All claude.ai selectors live in the `SELECTORS` block** at the top of
  `content.js`. When the site redesigns and the extension breaks, that block is
  the only thing you need to edit — the health-check toast will tell the user
  which selector failed. Keep the ordered-fallback (`pick()`) pattern; never
  collapse a selector list to a single brittle entry.
- **Re-zip for distribution** after changes:
  ```bash
  cd "claude-toolkit" && zip -r ../kaipability-chat-namer-v2.zip . -x '*.DS_Store'
  ```
- Keep the **privacy invariant**: no network calls, no new host permissions, no
  background service worker. Permissions stay minimal (`activeTab`,
  `clipboardWrite`).
- Bump `version` in `manifest.json` and the README version history together.

## Known gotchas / cleanup candidates

- **Auto-apply is intentionally off** (`AUTO_APPLY = false`). `tryAutoApplyTitle`
  is kept as a best-effort bonus but its sidebar selectors (e.g. the literal
  `nav a[href*="/chat/"].bg-`) rarely match claude.ai's real `bg-*` classes, so
  in-place rename is unreliable. The product UX is clipboard-paste by design —
  don't sink time into chasing reliable auto-rename.
- The `content_security_policy.extension_pages` entry is harmless but unused —
  there are no extension pages (popup/options).
- **Tuning knobs**: `WATCH_TIMEOUT_MS` (45s hard give-up), `QUIET_MS` (1.5s
  settle fallback when the Stop button can't be found), `SETTLE_POLL_MS` (400ms
  re-evaluate cadence).
- **Manual test only** — no automated harness. After editing, reload at
  `chrome://extensions/`, refresh a `claude.ai` chat, and run one rename.

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
