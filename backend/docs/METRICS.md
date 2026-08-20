# Metric definitions

All metrics use `session_fact`, whose grain is one row per `session_key`. Version: `2.0.0`.

| Metric | Numerator | Denominator | Important rule |
|---|---|---|---|
| Successful amount | Amount of successful sessions | — | A session amount is counted once. |
| Success rate | `Verified` sessions | All valid sessions | `Paid` is not a confirmed sale until merchant verification; reversed sales are excluded. |
| Paid-unverified rate | `Paid` sessions | All valid sessions | Money was debited, but merchant verification is incomplete. Report separately from sales. |
| No-attempt rate | Sessions without a real attempt | All valid sessions | `try_seq=0` or `NoAttempt` is not a real attempt. |
| Retry rate | Sessions with more than one real attempt | Sessions with a real attempt | Repeated source rows are deduplicated first. |
| Retry recovery rate | Retried sessions that eventually succeed | Retried sessions | At least one failed and one successful real attempt are required. |

Percentages remain numbers between zero and one. Amounts are integer IRR. Division by zero returns `null`.

`init_time_ms` and `verify_time_ms` measure gateway API response latency. They must never be
described as user think time or interaction duration. Switch response codes are already scoped as
`PSP-xx:code`; their numeric suffix must not be compared across PSPs as if it had a global meaning.
