const HTML_PAGE = `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AI Translator</title>
<style>
  :root {
    --bg: #f7f5f2;
    --card: #ffffff;
    --primary: #2d5a4a;
    --primary-dark: #1e3d32;
    --text: #1a1a1a;
    --muted: #6b6b6b;
    --border: #e2ddd6;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
    background: var(--bg);
    color: var(--text);
    padding: 24px 16px;
  }
  .container { max-width: 520px; margin: 0 auto; }
  h1 { font-size: 22px; text-align: center; color: var(--primary-dark); margin-bottom: 4px; }
  .subtitle { text-align: center; color: var(--muted); font-size: 14px; margin-bottom: 24px; }
  .card { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 18px; margin-bottom: 16px; }
  .lang-row { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
  select { flex: 1; padding: 10px; border-radius: 8px; border: 1px solid var(--border); font-size: 14px; background: white; }
  .swap-btn { background: none; border: 1px solid var(--border); border-radius: 8px; width: 36px; height: 36px; cursor: pointer; font-size: 16px; color: var(--primary-dark); }
  textarea { width: 100%; min-height: 110px; padding: 12px; border-radius: 10px; border: 1px solid var(--border); font-size: 15px; font-family: inherit; resize: vertical; }
  button.translate-btn { width: 100%; padding: 13px; margin-top: 12px; background: var(--primary); color: white; border: none; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; }
  button.translate-btn:disabled { opacity: 0.6; cursor: default; }
  .result { min-height: 60px; padding: 12px; border-radius: 10px; background: #f0ede8; font-size: 15px; line-height: 1.6; white-space: pre-wrap; }
  .result.placeholder { color: var(--muted); }
  .error { color: #b3261e; font-size: 13px; margin-top: 8px; }
  .note { font-size: 12px; color: var(--muted); text-align: center; margin-top: 18px; line-height: 1.6; }
</style>
</head>
<body>
<div class="container">
  <h1>🌐 AI Translator</h1>
  <p class="subtitle">Type text and translate it instantly</p>

  <div class="card">
    <div class="lang-row">
      <select id="fromLang">
        <option value="English">English</option>
        <option value="Arabic">Arabic</option>
        <option value="Turkish">Turkish</option>
        <option value="French">French</option>
      </select>
      <button class="swap-btn" id="swapBtn">⇄</button>
      <select id="toLang">
        <option value="Arabic" selected>Arabic</option>
        <option value="English">English</option>
        <option value="Turkish">Turkish</option>
        <option value="French">French</option>
      </select>
    </div>
    <textarea id="inputText" placeholder="Type your text here..."></textarea>
    <button class="translate-btn" id="translateBtn">Translate</button>
    <div class="error" id="errorMsg"></div>
  </div>

  <div class="card">
    <div class="result placeholder" id="resultBox">Translation will appear here...</div>
  </div>

  <p class="note">Powered by your own AI engine, connected securely through Cloudflare Workers.</p>
</div>

<script>
const translateBtn = document.getElementById('translateBtn');
const inputText = document.getElementById('inputText');
const resultBox = document.getElementById('resultBox');
const errorMsg = document.getElementById('errorMsg');
const fromLang = document.getElementById('fromLang');
const toLang = document.getElementById('toLang');
const swapBtn = document.getElementById('swapBtn');

swapBtn.addEventListener('click', () => {
  const tmp = fromLang.value;
  fromLang.value = toLang.value;
  toLang.value = tmp;
});

translateBtn.addEventListener('click', async () => {
  const text = inputText.value.trim();
  errorMsg.textContent = '';

  if (!text) {
    errorMsg.textContent = 'Type some text first';
    return;
  }

  translateBtn.disabled = true;
  translateBtn.textContent = 'Translating...';
  resultBox.textContent = '...';
  resultBox.classList.add('placeholder');

  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: text,
        fromLang: fromLang.value,
        toLang: toLang.value
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'translation failed');
    }

    resultBox.textContent = data.translated;
    resultBox.classList.remove('placeholder');
  } catch (err) {
    console.error(err);
    errorMsg.textContent = 'Something went wrong, please try again.';
    resultBox.textContent = 'Translation will appear here...';
    resultBox.classList.add('placeholder');
  } finally {
    translateBtn.disabled = false;
    translateBtn.textContent = 'Translate';
  }
});
</script>
</body>
</html>`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }

    // API route: translation
    if (url.pathname === '/api/translate' && request.method === 'POST') {
      try {
        const { text, fromLang, toLang } = await request.json();

        if (!text || !fromLang || !toLang) {
          return new Response(JSON.stringify({ error: 'Missing text, fromLang, or toLang' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }

        const apiKey = env.GEMINI_API_KEY;
        if (!apiKey) {
          return new Response(JSON.stringify({ error: 'Server is missing GEMINI_API_KEY' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
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
          return new Response(JSON.stringify({ error: 'Translation failed, no result from AI' }), {
            status: 502,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }

        return new Response(JSON.stringify({ translated }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });

      } catch (err) {
        return new Response(JSON.stringify({ error: 'Something went wrong on the server' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    // Default route: serve the HTML page
    return new Response(HTML_PAGE, {
      headers: { 'Content-Type': 'text/html;charset=UTF-8' }
    });
  }
};
