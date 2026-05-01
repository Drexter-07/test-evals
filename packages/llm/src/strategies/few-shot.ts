import fs from "fs";
import path from "path";

// Load examples for few shot
function loadCase(id: string) {
  const transcript = fs.readFileSync(path.resolve(process.cwd(), `../../data/transcripts/${id}.txt`), "utf8");
  const gold = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), `../../data/gold/${id}.json`), "utf8"));
  return { transcript, gold };
}

let cachedPrompt: string | null = null;

export function getFewShotPrompt(): string {
  if (cachedPrompt) return cachedPrompt;
  
  const c1 = loadCase("case_001");
  const c6 = loadCase("case_006");

  cachedPrompt = `You are a clinical data extraction assistant. Extract structured clinical data from the following doctor-patient transcript. Be precise and only include information explicitly stated in the transcript.

Here are some examples of correctly extracted data from transcripts:

--- Example 1 ---
Transcript:
${c1.transcript}

Extraction:
${JSON.stringify(c1.gold, null, 2)}

--- Example 2 ---
Transcript:
${c6.transcript}

Extraction:
${JSON.stringify(c6.gold, null, 2)}
--- End Examples ---`;

  return cachedPrompt;
}
