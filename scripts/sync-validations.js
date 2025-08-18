#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const yaml = require('js-yaml');

// Configuration
const API_URL = 'https://api.durohub.com/graphql';
const API_KEY = process.env.DURO_LIBRARY_API_KEY;
const CONFIG_FILE = path.join(__dirname, '..', 'validations.yaml');

if (!API_KEY) {
  console.error('Error: DURO_LIBRARY_API_KEY environment variable is not set');
  process.exit(1);
}

// GraphQL queries and mutations
const queries = {
  listValidations: `
    query ListValidations {
      validations {
        list {
          edges {
            node {
              id
              name
              code
              description
              onFailure
              isActive
              version
            }
          }
        }
      }
    }
  `,
  
  createValidation: `
    mutation CreateValidation($input: CreateValidationRuleInput!) {
      validations {
        create(input: $input) {
          id
          name
        }
      }
    }
  `,
  
  updateValidation: `
    mutation UpdateValidation($id: ID!, $input: UpdateValidationRuleInput!) {
      validations {
        update(id: $id, input: $input) {
          id
          name
        }
      }
    }
  `,
  
};

// Make GraphQL request
async function graphqlRequest(query, variables = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query, variables });
    
    const options = {
      hostname: 'api.durohub.com',
      path: '/graphql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'x-api-key': API_KEY
      }
    };
    
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          if (parsed.errors) {
            reject(new Error(`GraphQL errors: ${JSON.stringify(parsed.errors)}`));
          } else {
            resolve(parsed.data);
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
    });
    
    req.on('error', (e) => {
      reject(new Error(`Request failed: ${e.message}`));
    });
    
    req.write(data);
    req.end();
  });
}

// Load and validate YAML configuration
function loadValidationConfig() {
  if (!fs.existsSync(CONFIG_FILE)) {
    throw new Error(`Configuration file not found: ${CONFIG_FILE}`);
  }
  
  const fileContents = fs.readFileSync(CONFIG_FILE, 'utf8');
  const config = yaml.load(fileContents);
  
  if (!config.validations || !Array.isArray(config.validations)) {
    throw new Error('Invalid configuration: "validations" must be an array');
  }
  
  // Validate each validation entry
  const validations = [];
  const seenNames = new Set();
  
  for (const validation of config.validations) {
    // Check required fields
    const requiredFields = ['name', 'description', 'version', 'isActive', 'onFailure', 'path'];
    for (const field of requiredFields) {
      if (validation[field] === undefined || validation[field] === null) {
        throw new Error(`Validation "${validation.name || 'unknown'}" is missing required field: ${field}`);
      }
    }
    
    // Check for duplicate names
    if (seenNames.has(validation.name)) {
      throw new Error(`Duplicate validation name: ${validation.name}`);
    }
    seenNames.add(validation.name);
    
    // Validate onFailure value
    const onFailureUpper = validation.onFailure.toUpperCase();
    if (!['ERROR', 'WARNING'].includes(onFailureUpper)) {
      throw new Error(`Invalid onFailure value for "${validation.name}": ${validation.onFailure}. Must be "error" or "warning"`);
    }
    
    // Check if validation file exists
    const filePath = path.join(__dirname, '..', validation.path);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Validation file not found for "${validation.name}": ${validation.path}`);
    }
    
    // Read the validation code
    const code = fs.readFileSync(filePath, 'utf8');
    
    // Validate the code exports a validate function
    if (!code.includes('exports.validate')) {
      throw new Error(`Validation file "${validation.path}" must export a validate function`);
    }
    
    validations.push({
      name: validation.name,
      code: code,
      description: validation.description,
      version: validation.version,
      isActive: validation.isActive,
      onFailure: onFailureUpper,
      path: validation.path
    });
  }
  
  return validations;
}

// Main sync function
async function syncValidations() {
  try {
    console.log('🔄 Starting validation sync...\n');
    
    // Load configuration
    console.log('📋 Loading validation configuration...');
    let localValidations;
    try {
      localValidations = loadValidationConfig();
      console.log(`   Loaded ${localValidations.length} validation configurations\n`);
    } catch (error) {
      console.error(`   ❌ Configuration error: ${error.message}`);
      process.exit(1);
    }
    
    // Get existing validations (library is resolved from API key)
    console.log('📋 Fetching existing validations from library...');
    const existingData = await graphqlRequest(queries.listValidations);
    
    const existingValidations = {};
    for (const edge of existingData.validations.list.edges) {
      existingValidations[edge.node.name] = edge.node;
    }
    console.log(`   Found ${Object.keys(existingValidations).length} existing validations\n`);
    
    // Track which validations are defined in config
    const configuredValidationNames = new Set(localValidations.map(v => v.name));
    
    // Sync each validation from config
    console.log('🚀 Syncing validations...\n');
    let created = 0;
    let updated = 0;
    let deactivated = 0;
    let errors = 0;
    
    // Process validations defined in config
    for (const validation of localValidations) {
      try {
        const existing = existingValidations[validation.name];
        
        if (existing) {
          // Check if update is needed
          const needsUpdate = 
            existing.code !== validation.code ||
            existing.description !== validation.description ||
            existing.onFailure !== validation.onFailure ||
            existing.isActive !== validation.isActive ||
            existing.version !== validation.version;
          
          if (needsUpdate) {
            console.log(`   📝 Updating: ${validation.name} (v${validation.version})`);
            await graphqlRequest(queries.updateValidation, {
              id: existing.id,
              input: {
                code: validation.code,
                description: validation.description,
                onFailure: validation.onFailure,
                isActive: validation.isActive,
                version: validation.version
              }
            });
            updated++;
          } else {
            console.log(`   ✓ Unchanged: ${validation.name} (v${validation.version})`);
          }
        } else {
          // Create new validation (library is resolved from API key)
          console.log(`   ✨ Creating: ${validation.name} (v${validation.version})`);
          await graphqlRequest(queries.createValidation, {
            input: {
              libraryId: '', // Empty string - will be overridden by API key context
              name: validation.name,
              code: validation.code,
              description: validation.description,
              onFailure: validation.onFailure,
              isActive: validation.isActive,
              type: 'custom',
              version: validation.version
            }
          });
          created++;
        }
      } catch (error) {
        console.error(`   ❌ Error syncing ${validation.name}: ${error.message}`);
        errors++;
      }
    }
    
    // Deactivate validations that exist in API but not in config (mirror sync)
    console.log('\n📋 Checking for orphaned validations...');
    for (const [name, validation] of Object.entries(existingValidations)) {
      if (!configuredValidationNames.has(name) && validation.isActive) {
        try {
          console.log(`   🔒 Deactivating: ${name} (not in config)`);
          await graphqlRequest(queries.updateValidation, {
            id: validation.id,
            input: {
              isActive: false
            }
          });
          deactivated++;
        } catch (error) {
          console.error(`   ❌ Error deactivating ${name}: ${error.message}`);
          errors++;
        }
      }
    }
    
    // Summary
    console.log('\n✅ Sync complete!\n');
    console.log(`   Created: ${created} validations`);
    console.log(`   Updated: ${updated} validations`);
    console.log(`   Deactivated: ${deactivated} validations`);
    if (errors > 0) {
      console.log(`   Errors: ${errors} validations failed to sync`);
      process.exit(1);
    }
    
    console.log('\n🎉 All validations synced successfully!');
    
  } catch (error) {
    console.error('\n❌ Sync failed:', error.message);
    process.exit(1);
  }
}

// Run the sync
syncValidations();