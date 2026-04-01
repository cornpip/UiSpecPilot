Paste this into your agent session:

Use the guides under `ui_spec/guides/` in this workspace as the source-of-truth contract set for `ui_spec` authoring and editing.
Treat `ui_spec/guides/01-schema-rules.md`, `ui_spec/guides/04-semantic-quality-gate.md`, and `ui_spec/guides/05-semantic-to-ir-check.md` as the primary contract documents.

Task:
Requested `ui_spec` creation:
{{USER_REQUEST}}

Before editing:
- Read `ui_spec/guides/01-schema-rules.md`
- Read any linked guide files needed for schema, workflow, and checklist compliance
- Read `ui_spec/guides/04-semantic-quality-gate.md` before finalizing
- Read `ui_spec/guides/05-semantic-to-ir-check.md` before finalizing if you need to report semantic-to-IR check results

Rules:
- Create or edit files only under `ui_spec/samples/`
- Follow the `ui_spec` guide rules before making decisions
- If the request includes a screenshot, mockup, logo, or local image file as a visual reference, interpret it as a request to author a `ui_spec` that will be rendered in Figma, not as a request to manually draw directly in Figma outside the `ui_spec` workflow
- When a visual reference cannot be reproduced exactly within supported `ui_spec` node/style constraints, approximate it with supported shapes, text, or SVG structure and report the remaining gaps or assumptions explicitly
- Prefer reconstructable `TEXT` / `SVG` / basic shape structure over opaque image insertion when the request implies a reusable logo, icon, or UI element, unless the user explicitly asks to keep it as an image asset
- Do not use existing `ui_spec` layouts as references unless explicitly requested
- When creating a new file, use the default naming rule from the guide
- Treat `ui_spec` as a human-editable source spec first, not as a dump for compiler fallback tags
- Keep export-targeted files aligned to a single implementation unit whose top-level root directly serves as the screen/component entrypoint
- Do not produce a top-level `SECTION` that wraps multiple state-variant `FRAME`s as the export source
- If state differences are small, keep one representative visual screen and express the rest through minimal `semantic` / `state` / structured interaction, plus `componentVariants` when source-of-truth visual/action diffs must be preserved
- If state differences materially change layout or major blocks, split them into separate `ui_spec` files instead of combining them as one top-level variant bundle
- Preserve raw Figma component/variant metadata only as trace context; do not treat variant names/properties as the source-of-truth for runtime meaning
- If a component variant difference matters to runtime behavior, express that meaning through `semantic`, `state`, and structured interaction instead of relying on raw variant metadata alone
- If a component variant difference also carries source-of-truth visual/action differences that downstream codegen must preserve, record those diffs in `componentVariants` instead of leaving them only in trace metadata or prose notes
- Write nested `children` coordinates in the parent's local coordinate space, not as screen-relative positions
- Before semantic self-review, check that text/icon nodes inside cards, buttons, and input fields do not sit abnormally outside their parent bounds
- After drafting the visual JSON, run a semantic self-review focused on source-spec completeness first, then run a separate semantic-to-IR check using `compilers/UI_SPEC_TO_IR_BASELINE.md` as the normalization baseline
- Do not treat `label` or `notes` as a substitute for structured `interaction`, `navigation`, or reference fields when those can be expressed explicitly
- Do not add node-level token refs, asset refs, memo tags, or other compiler-enrichment fields unless the target file already uses them and the request explicitly needs them
- Validate the result against the guide checklist before finishing

Deliverables:
- Save the new file under the required `ui_spec` samples directory
- Briefly report the created file
- Briefly report what semantic fields were added or corrected for source-spec readiness
- Briefly report any semantic-to-IR check gaps separately
- Mention any assumptions or remaining semantic limits that affect layout or content
