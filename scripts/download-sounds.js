#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const SOUNDS_DIR = path.join(ROOT_DIR, 'assets', 'sounds');

const SOUND_DEFS = {
  ambient: {
    'home-room': { duration: 7.5, waveform: 'triangle', freqStart: 95, freqEnd: 120, volume: 0.12, noise: 0.12, amFreq: 0.25, amDepth: 0.45 },
    'distant-meow': { duration: 1.0, waveform: 'sine', freqStart: 420, freqEnd: 560, volume: 0.2, noise: 0.02, amFreq: 2.4, amDepth: 0.15 },
    'purr-bed': { duration: 6.5, waveform: 'sine', freqStart: 29, freqEnd: 35, volume: 0.18, noise: 0.03, amFreq: 1.7, amDepth: 0.55 },
    'purr-bed-rich': { duration: 6.5, waveform: 'triangle', freqStart: 28, freqEnd: 38, volume: 0.22, noise: 0.04, amFreq: 2.1, amDepth: 0.58 },
  },
  meow: {
    greeting: { duration: 0.55, waveform: 'sine', freqStart: 520, freqEnd: 700, volume: 0.28, noise: 0.01, amFreq: 5, amDepth: 0.15 },
    demanding: { duration: 0.7, waveform: 'saw', freqStart: 460, freqEnd: 730, volume: 0.24, noise: 0.03, amFreq: 4, amDepth: 0.18 },
    complaint: { duration: 0.82, waveform: 'triangle', freqStart: 380, freqEnd: 520, volume: 0.23, noise: 0.03, amFreq: 3, amDepth: 0.2 },
    tiny: { duration: 0.34, waveform: 'sine', freqStart: 640, freqEnd: 780, volume: 0.2, noise: 0.01, amFreq: 6, amDepth: 0.15 },
  },
  event: {
    eating: { duration: 0.72, waveform: 'square', freqStart: 1600, freqEnd: 880, volume: 0.12, noise: 0.35, amFreq: 9, amDepth: 0.35 },
    drinking: { duration: 0.86, waveform: 'sine', freqStart: 980, freqEnd: 760, volume: 0.11, noise: 0.25, amFreq: 8, amDepth: 0.3 },
    purring: { duration: 1.8, waveform: 'triangle', freqStart: 30, freqEnd: 36, volume: 0.24, noise: 0.03, amFreq: 1.8, amDepth: 0.6 },
    petting: { duration: 0.68, waveform: 'triangle', freqStart: 260, freqEnd: 340, volume: 0.17, noise: 0.08, amFreq: 2.5, amDepth: 0.25 },
    sleeping: { duration: 1.35, waveform: 'sine', freqStart: 75, freqEnd: 60, volume: 0.1, noise: 0.05, amFreq: 0.8, amDepth: 0.4 },
  },
  voice: {
    chirp: { duration: 0.3, waveform: 'sine', freqStart: 820, freqEnd: 1300, volume: 0.2, noise: 0.01, amFreq: 10, amDepth: 0.2 },
    trill: { duration: 0.46, waveform: 'triangle', freqStart: 680, freqEnd: 1140, volume: 0.19, noise: 0.02, amFreq: 12, amDepth: 0.35 },
    summon: { duration: 0.42, waveform: 'sine', freqStart: 520, freqEnd: 900, volume: 0.2, noise: 0.01, amFreq: 7, amDepth: 0.22 },
    reply: { duration: 0.44, waveform: 'triangle', freqStart: 580, freqEnd: 860, volume: 0.18, noise: 0.01, amFreq: 7.5, amDepth: 0.2 },
  },
};

