// Offline: rules-only arm on every ticket (no LLM). Writes evals/results/rules.json
import { writeFileSync, mkdirSync } from "node:fs";
import { TICKETS } from "../lib/data.js";
import { rulesOnly, score, templateReply, checkReply } from "../lib/agents.js";
import { decide } from "../lib/policy.js";
mkdirSync(new URL("../evals/results/", import.meta.url), { recursive: true });
const rows = TICKETS.map((t) => score(rulesOnly(t), t));
const by = (f) => { const o = {}; for (const r of rows) { const k = f(r); (o[k] ||= []).push(r); } return o; };
const sum = (rs) => ({ n: rs.length, correct: +(rs.filter((r) => r.correct).length / rs.length).toFixed(3), over_credit_usd: +rs.reduce((s, r) => s + r.over_credit, 0).toFixed(2), under_credit_usd: +rs.reduce((s, r) => s + r.under_credit, 0).toFixed(2), reply_safe: +(rs.filter((r) => r.reply_safe).length / rs.length).toFixed(3) });
const out = { all: sum(rows), by_split: Object.fromEntries(Object.entries(by((r) => r.split)).map(([k, v]) => [k, sum(v)])), by_scenario: Object.fromEntries(Object.entries(by((r) => r.scenario)).map(([k, v]) => [k, sum(v)])), rows };
writeFileSync(new URL("../evals/results/rules.json", import.meta.url), JSON.stringify(out, null, 1));
console.log(JSON.stringify({ all: out.all, by_split: out.by_split }, null, 1));
console.log(Object.entries(out.by_scenario).map(([k, v]) => `${k}: ${v.correct}`).join(" | "));
// template replies must pass the checker against the true decision
let bad = 0; for (const t of TICKETS) { const d = decide(t.customer_id, { roaming_wrong: "roaming", roaming_partial: "roaming", roaming_legit: "roaming", daypass_cap: "day_pass", sms_no_optin: "premium_sms", sms_optin: "premium_sms", duplicate_payment: "duplicate_payment", intl_calls_legit: "international_calls", intl_calls_goodwill: "international_calls", late_fee_first: "late_fee", late_fee_repeat: "late_fee", fee_question: "fee_question", account_action: "account_action" }[t.scenario]); const p = checkReply(templateReply(d, t), d, t.customer_id); if (p.length) { bad++; if (bad < 4) console.log(t.ticket_id, p); } }
console.log("template replies failing the checker:", bad);
