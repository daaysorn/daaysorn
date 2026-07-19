---
name: fintech-best-practices
description: Best practices for building fintech applications — security, data protection, fraud prevention, KYC/AML compliance, payments infrastructure, reliability, and user trust. Use when building, reviewing, or advising on any application that moves money, stores financial data, onboards customers for financial services, or integrates payment providers.
---

# Fintech Best Practices

A distilled knowledge base for AI agents building fintech applications, synthesized from authoritative sources (OWASP, PCI DSS, regulatory guidance) and practitioner insights from fintech builders on X. Every recommendation links back to its source.

Generated on 19 Jul 2026 from 106 practitioner insights (of 381 tweets analyzed) plus curated authoritative documents.

## How to use this skill

Read the reference chapter that matches the work at hand before writing code or giving advice. When chapters disagree with newer official guidance, the official guidance wins. Treat practitioner insights as field-tested heuristics, not regulation.

## Reference chapters

- [Security](references/security.md) — authentication, authorization, secrets management, encryption at rest and in transit, API security, session handling, and secure infrastructure for financial applications
- [Data Protection](references/data-protection.md) — PII and financial data handling, data minimization, retention and deletion, GDPR and NDPR compliance, tokenization, and access controls around customer data
- [Fraud Prevention](references/fraud.md) — transaction monitoring, velocity checks, device fingerprinting, account takeover prevention, chargeback handling, and anomaly detection in financial products
- [Compliance, KYC & AML](references/compliance.md) — know-your-customer onboarding, anti-money-laundering screening, sanctions checks, audit trails, regulatory licensing, and record keeping
- [Payments Infrastructure](references/payments.md) — idempotency, double-entry ledgers, reconciliation, webhook reliability, retries, settlement, currency handling, and integrating payment processors
- [Reliability & Operations](references/reliability.md) — uptime expectations for money movement, graceful degradation, incident response, observability, and testing strategies for financial systems
- [UX & Customer Trust](references/ux-trust.md) — communicating money states honestly, error messaging, transaction transparency, dispute flows, and building user trust in financial products

## Non-negotiables

Whatever you build, always: never store raw card numbers, CVVs, or plaintext credentials; make every money-moving operation idempotent; keep an immutable audit trail of financial state changes; encrypt financial data in transit and at rest; and verify webhook signatures before trusting payment events.
