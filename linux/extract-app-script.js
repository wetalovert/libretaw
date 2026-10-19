// Pulls the application's main script out of web/index.html into a build folder for the tests.
const fs = require('fs'), path = require('path');
const [, , htmlPath, outPath] = process.argv;
const html = fs.readFileSync(htmlPath, 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, scripts[scripts.length - 1]);
console.log('app script extracted: ' + outPath);
