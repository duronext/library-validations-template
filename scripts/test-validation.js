#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Get validation file from command line
const validationFile = process.argv[2];

if (!validationFile) {
  console.error('Usage: npm test <validation-file>');
  console.error('Example: npm test validations/example-validation.js');
  process.exit(1);
}

// Read validation file
const filePath = path.resolve(validationFile);
if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

const code = fs.readFileSync(filePath, 'utf8');

// Mock console for capturing logs
const logs = {
  info: [],
  log: [],
  warn: [],
  error: []
};

const mockConsole = {
  info: (...args) => {
    console.info(...args);
    logs.info.push(args.join(' '));
  },
  log: (...args) => {
    console.log(...args);
    logs.log.push(args.join(' '));
  },
  warn: (...args) => {
    console.warn(...args);
    logs.warn.push(args.join(' '));
  },
  error: (...args) => {
    console.error(...args);
    logs.error.push(args.join(' '));
  }
};

// Test data
const testData = {
  change_order: {
    id: 'test-co-001',
    name: 'TEST-CO-2024-01',
    description: 'Test change order for validation testing',
    status: 'draft',
    libraryId: 'test-library-001'
  },
  components: [
    {
      id: 'comp-001',
      name: 'Test Component 1',
      status: 'approved',
      quantity: 10
    },
    {
      id: 'comp-002',
      name: 'Test Component 2',
      status: 'draft',
      quantity: 0
    },
    {
      id: 'comp-003',
      name: 'Test Component 3',
      status: 'approved',
      quantity: 5
    }
  ]
};

async function testValidation() {
  console.log('🧪 Testing validation:', path.basename(validationFile));
  console.log('━'.repeat(50));
  
  try {
    // Create sandbox context
    const sandbox = {
      exports: {},
      console: mockConsole,
      data: testData,
      setTimeout,
      setInterval,
      clearTimeout,
      clearInterval
    };
    
    // Execute validation code
    const script = new vm.Script(code);
    const context = vm.createContext(sandbox);
    script.runInContext(context);
    
    // Check if validate function exists
    if (!sandbox.exports.validate) {
      throw new Error('Validation must export a validate function');
    }
    
    // Run validation
    console.log('\n📊 Test Data:');
    console.log(`   Change Order: ${testData.change_order.name}`);
    console.log(`   Components: ${testData.components.length} items`);
    console.log(`   Component statuses: ${testData.components.map(c => c.status).join(', ')}`);
    console.log(`   Component quantities: ${testData.components.map(c => c.quantity).join(', ')}`);
    
    console.log('\n🔄 Running validation...\n');
    const result = await sandbox.exports.validate(testData);
    
    console.log('\n' + '━'.repeat(50));
    console.log('📋 Validation Result:');
    console.log(`   Valid: ${result.valid ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Message: ${result.message || '(no message)'}`);
    
    if (logs.info.length > 0 || logs.log.length > 0 || logs.warn.length > 0 || logs.error.length > 0) {
      console.log('\n📝 Captured Logs:');
      if (logs.info.length > 0) console.log(`   Info: ${logs.info.length} messages`);
      if (logs.log.length > 0) console.log(`   Log: ${logs.log.length} messages`);
      if (logs.warn.length > 0) console.log(`   Warn: ${logs.warn.length} messages`);
      if (logs.error.length > 0) console.log(`   Error: ${logs.error.length} messages`);
    }
    
    console.log('\n✅ Validation executed successfully!');
    
  } catch (error) {
    console.error('\n❌ Validation test failed:');
    console.error(`   ${error.message}`);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

testValidation();