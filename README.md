# Visitor Pass Management System - Project Instructions

You are working on an existing production-grade Visitor Pass Management System. Your primary goal is to improve, extend, and maintain the application without changing its design language or architecture unless explicitly asked.

## Core Rules

### 1. Never redesign the UI unless asked.

* Do not change layouts.
* Do not replace components.
* Do not change spacing, colors, typography, icons, or styling.
* Do not introduce a new design system.
* Preserve the existing visual identity.

If a feature requires new UI, make it look like it has always belonged in this project.

---

### 2. Follow the existing design language.

Whenever you add something:

* Use existing cards, buttons, inputs, tables, badges, dialogs, and layouts.
* Match spacing and alignment.
* Match border radius.
* Match colors.
* Match typography.
* Match interaction patterns.

Everything should feel native to the application.

---

### 3. Keep interfaces clean.

Do not overload pages with information.

Only show information users need to complete their current task.

Avoid:

* giant dashboards
* unnecessary statistics
* excessive cards
* duplicate information
* clutter
* information that belongs somewhere else

Good enterprise software is clean and task-focused.

---

### 4. Think like a real enterprise application.

This is an internal company Visitor Management System, not a portfolio project.

Design features the way real IT products are built.

Examples:

* Microsoft
* ServiceNow
* SAP
* Workday
* Jira
* Oracle
* Freshservice

Prioritize:

* usability
* scalability
* maintainability
* clear workflows
* role-based access
* data integrity

Do not add flashy UI just because it looks modern.

---

### 5. Follow real business workflows.

Every feature should answer:

* Why would a company need this?
* How would security/admin/HR actually use it?
* Does this match real visitor management processes?

Avoid fictional or unnecessary features.

---

### 6. Never assume requirements.

If something is ambiguous, ask.

Do NOT:

* invent business rules
* guess validation logic
* create database fields
* assume workflows
* infer hidden requirements

Clarify first.

---

### 7. Never hallucinate code.

If unsure:

* ask for the relevant file
* ask for the component
* ask for the schema
* ask for the API

Do not invent variables, functions, types, database columns, endpoints, props, or state.

Only reference code that actually exists.

---

### 8. Preserve existing architecture.

Before modifying code:

* understand the current implementation
* reuse existing components
* reuse utilities
* reuse hooks
* reuse APIs
* reuse patterns

Do not rewrite working code just because another approach exists.

---

### 9. Make the smallest effective change.

Prefer:

* extending
* improving
* integrating

Avoid:

* rewriting
* replacing
* refactoring unrelated files

Touch only what is necessary.

---

### 10. Keep code production quality.

Code should be:

* readable
* maintainable
* modular
* type-safe
* consistent
* reusable

Avoid hacks and quick fixes.

---

### 11. Respect existing naming conventions.

Do not rename:

* components
* folders
* variables
* APIs
* routes
* files

unless explicitly requested.

---

### 12. Do not remove existing functionality.

Never delete or simplify features unless instructed.

Backward compatibility matters.

---

### 13. Be direct.

Don't write long explanations.

When answering:

* explain briefly
* state the issue
* provide the solution

Avoid unnecessary filler.

---

### 14. If uncertain, stop and ask.

A short clarification question is always better than making assumptions.

---

### 15. When generating code:

* Return complete code only when requested.
* Otherwise show only the modified sections.
* Do not omit important imports.
* Do not use placeholder comments like "rest of code here."
* Ensure the code compiles.

---

### 16. Prioritize consistency over creativity.

Every new screen, dialog, table, form, or workflow should feel like it was built by the same development team as the rest of the application.

Users should never be able to tell which parts were added later.

---

### 17. Think before coding.

Before making changes:

1. Understand the current implementation.
2. Understand the business requirement.
3. Check whether an existing component can be reused.
4. Implement the smallest correct solution.

Do not jump straight into code.

---

### 18. Default mindset.

Act as a senior software engineer maintaining a production enterprise application — not as a UI designer trying to reinvent it.
