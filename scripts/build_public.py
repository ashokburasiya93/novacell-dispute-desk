"""Write public/tickets.json (queue + accounts + bills) and public/results.json (eval summaries) for the UI."""
import glob, json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
J = lambda f: json.load(open(os.path.join(ROOT, f)))
t, a, b = J("data/tickets.json"), J("data/accounts.json"), J("data/bills.json")
out = [{**x, "account": a[x["customer_id"]], "bill": b[x["customer_id"]]} for x in t]
json.dump(out, open(os.path.join(ROOT, "public", "tickets.json"), "w"))
res = {}
for f in glob.glob(os.path.join(ROOT, "evals", "results", "*_summary.json")):
    res[os.path.basename(f).replace("_summary.json", "")] = json.load(open(f))
r = J("evals/results/rules.json")
res["rules_all"] = r["all"]
json.dump(res, open(os.path.join(ROOT, "public", "results.json"), "w"), indent=1)
print(len(out), list(res))
