exports.validate = async function(data) {
  const webhookUrl = 'https://durolabs.app.n8n.cloud/webhook/0582aba8-3ab0-4676-a162-77e7c563c7cf';

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      console.error(`AI summary service returned status: ${response.status}`);
      console.info('Validation passing without summary due to service error');
      return {
        valid: true,
        message: 'AI summary service unavailable, proceeding without summary'
      };
    }

    const result = await response.json();

    // Handle OpenAI response format from n8n
    const summaryText = result.summary ||
                       (result.message && result.message.content) ||
                       (result[0] && result[0].message && result[0].message.content);

    if (summaryText) {
      console.info('AI Summary:');
      console.info(summaryText);

      return {
        valid: true,
        message: summaryText
      };
    } else {
      console.info('No summary provided by AI service');
      return {
        valid: true,
        message: 'AI summary service did not provide a summary'
      };
    }

  } catch (error) {
    console.error('Error calling AI summary service:', error.message);
    console.info('Validation passing despite service error');

    return {
      valid: true,
      message: 'AI summary service error occurred, proceeding without summary'
    };
  }
}
