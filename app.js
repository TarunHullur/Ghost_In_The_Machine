const STORAGE_KEY = 'still-here-memory-garden-v1';
const MODEL_ID = 'onnx-community/SmolLM2-360M-Instruct';
const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';

const elements = {
  archive: document.querySelector('#entry-list'),
  count: document.querySelector('#entry-count'),
  date: document.querySelector('#entry-date'),
  details: document.querySelector('#details'),
  entryHeading: document.querySelector('#entry-heading'),
  generate: document.querySelector('#generate-button'),
  generateLabel: document.querySelector('#generate-label'),
  memory: document.querySelector('#memory'),
  modelButton: document.querySelector('#model-button'),
  modelButtonLabel: document.querySelector('#model-button-label'),
  modelNote: document.querySelector('#model-note'),
  name: document.querySelector('#person-name'),
  newEntry: document.querySelector('#new-entry'),
  output: document.querySelector('#remembrance-output'),
  photoImage: document.querySelector('#photo-image'),
  photoInput: document.querySelector('#photo-input'),
  photoPreview: document.querySelector('#photo-preview'),
  paperImage: document.querySelector('#paper-image'),
  paperPhoto: document.querySelector('#paper-photo'),
  relationship: document.querySelector('#relationship'),
  copy: document.querySelector('#copy-button'),
  removePhoto: document.querySelector('#remove-photo'),
  styleButtons: [...document.querySelectorAll('.style-option')],
};

let generatorPromise;
let generator;
let modelState = 'idle';
let selectedStyle = 'Letter';

function makeEntry() {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    person: '',
    relationship: '',
    memory: '',
    details: '',
    style: 'Letter',
    remembrance: '',
    photo: '',
  };
}

function readArchive() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.entries) && saved.entries.length) {
      const current = saved.entries.find((entry) => entry.id === saved.currentId);
      return { entries: saved.entries, currentId: current?.id ?? saved.entries[0].id };
    }
  } catch (error) {
    console.warn('Could not read the local remembrance archive.', error);
  }
  const first = makeEntry();
  return { entries: [first], currentId: first.id };
}

const archiveState = readArchive();

function currentEntry() {
  return archiveState.entries.find((entry) => entry.id === archiveState.currentId);
}

function saveArchive() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(archiveState));
  } catch (error) {
    setNote('This browser could not save more data. Try removing a photograph or clearing an old entry.', true);
  }
}

function setNote(message, isError = false) {
  elements.modelNote.textContent = message;
  elements.modelNote.classList.toggle('is-error', isError);
}

