import * as vscode from 'vscode';
import { GitDiffTracker } from './gitTracker';

export class FloatingReviewBar {
    private _statusBarContainer: vscode.StatusBarItem[] = [];
    private _webviewPanel: vscode.WebviewView | null = null;
    private _tracker: GitDiffTracker;
    private _disposables: vscode.Disposable[] = [];

    constructor(tracker: GitDiffTracker) {
        this._tracker = tracker;
        this.initStatusBarCapsule();
        this._tracker.onDidUpdate(() => this.updateUi(), null, this._disposables);
    }

    private initStatusBarCapsule(): void {
        // High priority status bar items aligned to create the exact capsule look
        // 1. Accept Changes Item (Primary Blue)
        const acceptItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 10005);
        acceptItem.text = `$(check) Accept Changes $(triangle-right) ⌘↩`;
        acceptItem.tooltip = "Accept all pending diff changes in this file (Cmd+Enter)";
        acceptItem.command = "antigravityFloatingDiff.acceptChanges";
        acceptItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
        acceptItem.color = '#ffffff';

        // 2. Reject Changes Item
        const rejectItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 10004);
        rejectItem.text = `$(close) Reject ⌘⌫`;
        rejectItem.tooltip = "Reject all pending diff changes in this file (Cmd+Backspace)";
        rejectItem.command = "antigravityFloatingDiff.rejectChanges";

        // 3. Separator
        const sep1 = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 10003);
        sep1.text = `|`;
        sep1.tooltip = "";

        // 4. Previous Hunk
        const prevHunkItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 10002);
        prevHunkItem.text = `$(arrow-up) ⌥K`;
        prevHunkItem.tooltip = "Jump to previous change hunk (Alt+K)";
        prevHunkItem.command = "antigravityFloatingDiff.previousHunk";

        // 5. Next Hunk
        const nextHunkItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 10001);
        nextHunkItem.text = `$(arrow-down) ⌥J`;
        nextHunkItem.tooltip = "Jump to next change hunk (Alt+J)";
        nextHunkItem.command = "antigravityFloatingDiff.nextHunk";

        // 6. Separator
        const sep2 = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 10000);
        sep2.text = `|`;
        sep2.tooltip = "";

        // 7. File Navigation (< Edited files X/Y >)
        const fileNavItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 9999);
        fileNavItem.text = `$(chevron-left) Edited files 0/0 $(chevron-right)`;
        fileNavItem.tooltip = "Click to jump to next edited file";
        fileNavItem.command = "antigravityFloatingDiff.nextFile";

        this._statusBarContainer = [
            acceptItem,
            rejectItem,
            sep1,
            prevHunkItem,
            nextHunkItem,
            sep2,
            fileNavItem
        ];

        this.updateUi();
    }

    public updateUi(): void {
        const config = vscode.workspace.getConfiguration('antigravityFloatingDiff');
        const enabled = config.get<boolean>('enabled', true);
        const autoHide = config.get<boolean>('autoHideWhenClean', true);

        const modifiedCount = this._tracker.modifiedFiles.length;
        const currentIdx = this._tracker.activeFileIndex + 1;

        if (!enabled || (autoHide && modifiedCount === 0)) {
            this._statusBarContainer.forEach(item => item.hide());
            return;
        }

        // Update file navigation text
        const fileNavItem = this._statusBarContainer[6];
        if (fileNavItem) {
            fileNavItem.text = `$(chevron-left) Edited files ${currentIdx}/${modifiedCount} $(chevron-right)`;
        }

        // Show all capsule items
        this._statusBarContainer.forEach(item => item.show());
    }

    public dispose(): void {
        this._statusBarContainer.forEach(item => item.dispose());
        this._disposables.forEach(d => d.dispose());
    }
}
