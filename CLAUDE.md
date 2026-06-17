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

## Operating mode

`MODE` (top of `content.js`) is **`'manual'` by default** — and that's the
product. Manual mode depends only on the editor + send selectors, which have
been stable throughout; the auto path repeatedly broke against claude.ai's
response DOM (timing, nbsp in code spans, etc.), so it's opt-in only. Don't
re-enable `'auto'` as the default without a strong reason.

## How it works (the loop)

1. **Inject button** — `injectButtons()` places a red tag button next to the
   message action buttons (Copy/Retry), via `findActionAnchor()` (scoped to
   `main`, never the header/Share bar), with a button-group fallback. It
   **self-gates to chat pages** (`onChatPage()`) and has **no floating fallback**
   — the tag lives only in the message action row. A `MutationObserver` + SPA URL
   poller re-injects on navigation.
2. **Trigger** — click (or `Ctrl/Cmd+Shift+K`) runs `handleNamerClick`:
   - `findEditor()` locates the ProseMirror composer.
   - Guards against overwriting unsent text.
   - `injectText()` writes "rename this chat" using 4 fallback strategies
     (`execCommand` → paste event → direct DOM → textarea value setter).
   - `findAndClickSend()` clicks send (aria-label → svg heuristic → Enter key).
3. **Manual mode** — that's it: a toast tells the user to copy the name from
   Claude's reply. Done.

**Auto mode only (opt-in):** after sending, `startResponseWatcher()` observes
`main`, finishes when a name has appeared and the stream settled
(`isStreaming()` / `QUIET_MS`, hard give-up at `WATCH_TIMEOUT_MS`),
`findNameInNewResponse()` extracts it (whitespace-normalized via `norm()` to
beat non-breaking spaces; layers: `<pre>` → code/strong/b → plain text), and
`copyToClipboard()` copies it. `tryAutoApplyTitle()` (in-place rename) stays
behind `AUTO_APPLY` (default `false`).

## The skill ⇄ extension contract (load-bearing)

The extension detects the proposed name by pattern, **not** by exact formatting.
The skill *should* emit it as a backtick code span, but the matcher is
deliberately tolerant because LLM output drifts:

```js
const VALID_PREFIXES = ['EXN','CLIENT','ART','LI','TOOL','CAR','COMS','KAI','READ','LIFE'];
// Not anchored to start-of-string — finds the name anywhere, extracts just it.
const NAME_PATTERN = /\b(EXN|CLIENT|ART|LI|TOOL|CAR|COMS|KAI|READ|LIFE) \| .+? \| \d{4}-\d{2}-\d{2}(?:\s*\[[^\]]+\])?/;
```

Naming convention: `PREFIX | Topic | YYYY-MM-DD [flags]`. **In manual mode (the
default) none of this matters — the extension never reads the reply.** The
detection below applies only to opt-in `'auto'` mode. The skill emits the name in
an **inline backtick code span** (its dominant style) — don't try to force a
fenced block; the skill is full of inline examples and the model reverts to
inline anyway. Detection is deliberately format-agnostic. Layers
(`findNameInNewResponse`), in order:
0. `<pre>` code blocks (`SELECTORS.codeBlocks`) matched by pattern — catches a
   fenced block if one ever appears. Harmless bonus.
1. New `code` / `strong` / `b` elements (`SELECTORS.nameContainers`) — the
   primary working path. Handles inline backticks, bold, and leading `Proposed:`
   labels; extracts just the name so other code spans (e.g. `[DOC]`) are skipped.
2. Plain-text fallback: scan the whole reply's `innerText`, take the last match.

So a name in inline backticks, a fenced block, bolded, or bare all work — the
skill just needs to make the name the only `PREFIX | … | date` code span. **If you change
`VALID_PREFIXES`, the date format, or the separator, change it in both the skill
and `NAME_RE_SRC`.** `SKILL-UPDATE.md` documents the skill-side contract; the
canonical skill lives in `../Skill/` (re-upload to claude.ai after editing).

## Working on this code

- **Edit `claude-toolkit/content.js` directly**; reload the extension at
  `chrome://extensions/` and refresh a `claude.ai` chat to test. There is no
  build.
- **All claude.ai selectors live in the `SELECTORS` block** at the top of
  `content.js`. When the site redesigns and the extension breaks, that block is
  the only thing you need to edit — the health-check toast will tell the user
  which selector failed. Keep the ordered-fallback (`pick()`) pattern; never
  collapse a selector list to a single brittle entry.
- **Re-zip for distribution** after changes. `zip` isn't on the Windows dev box;
  use PowerShell with forward-slash entries (claude.ai's skill uploader and
  Chrome both want `/`, not the `\` that `Compress-Archive` writes):
  ```powershell
  # see the New-Zip helper pattern used in this repo's history:
  # open the zip in Create mode and CreateEntry($top + '/' + $rel.Replace('\','/'))
  ```
  The same helper repackages both `kaipability-chat-namer-v2.zip` (top folder
  `claude-toolkit/`) and `Skill/chat-naming.zip` (top folder `chat-naming/`).
- Keep the **privacy invariant**: no network calls, no new host permissions, no
  background service worker. Permissions stay minimal (`activeTab`,
  `clipboardWrite`).
- Bump `version` in `manifest.json` and the README version history together.

## Known gotchas / cleanup candidates

- **Manual mode is the product** (`MODE = 'manual'`). The whole auto path
  (`startResponseWatcher`, `findNameInNewResponse`, `copyToClipboard`,
  `tryAutoApplyTitle`, `isStreaming`, `norm`) only runs under `MODE = 'auto'` and
  is dormant by default. It repeatedly broke against claude.ai's response DOM
  (timing, nbsp in code spans, label location); the inject+send core never did.
  Don't make `'auto'` the default again without a strong reason.
- **Auto-apply** (`AUTO_APPLY = false`) is doubly off — only reachable in auto
  mode, and its sidebar selectors rarely match. Don't chase reliable auto-rename.
- The `content_security_policy.extension_pages` entry is harmless but unused —
  there are no extension pages (popup/options).
- **Auto-mode tuning knobs**: `WATCH_TIMEOUT_MS` (45s hard give-up), `QUIET_MS`
  (1.5s settle fallback), `SETTLE_POLL_MS` (400ms re-evaluate cadence).
- **Manual test only** — no automated harness. After editing, reload at
  `chrome://extensions/`, refresh a `claude.ai` chat, and run one rename.

## Conventions

- Vanilla JS, single IIFE, `'use strict'`, guarded by `window.__kaiNamerLoaded`.
- No external dependencies. Keep it that way unless there's a strong reason.
- User-facing feedback is always a `showToast(message, type)` call
  (`error`/`warning`/`success`/`info`) — don't `alert()` or `console.log` for UX.

## Repo state

The extension (`claude-toolkit/`) and the canonical skill (`Skill/chat-naming/`)
are both committed and pushed to `hum-ae-n/name-chat` (branch `main`). The two
distributable zips (`kaipability-chat-namer-v2.zip`, `Skill/chat-naming.zip`) are
tracked alongside their sources — rebuild them with the PowerShell helper above
whenever the sources change, and keep `manifest.json` version + README history in
step.
