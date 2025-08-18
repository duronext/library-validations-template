# Duro Library Custom Validations

Manage your Duro library's custom validations through Git. Write, test, and deploy validation rules using your preferred editor, with automatic syncing to your Duro library.

## 🚀 Quick Start

### 1. Fork or Use This Template

Click "Use this template" on GitHub to create your own repository, or fork this repository to your account.

### 2. Set Up Your API Key

1. Get your Library API key from Duro
2. Add it as a GitHub repository secret:
   - Go to Settings → Secrets and variables → Actions
   - Create a new secret named `DURO_LIBRARY_API_KEY`
   - Paste your API key value

**Note**: The API key automatically provides library context - validations will be synced to the library associated with your API key.

### 3. Configure Your Validations

Edit the `validations.yaml` file to define your validations:

```yaml
validations:
  - name: "reject-draft-components"
    description: "Blocks submission if draft components exist"
    version: "1.0.0"
    isActive: true
    onFailure: error  # or warning
    path: validations/reject-draft-components.js
```

Then create the corresponding JavaScript file:

```javascript
// validations/reject-draft-components.js
exports.validate = async function(data) {
  const { change_order, components } = data;
  
  console.info('Checking for draft components...');
  
  const draftComponents = components.filter(c => c.status === 'draft');
  
  if (draftComponents.length > 0) {
    console.error(`Found ${draftComponents.length} draft components`);
    return {
      valid: false,
      message: `Cannot submit with ${draftComponents.length} draft components`
    };
  }
  
  console.info('No draft components found');
  return { valid: true };
}
```

### 4. Push to Deploy

```bash
git add validations/reject-draft-components.js
git commit -m "Add validation to reject draft components"
git push origin main
```

Your validation will automatically sync to your Duro library within minutes!

## 📁 Repository Structure

```
your-validations-repo/
├── validations/           # Your custom validation files
│   ├── example.js
│   └── your-validation.js
├── scripts/               # Sync utilities (don't modify)
│   └── sync-validations.js
├── .github/workflows/     # GitHub Actions (don't modify)
│   └── sync-validations.yml
├── validations.yaml      # Validation configuration
├── README.md             # This file
├── CLAUDE.md             # AI assistance guide
└── package.json
```

## ✍️ Writing Validations

### Validation Structure

Each validation must export a `validate` function:

```javascript
exports.validate = async function(data) {
  // Your validation logic here
  
  // Return format:
  return {
    valid: true,           // or false
    message: 'Optional message explaining the result'
  };
}
```

### Available Data

Your validation receives a rich `data` object with comprehensive information:

```javascript
{
  change_order: {
    // Basic fields
    id: string,           // Unique identifier (UUID)
    name: string,         // Change order name/title
    description: string,  // Detailed description (can be null)
    status: string,       // 'draft' | 'open' | 'resolved' | 'closed' | 'on_hold'
    resolution: string,   // 'pending' | 'approved' | 'rejected' | 'withdrawn'
    libraryId: string,    // Library identifier (UUID)
    isValid: boolean,     // Current validation state
    
    // Timestamps & users
    createdAt: Date,
    updatedAt: Date,
    createdBy: { id, name, primaryEmail },
    updatedBy: { id, name, primaryEmail },
    
    // Custom fields & approval stages (if configured)
    contents: [...],      // Dynamic form fields
    stages: [...]         // Approval workflow stages with reviewers
  },
  items: [
    {
      // Change order item fields
      id: string,           // Change order item ID
      itemId: string,       // Component ID
      itemVersion: number,  // Version being changed
      proposedRevision: string,    // New revision
      proposedStatusId: string,    // New status ID
      
      // Component data
      name: string,
      description: string,
      type: string,
      
      // Status & category
      status: { id, name, mapsTo, color },
      category: { id, name },
      
      // Version control
      version: number,
      revisionValue: string,
      state: 'RELEASED' | 'MODIFIED',
      
      // Proposed changes
      proposedStatus: { id, name },
      
      // Custom attributes
      attributeValues: { ... }
    }
  ]
}
```

**See [RICH_VALIDATION_DATA.md](./RICH_VALIDATION_DATA.md) for complete data structure and advanced examples.**

#### Quick Status Reference
- **Change Order Status**: `draft`, `open`, `resolved`, `closed`, `on_hold`
- **Resolution**: `pending`, `approved`, `rejected`, `withdrawn`
- **Component State**: `RELEASED`, `MODIFIED`

### Console Logging

All console outputs are captured and displayed in validation results:

- `console.info()` - Informational messages
- `console.log()` - General logging
- `console.warn()` - Warnings
- `console.error()` - Error messages

### Validation Configuration

Validations are configured in `validations.yaml`. Each entry defines:
- `name`: Unique identifier for the validation
- `description`: Human-readable description
- `version`: Semantic version for tracking changes
- `isActive`: Enable/disable the validation
- `onFailure`: How to handle failures (`error` or `warning`)
- `path`: Path to the JavaScript file

