// Read a legacy window.AP_MODULES data file and print it as JSON.
// Used by tools/verify_content.py to compare the source banks with
// the JSON content in content/.
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
