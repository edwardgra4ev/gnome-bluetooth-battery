const SETTINGS_KEY = 'notify-thresholds';

// Sends one notification each time a device's battery drops to or below a
// configured threshold. Thresholds come from GSettings and are re-read live.
export class BatteryNotifier {
    constructor(settings, onLowBattery) {
        this._settings = settings;
        this._onLowBattery = onLowBattery;
        this._devices = [];
        this._thresholds = [];
        this._fired = new Map();

        this._settingsId = settings.connect(`changed::${SETTINGS_KEY}`, () => {
            this._loadThresholds();
            this._fired.clear();
            this._apply(this._devices);
        });
        this._loadThresholds();
    }

    update(devices) {
        this._devices = devices;
        this._apply(devices);
    }

    destroy() {
        if (this._settingsId) {
            this._settings.disconnect(this._settingsId);
            this._settingsId = 0;
        }
        this._settings = null;
        this._onLowBattery = null;
        this._fired.clear();
    }

    _loadThresholds() {
        const values = this._settings?.get_value(SETTINGS_KEY).deepUnpack() ?? [];
        this._thresholds = [...new Set(values)]
            .filter(v => Number.isInteger(v) && v > 0 && v <= 100)
            .sort((a, b) => b - a);
    }

    _apply(devices) {
        const connected = new Set(devices.map(d => d.path));
        for (const path of this._fired.keys()) {
            if (!connected.has(path))
                this._fired.delete(path);
        }

        for (const device of devices) {
            const fired = this._fired.get(device.path) ?? new Set();

            // Charging re-arms the thresholds the battery climbed above.
            for (const threshold of this._thresholds) {
                if (device.percent > threshold)
                    fired.delete(threshold);
            }

            const crossed = this._thresholds
                .filter(t => device.percent <= t && !fired.has(t));
            if (crossed.length > 0) {
                // One notification per drop, not one per threshold passed.
                for (const threshold of this._thresholds) {
                    if (device.percent <= threshold)
                        fired.add(threshold);
                }
                this._onLowBattery?.(device);
            }

            this._fired.set(device.path, fired);
        }
    }
}
