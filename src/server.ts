import * as http from 'http';
import * as vscode from 'vscode';
import { GitDiffTracker } from './gitTracker';
import { ProblemsSender } from './problemsSender';

export interface FloatingBarState {
    hasDiffs: boolean;
    currentFileIndex: number;
    totalFiles: number;
    activeFile?: string;
    enabled: boolean;
    showReviewBar: boolean;
    showDeletedLines: boolean;
    showFileNavigation: boolean;
    position: string;
    autoHideWhenClean: boolean;
}

export class FloatingBarServer {
    private _server: http.Server | null = null;
    private _port: number = 48765;
    private _tracker: GitDiffTracker;

    constructor(tracker: GitDiffTracker) {
        this._tracker = tracker;
        this.startServer();
    }

    private startServer(): void {
        this._server = http.createServer(async (req, res) => {
            // Set CORS headers
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

            if (req.method === 'OPTIONS') {
                res.writeHead(204);
                res.end();
                return;
            }

            if (req.url === '/state' && req.method === 'GET') {
                const total = this._tracker.modifiedFiles.length;
                const currentIdx = total > 0 ? this._tracker.activeFileIndex + 1 : 0;
                const activeFile = this._tracker.activeFile || '';

                // Active document check
                const activeEditor = vscode.window.activeTextEditor;
                const hasActiveDoc = Boolean(activeEditor && activeEditor.document);

                const config = vscode.workspace.getConfiguration('antigravityFloatingDiff');
                const enabled = config.get<boolean>('enabled', true);
                const showReviewBar = config.get<boolean>('showReviewBar', true);
                const showDeletedLines = config.get<boolean>('showDeletedLines', true);
                const showFileNavigation = config.get<boolean>('showFileNavigation', true);
                const position = config.get<string>('position', 'bottom-center');
                const autoHideWhenClean = config.get<boolean>('autoHideWhenClean', true);

                const state: FloatingBarState = {
                    hasDiffs: total > 0 || hasActiveDoc,
                    currentFileIndex: currentIdx > 0 ? currentIdx : 1,
                    totalFiles: total > 0 ? total : 1,
                    activeFile: activeFile,
                    enabled: enabled,
                    showReviewBar: showReviewBar,
                    showDeletedLines: showDeletedLines,
                    showFileNavigation: showFileNavigation,
                    position: position,
                    autoHideWhenClean: autoHideWhenClean
                };

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(state));
                return;
            }

            if (req.url === '/action' && req.method === 'POST') {
                let body = '';
                req.on('data', chunk => {
                    body += chunk;
                });
                req.on('end', async () => {
                    try {
                        const parsed = JSON.parse(body || '{}');
                        await this.handleAction(parsed.action);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true }));
                    } catch (err: any) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: String(err) }));
                    }
                });
                return;
            }

            res.writeHead(404);
            res.end();
        });

        this._server.on('error', (err: any) => {
            if (err.code === 'EADDRINUSE') {
                // Port already occupied, trying secondary port
                this._port = 48766;
                this._server?.listen(this._port, '127.0.0.1');
            }
        });

        this._server.listen(this._port, '127.0.0.1');
    }

    private async handleAction(action: string): Promise<void> {
        switch (action) {
            case 'accept':
                try {
                    await vscode.commands.executeCommand('antigravity.prioritized.agentAcceptAllInFile');
                } catch {
                    await this._tracker.acceptCurrentFile();
                }
                break;
            case 'reject':
                try {
                    await vscode.commands.executeCommand('antigravity.prioritized.agentRejectAllInFile');
                } catch {
                    await this._tracker.rejectCurrentFile();
                }
                break;
            case 'previousHunk':
                try {
                    await vscode.commands.executeCommand('antigravity.prioritized.agentFocusPreviousHunk');
                } catch {
                    this._tracker.previousHunk();
                }
                break;
            case 'nextHunk':
                try {
                    await vscode.commands.executeCommand('antigravity.prioritized.agentFocusNextHunk');
                } catch {
                    this._tracker.nextHunk();
                }
                break;
            case 'previousFile':
                await this._tracker.previousFile();
                break;
            case 'nextFile':
                await this._tracker.nextFile();
                break;
            case 'selectFile':
                await this._tracker.selectFile();
                break;
            case 'sendProblemsToAgent':
                await ProblemsSender.sendToAgent();
                break;
        }
    }

    public dispose(): void {
        if (this._server) {
            this._server.close();
            this._server = null;
        }
    }
}
