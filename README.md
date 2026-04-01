# UiSpecPilot

An agent-friendly ui_spec-centered workflow for UI authoring, review, visualization, IR transformation, and code generation.

## Flow
ui_spec -> semantic review/refinement -> target IR -> codegen -> project code

## Repository Structure

- `ui_spec/`
  Shared `ui_spec` assets, authoring guides, sample JSON files, and semantic review guidance.
- `figma/`
  Figma plugin and bridge server for rendering `ui_spec` files and extracting updates back into spec form.
- `compilers/`
  Target IR compiler boundaries for transforming `ui_spec` into implementation-facing intermediate representations.
- `codegen/`
  Target-specific code generation rules and guides for turning intermediate representations into project code.
- `prompts/`, `task`
  Prompt templates and CLI helpers for agent-driven workflows in Codex or Claude Code.


## Usage

### Optional: enable `./task` tab completion in Bash

```bash
source completions/task.bash
```

### 1. Create a `ui_spec`

```bash
./task create-spec "Create a ui_spec for a login screen"
```

`./task` does not execute the transformation itself. It prints repository-aware prompts for Codex or Claude Code sessions.

`./task` accepts common local file paths across Bash-based environments, including:
- WSL paths such as `/mnt/c/...`
- Windows paths with forward slashes such as `C:/...`
- Windows backslash paths such as `C:\...` only when quoted in Bash

### 2. Review and refine in Figma

```bash
npm run figma:server
```

Start the bridge server, open the Figma plugin, and review or refine the active spec there.

### 3. Run semantic review after visual refinement

```bash
./task semantic-review {ui_spec.json path}
```

### 4. Export the target IR

Use the plugin's IR export action to generate the intermediate representation from the active `ui_spec`.

### 5. Prepare the code generation request

```bash
./task flutter-codegen {ir.json path} {flutter_project path} "Reuse the current project's routing, state management patterns, and style constants as much as possible, and generate page X accordingly. This page should be reachable when the user taps a button on page A, and it should support the following features: ...""
```

## Requirements
- Node.js
- Figma Desktop App
- Access to an agent environment such as Codex or Claude Code
