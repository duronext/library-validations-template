#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const VALIDATIONS_DIR = path.join(__dirname, '..', 'validations');

console.log('🔍 Validating syntax of all validation files...\n');

let hasErrors = false;

// Check if validations directory exists
if (!fs.existsSync(VALIDATIONS_DIR)) {
  console.error('❌ No validations directory found');
  process.exit(1);
}

// Get all .js files in validations directory
const files = fs.readdirSync(VALIDATIONS_DIR).filter(f => f.endsWith('.js'));

if (files.length === 0) {
  console.log('⚠️  No validation files found');
  process.exit(0);
}

console.log(`Found ${files.length} validation file(s)\n`);

for (const file of files) {
  const filePath = path.join(VALIDATIONS_DIR, file);
  process.stdout.write(`  Checking ${file}... `);
  
  try {
    const code = fs.readFileSync(filePath, 'utf8');
    
    // Check for syntax errors
    new vm.Script(code);
    
    // Check if exports.validate exists
    const sandbox = { exports: {} };
    const script = new vm.Script(code);
    const context = vm.createContext(sandbox);
    script.runInContext(context);
    
    if (!sandbox.exports.validate) {
      console.log('❌ Missing exports.validate function');
      hasErrors = true;
      continue;
    }
    
    if (typeof sandbox.exports.validate !== 'function') {
      console.log('❌ exports.validate is not a function');
      hasErrors = true;
      continue;
    }
    
    console.log('✅');
    
  } catch (error) {
    console.log(`❌ ${error.message}`);
    hasErrors = true;
  }
}

console.log('\n' + '━'.repeat(50));

if (hasErrors) {
  console.log('\n❌ Validation syntax check failed');
  console.log('   Please fix the errors above before committing');
  process.exit(1);
} else {
  console.log('\n✅ All validations passed syntax check!');
}