exports.validate = async function(data) {
  const { change_order, components } = data;

  const capacitors = components.filter(component => {
    return component.category && 
           component.category.name && 
           component.category.name.toLowerCase().includes('capacitor');
  });

  if (capacitors.length > 0) {
    console.info(`Found ${capacitors.length} capacitor component(s) in change order`);
    
    const capacitorNames = capacitors.map(c => c.name).join(', ');
    
    return {
      valid: false,
      message: `Change order contains ${capacitors.length} capacitor component(s): ${capacitorNames}. Capacitors are not allowed.`
    };
  }

  return {
    valid: true,
    message: 'No capacitor components found'
  };
}