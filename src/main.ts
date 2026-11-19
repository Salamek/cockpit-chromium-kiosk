import { convertYaml, readConfig, writeConfig } from "./cockpit.js";
import { groups, isRecord, type Setting } from "./schema.js";

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
type Field = { setting: Setting; control: Control };

const form = document.querySelector<HTMLFormElement>("#settings")!;
const fieldset = document.querySelector<HTMLFieldSetElement>("#fields")!;
const status = document.querySelector<HTMLParagraphElement>("#status")!;
const reload = document.querySelector<HTMLButtonElement>("#reload")!;
const save = document.querySelector<HTMLButtonElement>("#save")!;
const fields: Field[] = [];

function option(select: HTMLSelectElement, value: string, label: string): void {
  select.add(new Option(label, value));
}

function makeControl(setting: Setting): Control {
  switch (setting.kind) {
    case "choice":
    case "boolean": {
      const select = document.createElement("select");
      option(select, "", "Use default");
      if (setting.kind === "boolean") {
        option(select, "true", "Yes");
        option(select, "false", "No");
      } else {
        for (const choice of setting.choices)
          option(select, choice, choice === "automaticvisibility"
            ? "Automatic visibility" : choice[0].toUpperCase() + choice.slice(1));
      }
      return select;
    }
    case "list":
    case "structured": {
      const input = document.createElement("textarea");
      input.rows = 2;
      input.placeholder = setting.fallback ?? "";
      input.spellcheck = false;
      return input;
    }
    case "number":
    case "text": {
      const input = document.createElement("input");
      input.type = setting.kind;
      input.placeholder = String(setting.fallback ?? "");
      if (setting.kind === "number") {
        input.min = String(setting.min);
        if (setting.max !== undefined)
          input.max = String(setting.max);
      }
      return input;
    }
  }
}

for (const group of groups) {
  const section = document.createElement("section");
  const title = document.createElement("h2");
  title.textContent = group.title;
  section.append(title);
  const grid = document.createElement("div");
  grid.className = "grid";
  for (const setting of group.settings) {
    const row = document.createElement("div");
    const label = document.createElement("label");
    const control = makeControl(setting);
    control.id = setting.key;
    label.htmlFor = control.id;
    label.textContent = setting.label;
    row.append(label, control);
    if (setting.help) {
      const help = document.createElement("small");
      help.id = setting.key + "-help";
      help.textContent = setting.help;
      control.setAttribute("aria-describedby", help.id);
      row.append(help);
    }
    fields.push({ setting, control });
    grid.append(row);
  }
  section.append(grid);
  fieldset.append(section);
}

let loaded: { source: string; tag: string } | undefined;
let baseline: string[] = [];
let busy = false;

function syncButtons(): void {
  fieldset.disabled = busy || !loaded;
  reload.disabled = busy;
  save.disabled = busy || !loaded || !isDirty();
}

function isDirty(): boolean {
  return fields.some(({ control }, index) => control.value !== baseline[index]);
}

function showStatus(message: string, error = false): void {
  status.textContent = message;
  status.classList.toggle("error", error);
  status.setAttribute("role", error ? "alert" : "status");
}

function showError(error: unknown): void {
  if (isRecord(error) && error.problem === "change-conflict") {
    showStatus("The configuration changed on the host. Reload it before saving again.", true);
  } else if (isRecord(error) && error.problem === "access-denied") {
    showStatus("Access denied. Enable Administrative access in Cockpit if your account has permission.", true);
  } else {
    showStatus(isRecord(error) && typeof error.message === "string" ? error.message : String(error), true);
  }
}

function populate(settings: Record<string, unknown>): void {
  for (const { setting, control } of fields) {
    let value = settings[setting.key];
    if (setting.key === "WINDOW_MODE" && settings.FULL_SCREEN)
      value = "fullscreen";

    if (control instanceof HTMLSelectElement) {
      const defaultOption = control.options[0];
      defaultOption.textContent = setting.fallback === undefined
        ? "Use default" : `Use default (${setting.fallback})`;
      control.querySelector("option[data-existing]")?.remove();
      if (value != null && !Array.from(control.options).some(item => item.value === String(value))) {
        const existing = new Option(String(value), String(value));
        existing.dataset.existing = "";
        control.add(existing);
      }
    }

    if (setting.kind === "structured") {
      control.value = value === undefined ? "" : JSON.stringify(value);
    } else if (setting.kind === "list" && Array.isArray(value)) {
      control.value = value.join("\n");
    } else {
      control.value = value == null ? "" : String(value);
    }
    control.setCustomValidity("");
  }
  baseline = fields.map(({ control }) => control.value);
}

function getValue({ setting, control }: Field): unknown {
  const value = control.value;
  switch (setting.kind) {
    case "boolean": return value === "true";
    case "number": return Number(value);
    case "choice":
    case "text": return value;
    case "list": return value.split("\n").map(item => item.trim()).filter(Boolean);
    case "structured": {
      const parsed: unknown = JSON.parse(value);
      if (!setting.valid(parsed))
        throw new Error("Enter a value in the format shown below.");
      return parsed;
    }
  }
}

async function load(): Promise<void> {
  busy = true;
  syncButtons();
  showStatus("Loading configuration…");
  try {
    if (typeof cockpit === "undefined")
      throw new Error("Open this page through Cockpit to edit the host configuration.");
    const snapshot = await readConfig();
    const keys = fields.map(({ setting }) => setting.key).concat("FULL_SCREEN");
    const result = await convertYaml({ mode: "read", source: snapshot.source, keys });
    populate(JSON.parse(result));
    loaded = snapshot;
    showStatus("");
  } catch (error) {
    loaded = undefined;
    showError(error);
  } finally {
    busy = false;
    syncButtons();
  }
}

form.addEventListener("input", event => {
  const control = event.target;
  if (control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement)
    control.setCustomValidity("");
  syncButtons();
});

reload.addEventListener("click", () => {
  if (!isDirty() || !loaded || window.confirm("Discard unsaved changes and reload?"))
    void load();
});

form.addEventListener("submit", async event => {
  event.preventDefault();
  if (busy || !loaded || !isDirty())
    return;

  const changes: Record<string, unknown> = {};
  const removals: string[] = [];
  for (const [index, field] of fields.entries()) {
    if (field.control.value === baseline[index])
      continue;
    if (!field.control.reportValidity())
      return;
    if (field.control.value === "" && field.setting.kind !== "list") {
      removals.push(field.setting.key);
      continue;
    }
    try {
      changes[field.setting.key] = getValue(field);
    } catch (error) {
      field.control.setCustomValidity(error instanceof SyntaxError ? "Enter valid JSON." : (error as Error).message);
      field.control.reportValidity();
      return;
    }
  }

  busy = true;
  syncButtons();
  showStatus("Saving configuration…");
  try {
    const source = await convertYaml({ mode: "write", source: loaded.source, changes, removals });
    const tag = await writeConfig(source, loaded.tag);
    loaded = { source, tag };
    baseline = fields.map(({ control }) => control.value);
    showStatus("Configuration saved.");
  } catch (error) {
    showError(error);
  } finally {
    busy = false;
    syncButtons();
  }
});

void load();
