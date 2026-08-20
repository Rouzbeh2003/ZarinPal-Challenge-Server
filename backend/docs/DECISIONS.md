# Implementation decisions

## Successful status assumption

The supplied data guide defines `Verified` as the final complete sale. `Paid` means the bank debited
the card but the merchant has not verified the payment, so it is tracked as `pending_verification`
and is not included in successful sales. `Reversed` has precedence and is never counted as a normal
sale. This contract is versioned with metric version `2.0.0`.

## Invalid sessions

Source rows are never silently removed. Problems are written to `data_quality_issue`. Sessions with inconsistent merchant, terminal, amount, malformed required values, or non-positive amounts are marked `excluded`. Duplicate attempt keys are reported and deterministically reduced to the earliest row.

## Insight policy version 1.0.0

The default baseline is the immediately preceding equal-length period. A success-rate change is actionable only when both periods have at least 30 valid sessions, the absolute change is at least 0.03, and a two-proportion z-test reaches |z| >= 1.96. These thresholds are named and versioned in `InsightPolicy`.

Financial impact for a decline is the positive difference between expected successful sessions at the baseline rate and actual successful sessions, multiplied by the current period's average successful-session amount. It is labelled potential impact, not confirmed loss.

Drivers rank observed segment-level rate changes by absolute rate change times current segment volume. They are associative diagnostics and do not establish causality. Only dimensions present at session grain are evaluated. Customer, switch-response, and verify-type drivers remain unavailable until those fields are materialized safely in `session_fact`.

## LLM advisory boundary

The metric and recommendation engines remain the source of truth. The optional LLM receives only
aggregate, session-grain evidence and may explain or prioritize it; it does not calculate metrics.
No session key or payer-card identifier crosses this boundary. A provider failure returns the full
deterministic report with `narrative_source=deterministic_engine_fallback`.
