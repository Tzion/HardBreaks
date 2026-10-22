// Share form: switches between text and recording, validates the audio file, and enables Send.
const MAX_MB = 8;            // ~5 min of compressed audio (m4a/mp3); fits Netlify Forms' upload limit
const MAX_SECONDS = 5.5 * 60;

const form = document.getElementById('share-form');
const textPanel = document.getElementById('text-panel');
const recordingPanel = document.getElementById('recording-panel');
const textarea = form.elements.text;
const fileInput = document.getElementById('audio-file');
const fileStatus = document.getElementById('file-status');
const submit = document.getElementById('submit');

let fileOk = false;

function mode() {
  return form.elements.kind.value;
}

function update() {
  const isText = mode() === 'text';
  textPanel.hidden = !isText;
  recordingPanel.hidden = isText;
  submit.disabled = isText ? textarea.value.trim() === '' : !fileOk;
}

function setStatus(message, kind) {
  fileStatus.textContent = message;
  fileStatus.className = `note ${kind}`;
}

function formatTime(seconds) {
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function audioDuration(file) {
  return new Promise((resolve) => {
    const audio = new Audio();
    const url = URL.createObjectURL(file);
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(audio.duration); };
    audio.onerror = () => { URL.revokeObjectURL(url); resolve(NaN); };
    audio.src = url;
  });
}

async function checkFile() {
  fileOk = false;
  const file = fileInput.files[0];
  if (!file) {
    setStatus('No file selected.', '');
  } else if (!file.type.startsWith('audio/')) {
    setStatus('Please choose an audio file.', 'error');
  } else if (file.size > MAX_MB * 1024 * 1024) {
    setStatus(`This file is too large (max ${MAX_MB} MB).`, 'error');
  } else {
    const duration = await audioDuration(file);
    if (duration > MAX_SECONDS) {
      setStatus(`This recording is ${formatTime(duration)} long. Please keep it under 5 minutes.`, 'error');
    } else {
      const length = Number.isFinite(duration) ? ` (${formatTime(duration)})` : '';
      setStatus(`✓ ${file.name}${length} is ready to send.`, 'ok');
      fileOk = true;
    }
  }
  update();
}

// Clicking "Recording" opens the file picker every time, even if already selected
form.elements.kind.forEach((radio) => {
  radio.addEventListener('click', () => {
    if (radio.value === 'recording') fileInput.click();
  });
});

form.addEventListener('change', update);
textarea.addEventListener('input', update);
fileInput.addEventListener('change', checkFile);
document.getElementById('choose-file').addEventListener('click', () => fileInput.click());

form.addEventListener('submit', (event) => {
  event.preventDefault(); // Sending is wired up in the next phase
});

update();
