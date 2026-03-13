# Mozilla Add-ons Listing Copy

## Add-on name

n8n Sidebar Launcher

## Short summary

Browse your n8n workflows from the Firefox sidebar and launch compatible workflows in one click.

## Long description

n8n Sidebar Launcher brings your n8n instance into the native Firefox sidebar so you can access workflows without leaving the page you are working on.

The add-on is designed for fast workflow access:

- open the Firefox sidebar
- browse your n8n workflows
- click a workflow to act on it immediately

For directly actionable workflows, the add-on launches them right away.
For workflows that cannot be triggered safely from the sidebar, the add-on opens the workflow in n8n so you can continue there.

Current features:

- native Firefox sidebar integration
- connect to your n8n instance with base URL and API key
- list workflows with name, status, and tags
- search workflows by name or tag
- one-click direct action for compatible workflows
- open non-compatible workflows in n8n
- lightweight error feedback in the sidebar
- embedded settings panel and Firefox options page

Compatibility notes:

- direct execution currently supports active workflows with a usable webhook trigger
- public form workflows can also be opened directly from the sidebar
- other workflows open in the n8n web interface

This add-on is intended as a lightweight productivity tool for people who use n8n often and want faster access from within Firefox.

## Release notes

Initial MVP release:

- Firefox native sidebar integration
- n8n connection via base URL and API key
- workflow list with search and status display
- one-click action for compatible workflows
- fallback opening in n8n for non-compatible workflows
- settings page and sidebar settings panel

## Support site

GitHub repository:

https://github.com/lub-bee/ff-n8n-sidebar-addon

## Homepage

https://github.com/lub-bee/ff-n8n-sidebar-addon

## Privacy policy

n8n Sidebar Launcher stores the n8n base URL, API key, and refresh interval locally in Firefox using the extension storage API.

The add-on sends requests only to the configured n8n instance in order to:

- load workflows
- inspect workflow details
- trigger compatible workflows
- open workflow pages or public forms

No analytics, advertising, tracking, or third-party data sharing is included in the add-on.

User data is not sent to any service other than the n8n instance configured by the user.

## Permissions justification

### storage

Used to store the n8n base URL, API key, and refresh interval locally in the browser.

### tabs

Used to open workflows in n8n or public form URLs in a new browser tab when direct execution is not available.

### host permissions

Used to send API requests to the user-configured n8n instance.

## Category suggestions

- Developer Tools
- Productivity

## Keywords

- n8n
- automation
- workflow
- sidebar
- firefox
- productivity

## Reviewer notes

This add-on connects to a user-provided n8n instance.

The API key is stored locally in extension storage and used only for requests to the configured n8n instance.

The add-on does not include remote code, analytics, advertising, or third-party tracking.

Direct actions are intentionally limited:

- active workflows with a webhook trigger can be launched directly
- public form workflows can be opened directly
- all other workflows are opened in the n8n web UI