function entryTitle(entry) {
  return entry.person.trim() || 'Untitled remembrance';
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function renderArchive() {
  elements.archive.replaceChildren();
  elements.count.textContent = String(archiveState.entries.length);
  for (const entry of [...archiveState.entries].reverse()) {
    const row = document.createElement('div');
    row.className = `entry-row${entry.id === archiveState.currentId ? ' is-active' : ''}`;

    const select = document.createElement('button');
    select.className = 'entry-select';
    select.type = 'button';
    select.setAttribute('aria-current', entry.id === archiveState.currentId ? 'true' : 'false');
    const title = document.createElement('strong');
    title.textContent = entryTitle(entry);
    const date = document.createElement('span');
    date.textContent = formatDate(entry.createdAt);
    select.append(title, date);
    select.addEventListener('click', () => selectEntry(entry.id));

    const remove = document.createElement('button');
    remove.className = 'delete-entry';
    remove.type = 'button';
    remove.textContent = '×';
    remove.setAttribute('aria-label', `Delete ${entryTitle(entry)}`);
    remove.addEventListener('click', () => deleteEntry(entry.id));
    row.append(select, remove);
    elements.archive.append(row);
  }
}

function renderEntry() {
  const entry = currentEntry();
  if (!entry) return;
  elements.name.value = entry.person || '';
  elements.relationship.value = entry.relationship || '';
  elements.memory.value = entry.memory || '';
  elements.details.value = entry.details || '';
  elements.output.value = entry.remembrance || '';
  elements.entryHeading.textContent = entry.person.trim() ? `For ${entry.person.trim()}` : 'A life, in little details';
  elements.date.textContent = entry.person.trim() ? formatDate(entry.createdAt) : 'A new page';
  elements.photoPreview.hidden = !entry.photo;
  elements.paperPhoto.hidden = !entry.photo;
  if (entry.photo) {
    elements.photoImage.src = entry.photo;
    elements.paperImage.src = entry.photo;
  } else {
    elements.photoImage.removeAttribute('src');
    elements.paperImage.removeAttribute('src');
  }
  elements.copy.disabled = !entry.remembrance;
  selectedStyle = entry.style || 'Letter';
  for (const button of elements.styleButtons) {
    const selected = button.dataset.style === selectedStyle;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  }
  renderArchive();
}

function selectEntry(id) {
  archiveState.currentId = id;
  saveArchive();
  renderEntry();
  setNote(modelState === 'ready' ? 'Your notes stay on this device. The model runs here, too.' : 'Your notes stay on this device. The model runs here, too.');
}

function createEntry() {
  const entry = makeEntry();
  archiveState.entries.push(entry);
  archiveState.currentId = entry.id;
  saveArchive();
  renderEntry();
  elements.name.focus();
}

function deleteEntry(id) {
  archiveState.entries = archiveState.entries.filter((entry) => entry.id !== id);
  if (!archiveState.entries.length) archiveState.entries.push(makeEntry());
  if (archiveState.currentId === id) archiveState.currentId = archiveState.entries.at(-1).id;
  saveArchive();
  renderEntry();
}

function updateEntry() {
  const entry = currentEntry();
  if (!entry) return;
  entry.person = elements.name.value;
  entry.relationship = elements.relationship.value;
  entry.memory = elements.memory.value;
  entry.details = elements.details.value;
  entry.style = selectedStyle;
  entry.remembrance = elements.output.value;
  elements.entryHeading.textContent = entry.person.trim() ? `For ${entry.person.trim()}` : 'A life, in little details';
  elements.date.textContent = entry.person.trim() ? formatDate(entry.createdAt) : 'A new page';
  elements.copy.disabled = !entry.remembrance;
  saveArchive();
  renderArchive();
}

async function loadModel() {
  if (generator) return generator;
  if (generatorPromise) return generatorPromise;
  modelState = 'loading';
  elements.modelButton.classList.add('is-loading');
  elements.modelButton.disabled = true;
  elements.modelButtonLabel.textContent = 'Loading model...';
  elements.generateLabel.textContent = 'Preparing model...';
  setNote('Downloading the open model into this browser. The first load needs internet; your notes are not included.', false);

  generatorPromise = (async () => {
    const { env, pipeline } = await import(MODEL_URL);
    env.allowLocalModels = false;
    env.useBrowserCache = true;
    return pipeline('text-generation', MODEL_ID, {
      progress_callback: (progress) => {
        if (progress.status === 'progress' && Number.isFinite(progress.progress)) {
          setNote(`Loading model files: ${Math.round(progress.progress)}% complete. Your memories stay on this device.`);
        }
      },
    });
  })();

  try {
    generator = await generatorPromise;
    modelState = 'ready';
    elements.modelButton.classList.remove('is-loading');
    elements.modelButton.classList.add('is-ready');
    elements.modelButtonLabel.textContent = 'Model ready on this device';
    setNote('Open model ready. Your memories stay here, and generation runs in this browser.');
    return generator;
  } catch (error) {
    modelState = 'idle';
    generatorPromise = undefined;
    elements.modelButton.classList.remove('is-loading');
    elements.modelButtonLabel.textContent = 'Load open model';
    setNote('Could not load the model. Check your connection and browser storage, then try again.', true);
    throw error;
  } finally {
    elements.modelButton.disabled = false;
    elements.generateLabel.textContent = 'Shape this memory';
  }
}

function buildPrompt(entry) {
  const relationship = entry.relationship.trim() ? `They were ${entry.relationship.trim()}.` : '';
  const details = entry.details.trim() ? `Things they loved: ${entry.details.trim()}.` : '';
  const form = {
    Letter: 'Write a warm, intimate letter addressed to this person, as if speaking to them.',
    Vignette: 'Write a vivid, quiet vignette that stays close to the specific scene described.',
    Poem: 'Write a gentle, grounded free-verse poem using the concrete details provided.',
  }[entry.style] || 'Write a warm remembrance.';

  return `<|im_start|>system\nYou help people honor someone they remember. Write with tenderness and restraint. Use only facts and details the user supplied; do not invent events, beliefs, relationships, or biographical details. Avoid claiming to speak for the deceased. Keep the result under 180 words. Return only the finished piece.\n<|im_end|>\n<|im_start|>user\n${form}\nName: ${entry.person.trim()}.\n${relationship}\nMemory: ${entry.memory.trim()}\n${details}\n<|im_end|>\n<|im_start|>assistant\n`;
}

async function generateRemembrance() {
  const entry = currentEntry();
  if (!entry?.person.trim() || !entry.memory.trim()) {
    setNote('Add their name and one moment you remember before shaping this piece.', true);
    return;
  }
  elements.generate.disabled = true;
  elements.generateLabel.textContent = 'Finding the words...';
  try {
    const runModel = await loadModel();
    const result = await runModel(buildPrompt(entry), {
      max_new_tokens: 220,
      do_sample: true,
      temperature: 0.75,
      top_p: 0.9,
      repetition_penalty: 1.12,
      return_full_text: false,
    });
    const text = result?.[0]?.generated_text?.replace(/<\|im_end\|>[\s\S]*$/, '').trim();
    if (!text) throw new Error('The model returned an empty remembrance.');
    elements.output.value = text;
    updateEntry();
    setNote('A first draft, made here. Edit anything that does not sound like them.');
  } catch (error) {
    console.error('Remembrance generation failed.', error);
    if (modelState === 'ready') setNote('The model could not finish this draft. Try again with a shorter memory.', true);
  } finally {
    elements.generate.disabled = false;
    elements.generateLabel.textContent = 'Shape this memory';
  }
}

async function storePhoto(file) {
  if (!file || !file.type.startsWith('image/')) return;
  try {
    const image = await createImageBitmap(file);
    const scale = Math.min(1, 960 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    image.close();
    currentEntry().photo = canvas.toDataURL('image/jpeg', 0.78);
    saveArchive();
    renderEntry();
  } catch (error) {
    setNote('That photograph could not be saved in this browser.', true);
  }
}

for (const input of [elements.name, elements.relationship, elements.memory, elements.details, elements.output]) {
  input.addEventListener('input', updateEntry);
}

for (const button of elements.styleButtons) {
  button.addEventListener('click', () => {
    selectedStyle = button.dataset.style;
    updateEntry();
    for (const option of elements.styleButtons) {
      const selected = option === button;
      option.classList.toggle('is-selected', selected);
      option.setAttribute('aria-pressed', String(selected));
    }
  });
}

elements.newEntry.addEventListener('click', createEntry);
elements.generate.addEventListener('click', generateRemembrance);
elements.modelButton.addEventListener('click', () => loadModel().catch(() => {}));
elements.photoInput.addEventListener('change', (event) => storePhoto(event.target.files[0]));
elements.removePhoto.addEventListener('click', () => {
  currentEntry().photo = '';
  elements.photoInput.value = '';
  saveArchive();
  renderEntry();
});
elements.copy.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(elements.output.value);
    setNote('Copied. The original stays saved here.');
  } catch {
    setNote('Clipboard access is unavailable in this browser.', true);
  }
});

saveArchive();
renderEntry();