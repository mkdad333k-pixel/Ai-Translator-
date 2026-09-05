export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, fromLang, toLang } = req.body;

    if (!text || !fromLang || !toLang) {
      return res.status(400).json({ error: 'Missing text, fromLang, or toLang' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Server is missing GEMINI_API_KEY' });
    }

    const prompt = `Translate the following text from ${fromLang} to ${toLang}. Reply with ONLY the translated text, no explanations, no quotes, nothing else.\n\nText: ${text}`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    const data = await geminiResponse.json();
    const translated = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!translated) {
      console.error('Unexpected Gemini response:', JSON.stringify(data));
      return res.status(502).json({ error: 'Translation failed, no result from AI' });
    }

    return res.status(200).json({ translated });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Something went wrong on the server' });
  }
}
