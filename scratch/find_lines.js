const fs = require('fs');
const content = fs.readFileSync('scripts/generate-js-coding-data.ts', 'utf8');
const lines = content.split('\n');

const targets = [
  "Flatten Array (Iterative)",
  "Array Chunking",
  "Array.prototype.map Polyfill",
  "Array.prototype.filter Polyfill",
  "Array.prototype.forEach Polyfill",
  "Zip Arrays",
  "Unzip Array",
  "Group By Utility",
  "Index By Utility",
  "Partition Array",
  "Find Last Element",
  "Array Shuffle (Fisher-Yates)",
  "Range Generator",
  "Move Zeroes to End",
  "Omit Object Properties",
  "Pick Object Properties",
  "Query String Generator",
  "JSON.parse Polyfill",
  "Invert Object Keys",
  "Clear Nullish Values",
  "Promise Timeout"
];

for (const target of targets) {
  const idx = lines.findIndex(l => l.includes(target));
  if (idx !== -1) {
    console.log(`- "${target}": line ${idx + 1}`);
  } else {
    console.log(`- "${target}": NOT FOUND`);
  }
}
