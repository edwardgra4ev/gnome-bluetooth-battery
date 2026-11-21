UUID := bluetooth-battery@gra4ev
ZIP := $(UUID).shell-extension.zip
EXTRA_SOURCES := --extra-source=bluezClient.js --extra-source=indicator.js

.PHONY: zip install clean

zip:
	gnome-extensions pack . $(EXTRA_SOURCES) --force --out-dir=.

install: zip
	gnome-extensions install --force $(ZIP)
	gnome-extensions enable $(UUID)

clean:
	rm -f $(ZIP)
