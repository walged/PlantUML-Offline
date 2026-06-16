import { invoke } from "@tauri-apps/api/core";
import { AI_PROVIDERS, useSettingsStore, type AiProvider } from "../../stores/settingsStore";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface AiRequest {
  base_url: string;
  api_key: string;
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
}

interface AiResponse {
  content: string;
}

/** Resolve the effective base URL for the configured provider. */
export function resolveBaseUrl(provider: AiProvider, customBaseUrl: string): string {
  if (provider === "custom") return customBaseUrl.trim();
  const preset = AI_PROVIDERS.find((p) => p.id === provider);
  return preset?.baseUrl ?? "";
}

/** Whether AI is configured enough to make a request. */
export function isAiConfigured(): boolean {
  const s = useSettingsStore.getState();
  const baseUrl = resolveBaseUrl(s.aiProvider, s.aiCustomBaseUrl);
  return Boolean(s.aiApiKey.trim() && baseUrl && s.aiModel.trim());
}

/**
 * Send a chat completion via the Rust backend (no CORS, key stays out of the
 * webview network layer). Returns the assistant's text.
 */
export async function aiChat(
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number } = {},
): Promise<string> {
  const s = useSettingsStore.getState();
  const baseUrl = resolveBaseUrl(s.aiProvider, s.aiCustomBaseUrl);

  const request: AiRequest = {
    base_url: baseUrl,
    api_key: s.aiApiKey,
    model: s.aiModel,
    messages,
    temperature: opts.temperature,
    max_tokens: opts.maxTokens,
  };

  const res = await invoke<AiResponse>("ai_chat", { request });
  return res.content;
}

const SYSTEM_PROMPT =
  "You are an expert assistant for PlantUML. You write correct, idiomatic " +
  "PlantUML diagram code. When asked to produce a diagram, return ONLY the " +
  "PlantUML source starting with @startuml (or @startmindmap, @startgantt, " +
  "etc.) and ending with the matching @end tag — no markdown fences, no prose. " +
  "When asked to explain, answer concisely in the user's language.";

/** Strip ```/```plantuml fences and surrounding prose, returning raw PlantUML. */
export function extractPlantUml(text: string): string {
  const trimmed = text.trim();
  // Prefer a fenced block if present.
  const fence = trimmed.match(/```(?:plantuml|puml)?\s*([\s\S]*?)```/i);
  const body = fence ? fence[1] : trimmed;
  // If the model included prose, keep only from the first @start tag.
  const startMatch = body.match(/@start\w+[\s\S]*?@end\w+/i);
  return (startMatch ? startMatch[0] : body).trim();
}

// --- The four AI features ------------------------------------------------

/** Feature 1: natural-language description → PlantUML code. */
export async function generateDiagram(description: string): Promise<string> {
  const out = await aiChat(
    [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Create a PlantUML diagram for the following request:\n\n${description}`,
      },
    ],
    { temperature: 0.3 },
  );
  return extractPlantUml(out);
}

/** Feature 2a: fix code given the render error from the server. */
export async function fixDiagram(code: string, error: string): Promise<string> {
  const out = await aiChat(
    [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content:
          `The following PlantUML code fails to render with this error:\n\n` +
          `ERROR: ${error}\n\nCODE:\n${code}\n\n` +
          `Return the corrected PlantUML source only.`,
      },
    ],
    { temperature: 0.2 },
  );
  return extractPlantUml(out);
}

/** Feature 2b: explain the current diagram / error in plain language. */
export async function explainDiagram(code: string): Promise<string> {
  return aiChat(
    [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Explain what this PlantUML diagram represents, briefly:\n\n${code}`,
      },
    ],
    { temperature: 0.4 },
  );
}

/** Feature 3: improve / refactor the (selected) code. */
export async function improveDiagram(code: string, instruction?: string): Promise<string> {
  const ask = instruction?.trim()
    ? instruction.trim()
    : "Improve the styling and clarity of this diagram, add missing relationships if obvious, and keep its meaning.";
  const out = await aiChat(
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `${ask}\n\nCODE:\n${code}\n\nReturn only the PlantUML source.` },
    ],
    { temperature: 0.3 },
  );
  return extractPlantUml(out);
}

/** Feature 4: contextual chat about the current diagram. */
export async function chatAboutDiagram(
  history: ChatMessage[],
  currentCode: string,
): Promise<string> {
  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "system",
      content: `The user's current PlantUML diagram is:\n${currentCode}`,
    },
    ...history,
  ];
  return aiChat(messages, { temperature: 0.4 });
}
