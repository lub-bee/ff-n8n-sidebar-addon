"use strict";

const extApi = globalThis.browser ?? globalThis.chrome;
const form = document.getElementById("settings-form");
const baseUrlInput = document.getElementById("base-url");
const apiKeyInput = document.getElementById("api-key");
const refreshIntervalInput = document.getElementById("refresh-interval");
const statusElement = document.getElementById("status");

async function loadSettings() {
  const settings = await extApi.runtime.sendMessage({ type: "settings:get" });
  baseUrlInput.value = settings.baseUrl || "";
  apiKeyInput.value = settings.apiKey || "";
  refreshIntervalInput.value = String(settings.refreshInterval ?? 60);
}

function setStatus(message, isError = false) {
  statusElement.textContent = message;
  statusElement.style.color = isError ? "#ff8f8f" : "";
}

async function saveSettings(event) {
  event.preventDefault();

  try {
    await extApi.runtime.sendMessage({
      type: "settings:save",
      payload: {
        baseUrl: baseUrlInput.value,
        apiKey: apiKeyInput.value,
        refreshInterval: refreshIntervalInput.value
      }
    });

    setStatus("Settings saved.");
  } catch (error) {
    setStatus(`Could not save settings: ${error.message || String(error)}`, true);
  }
}

form.addEventListener("submit", (event) => {
  void saveSettings(event);
});

void loadSettings();
