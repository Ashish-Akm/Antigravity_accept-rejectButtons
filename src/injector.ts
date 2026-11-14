import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export class WorkbenchInjector {
    private static SCRIPT_NAME = 'antigravity-floating-bar.js';
    private static INJECTION_TAG = '<script src="./antigravity-floating-bar.js" type="module"></script>';
    private static HIDE_LINES_TARGET = 'hideDeletedLines:xa=>n.workspace.getConfiguration("files",xa).get("autoSave","off")!=="off"';
    private static HIDE_LINES_REPLACEMENT = 'hideDeletedLines:xa=>!1';

    private static getWorkbenchPaths(): { htmlPath: string; scriptDestPath: string; dirPath: string; agyExtPath: string } | null {
        try {
            const appRoot = vscode.env.appRoot;
            if (!appRoot) {
                return null;
            }

            const dirPath = path.join(appRoot, 'out', 'vs', 'code', 'electron-browser', 'workbench');
            const htmlPath = path.join(dirPath, 'workbench.html');
            const scriptDestPath = path.join(dirPath, WorkbenchInjector.SCRIPT_NAME);
            const agyExtPath = path.join(appRoot, 'extensions', 'agy', 'vscode', 'extension.js');

            if (fs.existsSync(htmlPath)) {
                return { htmlPath, scriptDestPath, dirPath, agyExtPath };
            }
        } catch {
            // Path resolution error fallback
        }
        return null;
    }

    public static async isInstalled(): Promise<boolean> {
        const paths = this.getWorkbenchPaths();
        if (!paths) {
            return false;
        }

        try {
            if (!fs.existsSync(paths.scriptDestPath)) {
                return false;
            }
            const html = fs.readFileSync(paths.htmlPath, 'utf8');
            return html.includes(WorkbenchInjector.SCRIPT_NAME);
        } catch {
            return false;
        }
    }

    public static async enableInlineRedLines(): Promise<boolean> {
        const paths = this.getWorkbenchPaths();
        if (!paths || !fs.existsSync(paths.agyExtPath)) {
            return false;
        }

        try {
            let content = fs.readFileSync(paths.agyExtPath, 'utf8');
            if (content.includes(WorkbenchInjector.HIDE_LINES_TARGET)) {
                // Backup before editing
                const backupPath = `${paths.agyExtPath}.antigravity-bak`;
                if (!fs.existsSync(backupPath)) {
                    fs.writeFileSync(backupPath, content, 'utf8');
                }
                content = content.replace(WorkbenchInjector.HIDE_LINES_TARGET, WorkbenchInjector.HIDE_LINES_REPLACEMENT);
                fs.writeFileSync(paths.agyExtPath, content, 'utf8');
                return true;
            }
            return true;
        } catch (err: any) {
            console.error('Failed to enable inline red deleted lines:', err);
            return false;
        }
    }

    public static async disableInlineRedLines(): Promise<boolean> {
        const paths = this.getWorkbenchPaths();
        if (!paths || !fs.existsSync(paths.agyExtPath)) {
            return false;
        }

        try {
            let content = fs.readFileSync(paths.agyExtPath, 'utf8');
            if (content.includes(WorkbenchInjector.HIDE_LINES_REPLACEMENT)) {
                content = content.replace(WorkbenchInjector.HIDE_LINES_REPLACEMENT, WorkbenchInjector.HIDE_LINES_TARGET);
                fs.writeFileSync(paths.agyExtPath, content, 'utf8');
                return true;
            }
            return true;
        } catch (err: any) {
            console.error('Failed to disable inline red deleted lines:', err);
            return false;
        }
    }

    public static async install(extensionContext: vscode.ExtensionContext): Promise<boolean> {
        const paths = this.getWorkbenchPaths();
        if (!paths) {
            return false;
        }

        try {
            const compiledRendererPath = path.join(extensionContext.extensionPath, 'dist', 'renderer.js');
            if (!fs.existsSync(compiledRendererPath)) {
                return false;
            }

            // 1. Copy renderer script to workbench directory
            fs.copyFileSync(compiledRendererPath, paths.scriptDestPath);

            // 2. Read workbench.html
            let html = fs.readFileSync(paths.htmlPath, 'utf8');
            if (!html.includes(WorkbenchInjector.SCRIPT_NAME)) {
                // Backup before injection
                const backupPath = `${paths.htmlPath}.antigravity-bak`;
                if (!fs.existsSync(backupPath)) {
                    fs.writeFileSync(backupPath, html, 'utf8');
                }

                // Inject script tag after workbench.js
                const tag = `\n${WorkbenchInjector.INJECTION_TAG}`;
                if (html.includes('<script src="./workbench.js" type="module"></script>')) {
                    html = html.replace('<script src="./workbench.js" type="module"></script>', `<script src="./workbench.js" type="module"></script>${tag}`);
                } else if (html.includes('</body>')) {
                    html = html.replace('</body>', `${tag}\n</body>`);
                } else {
                    html += `${tag}\n`;
                }

                fs.writeFileSync(paths.htmlPath, html, 'utf8');
            }

            // 2b. Also ensure workbench.js dynamically imports antigravity-floating-bar.js
            const jsPath = path.join(paths.dirPath, 'workbench.js');
            if (fs.existsSync(jsPath)) {
                let jsContent = fs.readFileSync(jsPath, 'utf8');
                if (!jsContent.includes('antigravity-floating-bar.js')) {
                    const jsBackup = `${jsPath}.antigravity-bak`;
                    if (!fs.existsSync(jsBackup)) {
                        fs.writeFileSync(jsBackup, jsContent, 'utf8');
                    }
                    jsContent += '\nimport("./antigravity-floating-bar.js").catch(console.error);\n';
                    fs.writeFileSync(jsPath, jsContent, 'utf8');
                }
            }

            // 3. Enable inline red lines for deleted code
            await WorkbenchInjector.enableInlineRedLines();

            return true;
        } catch (err: any) {
            console.error('Failed to install in-editor floating bar into workbench:', err);
            return false;
        }
    }

    public static async uninstall(): Promise<boolean> {
        const paths = this.getWorkbenchPaths();
        if (!paths) {
            return false;
        }

        try {
            if (fs.existsSync(paths.htmlPath)) {
                let html = fs.readFileSync(paths.htmlPath, 'utf8');
                if (html.includes(WorkbenchInjector.SCRIPT_NAME)) {
                    html = html.replace(new RegExp(`\\s*${WorkbenchInjector.INJECTION_TAG}`, 'g'), '');
                    fs.writeFileSync(paths.htmlPath, html, 'utf8');
                }
            }

            if (fs.existsSync(paths.scriptDestPath)) {
                fs.unlinkSync(paths.scriptDestPath);
            }

            // Restore inline diff handling
            await WorkbenchInjector.disableInlineRedLines();

            return true;
        } catch (err: any) {
            console.error('Failed to uninstall in-editor floating bar from workbench:', err);
            return false;
        }
    }
}
