# Bluetooth Battery — GNOME Shell extension

[По-русски →](README.ru.md)

Shows the battery level of **every connected Bluetooth device** right in the top panel.

```
🎧 85%   ⌨ 91%   🖱 40%
```

Each connected device gets its own chip: a device-type icon (headset, mouse, keyboard, gamepad…)
plus its battery percentage. Chips are sorted from the lowest battery to the highest, so the
device that needs charging is always the first one.

Click any chip to open a menu with the full list of devices (name, icon, percentage) and a
shortcut to the Bluetooth settings.

## Features

- One chip per connected device in the panel, device-type icon + percentage
- Lowest battery first; percentage turns red at 20% and below
- Popup menu with device names and a **Bluetooth Settings** entry
- Configurable panel section (left / center / right) and order inside it
- Live updates from BlueZ D-Bus signals — no polling, no background timers
- No shell-outs: talks to BlueZ directly over `org.freedesktop.DBus.ObjectManager`

## Requirements

- GNOME Shell **45–49** (Ubuntu 24.04+/25.10, Fedora 39+, Arch)
- BlueZ running on the system bus (default on every desktop distribution)
- A device that exposes `org.bluez.Battery1` — true for most modern headsets, earbuds,
  mice, keyboards and gamepads
- The device must be **connected** (see [Limitations](#limitations))

## Install

### From a file (Extensions app)

1. Download `bluetooth-battery@gra4ev.shell-extension.zip`
   from the [latest release](https://github.com/edwardgra4ev/gnome-bluetooth-battery/releases/latest).
2. Open **Extensions** (or Extension Manager) → `⋮` → **Install from file…** → pick the zip.
3. Log out and back in (Wayland) or press `Alt+F2`, type `r` (X11).

### From the command line

```bash
gnome-extensions install --force bluetooth-battery@gra4ev.shell-extension.zip
gnome-extensions enable bluetooth-battery@gra4ev
```

Then restart the session the same way as above.

## Settings

**Extensions** app → **Bluetooth Battery** → gear icon:

| Setting | Meaning |
| --- | --- |
| **Section** | Which part of the top bar holds the indicator: right, center or left |
| **Order** | Position inside that section, `0` = first item. Higher values move it right |

GNOME Shell has no built-in drag-and-drop for panel items, so the position is set here.
Both settings apply immediately, without restarting the extension.

## Does my device report a battery?

```bash
# connected devices only
bluetoothctl devices Connected

# ask BlueZ for the battery level of a specific device
gdbus call --system --dest org.bluez \
  --object-path /org/bluez/hci0/dev_XX_XX_XX_XX_XX_XX \
  --method org.freedesktop.DBus.Properties.Get \
  org.bluez.Battery1 Percentage
```

If that returns a number, the extension will show the device. If it fails with
`UnknownMethod`/`UnknownInterface`, the device does not expose its battery to BlueZ.

## Troubleshooting

```bash
journalctl -f -o cat /usr/bin/gnome-shell
```

- **Nothing appears** — no connected device exposes `Battery1`, or the extension is disabled.
- **A device disappeared** — it disconnected; BlueZ removes `Battery1` on disconnect.
- **Changes after `git pull`** — run `make install` and restart the session.

## Build

```bash
make zip       # rebuild bluetooth-battery@gra4ev.shell-extension.zip
make install   # pack, install and enable
make clean
```

`gnome-extensions pack` does not pick up helper modules automatically, so `Makefile` passes
`--extra-source=bluezClient.js --extra-source=indicator.js`.

## How it works

| File | Role |
| --- | --- |
| `bluezClient.js` | Calls `GetManagedObjects` on `org.bluez`, keeps the list of devices that are `Connected` and expose `Battery1.Percentage`; listens to `InterfacesAdded`, `InterfacesRemoved` and `PropertiesChanged` (debounced by 100 ms) |
| `indicator.js` | One `PanelMenu.Button` with a chip per device; resolves the icon from `Device1.Icon`, then name heuristics, then the Bluetooth major device class, with `bluetooth-active-symbolic` as `fallback_icon_name` |
| `extension.js` | Wires client + indicator, applies panel position from GSettings |
| `prefs.js` | Preferences window (section + order) |

## Limitations

- Only **connected** devices are shown. BlueZ drops `Battery1` when a device disconnects, so
  the last known value is not remembered.
- **2.4 GHz dongle devices** are not supported. Cheap receivers (e.g. Areson `25a7:fa7c`)
  present themselves as plain HID devices with no battery telemetry. Logitech HID++ devices
  do expose `hidpp_battery_0` through the kernel and UPower — a possible future source.
- Some devices report in coarse steps (100/70/50/30/10%), that is what BlueZ gives us.

## License

GPL-2.0-or-later. See [LICENSE](LICENSE).
