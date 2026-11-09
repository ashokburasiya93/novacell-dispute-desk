// Run one dispute through a system and return the full trace.
// GET /api/resolve?ticket_id=DSP-1001&system=multi|single|rules
// POST { customer_id, text, system } for a dispute you write yourself.
import { TICKET_BY_ID, ACCOUNTS } from "../lib/data.js";
import { multiAgent, singleAgent, rulesOnly } from "../lib/agents.js";

export default async function handler(req, res) {
  const q = req.method === "POST" ? req.body || {} : req.query || {};
  const system = q.system || "multi";
  let ticket = q.ticket_id ? TICKET_BY_ID.get(String(q.ticket_id)) : null;
  if (!ticket && q.customer_id && q.text) {
    if (!ACCOUNTS[q.customer_id]) return res.status(400).json({ error: "unknown customer" });
    ticket = { ticket_id: "CUSTOM", customer_id: String(q.customer_id), text: String(q.text).slice(0, 600) };
  }
  if (!ticket) return res.status(400).json({ error: "ticket_id, or customer_id and text, required" });
  try {
    const run = system === "single" ? singleAgent : system === "rules" ? rulesOnly : multiAgent;
    const out = await run(ticket);
    res.status(200).json({ ...out, expected: ticket.expected || null });
  } catch (e) {
    res.status(200).json({ system, error: "AI unavailable", details: e.details || [e.message] });
  }
}
