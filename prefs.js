import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {getPairedDevices} from './bluezClient.js';

const BOXES = ['right', 'center', 'left'];

export default class BluetoothBatteryPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        const page = new Adw.PreferencesPage();
        const group = new Adw.PreferencesGroup({
            title: _('Panel position'),
            description: _('GNOME Shell cannot reorder panel items by dragging. Pick a section and an order instead.'),
        });
        page.add(group);
        window.add(page);

        const boxRow = new Adw.ComboRow({
            title: _('Section'),
            model: Gtk.StringList.new([_('Right'), _('Center'), _('Left')]),
        });
        boxRow.selected = Math.max(0, BOXES.indexOf(settings.get_string('panel-box')));
        boxRow.connect('notify::selected', () => {
            settings.set_string('panel-box', BOXES[boxRow.selected]);
        });
        group.add(boxRow);

        const positionRow = new Adw.SpinRow({
            title: _('Order'),
            subtitle: _('0 = first item in the section, higher values move it right'),
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 50,
                step_increment: 1,
                page_increment: 5,
            }),
        });
        settings.bind('panel-position', positionRow, 'value', Gio.SettingsBindFlags.DEFAULT);
        group.add(positionRow);

        const notifyGroup = new Adw.PreferencesGroup({
            title: _('Low battery notifications'),
            description: _('Battery percentages that trigger a system notification, separated by commas. Leave the field empty to disable the notifications.'),
        });
        page.add(notifyGroup);

        const thresholdsRow = new Adw.EntryRow({
            title: _('Thresholds (%)'),
            text: settings.get_value('notify-thresholds').deepUnpack().join(', '),
        });
        thresholdsRow.connect('changed', () => {
            const values = thresholdsRow.text.split(',')
                .map(part => part.trim())
                .filter(part => part !== '')
                .map(Number);
            const valid = values.every(n => Number.isInteger(n) && n > 0 && n <= 100);

            if (valid)
                thresholdsRow.remove_css_class('error');
            else
                thresholdsRow.add_css_class('error');

            if (!valid)
                return;

            const thresholds = [...new Set(values)].sort((a, b) => b - a);
            settings.set_value('notify-thresholds', new GLib.Variant('ai', thresholds));
        });
        notifyGroup.add(thresholdsRow);

        const devicesGroup = new Adw.PreferencesGroup({
            title: _('Devices'),
            description: _('Uncheck a device to hide it from the panel. Hidden devices do not send low battery notifications either.'),
        });
        page.add(devicesGroup);

        getPairedDevices(devices => {
            if (devices.length === 0) {
                devicesGroup.add(new Adw.ActionRow({
                    title: _('No paired Bluetooth devices found.'),
                }));
                return;
            }

            for (const device of devices) {
                const row = new Adw.SwitchRow({
                    title: device.name,
                    subtitle: device.address,
                    active: !settings.get_strv('hidden-devices').includes(device.address),
                });
                row.connect('notify::active', () => {
                    const hidden = new Set(settings.get_strv('hidden-devices'));
                    if (row.active)
                        hidden.delete(device.address);
                    else
                        hidden.add(device.address);
                    settings.set_strv('hidden-devices', [...hidden]);
                });
                devicesGroup.add(row);
            }
        });
    }
}
