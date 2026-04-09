export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { formName, formNum, formCat, formDesc } = req.body;

  if (!formName) {
    return res.status(400).json({ error: 'Missing form details' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        stream: true,
        system: `You are a UK insolvency expert helping insolvency support staff understand documents and forms. Structure your response with exactly these headings on their own line followed by a colon:\nPURPOSE:\nWHEN IS IT USED:\nWHO FILES IT:\nKEY POINTS:\nCOMMON MISTAKES:\nUse plain text only. No markdown. Use numbered points (1. 2. 3.) for KEY POINTS and COMMON MISTAKES. 2-4 points each. Be concise and practical.`,
        messages: [
          {
            role: 'user',
            content: `Document: ${formNum} — ${formName}\nCategory: ${formCat}\nDescription: ${formDesc}\n\nExplain this document for insolvency support staff.`,
          },
        ],
      }),
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      res.write(chunk);
    }

    res.end();
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Failed to get explanation' });
  }
}
