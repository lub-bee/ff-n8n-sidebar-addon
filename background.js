"use strict";

const extApi = globalThis.browser ?? globalThis.chrome;

const DEFAULT_SETTINGS = {
  baseUrl: "",
  apiKey: "",
  refreshInterval: 60
};

function normalizeBaseUrl(baseUrl) {
  return (baseUrl || "").trim().replace(/\/+$/, "");
}

function normalizeSettings(input = {}) {
  const refreshInterval = Number.parseInt(input.refreshInterval, 10);

  return {
    baseUrl: normalizeBaseUrl(input.baseUrl ?? DEFAULT_SETTINGS.baseUrl),
    apiKey: (input.apiKey ?? DEFAULT_SETTINGS.apiKey).trim(),
    refreshInterval: Number.isFinite(refreshInterval) && refreshInterval >= 0
      ? refreshInterval
      : DEFAULT_SETTINGS.refreshInterval
  };
}

async function getSettings() {
  const stored = await extApi.storage.local.get(DEFAULT_SETTINGS);
  return normalizeSettings(stored);
}

async function saveSettings(nextSettings) {
  const settings = normalizeSettings(nextSettings);
  await extApi.storage.local.set(settings);
  return settings;
}

function makeHeaders(apiKey, extraHeaders = {}) {
  return {
    "Accept": "application/json",
    "X-N8N-API-KEY": apiKey,
    ...extraHeaders
  };
}

function unwrapWorkflowList(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.workflows)) {
    return payload.workflows;
  }

  return [];
}

function normalizeTag(tag) {
  if (typeof tag === "string") {
    return tag;
  }

  if (typeof tag?.name === "string") {
    return tag.name;
  }

  return "";
}

function workflowUrl(baseUrl, workflowId) {
  return `${baseUrl}/workflow/${encodeURIComponent(String(workflowId))}`;
}

function summarizeWorkflow(rawWorkflow, baseUrl) {
  const tags = Array.isArray(rawWorkflow?.tags)
    ? rawWorkflow.tags.map(normalizeTag).filter(Boolean)
    : [];

  const webhookCount = Array.isArray(rawWorkflow?.nodes)
    ? extractWebhookCandidates(rawWorkflow).length
    : 0;

  return {
    id: rawWorkflow.id,
    name: rawWorkflow.name || `Workflow ${rawWorkflow.id}`,
    active: Boolean(rawWorkflow.active),
    tags,
    updatedAt: rawWorkflow.updatedAt || rawWorkflow.updated_at || null,
    launchable: Boolean(rawWorkflow.active) && webhookCount > 0,
    webhookCount,
    url: workflowUrl(baseUrl, rawWorkflow.id)
  };
}

async function requestJson(baseUrl, apiKey, path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: makeHeaders(apiKey, init.headers)
  });

  const bodyText = await response.text();
  let payload = null;

  if (bodyText) {
    try {
      payload = JSON.parse(bodyText);
    } catch (error) {
      payload = bodyText;
    }
  }

  if (!response.ok) {
    const message = typeof payload === "string"
      ? payload
      : payload?.message || `${response.status} ${response.statusText}`;

    throw new Error(message);
  }

  return payload;
}

async function requestAgainstKnownPaths(baseUrl, apiKey, paths, init) {
  const errors = [];

  for (const path of paths) {
    try {
      return await requestJson(baseUrl, apiKey, path, init);
    } catch (error) {
      errors.push(`${path}: ${error.message}`);
    }
  }

  throw new Error(errors.join(" | "));
}

async function listWorkflows() {
  const settings = await getSettings();

  if (!settings.baseUrl || !settings.apiKey) {
    throw new Error("Missing n8n base URL or API key.");
  }

  const payload = await requestAgainstKnownPaths(
    settings.baseUrl,
    settings.apiKey,
    [
      "/api/v1/workflows",
      "/rest/workflows"
    ]
  );

  const rawWorkflows = unwrapWorkflowList(payload);
  const detailedWorkflows = await Promise.all(rawWorkflows.map(async (workflow) => {
    if (Array.isArray(workflow?.nodes)) {
      return workflow;
    }

    try {
      const detailPayload = await requestAgainstKnownPaths(
        settings.baseUrl,
        settings.apiKey,
        [
          `/api/v1/workflows/${encodeURIComponent(String(workflow.id))}`,
          `/rest/workflows/${encodeURIComponent(String(workflow.id))}`
        ]
      );

      return detailPayload?.data ?? detailPayload ?? workflow;
    } catch (error) {
      return workflow;
    }
  }));

  const workflows = detailedWorkflows
    .map((workflow) => summarizeWorkflow(workflow, settings.baseUrl))
    .sort((left, right) => left.name.localeCompare(right.name));

  return {
    workflows,
    settings
  };
}

