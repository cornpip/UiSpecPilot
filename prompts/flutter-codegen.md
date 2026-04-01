Paste this into your agent session:

Use `codegen/CODEGEN_BASELINE.md` as the common codegen rule, `codegen/flutter/README.md` as the Flutter entry document, and the guides under `codegen/flutter/guide/` as the Flutter-specific source of truth. Use the target project as the only codebase you may modify.

Task:
Flutter IR input path:
{{IR_PATH}}

Target Flutter project path:
{{PROJECT_PATH}}

Additional requirements (optional):
{{USER_REQUEST}}

Path resolution rules:
- If `Flutter IR input path` is a filename only, first look for it under the current source repo that contains `codegen/CODEGEN_BASELINE.md`.
- Do not resolve the Flutter IR input file relative to `Target Flutter project path` unless this prompt explicitly says so.
- If the IR file cannot be found exactly, stop and ask for the precise file path instead of guessing.
- Inspect and modify code only under `Target Flutter project path`.

Before editing:
- Read `codegen/CODEGEN_BASELINE.md`
- Read `codegen/flutter/README.md`
- Read `codegen/flutter/guide/README.md`
- Then read only the linked baseline, guide, and checklist files that are directly relevant to this generation task
- If the target project has agent-local entry rules for your agent (for example `AGENTS.md` for Codex, `CLAUDE.md` for Claude), read that file first in the target project and follow any referenced local rules before making target-project implementation, code generation, formatting, or verification decisions

Rules:
- Separate input interpretation rules from target-project execution rules
- Follow the repository's Flutter codegen guide before making code structure decisions
- Treat `node.semantic` / `node.state` as the primary source of truth for runtime meaning
- If the IR contains `props.componentVariants`, treat it as the source of truth for variant-specific visual or trailing-action differences
- Do not use `props.designInstance.variantProperties` or `availableVariants` as the main branching source for runtime behavior; use them only as trace context or limited fallback hints allowed by the guide
- If multiple IR files are provided, first determine whether they represent separate pages, multiple states of the same page, or a hybrid of both
- Do not infer page count from the number of IR files alone
- Treat explicit user statements in Additional requirements as authoritative for page/state relationships
- Preserve any explicitly provided project conventions over generic defaults
- For command execution, code generation, formatting, verification, and generated-file handling, prefer the target project's local rules over generic defaults
- Call out assumptions if the IR or target project context is incomplete
- If the relationship between multiple IR files is ambiguous, state your assumption before editing
- If `props.componentVariants` is present but the current variant mapping is incomplete for the requested UI state, call out that gap explicitly instead of inventing missing visual tokens from raw variant metadata alone
- Validate the generated output against the codegen checklist before finishing
- Avoid loading unrelated guide sections when the task scope is narrow

Deliverables:
- Generate or update the requested Flutter implementation in the target project
- Briefly summarize the generated or updated files and major code areas
- Mention any assumptions, TODOs, or unresolved gaps
