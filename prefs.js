import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

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
    }
}