Validation files can be organized in subdirectories:
- `validations/core/check-quantities.js`
- `validations/custom/enforce-naming.js`

## 🔄 How Syncing Works

1. **On Push to Main**: GitHub Actions triggers the sync workflow
2. **Library Context**: Uses your API key to determine the target library
3. **Read Config**: Loads validation definitions from `validations.yaml`
4. **Validate**: Ensures all referenced files exist and are valid
5. **List Existing**: Fetches all current validations from your library
6. **Compare**: Matches configured validations with existing ones by name
7. **Sync**:
   - Creates new validations defined in config
   - Updates existing validations if changed
   - Deactivates API validations not in config (mirror sync)
8. **Version Tracking**: Updates are made when version or content changes

## ⚙️ Validation Settings

All validation settings are managed in `validations.yaml`:

```yaml
validations:
  - name: "validation-name"
    description: "What this validation checks"
    version: "1.0.0"        # Semantic versioning
    isActive: true          # Enable/disable
    onFailure: error        # error = blocks, warning = non-blocking
    path: validations/file.js
```

### Version Management
Increment the version when making changes:
- **Patch** (1.0.1): Bug fixes, minor tweaks
- **Minor** (1.1.0): New features, non-breaking changes
- **Major** (2.0.0): Breaking changes

### Mirror Sync Behavior
Validations that exist in the API but not in `validations.yaml` will be:
- Set to `isActive: false` (deactivated)
- Never deleted (preserving history)

## 🧪 Testing Locally

Install dependencies and test your validations:

```bash
npm install
npm test validations/your-validation.js
```

## 🤖 AI Assistance

Use Claude Code to generate validations! See [CLAUDE.md](./CLAUDE.md) for examples and prompts.

## 📚 Examples

### Check Item Quantities

First, add to `validations.yaml`:
```yaml
- name: "check-quantities"
  description: "Ensures all items have valid quantities"
  version: "1.0.0"
  isActive: true
  onFailure: error
  path: validations/check-quantities.js
```

Then create the validation:
```javascript
// validations/check-quantities.js
exports.validate = async function(data) {
  const { components } = data;
  
  const invalidQuantities = components.filter(c => 
    !c.quantity || c.quantity <= 0
  );
  
  if (invalidQuantities.length > 0) {
    const names = invalidQuantities.map(c => c.name).join(', ');
    return {
      valid: false,
      message: `Invalid quantities for: ${names}`
    };
  }
  
  return { valid: true };
}
```

### Enforce Naming Convention

Add to `validations.yaml`:
```yaml
- name: "enforce-naming-convention"
  description: "Warns if naming convention not followed"
  version: "1.0.0"
  isActive: true
  onFailure: warning  # Non-blocking
  path: validations/enforce-naming-convention.js
```

Create the validation:
```javascript
// validations/enforce-naming-convention.js
exports.validate = async function(data) {
  const { change_order } = data;
  
  const pattern = /^[A-Z]{2,4}-\d{4}-\d{2}$/;
  
  if (!pattern.test(change_order.name)) {
    return {
      valid: false,
      message: 'Change order name should follow pattern: XX-YYYY-MM'
    };
  }
  
  return { valid: true };
}
```

### Limit Total Items

Add to `validations.yaml`:
```yaml
- name: "limit-total-items"
  description: "Limits maximum number of items"
  version: "1.0.0"
  isActive: true
  onFailure: error
  path: validations/limit-total-items.js
```

Create the validation:
```javascript
// validations/limit-total-items.js
exports.validate = async function(data) {
  const { components } = data;
  const MAX_ITEMS = 100;
  
  console.info(`Checking item count: ${components.length}/${MAX_ITEMS}`);
  
  if (components.length > MAX_ITEMS) {
    console.error(`Too many items: ${components.length}`);
    return {
      valid: false,
      message: `Cannot exceed ${MAX_ITEMS} items (found ${components.length})`
    };
  }
  
  return { valid: true };
}
```

## 🔒 Security

- Your API key is stored securely as a GitHub secret
- Validations run in an isolated sandbox environment
- No access to file system or external resources
- Maximum execution time: 30 seconds

## 🐛 Troubleshooting

### Sync Failed

Check the Actions tab in GitHub for error details. Common issues:
- Invalid API key
- Syntax errors in validation files
- Network connectivity issues

### Validation Not Running

Ensure:
- Validation is defined in `validations.yaml`
- `isActive` is set to `true`
- File path in config is correct
- File exports a `validate` function
- Push was to the `main` branch
- No syntax errors in YAML config

## 📖 Resources

- [Duro API Documentation](https://api.durohub.com/graphql)
- [Custom Validations Guide](https://docs.durohub.com/validations)
- [GitHub Actions Documentation](https://docs.github.com/actions)

## License

This template is provided as-is for Duro customers to manage their custom validations.
