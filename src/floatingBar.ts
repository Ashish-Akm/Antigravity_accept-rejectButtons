import * as vscode from 'vscode';
import { GitDiffTracker } from './gitTracker';
import { FloatingBarServer } from './server';
import { WorkbenchInjector } from './injector';

export class FloatingReviewBar {
    private _statusBarContainer: vscode.StatusBarItem[] = [];
    private _tracker: GitDiffTracker;
    private _server: FloatingBarServer;
    private _disposables: vscode.Disposable[] = [];
    private _context: vscode.ExtensionContext;

    constructor(tracker: GitDiffTracker, context: vscode.ExtensionContext) {
        this._tracker = tracker;
        this._context = context;
        this._server = new FloatingBarServer(tracker);
        this.initStatusBarCapsule();
        this.initInEditorBar();
        this._tracker.onDidUpdate(() => this.updateUi(), null, this._disposables);
    }

    private async initInEditorBar(): Promise<void> {
        const isInstalled = await WorkbenchInjector.isInstalled();
        if (!isInstalled) {
            const success = await WorkbenchInjector.install(this._context);
            if (success) {
                const choice = await vscode.window.showInformationMessage(
                    "Antigravity Floating Capsule Bar installed into editor viewport. Reload window to activate.",
                    "Reload Window"
                );
                if (choice === "Reload Window") {
                    vscode.commands.executeCommand("workbench.action.reloadWindow");
                }
            }
        }
    }

    private initStatusBarCapsule(): void {
        // High priority status bar capsule placed on the Left
        // 1. Accept Changes Item (Primary Blue Capsule Button)
        const acceptItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 10005);
        acceptItem.text = `$(check) Accept Changes ⌘↩`;
        acceptItem.tooltip = "Accept all pending diff changes in this file (Cmd+Enter)";
        acceptItem.command = "antigravityFloatingDiff.acceptChanges";
        acceptItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
        acceptItem.color = '#ffffff';

        // 2. Reject Changes Item
        const rejectItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 10004);
        rejectItem.text = `$(close) Reject ⌘⌫`;
        rejectItem.tooltip = "Reject all pending diff changes in this file (Cmd+Backspace)";
        rejectItem.command = "antigravityFloatingDiff.rejectChanges";
        rejectItem.color = '#e0e0e0';

        // 3. Separator
        const sep1 = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 10003);
        sep1.text = `|`;
        sep1.tooltip = "";
        sep1.color = '#555555';

        // 4. Previous Hunk (↑ ⌥K)
        const prevHunkItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 10002);
        prevHunkItem.text = `$(arrow-up) ⌥K`;
        prevHunkItem.tooltip = "Jump to previous change hunk (Alt+K)";
        prevHunkItem.command = "antigravityFloatingDiff.previousHunk";
        prevHunkItem.color = '#cccccc';

        // 5. Next Hunk (↓ ⌥J)
        const nextHunkItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 10001);
        nextHunkItem.text = `$(arrow-down) ⌥J`;
        nextHunkItem.tooltip = "Jump to next change hunk (Alt+J)";
        nextHunkItem.command = "antigravityFloatingDiff.nextHunk";
        nextHunkItem.color = '#cccccc';

        // 6. Separator
        const sep2 = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 10000);
        sep2.text = `|`;
        sep2.tooltip = "";
        sep2.color = '#555555';

        // 7. File Navigation (< Edited files X/Y >)
        const fileNavItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 9999);
        fileNavItem.text = `$(chevron-left) Edited files 0/0 $(chevron-right)`;
        fileNavItem.tooltip = "Click to cycle across edited files in workspace";
        fileNavItem.command = "antigravityFloatingDiff.nextFile";
        fileNavItem.color = '#9cdcfe';

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
        const autoHide = config.get<boolean>('autoHideWhenClean', false);

        const modifiedCount = this._tracker.modifiedFiles.length;
        const currentIdx = modifiedCount > 0 ? this._tracker.activeFileIndex + 1 : 0;

        if (!enabled || (autoHide && modifiedCount === 0)) {
            this._statusBarContainer.forEach(item => item.hide());
            return;
        }

        const acceptItem = this._statusBarContainer[0];
        const fileNavItem = this._statusBarContainer[6];

        if (modifiedCount > 0) {
            acceptItem.text = `$(check) Accept Changes ⌘↩`;
            acceptItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
            fileNavItem.text = `$(chevron-left) Edited files ${currentIdx}/${modifiedCount} $(chevron-right)`;
        } else {
            acceptItem.text = `$(check) All Clean`;
            acceptItem.backgroundColor = undefined;
            fileNavItem.text = `$(check) 0 modified files`;
        }

        this._statusBarContainer.forEach(item => item.show());
    }

    public dispose(): void {
        this._statusBarContainer.forEach(item => item.dispose());
        this._disposables.forEach(d => d.dispose());
        this._server.dispose();
    }
}
