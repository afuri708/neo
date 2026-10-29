// NEO writing assistant: main-process side.
// Receives a scene from the UI, asks the model for notes, validates them.
const { createHash, randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { app } = require('electron');
const { error } = require('node:console');

// Connection and model settings. model changes when the tournament winner is chosen.
const endpoint = 'https://nhb-lab-macs-mac-mini.taile300f2.ts.net/v1/chat/completions';
const model = 'gemma-4-e4b-it-4bit';
const sampling = '';
const maxTokens = 16384;
const timeoutMs = 120000;
const defaultSettings = { minNotes: 3, maxNotes: 6 };
const maxNotesCap = 6;

// Validation rules. Keep maxWords in sync with the system prompt.
const maxWords = 15;
const allowedTypes = ['sensory', 'history', 'relationship', 'question', 'wildcard'];

function promptPath() {
  return path.join(app.getPath('userData'), 'assistant', 'system-prompt.txt');
}

async function ensureAssistantDir() {
  await fs.mkdir(path.join(app.getPath('userData'), 'assistant'), { recursive: true });
}

//Logging function to write training data, review and action records. A failed write reports to the console.
async function appendLog(record) {
  const logPath = path.join(app.getPath('userData'), 'assistant', 'log.jsonl');
  try {
    await ensureAssistantDir();
    await fs.appendFile(logPath, JSON.stringify(record) + '\n');
  }
  catch (err) {
    console.error('Assistant log write failed:', err);
  }
}

async function readSettings() {
  const settingsPath = path.join(app.getPath('userData'), 'assistant', 'settings.json');
  try {
    const settingsText = await fs.readFile(settingsPath, 'utf8');
    const parsedSettings = JSON.parse(settingsText);
    return { ...defaultSettings, ...parsedSettings };
  }
  catch {
    return { ...defaultSettings };
  }
}

async function writeSettings(settings) {
  await ensureAssistantDir();
  const settingsPath = path.join(app.getPath('userData'), 'assistant', 'settings.json');
  await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));
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
    if (!allowedTypes.includes(note.type)) return false;
    if (note.text.trim().split(/\s+/).length > maxWords) return false;
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
      system = await fs.readFile(promptPath(), 'utf8');
    } catch {
      return { error: 'The system prompt file was not found.' };
    }

    const wildcard = options.wildcard === true;
    const request = wildcard
      ? `Review this scene. Include exactly one wildcard note in this response.\n\n${sceneText}`
      : `Review this scene:\n\n${sceneText}`;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: model,
          maxTokens: maxTokens,
          ...sampling,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: request },
          ],
        }),
        signal: AbortSignal.timeout(timeoutMs),
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
        model: model,
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
  ipcMain.handle('assistant:get-settings', async (_event) => {
    return await readSettings();
  });
  ipcMain.handle('assistant:set-settings', async (_event, incoming) => {
    const incomingMin = incoming.minNotes;
    const incomingMax = incoming.maxNotes;
    if (!Number.isInteger(incoming.minNotes) || !Number.isInteger(incoming.maxNotes)) {
      return { error: "Notes qty not a number!" };
    }
    if (incomingMin < 1) {
      return { error: "Cannot have 0 notes!" };
    }
    if (incomingMax > maxNotesCap) {
      return { error: `Too many notes! Cap is ${maxNotesCap}` };
    }
    if (incomingMin > incomingMax) {
      return { error: "Minumum cannot be greater than maximum!" };
    }
    const updated = { ...(await readSettings), minNotes: incomingMin, maxNotes: incomingMax };
    try {
      await writeSettings(updated);
      return { ok: true };
    }
    catch (err) {
      return { error: `Could not save settings, Error: ${err.message}` };
    }
  });
  ipcMain.handle('assistant:get-prompt', async (_event) => {
    try {
      const text = await fs.readFile(promptPath(), 'utf8');
      return { text };
    }
    catch {
      return { text: '' };
    }
  });
  ipcMain.handle('assistant:set-prompt', async (_event, text) => {
    if (typeof text !== 'string') {
      return { error: 'Prompt is not a string...' };
    }
    const normalized = text.replace(/\r\n/g, '\n').trimEnd();
    if (normalized === '') {
      return { error: 'Prompt is empty...' };
    }
    try {
      await ensureAssistantDir();
      await fs.writeFile(promptPath(), normalized);
      return { ok: true };
    }
    catch (err) {
      return { error: `COuld not save prompt, ${err.message}` };
    }
  });
}

module.exports = { registerAssistant };