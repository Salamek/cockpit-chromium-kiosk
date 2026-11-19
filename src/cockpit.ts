interface CockpitFile {
  read(): {
    then(resolve: (content: string | null, tag: string) => void, reject: (error: unknown) => void): void;
  };
  replace(content: string, tag: string): PromiseLike<string>;
  close(): void;
}

interface CockpitProcess extends PromiseLike<string> {
  input(data: string): void;
}

declare global {
  const cockpit: {
    file(path: string, options?: { superuser: "require" | "try" }): CockpitFile;
    spawn(args: string[], options: { err: "message" }): CockpitProcess;
  };
}

export const configPath = "/etc/chromium-kiosk/config.yml";

export async function readConfig(): Promise<{ source: string; tag: string }> {
  const file = cockpit.file(configPath, { superuser: "try" });
  try {
    return await new Promise((resolve, reject) => {
      file.read().then((source, tag) => {
        if (source === null)
          reject(new Error("Configuration file not found. Install Chromium Kiosk on this host."));
        else
          resolve({ source, tag });
      }, reject);
    });
  } finally {
    file.close();
  }
}

export async function writeConfig(source: string, tag: string): Promise<string> {
  const file = cockpit.file(configPath, { superuser: "require" });
  try {
    return await file.replace(source, tag);
  } finally {
    file.close();
  }
}

let codec: string | undefined;

export async function convertYaml(request: object): Promise<string> {
  if (codec === undefined) {
    const response = await fetch(new URL("./yaml-codec.py", import.meta.url));
    if (!response.ok)
      throw new Error("Could not load the configuration parser.");
    codec = await response.text();
  }
  const process = cockpit.spawn(["python3", "-c", codec], { err: "message" });
  process.input(JSON.stringify(request));
  return await process;
}
