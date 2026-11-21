UUID := bluetooth-battery@gra4ev
ZIP := $(UUID).shell-extension.zip
# plain zip instead of `gnome-extensions pack`: same file list as CI, no
# gnome-shell dependency, and it does not segfault outside a session.
FILES := metadata.json extension.js bluezClient.js indicator.js prefs.js stylesheet.css schemas

.PHONY: zip install clean

zip:
	rm -f $(ZIP)
	zip -qrX $(ZIP) $(FILES)

install: zip
	gnome-extensions install --force $(ZIP)
	gnome-extensions enable $(UUID)

clean:
	rm -f $(ZIP)