async function getWorkflow(workflowId) {
  const settings = await getSettings();

  if (!settings.baseUrl || !settings.apiKey) {
    throw new Error("Missing n8n base URL or API key.");
  }

  const payload = await requestAgainstKnownPaths(
    settings.baseUrl,
    settings.apiKey,
    [
      `/api/v1/workflows/${encodeURIComponent(String(workflowId))}`,
      `/rest/workflows/${encodeURIComponent(String(workflowId))}`
    ]
  );

  const workflow = payload?.data ?? payload;
  return {
    workflow,
    settings
  };
}

function cleanWebhookPath(pathValue) {
  return String(pathValue || "").trim().replace(/^\/+/, "");
}

function extractWebhookCandidates(workflow) {
  if (!Array.isArray(workflow?.nodes)) {
    return [];
  }

  return workflow.nodes
    .filter((node) => String(node?.type || "").includes("webhook"))
    .map((node) => {
      const params = node.parameters || {};
      const method = String(params.httpMethod || "GET").toUpperCase();
      const path = cleanWebhookPath(params.path || params.webhookPath || params.route || "");

      if (!path) {
        return null;
      }

      return {
        nodeName: node.name || "Webhook",
        method,
        path,
        testPath: cleanWebhookPath(params.path || "")
      };
    })
    .filter(Boolean);
}

function buildWebhookUrl(baseUrl, path) {
  return `${normalizeBaseUrl(baseUrl)}/webhook/${cleanWebhookPath(path)}`;
}

async function triggerWebhook(baseUrl, webhook) {
  const method = webhook.method || "GET";
  const shouldSendBody = !["GET", "HEAD"].includes(method);
  const response = await fetch(buildWebhookUrl(baseUrl, webhook.path), {
    method,
    headers: shouldSendBody ? { "Content-Type": "application/json" } : undefined,
    body: shouldSendBody ? "{}" : undefined
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(text || `${response.status} ${response.statusText}`);
  }

  return {
    status: response.status,
    body: text
  };
}

async function openWorkflowTab(workflowId) {
  const settings = await getSettings();

  if (!settings.baseUrl) {
    throw new Error("Missing n8n base URL.");
  }

  const url = workflowUrl(settings.baseUrl, workflowId);
  await extApi.tabs.create({ url });
  return { url };
}

async function runWorkflow(workflowId) {
  const { workflow, settings } = await getWorkflow(workflowId);
  const webhooks = extractWebhookCandidates(workflow);

  if (!workflow?.active || webhooks.length === 0) {
    const opened = await openWorkflowTab(workflowId);
    return {
      action: "opened",
      workflow: summarizeWorkflow(workflow, settings.baseUrl),
      detail: "Workflow is not directly launchable, opened in n8n instead.",
      url: opened.url
    };
  }

  const chosenWebhook = webhooks[0];
  const result = await triggerWebhook(settings.baseUrl, chosenWebhook);

  return {
    action: "launched",
    workflow: summarizeWorkflow(workflow, settings.baseUrl),
    detail: `${chosenWebhook.method} ${buildWebhookUrl(settings.baseUrl, chosenWebhook.path)}`,
    status: result.status
  };
}

extApi.runtime.onMessage.addListener((message) => {
  switch (message?.type) {
    case "settings:get":
      return getSettings();
    case "settings:save":
      return saveSettings(message.payload);
    case "workflows:list":
      return listWorkflows();
    case "workflow:open":
      return openWorkflowTab(message.workflowId);
    case "workflow:run":
      return runWorkflow(message.workflowId);
    default:
      return undefined;
  }
});
