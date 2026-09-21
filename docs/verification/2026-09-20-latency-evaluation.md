# Reins latency evaluation

Date: 2026-09-20

This evaluation measures the synthetic assurance path used by the portfolio demo. It does not represent payment-network latency or production capacity.

## Domain evaluation

Command:

```text
.\\node_modules\\.bin\\tsx.cmd -e "..."
```

The benchmark executed 1,000 iterations. Each iteration normalized one policy, evaluated both synthetic provider profiles, ran the complete scenario corpus, and created an evidence manifest.

| Percentile | Latency |
| --- | ---: |
| p50 | 0.0191 ms |
| p95 | 0.0482 ms |
| p99 | 0.0898 ms |
| Maximum | 0.7081 ms |

## Local API evaluation

With the development server running at `http://localhost:3000`, 100 sequential requests were sent to `GET /api/assurance`. Every response returned HTTP 200.

| Percentile | Latency |
| --- | ---: |
| p50 | 15.4242 ms |
| p95 | 21.0627 ms |
| p99 | 36.0862 ms |
| Maximum | 145.2170 ms |

## Interpretation

The deterministic domain path is comfortably below the current demo target of 50 ms at p99. The local API result includes Next.js development-server overhead, startup/cache effects, serialization, and loopback networking. It is not a production SLO. A production evaluation would require a production build, a fixed machine profile, concurrent load, database-backed authenticated requests, and a larger sample size.

The benchmark uses synthetic policy and provider data only. No live provider, payment instrument, or customer data was used.
