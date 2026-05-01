import { expect, test } from "bun:test";
import { detectHallucinations } from "../services/metrics/hallucination";

test("Hallucination detector flags fake data (positive case)", () => {
  const transcript = "Patient took ibuprofen for pain.";
  const prediction = {
    medications: [
      { name: "ibuprofen" },
      { name: "amoxicillin" } // Hallucination
    ]
  };

  const results = detectHallucinations(prediction, transcript);
  const falseItems = results.filter(r => !r.grounded);
  
  expect(falseItems.length).toBe(1);
  expect(falseItems[0].value).toBe("amoxicillin");
});

test("Hallucination detector does not flag real data (negative case)", () => {
  const transcript = "Take ibuprofen 400 mg every 6 hours.";
  const prediction = {
    medications: [
      { name: "ibuprofen 400 mg" }
    ]
  };

  const results = detectHallucinations(prediction, transcript);
  const falseItems = results.filter(r => !r.grounded);
  
  expect(falseItems.length).toBe(0); // Fully grounded
});
