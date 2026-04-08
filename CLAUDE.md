# Duro Custom Validations - Claude Code Guide

This guide helps you use Claude Code to generate custom validations for your Duro library.

## IMPORTANT: Configuration Required

**All validations must be:**
1. **Defined in `validations.yaml`** - Configure metadata
2. **Created in the `validations/` directory** - JavaScript code

When creating a new validation:
1. Add an entry to `validations.yaml`
2. Create the corresponding `.js` file at the specified path

Example workflow:
```yaml
# In validations.yaml
validations:
  - name: "Reject: Do Not Ship"
    description: "Blocks items marked as do-not-ship"
    version: "1.0.0"
    isActive: true
    onFailure: error
    path: validations/reject-do-not-ship.js
```

Then create: `validations/reject-do-not-ship.js`

## Validation Structure

All validations must follow this structure:

```javascript
exports.validate = async function(data) {
  const { change_order, components } = data;

  // Your validation logic here

  return {
    valid: boolean,        // true if validation passes, false if it fails
    message: string        // Explanation of the result
  };
}
```

## Available Data

Your validation receives a rich data structure with comprehensive information:

### change_order object
Core fields:
- `id`: string - Unique identifier (UUID)
- `name`: string - Change order name/title
- `description`: string - Description text (can be null)
- `status`: string - Current status ('draft', 'open', 'resolved', 'closed', 'on_hold')
- `resolution`: string - Resolution state ('pending', 'approved', 'rejected', 'withdrawn')
- `libraryId`: string - Associated library ID (UUID)
- `isValid`: boolean - Current validation state

Additional rich data:
- `createdAt/updatedAt`: Date - Timestamps
- `createdBy/updatedBy`: Object - User info with id, name, primaryEmail
- `contents`: Array - Custom form fields with values, validation rules
- `stages`: Array - Approval stages with reviewers and notification lists

### items array
Each item combines change order item data with component information:
- `id`: string - Change order item ID
- `itemId`: string - Component ID (UUID)
- `itemVersion`: number - Version being changed
- `proposedRevision`: string - New revision value
- `proposedStatusId`: string - New status ID
- `proposedStatus`: Object - New status with id, name
- `name`: string - Component name
- `description`: string - Component description
- `type`: string - Component type
- `eid`: string - External ID
- `status`: Object - Current status with id, name, mapsTo, color
- `statusId`: string - Current status ID
- `category`: Object - Category with id, name
- `category.attributes`: Array - Attribute definitions for this category. Each entry has: id, name, type, source, sourceKey, unit
- `categoryId`: string - Category ID
- `version`: number - Component version number
- `revisionValue`: string - Current revision (e.g., "A", "B")
- `revisionType`: string - 'REV' or 'VER'
- `state`: string - 'RELEASED' or 'MODIFIED'
- `releasedAt`: Date - When component was released
- `createdAt`: Date - When component was created
- `updatedAt`: Date - When component was last updated
- `attributeValues`: Object - Custom attributes as key-value pairs (UUID-keyed, backward compatible)
- `attributes`: Object - **Human-readable attribute values keyed by name** (e.g., `item.attributes['Manufacturer']`). All category attributes are included; unset ones are `null`. Simple values are unwrapped primitives. Measured values are `{ value, unit }`. Currency values are `{ value, unit }`.

**See [RICH_VALIDATION_DATA.md](./RICH_VALIDATION_DATA.md) for complete structure and advanced validation examples.**

## Accessing Component Attributes

Each item has two ways to access attribute data:

### By Name (Recommended)
```javascript
// Direct access by attribute name — clean and readable
const manufacturer = item.attributes['Manufacturer'];        // "Acme Co" or null
const mass = item.attributes['Mass'];                        // { value: "25", unit: "g" } or null
const cost = item.attributes['Cost'];                        // { value: 42.50, unit: "USD" } or null
const phone = item.attributes['Support Phone'];              // "+1-555-0123" or null
```

### By UUID (Legacy)
```javascript
// Raw storage format — UUIDs as keys, wrapped values
const value = item.attributeValues['149521a0-...']?.value;   // requires knowing the UUID
```

### Checking Attribute Definitions
```javascript
// See what attributes exist on the category
for (const attr of item.category.attributes) {
  console.info(`${attr.name} (${attr.type}): ${JSON.stringify(item.attributes[attr.name])}`);
}
```

### Value Shapes by Type

| Attribute Type | Example `item.attributes['Name']` |
|---------------|-----------------------------------|
| STRING, URL, EMAIL, PHONE, DATE, BOOLEAN | `"Acme Co"` (unwrapped primitive) |
| NUMBER (simple) | `42` (unwrapped number) |
| NUMBER (measured — mass, length) | `{ value: "25", unit: "g" }` |
| NUMBER (currency) | `{ value: 42.50, unit: "USD" }` |
| LIST | `"Each"` (unwrapped string) |
| Unset | `null` |

## Console Logging

All console outputs are captured:
- `console.info()` - Blue info messages
- `console.log()` - General logs
- `console.warn()` - Yellow warnings
- `console.error()` - Red error messages

