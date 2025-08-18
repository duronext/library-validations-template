exports.validate = async function(data) {
  const { change_order } = data;
  
  // Check if "test" appears in name or description (case-insensitive)
  const nameContainsTest = change_order.name && change_order.name.toLowerCase().includes('test');
  const descriptionContainsTest = change_order.description && change_order.description.toLowerCase().includes('test');
  
  if (nameContainsTest || descriptionContainsTest) {
    const locations = [];
    if (nameContainsTest) locations.push('name');
    if (descriptionContainsTest) locations.push('description');
    
    console.warn(`Warning: "test" phrase detected in change order ${locations.join(' and ')}`);
    
    return {
      valid: false,
      message: `Change order contains "test" in ${locations.join(' and ')} - please verify this is intended`
    };
  }
  
  console.info('No test phrases detected in change order');
  
  return {
    valid: true,
    message: 'No test phrases found'
  };
}