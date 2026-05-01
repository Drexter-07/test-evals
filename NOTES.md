# NOTES.md

## Strategy Results

Full 50-case evaluation run on Claude Haiku 4.5 (`claude-haiku-4-5-20251001`) across all three prompt strategies:

| Strategy  | Overall F1 | Hallucinations | Cost    |
| --------- | ---------- | -------------- | ------- |
| few_shot  | **0.82**   | lowest         | $0.2527 |
| zero_shot | 0.79       | mid            | $0.1929 |
| cot       | 0.79       | **113**        | $0.2052 |

### Rate Limit Handling
When Anthropic returns a 429, the affected case backs off exponentially (1s → 2s → 4s → up to 32s) while all other concurrent cases continue unaffected. A `Semaphore(5)` keeps at most 5 cases in-flight at a time. See `apps/server/src/services/runner.service.ts` and `packages/shared/src/constants.ts`.

---

## Prompt Engineering Judgement

The three strategies are meaningfully different in *what information they give the model* and *how they ask it to reason*, not just surface-level wording changes.

**Zero-shot** gives Claude a single instruction and nothing else: extract the data, use the tool, be precise. It relies entirely on the model's built-in understanding of clinical terminology. The system prompt is ~50 tokens. Cost per run is lowest, and because there's no example to follow, the model chooses its own output style — sometimes verbose, sometimes terse.

**Few-shot** gives Claude the same instruction plus two fully worked examples: a real transcript and its exact gold JSON output. This is a deliberate design choice — the examples teach the model *formatting conventions*, not just facts. Specifically: how terse a `chief_complaint` should be, that plan items are short imperative sentences, and that medication frequencies should be written as "twice daily" not "BID". The system prompt is ~2000 tokens (including both examples), so it is cached via `cache_control: ephemeral` to avoid paying for it on every case.

**CoT** (Chain-of-Thought) adds a numbered reasoning guide before extraction: "1. Read the transcript carefully. 2. Identify the chief complaint. 3. Find vitals…" The hypothesis was that step-by-step reasoning would reduce errors on complex cases. In practice it backfired. For strict schema extraction via tool use, the reasoning trace caused the model to over-interpret ambiguous phrases and invent details not in the transcript — producing the highest hallucination count.

### Concrete Example: How CoT Fails

Here is a real case from the CoT run (case from cot run `63aa24be`):

**Gold `chief_complaint`:**
```
"sore throat and nasal congestion for four days"
```
**CoT Prediction `chief_complaint`:**
```
"Sore throat for four days with nasal congestion and mild nocturnal dry cough"
```
The model added *"mild nocturnal dry cough"* — a detail mentioned in passing in the transcript, not the reason the patient came in. CoT's reasoning trace led it to aggregate context rather than extract the chief complaint.

**Gold `medications`:** one entry — ibuprofen.  
**CoT Prediction `medications`:** two entries — ibuprofen **and** "Saline nasal spray" (which is a plan item, not a prescribed medication). The model hallucinated it as a second medication because the reasoning step said "list all medications".

**Gold `follow_up.reason`:**
```
"return only if symptoms worsen"
```
**CoT Prediction `follow_up.reason`:**
```
"No routine follow-up needed; patient to call if symptoms worsen or persist beyond 7 days or if fever exceeds 102°F"
```
Verbose, rephrased, fails fuzzy matching against the gold's short string.

### Why Each Strategy Wins or Loses Per Field

| Field | Winner | Why |
|---|---|---|
| Chief Complaint | few_shot | Examples anchor the expected brevity. Without them, model writes longer, less matchable strings. CoT over-aggregates context into the complaint. |
| Vitals | Tied (~0.99) | Vitals are numeric and unambiguous. Strategy has no effect here. |
| Medications | few_shot | Examples show spelling conventions and that plan items are not medications. CoT specifically inflates medication lists by confusing plan items. |
| Diagnoses | zero_shot / few_shot (~0.89) | Model is competent at ICD-style extraction either way. CoT loses by overthinking differential diagnoses. |
| Plan | few_shot | Gold plan items are short, specific imperative sentences. Without examples, model writes compound verbose sentences that only partially match. |
| Follow-Up | zero_shot | Follow-up phrasing is too varied across cases for the two examples to generalize. All strategies perform similarly here. |

**Bottom line:** few-shot wins not because it teaches Claude *what* to extract — it already knows that — but because it teaches it *how to phrase the output* to match the gold standard. CoT hurts specifically because it encourages aggregation and summarization, which is the opposite of what strict schema extraction needs.

---

## What Surprised Me

1. **CoT and zero-shot tied on overall F1 (0.79), but CoT produced 113 hallucinations vs zero-shot's lower count.** This means CoT is strictly worse: same accuracy, more invented content. The reasoning trace is actively harmful for structured extraction tasks.

2. **Vitals are nearly perfect across all strategies (0.99+).** Vitals are always stated as explicit numeric values in the transcript ("BP 122/78, HR 88") so they are trivially easy to extract. The interesting variance is in `plan` and `medications`.

3. **Few-shot costs more but saves on hallucinations.** At $0.2527 vs $0.1929, the extra $0.06 buys you a significant drop in hallucinations and a measurable F1 improvement on the fields that matter most.

4. **Prompt caching made few-shot economically viable.** The first call pays to write ~2000 tokens to the cache. Every subsequent call reads from cache at 10× lower cost. Without caching, few-shot would be significantly more expensive per run.

---

## What I'd Build Next

1. **Per-field strategy routing.** Use few-shot specifically for `plan` and `medications` (where it clearly wins) and zero-shot for `vitals` and `diagnoses` (where it performs equally at lower cost).

2. **Cost guardrail.** Pre-estimate token count from transcript length before starting a run. Reject if projected cost exceeds a configured cap.

3. **Active-learning hints.** Surface the 5 cases with the highest disagreement between strategies — these are worth reviewing and re-annotating.

4. **Cross-model comparison.** Add Claude 3.5 Sonnet to test whether the F1 improvement justifies the ~5× cost increase.

---

## What I Cut

- **Prompt diff view.** Would show character-level diffs between prompt versions. Skipped because `prompt_hash` already identifies unique prompts and the compare view shows score deltas.
- **Full transcript highlighting.** The grounding check logic exists (`hallucination.ts`) but the frontend renders plain JSON for now. A visual highlight of which transcript spans back each predicted value would make hallucination detection more interpretable.
- **Second model.** Haiku 4.5 was sufficient to demonstrate all three strategies. Adding Sonnet would be a two-line change in the runner.
