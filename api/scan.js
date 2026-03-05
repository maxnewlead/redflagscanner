export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { image } = req.body;
  if (!image) return res.status(400).json({ error: 'No image provided' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: `You are RedFlagScanner, a brutally honest AI dating coach. Analyze screenshots of dating app conversations or text messages. Respond ONLY with valid JSON, no markdown, no backticks. Format:
{
  "score": <0-100, higher = more red flags>,
  "verdict": "<short punchy 3-5 word verdict>",
  "flags": [
    {
      "type": "red|green",
      "title": "<flag name>",
      "description": "<1-2 sentence explanation, specific to the conversation>"
    }
  ],
  "totalFlags": <total count including hidden ones>
}

Be specific to what you see in the image. Find 6-10 flags total (mix of red and green). The first 3 in the array are free, rest are premium. Verdicts: "Run. Don't look back.", "Major red flags spotted", "Proceed with caution", "Some yellow flags", "Actually pretty wholesome", etc. Be witty and direct.`,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/jpeg', data: image }
            },
            { type: 'text', text: 'Scan this conversation for red flags. Be specific about what you see. Return only JSON.' }
          ]
        }]
      })
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(response.status).json({ error: err.error?.message || 'API error' });
    }

    const data = await response.json();
    const text = data.content.map(b => b.text || '').join('');
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    res.status(200).json(parsed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
}
