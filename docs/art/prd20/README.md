# Weltraumgrafiken – Abnahmeset

`index.html` öffnet die Galerie aller 15 PNGs. Erzeugt mit dem eingebauten ImageGen; keine CLI/API-Erzeugung. `prompts.json` enthält den gemeinsamen Stilprompt, beide lokalen Stilreferenzen und den jeweiligen Zusatzprompt. Der verwendete Gesamtprompt ist jeweils `common` plus `prompt`.

- 01–02: alle 13 Planetentypen ohne blauen Atmosphärensaum. Die erste verworfene Fassung mit blauen Ringen ist nicht Teil dieses Sets.
- 03–04: zehn Sonderstationen einschließlich Bergungswrack plus Archiv-, Studien- und Reliktfundstelle.
- 05: sechs aufeinander aufbauende Ruinenwelt-Ansichten. Das gleiche Küsten-/Ruinenmotiv bleibt erhalten; Bebauung und Infrastruktur wachsen. Mengenangaben im Prompt sind gestalterische Richtwerte, keine exakte Abbildung jedes gebauten Hauses. Bei Integration soll diese Serie die generischen Ruinenweltansichten und bisherigen Gebäudemarker ersetzen.
- 06–09: sämtliche 46 Produktionsstationen in Konfigurationsreihenfolge.
- 10: alle zehn Ressourcen-/Trümmerfelder.
- 11: alle sechs vorhandenen Sonnenfarben.
- 12: zwei alternative Schwarze-Loch-Entwürfe und ein Wurmloch.
- 13: alle fünf Weltraumzonen.
- 14–15: zwei dunkle Hintergrundvarianten, Teal und Violett.

`inventory.json` ordnet die bestehenden Typen den Tafeln zu und dokumentiert die tatsächlichen Bildgrößen. Die Galerie lädt jede Originaldatei und öffnet sie bei Klick einzeln.

## Prüfung der Entwürfe

Alle erzeugten Bilder visuell auf Motivanzahl, erkennbare Funktion, Stil, wesentlichen Beschnitt und den entfernten Planetenleuchtring geprüft. 15 PNG-Signaturen, Abmessungen, Existenz und Galerieverweise geprüft; Bestand mit 13 Planeten, 56 Stationen (davon 46 mit Rezept) und zehn Ressourcenfeldern abgeglichen. `git diff --check` erfolgreich. Keine Spieltests nötig oder ausgeführt, da ausschließlich Vorschauen/Dokumentation geändert wurden.

## Freigabe und fertige Umsetzung

Am 01.11.2026 vom Nutzer freigegeben und vollständig integriert. Produktionsgrafiken: client/assets/art/space/ (103 PNGs). Produktionsquellen und Prompts: production/. Der reproduzierbare Verpackungsschritt scripts/pack-space-art.js verwendet Sharp über SHARP_MODULE und trennt die tatsächlichen Alpha-Abstände der Tafeln. Die ursprünglichen Entwurfstafeln bleiben unverändert als Referenz erhalten.

Die Karte, Vorschaubilder und der Objektführer verwenden die neuen Bilder. Die alten Module planet-development.js und planetExterior.js sind gelöscht. Sechs neue Ruinenwelt-Stufen hängen ausschließlich von fertiggestellter Bausubstanz ab. Physische Orbitale sind unabhängig davon. Keine Spielstandsänderung nötig.

386 Tests und die Browserprüfung bestanden. [Browsergalerie und Nachweise](../../qa/space-art/index.html). Details und Schwellen stehen im [PRD 20](../../PRD-20.md).
