// NEO writing assistant: main-process side.
// Receives a scene from the UI, asks the model for notes, validates them.
const { createHash, randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { app } = require('electron');
const { error } = require('node:console');

// Connection and model settings. MODEL changes when the tournament winner is chosen.
const ENDPOINT = 'https://nhb-lab-macs-mac-mini.taile300f2.ts.net/v1/chat/completions';
const MODEL = 'gemma-4-e4b-it-4bit';
const SAMPLING = '';
const MAX_TOKENS = 4096;
const TIMEOUT_MS = 120000;

// Validation rules. Keep MAX_WORDS in sync with the system prompt.
const MAX_WORDS = 15;
const ALLOWED_TYPES = ['sensory', 'history', 'relationship', 'question', 'wildcard'];

//Logging function to write training data, review and action records. A failed write reports to the console.
async function appendLog(record) {
  const logPath = path.join(app.getPath('userData'), 'assistant', 'log.jsonl');
  try {
    await fs.appendFile(logPath, JSON.stringify(record) + '\n');
  }
  catch (err) {
    console.error('Assistant log write failed:', err);
  }
}

// Pull the JSON array out of the model's reply.
function parseNotes(raw) {
  raw = raw.replace(/<think>[\s\S]*?<\/think>/g, '');
  console.log(raw);
  const cleaned = raw.replace(/```json|```/g, '').trim();
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');
  if (start === -1 || end === -1) throw new Error('No notes found in the reply.');
  return JSON.parse(cleaned.slice(start, end + 1));
}

// Keep only notes that follow the rules.
function validate(notes, wildcardRequested) {
  let wildcardSeen = false;
  return notes.filter(note => {
    if (typeof note.type !== 'string' || typeof note.text !== 'string') return false;
    if (!ALLOWED_TYPES.includes(note.type)) return false;
    if (note.text.trim().split(/\s+/).length > MAX_WORDS) return false;
    if (note.type === 'wildcard') {
      if (!wildcardRequested || wildcardSeen || !note.anchor) return false;
      wildcardSeen = true;
    }
    return true;
  });
}

// Called once from main.js at startup.
function registerAssistant(ipcMain, readSecret) {
  ipcMain.handle('assistant:review', async (_event, sceneText, options = {}) => {
    const key = readSecret('omlx');
    if (!key) return { error: 'No oMLX key is stored.' };

    let system;
    try {
      const promptPath = path.join(app.getPath('userData'), 'assistant', 'system-prompt.txt');
      system = await fs.readFile(promptPath, 'utf8');
    } catch {
      return { error: 'The system prompt file was not found.' };
    }

    const wildcard = options.wildcard === true;
    const request = wildcard
      ? `Review this scene. Include exactly one wildcard note in this response.\n\n${sceneText}`
      : `Review this scene:\n\n${sceneText}`;

    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          ...SAMPLING,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: request },
          ],
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (!res.ok) return { error: `The server returned HTTP ${res.status}.` };

      const data = await res.json();
      const raw = data.choices[0].message.content;
      const parsed = parseNotes(raw);
      const notes = validate(parsed, wildcard);
      const withIDs = notes.map(note => ({ id: randomUUID(), ...note }));
      const reviewId = randomUUID();
      const reasoning = data.choices[0].message.reasoning_content ?? null;
      const promptHash = createHash('sha256').update(system).digest('hex').slice(0, 12);
      const record = {
        kind: 'review',
        reviewId,
        promptHash,
        wildcard,
        reasoning,
        time: new Date().toISOString(),
        model: MODEL,
        scene: sceneText,
        notes: withIDs
      };
      await appendLog(record);
      return { notes: withIDs, reviewId, dropped: parsed.length - notes.length };
    } catch (err) {
      return { error: err.message };
    }
  });
  ipcMain.handle('assistant:log-action', async (_event, entry) => {
    const allowedActions = ['keep', 'spark', 'dismiss'];
    if (!allowedActions.includes(entry.action)) {
      return { error: 'Action not recognized' };
    }
    const record = { kind: 'action', time: new Date().toISOString(), ...entry };
    await appendLog(record);
    return { ok: true };
  });
}

module.exports = { registerAssistant };