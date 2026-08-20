# Metric definitions

All metrics use `session_fact`, whose grain is one row per `session_key`. Version: `1.0.0`.

| Metric | Numerator | Denominator | Important rule |
|---|---|---|---|
| Successful amount | Amount of successful sessions | — | A session amount is counted once. |
| Success rate | Successful valid sessions | All valid sessions | `Verified` and `Paid` mean success; reversed sales are excluded. |
| No-attempt rate | Sessions without a real attempt | All valid sessions | `try_seq=0` or `NoAttempt` is not a real attempt. |
| Retry rate | Sessions with more than one real attempt | Sessions with a real attempt | Repeated source rows are deduplicated first. |
| Retry recovery rate | Retried sessions that eventually succeed | Retried sessions | At least one failed and one successful real attempt are required. |

Percentages remain numbers between zero and one. Amounts are integer IRR. Division by zero returns `null`.

