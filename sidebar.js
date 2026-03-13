"use strict";

const extApi = globalThis.browser ?? globalThis.chrome;

const state = {
  workflows: [],
  filter: "",
  loading: false,
  error: null,
  settings: null,
  runningWorkflowIds: new Set()
};

const elements = {};
let toastTimer = null;
let refreshTimer = null;

function bindElements() {
  elements.searchBar = document.getElementById("search-bar");
  elements.searchInput = document.getElementById("search-input");
  elements.listView = document.getElementById("list-view");
  elements.loadingView = document.getElementById("loading-view");
  elements.loadingRows = document.getElementById("loading-rows");
  elements.emptyView = document.getElementById("empty-view");
  elements.emptyText = document.getElementById("empty-text");
  elements.launchRows = document.getElementById("launch-rows");
  elements.linkRows = document.getElementById("link-rows");
  elements.listDivider = document.getElementById("list-divider");
  elements.footerText = document.getElementById("footer-text");
  elements.connDot = document.getElementById("conn-dot");
  elements.toast = document.getElementById("toast");
  elements.toastMessage = document.getElementById("toast-msg");
  elements.toastDetail = document.getElementById("toast-detail");
  elements.errorPanel = document.getElementById("error-panel");
  elements.errorTitle = document.getElementById("error-title");
  elements.errorMessage = document.getElementById("error-message");
  elements.errorDetail = document.getElementById("error-detail");
  elements.settingsScreen = document.getElementById("settings-screen");
  elements.settingsButton = document.getElementById("settings-button");
  elements.settingsCloseButton = document.getElementById("settings-close-button");
  elements.settingsForm = document.getElementById("settings-form");
  elements.urlInput = document.getElementById("url-input");
  elements.keyInput = document.getElementById("key-input");
  elements.pollInput = document.getElementById("poll-input");
  elements.refreshButton = document.getElementById("refresh-button");
  renderLoadingRows();
}

function renderLoadingRows() {
  const rows = Array.from({ length: 5 }, (_, index) => `
    <div class="skeleton-row" aria-hidden="true">
      <div class="skel icon"></div>
      <div style="flex:1;display:flex;flex-direction:column;gap:4px">
        <div class="skel line" style="width:${55 + index * 5}%"></div>
        <div style="display:flex;gap:5px;align-items:center">
          <div class="skel dot"></div>
          <div class="skel line" style="width:${20 + index * 6}%"></div>
        </div>
      </div>
    </div>
  `).join("");

  elements.loadingRows.innerHTML = rows;
}

function formatFooter() {
  if (state.loading) {
    return "Loading workflows…";
  }

  if (state.error) {
    return "Connection error";
  }

  if (!state.settings?.baseUrl || !state.settings?.apiKey) {
    return "Missing configuration";
  }

  return `Connected · ${state.workflows.length} workflow${state.workflows.length === 1 ? "" : "s"}`;
}

function normalizeFilter(value) {
  return value.trim().toLowerCase();
}

function getVisibleWorkflows() {
  const filter = normalizeFilter(state.filter);

  if (!filter) {
    return state.workflows;
  }

  return state.workflows.filter((workflow) => {
    const nameMatches = workflow.name.toLowerCase().includes(filter);
    const tagMatches = workflow.tags.some((tag) => tag.toLowerCase().includes(filter));
    return nameMatches || tagMatches;
  });
}

function makeSpinnerSvg() {
  return `<svg class="spinner" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4.5" stroke="rgba(255,255,255,.2)" stroke-width="1.5"></circle><path d="M6 1.5A4.5 4.5 0 0 1 10.5 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path></svg>`;
}

function makePlaySvg() {
  return `<svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M2.5 1.5L8 5 2.5 8.5V1.5Z"></path></svg>`;
}

function makeExternalSvg() {
  return `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2H2a.5.5 0 0 0-.5.5v5.5c0 .28.22.5.5.5h5.5A.5.5 0 0 0 8 8V6M6 2h2v2M8 2 4.5 5.5"></path></svg>`;
}

