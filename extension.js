import Gio from 'gi://Gio';

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

import * as Config from 'resource:///org/gnome/shell/misc/config.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as MessageTray from 'resource:///org/gnome/shell/ui/messageTray.js';
import * as Util from 'resource:///org/gnome/shell/misc/util.js';

import {BluezClient} from './bluezClient.js';
import {BluetoothBatteryIndicator, resolveIcon} from './indicator.js';
import {BatteryNotifier} from './notifier.js';

// MessageTray switches from positional arguments (45) to a params object (46+).
const SHELL_MAJOR = Number.parseInt(Config.PACKAGE_VERSION.split('.')[0], 10);

export default class BluetoothBatteryExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._devices = [];

        this._indicator = new BluetoothBatteryIndicator(() => this.openPreferences());
        Main.panel.addToStatusArea(
            this.uuid,
            this._indicator,
            this._settings.get_int('panel-position'),
            this._settings.get_string('panel-box'));

        this._settingsIds = [
            this._settings.connect('changed::panel-box', () => this._placeIndicator()),
            this._settings.connect('changed::panel-position', () => this._placeIndicator()),
            this._settings.connect('changed::hidden-devices', () => this._applyDevices()),
        ];

        this._notifier = new BatteryNotifier(this._settings, device => this._notifyLowBattery(device));

        this._client = new BluezClient(devices => this._applyDevices(devices));
        this._client.start();
    }

    disable() {
        for (const id of this._settingsIds ?? [])
            this._settings.disconnect(id);
        this._settingsIds = [];

        this._notifier?.destroy();
        this._notifier = null;

        this._notificationSource?.destroy();
        this._notificationSource = null;

        this._client?.destroy();
        this._client = null;

        this._indicator?.destroy();
        this._indicator = null;

        this._settings = null;
    }

    // Hidden devices disappear from the panel and stop sending notifications,
    // but stay in GSettings so the choice survives reconnects and restarts.
    _applyDevices(devices = this._devices) {
        this._devices = devices;

        const hidden = new Set(this._settings.get_strv('hidden-devices')
            .map(address => address.toUpperCase()));
        const visible = devices.filter(d => !hidden.has(d.address.toUpperCase()));

        this._indicator?.update(visible);
        this._notifier?.update(visible);
    }

    _notifyLowBattery(device) {
        const title = `${device.name}: ${device.percent}%`;
        const body = _('Battery low, connect a charger');

        if (SHELL_MAJOR < 46) {
            Main.notify(title, body);
            return;
        }

        if (!this._notificationSource) {
            this._notificationSource = new MessageTray.Source({
                title: 'Bluetooth Battery',
                iconName: 'bluetooth-active-symbolic',
            });
            Main.messageTray.add(this._notificationSource);
        }

        const notification = new MessageTray.Notification({
            source: this._notificationSource,
            title,
            body,
            gicon: new Gio.ThemedIcon({name: resolveIcon(device)}),
        });
        // connectObject ties the handler to the source's lifetime, so it is
        // dropped when the source is destroyed in disable().
        notification.connectObject('activated',
            () => Util.spawn(['gnome-control-center', 'bluetooth']),
            this._notificationSource);
        this._notificationSource.addNotification(notification);
    }

    // Same effect as addToStatusArea(position, box) but without re-creating the
    // indicator, so the settings apply instantly and no data is lost.
    _placeIndicator() {
        if (!this._indicator)
            return;

        const boxes = {
            left: Main.panel._leftBox,
            center: Main.panel._centerBox,
            right: Main.panel._rightBox,
        };
        const box = boxes[this._settings.get_string('panel-box')] ?? Main.panel._rightBox;
        const position = Math.max(0, this._settings.get_int('panel-position'));

        const container = this._indicator.container;
        container.get_parent()?.remove_child(container);
        box.insert_child_at_index(container, position);
    }
}
