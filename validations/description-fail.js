exports.validate = async function(data) {
  const { change_order } = data;
  const descriptionHasFail = change_order.description && change_order.description.toLowerCase().includes('fail');

  if( !descriptionHasFail ) {
    console.info('No "fail" phrase detected in change order description');
    return {
      valid: true,
      message: `failure is always an option when describing "failure" in a change order: ${change_order.description} - please verify this is intended `
    }
  }
  console.error('Failing because we can');
  return {
    valid: false,
    message: `failure is always an option when describing "failure" in a change order: ${change_order.description} - please verify this is intended `
  }
}