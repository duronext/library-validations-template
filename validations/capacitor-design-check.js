exports.validate = async function(data) {
  const { change_order, items } = data;

  // Check for capacitors in Design status (case-insensitive)
  const capacitorsInDesign = items.filter(item => {
    const isCapacitor = item.category && item.category.name && 
                       item.category.name.toLowerCase() === 'capacitor';
    const isInDesignStatus = item.status && item.status.name && 
                            item.status.name.toLowerCase() === 'design';
    
    if (isCapacitor && isInDesignStatus) {
      console.error(`Found capacitor in Design status: "${item.name}" (ID: ${item.id})`);
      return true;
    }
    return false;
  });

  if (capacitorsInDesign.length > 0) {
    const itemNames = capacitorsInDesign.map(item => item.name).join(', ');
    return {
      valid: false,
      message: `Found ${capacitorsInDesign.length} capacitor(s) in Design status: ${itemNames}. Capacitors must not be in Design status.`
    };
  }

  return {
    valid: true,
    message: 'No capacitors found in Design status'
  };
}