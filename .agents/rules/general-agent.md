---
trigger: always_on
---

# Core Rules for Agent
- Architecture Reference: Always refer to ARCHITECTURE.md before exploring or modifying the codebase.
- Scope Limitation: Only read or edit files explicitly mentioned in the user prompt or strictly necessary for the request.
- Ignore Non-Code Assets: Never search or read files inside node_modules, assets, or icons unless explicitly instructed.
- Performance:
  - For conversational greetings or simple questions, answer directly without executing terminal tools or file scans.
  - Follow the existing project structure defined in ARCHITECTURE.md.
  - Update FEATURE_ROADMAP.md only when a major feature is completed and requested by user.