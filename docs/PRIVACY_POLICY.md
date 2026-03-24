# Privacy Policy

Last updated: 2026-03-24

This Privacy Policy describes how **[LEGAL COMPANY NAME]** ("we", "us", "our") processes personal data and customer data when customers install and use **Reflection for Jira** (the "App").

This document is intended for customers using the App through Atlassian Jira Cloud.

## 1. Scope

The App is an Atlassian Forge app that analyzes Jira issue content and generates AI-supported quality feedback for requirements and issue descriptions.

This Privacy Policy applies to:

- administrators who install or manage the App
- end users who interact with the App in Jira Cloud
- Jira issue data processed by the App on behalf of the customer

## 2. Roles of the parties

For customer content processed through the App:

- the customer is typically the controller of the customer data stored in Jira
- **[LEGAL COMPANY NAME]** acts as a processor or service provider, except where we process limited data for our own legitimate business purposes, such as billing, support, security, and abuse prevention

Customers are responsible for ensuring that they have an appropriate legal basis for using the App with the Jira content they submit.

## 3. Categories of data we process

Depending on how the App is used, we may process the following categories of data:

### 3.1 Jira content submitted for analysis

The App currently reads and processes these Jira fields:

- issue summary
- issue description
- acceptance criteria stored in `customfield_10047`
- issue key and related app execution context needed to retrieve the issue

This data may contain personal data if entered into Jira by customer users.

### 3.2 Technical and operational data

We may also process:

- Atlassian tenant and installation metadata
- app invocation metadata
- technical error information
- audit and operational logs required for support, reliability, and security

## 4. Purposes of processing

We process data for the following purposes:

- providing the App's requirement analysis functionality
- generating quality scores and improvement suggestions
- operating, maintaining, and securing the App
- diagnosing incidents, errors, and abuse
- providing customer support
- meeting legal and contractual obligations

## 5. How the App processes data

When a user opens the App inside Jira:

1. the App retrieves relevant issue content from Jira Cloud using Forge permissions
2. the App sends the relevant text to the OpenAI API for structured analysis
3. the App returns the generated scores and suggestions to the user interface inside Jira

## 6. Third-party subprocessors and onward transfers

The App relies on third-party service providers to deliver its functionality.

### 6.1 Atlassian Forge

The App runs on Atlassian Forge and uses Atlassian infrastructure to execute backend functions and integrate with Jira Cloud.

### 6.2 OpenAI

The App sends relevant Jira issue content to OpenAI in order to generate the analysis result shown in the App.

OpenAI acts as a subprocessor or third-party service provider for AI inference.

Customers should assume that any Jira text analyzed by the App is transmitted to OpenAI for processing.

### 6.3 Additional providers

If additional subprocessors are introduced, this Privacy Policy will be updated accordingly.

## 7. Data retention

The App is currently designed to return analysis results at runtime and does not intentionally maintain separate long-term app-managed storage of Jira issue content for feature delivery.

However, limited technical and operational data may be retained for:

- security monitoring
- troubleshooting
- service reliability
- legal compliance

Retention periods should be defined and confirmed by **[LEGAL COMPANY NAME]** before public launch. Replace this section with your final retention schedule before publishing.

## 8. International data transfers

Because the App uses Atlassian Forge and OpenAI, data may be processed outside the country where the customer is located.

Where required, we rely on appropriate contractual, legal, or organizational safeguards for cross-border transfers.

You should replace this section with your final transfer mechanism language after confirming your corporate and vendor data transfer setup.

## 9. Security measures

We implement reasonable technical and organizational measures designed to protect customer data against unauthorized access, loss, misuse, or disclosure.

These measures may include:

- authenticated access through Atlassian and Forge
- least-privilege app permissions
- controlled access to operational systems
- monitoring and logging for security and reliability
- vendor security review and dependency management

No security measure can guarantee absolute security.

## 10. Customer controls

Customers control the Jira content they choose to submit to the App.

Customers may also:

- uninstall the App
- restrict user access within Jira
- remove or modify Jira content before analysis
- contact us regarding deletion or privacy requests

## 11. Data subject requests

If you are an end user and want to exercise privacy rights relating to Jira data submitted through the App, you should first contact the Jira site administrator or the customer organization that controls the relevant Jira instance.

If we receive a request directly and are acting as a processor, we may redirect the request to the relevant customer.

## 12. Legal basis

Where we act as controller for limited operational data, we typically rely on one or more of the following legal bases, where applicable:

- performance of a contract
- legitimate interests
- compliance with legal obligations
- consent, where required by law

## 13. Children's data

The App is not intended for children, and we do not knowingly design the App for use by minors.

## 14. Changes to this Privacy Policy

We may update this Privacy Policy from time to time. We will publish the updated version with a new effective date.

## 15. Contact

For privacy-related questions or requests, contact:

- Legal entity: **[LEGAL COMPANY NAME]**
- Contact email: **[PRIVACY EMAIL]**
- Postal address: **[BUSINESS ADDRESS]**
- Support page: **[SUPPORT URL]**

## 16. Launch checklist for this document

Before publishing this Privacy Policy, replace all placeholders:

- `[LEGAL COMPANY NAME]`
- `[PRIVACY EMAIL]`
- `[BUSINESS ADDRESS]`
- `[SUPPORT URL]`

Also verify and finalize:

- exact retention periods
- exact subprocessor list
- exact international transfer language
- final support and privacy intake process
