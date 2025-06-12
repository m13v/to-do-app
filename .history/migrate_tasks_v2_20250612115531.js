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
  // Data row: 4 columns (| ... | ... | ... | ... |)
  if (inTable && line.trim().startsWith('|') && line.split('|').length === 6) {
    // Remove trailing '|' and add default Effort/Criticality
    out.push(line.trim().slice(0, -1) + ' 5 | 2 |');
    continue;
  }
  out.push(line);
}
const final = '# Task Categories Table\n\n' + out.join('\n');
console.log('localStorage.setItem("markdownContent", `'+final.replace(/`/g,'\\`')+'`);'); 