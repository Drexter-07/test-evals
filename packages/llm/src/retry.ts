import Ajv from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { jsonSchema } from "./tool-schema";

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile(jsonSchema);

export function validateExtraction(data: any): { valid: boolean; errors: any[] } {
  const valid = validate(data);
  if (valid) {
    return { valid: true, errors: [] };
  }
  return { valid: false, errors: validate.errors || [] };
}
