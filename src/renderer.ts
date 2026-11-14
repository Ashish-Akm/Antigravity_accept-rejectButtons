// Antigravity IDE - In-Editor Floating Review Capsule Bar & Diagnostics Bridge
// Docks directly into the active Monaco code editor viewport (above bottom terminal panel)
// 100% Trusted Types safe - pure DOM creation without innerHTML

(function () {
    if ((window as any).__antigravityFloatingBarLoaded) {
        return;
    }
    (window as any).__antigravityFloatingBarLoaded = true;

    console.log('[Antigravity Floating Bar] Initializing floating capsule review bar & agent bridge...');

    const SERVER_URL = 'http://127.0.0.1:48765';
    const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const acceptShortcut = isMac ? '⌘↩' : 'Ctrl+Enter';
    const rejectShortcut = isMac ? '⌘⌫' : 'Ctrl+Backspace';
    const prevHunkShortcut = isMac ? '⌥K' : 'Alt+K';
    const nextHunkShortcut = isMac ? '⌥J' : 'Alt+J';

    // Inject high-visibility capsule styling
    const styleEl = document.createElement('style');
    styleEl.id = 'antigravity-floating-bar-style';
    styleEl.textContent = `
        .antigravity-capsule-root {
            position: absolute !important;
            bottom: 24px !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            z-index: 99999 !important;
            display: flex !important;
            align-items: center !important;
            pointer-events: auto !important;
            user-select: none !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
            font-size: 12px !important;
            line-height: 1.4 !important;
            transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .antigravity-capsule-root.hidden-bar {
            display: none !important;
        }
        .antigravity-capsule-root .bar-mode {
            display: flex !important;
            align-items: center !important;
            box-shadow: 0 4px 18px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.16) !important;
            border: 0.5px solid rgba(255, 255, 255, 0.2) !important;
            color: #d4d4d4 !important;
            background-color: #1e1e1e !important;
            border-radius: 8px !important;
            padding: 3px 6px !important;
            gap: 4px !important;
        }
        .antigravity-capsule-root .resolve-changes {
            display: flex !important;
            align-items: center !important;
            gap: 4px !important;
            padding-right: 6px !important;
            border-right: 1px solid rgba(255, 255, 255, 0.16) !important;
        }
        .antigravity-capsule-root button {
            cursor: pointer !important;
            font-family: inherit !important;
            font-size: 11px !important;
            border: 0 !important;
            border-radius: 4px !important;
            padding: 3px 8px !important;
            outline: none !important;
            display: flex !important;
            align-items: center !important;
            gap: 4px !important;
            white-space: nowrap !important;
            transition: transform 0.08s ease, background-color 0.12s ease !important;
        }
        .antigravity-capsule-root button:active {
            transform: scale(0.96) !important;
        }
        .antigravity-capsule-root button.primary {
            background-color: #0078d4 !important;
            color: #ffffff !important;
            font-weight: 500 !important;
        }
        .antigravity-capsule-root button.primary:hover {
            background-color: #106ebe !important;
        }
        .antigravity-capsule-root button.secondary {
            background-color: transparent !important;
            color: #cccccc !important;
        }
        .antigravity-capsule-root button.secondary:hover {
            background-color: rgba(255, 255, 255, 0.12) !important;
        }
        .antigravity-capsule-root button.agent-send-btn {
            background-color: rgba(56, 189, 248, 0.15) !important;
            color: #38bdf8 !important;
            border: 1px solid rgba(56, 189, 248, 0.35) !important;
            font-weight: 500 !important;
        }
        .antigravity-capsule-root button.agent-send-btn:hover {
            background-color: rgba(56, 189, 248, 0.28) !important;
        }
        .antigravity-capsule-root .shortcut {
            opacity: 0.7 !important;
            font-size: 10px !important;
            margin-left: 2px !important;
        }
        .antigravity-capsule-root .hunk-nav {
            display: flex !important;
            align-items: center !important;
            gap: 2px !important;
            padding: 0 4px !important;
            border-right: 1px solid rgba(255, 255, 255, 0.16) !important;
        }
        .antigravity-capsule-root .file-nav-section {
            display: flex !important;
            align-items: center !important;
            gap: 2px !important;
            padding-left: 4px !important;
            border-right: 1px solid rgba(255, 255, 255, 0.16) !important;
            padding-right: 6px !important;
            user-select: none !important;
        }
        .antigravity-capsule-root .file-nav-section.hidden {
            display: none !important;
        }
        .antigravity-capsule-root .file-nav-section button {
            min-width: 22px !important;
            height: 22px !important;
            padding: 0 4px !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            font-size: 13px !important;
            font-weight: bold !important;
            line-height: 1 !important;
            border-radius: 4px !important;
            background-color: transparent !important;
            color: #9cdcfe !important;
        }
        .antigravity-capsule-root .file-nav-section button:hover {
            background-color: rgba(255, 255, 255, 0.14) !important;
            color: #ffffff !important;
        }
        .antigravity-capsule-root .file-nav-display-text {
            font-size: 11px !important;
            color: #9cdcfe !important;
            padding: 2px 6px !important;
            white-space: nowrap !important;
            cursor: pointer !important;
            border-radius: 4px !important;
            transition: background-color 0.12s ease, color 0.12s ease !important;
        }
        .antigravity-capsule-root .file-nav-display-text:hover {
            background-color: rgba(255, 255, 255, 0.14) !important;
            color: #ffffff !important;
        }
        .antigravity-capsule-root .agent-bridge-section {
            display: flex !important;
            align-items: center !important;
            gap: 4px !important;
            padding-left: 4px !important;
        }

        /* In-Problems Panel Send to Agent Button Styling */
        .antigravity-panel-send-btn {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            background-color: #0078d4 !important;
            color: #ffffff !important;
            font-family: inherit !important;
            font-size: 11px !important;
            font-weight: 500 !important;
            padding: 2px 10px !important;
            margin: 2px 6px !important;
            border-radius: 4px !important;
            border: 0 !important;
            cursor: pointer !important;
            user-select: none !important;
            outline: none !important;
            white-space: nowrap !important;
            box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4) !important;
            transition: background-color 0.15s ease, transform 0.08s ease !important;
        }
        .antigravity-panel-send-btn:hover {
            background-color: #106ebe !important;
        }
        .antigravity-panel-send-btn:active {
            transform: scale(0.96) !important;
        }
    `;
    if (document.head) {
        document.head.appendChild(styleEl);
    } else {
        document.addEventListener('DOMContentLoaded', () => document.head.appendChild(styleEl));
    }

    // Build the capsule DOM structure (100% Trusted Types safe - ZERO innerHTML)
    const capsuleEl = document.createElement('div');
    capsuleEl.className = 'antigravity-capsule-root';
    capsuleEl.id = 'antigravity-floating-capsule';

    const cascadeBar = document.createElement('div');
    cascadeBar.className = 'cascade-bar';

    const fileWithDiff = document.createElement('div');
    fileWithDiff.className = 'file-with-diff bar-mode';

    // 1. Resolve changes section (Accept / Reject)
    const resolveChanges = document.createElement('div');
    resolveChanges.className = 'resolve-changes';

    const btnAccept = document.createElement('button');
    btnAccept.className = 'keep-changes primary';
    btnAccept.id = 'antigravity-btn-accept';
    btnAccept.title = `Accept Changes (${acceptShortcut})`;

    const acceptText = document.createElement('span');
    acceptText.textContent = 'Accept Changes';
    const acceptShortcutSpan = document.createElement('span');
    acceptShortcutSpan.className = 'shortcut';
    acceptShortcutSpan.textContent = acceptShortcut;

    btnAccept.appendChild(acceptText);
    btnAccept.appendChild(acceptShortcutSpan);

    const btnReject = document.createElement('button');
    btnReject.className = 'discard-changes secondary';
    btnReject.id = 'antigravity-btn-reject';
    btnReject.title = `Reject (${rejectShortcut})`;

    const rejectText = document.createElement('span');
    rejectText.textContent = 'Reject';
    const rejectShortcutSpan = document.createElement('span');
    rejectShortcutSpan.className = 'shortcut';
    rejectShortcutSpan.textContent = rejectShortcut;

    btnReject.appendChild(rejectText);
    btnReject.appendChild(rejectShortcutSpan);

    resolveChanges.appendChild(btnAccept);
    resolveChanges.appendChild(btnReject);
    fileWithDiff.appendChild(resolveChanges);

    // 2. Hunk navigation section (↑ / ↓)
    const hunkNav = document.createElement('div');
    hunkNav.className = 'hunk-nav';
    hunkNav.id = 'antigravity-hunk-nav';

    const btnPrevHunk = document.createElement('button');
    btnPrevHunk.className = 'previous-hunk secondary';
    btnPrevHunk.id = 'antigravity-btn-prev-hunk';
    btnPrevHunk.title = `Previous Change (${prevHunkShortcut})`;
    const prevHunkArrow = document.createElement('span');
    prevHunkArrow.textContent = '↑';
    const prevHunkShortcutSpan = document.createElement('span');
    prevHunkShortcutSpan.className = 'shortcut';
    prevHunkShortcutSpan.textContent = prevHunkShortcut;
    btnPrevHunk.appendChild(prevHunkArrow);
    btnPrevHunk.appendChild(prevHunkShortcutSpan);

    const btnNextHunk = document.createElement('button');
    btnNextHunk.className = 'next-hunk secondary';
    btnNextHunk.id = 'antigravity-btn-next-hunk';
    btnNextHunk.title = `Next Change (${nextHunkShortcut})`;
    const nextHunkArrow = document.createElement('span');
    nextHunkArrow.textContent = '↓';
    const nextHunkShortcutSpan = document.createElement('span');
    nextHunkShortcutSpan.className = 'shortcut';
    nextHunkShortcutSpan.textContent = nextHunkShortcut;
    btnNextHunk.appendChild(nextHunkArrow);
    btnNextHunk.appendChild(nextHunkShortcutSpan);

    hunkNav.appendChild(btnPrevHunk);
    hunkNav.appendChild(btnNextHunk);
    fileWithDiff.appendChild(hunkNav);

    // 3. Multi-file navigation section (< Edited files X/Y >)
    const fileNavSection = document.createElement('div');
    fileNavSection.className = 'file-nav-section';
    fileNavSection.id = 'antigravity-file-nav';

    const btnPrevFile = document.createElement('button');
    btnPrevFile.className = 'prev-file secondary';
    btnPrevFile.id = 'antigravity-btn-prev-file';
    btnPrevFile.title = 'Previous File';
    btnPrevFile.textContent = '<';

    const textFiles = document.createElement('div');
    textFiles.className = 'file-nav-display-text';
    textFiles.id = 'antigravity-files-text';
    textFiles.textContent = 'Edited files 1/1';
    textFiles.title = 'Click to open list of edited files';

    const btnNextFile = document.createElement('button');
    btnNextFile.className = 'next-file secondary';
    btnNextFile.id = 'antigravity-btn-next-file';
    btnNextFile.title = 'Next File';
    btnNextFile.textContent = '>';

    fileNavSection.appendChild(btnPrevFile);
    fileNavSection.appendChild(textFiles);
    fileNavSection.appendChild(btnNextFile);
    fileWithDiff.appendChild(fileNavSection);

    // 4. Send to Agent Bridge Section (@current_problems)
    const agentBridgeSection = document.createElement('div');
    agentBridgeSection.className = 'agent-bridge-section';
    agentBridgeSection.id = 'antigravity-agent-bridge';

    const btnSendToAgent = document.createElement('button');
    btnSendToAgent.className = 'agent-send-btn';
    btnSendToAgent.id = 'antigravity-btn-send-agent';
    btnSendToAgent.title = 'Send current workspace problems & errors directly to Agent Chat (@current_problems)';
    btnSendToAgent.textContent = 'Send to Agent';

    agentBridgeSection.appendChild(btnSendToAgent);
    fileWithDiff.appendChild(agentBridgeSection);

    cascadeBar.appendChild(fileWithDiff);
    capsuleEl.appendChild(cascadeBar);

    // Fast helper to send actions to extension host and editor
    async function sendAction(action: string) {
        try {
            fetch(`${SERVER_URL}/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action })
            }).then(() => {
                setTimeout(syncState, 120);
            }).catch(() => {});
        } catch {}

        if (action === 'accept') {
            clickCodeLens('Accept');
            dispatchEditorKey('accept');
        } else if (action === 'reject') {
            clickCodeLens('Reject');
            dispatchEditorKey('reject');
        } else if (action === 'previousHunk') {
            dispatchEditorKey('previousHunk');
        } else if (action === 'nextHunk') {
            dispatchEditorKey('nextHunk');
        }
    }

    function clickCodeLens(actionType: 'Accept' | 'Reject') {
        const lenses = document.querySelectorAll('.codelens-decoration');
        for (let i = 0; i < lenses.length; i++) {
            const el = lenses[i] as HTMLElement;
            if ((el.textContent || '').includes(actionType)) {
                const link = el.querySelector('a') || el;
                link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
                break;
            }
        }
    }

    function dispatchEditorKey(action: string) {
        const textarea = document.querySelector('textarea.inputarea') as HTMLTextAreaElement | null;
        const target = textarea || document.activeElement || document.body;

        if (action === 'accept') {
            target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, metaKey: isMac, ctrlKey: !isMac, bubbles: true }));
        } else if (action === 'reject') {
            target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', code: 'Backspace', keyCode: 8, metaKey: isMac, ctrlKey: !isMac, bubbles: true }));
        } else if (action === 'previousHunk') {
            target.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', code: 'KeyK', keyCode: 75, altKey: true, bubbles: true }));
        } else if (action === 'nextHunk') {
            target.dispatchEvent(new KeyboardEvent('keydown', { key: 'j', code: 'KeyJ', keyCode: 74, altKey: true, bubbles: true }));
        }
    }

    // Attach click listeners with explicit MouseEvent types
    btnAccept.addEventListener('click', (e: MouseEvent) => { e.preventDefault(); e.stopPropagation(); sendAction('accept'); });
    btnReject.addEventListener('click', (e: MouseEvent) => { e.preventDefault(); e.stopPropagation(); sendAction('reject'); });
    btnPrevHunk.addEventListener('click', (e: MouseEvent) => { e.preventDefault(); e.stopPropagation(); sendAction('previousHunk'); });
    btnNextHunk.addEventListener('click', (e: MouseEvent) => { e.preventDefault(); e.stopPropagation(); sendAction('nextHunk'); });
    btnPrevFile.addEventListener('click', (e: MouseEvent) => { e.preventDefault(); e.stopPropagation(); sendAction('previousFile'); });
    btnNextFile.addEventListener('click', (e: MouseEvent) => { e.preventDefault(); e.stopPropagation(); sendAction('nextFile'); });
    textFiles.addEventListener('click', (e: MouseEvent) => { e.preventDefault(); e.stopPropagation(); sendAction('selectFile'); });
    btnSendToAgent.addEventListener('click', (e: MouseEvent) => { e.preventDefault(); e.stopPropagation(); sendAction('sendProblemsToAgent'); });

    // Target container resolver for capsule bar
    function getMountTarget(): HTMLElement | null {
        // 1. Look for the active editor group container (sits directly above bottom terminal panel!)
        const activeGroup = document.querySelector('.monaco-workbench .part.editor .editor-group-container.active') as HTMLElement | null;
        if (activeGroup) {
            return activeGroup;
        }

        // 2. Look for any active editor instance
        const activeInstance = document.querySelector('.monaco-workbench .part.editor .editor-instance') as HTMLElement | null;
        if (activeInstance) {
            return activeInstance;
        }

        // 3. Fallback to active editor part
        const editorPart = document.querySelector('.monaco-workbench .part.editor') as HTMLElement | null;
        if (editorPart) {
            return editorPart;
        }

        return document.body;
    }

    // Inject "Send to Agent" button directly into Problems Panel UI
    function injectProblemsPanelButton() {
        const markersPanel = document.querySelector('.monaco-workbench .part.panel .markers-panel') as HTMLElement | null;
        if (!markersPanel) {
            return;
        }

        if (document.getElementById('antigravity-problems-send-agent-btn')) {
            return;
        }

        // Locate toolbar or filter area inside problems panel
        const toolbar = markersPanel.querySelector('.monaco-toolbar .actions-container') || markersPanel.querySelector('.markers-panel-header') || markersPanel;

        const panelBtn = document.createElement('button');
        panelBtn.id = 'antigravity-problems-send-agent-btn';
        panelBtn.className = 'antigravity-panel-send-btn';
        panelBtn.title = 'Send all current problems & compilation errors to Agent Chat panel as @current_problems';
        panelBtn.textContent = 'Send to Agent';

        panelBtn.addEventListener('click', (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            sendAction('sendProblemsToAgent');
        });

        if (toolbar.firstChild) {
            toolbar.insertBefore(panelBtn, toolbar.firstChild);
        } else {
            toolbar.appendChild(panelBtn);
        }
    }

    function checkDomDiffs(): boolean {
        // 1. Detect presence of inline diff CodeLens in DOM
        const codeLens = document.querySelectorAll('.codelens-decoration');
        for (let i = 0; i < codeLens.length; i++) {
            const txt = codeLens[i].textContent || '';
            if (txt.includes('Accept') || txt.includes('Reject')) {
                return true;
            }
        }

        // 2. Detect (Agent Edit) tab title
        const activeTab = document.querySelector('.tab.active');
        if (activeTab) {
            const title = activeTab.textContent || '';
            if (title.includes('(Agent Edit)') || activeTab.classList.contains('dirty')) {
                return true;
            }
        }

        // 3. Detect sidebar changes section ("Files With Changes" / "Reject all" / "Accept all")
        const chatPanel = document.querySelector('.interactive-session, .chat-editor, [class*="chat"]');
        if (chatPanel) {
            const text = chatPanel.textContent || '';
            if (text.includes('Files With Changes') || (text.includes('Reject all') && text.includes('Accept all'))) {
                return true;
            }
        }

        // 4. Any monaco editor with active decorations
        const editor = document.querySelector('.monaco-editor');
        if (editor && document.querySelector('.ced-1-TextEditorDecorationType1-1, .inline-diff-deleted-line, .inline-diff-inserted-line')) {
            return true;
        }

        return false;
    }

    // State polling & synchronization loop
    async function syncState() {
        // Ensure capsule mounted to current active editor container
        const mountTarget = getMountTarget();
        if (mountTarget && capsuleEl.parentElement !== mountTarget) {
            mountTarget.appendChild(capsuleEl);
        }

        // Inject button into Problems Panel if panel is open
        injectProblemsPanelButton();

        let hasDiffs = checkDomDiffs();
        let currentIdx = 1;
        let totalCount = 1;
        let enabled = true;
        let showReviewBar = true;
        let showFileNav = true;
        let position = 'bottom-center';
        let autoHideWhenClean = true;

        try {
            const res = await fetch(`${SERVER_URL}/state`);
            if (res.ok) {
                const data: any = await res.json();
                if (data.hasDiffs !== undefined) {
                    hasDiffs = hasDiffs || Boolean(data.hasDiffs);
                    currentIdx = data.currentFileIndex || 1;
                    totalCount = data.totalFiles || 1;
                    if (data.enabled !== undefined) enabled = Boolean(data.enabled);
                    if (data.showReviewBar !== undefined) showReviewBar = Boolean(data.showReviewBar);
                    if (data.showFileNavigation !== undefined) showFileNav = Boolean(data.showFileNavigation);
                    if (data.position !== undefined) position = String(data.position);
                    if (data.autoHideWhenClean !== undefined) autoHideWhenClean = Boolean(data.autoHideWhenClean);
                }
            }
        } catch {
            // Server may be idle, fallback to DOM diff inspection
        }

        // Check manual debug override
        if ((window as any).__antigravityForceShowFloatingBar) {
            hasDiffs = true;
        }

        // Apply position styling dynamically
        if (position === 'bottom-right') {
            capsuleEl.style.left = 'auto';
            capsuleEl.style.right = '24px';
            capsuleEl.style.transform = 'none';
        } else {
            capsuleEl.style.left = '50%';
            capsuleEl.style.right = 'auto';
            capsuleEl.style.transform = 'translateX(-50%)';
        }

        textFiles.textContent = `Edited files ${currentIdx}/${totalCount}`;

        if (!showFileNav || totalCount <= 1) {
            fileNavSection.classList.add('hidden');
        } else {
            fileNavSection.classList.remove('hidden');
        }

        // If active editor exists and diffs detected
        const hasActiveEditor = Boolean(document.querySelector('.monaco-editor'));
        const shouldShow = enabled && showReviewBar && hasActiveEditor && (!autoHideWhenClean || hasDiffs);

        if (shouldShow) {
            capsuleEl.classList.remove('hidden-bar');
            capsuleEl.style.display = 'flex';
        } else {
            capsuleEl.classList.add('hidden-bar');
            capsuleEl.style.display = 'none';
        }
    }

    // Run periodic sync loop every 300ms
    setInterval(syncState, 300);
    // Initial sync
    setTimeout(syncState, 50);

    console.log('[Antigravity Floating Bar] Capsule review bar loaded successfully.');
})();
