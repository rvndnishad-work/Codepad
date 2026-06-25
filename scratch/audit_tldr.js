const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../prisma/data');
const files = fs.readdirSync(dir).filter(f => /^angular-augments-gold-.*\.ts$/.test(f)).sort();

for (const f of files) {
  const content = fs.readFileSync(path.join(dir, f), 'utf8');
  // Count matches of "TL;DR"
  const count = (content.match(/TL;DR/gi) || []).length;
  console.log(`${f}: found ${count} occurrences of TL;DR`);
  
  // Print a few sample lines if found
  if (count > 0) {
    const lines = content.split('\n');
    let matchedLines = 0;
    for (const line of lines) {
      if (line.includes('TL;DR')) {
        console.log(`  Line: ${line.trim()}`);
        matchedLines++;
        if (matchedLines >= 2) break;
      }
    }
  }
}
