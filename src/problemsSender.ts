import * as vscode from 'vscode';

export interface ProblemReport {
    formatted: string;
    totalErrors: number;
    totalWarnings: number;
}

export class ProblemsSender {
    public static collectWorkspaceProblems(): ProblemReport {
        const allDiagnostics = vscode.languages.getDiagnostics();
        let totalErrors = 0;
        let totalWarnings = 0;
        const fileSections: string[] = [];

        for (const [uri, diags] of allDiagnostics) {
            if (!diags || diags.length === 0) continue;

            const fsPath = uri.fsPath;
            if (fsPath.includes('node_modules') || fsPath.includes('/.git/') || fsPath.endsWith('.git')) {
                continue;
            }

            const relevant = diags.filter(
                d => d.severity === vscode.DiagnosticSeverity.Error || d.severity === vscode.DiagnosticSeverity.Warning
            );
            if (relevant.length === 0) continue;

            const relPath = vscode.workspace.asRelativePath(uri);
            const lines: string[] = [];

            for (const diag of relevant) {
                const isError = diag.severity === vscode.DiagnosticSeverity.Error;
                if (isError) {
                    totalErrors++;
                } else {
                    totalWarnings++;
                }
                const typeStr = isError ? 'Error' : 'Warning';
                const codeStr = diag.code ? ` [code: ${typeof diag.code === 'object' ? diag.code.value : diag.code}]` : '';
                const line = diag.range.start.line + 1;
                const col = diag.range.start.character + 1;
                lines.push(`  - [${typeStr}] [Line ${line}, Col ${col}]${codeStr}: ${diag.message}`);
            }

            fileSections.push(`### \`${relPath}\` (${relevant.length} issues):\n${lines.join('\n')}`);
        }

        if (fileSections.length === 0) {
            return {
                formatted: '@current_problems: No compilation errors or warnings detected in workspace.',
                totalErrors: 0,
                totalWarnings: 0
            };
        }

        const summary = `@current_problems (${totalErrors} Errors, ${totalWarnings} Warnings detected across ${fileSections.length} files)\n\n${fileSections.join('\n\n')}`;
        return {
            formatted: summary,
            totalErrors,
            totalWarnings
        };
    }

    public static async sendToAgent(): Promise<boolean> {
        const report = this.collectWorkspaceProblems();

        // 1. Copy formatted report to clipboard for convenience
        try {
            await vscode.env.clipboard.writeText(report.formatted);
        } catch {
            // Clipboard fallback
        }

        // 2. Open Chat Panel and pre-fill or focus query
        try {
            // Try standard VS Code / Antigravity chat command
            await vscode.commands.executeCommand('workbench.action.chat.open', {
                query: report.formatted
            });
        } catch {
            try {
                await vscode.commands.executeCommand('antigravity.chat.open', {
                    query: report.formatted
                });
            } catch {
                try {
                    await vscode.commands.executeCommand('workbench.action.quickchat.toggle');
                } catch {
                    // Chat commands fallback
                }
            }
        }

        vscode.window.showInformationMessage(
            `@current_problems: Copied ${report.totalErrors} errors & ${report.totalWarnings} warnings to clipboard and opened Agent Chat.`
        );
        return true;
    }
}

