# Security Policy

Last updated: 2026-03-24

This Security Policy describes the security practices for **Reflection for Jira** operated by **[LEGAL COMPANY NAME]**.

## 1. Security contact

To report a security issue, contact:

- Security email: **[SECURITY EMAIL]**
- Support URL: **[SUPPORT URL]**

Please do not report security vulnerabilities through public issue trackers or public forums.

## 2. Scope

This policy applies to the cloud-hosted operation of the App on Atlassian Forge, including the app frontend, backend resolver functions, and third-party AI processing used to deliver the App's functionality.

## 3. Supported service

The currently supported service is the latest production release of the App made available to customers through Atlassian Marketplace or direct Forge installation for approved testing purposes.

## 4. Reporting vulnerabilities

When reporting a vulnerability, please include as much of the following information as possible:

- a clear description of the issue
- affected feature or endpoint
- reproduction steps
- impact assessment
- proof of concept, if available
- tenant or environment details, if relevant

We will review reports in good faith and aim to acknowledge receipt within **[RESPONSE TARGET, e.g. 3 BUSINESS DAYS]**.

## 5. Coordinated disclosure

We request responsible disclosure and ask that you:

- give us reasonable time to investigate and remediate the issue
- avoid publicly disclosing the issue until remediation is available or coordinated disclosure is agreed
- avoid accessing, modifying, or deleting customer data beyond what is strictly necessary to demonstrate the issue

## 6. Security controls

We apply reasonable technical and organizational security controls, which may include:

- execution on Atlassian Forge infrastructure
- restricted Jira scopes and explicit egress configuration
- controlled access to credentials and secrets
- dependency and code review before release
- logging and monitoring for operational security
- remediation of vulnerabilities in line with applicable Atlassian Marketplace security expectations

## 7. Credentials and secrets

Secrets required by the App, such as API credentials, should be stored using the appropriate Forge secret or environment configuration mechanisms and must not be committed to source control.

## 8. Third-party providers

The App relies on third-party services, including:

- Atlassian Forge / Jira Cloud
- OpenAI

Security and availability of the overall service depend in part on these providers.

## 9. Customer responsibilities

Customers are responsible for:

- managing access to their Jira instance
- choosing what content is submitted to the App
- reviewing generated output before operational use
- notifying us promptly of suspected security incidents related to the App

## 10. Vulnerability remediation

We intend to triage and remediate confirmed vulnerabilities according to severity and our contractual and Marketplace obligations.

For Marketplace-listed apps, we expect to align with Atlassian security expectations, including the Marketplace Security Bug Fix Policy where applicable.

## 11. Security updates

Security-related fixes may be released without prior notice where necessary to protect customers, the App, or supporting infrastructure.

## 12. No bug bounty commitment

Unless expressly stated otherwise, publication of this Security Policy does not create a bug bounty program or an obligation to provide compensation for vulnerability reports.

## 13. Launch checklist for this document

Before publishing this Security Policy, replace all placeholders:

- `[LEGAL COMPANY NAME]`
- `[SECURITY EMAIL]`
- `[SUPPORT URL]`
- `[RESPONSE TARGET, e.g. 3 BUSINESS DAYS]`

Also verify:

- internal security response workflow
- ownership for AMS or Marketplace security tickets
- severity and remediation timelines
- final support and escalation path
