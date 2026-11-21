# Changelog

All notable changes to this extension are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.1.0] - 2026-11-21

### Added

- Low battery notifications: a system notification with the device-type icon when a device
  drops to a threshold; clicking the notification opens the Bluetooth settings.
- Configurable notification thresholds: `notify-thresholds` GSettings key
  (`20, 15, 10, 5` by default), edited in the preferences window. Thresholds re-arm when the
  device charges above them, and a device's state is forgotten when it disconnects.
  An empty list turns notifications off.
- Device visibility: pick which devices are shown in the panel. The choice is stored by
  Bluetooth MAC address (`hidden-devices`), so it survives reconnects, reboots and adapter
  changes. Hidden devices are excluded from notifications as well.
- Russian localization (`po/ru.po`): notifications, panel menu and preferences window.
- Preferences window is now reachable from the panel menu (**Settings**).

### Changed

- The last entry of the panel menu opens the extension preferences instead of
  `gnome-control-center bluetooth`.
- Release workflow builds with `make zip` and installs `gettext`, so `notifier.js` and
  compiled translations are always packed.

### Fixed

- Release archive was missing `notifier.js`.
- Available for GNOME Shell 45–49.

## [1.0.0] - 2026-11-21

### Added

- Panel indicator with one chip per connected Bluetooth device: device-type icon and battery
  percentage, lowest battery first.
- Popup menu with the device list and a shortcut to the Bluetooth settings.
- Configurable panel section and order.
- Live updates from BlueZ D-Bus signals (`InterfacesAdded`, `InterfacesRemoved`,
  `PropertiesChanged`), no polling.
