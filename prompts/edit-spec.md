Paste this into your agent session:

Use the guides under `ui_spec/guides/` in this workspace as the source-of-truth contract set for `ui_spec` authoring and editing.
Treat `ui_spec/guides/01-schema-rules.md`, `ui_spec/guides/04-semantic-quality-gate.md`, and `ui_spec/guides/05-semantic-to-ir-check.md` as the primary contract documents.

Task:
Target `ui_spec` file path:
{{TARGET_PATH}}

Requested changes:
{{USER_REQUEST}}

Before editing:
- Read `ui_spec/guides/01-schema-rules.md`
- Read any linked guide files needed for schema, workflow, and checklist compliance
- Read `ui_spec/guides/04-semantic-quality-gate.md` before finalizing
- Read `ui_spec/guides/05-semantic-to-ir-check.md` before finalizing if you need to report semantic-to-IR check results

Rules:
- Work only on the requested `ui_spec` file unless a closely related change is required
- Keep unrelated layout and styling intact unless explicitly asked to redesign them
- Follow the `ui_spec` guide rules before making decisions
- Do not use unrelated existing `ui_spec` layouts as references unless explicitly requested
- Treat `ui_spec` as a human-editable source spec first, not as a dump for compiler fallback tags
- Keep export-targeted files aligned to a single implementation unit whose top-level root directly serves as the screen/component entrypoint
- Do not turn the target file into a top-level `SECTION` that wraps multiple state-variant `FRAME`s as the export source
- If the requested change introduces only small state differences, keep one representative visual screen and express the rest through minimal `semantic` / `state` / structured interaction, plus `componentVariants` when source-of-truth visual/action diffs must be preserved
- If the requested change makes layout or major blocks materially different, prefer splitting into a separate `ui_spec` file over packing multiple top-level state variants into one export file
- Preserve raw Figma component/variant metadata only as trace context; do not let variant names/properties become the sole runtime meaning
- If a component variant difference matters to behavior or state transitions, add or correct `semantic` / `state` / structured interaction instead of relying only on raw variant metadata
- If the requested change depends on variant-specific visual or trailing-action differences that downstream must reproduce, add or update `componentVariants` instead of burying those differences only in trace metadata or prose
- Keep nested `children` coordinates in the parent's local coordinate space when adding or moving nodes inside containers
- Before semantic self-review, check that text/icon nodes inside cards, buttons, and input fields do not sit abnormally outside their parent bounds
- After applying the requested visual/content edits, run a semantic self-review focused on source-spec completeness first, then run a separate semantic-to-IR check using `compilers/UI_SPEC_TO_IR_BASELINE.md` as the normalization baseline
- Do not treat `label` or `notes` as a substitute for structured `interaction`, `navigation`, or reference fields when those can be expressed explicitly
- Do not add node-level token refs, asset refs, memo tags, or other compiler-enrichment fields unless the target file already uses them and the request explicitly needs them
- Validate the final result against the guide checklist before finishing

Deliverables:
- Save the updated file in place
- Briefly summarize what changed
- Briefly report what semantic fields were added or corrected for source-spec readiness
- Briefly report any semantic-to-IR check gaps separately
- Mention any assumptions or limits that remain
