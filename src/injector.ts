import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export class WorkbenchInjector {
    private static SCRIPT_NAME = 'antigravity-floating-bar.js';
    private static INJECTION_TAG = '<script src="./antigravity-floating-bar.js" type="module"></script>';

    private static getWorkbenchPaths(): { htmlPath: string; scriptDestPath: string; dirPath: string } | null {
        try {
            const appRoot = vscode.env.appRoot;
            if (!appRoot) {
                return null;
            }

            const dirPath = path.join(appRoot, 'out', 'vs', 'code', 'electron-browser', 'workbench');
            const htmlPath = path.join(dirPath, 'workbench.html');
            const scriptDestPath = path.join(dirPath, WorkbenchInjector.SCRIPT_NAME);

            if (fs.existsSync(htmlPath)) {
                return { htmlPath, scriptDestPath, dirPath };
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

                // Inject script tag before </body>
                if (html.includes('</body>')) {
                    html = html.replace('</body>', `\t${WorkbenchInjector.INJECTION_TAG}\n</body>`);
                } else {
                    html += `\n${WorkbenchInjector.INJECTION_TAG}\n`;
                }

                fs.writeFileSync(paths.htmlPath, html, 'utf8');
            }
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
            return true;
        } catch (err: any) {
            console.error('Failed to uninstall in-editor floating bar from workbench:', err);
            return false;
        }
    }
}
