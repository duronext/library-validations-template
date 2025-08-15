// @description Example validation that demonstrates the validation structure
// @onFailure WARNING

/**
 * Example validation that checks for items with zero quantity
 * This is a WARNING validation - it won't block submission
 */
exports.validate = async function(data) {
  const { change_order, components } = data;
  
  console.info(`Validating change order: ${change_order.name}`);
  console.log(`Checking ${components.length} components for zero quantities`);
  
  // Find components with zero or missing quantity
  const zeroQuantityItems = components.filter(component => {
    return !component.quantity || component.quantity === 0;
  });
  
  if (zeroQuantityItems.length > 0) {
    const itemNames = zeroQuantityItems
      .slice(0, 5) // Show first 5 items
      .map(c => c.name || c.id)
      .join(', ');
    
    const message = zeroQuantityItems.length > 5
      ? `${zeroQuantityItems.length} items have zero quantity (showing first 5): ${itemNames}, ...`
      : `${zeroQuantityItems.length} items have zero quantity: ${itemNames}`;
    
    console.warn(`Found ${zeroQuantityItems.length} items with zero quantity`);
    
    return {
      valid: false,
      message: message
    };
  }
  
  console.info('All items have valid quantities');
  
  return {
    valid: true,
    message: 'All components have valid quantities'
  };
}