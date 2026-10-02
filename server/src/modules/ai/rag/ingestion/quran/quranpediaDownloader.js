const fs = require('fs');
const path = require('path');

const DEFAULT_URL = 'https://api.quranpedia.net/dumps/mushafs-1.json.gz';

async function downloadHafsDump(outputPath, url = DEFAULT_URL) {
  if (!outputPath) throw new Error('outputPath is required');
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Quranpedia download failed (${response.status})`);

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, buffer);
  return { outputPath, bytes: buffer.length, url };
}

module.exports = { downloadHafsDump, DEFAULT_URL };
