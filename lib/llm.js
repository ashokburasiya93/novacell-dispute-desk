// Model chain with tool calling: Groq gpt-oss-120b -> Groq gpt-oss-20b -> OpenRouter Gemma (fallback).
export const MODELS = {
  primary: { provider: "Groq", model: process.env.PRIMARY_MODEL || "openai/gpt-oss-120b" },
  secondary: { provider: "Groq", model: process.env.SECONDARY_MODEL || "openai/gpt-oss-20b" },
  fallback: { provider: "OpenRouter", model: process.env.FALLBACK_MODEL || "google/gemma-4-31b-it:free" },
};

async function callChat({ provider, model }, messages, { tools, json, timeoutMs = 25000 } = {}) {
  const isGroq = provider === "Groq";
  const url = isGroq ? "https://api.groq.com/openai/v1/chat/completions" : "https://openrouter.ai/api/v1/chat/completions";
  const key = isGroq ? process.env.GROQ_API_KEY : process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error(`${provider} API key is not configured`);
  const body = { model, messages, temperature: 0, max_tokens: 1200 };
  if (tools) { body.tools = tools; body.tool_choice = "auto"; }
  if (json && !tools && isGroq) body.response_format = { type: "json_object" };
  if (isGroq && model.startsWith("openai/gpt-oss")) body.reasoning_effort = "low";
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const send = () => fetch(url, { method: "POST", signal: ctrl.signal, headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json",
      ...(isGroq ? {} : { "HTTP-Referer": "https://novacell-dispute-desk.vercel.app", "X-Title": "NovaCell Dispute Desk" }) }, body: JSON.stringify(body) });
    let res = await send();
    const wait = Number(res.headers.get("retry-after"));
    if (res.status === 429 && wait > 0 && wait <= 8) { await new Promise((r) => setTimeout(r, wait * 1000)); res = await send(); }
    if (!res.ok) throw new Error(`${provider} HTTP ${res.status}: ${(await res.text()).slice(0, 160)}`);
    const data = await res.json();
    return { message: data.choices?.[0]?.message || {}, usage: data.usage || {}, provider, model };
  } finally {
    clearTimeout(timer);
  }
}

export function parseJSON(text) {
  const m = String(text || "").match(/\{[\s\S]*\}/);
  if (!m) throw new Error("model did not return JSON");
  return JSON.parse(m[0]);
}

/** One chat turn with fallback across the chain. `tier` lets an agent start lower in the chain. */
export async function chat(messages, opts = {}) {
  const chain = [["primary", MODELS.primary], ["secondary", MODELS.secondary], ["fallback", MODELS.fallback]];
  const start = opts.startTier === "secondary" ? 1 : 0;
  const errors = [];
  for (const [tier, cfg] of chain.slice(start)) {
    try {
      const r = await callChat(cfg, messages, opts);
      if (opts.json && !r.message.tool_calls?.length) r.parsed = parseJSON(r.message.content);
      return { ...r, tier, errors };
    } catch (e) {
      errors.push(`${cfg.provider} ${cfg.model}: ${e.message}`);
    }
  }
  const err = new Error("All models failed");
  err.details = errors;
  throw err;
}
