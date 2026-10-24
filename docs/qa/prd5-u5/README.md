# U5: Einstieg und Heimatjournal

2026-10-24: echte Browsersitzung mit neuem Spieler `PRD5 QA` im isolierten Entwicklungsprofil.

- Neue persönliche Heimat im Sektor Nexga-Zeta, eigenes Schiff in unmittelbarer Nähe.
- Gezeichneter Ankunftsdialog mit Mira, lesbaren UI-Texten und Überspringen; Abspielen wird im Spielstand gespeichert.
- Heimat auf Karte ausgewählt, Schiff per UI hingeschickt und tatsächlich angedockt.
- Planetare Ruinenansicht mit acht freien Plätzen und separaten Ankern für Dock, Leitstelle, Werkstatt und fünf Grundanlagen geladen.
- Heimatjournal geöffnet, H00 abgeschlossen (zehn XP), Dockreparatur über UI gestartet und abgeschlossen.
- Die Oberfläche verwendet für die 3D-Gebäude noch Übergangsmodelle; fertiger gezeichneter interaktiver Stil folgt U16.

Integrationstests in `tests/homeworld.test.js` prüfen 24 Spieler, Mindestabstände und Grundquellen, erschöpfte Startringe, H05/H06 mit tatsächlichen Einkäufen/Transfers, einmalige Belohnungen, Fremdrechte, Baukosten/-timer und Persistenz. Der H04-Reliktzweig wird in U6 ergänzt.

Bildnachweise: `arrival-dialog.png`, `home-journal.png`, `dock-ready.png`.
