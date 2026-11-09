// Runs eval tickets live. Off unless EVALS_ENABLED=true (or a preview deployment).
// GET /api/evals?system=multi|single&from=0&n=2  (tickets from evals/sample.json)
import { readFileSync } from "node:fs";
import { TICKET_BY_ID } from "../lib/data.js";
import { multiAgent, singleAgent, score } from "../lib/agents.js";

const SAMPLE = JSON.parse(readFileSync(new URL("../evals/sample.json", import.meta.url), "utf8"));

export default async function handler(req, res) {
  if (process.env.EVALS_ENABLED !== "true" && process.env.VERCEL_ENV !== "preview") return res.status(404).json({ error: "not found" });
  const system = req.query.system === "single" ? "single" : "multi";
  const from = Math.max(0, Number(req.query.from) || 0);
  const n = Math.min(4, Math.max(1, Number(req.query.n) || 2));
  const rows = [];
  const started = Date.now();
  for (const s of SAMPLE.slice(from, from + n)) {
    if (Date.now() - started > 40000) break;
    const t = TICKET_BY_ID.get(s.ticket_id);
    try {
      const out = await (system === "single" ? singleAgent : multiAgent)(t);
      const sc = score(out, t);
      rows.push({ ...sc, outcome: out.decision.outcome, credit: out.decision.credit, category: out.category || null, reply: out.reply.slice(0, 600) });
    } catch (e) {
      rows.push({ ticket_id: t.ticket_id, system, error: (e.details || [e.message]).join(" | ").slice(0, 300) });
      break;
    }
  }
  res.status(200).json({ system, next: from + rows.filter((r) => !r.error).length, total: SAMPLE.length, rows });
}
