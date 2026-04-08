# Rich Validation Data Structure

This document describes the complete data structure available to custom validations after the Phoenix enhancement.

## Complete Data Structure

```javascript
{
  change_order: {
    // Basic Information
    id: string,                    // UUID of the change order
    name: string,                  // Name/title of the change order
    description: string,           // Detailed description (nullable)
    status: string,                // 'draft' | 'open' | 'resolved' | 'closed' | 'on_hold'
    resolution: string,            // 'pending' | 'approved' | 'rejected' | 'withdrawn'
    libraryId: string,             // UUID of the library
    isValid: boolean,              // Current validation state
    
    // Timestamps
    createdAt: Date,               // ISO timestamp when created
    updatedAt: Date,               // ISO timestamp when last updated
    
    // User Information
    createdBy: {
      id: string,                  // User UUID
      name: string,                // User's display name
      primaryEmail: string         // User's email address
    },
    updatedBy: {
      id: string,                  // User UUID
      name: string,                // User's display name
      primaryEmail: string         // User's email address
    },
    
    // Dynamic Content Fields (Custom form fields)
    contents: [
      {
        id: string,                // Field UUID
        name: string,              // Internal field name
        label: string,             // Display label
        values: [string],          // Current values
        order: number,             // Display order
        isRequired: boolean,       // Whether field is required
        placeholder: string,       // Placeholder text
        description: string,       // Help text
        min: number,               // Minimum value/length
        max: number,               // Maximum value/length
        pattern: string,           // Regex validation pattern
        listOptions: [string],     // Options for list fields
        type: string,              // 'text' | 'longtext' | 'number' | 'date' | 'list' | 'currency'
        multipleSelect: boolean,   // For list fields
        groupName: string          // Group for organizing fields
      }
    ],
    
    // Approval Stages
    stages: [
      {
        id: string,                // Stage UUID
        name: string,              // Stage name
        order: number,             // Processing order
        decisionState: string,     // 'pending' | 'approved' | 'rejected'
        decisionMethod: string,    // 'unanimous' | 'majority' | 'minimum'
        decisionMinimumCount: number, // For 'minimum' method
        
        // Stage Reviewers
        reviewers: [
          {
            id: string,            // Reviewer assignment UUID
            decisionState: string, // 'pending' | 'approved' | 'rejected'
            note: string,          // Reviewer's note
            decidedAt: Date,       // When decision was made
            user: {
              id: string,          // User UUID
              name: string,        // User's display name
              primaryEmail: string // User's email
            }
          }
        ],
        
        // Notification List
        notifyList: [
          {
            id: string,            // Notification entry UUID
            email: string,         // Email address (if not user)
            user: {                // User details (if user)
              id: string,
              name: string,
              primaryEmail: string
            }
          }
        ]
      }
    ]
  },
  
  // Items array - combines change order item data with component information
  items: [
    {
      // Change order item fields
      id: string,                  // Change order item UUID
      itemId: string,              // Component UUID
      itemVersion: number,         // Version being changed
      proposedRevision: string,    // New revision value
      proposedStatusId: string,    // New status UUID
      
      // Component data
      name: string,                // Component name
      description: string,         // Component description
      type: string,                // Component type
      eid: string,                 // External ID
      
      // Status Information
      statusId: string,            // Current status UUID
      status: {
        id: string,                // Status UUID
        name: string,              // Status name
        mapsTo: string,            // Maps to standard status
        color: string              // Display color
      },
      
      // Category Information
      categoryId: string,          // Category UUID
      category: {
        id: string,                // Category UUID
        name: string,              // Category name
        attributes: [              // NEW: attribute definitions
          {
            id: string,            // Attribute UUID
            name: string,          // Human-readable name (e.g., "Manufacturer")
            type: string,          // STRING, NUMBER, URL, EMAIL, PHONE, DATE, BOOLEAN, LIST, etc.
            source: string,        // USER, SYSTEM, or INTEGRATION
            sourceKey: string,     // System key (e.g., "cost", "mass") or null for user attrs
            unit: string           // Default unit (e.g., "g", "USD") or null
          }
        ]
      },
      
      // Version and Revision
      version: number,             // Version number
      revisionValue: string,       // Current revision (e.g., "A", "B", "1.0")
      revisionType: string,        // 'REV' | 'VER'
      state: string,               // 'RELEASED' | 'MODIFIED'
      
      // Timestamps
      releasedAt: Date,            // When component was released
      createdAt: Date,             // When component was created
      updatedAt: Date,             // When component was last updated
      
      // Custom Attributes (Legacy — UUID-keyed, backward compatible)
      attributeValues: {          // Key-value pairs of custom attributes
        [key: string]: any
      },

      // Human-readable Attributes (NEW)
      // Name-keyed map — all category attributes included, null if unset
      attributes: {
        [attributeName: string]: any  // Key is attribute name, not UUID
        // Simple types: unwrapped primitive (e.g., "Acme Co", true, 42)
        // Measured numbers: { value: string, unit: string } (e.g., { value: "25", unit: "g" })
        // Currency: { value: number, unit: string } (e.g., { value: 42.50, unit: "USD" })
        // Unset: null
      },
      
      // Proposed status details
      proposedStatus: {
        id: string,                // Status UUID
        name: string               // Status name
      }
    }
  ]
}
```

