import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {BluezClient} from './bluezClient.js';
import {BluetoothBatteryIndicator} from './indicator.js';

export default class BluetoothBatteryExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._devices = [];

        this._indicator = new BluetoothBatteryIndicator();
        Main.panel.addToStatusArea(
            this.uuid,
            this._indicator,
            this._settings.get_int('panel-position'),
            this._settings.get_string('panel-box'));

        this._settingsIds = [
            this._settings.connect('changed::panel-box', () => this._placeIndicator()),
            this._settings.connect('changed::panel-position', () => this._placeIndicator()),
        ];

        this._client = new BluezClient(devices => {
            this._devices = devices;
            this._indicator?.update(devices);
        });
        this._client.start();
    }

    disable() {
        for (const id of this._settingsIds ?? [])
            this._settings.disconnect(id);
        this._settingsIds = [];

        this._client?.destroy();
        this._client = null;

        this._indicator?.destroy();
        this._indicator = null;

        this._settings = null;
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
