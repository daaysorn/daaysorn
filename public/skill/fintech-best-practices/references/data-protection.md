# Data Protection

> Part of the fintech-best-practices skill. Scope: PII and financial data handling, data minimization, retention and deletion, GDPR and NDPR compliance, tokenization, and access controls around customer data.


# Data Protection in Fintech Applications

This chapter provides imperative best practices for handling personally identifiable information (PII) and financial data in fintech applications. It covers data minimization, retention and deletion policies, compliance with GDPR and NDPR, tokenization, encryption, and access control around customer data. Adhere strictly to these principles to ensure regulatory compliance, secure customer trust, and prevent costly breaches.

## Data Minimization and Purpose Limitation

- Collect only the minimum PII and financial data necessary for your specific business purpose.
- Define and document the lawful basis for each data category collected, e.g., contract performance, legal obligation, or legitimate interest under GDPR.
- Do not collect data on a “just in case” basis; avoid storing CVV, PIN, or sensitive authentication data post-authorization per PCI DSS.
- Use tokenization to replace sensitive payment data with non-sensitive tokens wherever possible.
- Clearly define data retention periods per data type and delete data promptly when no longer necessary.

### Checklist:
- [ ] Document lawful basis for all data collected.
- [ ] Limit data collection to strictly necessary fields.
- [ ] Implement tokenization for payment data.
- [ ] Define and enforce data retention and deletion schedules.

## Compliance with GDPR and NDPR

- Ensure compliance with GDPR by recognizing payment data as personal data requiring protection under the regulation.
- For Nigerian operations, comply with the NDPC 2023 by:
  - Appointing a Data Protection Officer if processing data at scale.
  - Signing Data Processing Agreements with all third parties receiving user data.
  - Honoring user deletion requests within 1 month.
  - Reporting data breaches to authorities within 72 hours.
- Provide transparent privacy notices explaining data collection and processing purposes.
- Maintain documented Data Processing Agreements (DPAs) with processors.
- Support data subject rights including access, rectification, erasure, and portability.

### Checklist:
- [ ] Appoint a Data Protection Officer (if applicable).
- [ ] Execute DPAs with all third parties.
- [ ] Provide clear privacy notices.
- [ ] Implement procedures for data subject rights.
- [ ] Establish breach reporting processes.

## Tokenization and Encryption

- Use tokenization to replace Primary Account Numbers (PAN) with tokens stored in a secure, PCI DSS-compliant vault offsite.
- Ensure tokenization systems never provide PANs outside strictly defined Cardholder Data Environments (CDE).
- Use strong cryptographic methods to encrypt stored cardholder data where tokenization is not feasible.
- Manage cryptographic keys securely with documented key management policies; do not shortcut key custodianship.
- Mask PAN when displaying it, showing no more than the first six and last four digits except to authorized personnel.

### Checklist:
- [ ] Implement PCI DSS-compliant tokenization.
- [ ] Never expose PAN outside the CDE.
- [ ] Encrypt stored payment data using strong cryptography.
- [ ] Securely manage and rotate encryption keys.
- [ ] Mask PAN in all user interfaces except for authorized use.

## Data Retention and Deletion

- Only retain payment and PII data for as long as necessary for the lawful purpose.
- Automate data deletion or anonymization at the end of retention periods.
- Implement technical controls to enforce deletion schedules, including backups and logs.
- Never store sensitive authentication data (CVV, PIN) after transaction authorization.

### Checklist:
- [ ] Define retention periods for all data categories.
- [ ] Automate deletion or anonymization processes.
- [ ] Exclude sensitive authentication data from storage.

## Access Controls Around Customer Data

- Restrict access to cardholder and personal data strictly on a least-privilege basis.
- Log and monitor all access to sensitive data.
- Train staff on data protection policies and the importance of confidentiality.
- Apply network segmentation to isolate tokenization systems and cardholder data environments from untrusted networks.

### Checklist:
- [ ] Enforce least-privilege access policies.
- [ ] Enable detailed logging and monitoring of data access.
- [ ] Conduct regular staff training.
- [ ] Apply network segmentation for CDE and token vaults.

## Common Mistakes to Avoid

- Storing sensitive authentication data post-authorization (e.g., CVV, PIN).
- Failing to document lawful basis for data collection.
- Neglecting to appoint a Data Protection Officer when required by NDPR.
- Allowing tokenization systems to expose PAN outside secured environments.
- Weak or missing cryptographic key management practices.
- Displaying full PAN to unauthorized personnel.
- Keeping data indefinitely without deletion or anonymization.
- Not signing Data Processing Agreements with all third parties handling data.
- Ignoring user deletion requests or breach reporting timelines.

---

### References
- PCI DSS Requirements for Tokenization and Encryption: https://www.globalpaymentsintegrated.com/en-us/blog/2020/03/24/pci-dss-requirements-for-tokenization-and-encryption
- PCI DSS 4.0 Requirement 3: How to Protect Stored Account Data: https://www.herodevs.com/blog-posts/pci-dss-4-0-requirement-3-how-to-protect-stored-account-data
- Can cardholder data be stored without involving PCI scope?: https://www.aciworldwide.com/blog/can-cardholder-data-be-stored-without-involving-pci-scope
- How Can I Protect Stored Payment Cardholder Data (PCI DSS Requirement 3)?: https://cpl.thalesgroup.com/faq/pci-dss-compliance/how-can-i-protect-stored-payment-cardholder-data-pci-dss-requirement-3
- GDPR and Payments: A Guide to Data Protection Compliance: https://gdprlocal.com/gdpr-and-payments/
- GDPR in Payments: Definition, How It Works: https://www.pxp.io/payments-glossary/gdpr-in-payments
- NDPC 2023 compliance essentials as per @smartnakamoura (T1)

## Sources

Authoritative documents:

- [PCI Tokenization and Encryption | Global Payments Integrated](https://www.globalpaymentsintegrated.com/en-us/blog/2020/03/24/pci-dss-requirements-for-tokenization-and-encryption)
- [HeroDevs Blog | PCI DSS 4.0 Requirement 3: How to Protect Stored Account Data](https://www.herodevs.com/blog-posts/pci-dss-4-0-requirement-3-how-to-protect-stored-account-data)
- [Can cardholder data be stored without involving PCI scope?](https://www.aciworldwide.com/blog/can-cardholder-data-be-stored-without-involving-pci-scope)
- [How Can I Protect Stored Payment Cardholder Data (PCI DSS Requirement 3)? | Thales](https://cpl.thalesgroup.com/faq/pci-dss-compliance/how-can-i-protect-stored-payment-cardholder-data-pci-dss-requirement-3)
- [GDPR and Payments: A Guide to Data Protection Compliance - GDPR Local](https://gdprlocal.com/gdpr-and-payments/)
- [GDPR in Payments: Definition, How It Works | PXP](https://www.pxp.io/payments-glossary/gdpr-in-payments)

Practitioner insights:

- [@smartnakamoura](https://x.com/smartnakamoura/status/2070923350948356250) — Comply with NDPC 2023 by appointing a Data Protection Officer, signing Data Processing Agreements with third parties, having lawful bases for data collection, honoring user deletion requests within 1 month, and reporting breaches within 72 hours.
