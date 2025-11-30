require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const app = express();
app.use(cors());
app.use(express.json());

const DATA_FILE = path.join(__dirname, 'versions.json');
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([] , null, 2));
}
function readVersions() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (err) {
    console.error('Error reading versions:', err);
    return [];
  }
}
function writeVersions(list) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2));
}
function formatTimestamp(date = new Date()) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
function diffWords(oldText = '', newText = '') {
  const extract = text => {
    const matches = text.match(/\b\w+\b/g) || [];
    return matches.map(w => w.toLowerCase());
  };
  const oldWords = extract(oldText);
  const newWords = extract(newText);
  const oldSet = new Set(oldWords);
  const newSet = new Set(newWords);
  const addedWords = [];
  const removedWords = [];
  for (const w of newSet) {
    if (!oldSet.has(w)) addedWords.push(w);
  }
  for (const w of oldSet) {
    if (!newSet.has(w)) removedWords.push(w);
  }
  return {
    addedWords,
    removedWords,
    oldLength: oldText.length,
    newLength: newText.length,
  };
}
//changes 
app.get('/' , (req , res ) =>{
  res.send('Server is Working');
});
app.get('/versions', (req, res) => {
  const versions = readVersions();
  versions.sort((a,b) => (b.timestampRaw || 0) - (a.timestampRaw || 0));
  res.json(versions);
});
app.post('/save-version', (req, res) => {
  const { content } = req.body;
  if (typeof content !== 'string') {
    return res.status(400).json({ error: 'content (string) is required in body' });
  }
  const versions = readVersions();
  const last = versions.length ? versions[versions.length - 1] : null;
  const oldText = last ? last.content : '';
  const diff = diffWords(oldText, content);
  const now = new Date();
  const entry = {
    id: uuidv4(),
    timestamp: formatTimestamp(now),
    timestampRaw: now.getTime(),
    contentPreview: content.slice(0, 200),
    content, 
    addedWords: diff.addedWords,
    removedWords: diff.removedWords,
    oldLength: diff.oldLength,
    newLength: diff.newLength
  };
  versions.push(entry);
  writeVersions(versions);
  res.status(201).json(entry);
});
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
