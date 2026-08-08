#!/usr/bin/env node
// One-time (or as-needed) generator: creates natural-sounding Hebrew audio clips
// for every vocabulary item in assets/js/data.js, using Google Cloud
// Text-to-Speech's WaveNet voices instead of the browser's built-in TTS.
//
// Run this on your own machine (it needs real internet access + your API key),
// not inside a sandboxed session. Requires Node.js 18+ (uses the built-in
// fetch, no npm install needed).
//
// Usage:
//   GOOGLE_TTS_API_KEY=your-key node scripts/generate-audio.js
//
// Optional env vars:
//   VOICE_NAME      Google Cloud voice to use. Default: he-IL-Wavenet-C (female).
//                    Other Hebrew options: he-IL-Wavenet-A (female),
//                    he-IL-Wavenet-B (male), he-IL-Wavenet-D (male).
//                    If Hebrew Neural2/Chirp voices are available on your
//                    account by the time you run this, try those too -- they
//                    tend to sound even more natural.
//   SPEAKING_RATE   0.25-4.0. Default 0.95 (very slightly slower, easier for
//                    a learner to follow than full conversational speed).
//   FORCE           Set to "1" to regenerate files that already exist.
//                    Without it, the script skips words it already has audio
//                    for -- so re-running after adding new vocabulary only
//                    generates (and bills for) the new words.

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const API_KEY = process.env.GOOGLE_TTS_API_KEY;
const VOICE_NAME = process.env.VOICE_NAME || "he-IL-Wavenet-C";
const SPEAKING_RATE = parseFloat(process.env.SPEAKING_RATE || "0.95");
const FORCE = process.env.FORCE === "1";

if (!API_KEY) {
  console.error("Missing GOOGLE_TTS_API_KEY environment variable.");
  console.error("Usage: GOOGLE_TTS_API_KEY=your-key node scripts/generate-audio.js");
  process.exit(1);
}

const DATA_PATH = path.join(__dirname, "..", "assets", "js", "data.js");
const OUTPUT_DIR = path.join(__dirname, "..", "assets", "audio");

function loadIslands() {
  const source = fs.readFileSync(DATA_PATH, "utf8");
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(`${source}\nthis.ISLANDS = ISLANDS;`, sandbox);
  return sandbox.ISLANDS;
}

async function synthesize(text) {
  const response = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: "he-IL", name: VOICE_NAME },
        audioConfig: { audioEncoding: "MP3", speakingRate: SPEAKING_RATE },
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Google TTS API error ${response.status}: ${errorBody}`);
  }

  const { audioContent } = await response.json();
  return Buffer.from(audioContent, "base64");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const islands = loadIslands();
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  let generated = 0;
  let skipped = 0;
  let totalChars = 0;

  for (const island of islands) {
    for (const item of island.items) {
      const outPath = path.join(OUTPUT_DIR, `${item.id}.mp3`);

      if (fs.existsSync(outPath) && !FORCE) {
        skipped += 1;
        continue;
      }

      process.stdout.write(`Generating ${item.id} (${item.hebrew})... `);
      const audio = await synthesize(item.hebrew);
      fs.writeFileSync(outPath, audio);
      totalChars += item.hebrew.length;
      generated += 1;
      console.log("done");

      await sleep(150); // stay comfortably under API rate limits
    }
  }

  console.log(`\nGenerated ${generated} file(s), skipped ${skipped} existing file(s).`);
  console.log(
    `Approx. ${totalChars} characters sent to the API (Google's free tier is 1,000,000 chars/month for WaveNet voices).`
  );
}

main().catch((err) => {
  console.error("\nFailed:", err.message);
  process.exit(1);
});
