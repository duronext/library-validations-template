#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const API_URL = 'https://api.durohub.com/graphql';
const API_KEY = process.env.DURO_LIBRARY_API_KEY;
const VALIDATIONS_DIR = path.join(__dirname, '..', 'validations');

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

// Read all validation files
function readValidationFiles() {
  const validations = [];
  
  if (!fs.existsSync(VALIDATIONS_DIR)) {
    console.log('No validations directory found');
    return validations;
  }
  
  const files = fs.readdirSync(VALIDATIONS_DIR);
  
  for (const file of files) {
    if (path.extname(file) !== '.js') {
      continue;
    }
    
    const filePath = path.join(VALIDATIONS_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const name = path.basename(file, '.js');
    
    // Parse @onFailure directive if present
    let onFailure = 'ERROR';
    const onFailureMatch = content.match(/\/\/\s*@onFailure\s+(WARNING|ERROR)/i);
    if (onFailureMatch) {
      onFailure = onFailureMatch[1].toUpperCase();
    }
    
    // Parse @description directive if present
    let description = `Custom validation: ${name}`;
    const descriptionMatch = content.match(/\/\/\s*@description\s+(.+)/i);
    if (descriptionMatch) {
      description = descriptionMatch[1].trim();
    }
    
    validations.push({
      name,
      code: content,
      description,
      onFailure,
      file
    });
  }
  
  return validations;
}

// Main sync function
async function syncValidations() {
  try {
    console.log('🔄 Starting validation sync...\n');
    
    // Get existing validations (library is resolved from API key)
    console.log('📋 Fetching existing validations from library...');
    const existingData = await graphqlRequest(queries.listValidations);
    
    const existingValidations = {};
    for (const edge of existingData.validations.list.edges) {
      existingValidations[edge.node.name] = edge.node;
    }
    console.log(`   Found ${Object.keys(existingValidations).length} existing validations\n`);
    
    // Read local validation files
    console.log('📁 Reading local validation files...');
    const localValidations = readValidationFiles();
    console.log(`   Found ${localValidations.length} local validations\n`);
    
    // Sync each validation
    console.log('🚀 Syncing validations...\n');
    let created = 0;
    let updated = 0;
    let errors = 0;
    
    for (const validation of localValidations) {
      try {
        const existing = existingValidations[validation.name];
        
        if (existing) {
          // Update existing validation
          console.log(`   📝 Updating: ${validation.name}`);
          await graphqlRequest(queries.updateValidation, {
            id: existing.id,
            input: {
              code: validation.code,
              description: validation.description,
              onFailure: validation.onFailure,
              isActive: true
            }
          });
          updated++;
        } else {
          // Create new validation (library is resolved from API key)
          console.log(`   ✨ Creating: ${validation.name}`);
          await graphqlRequest(queries.createValidation, {
            input: {
              name: validation.name,
              code: validation.code,
              description: validation.description,
              onFailure: validation.onFailure,
              isActive: true,
              type: 'custom',
              version: '1.0.0'
            }
          });
          created++;
        }
      } catch (error) {
        console.error(`   ❌ Error syncing ${validation.name}: ${error.message}`);
        errors++;
      }
    }
    
    // Summary
    console.log('\n✅ Sync complete!\n');
    console.log(`   Created: ${created} validations`);
    console.log(`   Updated: ${updated} validations`);
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