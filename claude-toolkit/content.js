// Kaipability Chat Namer v2 — Content Script
// One click: trigger → watch → extract → copy.
// No API key. No data leaves the browser.

(function () {
  'use strict';

  if (window.__kaiNamerLoaded) return;
  window.__kaiNamerLoaded = true;

  // ── Config ────────────────────────────────────────────────────────────

  const BUTTON_ID_ATTR = 'data-kai-namer';
  const PROMPT_TEXT = 'rename this chat';
  const WATCH_TIMEOUT_MS = 45000;   // hard give-up after sending the prompt
  const QUIET_MS = 1500;            // fallback "stream settled" window if Stop button isn't detected
  const SETTLE_POLL_MS = 400;       // how often the watcher re-evaluates after a mutation
  const AUTO_APPLY = false;         // best-effort in-place rename; off by default — clipboard is the primary path
  const VALID_PREFIXES = ['EXN','CLIENT','ART','LI','TOOL','CAR','COMS','KAI','READ','LIFE'];
  // Match the proposed name ANYWHERE in a code element's text — tolerant of a
  // leading label ("Proposed: …"), surrounding prose, and multi-line code
  // blocks (the name and a "(was: …)" line living in one <code>). Captures
  // PREFIX | Topic | YYYY-MM-DD with optional trailing [FLAGS]. Not anchored to
  // start-of-string: the skill's exact formatting varies, so we don't depend on
  // it. `.` doesn't cross newlines, so the match stays on the name's own line.
  const NAME_RE_SRC =
    '\\b(' + VALID_PREFIXES.join('|') + ') \\| .+? \\| \\d{4}-\\d{2}-\\d{2}(?:\\s*\\[[^\\]]+\\])?';
  const NAME_PATTERN = new RegExp(NAME_RE_SRC);
  const NAME_PATTERN_G = new RegExp(NAME_RE_SRC, 'g'); // for whole-conversation text fallback

  // ── Selectors ─────────────────────────────────────────────────────────
  // EVERY claude.ai DOM dependency lives here. When the site redesigns and the
  // extension stops working, this is the only block you need to touch. Each
  // entry is an ordered list of fallbacks, tried first to last.

  const SELECTORS = {
    editor: [
      '.ProseMirror[contenteditable="true"]',
      'main [contenteditable="true"]',
      'main textarea',
      'footer textarea',
    ],
    sendButton: [
      'button[aria-label="Send message"]',
      'button[aria-label="Send"]',
      'button[aria-label="Submit"]',
    ],
    // Present only while Claude is generating. Its disappearance = stream done.
    stopButton: [
      'button[aria-label="Stop response"]',
      'button[aria-label="Stop generating"]',
      'button[aria-label="Stop"]',
      'button[data-testid="stop-button"]',
    ],
    // Where the proposed name might render. The skill SHOULD use a backtick
    // code span, but it drifts to bold; scan all three so formatting variance
    // doesn't break detection. A plain-text fallback in findNameInNewResponse()
    // catches the case where it's not wrapped at all.
    nameContainers: 'main code, main strong, main b',
    // Anchors for injecting the namer button, best to worst.
    actionAnchor: [
      'button[aria-label="Copy"]',
      'button[aria-label="Retry"]',
      '[data-testid*="copy"]',
      '[data-testid*="action"]',
    ],
    actionGroup: 'main .flex.items-center.gap-1, main .flex.items-center.gap-2, main [class*="actions"]',
    mainArea: 'main, [role="main"]',
  };

  function pick(list) {
    const arr = Array.isArray(list) ? list : [list];
    for (const sel of arr) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  const TAG_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C0392B" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><circle cx="7" cy="7" r="1.2" fill="#C0392B" stroke="none"/></svg>`;

  // ── Find the chat input ───────────────────────────────────────────────

  function findEditor() {
    return pick(SELECTORS.editor);
  }

  // ── Streaming state ───────────────────────────────────────────────────
  // Claude shows a Stop button while generating; it reverts to Send when done.
  // This is a far more reliable "response finished" signal than guessing from
  // mutation quietness alone.

  function isStreaming() {
    const stop = pick(SELECTORS.stopButton);
    return !!(stop && !stop.disabled);
  }

  // ── Inject text into ProseMirror ──────────────────────────────────────

  function injectText(editor, text) {
    editor.focus();

    // Strategy 1: execCommand
    if (editor.getAttribute('contenteditable') === 'true') {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(editor);
      selection.removeAllRanges();
      selection.addRange(range);
      const ok = document.execCommand('insertText', false, text);
      if (ok && editor.textContent.includes(text)) return true;
    }

    // Strategy 2: Clipboard paste simulation
    try {
      editor.focus();
      const dt = new DataTransfer();
      dt.setData('text/plain', text);
      editor.dispatchEvent(new ClipboardEvent('paste', {
        clipboardData: dt, bubbles: true, cancelable: true
      }));
      if (editor.textContent.includes(text)) return true;
    } catch (_) {}

    // Strategy 3: Direct DOM + input event
    if (editor.getAttribute('contenteditable') === 'true') {
      let p = editor.querySelector('p');
      if (!p) { p = document.createElement('p'); editor.appendChild(p); }
      p.textContent = text;
      editor.dispatchEvent(new InputEvent('input', {
        bubbles: true, cancelable: true, inputType: 'insertText', data: text
      }));
      return true;
    }

    // Strategy 4: textarea
    if (editor.tagName === 'TEXTAREA' || editor.tagName === 'INPUT') {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype, 'value'
      )?.set || Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, 'value'
      )?.set;
      if (setter) {
        setter.call(editor, text);
        editor.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }
    }

    return false;
  }

  // ── Find and click send ───────────────────────────────────────────────

  function findAndClickSend() {
    for (const sel of SELECTORS.sendButton) {
      const btn = document.querySelector(sel);
      if (btn && !btn.disabled) { btn.click(); return true; }
    }

    const buttons = document.querySelectorAll(
      'main button, footer button, [class*="composer"] button'
    );
    for (const btn of buttons) {
      if (btn.disabled) continue;
      if (btn.querySelector('svg')) {
        const html = btn.innerHTML.toLowerCase();
        if (html.includes('m12') || html.includes('send') || html.includes('arrow')) {
          btn.click(); return true;
        }
      }
    }

    const editor = findEditor();
    if (editor) {
      editor.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter', code: 'Enter', keyCode: 13, which: 13,
        bubbles: true, cancelable: true
      }));
      return true;
    }

    return false;
  }

  // ── Auto-apply title ───────────────────────────────────────────────
  // Tries to rename the chat directly via DOM manipulation.
  // Returns true if it worked, false if we need clipboard fallback.

  async function tryAutoApplyTitle(name) {
    // Strategy 1: Find the active chat in the sidebar, trigger rename
    const sidebarSelectors = [
      'nav a[href*="/chat/"].bg-',            // Active chat often has bg- class
      'nav a[aria-current="page"]',
      'nav [class*="active"]',
      'nav [class*="selected"]',
      'nav a[class*="bg-"]'
    ];

    let activeEntry = null;
    for (const sel of sidebarSelectors) {
      activeEntry = document.querySelector(sel);
      if (activeEntry) break;
    }

    if (activeEntry) {
      // Look for a rename/edit button (often hidden until hover)
      // First, simulate hover to reveal action buttons
      activeEntry.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      await delay(200);

      // Look for edit/rename button within or near the active entry
      const editBtnSelectors = [
        'button[aria-label="Rename"]',
        'button[aria-label="Edit"]',
        'button[aria-label="Rename conversation"]',
        'button[data-testid*="rename"]',
        'button[data-testid*="edit"]',
      ];

      let editBtn = null;
      for (const sel of editBtnSelectors) {
        editBtn = activeEntry.querySelector(sel)
               || activeEntry.parentElement?.querySelector(sel);
        if (editBtn) break;
      }

      if (editBtn) {
        editBtn.click();
        await delay(300);

        // Now look for the input that appeared
        const input = activeEntry.querySelector('input[type="text"]')
                   || activeEntry.querySelector('input')
                   || activeEntry.querySelector('[contenteditable="true"]')
                   || activeEntry.parentElement?.querySelector('input');

        if (input) {
          return setInputValue(input, name);
        }
      }

      // Strategy 2: Try double-clicking the title text to edit inline
      const titleText = activeEntry.querySelector('span')
                     || activeEntry.querySelector('p')
                     || activeEntry.querySelector('div');
      if (titleText) {
        titleText.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
        await delay(300);

        // Check if an input appeared
        const input = activeEntry.querySelector('input')
                   || activeEntry.querySelector('[contenteditable="true"]');
        if (input) {
          return setInputValue(input, name);
        }
      }

      // Clean up hover
      activeEntry.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    }

    // Strategy 3: Look for a title/header element at the top of the chat
    const headerSelectors = [
      'header [contenteditable="true"]',
      'header input[type="text"]',
      'button[class*="chat-title"]',
      'h1[contenteditable]',
      '[data-testid*="chat-title"]'
    ];

    for (const sel of headerSelectors) {
      const el = document.querySelector(sel);
      if (el) {
        el.click();
        await delay(300);
        const input = document.querySelector('input:focus, [contenteditable="true"]:focus');
        if (input) {
          return setInputValue(input, name);
        }
      }
    }

    return false;
  }

  async function setInputValue(input, name) {
    input.focus();
    await delay(50);

    if (input.tagName === 'INPUT' || input.tagName === 'TEXTAREA') {
      // React-safe value setter
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, 'value'
      )?.set;
      if (setter) setter.call(input, name);
      else input.value = name;

      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      // Contenteditable
      input.textContent = name;
      input.dispatchEvent(new InputEvent('input', {
        bubbles: true, inputType: 'insertText', data: name
      }));
    }

    await delay(100);

    // Confirm with Enter + blur
    input.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true
    }));
    input.blur();
    await delay(200);

    return true;
  }

  // ── Response watcher ──────────────────────────────────────────────────
  // After sending the prompt, watches the conversation for Claude's reply and
  // finishes as soon as BOTH are true:
  //   1. a <code> element matching PREFIX | Topic | YYYY-MM-DD has appeared, and
  //   2. the stream has finished (Stop button gone, or QUIET_MS of no mutations
  //      as a fallback when the Stop button can't be located).
  // The name is always copied to the clipboard (the guaranteed path). Auto-apply
  // is an opt-in, non-blocking bonus.

  function startResponseWatcher(btn) {
    const codeCountBefore = document.querySelectorAll(SELECTORS.nameContainers).length;
    let watchTimeout = null;
    let pollTimeout = null;
    let lastMutation = nowish();
    let done = false;

    showToast('Waiting for Claude…', 'info');

    function evaluate() {
      if (done) return;
      const name = findNameInNewResponse(codeCountBefore);
      if (!name) return;

      // Name is present. Only finish once the stream has actually settled, so we
      // don't grab a half-rendered code span mid-stream.
      const settledByButton = !isStreaming();
      const settledByQuiet = (nowish() - lastMutation) >= QUIET_MS;
      if (settledByButton || settledByQuiet) {
        finish(name);
      }
    }

    const watcher = new MutationObserver(() => {
      lastMutation = nowish();
      clearTimeout(pollTimeout);
      pollTimeout = setTimeout(evaluate, SETTLE_POLL_MS);
    });

    const main = pick(SELECTORS.mainArea);
    if (main) {
      watcher.observe(main, { childList: true, subtree: true, characterData: true });
    }

    // Hard give-up: try one last extraction, then surface a clear message.
    watchTimeout = setTimeout(() => {
      if (done) return;
      const name = findNameInNewResponse(codeCountBefore);
      if (name) finish(name);
      else {
        cleanup();
        showToast('No name found in Claude\'s reply. Check the naming skill output, then copy manually.', 'warning');
      }
    }, WATCH_TIMEOUT_MS);

    async function finish(name) {
      if (done) return;
      done = true;
      cleanup();

      let copied = false;
      try {
        await navigator.clipboard.writeText(name);
        copied = true;
      } catch (_) {}

      // Opt-in best-effort in-place rename; never blocks the clipboard result.
      let applied = false;
      if (AUTO_APPLY) {
        try { applied = await tryAutoApplyTitle(name); } catch (_) {}
      }

      if (applied) {
        showToast('Renamed → ' + name, 'success');
      } else if (copied) {
        showToast('Copied → ' + name + '  ·  click the chat title and paste', 'success');
      } else {
        showToast('Name ready → ' + name + '  ·  copy it manually', 'warning');
      }
    }

    function cleanup() {
      watcher.disconnect();
      clearTimeout(watchTimeout);
      clearTimeout(pollTimeout);
      if (btn) {
        btn.classList.remove('kai-namer-loading');
        btn.disabled = false;
      }
    }
  }

  function findNameInNewResponse(codeCountBefore) {
    // 1) Preferred: a formatted element (code / strong / bold) that appeared
    //    after we sent the prompt and contains a name match. Extract just the
    //    name (match[0]), so leading labels like "Proposed: " don't leak in.
    const candidates = document.querySelectorAll(SELECTORS.nameContainers);
    for (let i = candidates.length - 1; i >= codeCountBefore; i--) {
      const text = candidates[i]?.textContent;
      if (!text) continue;
      const m = text.match(NAME_PATTERN);
      if (m) return m[0].trim();
    }

    // 2) Fallback: the skill emitted the name as plain text (no code/bold wrap).
    //    Scan the conversation's visible text and take the LAST match — the most
    //    recent proposal. Our own prompt ("rename this chat") never matches.
    const area = pick(SELECTORS.mainArea);
    const blob = area && area.innerText ? area.innerText : '';
    const all = blob.match(NAME_PATTERN_G);
    if (all && all.length) return all[all.length - 1].trim();

    return null;
  }

  // ── Main click handler ────────────────────────────────────────────────

  async function handleNamerClick(e) {
    e.preventDefault();
    e.stopPropagation();

    const btn = e.currentTarget;
    btn.classList.add('kai-namer-loading');
    btn.disabled = true;

    try {
      const editor = findEditor();
      if (!editor) {
        // Health-check: a missing composer almost always means claude.ai changed
        // its DOM. Point the fix at SELECTORS rather than failing silently.
        showToast('Chat input not found — claude.ai layout may have changed. Update SELECTORS.editor in content.js.', 'error');
        btn.classList.remove('kai-namer-loading');
        btn.disabled = false;
        return;
      }

      // Don't overwrite unsent text
      const existing = editor.textContent?.trim();
      if (existing && existing.length > 0) {
        showToast('Input has unsent text. Clear it first.', 'error');
        btn.classList.remove('kai-namer-loading');
        btn.disabled = false;
        return;
      }

      // Inject prompt
      const injected = injectText(editor, PROMPT_TEXT);
      if (!injected) {
        await navigator.clipboard.writeText(PROMPT_TEXT);
        showToast('Copied prompt. Paste and send manually.', 'warning');
        btn.classList.remove('kai-namer-loading');
        btn.disabled = false;
        return;
      }

      await delay(150);

      // Send
      const sent = findAndClickSend();
      if (!sent) {
        showToast('Text inserted. Hit Enter to send.', 'warning');
        btn.classList.remove('kai-namer-loading');
        btn.disabled = false;
        return;
      }

      // Start watching for the response — button stays in loading state
      // until we find the name or timeout
      startResponseWatcher(btn);

    } catch (err) {
      showToast('Error: ' + err.message, 'error');
      btn.classList.remove('kai-namer-loading');
      btn.disabled = false;
    }
  }

  // ── Button creation & injection ───────────────────────────────────────

  function createNamerButton() {
    const btn = document.createElement('button');
    btn.setAttribute(BUTTON_ID_ATTR, 'true');
    btn.className = 'kai-namer-btn';
    btn.title = 'Name this chat (Kaipability)';
    btn.innerHTML = TAG_ICON_SVG;
    btn.addEventListener('click', handleNamerClick);
    return btn;
  }

  function injectButtons() {
    if (document.querySelector(`[${BUTTON_ID_ATTR}]`)) return;

    let actionButton = null;
    for (const sel of SELECTORS.actionAnchor) {
      const matches = document.querySelectorAll(sel);
      if (matches.length > 0) {
        actionButton = matches[matches.length - 1];
        break;
      }
    }

    if (actionButton) {
      const parent = actionButton.parentElement;
      if (parent && !parent.querySelector(`[${BUTTON_ID_ATTR}]`)) {
        parent.appendChild(createNamerButton());
        return;
      }
    }

    const btnGroups = document.querySelectorAll(SELECTORS.actionGroup);
    if (btnGroups.length > 0) {
      const last = btnGroups[btnGroups.length - 1];
      if (!last.querySelector(`[${BUTTON_ID_ATTR}]`)) {
        last.appendChild(createNamerButton());
        return;
      }
    }

    // Floating fallback
    if (!document.getElementById('kai-namer-float')) {
      const float = createNamerButton();
      float.id = 'kai-namer-float';
      float.classList.add('kai-namer-float');
      document.body.appendChild(float);
    }
  }

  // ── Toast ─────────────────────────────────────────────────────────────

  function showToast(message, type) {
    const existing = document.getElementById('kai-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'kai-toast';
    toast.className = `kai-toast kai-toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    const duration = type === 'success' ? 5000 : type === 'info' ? 30000 : 4000;
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, duration);
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Monotonic-ish timestamp for settle timing. performance.now() is unaffected
  // by wall-clock changes; falls back to Date.now() if unavailable.
  function nowish() {
    return (typeof performance !== 'undefined' && performance.now)
      ? performance.now()
      : Date.now();
  }

  // ── MutationObserver for button injection ─────────────────────────────

  const observer = new MutationObserver(() => {
    clearTimeout(observer._debounce);
    observer._debounce = setTimeout(() => {
      if (window.location.pathname.match(/\/chat\//)) injectButtons();
    }, 500);
  });

  // ── Keyboard shortcut ────────────────────────────────────────────────

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'K') {
      e.preventDefault();
      const btn = document.querySelector(`[${BUTTON_ID_ATTR}]`);
      if (btn) {
        btn.click();
      } else {
        handleNamerClick({
          preventDefault() {}, stopPropagation() {},
          currentTarget: { classList: { add(){}, remove(){} }, disabled: false }
        });
      }
    }
  });

  // ── Boot ──────────────────────────────────────────────────────────────

  function boot() {
    if (window.location.pathname.match(/\/chat\//)) injectButtons();

    observer.observe(document.body, { childList: true, subtree: true });

    let lastUrl = window.location.href;
    setInterval(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        document.querySelectorAll(`[${BUTTON_ID_ATTR}]`).forEach(el => el.remove());
        setTimeout(injectButtons, 1000);
      }
    }, 500);
  }

  if (document.readyState === 'complete') boot();
  else window.addEventListener('load', boot);

})();
