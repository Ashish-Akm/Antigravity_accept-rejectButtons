// Antigravity IDE - In-Editor Floating Review Capsule Bar
// Docks seamlessly into active Monaco code editor viewport

(function () {
    if ((window as any).__antigravityFloatingBarLoaded) {
        return;
    }
    (window as any).__antigravityFloatingBarLoaded = true;

    const SERVER_URL = 'http://127.0.0.1:48765';
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const acceptShortcut = isMac ? '⌘↩' : 'Ctrl+Enter';
    const rejectShortcut = isMac ? '⌘⌫' : 'Ctrl+Backspace';
    const prevHunkShortcut = isMac ? '⌥K' : 'Alt+K';
    const nextHunkShortcut = isMac ? '⌥J' : 'Alt+J';

    // Inject custom container styling to guarantee floating bottom alignment
    const styleEl = document.createElement('style');
    styleEl.id = 'antigravity-floating-bar-style';
    styleEl.textContent = `
        .antigravity-capsule-root {
            position: absolute !important;
            bottom: 16px !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            z-index: 2500 !important;
            display: flex !important;
            pointer-events: auto !important;
            user-select: none !important;
            transition: opacity 0.22s cubic-bezier(0.16, 1, 0.3, 1), transform 0.22s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .antigravity-capsule-root.hidden-bar {
            opacity: 0 !important;
            pointer-events: none !important;
            transform: translateX(-50%) translateY(8px) !important;
        }
        .antigravity-capsule-root .cascade-bar button:active {
            transform: scale(0.97);
            transition: transform 0.08s ease;
        }
    `;
    document.head.appendChild(styleEl);

    // Create the floating capsule element matching Antigravity native classes
    const capsuleEl = document.createElement('div');
    capsuleEl.className = 'antigravity-capsule-root hidden-bar';
    capsuleEl.id = 'antigravity-floating-capsule';
    capsuleEl.innerHTML = `
        <div class="cascade-bar">
            <div class="file-with-diff bar-mode">
                <div class="resolve-changes">
                    <button class="keep-changes primary" id="antigravity-btn-accept" title="Accept Changes (${acceptShortcut})">
                        <span>Accept Changes</span>
                        <span class="shortcut">${acceptShortcut}</span>
                    </button>
                    <button class="discard-changes secondary" id="antigravity-btn-reject" title="Reject (${rejectShortcut})">
                        <span>Reject</span>
                        <span class="shortcut">${rejectShortcut}</span>
                    </button>
                </div>
                <div class="hunk-nav" id="antigravity-hunk-nav">
                    <button class="previous-hunk secondary" id="antigravity-btn-prev-hunk" title="Previous Change (${prevHunkShortcut})">
                        <span class="codicon codicon-arrow-up"></span>
                        <span class="shortcut">${prevHunkShortcut}</span>
                    </button>
                    <button class="next-hunk secondary" id="antigravity-btn-next-hunk" title="Next Change (${nextHunkShortcut})">
                        <span class="codicon codicon-arrow-down"></span>
                        <span class="shortcut">${nextHunkShortcut}</span>
                    </button>
                </div>
                <div class="file-nav-section" id="antigravity-file-nav">
                    <button class="prev-file secondary codicon codicon-chevron-left" id="antigravity-btn-prev-file" title="Previous File"></button>
                    <div class="file-nav-display-text" id="antigravity-files-text">Edited files 1/1</div>
                    <button class="next-file secondary codicon codicon-chevron-right" id="antigravity-btn-next-file" title="Next File"></button>
                </div>
            </div>
        </div>
    `;

    // Fast helper to send actions to extension host
    async function sendAction(action: string) {
        try {
            await fetch(`${SERVER_URL}/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action })
            });
        } catch (e) {
            // Graceful fallback: dispatch keyboard shortcut into editor textarea
            dispatchEditorKey(action);
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

    // Attach event listeners
    const btnAccept = capsuleEl.querySelector('#antigravity-btn-accept');
    const btnReject = capsuleEl.querySelector('#antigravity-btn-reject');
    const btnPrevHunk = capsuleEl.querySelector('#antigravity-btn-prev-hunk');
    const btnNextHunk = capsuleEl.querySelector('#antigravity-btn-next-hunk');
    const btnPrevFile = capsuleEl.querySelector('#antigravity-btn-prev-file');
    const btnNextFile = capsuleEl.querySelector('#antigravity-btn-next-file');
    const textFiles = capsuleEl.querySelector('#antigravity-files-text');
    const fileNavSection = capsuleEl.querySelector('#antigravity-file-nav');

    btnAccept?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); sendAction('accept'); });
    btnReject?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); sendAction('reject'); });
    btnPrevHunk?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); sendAction('previousHunk'); });
    btnNextHunk?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); sendAction('nextHunk'); });
    btnPrevFile?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); sendAction('previousFile'); });
    btnNextFile?.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); sendAction('nextFile'); });

    // Target container resolver
    function getMountTarget(): HTMLElement | null {
        // 1. Look for the active editor group instance
        const activeInstance = document.querySelector('.monaco-workbench .part.editor .editor-group-container.active .editor-instance') as HTMLElement | null;
        if (activeInstance) {
            return activeInstance;
        }

        // 2. Active editor group container
        const activeGroup = document.querySelector('.monaco-workbench .part.editor .editor-group-container.active') as HTMLElement | null;
        if (activeGroup) {
            return activeGroup;
        }

        // 3. Fallback to any active monaco editor container
        const monacoEditor = document.querySelector('.monaco-editor') as HTMLElement | null;
        return monacoEditor;
    }

    function checkDomDiffs(): boolean {
        // Detect presence of inline diff decorations or CodeLens in DOM
        const codeLens = document.querySelectorAll('.codelens-decoration');
        for (let i = 0; i < codeLens.length; i++) {
            const txt = codeLens[i].textContent || '';
            if (txt.includes('Accept') || txt.includes('Reject')) {
                return true;
            }
        }

        // Detect (Agent Edit) tab title
        const activeTab = document.querySelector('.tab.active');
        if (activeTab && (activeTab.textContent || '').includes('(Agent Edit)')) {
            return true;
        }

        // Detect diff decorations
        if (document.querySelector('[class*="diffEditor-insertedTextBackground"]') ||
            document.querySelector('[class*="diffEditor-removedTextBorder"]') ||
            document.querySelector('.inline-diff-modified-line')) {
            return true;
        }

        return false;
    }

    // State polling & synchronization loop
    let lastHasDiffs = false;

    async function syncState() {
        // Ensure mounted to current active editor
        const mountTarget = getMountTarget();
        if (mountTarget && capsuleEl.parentElement !== mountTarget) {
            mountTarget.appendChild(capsuleEl);
        }

        let hasDiffs = checkDomDiffs();
        let currentIdx = 1;
        let totalCount = 1;

        try {
            const res = await fetch(`${SERVER_URL}/state`);
            if (res.ok) {
                const data = await res.json();
                if (data.hasDiffs !== undefined) {
                    hasDiffs = hasDiffs || Boolean(data.hasDiffs);
                    currentIdx = data.currentFileIndex || 1;
                    totalCount = data.totalFiles || 1;
                }
            }
        } catch {
            // Server may be starting up or idle, relying on DOM diff inspection
        }

        if (textFiles) {
            textFiles.textContent = `Edited files ${currentIdx}/${totalCount}`;
        }

        if (fileNavSection) {
            if (totalCount <= 1) {
                fileNavSection.classList.add('hidden');
            } else {
                fileNavSection.classList.remove('hidden');
            }
        }

        if (hasDiffs) {
            capsuleEl.classList.remove('hidden-bar');
            lastHasDiffs = true;
        } else {
            capsuleEl.classList.add('hidden-bar');
            lastHasDiffs = false;
        }
    }

    // Run periodic sync loop
    setInterval(syncState, 600);
    // Initial sync
    setTimeout(syncState, 100);
})();