## Linking Components in Messages (Recommended)

Duro supports a **markdown-inspired syntax** for creating clickable links in validation messages. When you reference components, change orders, or users in your logs, use this syntax to make them clickable in the Duro UI.

### Syntax Format
```
[display text](protocol:type/id)
```

### Supported Link Types

| Entity | Syntax | Example |
|--------|--------|---------|
| Component | `[text](item:component/id)` | `[CAP-001](item:component/abc-123)` |
| Assembly | `[text](item:assembly/id)` | `[Main Assembly](item:assembly/xyz-789)` |
| PCBA | `[text](item:pcba/id)` | `[Board Rev A](item:pcba/pcb-456)` |
| Change Order | `[text](co:changeorder/id)` | `[ECO-2024-001](co:changeorder/co-123)` |
| User | `[text](user:profile/id)` | `[John Smith](user:profile/user-456)` |
| Library | `[text](lib:library/id)` | `[Main Library](lib:library/lib-789)` |

### Helper Functions

Create these helper functions in your validation for clean, consistent links:

```javascript
// Helper to create component links
function componentLink(item) {
  const display = item.name || item.eid || item.itemId;
  return `[${display}](item:component/${item.itemId})`;
}

// Helper to create change order links
function changeOrderLink(changeOrder) {
  const display = changeOrder.name || changeOrder.id;
  return `[${display}](co:changeorder/${changeOrder.id})`;
}

// Helper to create user links
function userLink(user) {
  return `[${user.name}](user:profile/${user.id})`;
}
```

### Example: Logging Components with Links

**Before (plain text):**
```javascript
console.error(`Component ${item.name} has invalid quantity`);
```

**After (with clickable links):**
```javascript
const link = `[${item.name}](item:component/${item.itemId})`;
console.error(`Component ${link} has invalid quantity`);
```

### Complete Validation Example with Links

```javascript
exports.validate = async function(data) {
  const { change_order, items } = data;

  // Helper function for component links
  function componentLink(item) {
    const display = item.name || item.eid || item.itemId;
    return `[${display}](item:component/${item.itemId})`;
  }

  const invalidItems = [];

  for (const item of items) {
    if (!item.description || item.description.trim() === '') {
      invalidItems.push(item);
      // Log with clickable link
      console.error(`${componentLink(item)} is missing a description`);
    }
  }

  if (invalidItems.length > 0) {
    // Create linked list in error message
    const linkedNames = invalidItems
      .map(item => componentLink(item))
      .join(', ');

    return {
      valid: false,
      message: `${invalidItems.length} components missing descriptions: ${linkedNames}`
    };
  }

  console.info('All components have descriptions');
  return { valid: true, message: 'Description check passed' };
}
```

### Best Practices for Linked Messages

1. **Always link components** - When referencing a component, use the link syntax so users can click to navigate
2. **Use descriptive display text** - Show the component name/CPN rather than just the ID
3. **Keep messages readable** - Links should read naturally even as plain text
4. **Format status with markdown** - Use `**BOLD**` for emphasis: `**RELEASED**`
5. **Combine multiple links** - You can have multiple links in one message

```javascript
// Good: Multiple links in one message
console.error(
  `Item ${componentLink(item)} conflicts with change order ${changeOrderLink(existingCO)}`
);

// Good: Bold formatting for status
console.info(`Component ${componentLink(item)} is **${item.status.name.toUpperCase()}**`);
```

### Fallback Behavior

Messages with links remain fully readable as plain text. If the UI doesn't support link parsing, users will see:
```
[CAP-001](item:component/abc-123) is missing a description
```
Which is still informative, just not clickable.

## Example Prompts for Claude Code

### Basic Validations

**Prompt**: "Create a validation called 'max-items' that rejects change orders with more than 100 items"

**Prompt**: "Create a validation called 'quantity-check' that warns when components have quantities less than 1"

**Prompt**: "Create a validation called 'require-approved' that requires all components to have a status of 'approved'"

**Note**: Always specify the validation name in your prompt. Claude Code will:
1. Add the configuration to `validations.yaml`
2. Create the JavaScript file at the specified path

### Advanced Validations

**Prompt**: "Create a validation that checks if the total quantity across all components exceeds 1000 and blocks submission if it does"

**Prompt**: "Create a validation that ensures the change order name follows the pattern CO-YYYY-MM-DD"

**Prompt**: "Create a validation that warns if any component names contain special characters"

## Validation Patterns

### Helper Function (Use in All Validations)
```javascript
// Add this helper at the top of your validation
function componentLink(item) {
  const display = item.name || item.eid || item.itemId;
  return `[${display}](item:component/${item.itemId})`;
}
```

### Checking Component Properties
```javascript
// Check all items have a specific property
const missingProperty = items.filter(item => !item.someProperty);
if (missingProperty.length > 0) {
  // Log each with clickable link
  missingProperty.forEach(item => {
    console.error(`${componentLink(item)} is missing required property`);
  });
  return {
    valid: false,
    message: `${missingProperty.length} components missing required property: ${missingProperty.map(componentLink).join(', ')}`
  };
}
```

