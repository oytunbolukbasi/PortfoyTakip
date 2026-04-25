const fs = require('fs');
const { execSync } = require('child_process');

const date = new Date().toISOString().split('T')[0];
const hash = execSync('git log -1 --pretty=%h').toString().trim();
const msg = execSync('git log -1 --pretty=%B').toString().trim();

const entry = `## ${date} · ${hash}\n${msg}\n\n`;
const existing = fs.existsSync('VERSION_HISTORY.md')
    ? fs.readFileSync('VERSION_HISTORY.md', 'utf8') : '';

fs.writeFileSync('VERSION_HISTORY.md', entry + existing);
console.log('✓ VERSION_HISTORY.md güncellendi.');