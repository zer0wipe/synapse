export type LLMProfileId = "default" | "creative-writer" | "coding-assistant" | "precise-research";

export interface LLMTuningValues {
  temperature: number;
  topP: number;
  topK: number;
  repeatPenalty: number;
  repeatLastN: number;
  frequencyPenalty: number;
  presencePenalty: number;
  penaltyAlpha: number;
  minP: number;
  typicalP: number;
  mirostat: number;
  mirostatTau: number;
  mirostatEta: number;
  numPredict: number;
  numCtx: number;
}

export const LLM_PROFILES: Record<LLMProfileId, LLMTuningValues> = {
  default: {
    temperature: 0.7,
    topP: 0.9,
    topK: 40,
    repeatPenalty: 1.1,
    repeatLastN: 64,
    frequencyPenalty: 0,
    presencePenalty: 0,
    penaltyAlpha: 0,
    minP: 0,
    typicalP: 1,
    mirostat: 0,
    mirostatTau: 5,
    mirostatEta: 0.1,
    numPredict: 512,
    numCtx: 2048,
  },
  "creative-writer": {
    temperature: 0.9,
    topP: 0.95,
    topK: 80,
    repeatPenalty: 1.0,
    repeatLastN: 128,
    frequencyPenalty: -0.2,
    presencePenalty: 0.2,
    penaltyAlpha: 0,
    minP: 0,
    typicalP: 0.98,
    mirostat: 0,
    mirostatTau: 5,
    mirostatEta: 0.1,
    numPredict: 768,
    numCtx: 3072,
  },
  "coding-assistant": {
    temperature: 0.2,
    topP: 0.65,
    topK: 32,
    repeatPenalty: 1.2,
    repeatLastN: 256,
    frequencyPenalty: 0.5,
    presencePenalty: -0.2,
    penaltyAlpha: 0,
    minP: 0,
    typicalP: 1,
    mirostat: 0,
    mirostatTau: 5,
    mirostatEta: 0.1,
    numPredict: 512,
    numCtx: 4096,
  },
  "precise-research": {
    temperature: 0.35,
    topP: 0.8,
    topK: 40,
    repeatPenalty: 1.15,
    repeatLastN: 128,
    frequencyPenalty: 0.2,
    presencePenalty: -0.1,
    penaltyAlpha: 0,
    minP: 0,
    typicalP: 0.95,
    mirostat: 0,
    mirostatTau: 5,
    mirostatEta: 0.1,
    numPredict: 600,
    numCtx: 3072,
  },
};

export function matchProfile(values: LLMTuningValues): LLMProfileId | "custom" {
  const entries = Object.entries(LLM_PROFILES) as Array<
    [LLMProfileId, LLMTuningValues]
  >;
  for (const [profileId, preset] of entries) {
    if (profileMatch(preset, values)) {
      return profileId;
    }
  }
  return "custom";
}

function profileMatch(
  preset: LLMTuningValues,
  values: LLMTuningValues,
): boolean {
  const keys = Object.keys(preset) as Array<keyof LLMTuningValues>;
  return keys.every((key) => nearlyEqual(preset[key], values[key]));
}

function nearlyEqual(a: number, b: number, epsilon = 0.0001): boolean {
  return Math.abs(a - b) <= epsilon;
}
