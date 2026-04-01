Paste this into your agent session:

Use the guides under `ui_spec/guides/` in this workspace as the source-of-truth contract set for `ui_spec` authoring and editing.
Treat `ui_spec/guides/01-schema-rules.md`, `ui_spec/guides/04-semantic-quality-gate.md`, and `ui_spec/guides/05-semantic-to-ir-check.md` as the primary contract documents.

Task:
Target `ui_spec` file path:
{{TARGET_PATH}}

Requested work:
Review the existing `ui_spec` for semantic completeness and correctness as a source spec, then add or correct only the semantic fields needed to keep that source spec clear and unambiguous.

Before editing:
- Read `ui_spec/guides/01-schema-rules.md`
- Read any linked guide files needed for schema, workflow, and checklist compliance
- Read `ui_spec/guides/04-semantic-quality-gate.md` before finalizing

Rules:
- Work only on the requested `ui_spec` file unless a closely related change is required
- Keep visual layout and styling intact unless a semantic fix strictly requires a minimal structural correction
- Focus on semantic audit and semantic patching, not visual redesign
- Treat `ui_spec` as a human-editable source spec first, not as a dump for compiler fallback tags
- Ensure root semantic readiness, navigation/reference readiness, and source-level disambiguation are checked in that order
- Check that the export-targeted file still has a single top-level screen/component entrypoint instead of a top-level `SECTION` wrapping multiple state-variant `FRAME`s
- If the file mixes multiple small states, prefer keeping one representative visual state and preserving the rest through minimal `semantic` / `state` / structured interaction, plus `componentVariants` when source-of-truth visual/action diffs must be preserved
- If the file contains materially different layouts that behave like separate screens, call out that it should be split into separate `ui_spec` files rather than treating the bundle as one export root
- Check that every semantic-bearing root/node keeps a unique `semantic.id` within the document
- Check repeated cards/options/items carefully so visually similar siblings do not accidentally reuse the same `semantic.id`
- If raw component/variant metadata exists, verify whether any runtime-meaningful state or kind difference still needs explicit `semantic` / `state` instead of staying only in trace metadata
- If the screen has a selected/default summary card plus selectable options below, verify whether the summary area is a fixed decorative card or a true current-selection slot, and express that intent through semantic/state instead of leaving it only in variant metadata or prose
- If variant-specific stroke/fill/effect/badge/trailing-action differences are needed as source-of-truth visual contract, verify that they are captured in `componentVariants` rather than existing only as raw trace metadata or notes
- Do not treat `label` or `notes` as a substitute for structured `interaction`, `navigation`, or reference fields when those can be expressed explicitly
- If an interactive node has a real action, do not stop at `semantic.type`; add `semantic.interaction.onTap.type` or an equivalent structured intent where needed
- Explicitly review stateful controls such as checkbox, radio, tab, segmented selector, and date/time picker triggers so they are not left as generic `button` or `textField`
- Explicitly review mixed-affordance rows so toggle/detail-navigation intents are not collapsed into one ambiguous semantic node
- Add semantic only where it materially improves source-spec interpretation and downstream consumer clarity
- Do not add node-level token refs, asset refs, memo tags, or other compiler-enrichment fields unless the target file already uses them and the request explicitly needs them
- Validate the final result against the guide checklist before finishing

Deliverables:
- Save the updated file in place
- Briefly summarize what semantic fields were added or corrected
- Mention any remaining semantic ambiguity or limits
- If the file still depends on unresolved targets or fallback inference at the semantic level, say so explicitly instead of reporting it as fully semantic-complete
