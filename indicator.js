import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as Util from 'resource:///org/gnome/shell/misc/util.js';
import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

const LOW_BATTERY = 20;
const FALLBACK_ICON = 'bluetooth-active-symbolic';

const ICON_MAP = {
    'audio-headset': 'audio-headset-symbolic',
    'audio-headphones': 'audio-headphones-symbolic',
    'audio-card': 'audio-speakers-symbolic',
    'audio-speakers': 'audio-speakers-symbolic',
    'input-keyboard': 'input-keyboard-symbolic',
    'input-mouse': 'input-mouse-symbolic',
    'input-gaming': 'input-gaming-symbolic',
    'input-tablet': 'input-tablet-symbolic',
    'phone': 'phone-symbolic',
    'computer': 'computer-symbolic',
    'camera-photo': 'camera-photo-symbolic',
    'camera-video': 'camera-video-symbolic',
    'printer': 'printer-symbolic',
    'scanner': 'scanner-symbolic',
    'modem': 'network-wireless-symbolic',
    'watch': 'preferences-system-time-symbolic',
};

// Major device class -> icon, used when BlueZ reports no usable Icon name.
const CLASS_ICONS = {
    1: 'computer-symbolic',
    2: 'phone-symbolic',
    4: 'audio-headphones-symbolic',
    6: 'camera-photo-symbolic',
    7: 'preferences-system-time-symbolic',
};

const NAME_HINTS = [
    [/head[\s-]?set|head[\s-]?phone|buds|airpods|earbuds|freebuds/i, 'audio-headphones-symbolic'],
    [/speaker|soundbar|boombox/i, 'audio-speakers-symbolic'],
    [/keyboard|kbd/i, 'input-keyboard-symbolic'],
    [/mouse|trackball/i, 'input-mouse-symbolic'],
    [/gamepad|controller|dualshock|dualsense|xbox|joy[\s-]?con/i, 'input-gaming-symbolic'],
    [/watch|smart[\s-]?band|fitbit|garmin/i, 'preferences-system-time-symbolic'],
    [/phone|iphone|pixel|galaxy/i, 'phone-symbolic'],
];

// Returns the best guess for a device icon name. St.Icon falls back to
// `fallback_icon_name` when the guessed name is missing from the theme.
function resolveIcon(device) {
    const candidates = [];

    const mapped = ICON_MAP[device.icon];
    if (mapped)
        candidates.push(mapped);

    for (const [pattern, icon] of NAME_HINTS) {
        if (pattern.test(device.name)) {
            candidates.push(icon);
            break;
        }
    }

    const classIcon = CLASS_ICONS[(device.deviceClass >> 8) & 0x1f];
    if (classIcon)
        candidates.push(classIcon);

    candidates.push(FALLBACK_ICON);

    return candidates[0];
}

function percentLabel(device, styleClass) {
    const label = new St.Label({
        text: `${device.percent}%`,
        y_align: Clutter.ActorAlign.CENTER,
        style_class: styleClass,
    });
    if (device.percent <= LOW_BATTERY)
        label.add_style_class_name('btb-low');
    return label;
}

export const BluetoothBatteryIndicator = GObject.registerClass(
class BluetoothBatteryIndicator extends PanelMenu.Button {
    _init() {
        super._init(0.0, 'BluetoothBatteryIndicator', false);

        this._box = new St.BoxLayout({style_class: 'btb-panel-box'});
        this.add_child(this._box);

        this.visible = false;
    }

    update(devices) {
        this._devices = devices;
        this.visible = devices.length > 0;

        this._rebuildChips();
        this._rebuildMenu();

        if (typeof this.set_tooltip_text === 'function') {
            this.set_tooltip_text(devices
                .map(d => `${d.name} ${d.percent}%`)
                .join('\n'));
        }
    }

    _rebuildChips() {
        this._box.destroy_all_children();

        for (const device of this._devices) {
            const chip = new St.BoxLayout({style_class: 'btb-chip'});
            chip.add_child(new St.Icon({
                icon_name: resolveIcon(device),
                fallback_icon_name: FALLBACK_ICON,
                style_class: 'system-status-icon btb-icon',
                icon_size: 16,
            }));
            chip.add_child(percentLabel(device, 'btb-percent'));
            this._box.add_child(chip);
        }
    }

    _rebuildMenu() {
        this.menu.removeAll();

        if (this._devices.length === 0) {
            const item = new PopupMenu.PopupBaseMenuItem({reactive: false, can_focus: false});
            item.add_child(new St.Label({
                text: _('No connected Bluetooth devices with a battery'),
                style_class: 'btb-empty',
            }));
            this.menu.addMenuItem(item);
        } else {
            for (const device of this._devices)
                this.menu.addMenuItem(this._buildDeviceItem(device));
        }

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        const settings = new PopupMenu.PopupMenuItem(_('Bluetooth Settings'));
        settings.connect('activate', () => Util.spawn(['gnome-control-center', 'bluetooth']));
        this.menu.addMenuItem(settings);
    }

    _buildDeviceItem(device) {
        const item = new PopupMenu.PopupBaseMenuItem({reactive: false, can_focus: false});

        const row = new St.BoxLayout({x_expand: true, style_class: 'btb-menu-row'});
        row.add_child(new St.Icon({
            icon_name: resolveIcon(device),
            fallback_icon_name: FALLBACK_ICON,
            style_class: 'popup-menu-icon',
            icon_size: 16,
        }));
        row.add_child(new St.Label({
            text: device.name,
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'btb-menu-name',
        }));
        row.add_child(percentLabel(device, 'btb-menu-percent'));

        item.add_child(row);
        return item;
    }
});