### Aggregating Values
```javascript
// Sum quantities across items
const totalQuantity = items.reduce((sum, item) => sum + (item.attributes?.['Quantity'] || 0), 0);
if (totalQuantity > MAX_ALLOWED) {
  return {
    valid: false,
    message: `Total quantity ${totalQuantity} exceeds maximum ${MAX_ALLOWED}`
  };
}
```

### Pattern Matching
```javascript
// Check naming conventions
const pattern = /^[A-Z]{2}-\d{4}$/;
if (!pattern.test(change_order.name)) {
  return {
    valid: false,
    message: 'Name must follow pattern: XX-9999'
  };
}
```

### Status Checks
```javascript
// Verify item statuses with linked output
const invalidStatuses = items.filter(item =>
  !['approved', 'released'].includes(item.status?.name?.toLowerCase())
);
if (invalidStatuses.length > 0) {
  invalidStatuses.forEach(item => {
    console.error(`${componentLink(item)} has invalid status: **${item.status?.name || 'none'}**`);
  });
  return {
    valid: false,
    message: `${invalidStatuses.length} components have invalid status: ${invalidStatuses.map(componentLink).join(', ')}`
  };
}
```

## Validation Modes

Validation modes are configured in `validations.yaml`:

### ERROR Mode
Blocks change order submission:
```yaml
onFailure: error  # Blocks submission
```

### WARNING Mode
Shows warning but allows submission:
```yaml
onFailure: warning  # Non-blocking
```

The JavaScript code is the same regardless of mode:
```javascript
exports.validate = async function(data) {
  // Mode is controlled by YAML config
  return { valid: false, message: 'Validation message' };
}
```

## Common Use Cases

### 1. Quantity Validation
**Prompt**: "Create a validation called 'positive-quantities' that ensures all components have positive quantities"

### 2. Status Validation
**Prompt**: "Create a validation called 'no-draft-status' that blocks if any component is in 'draft' status"

### 3. Naming Convention
**Prompt**: "Create a validation called 'eco-prefix' that enforces change order names to start with 'ECO-', use warning mode"

### 4. Count Limits
**Prompt**: "Create a validation called 'component-limit' version 2.0.0 that warns if there are more than 50 components"

### 5. Data Completeness
**Prompt**: "Create a validation called 'require-descriptions' that ensures all components have a description"

### 6. Business Rules
**Prompt**: "Create a validation called 'manufacturer-check' that blocks submission if any component from manufacturer 'Acme Co' is missing a Support Phone attribute"

### 7. Cross-Reference Checks
**Prompt**: "Create a validation called 'unique-names' that ensures no duplicate component names"

## Tips for Claude Code

1. **Specify Name**: Always include the validation name in your prompt
2. **Specify Mode**: Mention if it should be a warning or error
3. **Specify Version**: Optionally specify version (defaults to "1.0.0")
4. **Be Specific**: Describe exactly what should trigger the validation
5. **Provide Context**: Explain the business reason if relevant
6. **Include Examples**: Give example data that should pass/fail
7. **Request Logging**: Ask for console logging for debugging
8. **Use Component Links**: Always use `[name](item:component/id)` syntax when referencing components in logs and messages

Claude Code will automatically:
- Update `validations.yaml` with your configuration
- Create the JavaScript file at the specified path
- Set appropriate metadata based on your requirements
- **Use markdown-link syntax for component references in logs and error messages**

## Example Full Prompt

"Create a validation called 'check-critical-components' version 1.0.0 that:
1. Looks for components with 'CRITICAL' in their name
2. Ensures all critical components have quantity > 0
3. Ensures all critical components have status 'approved'
4. Uses console.info to log how many critical components were found
5. Uses error mode to block submission if any critical component fails
6. Include a clear message explaining which components failed
7. Add appropriate description in the YAML config"

## Debugging Tips

1. Use console logging with **component links** for clickable navigation:
```javascript
function componentLink(item) {
  return `[${item.name || item.itemId}](item:component/${item.itemId})`;
}

console.info(`Checking ${items.length} components`);
console.log(`Processing ${componentLink(item)}`);
```

2. Test with edge cases:
- Empty items array
- Missing properties
- Null/undefined values

3. Provide clear error messages **with links**:
```javascript
const link = `[${item.name}](item:component/${item.itemId})`;
return {
  valid: false,
  message: `Component ${link} has invalid quantity: ${item.attributeValues?.quantity}`
};
```

## Configuration & File Organization

### YAML Configuration
The validation name is defined in `validations.yaml`:
```yaml
- name: "check-quantities"  # This is the validation name
  path: validations/check-quantities.js
```

### File Organization
- Files can be in subdirectories: `validations/core/check.js`
- Use lowercase with hyphens for file names
- Be descriptive but concise
- **ALWAYS ensure the path in YAML matches the actual file location**

### Version Management
Track changes with semantic versioning:
```yaml
version: "1.2.3"  # major.minor.patch
```

## Remember

- Validations run in an isolated environment
- No network access or file system access
- 30-second execution timeout
- All validations are rerun when change orders are validated
- Keep validations focused on a single concern
