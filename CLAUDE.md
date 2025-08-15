# Duro Custom Validations - Claude Code Guide

This guide helps you use Claude Code to generate custom validations for your Duro library.

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

Your validation receives:

### change_order object
- `id`: string - Unique identifier
- `name`: string - Change order name
- `description`: string - Description text
- `status`: string - Current status
- `libraryId`: string - Associated library ID

### components array
Each component has:
- `id`: string - Component ID
- `name`: string - Component name
- `status`: string - Component status (e.g., 'draft', 'approved')
- `quantity`: number - Quantity value
- Additional fields vary by component type

## Console Logging

All console outputs are captured:
- `console.info()` - Blue info messages
- `console.log()` - General logs
- `console.warn()` - Yellow warnings
- `console.error()` - Red error messages

## Example Prompts for Claude Code

### Basic Validations

**Prompt**: "Create a validation that rejects change orders with more than 100 items"

**Prompt**: "Create a validation that warns when components have quantities less than 1"

**Prompt**: "Create a validation that requires all components to have a status of 'approved'"

### Advanced Validations

**Prompt**: "Create a validation that checks if the total quantity across all components exceeds 1000 and blocks submission if it does"

**Prompt**: "Create a validation that ensures the change order name follows the pattern CO-YYYY-MM-DD"

**Prompt**: "Create a validation that warns if any component names contain special characters"

## Validation Patterns

### Checking Component Properties
```javascript
// Check all components have a specific property
const missingProperty = components.filter(c => !c.someProperty);
if (missingProperty.length > 0) {
  return {
    valid: false,
    message: `${missingProperty.length} components missing required property`
  };
}
```

### Aggregating Values
```javascript
// Sum quantities across components
const totalQuantity = components.reduce((sum, c) => sum + (c.quantity || 0), 0);
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
// Verify component statuses
const invalidStatuses = components.filter(c => 
  !['approved', 'released'].includes(c.status)
);
if (invalidStatuses.length > 0) {
  return {
    valid: false,
    message: `${invalidStatuses.length} components have invalid status`
  };
}
```

## Validation Modes

### ERROR Mode (Default)
Blocks change order submission:
```javascript
exports.validate = async function(data) {
  // Validation that prevents submission when failed
  return { valid: false, message: 'Cannot proceed' };
}
```

### WARNING Mode
Shows warning but allows submission:
```javascript
// @onFailure WARNING
exports.validate = async function(data) {
  // Validation that warns but doesn't block
  return { valid: false, message: 'Warning: Consider reviewing' };
}
```

## Common Use Cases

### 1. Quantity Validation
**Prompt**: "Create a validation that ensures all components have positive quantities"

### 2. Status Validation
**Prompt**: "Create a validation that blocks if any component is in 'draft' status"

### 3. Naming Convention
**Prompt**: "Create a validation that enforces change order names to start with 'ECO-'"

### 4. Count Limits
**Prompt**: "Create a validation that warns if there are more than 50 components"

### 5. Data Completeness
**Prompt**: "Create a validation that ensures all components have a description"

### 6. Business Rules
**Prompt**: "Create a validation that prevents submission on weekends"

### 7. Cross-Reference Checks
**Prompt**: "Create a validation that ensures no duplicate component names"

## Tips for Claude Code

1. **Be Specific**: Describe exactly what should trigger the validation
2. **Specify Mode**: Mention if it should be a warning or error
3. **Provide Context**: Explain the business reason if relevant
4. **Include Examples**: Give example data that should pass/fail
5. **Request Logging**: Ask for console logging for debugging

## Example Full Prompt

"Create a validation called 'check-critical-components' that:
1. Looks for components with 'CRITICAL' in their name
2. Ensures all critical components have quantity > 0
3. Ensures all critical components have status 'approved'
4. Uses console.info to log how many critical components were found
5. Returns an error if any critical component fails the checks
6. Include a clear message explaining which components failed"

## Debugging Tips

1. Use console logging liberally:
```javascript
console.info(`Checking ${components.length} components`);
console.log('Component statuses:', components.map(c => c.status));
```

2. Test with edge cases:
- Empty components array
- Missing properties
- Null/undefined values

3. Provide clear error messages:
```javascript
return {
  valid: false,
  message: `Component "${component.name}" (ID: ${component.id}) has invalid quantity: ${component.quantity}`
};
```

## File Naming Convention

The filename becomes the validation name:
- `check-quantities.js` → "check-quantities"
- `enforce-naming.js` → "enforce-naming"
- Use lowercase with hyphens
- Be descriptive but concise

## Remember

- Validations run in an isolated environment
- No network access or file system access
- 30-second execution timeout
- All validations are rerun when change orders are validated
- Keep validations focused on a single concern