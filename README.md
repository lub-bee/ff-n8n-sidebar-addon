# n8n Sidebar Launcher

Firefox extension that adds an `n8n workflows` panel to the native sidebar.

The goal is simple:

1. Click the n8n icon in Firefox sidebar.
2. Click a workflow.

If the workflow is directly launchable, the extension triggers it.
If it is not, the extension opens the workflow in n8n.

## Current MVP behavior

- Native Firefox sidebar integration
- n8n connection via `base URL + API key`
- Workflow list with:
  - name
  - active/inactive status
  - tags
- Search/filter by workflow name or tag
- One-click action on each workflow
- Error toast + inline error panel
- Embedded settings panel in the sidebar
- Separate Firefox options page

## Launch rule

A workflow is considered launchable when:

- it is active
- it exposes at least one webhook node

For launchable workflows, the extension triggers the first detected webhook.

For non-launchable workflows, the extension opens the workflow page in n8n.

## Project structure

- `manifest.json`: Firefox extension manifest
- `background.js`: n8n API calls, workflow detection, workflow launch/open logic
- `sidebar.html`: sidebar markup
- `sidebar.css`: sidebar styles
- `sidebar.js`: sidebar UI logic
- `options.html`: settings page markup
- `options.css`: settings page styles
- `options.js`: settings page logic
- `assets/icon.svg`: extension icon

## Load locally in Firefox

1. Open `about:debugging#/runtime/this-firefox`
2. Click `Load Temporary Add-on`
3. Select `manifest.json`
4. Open the Firefox sidebar
5. Select `n8n workflows`

## Configure the extension

Open settings from the sidebar and provide:

- `n8n base URL`
- `API key`
- optional refresh interval

Example base URL:

```text
http://localhost:5678
```

Do not include a trailing slash.

## Notes about n8n API compatibility

The extension currently tries these workflow endpoints:

- `/api/v1/workflows`
- `/rest/workflows`

And for workflow detail:

- `/api/v1/workflows/:id`
- `/rest/workflows/:id`

This was done to stay compatible with different n8n setups.

## Package the extension

Run:

```bash
./scripts/package.sh
```

This creates a zip archive in `dist/` that can be used for submission or signing.

## Publish on Firefox

Recommended path:

1. Finish local testing
2. Package the extension
3. Submit it to Mozilla Add-ons
4. Start with an `Unlisted` signed version for private distribution

## Known MVP limitations

- Launch detection is webhook-based only
- When multiple webhook nodes exist, the first detected one is used
- No per-workflow custom launch mapping yet
- No execution status tracking after trigger
