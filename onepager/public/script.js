// Share form: switches between text and recording, compresses the audio to MP3 when the
// browser can decode it (otherwise sends the original), and enables Send.
const MAX_MB = 400;          // must match MAX_MB in netlify/lib/r2.mjs
const MAX_SECONDS = 8.5 * 60; // 8 min plus a little slack
const MP3_RATE = 22050;      // mono 22 kHz / 64 kbps: ~3.8 MB for 8 min, fine for voice
const MP3_KBPS = 64;

const form = document.getElementById('share-form');
const textPanel = document.getElementById('text-panel');
const recordingPanel = document.getElementById('recording-panel');
const textarea = form.elements.text;
const fileInput = document.getElementById('audio-file');
const fileStatus = document.getElementById('file-status');
const submit = document.getElementById('submit');
const sendStatus = document.getElementById('send-status');
const IDLE_STATUS = 'No file selected.';

let fileOk = false;
let audioFile = null; // what gets uploaded: the MP3, or the original if it couldn't be converted
let current = null; // the file being prepared; a newer pick replaces it

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

const fileDetails = (file) => file && { name: file.name, type: file.type, size: file.size };

// Log to the browser console and to the Netlify function logs (see /api/log)
function log(event, details) {
  const entry = { event, ...details, userAgent: navigator.userAgent };
  (event.endsWith('failed') ? console.error : console.log)('[HardBreaks]', entry);
  fetch('/api/log', { method: 'POST', body: JSON.stringify(entry) }).catch(() => {});
}

// iOS Safari may never load metadata outside a tap, so give up after 2 s (NaN = unknown)
function audioDuration(file) {
  return new Promise((resolve) => {
    const audio = new Audio();
    const url = URL.createObjectURL(file);
    const done = (seconds) => { clearTimeout(timer); URL.revokeObjectURL(url); resolve(seconds); };
    const timer = setTimeout(() => done(NaN), 2000);
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => done(audio.duration);
    audio.onerror = () => done(NaN);
    audio.src = url;
  });
}

// Unknown length (NaN) passes; it's checked again after decoding
const tooLong = (seconds) => Number.isFinite(seconds) && seconds > MAX_SECONDS;

// Decode at MP3_RATE, mix down to mono, and encode with lamejs (vendor/lame.min.js)
async function toMp3(file) {
  const context = new OfflineAudioContext(1, 1, MP3_RATE);
  const audio = await context.decodeAudioData(await file.arrayBuffer());
  const channels = Array.from({ length: audio.numberOfChannels }, (_, c) => audio.getChannelData(c));

  const samples = new Int16Array(audio.length);
  for (let i = 0; i < audio.length; i++) {
    let sum = 0;
    for (const channel of channels) sum += channel[i];
    const s = Math.max(-1, Math.min(1, sum / channels.length));
    samples[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }

  const encoder = new lamejs.Mp3Encoder(1, MP3_RATE, MP3_KBPS);
  const chunks = [];
  for (let i = 0; i < samples.length; i += 1152) {
    chunks.push(encoder.encodeBuffer(samples.subarray(i, i + 1152)));
    // Let the page breathe so the status text stays visible
    if (i % (1152 * 500) === 0) await new Promise((resolve) => setTimeout(resolve));
  }
  chunks.push(encoder.flush());
  return { blob: new Blob(chunks, { type: 'audio/mpeg' }), duration: audio.duration };
}

// Validate and compress a picked file
async function prepareAudio(file, label) {
  fileOk = false;
  audioFile = null;
  current = file;
  if (!file) {
    setStatus(IDLE_STATUS, '');
  } else if (file.size > MAX_MB * 1024 * 1024) {
    setStatus(`This file is too large (max ${MAX_MB} MB).`, 'error');
  } else if (file.type.startsWith('image/')) {
    setStatus('This is an image. Please choose an audio recording.', 'error');
  } else {
    setStatus('Preparing your recording…', '');
    update();
    const duration = await audioDuration(file);
    if (current !== file) return;
    if (tooLong(duration)) {
      setStatus('This recording is too long. Please keep it under 8 minutes.', 'error');
      update();
      return;
    }
    try {
      // If conversion stalls on some phone, fall back to the original after 60 s
      const result = await Promise.race([
        toMp3(file),
        new Promise((_, reject) => setTimeout(() => reject(new Error('conversion timed out')), 60000)),
      ]);
      if (current !== file) return; // a newer file was picked meanwhile
      if (result.duration > MAX_SECONDS) {
        setStatus('This recording is too long. Please keep it under 8 minutes.', 'error');
      } else {
        audioFile = new File([result.blob], file.name.replace(/\.[^.]+$/, '') + '.mp3', { type: 'audio/mpeg' });
        setStatus(`✓ ${label} (${formatTime(result.duration)}) is ready to send.`, 'ok');
        fileOk = true;
      }
    } catch (error) {
      if (current !== file) return;
      // This browser can't decode the format: send the original as is
      log('convert-failed', { file: fileDetails(file), error: String(error) });
      audioFile = file;
      setStatus(`✓ ${label} is ready to send.`, 'ok');
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
fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  fileInput.value = ''; // so picking the same file again still fires change
  if (!file) return;
  log('file-picked', { file: fileDetails(file) });
  prepareAudio(file, file.name);
});

const postJSON = async (url, body) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${url} → ${response.status} ${await response.text()}`);
  return response.json();
};

// Text goes through a function; recordings get a signed URL and upload straight to R2
async function send() {
  if (mode() === 'text') {
    const { key } = await postJSON('/api/submit-text', { text: textarea.value, voice: form.elements.voice.value });
    return key;
  }
  const type = audioFile.type || 'application/octet-stream';
  const { url, key } = await postJSON('/api/sign-upload', { name: audioFile.name, type, size: audioFile.size });
  const upload = await fetch(url, { method: 'PUT', headers: { 'content-type': type }, body: audioFile });
  if (!upload.ok) throw new Error(`R2 upload → ${upload.status}`);
  postJSON('/api/notify', { key }).catch(() => {});
  return key;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  submit.disabled = true;
  sendStatus.className = 'note';
  sendStatus.textContent = 'Sending…';
  const details = mode() === 'text'
    ? { mode: 'text', chars: textarea.value.length, voice: form.elements.voice.value }
    : { mode: 'recording', file: fileDetails(audioFile), original: fileDetails(current) };
  try {
    const key = await send();
    log('send-ok', { ...details, key });
    form.reset();
    fileOk = false;
    audioFile = null;
    current = null;
    setStatus(IDLE_STATUS, '');
    sendStatus.className = 'note ok';
    sendStatus.textContent = 'Thank you. HardBreaks received your story.';
  } catch (error) {
    log('send-failed', { ...details, error: String(error) });
    sendStatus.className = 'note error';
    sendStatus.textContent = 'Something went wrong. Please try again.';
  }
  update();
});

update();
