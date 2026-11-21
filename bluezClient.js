import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

const BLUEZ_NAME = 'org.bluez';
const OBJECT_MANAGER_IFACE = 'org.freedesktop.DBus.ObjectManager';
const DEVICE_IFACE = 'org.bluez.Device1';
const BATTERY_IFACE = 'org.bluez.Battery1';

const DEBOUNCE_MS = 100;

// deepUnpack() leaves nested variants untouched, recursiveUnpack() turns
// a{sv} values into plain JS numbers/booleans/strings.
function queryObjects(cancellable, callback) {
    Gio.DBus.system.call(
        BLUEZ_NAME,
        '/',
        OBJECT_MANAGER_IFACE,
        'GetManagedObjects',
        null,
        new GLib.VariantType('(a{oa{sa{sv}}})'),
        Gio.DBusCallFlags.NONE,
        -1,
        cancellable,
        (bus, res) => {
            let objects;
            try {
                [objects] = bus.call_finish(res).recursiveUnpack();
            } catch (e) {
                if (!e.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED))
                    console.warn(`[bluetooth-battery] GetManagedObjects failed: ${e.message}`);
                return;
            }
            callback(objects ?? {});
        });
}

// Paired and connected devices, connected or not. Used by the preferences
// window, which runs outside the shell and needs its own D-Bus query.
export function getPairedDevices(callback) {
    queryObjects(null, objects => {
        const devices = [];

        for (const interfaces of Object.values(objects)) {
            const device = interfaces[DEVICE_IFACE];
            if (!device?.Address || !(device.Paired || device.Connected))
                continue;

            devices.push({
                address: device.Address,
                name: device.Alias || device.Name || device.Address,
                connected: Boolean(device.Connected),
            });
        }

        devices.sort((a, b) => a.name.localeCompare(b.name));
        callback(devices);
    });
}

export class BluezClient {
    constructor(onChanged) {
        this._onChanged = onChanged;
        this._devices = [];
        this._signalIds = [];
        this._timeoutId = 0;
        this._cancellable = new Gio.Cancellable();
    }

    start() {
        const bus = Gio.DBus.system;
        const subscribe = (iface, member) => {
            this._signalIds.push(bus.signal_subscribe(
                BLUEZ_NAME, iface, member, null, null,
                Gio.DBusSignalFlags.NONE,
                () => this._scheduleReload()));
        };

        subscribe(OBJECT_MANAGER_IFACE, 'InterfacesAdded');
        subscribe(OBJECT_MANAGER_IFACE, 'InterfacesRemoved');
        subscribe(DEVICE_IFACE, 'PropertiesChanged');
        subscribe(BATTERY_IFACE, 'PropertiesChanged');

        this._reload();
    }

    destroy() {
        const bus = Gio.DBus.system;
        for (const id of this._signalIds)
            bus.signal_unsubscribe(id);
        this._signalIds = [];

        if (this._timeoutId) {
            GLib.source_remove(this._timeoutId);
            this._timeoutId = 0;
        }

        this._cancellable.cancel();
        this._onChanged = null;
    }

    _scheduleReload() {
        if (this._timeoutId)
            return;
        this._timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, DEBOUNCE_MS, () => {
            this._timeoutId = 0;
            this._reload();
            return GLib.SOURCE_REMOVE;
        });
    }

    _reload() {
        queryObjects(this._cancellable, objects => this._apply(objects));
    }

    _apply(objects) {
        const devices = [];

        for (const [path, interfaces] of Object.entries(objects)) {
            const device = interfaces[DEVICE_IFACE];
            const battery = interfaces[BATTERY_IFACE];

            if (!device || !battery || !device.Connected)
                continue;

            const percent = Number(battery.Percentage);
            if (!Number.isFinite(percent))
                continue;

            devices.push({
                path,
                address: device.Address ?? '',
                name: device.Alias || device.Name || path,
                icon: device.Icon ?? '',
                deviceClass: Number(device.Class ?? 0),
                percent: Math.max(0, Math.min(100, Math.round(percent))),
            });
        }

        devices.sort((a, b) => a.percent - b.percent || a.name.localeCompare(b.name));

        if (JSON.stringify(devices) === JSON.stringify(this._devices))
            return;

        this._devices = devices;
        this._onChanged?.(devices);
    }
}
