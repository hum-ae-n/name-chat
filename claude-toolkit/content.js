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
  const WATCH_TIMEOUT_MS = 45000;
  const DEBOUNCE_MS = 2000;
  const VALID_PREFIXES = ['EXN','CLIENT','ART','LI','TOOL','CAR','COMS','KAI','READ','LIFE'];
  const NAME_PATTERN = new RegExp(
    '^(' + VALID_PREFIXES.join('|') + ') \\| .+ \\| \\d{4}-\\d{2}-\\d{2}'
  );

  const TAG_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C0392B" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><circle cx="7" cy="7" r="1.2" fill="#C0392B" stroke="none"/></svg>`;

  // ── Find the chat input ───────────────────────────────────────────────

  function findEditor() {
    return document.querySelector('.ProseMirror[contenteditable="true"]')
        || document.querySelector('main [contenteditable="true"]')
        || document.querySelector('main textarea, footer textarea');
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
    for (const label of ['Send message', 'Send', 'Submit']) {
      const btn = document.querySelector(`button[aria-label="${label}"]`);
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
  // After sending the prompt, watches the DOM for Claude's response.
  // When streaming finishes (no mutations for DEBOUNCE_MS), looks for a
  // <code> element matching PREFIX | Topic | YYYY-MM-DD.
  // Tries to auto-apply the title, falls back to clipboard.

  function startResponseWatcher(btn) {
    const codeCountBefore = document.querySelectorAll('main code').length;
    let watchTimeout = null;
    let debounceTimeout = null;
    let found = false;

    showToast('Waiting for Claude...', 'info');

    const watcher = new MutationObserver(() => {
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(async () => {
        const name = findNameInNewResponse(codeCountBefore);
        if (name) {
          found = true;
          cleanup();

          // Try auto-apply first
          let applied = false;
          try {
            applied = await tryAutoApplyTitle(name);
          } catch (_) {}

          if (applied) {
            showToast('Renamed: ' + name, 'success');
          } else {
            // Fall back to clipboard
            try {
              await navigator.clipboard.writeText(name);
              showToast('Copied: ' + name + ' — paste as chat title', 'success');
            } catch (_) {
              showToast('Name: ' + name + ' — copy it manually', 'warning');
            }
          }
        }
      }, DEBOUNCE_MS);
    });

    const main = document.querySelector('main') || document.querySelector('[role="main"]');
    if (main) {
      watcher.observe(main, { childList: true, subtree: true, characterData: true });
    }

    // Timeout: give up after WATCH_TIMEOUT_MS
    watchTimeout = setTimeout(async () => {
      if (!found) {
        const name = findNameInNewResponse(codeCountBefore);
        if (name) {
          let applied = false;
          try { applied = await tryAutoApplyTitle(name); } catch (_) {}
          if (applied) {
            showToast('Renamed: ' + name, 'success');
          } else {
            try {
              await navigator.clipboard.writeText(name);
              showToast('Copied: ' + name + ' — paste as chat title', 'success');
            } catch (_) {
              showToast('Name: ' + name, 'warning');
            }
          }
        } else {
          showToast('Response received. Copy the name manually.', 'warning');
        }
      }
      cleanup();
    }, WATCH_TIMEOUT_MS);

    function cleanup() {
      watcher.disconnect();
      clearTimeout(watchTimeout);
      clearTimeout(debounceTimeout);
      if (btn) {
        btn.classList.remove('kai-namer-loading');
        btn.disabled = false;
      }
    }
  }

  function findNameInNewResponse(codeCountBefore) {
    const allCode = document.querySelectorAll('main code');
    // Only check code elements that appeared AFTER we sent the prompt
    for (let i = allCode.length - 1; i >= codeCountBefore; i--) {
      const text = allCode[i]?.textContent?.trim();
      if (text && NAME_PATTERN.test(text)) {
        return text;
      }
    }
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
        showToast('Could not find chat input. Try Ctrl+Shift+K.', 'error');
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

    const selectors = [
      'button[aria-label="Copy"]',
      'button[aria-label="Retry"]',
      '[data-testid*="copy"]',
      '[data-testid*="action"]'
    ];

    let actionButton = null;
    for (const sel of selectors) {
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

    const btnGroups = document.querySelectorAll(
      'main .flex.items-center.gap-1, main .flex.items-center.gap-2, main [class*="actions"]'
    );
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
