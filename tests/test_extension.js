const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');

test('Test 1: Package.json configuration & commands integrity', (t) => {
    const pkgPath = path.join(PROJECT_ROOT, 'package.json');
    assert.ok(fs.existsSync(pkgPath), 'package.json must exist');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

    assert.strictEqual(pkg.name, 'antigravity-accept-reject-buttons');
    assert.ok(pkg.contributes, 'Must have contributes section');
    assert.ok(Array.isArray(pkg.contributes.commands), 'Must contribute commands array');

    const expectedCommands = [
        'antigravityFloatingDiff.acceptChanges',
        'antigravityFloatingDiff.rejectChanges',
        'antigravityFloatingDiff.previousHunk',
        'antigravityFloatingDiff.nextHunk',
        'antigravityFloatingDiff.previousFile',
        'antigravityFloatingDiff.nextFile',
        'antigravityFloatingDiff.toggleBar',
        'antigravityFloatingDiff.testReviewBar'
    ];

    const actualCommands = pkg.contributes.commands.map(c => c.command);
    for (const cmd of expectedCommands) {
        assert.ok(actualCommands.includes(cmd), `Command ${cmd} must be registered in package.json`);
    }

    // Keybindings check
    const keybindings = pkg.contributes.keybindings.map(k => k.command);
    assert.ok(keybindings.includes('antigravityFloatingDiff.acceptChanges'), 'Accept changes must have keybinding');
    assert.ok(keybindings.includes('antigravityFloatingDiff.rejectChanges'), 'Reject changes must have keybinding');
});

test('Test 2: Compiled bundle exists and is valid CommonJS', (t) => {
    const bundlePath = path.join(PROJECT_ROOT, 'dist', 'extension.js');
    assert.ok(fs.existsSync(bundlePath), 'dist/extension.js must exist');
    const content = fs.readFileSync(bundlePath, 'utf8');

    assert.ok(content.length > 1000, 'Bundle must not be empty');
    assert.ok(content.includes('activate'), 'Bundle must export activate');
    assert.ok(content.includes('deactivate'), 'Bundle must export deactivate');
    assert.ok(content.includes('antigravityFloatingDiff.acceptChanges'), 'Bundle must include accept command');
});

test('Test 3: Git Porcelain parser simulation', (t) => {
    const mockPorcelain = [
        ' M src/extension.ts',
        'M  package.json',
        'MM README.md',
        '?? new_file.txt',
        ' D deleted.ts'
    ].join('\n');

    const modifiedFiles = [];
    const lines = mockPorcelain.trim().split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        const spaceIdx = trimmed.indexOf(' ');
        if (spaceIdx > 0) {
            const status = trimmed.slice(0, spaceIdx);
            const filePath = trimmed.slice(spaceIdx + 1).trim();
            if (status.includes('M') || status.includes('A') || status.includes('?')) {
                modifiedFiles.push(filePath);
            }
        }
    }

    assert.strictEqual(modifiedFiles.length, 4, 'Should identify 4 modified/untracked files');
    assert.deepStrictEqual(modifiedFiles, ['src/extension.ts', 'package.json', 'README.md', 'new_file.txt']);
});

test('Test 4: Git unified diff chunk regex parsing', (t) => {
    const mockDiff = `
diff --git a/test.py b/test.py
index abc..def 100644
--- a/test.py
+++ b/test.py
@@ -10,3 +10,6 @@ def example():
+    print("new line 1")
+    print("new line 2")
+    print("new line 3")
@@ -45 +48,2 @@ def second():
+    return True
`;

    const hunks = [];
    const regex = /@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/g;
    let match;
    while ((match = regex.exec(mockDiff)) !== null) {
        const startLine = parseInt(match[3], 10);
        const lineCount = match[4] ? parseInt(match[4], 10) : 1;
        hunks.push({ startLine, lineCount });
    }

    assert.strictEqual(hunks.length, 2, 'Should parse 2 distinct hunks');
    assert.strictEqual(hunks[0].startLine, 10);
    assert.strictEqual(hunks[0].lineCount, 6);
    assert.strictEqual(hunks[1].startLine, 48);
    assert.strictEqual(hunks[1].lineCount, 2);
});

test('Test 5: File cycling wrap-around math', (t) => {
    const totalFiles = 3;
    let currentIdx = 0;

    // Next file forward
    currentIdx = (currentIdx + 1) % totalFiles;
    assert.strictEqual(currentIdx, 1);
    currentIdx = (currentIdx + 1) % totalFiles;
    assert.strictEqual(currentIdx, 2);
    currentIdx = (currentIdx + 1) % totalFiles;
    assert.strictEqual(currentIdx, 0, 'Should wrap around to 0 on next file');

    // Previous file backward
    currentIdx = (currentIdx - 1 + totalFiles) % totalFiles;
    assert.strictEqual(currentIdx, 2, 'Should wrap around to 2 on previous file');
});
