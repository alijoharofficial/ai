export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_OWNER = 'alijoharofficial';
  const GITHUB_REPO  = 'ai';
  const FILE_PATH    = 'data/posts.json';

  if (!GITHUB_TOKEN) {
    return res.status(500).json({ error: 'GITHUB_TOKEN not configured in environment' });
  }

  try {
    const { posts } = req.body;
    if (!Array.isArray(posts)) {
      return res.status(400).json({ error: 'posts must be an array' });
    }

    const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${FILE_PATH}`;
    const headers = {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    };

    // Get current file SHA
    const getResp = await fetch(apiUrl, { headers });
    const getJson = await getResp.json();
    if (!getResp.ok) {
      return res.status(502).json({ error: 'Failed to read posts.json from GitHub', detail: getJson });
    }
    const sha = getJson.sha;

    // Encode and write
    const encoded = Buffer.from(JSON.stringify(posts, null, 2)).toString('base64');
    const putResp = await fetch(apiUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message: `Publish post: ${posts[posts.length - 1]?.title || 'update'}`,
        content: encoded,
        sha,
      }),
    });

    const putJson = await putResp.json();
    if (!putResp.ok) {
      return res.status(502).json({ error: 'Failed to write posts.json', detail: putJson });
    }

    return res.status(200).json({ ok: true, commit: putJson.commit?.sha });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
