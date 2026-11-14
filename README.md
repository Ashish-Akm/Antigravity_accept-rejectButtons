# Antigravity Floating Diff Reviewer

A clean, minimalist floating review capsule bar for **Google Antigravity IDE** and **VS Code**. Restores the iconic floating review toolbar (`Accept Changes ⌘↩` · `Reject ⌘⌫` · `↑ ⌥K` · `↓ ⌥J` · `< Edited files X/Y >`) with keyboard shortcuts and multi-file navigation.

---

## Features

- **Accept Changes (`⌘↩` / `Ctrl+Enter`)**: Instantly accepts pending agent edits or stages modified hunks.
- **Reject Changes (`⌘⌫` / `Ctrl+Backspace`)**: Reverts uncommitted changes cleanly.
- **Previous Hunk (`⌥K` / `Alt+K`)**: Jumps smoothly to the previous diff hunk in the active editor.
- **Next Hunk (`⌥J` / `Alt+J`)**: Jumps smoothly to the next diff hunk in the active editor.
- **File Navigation (`< Edited files X/Y >`)**: Rapidly cycle across all modified files in the workspace.
- **Zero Distraction**: Auto-hides when working in clean workspaces with no pending diffs.
- **Dual Mode**: Interoperates with Antigravity Agent internal commands and standard Git diff workflows.

---

## Keyboard Shortcuts

| Action | macOS Shortcut | Windows / Linux Shortcut |
| :--- | :--- | :--- |
| **Accept Changes** | `⌘ + Enter` | `Ctrl + Enter` |
| **Reject Changes** | `⌘ + Backspace` | `Ctrl + Backspace` |
| **Previous Hunk** | `⌥ + K` | `Alt + K` |
| **Next Hunk** | `⌥ + J` | `Alt + J` |
| **Previous File** | `Click <` | `Click <` |
| **Next File** | `Click >` | `Click >` |

---

## Installation

### From Source
```bash
git clone https://github.com/Ashish-Akm/antigravity-floating-diff.git
cd antigravity-floating-diff
npm install
npm run build
```

The extension bundle compiles to `dist/extension.js` and can be loaded directly in Antigravity IDE or VS Code.

---

## Author
- Developed by: Ashish Kumar Mahto
- Location: Ranchi, Jharkhand, India
- Repository: [https://github.com/Ashish-Akm/antigravity-floating-diff](https://github.com/Ashish-Akm/antigravity-floating-diff)
- License: MIT
