const fs = require('fs');
const path = require('path');

const dataFilePath = path.join(process.cwd(), "prisma", "data", "js-coding-questions.json");
console.log('Reading database json path:', dataFilePath);

const questions = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
console.log('Total questions loaded:', questions.length);

const stubs = [];
const basicSolutions = [];

for (const q of questions) {
  const code = q.examples && q.examples[0] ? q.examples[0].code : '';
  const answer = q.answer || '';
  
  const isStub = code.includes('return "Ready"') || code.includes('console.log("Ready")') || answer.includes('return "Ready"');
  // Or check if the code length is very small and doesn't cover edge cases
  const hasShortCode = code.length < 350;

  if (isStub) {
    stubs.push(q.title);
  } else if (hasShortCode) {
    basicSolutions.push({ title: q.title, len: code.length, code });
  }
}

console.log('STUBS COUNT:', stubs.length);
console.log('Stubs list:', stubs);

console.log('\nBASIC SOLUTIONS COUNT (code length < 200 chars):', basicSolutions.length);
basicSolutions.forEach(b => {
  console.log(`- ${b.title} (code length ${b.len}):\n${b.code}\n`);
});
