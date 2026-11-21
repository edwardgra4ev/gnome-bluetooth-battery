# Bluetooth Battery — расширение GNOME Shell

[English →](README.md)

Показывает заряд **всех подключённых Bluetooth-устройств** прямо в верхней панели.

```
🎧 85%   ⌨ 91%   🖱 40%
```

На каждое подключённое устройство — свой чип: иконка типа устройства (наушники, мышь,
клавиатура, геймпад…) и процент заряда. Чипы отсортированы от самого низкого заряда к
высокому, поэтому устройство, которое пора заряжать, всегда слева.

Клик по любому чипу открывает меню со списком устройств (имя, иконка, процент) и пунктом
перехода в настройки Bluetooth.

## Возможности

- Один чип на устройство в панели: иконка типа + процент
- Сортировка по заряду, процент краснеет при 20% и ниже
- Меню со списком устройств и пунктом **Bluetooth Settings**
- Настройка расположения: блок панели (слева / центр / справа) и порядок внутри блока
- Обновления по сигналам BlueZ — без опроса и фоновых таймеров
- Никаких вызовов `bluetoothctl`/`upower`: только D-Bus к `org.bluez`

## Требования

- GNOME Shell **45–49** (Ubuntu 24.04+/25.10, Fedora 39+, Arch)
- BlueZ на системной шине (есть по умолчанию в любом десктопном дистрибутиве)
- Устройство с интерфейсом `org.bluez.Battery1` — так умеют почти все современные
  наушники, TWS-вкладыши, мыши, клавиатуры и геймпады
- Устройство должно быть **подключено** (см. [Ограничения](#ограничения))

## Установка

### Из файла (приложение Extensions)

1. Скачай `bluetooth-battery@gra4ev.shell-extension.zip`
   со [страницы последнего релиза](https://github.com/edwardgra4ev/gnome-bluetooth-battery/releases/latest).
2. Открой **Extensions** (или Extension Manager) → `⋮` → **Install from file…** → выбери zip.
3. Выйди из сессии и войди снова (Wayland) либо нажми `Alt+F2` и введи `r` (X11).

### Из терминала

```bash
gnome-extensions install --force bluetooth-battery@gra4ev.shell-extension.zip
gnome-extensions enable bluetooth-battery@gra4ev
```

Затем перезапусти сессию, как описано выше.

## Настройки

**Extensions** → **Bluetooth Battery** → шестерёнка:

| Настройка | Смысл |
| --- | --- |
| **Section** | Блок панели: right (справа), center (центр), left (слева) |
| **Order** | Позиция внутри блока, `0` — первый элемент. Больше значение — правее |

Перетаскивать элементы панели мышью GNOME не умеет, поэтому позиция задаётся здесь.
Обе настройки применяются сразу, без перезапуска расширения.

## Умеет ли моё устройство отдавать заряд?

```bash
# только подключённые устройства
bluetoothctl devices Connected

# спросить BlueZ про заряд конкретного устройства
gdbus call --system --dest org.bluez \
  --object-path /org/bluez/hci0/dev_XX_XX_XX_XX_XX_XX \
  --method org.freedesktop.DBus.Properties.Get \
  org.bluez.Battery1 Percentage
```

Если вернулось число — расширение покажет устройство. Если ошибка
`UnknownMethod`/`UnknownInterface` — устройство не отдаёт заряд в BlueZ.

## Если не работает

```bash
journalctl -f -o cat /usr/bin/gnome-shell
```

- **Ничего не появилось** — ни одно подключённое устройство не отдаёт `Battery1`,
  либо расширение выключено.
- **Устройство пропало** — оно отключилось, BlueZ удаляет `Battery1` при отключении.
- **После `git pull`** — выполни `make install` и перезапусти сессию.

## Сборка

```bash
make zip       # пересобрать bluetooth-battery@gra4ev.shell-extension.zip
make install   # собрать, установить и включить
make clean
```

`gnome-extensions pack` не подхватывает вспомогательные модули сам, поэтому в `Makefile`
передаются `--extra-source=bluezClient.js --extra-source=indicator.js`.

## Как устроено

| Файл | Роль |
| --- | --- |
| `bluezClient.js` | `GetManagedObjects` у `org.bluez`, список устройств с `Connected` и `Battery1.Percentage`; подписки на `InterfacesAdded`, `InterfacesRemoved`, `PropertiesChanged` (дебаунс 100 мс) |
| `indicator.js` | Один `PanelMenu.Button`, чип на устройство; иконка из `Device1.Icon`, затем эвристика по имени, затем major device class, `bluetooth-active-symbolic` как `fallback_icon_name` |
| `extension.js` | Связывает клиент и индикатор, применяет позицию из GSettings |
| `prefs.js` | Окно настроек (блок панели + порядок) |

## Ограничения

- Показываются только **подключённые** устройства: BlueZ удаляет `Battery1` при отключении,
  последний известный заряд не запоминается.
- **Устройства через 2.4 ГГц донгл** не поддерживаются. Дешёвые ресиверы (например Areson
  `25a7:fa7c`) представляются обычной HID-мышью без телеметрии заряда. Устройства Logitech
  HID++ отдают `hidpp_battery_0` через ядро и UPower — возможный источник в будущем.
- Некоторые устройства отдают заряд грубыми шагами (100/70/50/30/10%) — это данные BlueZ.

## Лицензия

GPL-2.0-or-later. См. [LICENSE](LICENSE).