## Status Values Reference

### Change Order Status
- `draft` - Initial state, editable and not submitted
- `open` - Submitted for review, in approval process
- `resolved` - Approval process complete
- `closed` - Finalized and no longer active
- `on_hold` - Temporarily paused

### Change Order Resolution
- `pending` - No decision made yet
- `approved` - Change order approved
- `rejected` - Change order rejected
- `withdrawn` - Change order withdrawn by submitter

### Stage Decision State
- `pending` - Awaiting reviewer decisions
- `approved` - Stage approved based on decision method
- `rejected` - Stage rejected based on decision method

### Stage Decision Method
- `unanimous` - All reviewers must approve
- `majority` - More than 50% must approve
- `minimum` - Minimum number must approve (see decisionMinimumCount)

### Reviewer Decision State
- `pending` - No decision yet
- `approved` - Reviewer approved
- `rejected` - Reviewer rejected

### Component State
- `RELEASED` - Component is released
- `MODIFIED` - Component has been modified

### Content Field Types
- `text` - Short text input
- `longtext` - Multi-line text
- `number` - Numeric value
- `date` - Date picker
- `list` - Dropdown or multi-select
- `currency` - Currency amount

## Example Validations Using Rich Data

### 1. Validate Based on Reviewer Count
```javascript
exports.validate = async function(data) {
  const { change_order } = data;
  
  // Check if all stages have at least 2 reviewers
  for (const stage of change_order.stages || []) {
    if (!stage.reviewers || stage.reviewers.length < 2) {
      return {
        valid: false,
        message: `Stage "${stage.name}" requires at least 2 reviewers`
      };
    }
  }
  
  return { valid: true };
}
```

### 2. Validate Custom Content Fields
```javascript
exports.validate = async function(data) {
  const { change_order } = data;
  
  // Find the "cost_impact" field
  const costField = change_order.contents?.find(c => c.name === 'cost_impact');
  
  if (costField && costField.values?.[0]) {
    const cost = parseFloat(costField.values[0]);
    if (cost > 10000) {
      // Require VP approval for high cost changes
      const hasVPStage = change_order.stages?.some(s => 
        s.name.toLowerCase().includes('vp')
      );
      
      if (!hasVPStage) {
        return {
          valid: false,
          message: 'Changes over $10,000 require VP approval stage'
        };
      }
    }
  }
  
  return { valid: true };
}
```

### 3. Validate Component Status Transitions
```javascript
exports.validate = async function(data) {
  const { items } = data;
  
  for (const item of items) {
    // Check if trying to change a released component without proper revision
    if (item.state === 'RELEASED' && item.proposedRevision) {
      const currentRev = item.revisionValue;
      const proposedRev = item.proposedRevision;
      
      // Ensure revision is incremented
      if (currentRev && proposedRev && proposedRev <= currentRev) {
        return {
          valid: false,
          message: `Component ${item.name}: New revision must be greater than ${currentRev}`
        };
      }
    }
    
    // Don't allow changing obsolete components
    if (item.status?.name === 'Obsolete') {
      return {
        valid: false,
        message: `Cannot modify obsolete component: ${item.name}`
      };
    }
  }
  
  return { valid: true };
}
```

### 4. Validate Based on User Permissions
```javascript
exports.validate = async function(data) {
  const { change_order } = data;
  
  // Check if user is trying to self-approve
  const creatorId = change_order.createdBy?.id;
  
  for (const stage of change_order.stages || []) {
    const selfReviewing = stage.reviewers?.some(r => 
      r.user?.id === creatorId
    );
    
    if (selfReviewing) {
      return {
        valid: false,
        message: 'Change order creator cannot be a reviewer'
      };
    }
  }
  
  return { valid: true };
}
```

