// Read a legacy window.AP_MODULES data file and print it as JSON.
// Historical helper: it reads the old site's data files so the current
// content/modules/*.json can be traced back to their origin.
// Usage: node tools/legacy/read_source.js <file> <module-id>
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const file = process.argv[2];
const moduleId = process.argv[3];

const src = fs.readFileSync(file, 'utf8');
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(src, sandbox, { filename: file });
const mod = sandbox.window.AP_MODULES[moduleId];
if (!mod) {
  console.error('module not found: ' + moduleId);
  process.exit(1);
}
process.stdout.write(JSON.stringify(mod));
