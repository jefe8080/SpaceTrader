# PRD 6 – Prüfbericht

Datum: 2026-10-25. Geprüft in Microsoft Edge (headless), Desktop 1440 × 1000 und schmales Fenster 390 × 844 mit aktivierter Touch-Unterstützung.

## Ergebnisse

- Vollständige Testsuite: **297 Tests erfolgreich**, keine Fehler oder übersprungenen Tests.
- Vier neue Modelltests: kombinierte Filter, Kauf-/Verkaufspreisgrenzen, neun Sortierkriterien in beiden Richtungen, stabile Gleichstände, unbekannte Werte, angeheftete Favoriten, vorgemerkte Reihenfolge/Treffermenge.
- Drei neue Serverregressionen: Löschen erhält andere Queue-Einträge und schützt fremde Routen; 16-Stopplimit und Behandlung laufender Stoppindizes; vorgemerkte Schiffsabwahl beim Speichern mit Eigentumsprüfung.
- Browser: vier Navigationsgruppen, Planeten-/Stationsansichten ohne Marktliste im Hover, maximal eine offene Ortsrubrik, Waren-/Richtungs-/Sortierauswahl, spielerbezogene Preise einschließlich Zoll, Favoriten hinzufügen/entfernen, neue Notizen, unveränderte DOM-Zeilen und Eingaben bei Marktupdates, unbekannte Flugzeit ohne Referenzschiff, leere Suche und direktes Zurücksetzen.
- Routen: Bearbeiten verändert das Original nicht; Abbrechen sendet keinen Speicherbefehl. Ein ergänzter Stopp wird erst beim Speichern übertragen. Bereits zugewiesene Schiffe können im Entwurf abgewählt werden. Übersicht und Editor bleiben im selben Handelsdialog; Editor kann unabhängig eingeklappt werden.
- Tastatur: Profil per Enter, Fokusführung im Handelsdialog, Escape aus Suchfeld. Touch: Profilrubrik per Tap. Lokales horizontales Scrollen der Tabelle; kein horizontaler Seitenüberlauf; Speichern/Abbrechen im schmalen Editor erreichbar.
- Keine JavaScript-Laufzeitfehler im abschließenden Browserlauf.

## Visuelle Prüfung

Die tatsächlichen Referenzbilder `docs/art/prd5/style-sample.png` und `docs/art/ships/civilian-approved.png` wurden vor der Gestaltung betrachtet. Türkis/Ocker, dunkle Leseflächen und zurückhaltende technische Rahmen übertragen deren Farbwelt in die UI. Texte und Tabellen bleiben ohne dekorative Bildhintergründe. Die folgenden Screenshots wurden visuell kontrolliert:

- [Desktop: Orte & Waren](desktop-places.png)
- [Desktop: Routen mit Editor](desktop-routes.png)
- [Desktop: Ortsrubriken](desktop-location.png)
- [Schmales Fenster: Handelsübersicht](narrow-places.png)
- [Schmales Fenster: Routeneditor](narrow-routes.png)
- [Schmales Fenster: Pilotenprofil](narrow-profile.png)

Zwischenläufe: Die Sichtbarkeitsprüfung am rahmenlosen HUD-Container wurde durch eine Prüfung seines Hidden-Zustands ersetzt. Beim Rubrikwechsel zeigte die native asynchrone Toggle-Verarbeitung kurz zwei offene Bereiche; die Interaktion schaltet nun synchron um. Die abschließenden Läufe sind erfolgreich.

## Wiederholen und Prüfgrenzen

Einen isolierten Server mit `PORT=3006`, `DB_FILE=:memory:` und `WORLD_PROFILE=homeworld` starten, danach `node scripts/verify-prd6.mjs` ausführen. Playwright muss verfügbar sein; alternativ kann `PLAYWRIGHT_MODULE` auf dessen Modulpfad zeigen. `PRD6_URL` erlaubt einen anderen isolierten Server. **Keinen produktiven Server verwenden.**

Der Browserlauf verwendet einen frischen QA-Piloten, bekannte Orte und gezielte lokale Testdaten. Spielbefehle werden im Browser abgefangen und auf ihre Nutzlast geprüft; die tatsächliche serverseitige Ausführung wird durch die Regressionstests abgedeckt. Aktive Datenbanken werden nicht geöffnet. Die Touchprüfung ist eine Browseremulation, keine Prüfung auf physischer Mobilhardware. Flugzeiten bleiben Schätzungen der bestehenden Wegberechnung; laufende Wirtschaftspreise sind keine Ausführungsgarantie. Vorhandene Handelsberechtigungen und Leitstellenregeln gelten weiterhin.
