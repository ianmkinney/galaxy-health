"use client";

export type SpeechHandle = {
  stop: () => void;
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function recognitionCtor() {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function canListen() {
  return Boolean(recognitionCtor());
}

export function canSpeak() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function startListening(opts: {
  onResult: (text: string) => void;
  onEnd?: () => void;
}): SpeechHandle | null {
  const Ctor = recognitionCtor();
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = "en-US";
  rec.interimResults = false;
  rec.continuous = false;
  rec.onresult = (event) => {
    const text = Array.from(event.results)
      .map((result) => result[0]?.transcript || "")
      .join(" ")
      .trim();
    if (text) opts.onResult(text);
  };
  rec.onerror = () => opts.onEnd?.();
  rec.onend = () => opts.onEnd?.();
  rec.start();
  return {
    stop: () => {
      try {
        rec.stop();
      } catch {
        /* already stopped */
      }
    },
  };
}

export function speakText(
  text: string,
  opts: { onStart?: () => void; onEnd?: () => void }
): SpeechHandle {
  if (!canSpeak()) {
    opts.onEnd?.();
    return { stop: () => {} };
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.02;
  utterance.pitch = 0.95;
  utterance.onstart = () => opts.onStart?.();
  utterance.onend = () => opts.onEnd?.();
  utterance.onerror = () => opts.onEnd?.();
  window.speechSynthesis.speak(utterance);
  return {
    stop: () => {
      window.speechSynthesis.cancel();
      opts.onEnd?.();
    },
  };
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}
