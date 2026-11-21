UUID := bluetooth-battery@gra4ev
DOMAIN := bluetooth-battery
ZIP := $(UUID).shell-extension.zip
# plain zip instead of `gnome-extensions pack`: same file list as CI, no
# gnome-shell dependency, and it does not segfault outside a session.
FILES := metadata.json extension.js bluezClient.js indicator.js notifier.js prefs.js stylesheet.css schemas locale

.PHONY: zip locale install clean

zip: locale
	rm -f $(ZIP)
	zip -qrX $(ZIP) $(FILES)

locale:
	@for po in po/*.po; do \
		[ -e "$$po" ] || continue; \
		lang=$$(basename "$$po" .po); \
		mkdir -p "locale/$$lang/LC_MESSAGES"; \
		msgfmt -c -o "locale/$$lang/LC_MESSAGES/$(DOMAIN).mo" "$$po"; \
	done

install: zip
	gnome-extensions install --force $(ZIP)
	gnome-extensions enable $(UUID)

clean:
	rm -f $(ZIP)
	rm -rf locale
