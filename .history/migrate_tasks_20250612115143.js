const fs = require('fs');
const content = fs.readFileSync('task_categories_table.md', 'utf8');
const lines = content.split('\n');
const out = [];
let inTable = false;
for (const line of lines) {
  if (line.trim().startsWith('| Category | Task | Status |')) {
    out.push('| Category | Task | Status | Effort | Criticality |');
    inTable = true;
    continue;
  }
  if (line.trim().startsWith('|----------')) {
    out.push('|----------|------|--------|--------|-------------|');
    continue;
  }
  if (inTable && line.trim().startsWith('|') && line.split('|').length === 5) {
    out.push(line.trim().slice(0, -1) + ' 5 | 2 |');
    continue;
  }
  out.push(line);
}
const final = out.join('\n');
console.log('Copy the following command and run it in your browser console:');
console.log('localStorage.setItem("markdownContent", `'+final.replace(/`/g,'\\`')+'`);'); 