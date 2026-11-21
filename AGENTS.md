# AGENTS.md

GNOME Shell extension (`bluetooth-battery@gra4ev`): panel battery chips for connected
Bluetooth devices, read from BlueZ over D-Bus. Plain ESM shipped as-is — no npm, bundler,
tests, linter or typecheck.

## Build / verify

```bash
make zip       # compiles po/*.po -> locale/, rebuilds the release zip
make install   # make zip + gnome-extensions install --force + enable
make clean     # removes zip and locale/
```

- `msgfmt` (gettext) is required; `make` has no other prerequisite.
- There is no test suite. Verification is `make zip` (catches broken po via `msgfmt -c`)
  plus a manual install and session restart. On Wayland: log out/in; X11: `Alt+F2`, `r`.
  Optional dev loop: nested session (`dbus-run-session -- gnome-shell --nested --wayland`).
- Prefs window: `gnome-extensions prefs bluetooth-battery@gra4ev`; logs:
  `journalctl -f -o cat /usr/bin/gnome-shell`.
- Pre-publish gate: `shexli` (extensions.gnome.org static review) must print `clean`.
  Run it on the **zip**, not the worktree — a directory scan reports `.git/`, `po/` and
  `Makefile` as packaging errors.
  ```bash
  python3 -m venv /tmp/shexli-venv && /tmp/shexli-venv/bin/pip install -U shexli
  /tmp/shexli-venv/bin/shexli bluetooth-battery@gra4ev.shell-extension.zip
  ```

## Packaging gotchas

- `Makefile` `FILES` is a **whitelist**, identical to the zip contents. Add any new root
  file (JS, CSS, schema dir, data) to it or it silently ships broken — this already
  happened once with `notifier.js`.
- Do not switch to `gnome-extensions pack`: it segfaults without a session bus. Plain
  `zip -qrX` is intentional and must match CI.
- `locale/`, `schemas/gschemas.compiled`, `*.shell-extension.zip` are generated and
  gitignored. Never commit them; the release zip comes from CI.

## Code constraints

- GNOME Shell **45–49** must all work from one codebase. `extension.js` branches on
  `SHELL_MAJOR < 46` because `MessageTray.Source`/`Notification` take positional args on
  45 and a params object on 46+. Preserve both paths when touching notifications.
- Imports use `resource:///org/gnome/shell/...`; extensions run as GNOME modules, so
  there is no build step and no relative-path resolution beyond sibling files.
- Data flow: `bluezClient.js` subscribes to `InterfacesAdded/Removed` and
  `PropertiesChanged`, debounces 100 ms, then re-queries `GetManagedObjects`. Do not add
  polling/timers; only devices that are `Connected` **and** expose
  `org.bluez.Battery1` are shown.
- `extension.js` filters devices against `hidden-devices` (compared uppercase, stored as
  MACs) before feeding indicator and notifier; keep filtering in one place.
- Settings live in `schemas/org.gnome.shell.extensions.bluetooth-battery.gschema.xml`
  (schema id fixed). New keys need: schema XML + prefs row + README settings table.
  Schema XML ships uncompiled; `gnome-extensions install` compiles it.
- `prefs.js` runs outside the shell process — it must query BlueZ itself
  (`getPairedDevices()`), not reuse extension state.
- Signal handlers on long-lived objects need a cleanup path in `disable()` or must be
  auto-cleaned via `connectObject(..., someGObject)`. `shexli` rejects plain `connect`
  handlers it cannot see disconnected.
- User-visible strings go through `gettext as _`; only `po/ru.po` exists. Update it
  manually and mirror user-facing doc changes in `README.md` **and** `README.ru.md`.

## Release

Push a `v*` tag; `.github/workflows/release.yml` runs `make zip` and publishes the asset
with `CHANGELOG.md` as the release body. Record the version in `CHANGELOG.md`
(Keep a Changelog / SemVer) before tagging.
