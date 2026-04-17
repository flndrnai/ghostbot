'use client';

// Voice-to-text mic button for the chat input.
// Uses the browser's SpeechRecognition API (webkitSpeechRecognition fallback).
// No server round-trip — all transcription happens client-side via the UA.
//
// Supported: Chrome / Edge / Safari on macOS + iOS. Firefox has no native
// support (yet) — the button hides itself when the API isn't available.
//
// Interim + final results are both forwarded via onTranscript. The caller
// decides what to do (append to textarea in our case). A small "recording"
// indicator replaces the mic icon while listening.

import { useEffect, useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';

function getSpeechRecognitionClass() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function MicButton({ onTranscript, disabled = false, lang = 'en-US' }) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);
  const finalTextRef = useRef('');

  useEffect(() => {
    const Klass = getSpeechRecognitionClass();
    setSupported(!!Klass);
  }, []);

  function start() {
    const Klass = getSpeechRecognitionClass();
    if (!Klass) return;
    setError('');

    const rec = new Klass();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = lang;
    finalTextRef.current = '';

    rec.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) final += r[0].transcript;
        else interim += r[0].transcript;
      }
      if (final) {
        finalTextRef.current += final;
        onTranscript?.(final, { kind: 'final' });
      }
      if (interim) {
        onTranscript?.(interim, { kind: 'interim' });
      }
    };

    rec.onerror = (event) => {
      setError(event.error || 'recognition error');
      setListening(false);
    };

    rec.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    try {
      rec.start();
      recognitionRef.current = rec;
      setListening(true);
    } catch (err) {
      setError(err.message || 'failed to start');
      setListening(false);
    }
  }

  function stop() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  // Hide entirely when the browser doesn't support the API.
  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={listening ? stop : start}
      disabled={disabled}
      aria-label={listening ? 'Stop voice input' : 'Start voice input'}
      title={error ? `Voice error: ${error}` : (listening ? 'Listening… click to stop' : 'Voice to text')}
      className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all cursor-pointer disabled:opacity-50 ${
        listening
          ? 'bg-destructive/15 text-destructive animate-pulse'
          : 'bg-muted/60 text-muted-foreground hover:text-foreground'
      }`}
    >
      {listening ? <Square className="h-3.5 w-3.5" /> : <Mic className="h-4 w-4" />}
    </button>
  );
}
