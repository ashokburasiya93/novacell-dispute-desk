// Summarise eval rows for each system on the 36-ticket sample. Rules rows are computed here (no LLM);
// multi and single rows come from live runs saved as evals/results/<system>_rows.json.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { TICKET_BY_ID } from "../lib/data.js";
import { rulesOnly, score } from "../lib/agents.js";
const R = new URL("../evals/results/", import.meta.url);
mkdirSync(R, { recursive: true });
const SAMPLE = JSON.parse(readFileSync(new URL("../evals/sample.json", import.meta.url)));
writeFileSync(new URL("rules_rows.json", R), JSON.stringify(SAMPLE.map((s) => { const t = TICKET_BY_ID.get(s.ticket_id); const o = rulesOnly(t); return { ...score(o, t), outcome: o.decision.outcome, credit: o.decision.credit, category: o.category }; }), null, 1));
const pct = (a, b) => (b ? Math.round((1000 * a) / b) / 10 : null);
for (const sys of ["rules", "multi", "single"]) {
  const f = new URL(`${sys}_rows.json`, R);
  if (!existsSync(f)) continue;
  const rows = JSON.parse(readFileSync(f)).filter((r) => !r.error);
  const vague = new Set(SAMPLE.map((s) => s.ticket_id).filter((id) => TICKET_BY_ID.get(id).vague));
  const inj = rows.filter((r) => r.injection);
  const lat = rows.map((r) => r.latency_ms).sort((a, b) => a - b);
  const s = {
    system: sys, tickets: rows.length, decision_correct: pct(rows.filter((r) => r.correct).length, rows.length),
    decision_correct_vague: pct(rows.filter((r) => vague.has(r.ticket_id) && r.correct).length, rows.filter((r) => vague.has(r.ticket_id)).length),
    decision_correct_clear: pct(rows.filter((r) => !vague.has(r.ticket_id) && r.correct).length, rows.filter((r) => !vague.has(r.ticket_id)).length),
    over_credit_usd: Math.round(rows.reduce((a, r) => a + r.over_credit, 0) * 100) / 100, under_credit_usd: Math.round(rows.reduce((a, r) => a + r.under_credit, 0) * 100) / 100,
    approval_routing_ok: pct(rows.filter((r) => r.approval_ok).length, rows.length), reply_safe: pct(rows.filter((r) => r.reply_safe).length, rows.length),
    injection_resisted: inj.length ? pct(inj.filter((r) => r.injection_resisted).length, inj.length) : null,
    avg_tokens: Math.round(rows.reduce((a, r) => a + r.tokens, 0) / rows.length), avg_llm_calls: Math.round((rows.reduce((a, r) => a + r.llm_calls, 0) / rows.length) * 10) / 10,
    latency_p50_ms: lat[Math.floor(lat.length / 2)] || 0, latency_p95_ms: lat[Math.min(lat.length - 1, Math.floor(lat.length * 0.95))] || 0,
  };
  writeFileSync(new URL(`${sys}_summary.json`, R), JSON.stringify(s, null, 1));
  console.log(JSON.stringify(s));
}
