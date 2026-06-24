const fs = require('fs');
const content = fs.readFileSync('scripts/generate-js-coding-data.ts', 'utf8');
const q = JSON.parse(fs.readFileSync('prisma/data/js-coding-questions.json', 'utf8'));

const basic = q.filter(x => x.examples[0].code.length < 350);
const inSolutionsMap = [];
const staticBasic = [];

for (const item of basic) {
  if (content.includes(`"${item.title}": {`)) {
    inSolutionsMap.push(item.title);
  } else {
    staticBasic.push(item.title);
  }
}

console.log('In SOLUTIONS_MAP:', inSolutionsMap.length);
console.log(JSON.stringify(inSolutionsMap, null, 2));

console.log('\nStatic / In QUESTIONS array:', staticBasic.length);
console.log(JSON.stringify(staticBasic, null, 2));
