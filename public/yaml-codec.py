"""Convert kiosk settings using the same YAML loader as Chromium Kiosk."""

import json
import sys

import yaml


def main():
    request = json.load(sys.stdin)
    config = yaml.safe_load(request["source"])
    if not isinstance(config, dict):
        raise ValueError("The configuration must contain a YAML mapping.")

    if request["mode"] == "read":
        settings = {}
        for path in request["keys"]:
            section, separator, key = path.partition(".")
            parent = config.get(section, {}) if separator else config
            if not isinstance(parent, dict):
                raise ValueError(f"{section} must contain a YAML mapping.")
            key = key if separator else section
            if key in parent:
                settings[path] = parent[key]
        print(json.dumps(settings, allow_nan=False))
        return

    for path, value in request["changes"].items():
        section, separator, key = path.partition(".")
        if separator:
            config[section] = {**config.get(section, {}), key: value}
        else:
            config[section] = value

    for path in request["removals"]:
        section, separator, key = path.partition(".")
        if separator:
            parent = config.get(section, {}).copy()
            if key in parent:
                del parent[key]
                if parent:
                    config[section] = parent
                else:
                    del config[section]
        else:
            config.pop(section, None)

    if "WINDOW_MODE" in request["changes"] or "WINDOW_MODE" in request["removals"]:
        config.pop("FULL_SCREEN", None)

    sys.stdout.write(yaml.safe_dump(config, allow_unicode=True, sort_keys=False, default_flow_style=False))


try:
    main()
except (KeyError, TypeError, ValueError, yaml.YAMLError) as error:
    sys.exit(str(error))
