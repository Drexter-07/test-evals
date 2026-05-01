import fs from "fs";
import path from "path";

// We read the schema directly from the data folder
const schemaPath = path.resolve(process.cwd(), "../../data/schema.json");
const rawSchema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));

// Clean up schema for Anthropic (remove unsupported keywords if needed, though Anthropic handles JSON Schema well)
// Mostly it needs to be an object representing the parameters
export const extractionToolSchema = {
  name: "extract_clinical_data",
  description: "Extract structured clinical data from the transcript",
  input_schema: {
    type: "object",
    properties: rawSchema.properties,
    required: rawSchema.required,
    additionalProperties: false
  }
};

export const jsonSchema = rawSchema;
