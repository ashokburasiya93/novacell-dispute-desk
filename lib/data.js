// Read-only data access: the tools the investigator can call. All data is synthetic.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const load = (f) => JSON.parse(readFileSync(join(HERE, "..", "data", f), "utf8"));
export const ACCOUNTS = load("accounts.json");
export const BILLS = load("bills.json");
export const RECORDS = load("records.json");
export const TICKETS = load("tickets.json");
export const TICKET_BY_ID = new Map(TICKETS.map((t) => [t.ticket_id, t]));

const need = (id) => {
  if (!ACCOUNTS[id]) throw new Error(`unknown customer ${id}`);
  return id;
};

export const TOOLS = {
  get_account: (id) => {
    const a = ACCOUNTS[need(id)];
    return { customer_id: a.customer_id, plan: a.plan_name, lines: a.lines, tenure_months: a.tenure_months, autopay: a.autopay,
      goodwill_credits_last_12_months: a.goodwill_credits_12m, late_fees_last_12_months: a.late_fees_12m, disputes_last_12_months: a.disputes_12m };
  },
  get_bill: (id) => ({ period: "October 2026", lines: BILLS[need(id)], total: Math.round(BILLS[id].reduce((s, l) => s + l.amount, 0) * 100) / 100 }),
  get_network_log: (id) => ({ note: "Country the phone was attached to, per day (only days around any roaming).", days: RECORDS[need(id)].network_days }),
  get_call_records: (id) => ({ international_calls: RECORDS[need(id)].intl_calls }),
  get_sms_subscriptions: (id) => ({ premium_sms: RECORDS[need(id)].sms_subscriptions }),
  get_payments: (id) => ({ payments: RECORDS[need(id)].payments }),
};

// JSON-schema tool definitions for the LLM agents
export const TOOL_SPECS = Object.keys(TOOLS).map((name) => ({
  type: "function",
  function: {
    name,
    description: {
      get_account: "Plan, lines, tenure and credit history for the customer.",
      get_bill: "October bill line items with line_id, type, description and amount.",
      get_network_log: "Which country the phone was attached to on each day around roaming charges.",
      get_call_records: "International call records (date, destination, minutes).",
      get_sms_subscriptions: "Premium SMS subscriptions and the opt-in evidence, if any.",
      get_payments: "Payments received this cycle, including failed autopay attempts.",
    }[name],
    parameters: { type: "object", properties: { customer_id: { type: "string" } }, required: ["customer_id"] },
  },
}));

export function runTool(name, args, allowedCustomer) {
  if (!TOOLS[name]) return { error: `no such tool ${name}` };
  if (args?.customer_id !== allowedCustomer) return { error: "tools can only read the customer on this ticket" };
  try {
    return TOOLS[name](args.customer_id);
  } catch (e) {
    return { error: e.message };
  }
}