### 5. Validate Required Content Fields
```javascript
exports.validate = async function(data) {
  const { change_order } = data;
  
  // Check all required fields have values
  for (const field of change_order.contents || []) {
    if (field.isRequired && (!field.values || field.values.length === 0)) {
      return {
        valid: false,
        message: `Required field "${field.label}" is empty`
      };
    }
    
    // Validate against patterns
    if (field.pattern && field.values?.[0]) {
      const regex = new RegExp(field.pattern);
      if (!regex.test(field.values[0])) {
        return {
          valid: false,
          message: `Field "${field.label}" doesn't match required format`
        };
      }
    }
    
    // Validate min/max
    if (field.type === 'number' && field.values?.[0]) {
      const value = parseFloat(field.values[0]);
      if (field.min !== undefined && value < field.min) {
        return {
          valid: false,
          message: `Field "${field.label}" is below minimum value of ${field.min}`
        };
      }
      if (field.max !== undefined && value > field.max) {
        return {
          valid: false,
          message: `Field "${field.label}" exceeds maximum value of ${field.max}`
        };
      }
    }
  }
  
  return { valid: true };
}
```

### 6. Validate Based on Component Attributes
```javascript
exports.validate = async function(data) {
  const { items } = data;
  
  for (const item of items) {
    // Access attributes by name — no UUID lookups needed
    const manufacturer = item.attributes['Manufacturer'];
    const supportPhone = item.attributes['Support Phone'];
    
    // Example: Acme Co parts must have a support phone
    if (manufacturer === 'Acme Co' && !supportPhone) {
      return {
        valid: false,
        message: `${item.name}: Acme Co parts require a Support Phone number`
      };
    }
    
    // Example: Check measured values
    const mass = item.attributes['Mass'];
    if (mass && parseFloat(mass.value) > 1000) {
      console.warn(`${item.name} exceeds 1kg: ${mass.value}${mass.unit}`);
    }
    
    // Example: Iterate all attributes to find missing required ones
    const requiredAttrs = ['Manufacturer', 'Part Number'];
    for (const attrName of requiredAttrs) {
      if (item.attributes[attrName] === null) {
        return {
          valid: false,
          message: `${item.name} is missing required attribute: ${attrName}`
        };
      }
    }
  }
  
  return { valid: true, message: 'All attribute checks passed' };
}
```

### 7. Complex Business Rule Validation
```javascript
exports.validate = async function(data) {
  const { change_order, items } = data;
  
  // Complex rule: High-value changes need special approval
  const totalValue = items.reduce((sum, item) => {
    const costObj = item.attributes?.['Cost'];
    const unitCost = typeof costObj === 'object' ? costObj?.value || 0 : costObj || 0;
    const quantity = item.attributes?.['Quantity'] || 0;
    return sum + (unitCost * quantity);
  }, 0);
  
  console.info(`Total change value: $${totalValue}`);
  
  if (totalValue > 50000) {
    // Check for executive approval stage
    const hasExecApproval = change_order.stages?.some(stage => 
      stage.name.toLowerCase().includes('executive') &&
      stage.decisionMethod === 'unanimous'
    );
    
    if (!hasExecApproval) {
      return {
        valid: false,
        message: `Changes over $50,000 require unanimous executive approval`
      };
    }
    
    // Ensure at least 3 executives are reviewing
    const execStage = change_order.stages?.find(s => 
      s.name.toLowerCase().includes('executive')
    );
    
    if (!execStage || !execStage.reviewers || execStage.reviewers.length < 3) {
      return {
        valid: false,
        message: 'High-value changes require at least 3 executive reviewers'
      };
    }
  }
  
  return { valid: true };
}
```

## Benefits of Rich Data

With this enhanced data structure, validations can now:

1. **Validate Approval Workflows** - Check reviewer assignments, decision methods, and stage configuration
2. **Enforce Business Rules** - Use custom content fields to enforce complex business logic
3. **Validate Status Transitions** - Ensure proper component lifecycle management
4. **Check User Permissions** - Prevent self-approval and enforce separation of duties
5. **Validate Custom Attributes** - Enforce requirements on component-specific data
6. **Implement Complex Logic** - Combine multiple data points for sophisticated validations
7. **Provide Better Context** - Give users detailed feedback about what needs to be fixed

## Migration Notes

Existing validations will continue to work as they only use the fields they need. New validations can gradually adopt the additional fields as needed.

The enhanced payload is backwards compatible - validations expecting only basic fields will ignore the additional data.