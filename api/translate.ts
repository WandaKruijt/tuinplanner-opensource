import type { VercelRequest, VercelResponse } from '@vercel/node';

// DeepL API endpoints - Free keys end with ':fx', Pro keys don't
const DEEPL_FREE_URL = 'https://api-free.deepl.com/v2/translate';
const DEEPL_PRO_URL = 'https://api.deepl.com/v2/translate';

function getDeepLUrl(apiKey: string): string {
  // Free API keys end with ':fx'
  return apiKey.endsWith(':fx') ? DEEPL_FREE_URL : DEEPL_PRO_URL;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.VITE_DEEPL_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'DeepL API key not configured' });
  }

  const deepLUrl = getDeepLUrl(apiKey);

  try {
    const { text } = req.body;

    if (!text || !Array.isArray(text) || text.length === 0) {
      return res.status(400).json({ error: 'Invalid request: text array required' });
    }

    // Filter out empty strings but keep track of positions
    const nonEmptyTexts = text.filter((t: string) => t && t.trim() !== '');

    if (nonEmptyTexts.length === 0) {
      return res.json({ translations: text.map(() => ({ text: '' })) });
    }

    const response = await fetch(deepLUrl, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: nonEmptyTexts,
        source_lang: 'NL',
        target_lang: 'EN-GB'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepL API error:', response.status, errorText);
      return res.status(response.status).json({
        error: 'DeepL API error',
        details: errorText
      });
    }

    const data = await response.json();

    // Map translations back to original positions
    const result: { text: string }[] = [];
    let translationIndex = 0;

    for (const originalText of text) {
      if (originalText && originalText.trim() !== '') {
        result.push(data.translations[translationIndex] || { text: '' });
        translationIndex++;
      } else {
        result.push({ text: '' });
      }
    }

    return res.json({ translations: result });
  } catch (error) {
    console.error('Translation error:', error);
    return res.status(500).json({
      error: 'Translation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
