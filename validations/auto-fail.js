exports.validate = async function(data) {
  console.error('Failing because we can');
  return {
    valid: false,
    message: "failure is always an option."
  }
}