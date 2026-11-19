# cockpit-chromium-kiosk

A Cockpit tool for editing Chromium Kiosk's `/etc/chromium-kiosk/config.yml`. The package serves a TypeScript webpage and uses Cockpit for host access. YAML conversion uses Python 3 and PyYAML on the managed host, which Chromium Kiosk already uses.

## Test locally with Cockpit

On Arch Linux, install Cockpit and start its socket for this boot.

```sh
sudo pacman -S cockpit
sudo systemctl start cockpit.socket
```

Build the package and link it into the Cockpit user's package directory. Run these commands from the project directory as the user you will sign in as. An existing TypeScript compiler on your path also works with `npm run build`.

```sh
npm install
npm run build
mkdir -p "${XDG_DATA_HOME:-$HOME/.local/share}/cockpit"
ln -s "$PWD/dist" "${XDG_DATA_HOME:-$HOME/.local/share}/cockpit/cockpit-chromium-kiosk"
```

Sign in at [https://localhost:9090](https://localhost:9090) and open **Tools → Chromium Kiosk**. Enable **Administrative access** to save. To test the full flow, use a host with Chromium Kiosk installed and an existing config file.

For a system-wide installation, copy the contents of `dist/` to `/usr/local/share/cockpit/cockpit-chromium-kiosk/` and start a new Cockpit session.

## Configuration

The editor follows the [Chromium Kiosk sample config](https://github.com/Salamek/chromium-kiosk/blob/master/etc/chromium-kiosk/config.yml) and [upstream defaults](https://github.com/Salamek/chromium-kiosk/blob/master/chromium_kiosk/config.py). Changing the window mode removes the legacy `FULL_SCREEN` override. Saving updates the edited keys, preserves other YAML values, and rejects a write if the host file changed after loading. PyYAML rewrites formatting and drops comments. The page edits the config file only. The installed Chromium Kiosk version controls when each setting takes effect.

## Build distribution packages

Both packages install the Cockpit tool in `/usr/share/cockpit/cockpit-chromium-kiosk/`. If you previously made a per-user development link, remove that link and sign in again to load the system package.

On Debian:

```sh
sudo apt-get install build-essential debhelper node-typescript
dpkg-buildpackage -us -uc -b
sudo apt install ../cockpit-chromium-kiosk_0.1.0_all.deb
```

On Arch Linux, build as a regular user with `base-devel` installed:

```sh
cd archlinux
makepkg --syncdeps --cleanbuild
sudo pacman -U cockpit-chromium-kiosk-0.1.0-1-any.pkg.tar.zst
```

## Release with GitLab CI

GitLab builds both packages and saves them as job artifacts. Use runners with the `debian` and `archlinux` tags. A version tag such as `0.1.0` also runs the `docker`-tagged deployment job, which uploads both packages and refreshes the Salamek Debian and Arch repositories.

Run `version status` to check the current version. From a clean working tree, run `version +` for a patch release or `version 0.2.0` to set a specific version. The command updates the three version files, commits the change, tags it, and pushes the branch and tag to `origin`. The tag must also reach GitLab if that project mirrors a separate remote.

Set `SSH_PRIVATE_KEY` in GitLab to the private key text. If this variable is protected, GitLab supplies it only to pipelines on protected refs. The deployment runner needs network access to `PACKAGE_REPO_SSH`.
