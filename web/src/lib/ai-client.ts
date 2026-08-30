import type { AiSettings } from "./galaxy-types";

const ANTHROPIC_VERSION = "2023-06-01";

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

export async function generateText(ai: AiSettings, prompt: string): Promise<string> {
  const apiKey = ai.keys[ai.provider];
  if (!apiKey) {
    throw new Error("Add an API key in Settings to use AI features.");
  }
  const model = ai.model;

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
