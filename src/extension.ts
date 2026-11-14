import * as vscode from 'vscode';
import { GitDiffTracker } from './gitTracker';
import { FloatingReviewBar } from './floatingBar';
import { WorkbenchInjector } from './injector';
import { ProblemsSender } from './problemsSender';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

export function activate(context: vscode.ExtensionContext) {
    console.log('[Antigravity Floating Diff] Activating extension...');

    const tracker = new GitDiffTracker();
    const floatingBar = new FloatingReviewBar(tracker, context);
    context.subscriptions.push(floatingBar);

    // Watch active editor changes to refresh tracker
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(async () => {
            await tracker.refresh();
        })
    );

    // Watch document saves
    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument(async () => {
            await tracker.refresh();
        })
    );

    // Watch configuration changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(async (e) => {
            if (e.affectsConfiguration('antigravityFloatingDiff.showDeletedLines')) {
                const config = vscode.workspace.getConfiguration('antigravityFloatingDiff');
                const showDeleted = config.get<boolean>('showDeletedLines', true);
                if (showDeleted) {
                    await WorkbenchInjector.enableInlineRedLines();
                } else {
                    await WorkbenchInjector.disableInlineRedLines();
                }
            }
            if (e.affectsConfiguration('antigravityFloatingDiff')) {
                floatingBar.updateUi();
            }
        })
    );

    // Periodic refresh every 3 seconds to keep sync with Git & agent edits
    const interval = setInterval(() => {
        tracker.refresh();
    }, 3000);
    context.subscriptions.push({ dispose: () => clearInterval(interval) });

    // Initial immediate refresh
    tracker.refresh();

    // Ensure inline red deleted lines are enabled (Trusted Types & AutoSave safe)
    WorkbenchInjector.enableInlineRedLines().catch(() => { });

    // ── COMMAND: Accept Changes (⌘↩) ──────────────────────────
    const acceptCmd = vscode.commands.registerCommand('antigravityFloatingDiff.acceptChanges', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('No active editor to accept changes.');
            return;
        }

        const filePath = editor.document.uri.fsPath;
        const fileName = path.basename(filePath);

        // 1. Try dispatching Antigravity internal agent accept command if available
        try {
            const allCommands = await vscode.commands.getCommands();
            if (allCommands.includes('antigravity.prioritized.agentAcceptAllInFile')) {
                await vscode.commands.executeCommand('antigravity.prioritized.agentAcceptAllInFile');
                vscode.window.showInformationMessage(`Accepted Antigravity agent changes in ${fileName}`);
                await tracker.refresh();
                return;
            } else if (allCommands.includes('antigravity.inlineDiff.acceptAll')) {
                await vscode.commands.executeCommand('antigravity.inlineDiff.acceptAll');
                vscode.window.showInformationMessage(`Accepted inline diff in ${fileName}`);
                await tracker.refresh();
                return;
            }
        } catch {
            // Fall through to git stage
        }

        // 2. Fallback to Git stage
        try {
            const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (root) {
                await execAsync(`git add "${filePath}"`, { cwd: root });
                vscode.window.showInformationMessage(`Staged changes for ${fileName}`);
            }
        } catch (e: any) {
            vscode.window.showErrorMessage(`Failed to accept/stage changes: ${e.message}`);
        }

        await tracker.refresh();
    });
    context.subscriptions.push(acceptCmd);

    // ── COMMAND: Reject Changes (⌘⌫) ──────────────────────────
    const rejectCmd = vscode.commands.registerCommand('antigravityFloatingDiff.rejectChanges', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('No active editor to reject changes.');
            return;
        }

        const filePath = editor.document.uri.fsPath;
        const fileName = path.basename(filePath);

        // 1. Try dispatching Antigravity internal agent reject command if available
        try {
            const allCommands = await vscode.commands.getCommands();
            if (allCommands.includes('antigravity.prioritized.agentRejectAllInFile')) {
                await vscode.commands.executeCommand('antigravity.prioritized.agentRejectAllInFile');
                vscode.window.showInformationMessage(`Rejected Antigravity agent changes in ${fileName}`);
                await tracker.refresh();
                return;
            } else if (allCommands.includes('antigravity.inlineDiff.rejectAll')) {
                await vscode.commands.executeCommand('antigravity.inlineDiff.rejectAll');
                vscode.window.showInformationMessage(`Rejected inline diff in ${fileName}`);
                await tracker.refresh();
                return;
            }
        } catch {
            // Fall through to git checkout
        }

        // 2. Fallback to Git checkout/revert
        try {
            const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (root) {
                await execAsync(`git checkout -- "${filePath}"`, { cwd: root });
                vscode.window.showInformationMessage(`Reverted changes for ${fileName}`);
            }
        } catch (e: any) {
            vscode.window.showErrorMessage(`Failed to revert changes: ${e.message}`);
        }

        await tracker.refresh();
    });
    context.subscriptions.push(rejectCmd);

    // ── COMMAND: Previous Hunk (⌥K) ───────────────────────────
    const prevHunkCmd = vscode.commands.registerCommand('antigravityFloatingDiff.previousHunk', async () => {
        const allCommands = await vscode.commands.getCommands();
        if (allCommands.includes('antigravity.prioritized.agentFocusPreviousHunk')) {
            await vscode.commands.executeCommand('antigravity.prioritized.agentFocusPreviousHunk');
            return;
        }
        if (allCommands.includes('workbench.action.compareEditor.previousChange')) {
            await vscode.commands.executeCommand('workbench.action.compareEditor.previousChange');
            return;
        }
        vscode.commands.executeCommand('editor.action.dirtydiff.previous');
    });
    context.subscriptions.push(prevHunkCmd);

    // ── COMMAND: Next Hunk (⌥J) ───────────────────────────────
    const nextHunkCmd = vscode.commands.registerCommand('antigravityFloatingDiff.nextHunk', async () => {
        const allCommands = await vscode.commands.getCommands();
        if (allCommands.includes('antigravity.prioritized.agentFocusNextHunk')) {
            await vscode.commands.executeCommand('antigravity.prioritized.agentFocusNextHunk');
            return;
        }
        if (allCommands.includes('workbench.action.compareEditor.nextChange')) {
            await vscode.commands.executeCommand('workbench.action.compareEditor.nextChange');
            return;
        }
        vscode.commands.executeCommand('editor.action.dirtydiff.next');
    });
    context.subscriptions.push(nextHunkCmd);

    // ── COMMAND: Previous File (<) ────────────────────────────
    const prevFileCmd = vscode.commands.registerCommand('antigravityFloatingDiff.previousFile', async () => {
        await tracker.previousFile();
    });
    context.subscriptions.push(prevFileCmd);

    // ── COMMAND: Next File (>) ────────────────────────────────
    const nextFileCmd = vscode.commands.registerCommand('antigravityFloatingDiff.nextFile', async () => {
        await tracker.nextFile();
    });
    context.subscriptions.push(nextFileCmd);

    // ── COMMAND: Select File (Click text) ─────────────────────
    const selectFileCmd = vscode.commands.registerCommand('antigravityFloatingDiff.selectFile', async () => {
        await tracker.selectFile();
    });
    context.subscriptions.push(selectFileCmd);

    // ── COMMAND: Install In-Editor Bar ────────────────────────
    const installBarCmd = vscode.commands.registerCommand('antigravityFloatingDiff.installBar', async () => {
        const ok = await WorkbenchInjector.install(context);
        if (ok) {
            const choice = await vscode.window.showInformationMessage(
                'In-Editor Floating Capsule Bar installed successfully. Please reload window to activate.',
                'Reload Window'
            );
            if (choice === 'Reload Window') {
                vscode.commands.executeCommand('workbench.action.reloadWindow');
            }
        } else {
            vscode.window.showErrorMessage('Failed to install in-editor floating bar into workbench.');
        }
    });
    context.subscriptions.push(installBarCmd);

    // ── COMMAND: Uninstall In-Editor Bar ──────────────────────
    const uninstallBarCmd = vscode.commands.registerCommand('antigravityFloatingDiff.uninstallBar', async () => {
        const ok = await WorkbenchInjector.uninstall();
        if (ok) {
            const choice = await vscode.window.showInformationMessage(
                'In-Editor Floating Capsule Bar removed. Please reload window.',
                'Reload Window'
            );
            if (choice === 'Reload Window') {
                vscode.commands.executeCommand('workbench.action.reloadWindow');
            }
        } else {
            vscode.window.showErrorMessage('Failed to uninstall in-editor floating bar.');
        }
    });
    context.subscriptions.push(uninstallBarCmd);

    // ── COMMAND: Toggle Bar ───────────────────────────────────
    const toggleCmd = vscode.commands.registerCommand('antigravityFloatingDiff.toggleBar', async () => {
        const config = vscode.workspace.getConfiguration('antigravityFloatingDiff');
        const current = config.get<boolean>('enabled', true);
        await config.update('enabled', !current, vscode.ConfigurationTarget.Global);
        floatingBar.updateUi();
        vscode.window.showInformationMessage(`Antigravity Floating Diff review bar ${!current ? 'enabled' : 'disabled'}.`);
    });
    context.subscriptions.push(toggleCmd);

    // ── COMMAND: Self-Test / Simulation ───────────────────────
    const testCmd = vscode.commands.registerCommand('antigravityFloatingDiff.testReviewBar', async () => {
        await tracker.refresh();
        const count = tracker.modifiedFiles.length;
        const activeName = vscode.window.activeTextEditor?.document.fileName.split('/').pop() || 'None';
        const isInstalled = await WorkbenchInjector.isInstalled();
        vscode.window.showInformationMessage(
            `Antigravity Floating Diff: In-editor bar is ${isInstalled ? 'installed' : 'pending reload'} · Active file: ${activeName} · Modified files detected: ${count}. Shortcuts: Cmd+Enter to Accept, Cmd+Backspace to Reject.`
        );
    });
    context.subscriptions.push(testCmd);

    // ── COMMAND: Send Problems to Agent (@current_problems) ──
    const sendProblemsCmd = vscode.commands.registerCommand('antigravityFloatingDiff.sendProblemsToAgent', async () => {
        await ProblemsSender.sendToAgent();
    });
    context.subscriptions.push(sendProblemsCmd);

    console.log('[Antigravity Floating Diff] Extension activated successfully.');
}

export function deactivate() {
    console.log('[Antigravity Floating Diff] Deactivating extension...');
}
