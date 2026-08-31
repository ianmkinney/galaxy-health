import type { AiSettings } from "./galaxy-types";

const ANTHROPIC_VERSION = "2023-06-01";

export type ProviderId = AiSettings["provider"];
export type ProviderModel = { id: string; name: string; isFallback?: boolean };

export const DEFAULT_MODELS: Record<ProviderId, string> = {
  anthropic: "claude-3-5-haiku-latest",
  openai: "gpt-4o-mini",
  xai: "grok-3-mini",
  gemini: "gemini-2.0-flash",
};

export function fallbackModels(provider: ProviderId): ProviderModel[] {
  const id = DEFAULT_MODELS[provider] || DEFAULT_MODELS.openai;
  return [{ id, name: id, isFallback: true }];
}

function httpError(status: number, body: string) {
  const snippet = body.replace(/\s+/g, " ").slice(0, 180);
  if (status === 401 || status === 403) return "API key rejected. Check Account / Settings.";
  if (status === 429) return "Provider rate-limited. Try again shortly.";
  if (status === 404) return "Model not found. Pick another in Settings.";
  return snippet ? `Provider error ${status}: ${snippet}` : `Provider error ${status}`;
}

async function fetchJson(url: string, init: RequestInit) {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    throw new Error(
      `Couldn't reach the provider. ${error instanceof Error ? error.message : ""}`
    );
  }
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(httpError(response.status, body));
  }
  return response.json();
}

function flashRank(id: string) {
  const lower = (id || "").toLowerCase();
  if (/(haiku|mini|nano|flash|lite)/.test(lower)) return 0;
  if (/(sonnet|gpt-4o(?!-mini)|grok-3(?!-mini))/.test(lower)) return 1;
  return 2;
}

function sortModels(models: ProviderModel[]) {
  return [...models].sort((a, b) => {
    const rank = flashRank(a.id) - flashRank(b.id);
    if (rank !== 0) return rank;
    return a.id.localeCompare(b.id);
  });
}

function isChattyOpenAiModel(id: string) {
  const lower = (id || "").toLowerCase();
  const excluded = [
    "embedding",
    "whisper",
    "tts",
    "dall-e",
    "davinci",
    "babbage",
    "ada",
    "moderation",
    "transcribe",
    "realtime",
    "search",
    "sora",
    "audio",
    "image",
    "computer-use",
    "codex-mini",
  ];
  if (excluded.some((part) => lower.includes(part))) return false;
  if (lower.startsWith("ft:")) {
    const base = lower.slice(3).split(":")[0] || "";
    return /^(gpt|o[1-9]|chatgpt|grok)/.test(base) || base.includes("chat");
  }
  return /^(gpt|o[1-9]|chatgpt|grok)/.test(lower) || lower.includes("chat");
}

function isChattyGeminiModel(model: { name?: string; supportedGenerationMethods?: string[] }) {
  const name = (model.name || "").replace(/^models\//, "");
  const lower = name.toLowerCase();
  if (
    /(embedding|imagen|aqa|tts|robotics|computer-use|veo|image-generation|-image$|-image-preview|flash-image|pro-image)/.test(
      lower
    )
  ) {
    return false;
  }
  const methods = model.supportedGenerationMethods || [];
  return methods.includes("generateContent");
}

async function listAnthropicModels(apiKey: string): Promise<ProviderModel[]> {
  const out: ProviderModel[] = [];
  let afterId = "";
  do {
    const params = new URLSearchParams({ limit: "100" });
    if (afterId) params.set("after_id", afterId);
    const json = await fetchJson(`https://api.anthropic.com/v1/models?${params.toString()}`, {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
    });
    const page: { id: string; display_name?: string }[] = json.data || [];
    for (const item of page) {
      out.push({ id: item.id, name: item.display_name || item.id });
    }
    afterId = json.has_more && page.length ? page[page.length - 1].id : "";
  } while (afterId);
  return out;
}

async function listOpenAiCompatibleModels(baseUrl: string, apiKey: string): Promise<ProviderModel[]> {
  const json = await fetchJson(`${baseUrl}/models`, {
    headers: { authorization: `Bearer ${apiKey}` },
  });
  return (json.data || [])
    .map((item: { id: string }) => item.id)
    .filter(isChattyOpenAiModel)
    .map((id: string) => ({ id, name: id }));
}

async function listGeminiModels(apiKey: string): Promise<ProviderModel[]> {
  const chat: ProviderModel[] = [];
  let pageToken = "";
  do {
    const params = new URLSearchParams({ key: apiKey, pageSize: "100" });
    if (pageToken) params.set("pageToken", pageToken);
    const json = await fetchJson(
      `https://generativelanguage.googleapis.com/v1beta/models?${params.toString()}`,
      {}
    );
    for (const model of json.models || []) {
      if (!isChattyGeminiModel(model)) continue;
      const id = String(model.name || "").replace(/^models\//, "");
      chat.push({ id, name: model.displayName || id });
    }
    pageToken = json.nextPageToken || "";
  } while (pageToken);
  return chat;
}

export async function listProviderModels(options: {
  provider: ProviderId;
  apiKey: string;
}): Promise<ProviderModel[]> {
  const { provider, apiKey } = options;
  if (!apiKey) throw new Error("Add an API key in Settings to list models.");
  let models: ProviderModel[] = [];
  switch (provider) {
    case "anthropic":
      models = await listAnthropicModels(apiKey);
      break;
    case "openai":
      models = await listOpenAiCompatibleModels("https://api.openai.com/v1", apiKey);
      break;
    case "xai":
      models = await listOpenAiCompatibleModels("https://api.x.ai/v1", apiKey);
      break;
    case "gemini":
      models = await listGeminiModels(apiKey);
      break;
    default:
      throw new Error("Unknown AI provider.");
  }
  return sortModels(models);
}

export async function generateText(ai: AiSettings, prompt: string): Promise<string> {
  const apiKey = ai.keys[ai.provider];
  if (!apiKey) {
    throw new Error("Add an API key in Settings to use AI features.");
  }
  const model = ai.model || DEFAULT_MODELS[ai.provider];

  switch (ai.provider) {
    case "anthropic": {
      const json = await fetchJson("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": ANTHROPIC_VERSION,
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const text = (json.content || [])
        .filter((p: { type: string }) => p.type === "text")
        .map((p: { text: string }) => p.text)
        .join("\n")
        .trim();
      if (!text) throw new Error("Empty model response.");
      return text;
    }
    case "openai":
    case "xai": {
      const base =
        ai.provider === "openai" ? "https://api.openai.com/v1" : "https://api.x.ai/v1";
      const json = await fetchJson(`${base}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const text = json.choices?.[0]?.message?.content?.trim();
      if (!text) throw new Error("Empty model response.");
      return text;
    }
    case "gemini": {
      const json = await fetchJson(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
          }),
        }
      );
      const text = (json.candidates?.[0]?.content?.parts || [])
        .map((p: { text?: string }) => p.text)
        .filter(Boolean)
        .join("\n")
        .trim();
      if (!text) throw new Error("Empty model response.");
      return text;
    }
    default:
      throw new Error("Unknown provider.");
  }
}