const SOURCE_MANIFEST = {
  generatedAt: new Date().toISOString(),
  note: 'Replace generated placeholder WAV files with royalty-free recordings from the URLs below.',
  sources: {
    ambient: {
      'home-room': ['https://freesound.org/search/?q=cat%20ambient%20home&f=license%3A%22Creative+Commons+0%22'],
      'distant-meow': ['https://freesound.org/search/?q=distant%20cat%20meow&f=license%3A%22Creative+Commons+0%22'],
      'purr-bed': ['https://freesound.org/search/?q=cat%20purr%20loop&f=license%3A%22Creative+Commons+0%22'],
      'purr-bed-rich': ['https://freesound.org/search/?q=cat%20purr%20stereo&f=license%3A%22Creative+Commons+0%22'],
    },
    meow: {
      greeting: ['https://freesound.org/search/?q=cat%20greeting%20meow&f=license%3A%22Creative+Commons+0%22'],
      demanding: ['https://freesound.org/search/?q=demanding%20cat%20meow&f=license%3A%22Creative+Commons+0%22'],
      complaint: ['https://freesound.org/search/?q=complaint%20cat%20meow&f=license%3A%22Creative+Commons+0%22'],
      tiny: ['https://freesound.org/search/?q=tiny%20kitten%20mew&f=license%3A%22Creative+Commons+0%22'],
    },
    event: {
      eating: ['https://freesound.org/search/?q=cat%20eating&f=license%3A%22Creative+Commons+0%22'],
      drinking: ['https://freesound.org/search/?q=cat%20drinking&f=license%3A%22Creative+Commons+0%22'],
      purring: ['https://freesound.org/search/?q=cat%20purring&f=license%3A%22Creative+Commons+0%22'],
      petting: ['https://freesound.org/search/?q=cat%20petting&f=license%3A%22Creative+Commons+0%22'],
      sleeping: ['https://freesound.org/search/?q=cat%20sleeping%20snore&f=license%3A%22Creative+Commons+0%22'],
    },
    voice: {
      chirp: ['https://freesound.org/search/?q=cat%20chirp&f=license%3A%22Creative+Commons+0%22'],
      trill: ['https://freesound.org/search/?q=cat%20trill&f=license%3A%22Creative+Commons+0%22'],
      summon: ['https://freesound.org/search/?q=cat%20response%20meow&f=license%3A%22Creative+Commons+0%22'],
      reply: ['https://freesound.org/search/?q=cat%20acknowledge%20meow&f=license%3A%22Creative+Commons+0%22'],
    },
  },
};

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function clamp(sample) {
  if (sample > 1) return 1;
  if (sample < -1) return -1;
  return sample;
}

function waveValue(type, phase) {
  switch (type) {
    case 'square':
      return Math.sign(Math.sin(phase));
    case 'saw': {
      const normalized = phase / (2 * Math.PI);
      return 2 * (normalized - Math.floor(normalized + 0.5));
    }
    case 'triangle':
      return (2 / Math.PI) * Math.asin(Math.sin(phase));
    case 'sine':
    default:
      return Math.sin(phase);
  }
}

function envelope(position) {
  const attack = Math.min(0.08, position);
  const release = Math.min(0.12, 1 - position);
  const attackGain = attack / 0.08;
  const releaseGain = release / 0.12;
  return Math.max(0, Math.min(1, attackGain, releaseGain));
}

function generateWav(filePath, profile) {
  const sampleRate = 44_100;
  const channels = 1;
  const bitsPerSample = 16;
  const duration = profile.duration;
  const sampleCount = Math.max(1, Math.floor(sampleRate * duration));
  const blockAlign = channels * (bitsPerSample / 8);
  const byteRate = sampleRate * blockAlign;
  const dataSize = sampleCount * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  let phase = 0;
  for (let i = 0; i < sampleCount; i += 1) {
    const t = i / sampleRate;
    const progress = sampleCount === 1 ? 0 : i / (sampleCount - 1);
    const freq = profile.freqStart + (profile.freqEnd - profile.freqStart) * progress;
    const amplitudeMod = 1 - (profile.amDepth || 0) + (profile.amDepth || 0) * ((Math.sin(2 * Math.PI * (profile.amFreq || 0) * t) + 1) / 2);
    const main = waveValue(profile.waveform, phase);
    const noise = (Math.random() * 2 - 1) * (profile.noise || 0);
    const value = clamp((main + noise) * profile.volume * amplitudeMod * envelope(progress));

    phase += (2 * Math.PI * freq) / sampleRate;

    const int16 = Math.round(value * 32767);
    buffer.writeInt16LE(int16, 44 + i * 2);
  }

  fs.writeFileSync(filePath, buffer);
}

function main() {
  const forceOverwrite = process.argv.includes('--force');

  ensureDir(SOUNDS_DIR);

  let created = 0;
  let skipped = 0;

  for (const [category, sounds] of Object.entries(SOUND_DEFS)) {
    const categoryDir = path.join(SOUNDS_DIR, category);
    ensureDir(categoryDir);

    for (const [name, profile] of Object.entries(sounds)) {
      const targetPath = path.join(categoryDir, `${name}.wav`);
      if (!forceOverwrite && fs.existsSync(targetPath)) {
        skipped += 1;
        continue;
      }

      generateWav(targetPath, profile);
      created += 1;
    }
  }

  fs.writeFileSync(
    path.join(SOUNDS_DIR, 'sources.json'),
    `${JSON.stringify(SOURCE_MANIFEST, null, 2)}\n`,
    'utf8',
  );

  console.log(`[download-sounds] generated: ${created}, skipped: ${skipped}`);
  console.log(`[download-sounds] manifest: ${path.join('assets', 'sounds', 'sources.json')}`);
}

main();
