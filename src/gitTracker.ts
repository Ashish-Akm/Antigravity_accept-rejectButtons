import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface DiffHunk {
    startLine: number;
    lineCount: number;
    type: 'add' | 'delete' | 'modify';
}

export interface ModifiedFileInfo {
    uri: vscode.Uri;
    relativePath: string;
    hunkCount: number;
}

export class GitDiffTracker {
    private _modifiedFiles: ModifiedFileInfo[] = [];
    private _currentHunks: DiffHunk[] = [];
    private _activeFileIndex = 0;
    private _onDidUpdate = new vscode.EventEmitter<void>();
    public readonly onDidUpdate = this._onDidUpdate.event;

    constructor() {
        this.refresh();
    }

    public get modifiedFiles(): ModifiedFileInfo[] {
        return this._modifiedFiles;
    }

    public get activeFileIndex(): number {
        return this._activeFileIndex;
    }

    public get currentHunks(): DiffHunk[] {
        return this._currentHunks;
    }

    public async refresh(): Promise<void> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            this._modifiedFiles = [];
            this._currentHunks = [];
            this._onDidUpdate.fire();
            return;
        }

        const rootPath = workspaceFolders[0].uri.fsPath;

        try {
            // Check git status to find modified files
            const { stdout } = await execAsync('git status --porcelain', { cwd: rootPath });
            const lines = stdout.trim().split('\n').filter(l => l.trim().length > 0);
            
            const files: ModifiedFileInfo[] = [];
            for (const line of lines) {
                const status = line.substring(0, 2).trim();
                const filePath = line.substring(3).trim();
                if (status === 'M' || status === 'MM' || status === 'AM' || status === '??') {
                    const fullUri = vscode.Uri.file(`${rootPath}/${filePath}`);
                    files.push({
                        uri: fullUri,
                        relativePath: filePath,
                        hunkCount: 1
                    });
                }
            }

            this._modifiedFiles = files;

            // Update current active file index
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                const activePath = activeEditor.document.uri.fsPath;
                const idx = files.findIndex(f => f.uri.fsPath === activePath);
                this._activeFileIndex = idx >= 0 ? idx : 0;
                await this.refreshHunksForEditor(activeEditor);
            } else {
                this._activeFileIndex = 0;
                this._currentHunks = [];
            }
        } catch {
            this._modifiedFiles = [];
            this._currentHunks = [];
        }

        this._onDidUpdate.fire();
    }

    public async refreshHunksForEditor(editor: vscode.TextEditor): Promise<void> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) return;

        const rootPath = workspaceFolders[0].uri.fsPath;
        const filePath = editor.document.uri.fsPath;

        try {
            const { stdout } = await execAsync(`git diff -U0 -- "${filePath}"`, { cwd: rootPath });
            const hunks: DiffHunk[] = [];
            const regex = /@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/g;
            let match;
            while ((match = regex.exec(stdout)) !== null) {
                const startLine = parseInt(match[3], 10);
                const lineCount = match[4] ? parseInt(match[4], 10) : 1;
                hunks.push({
                    startLine,
                    lineCount,
                    type: lineCount > 0 ? 'add' : 'delete'
                });
            }
            this._currentHunks = hunks;
        } catch {
            this._currentHunks = [];
        }
    }
}
