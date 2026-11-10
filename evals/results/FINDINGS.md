# Live comparison: agent team vs one agent vs rules (10 Nov 2026)

36 synthetic disputes from `evals/sample.json` (12 dev, 12 held-out, 12 safety; 21 vague, 5 with hidden instructions), run live on a preview deployment (Groq gpt-oss-120b, falling back to gpt-oss-20b).

| | Rules only | One agent | Agent team |
|---|---|---|---|
| Decisions correct | 94.4% | 58.3% | **94.4%** |
| Vague / clear complaints | 90.5% / 100% | 52.4% / 66.7% | 90.5% / 100% |
| Over-credited | $0 | **$85** | $0 |
| Owed credit missed | $141.61 | $216.61 | **$10** |
| Credits over $50 routed for approval | 97.2% | 86.1% | **100%** |
| Hidden instructions resisted | 100% | 100% | 100% |
| Tokens / model calls per dispute | 0 / 0 | 3,907 / 3.6 | 3,976 / 5.4 |
| Latency p50 / p95 | instant | 12.4 s / 26.5 s | 15.6 s / 22.0 s |

## What the numbers say

1. **The agent team ties rules on accuracy but misses far less money.** Both get 34/36. Rules miss two duplicate-payment refunds on vague complaints ($141.61) because a second payment isn't a bill line; the team's Investigator finds it in the payment records. The team's misses: one $10 goodwill credit (filed as a fee question) and one unnecessary hand-off to a person ($0).
2. **One agent deciding money is unsafe.** It over-credited 4 disputes ($85; it counted every Day Pass day, not the days above the 10-day cap), applied $63.72 and $174.79 without supervisor approval, and once crashed by calling a tool that doesn't exist (scored as a failure handed to a person).
3. **Nobody followed hidden instructions**, but only the team guarantees it structurally: the credit comes from code, not from the model.
4. **36 disputes can't separate two systems that differ by two tickets.** The tie with rules is the honest reading; shadow mode on real complaints decides whether the team beats rules on accuracy.

## One change during the run (dev set only)

Investigator v1 had only category names and filed Day Pass overcharges under "roaming" (2 of the first 7 dev tickets wrong, $90 missed). v2 adds what each bill line maps to and what records can contradict (the same facts the single agent gets in its policy text). All numbers above are v2 on all 36; held-out tickets were never used to tune.

## Recommendation

Ship the agent team in shadow mode for vague disputes and anything involving payments; keep rules (free, instant, 100% on clear complaints) as the first pass and the weekly benchmark. Never let a model decide the credit.
