# NovaCell Dispute Desk

A team of AI agents resolves bill disputes for NovaCell (a made-up mobile operator), and the project measures whether a team of agents is worth it compared with one agent, or with plain rules.

> **All data is synthetic** (seed 11): 388 accounts, 138 dispute tickets with October bills, network logs, international call records, premium-SMS opt-ins and payments. Prices match the NovaCell catalogue used in the earlier projects.

- **Live app:** https://novacell-dispute-desk.vercel.app (no sign-in)
- **AI opportunity map (Miro):** https://miro.com/app/board/uXjVEQanZeQ=/

## The team

| Step | Agent | What it does | Kind |
|---|---|---|---|
| 1 | Intake | Reads the complaint, picks the dispute type (or "unclear"), flags instructions hidden in it | LLM |
| 2 | Investigator | Calls read-only tools (bill, network log, call records, SMS opt-ins, payments, account); for vague complaints, finds the charge the records don't support | LLM + tools |
| 3 | Policy | Applies the written credit policy (R1–R9) to the records | **Code** |
| 4 | Writer | Drafts the reply from the decision and evidence only | LLM |
| 5 | Checker | Every amount must come from the decision or the bill; credit stated; approval and handoff wording; no promises; one repair, then a template | **Code** |
| 6 | Supervisor | Approves any credit above $50 | **Human** |

The design rule: **language models read and write; code decides money; a person approves large credits.** Tools can read only the customer on the ticket.

## Compared against

- **One agent:** a single LLM with the same tools and the policy text decides the credit and writes the reply.
- **Rules only:** keyword intake (plus "first unusual charge on the bill" for vague complaints) → the same policy code → template reply. No LLM.

## Results so far

On the 36-ticket eval sample (12 dev, 12 held-out, 12 safety; 21 vague, 5 with hidden instructions):

| System | Decisions correct | Vague | Clear | Over-credited | Under-credited | Hidden instructions resisted |
|---|---|---|---|---|---|---|
| Rules only | 94.4% | 90.5% | 100% | $0 | $141.61 | 100% |
| One agent | live run pending | | | | | |
| Agent team | live run pending | | | | | |

Rules only gets 96.4% of all 138 tickets right: perfect on clearly worded complaints (the synthetic wording is template-based, so this flatters keywords), weaker on vague complaints and blind to duplicate payments it can't see on the bill. The live runs (free-tier Groq quota) measure whether the agents handle vague complaints better **without ever over-crediting**, and what that costs in tokens and time.

## Files

| Piece | File |
|---|---|
| Synthetic data + ground truth | `ml/generate_data.py` → `data/` |
| Tools, policy engine | `lib/data.js`, `lib/policy.js` |
| Agents, baselines, checker, scoring | `lib/agents.js`, `lib/llm.js` (Groq gpt-oss-120b → gpt-oss-20b → Gemma 4 31B on OpenRouter, with tool calling) |
| API | `api/resolve.js` (run any ticket through any system), `api/health.js`, `api/evals.js` (off unless `EVALS_ENABLED=true` or a preview) |
| UI | `public/index.html` |
| Tests and evals | `npm test` (policy = ground truth on 138/138; 7/7 broken replies caught; tools refuse other customers), `scripts/rules_baseline.mjs`, `scripts/summarise.mjs`, `evals/sample.json` |

## Run locally

```bash
python3 ml/generate_data.py && npm test && node scripts/summarise.mjs && python3 scripts/build_public.py
cp .env.example .env    # GROQ_API_KEY, OPENROUTER_API_KEY; never commit .env
node --env-file=.env scripts/dev_server.js
```
