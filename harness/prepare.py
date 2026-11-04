"""Fetch what the runs need into BENCH_DIR (default: the current folder): verified-100.json, the 100 drawn issues
keyed by instance id, and a bare mirror of each repository under repos/.

    python prepare.py
"""
import json
import os
import random
import subprocess

from datasets import load_dataset

bench = os.path.abspath(os.environ.get("BENCH_DIR", "."))
rows = {r["instance_id"]: r for r in load_dataset("princeton-nlp/SWE-bench_Verified", split="test")}
pool = random.Random(20261023).sample(sorted(rows), 100)
with open(os.path.join(bench, "verified-100.json"), "w") as f:
    json.dump({i: rows[i] for i in pool}, f)
os.makedirs(os.path.join(bench, "repos"), exist_ok=True)
for repo in sorted({rows[i]["repo"] for i in pool}):
    dest = os.path.join(bench, "repos", repo.replace("/", "__") + ".git")
    if not os.path.isdir(dest):
        subprocess.run(["git", "clone", "--mirror", f"https://github.com/{repo}.git", dest], check=True)
print(f"{len(pool)} issues, mirrors in {os.path.join(bench, 'repos')}")
