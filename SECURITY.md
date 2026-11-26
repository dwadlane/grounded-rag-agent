# Security Policy

## Reporting a Vulnerability

Email dwad@gaps2gains.com with the details. We aim to reply within 3 business days. Please do not open a public issue for a security problem.

## What To Know

- The project reads `ANTHROPIC_API_KEY`, `VOYAGE_API_KEY` and `OPENAI_API_KEY` from the environment only. Nothing is written to disk, and the committed recordings contain prompts and answers, never request headers.
- The corpus is synthetic. Do not commit real patient data or real company documents to a public fork.
- The emergency route is a safety net for a demo, not a clinical triage system.
