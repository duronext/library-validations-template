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

### 3. Create Your First Validation

Create a new JavaScript file in the `validations/` directory:

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

Your validation receives a `data` object with:

```javascript
{
  change_order: {
    id: string,
    name: string,
    description: string,
    status: string,
    libraryId: string
  },
  components: [
    {
      id: string,
      name: string,
      // ... other component fields
    }
  ]
}
```

### Console Logging

All console outputs are captured and displayed in validation results:

- `console.info()` - Informational messages
- `console.log()` - General logging
- `console.warn()` - Warnings
- `console.error()` - Error messages

### File Naming

The filename (without `.js`) becomes the validation name:
- `validations/check-quantities.js` → Validation name: "check-quantities"
- `validations/enforce-naming-convention.js` → Validation name: "enforce-naming-convention"

## 🔄 How Syncing Works

1. **On Push to Main**: GitHub Actions triggers the sync workflow
2. **List Existing**: Fetches all current validations from your library
3. **Compare**: Matches local files with existing validations by name
4. **Upsert**: Updates existing validations or creates new ones
5. **Activate**: All synced validations are set to active

## ⚙️ Validation Settings

Default settings for all validations:
- **Type**: `custom`
- **onFailure**: `ERROR` (blocks submission)
- **isActive**: `true`
- **Version**: `1.0.0`

To use WARNING mode (non-blocking), add a comment at the top of your file:
```javascript
// @onFailure WARNING
exports.validate = async function(data) {
  // This validation will show warnings but won't block submission
}
```

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

```javascript
// validations/enforce-naming-convention.js
// @onFailure WARNING
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
- File is in `validations/` directory
- File has `.js` extension
- File exports a `validate` function
- Push was to the `main` branch

## 📖 Resources

- [Duro API Documentation](https://api.durohub.com/graphql)
- [Custom Validations Guide](https://docs.durohub.com/validations)
- [GitHub Actions Documentation](https://docs.github.com/actions)

## License

This template is provided as-is for Duro customers to manage their custom validations.