function renderRows(container, workflows, type) {
  if (workflows.length === 0) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = workflows.map((workflow) => {
    const statusLabel = workflow.active ? "active" : "inactive";
    const rowType = type === "launch" ? "launchable" : "linkonly";
    const running = state.runningWorkflowIds.has(workflow.id);
    const tags = workflow.tags
      .slice(0, 3)
      .map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`)
      .join("");
    const actionIcon = running
      ? makeSpinnerSvg()
      : (type === "launch" ? makePlaySvg() : makeExternalSvg());

    return `
      <div
        class="wf-row ${rowType} ${running ? "running" : ""}"
        role="listitem"
        tabindex="0"
        data-workflow-id="${escapeHtml(String(workflow.id))}"
        aria-label="${escapeHtml(workflow.name)}, ${statusLabel}, ${type === "launch" ? "launchable" : "opens in n8n"}"
      >
        <div class="wf-icon ${type === "launch" ? "launch" : "link"}" aria-hidden="true">
          ${type === "launch" ? makePlaySvg() : makeExternalSvg()}
        </div>
        <div class="wf-body">
          <div class="wf-name">${escapeHtml(workflow.name)}</div>
          <div class="wf-meta">
            <div class="status-dot ${statusLabel}"></div>
            <div class="wf-tags">${tags}</div>
          </div>
        </div>
        <div class="wf-action" aria-hidden="true">${actionIcon}</div>
      </div>
    `;
  }).join("");
}

function render() {
  const visible = getVisibleWorkflows();
  const launchable = visible.filter((workflow) => workflow.launchable);
  const linkOnly = visible.filter((workflow) => !workflow.launchable);
  const showConfigMissing = !state.settings?.baseUrl || !state.settings?.apiKey;
  const showEmpty = !state.loading && !state.error && visible.length === 0;

  elements.loadingView.hidden = !state.loading;
  elements.listView.hidden = state.loading || showEmpty;
  elements.emptyView.hidden = !showEmpty;
  elements.searchBar.hidden = state.loading;
  elements.errorPanel.classList.toggle("show", Boolean(state.error));
  elements.connDot.classList.toggle("err", Boolean(state.error || showConfigMissing));
  elements.footerText.textContent = formatFooter();

  if (showConfigMissing && !state.error) {
    showError({
      title: "Configuration required",
      message: "Add your n8n base URL and API key to load workflows.",
      detail: "Open Settings to connect your n8n instance."
    });
  } else if (!state.error) {
    clearError();
  }

  if (showEmpty) {
    elements.emptyText.textContent = state.filter
      ? "No workflows match your filter."
      : "No workflows found in this n8n instance.";
  }

  renderRows(elements.launchRows, launchable, "launch");
  renderRows(elements.linkRows, linkOnly, "link");

  elements.listDivider.hidden = launchable.length === 0 || linkOnly.length === 0;
}

function showToast(type, message, detail = "") {
  clearTimeout(toastTimer);
  elements.toast.className = `toast ${type}`;
  elements.toastMessage.textContent = message;

  if (detail) {
    elements.toastDetail.textContent = detail;
    elements.toastDetail.classList.add("visible");
  } else {
    elements.toastDetail.textContent = "";
    elements.toastDetail.classList.remove("visible");
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      elements.toast.classList.add("show");
    });
  });

  toastTimer = window.setTimeout(() => {
    elements.toast.classList.remove("show");
  }, 3200);
}

function showError({ title, message, detail }) {
  state.error = { title, message, detail };
  elements.errorTitle.textContent = title;
  elements.errorMessage.textContent = message;
  elements.errorDetail.textContent = detail || "";
  elements.errorPanel.classList.add("show");
  elements.connDot.classList.add("err");
  elements.footerText.textContent = formatFooter();
}

function clearError() {
  state.error = null;
  elements.errorPanel.classList.remove("show");
  elements.errorDetail.textContent = "";
}

function openSettings() {
  elements.settingsScreen.classList.add("show");
}

function closeSettings() {
  elements.settingsScreen.classList.remove("show");
}

function hydrateSettingsForm(settings) {
  elements.urlInput.value = settings.baseUrl || "";
  elements.keyInput.value = settings.apiKey || "";
  elements.pollInput.value = String(settings.refreshInterval ?? 60);
}

async function loadSettings() {
  const settings = await extApi.runtime.sendMessage({ type: "settings:get" });
  state.settings = settings;
  hydrateSettingsForm(settings);
  scheduleAutoRefresh();
}

function scheduleAutoRefresh() {
  clearInterval(refreshTimer);

  if (!state.settings?.refreshInterval) {
    return;
  }

  refreshTimer = window.setInterval(() => {
    if (!state.loading && !elements.settingsScreen.classList.contains("show")) {
      void loadWorkflows({ silent: true });
    }
  }, state.settings.refreshInterval * 1000);
}

async function loadWorkflows({ silent = false } = {}) {
  if (!silent) {
    state.loading = true;
    render();
  }

  try {
    const response = await extApi.runtime.sendMessage({ type: "workflows:list" });
    state.workflows = response.workflows;
    state.settings = response.settings;
    clearError();
  } catch (error) {
    state.workflows = [];
    showError({
      title: "Cannot reach n8n API",
      message: "Check your base URL, API key, and whether the n8n instance is reachable.",
      detail: error.message || String(error)
    });
  } finally {
    state.loading = false;
    render();
  }
}

async function handleWorkflowAction(workflowId) {
  if (state.runningWorkflowIds.has(workflowId)) {
    return;
  }

  state.runningWorkflowIds.add(workflowId);
  render();

  try {
    const result = await extApi.runtime.sendMessage({
      type: "workflow:run",
      workflowId
    });

    if (result.action === "launched") {
      showToast("success", `"${result.workflow.name}" launched`, result.detail);
    } else if (result.action === "opened-form") {
      showToast("success", `Opened form for "${result.workflow.name}"`, result.detail);
    } else {
      showToast("success", `Opened "${result.workflow.name}" in n8n`, result.detail);
    }
  } catch (error) {
    showToast("error", "Workflow action failed", error.message || String(error));
    showError({
      title: "Workflow action failed",
      message: "n8n could not execute this workflow.",
      detail: error.message || String(error)
    });
  } finally {
    state.runningWorkflowIds.delete(workflowId);
    render();
  }
}

async function saveSettings(event) {
  event.preventDefault();

  const payload = {
    baseUrl: elements.urlInput.value,
    apiKey: elements.keyInput.value,
    refreshInterval: elements.pollInput.value
  };

  try {
    const settings = await extApi.runtime.sendMessage({
      type: "settings:save",
      payload
    });

    state.settings = settings;
    hydrateSettingsForm(settings);
    scheduleAutoRefresh();
    closeSettings();
    showToast("success", "Settings saved", "");
    await loadWorkflows();
  } catch (error) {
    showToast("error", "Could not save settings", error.message || String(error));
  }
}

function onListClick(event) {
  const row = event.target.closest(".wf-row");

  if (!row) {
    return;
  }

  const workflowId = row.dataset.workflowId;

  if (!workflowId) {
    return;
  }

  void handleWorkflowAction(workflowId);
}

function onListKeydown(event) {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  const row = event.target.closest(".wf-row");

  if (!row) {
    return;
  }

  event.preventDefault();
  void handleWorkflowAction(row.dataset.workflowId);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function attachEvents() {
  elements.searchInput.addEventListener("input", (event) => {
    state.filter = event.target.value;
    render();
  });

  elements.refreshButton.addEventListener("click", () => {
    void loadWorkflows();
  });

  elements.settingsButton.addEventListener("click", openSettings);
  elements.settingsCloseButton.addEventListener("click", closeSettings);
  elements.settingsForm.addEventListener("submit", (event) => {
    void saveSettings(event);
  });
  elements.listView.addEventListener("click", onListClick);
  elements.listView.addEventListener("keydown", onListKeydown);
}

async function init() {
  bindElements();
  attachEvents();
  await loadSettings();
  render();

  if (state.settings?.baseUrl && state.settings?.apiKey) {
    await loadWorkflows();
  } else {
    openSettings();
  }
}

void init();
