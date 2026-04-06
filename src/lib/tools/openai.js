import { getConfig } from '../config.js';

export function isWhisperEnabled() {
  return !!getConfig('OPENAI_API_KEY');
}

export async function transcribeAudio(audioBuffer, filename = 'audio.ogg') {
  const apiKey = getConfig('OPENAI_API_KEY');
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const formData = new FormData();
  formData.append('file', new Blob([audioBuffer]), filename);
  formData.append('model', 'whisper-1');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Whisper API error: ${response.status}`);
  }

  const data = await response.json();
  return data.text || '';
}
