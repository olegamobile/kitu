// Short vibration + beep on successful scan

const BEEP_FREQ = 1200;
const BEEP_DURATION = 120;

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

export function playScanBeep() {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(BEEP_FREQ, ctx.currentTime);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + BEEP_DURATION / 1000);

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + BEEP_DURATION / 1000);
  } catch {
    // Audio not available
  }
}

export function vibrate() {
  try {
    navigator?.vibrate?.(80);
  } catch {
    // Vibration not available
  }
}

export function scanFeedback() {
  vibrate();
  playScanBeep();
}
