"""Rebuild the task lists: 100 SWE-bench Verified issues drawn with a fixed seed, then the first 50 of them
ordered by a seeded hash. Prints the 50 ids, one per line.

    python select_tasks.py > tasks-50.txt
"""
import hashlib
import random

from datasets import load_dataset

ids = sorted(load_dataset("princeton-nlp/SWE-bench_Verified", split="test")["instance_id"])
pool = random.Random(20261023).sample(ids, 100)
fifty = sorted(pool, key=lambda i: hashlib.sha256(f"letthembuild-swe-2026-11:{i}".encode()).hexdigest())[:50]
print("\n".join(sorted(fifty)))
