import fs from "fs";
import path from "path";
import { type ClinicalExtraction } from "@test-evals/shared";

export interface DatasetCase {
  id: string;
  transcript: string;
  gold: ClinicalExtraction;
}

export function loadDataset(): Map<string, DatasetCase> {
  const dataset = new Map<string, DatasetCase>();
  const transcriptsDir = path.resolve(process.cwd(), "../../data/transcripts");
  const goldDir = path.resolve(process.cwd(), "../../data/gold");

  const files = fs.readdirSync(transcriptsDir).filter(f => f.endsWith(".txt"));

  for (const file of files) {
    const id = file.replace(".txt", "");
    const transcript = fs.readFileSync(path.join(transcriptsDir, file), "utf8");
    const gold = JSON.parse(fs.readFileSync(path.join(goldDir, `${id}.json`), "utf8"));
    
    dataset.set(id, { id, transcript, gold });
  }

  return dataset;
}
