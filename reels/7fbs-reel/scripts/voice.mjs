// Makes one voiceover clip per scene with Kokoro (free, runs on the laptop's CPU)
// and writes each clip's length to src/timing.json so the scenes follow the voice.
// Usage: npm run voice            (change VOICE / SPEED below to try another voice)
import { KokoroTTS } from "kokoro-js";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const VOICE = process.env.VOICE || "af_heart"; // try: am_michael, am_fenrir, bf_emma, af_bella
const SPEED = Number(process.env.SPEED || 1.12);

const scenes = JSON.parse(readFileSync("src/scenes.json", "utf8"));
mkdirSync("public/vo", { recursive: true });

const tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", {
  dtype: "q8",
  device: "cpu",
});

const timing = {};
for (const s of scenes) {
  const audio = await tts.generate(s.say, { voice: VOICE, speed: SPEED });
  audio.save(`public/vo/${s.id}.wav`);
  timing[s.id] = +(audio.audio.length / audio.sampling_rate).toFixed(3);
  console.log(s.id, timing[s.id] + "s");
}
writeFileSync("src/timing.json", JSON.stringify(timing, null, 2));
const total = Object.values(timing).reduce((a, b) => a + b, 0);
console.log(`Voice total ${total.toFixed(1)}s with voice ${VOICE} at speed ${SPEED}`);
