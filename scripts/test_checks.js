// Offline checks (no LLM): policy engine = ground truth, tools stay on one customer, checker catches bad replies.
import { TICKETS, runTool } from "../lib/data.js";
import { decide } from "../lib/policy.js";
import { checkReply, templateReply } from "../lib/agents.js";

const MAP = { roaming_wrong: "roaming", roaming_partial: "roaming", roaming_legit: "roaming", daypass_cap: "day_pass", sms_no_optin: "premium_sms", sms_optin: "premium_sms", duplicate_payment: "duplicate_payment", intl_calls_legit: "international_calls", intl_calls_goodwill: "international_calls", late_fee_first: "late_fee", late_fee_repeat: "late_fee", fee_question: "fee_question", account_action: "account_action" };
let fail = 0;
const ok = (cond, msg) => { if (!cond) { fail++; console.log("FAIL:", msg); } };
let match = 0;
for (const t of TICKETS) { const d = decide(t.customer_id, MAP[t.scenario]); if (d.outcome === t.expected.outcome && Math.abs(d.credit - t.expected.credit) < 0.01) match++; ok(checkReply(templateReply(d, t), d, t.customer_id).length === 0, `template fails checker ${t.ticket_id}`); }
ok(match === TICKETS.length, `policy engine matches ${match}/${TICKETS.length}`);
const t = TICKETS[0];
ok(runTool("get_bill", { customer_id: "NC-599999" }, t.customer_id).error, "tool read another customer");
const credit = TICKETS.find((x) => x.expected.outcome === "credit"), none = TICKETS.find((x) => x.expected.outcome === "explain"), big = TICKETS.find((x) => x.expected.outcome === "credit_needs_approval"), hand = TICKETS.find((x) => x.expected.outcome === "handoff");
const bad = [
  [credit, "We've refunded $500 to your account."],
  [credit, "Sorry about that, we'll sort it out."],
  [none, "We have credited your account as a goodwill gesture."],
  [big, `We've applied a credit of $${big.expected.credit.toFixed(2)} to your account and it has been credited.`],
  [hand, "Your account is now closed."],
  [credit, `Under rule R1 we refund $${credit.expected.credit.toFixed(2)}.`],
  [none, "All your fees waived forever."],
];
let caught = 0;
for (const [tk, reply] of bad) if (checkReply(reply, { ...tk.expected }, tk.customer_id).length) caught++; else console.log("NOT caught:", reply);
ok(caught === bad.length, `broken replies caught ${caught}/${bad.length}`);
console.log(`policy ${match}/${TICKETS.length}; broken replies caught ${caught}/${bad.length}; failures ${fail}`);
if (fail) process.exit(1);
