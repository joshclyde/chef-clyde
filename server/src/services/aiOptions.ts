/**
 * One place that decides which Claude model + effort every AI call uses, and how
 * to translate that choice into `messages.create` params. The user picks these
 * in the chat side panel; the client sends them on each AI request and we
 * validate here so an unknown/missing value falls back to a safe default rather
 * than reaching the API.
 *
 * Capability flags gate model-specific params: effort errors on Haiku 4.5 (it is
 * supported on Opus 4.8 / Sonnet 4.6), and adaptive thinking is likewise only
 * sent for the models that support it. Structured outputs (`output_config.format`)
 * are supported on all three offered models, so `format` is applied whenever a
 * schema is passed.
 */

type ModelCapabilities = {
  label: string;
  /** Whether to send `thinking: { type: "adaptive" }`. */
  thinking: boolean;
  /** Whether to send `output_config.effort` (errors on models without it). */
  effort: boolean;
};

export const AI_MODELS = {
  "claude-opus-4-8": { label: "Opus 4.8", thinking: true, effort: true },
  "claude-sonnet-4-6": { label: "Sonnet 4.6", thinking: true, effort: true },
  "claude-haiku-4-5": { label: "Haiku 4.5", thinking: false, effort: false },
} satisfies Record<string, ModelCapabilities>;

export type AiModel = keyof typeof AI_MODELS;
export type AiEffort = "low" | "medium" | "high";

export const DEFAULT_MODEL: AiModel = "claude-sonnet-4-6";
export const DEFAULT_EFFORT: AiEffort = "medium";

const EFFORTS: AiEffort[] = ["low", "medium", "high"];

export type AiOptions = { model: AiModel; effort: AiEffort };

/** The slice of a response's `usage` we surface to the user (token counts). */
export type AiUsage = { input_tokens: number; output_tokens: number };

/** Stand-in usage returned by mock (MOCK_AI) paths so the client renders uniformly. */
export const MOCK_USAGE: AiUsage = { input_tokens: 0, output_tokens: 0 };

/** Narrow a response's `usage` to the token counts we report. */
export function toUsage(usage: {
  input_tokens: number;
  output_tokens: number;
}): AiUsage {
  return {
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
  };
}

function isAiModel(value: unknown): value is AiModel {
  return typeof value === "string" && value in AI_MODELS;
}

function isAiEffort(value: unknown): value is AiEffort {
  return typeof value === "string" && (EFFORTS as string[]).includes(value);
}

/**
 * Pull `model`/`effort` off a request body, validating each against the
 * allowlist. Anything missing or unrecognized falls back to the defaults — the
 * client is never trusted to send a usable value.
 */
export function resolveAiOptions(body: unknown): AiOptions {
  const obj = (typeof body === "object" && body !== null ? body : {}) as {
    model?: unknown;
    effort?: unknown;
  };
  return {
    model: isAiModel(obj.model) ? obj.model : DEFAULT_MODEL,
    effort: isAiEffort(obj.effort) ? obj.effort : DEFAULT_EFFORT,
  };
}

type JsonSchema = Record<string, unknown>;

type ModelParams = {
  model: AiModel;
  thinking?: { type: "adaptive" };
  output_config?: {
    effort?: AiEffort;
    format?: { type: "json_schema"; schema: JsonSchema };
  };
};

/**
 * Build the params common to every `messages.create` call for the chosen model:
 * the model id, adaptive thinking (when supported), the effort level (when
 * supported), and an optional JSON-schema output format. Callers spread the
 * result and add their own `max_tokens` / `system` / `messages`.
 */
export function buildModelParams(
  opts: AiOptions,
  format?: JsonSchema,
): ModelParams {
  const caps = AI_MODELS[opts.model];
  const params: ModelParams = { model: opts.model };

  if (caps.thinking) params.thinking = { type: "adaptive" };

  const outputConfig: NonNullable<ModelParams["output_config"]> = {};
  if (caps.effort) outputConfig.effort = opts.effort;
  if (format) outputConfig.format = { type: "json_schema", schema: format };
  if (outputConfig.effort || outputConfig.format) {
    params.output_config = outputConfig;
  }

  return params;
}
