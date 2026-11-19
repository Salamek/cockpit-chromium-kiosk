type Setting = {
  key: string;
  label: string;
  help?: string;
} & (
  | { kind: "boolean"; fallback?: boolean }
  | { kind: "choice"; choices: readonly string[]; fallback?: string }
  | { kind: "text"; fallback?: string }
  | { kind: "number"; min: number; max?: number; fallback?: number }
  | { kind: "list"; fallback?: string }
  | { kind: "structured"; fallback?: string; valid: (value: unknown) => boolean }
);

export const rotations = ["normal", "left", "right", "inverted"];
export const modes = ["hidden", "automaticvisibility", "windowed", "minimized", "maximized", "fullscreen"];

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === "string");
}

export const groups: { title: string; settings: Setting[] }[] = [
  {
    title: "Browser",
    settings: [
      { key: "HOME_PAGE", label: "Home page", kind: "text", fallback: "http://127.0.0.1/" },
      { key: "WINDOW_MODE", label: "Window mode", kind: "choice", choices: modes, fallback: "fullscreen" },
      { key: "IDLE_TIME", label: "Idle timeout (seconds)", kind: "number", min: 0, fallback: 0,
        help: "Return to the home page after this period of inactivity. Set to 0 to disable." },
      { key: "PROFILE_NAME", label: "Profile name", kind: "text", fallback: "default",
        help: "Use a custom name to keep cookies and other browsing data between sessions." },
      { key: "USER_AGENT", label: "User agent", kind: "text", help: "Leave blank to use the browser default." },
      { key: "ADDRESS_BAR.ENABLED", label: "Show address bar", kind: "boolean", fallback: false },
      { key: "SCROLL_BARS.ENABLED", label: "Show scroll bars", kind: "boolean", fallback: false },
    ],
  },
  {
    title: "Display and input",
    settings: [
      { key: "DISPLAY_ROTATION", label: "Display rotation", kind: "choice", choices: rotations, fallback: "normal" },
      { key: "SCREEN_ROTATION", label: "Screen rotation", kind: "choice", choices: rotations },
      { key: "TOUCHSCREEN_ROTATION", label: "Touchscreen rotation", kind: "choice", choices: rotations },
      { key: "TOUCHSCREEN", label: "Touchscreen device", kind: "structured",
        help: 'Use a quoted device name or leave blank for autodetect. Legacy true and false values are accepted.',
        valid: value => typeof value === "boolean" || typeof value === "string" || value === null },
      { key: "CURSOR.ENABLED", label: "Show cursor", kind: "boolean", fallback: true },
      { key: "VIRTUAL_KEYBOARD.ENABLED", label: "Enable virtual keyboard", kind: "boolean", fallback: false },
    ],
  },
  {
    title: "Navigation bar",
    settings: [
      { key: "NAV_BAR.ENABLED", label: "Show navigation bar", kind: "boolean", fallback: false },
      { key: "NAV_BAR.ENABLED_BUTTONS", label: "Buttons", kind: "list", fallback: "home\nreload\nback\nforward",
        help: "Enter home, reload, back or forward, one per line, in display order." },
      { key: "NAV_BAR.HORIZONTAL_POSITION", label: "Horizontal position", kind: "choice",
        choices: ["left", "center", "right"], fallback: "center" },
      { key: "NAV_BAR.VERTICAL_POSITION", label: "Vertical position", kind: "choice",
        choices: ["top", "bottom"], fallback: "bottom" },
      { key: "NAV_BAR.WIDTH", label: "Width (%)", kind: "number", min: 0, max: 100, fallback: 100 },
      { key: "NAV_BAR.HEIGHT", label: "Height (%)", kind: "number", min: 0, max: 100, fallback: 5 },
      { key: "NAV_BAR.UNDERLAY", label: "Place beneath the web view", kind: "boolean", fallback: false },
    ],
  },
  {
    title: "Website access",
    settings: [
      { key: "WHITE_LIST.ENABLED", label: "Enable URL allowlist", kind: "boolean", fallback: false },
      { key: "WHITE_LIST.URLS", label: "Allowed URL patterns", kind: "list",
        help: "Enter one URL or glob pattern per line." },
      { key: "WHITE_LIST.IFRAME_ENABLED", label: "Allowed iframes", kind: "structured", fallback: "true",
        help: 'Use true, false, or a JSON list of URL patterns such as ["example.com/*"].',
        valid: value => typeof value === "boolean" || isStringList(value) },
      { key: "ALLOWED_FEATURES", label: "Allowed browser features", kind: "list",
        help: "Enter one feature per line, such as geolocation, media-video-capture or notifications." },
    ],
  },
  {
    title: "Advanced",
    settings: [
      { key: "REMOTE_DEBUGGING", label: "Remote debugging port", kind: "number", min: 1, max: 65535,
        help: "Leave blank to disable Qiosk remote debugging." },
      { key: "EXTRA_ARGUMENTS", label: "Extra browser arguments", kind: "text" },
      { key: "EXTRA_ENV_VARS", label: "Session environment variables", kind: "structured",
        help: 'Enter a JSON object such as {"QT_SCALE_FACTOR": "1.5"}.',
        valid: value => isRecord(value) && Object.entries(value).every(([key, item]) =>
          /^[^=\0]+$/.test(key) && ["string", "number", "boolean"].includes(typeof item)) },
      { key: "DEBUG", label: "Debug logging", kind: "boolean" },
    ],
  },
];

export type { Setting };
