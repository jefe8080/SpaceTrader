# PRD 8 – Übertragung der freigegebenen Agrargestaltung auf alle Typen

Stand 25.10.2026. Die korrigierte Agrar-Spielansicht wurde als Grundlage freigegeben; alle weiteren Typen verwenden jetzt ebenfalls zusammenhängend gemalte Städte. Die erste abgelehnte Rasterdarstellung wird nicht mehr verwendet.

## Tatsächliche Spielaufnahmen

- [Alle 13 Typen gemeinsam](all-types.png)
- Einzelansichten: `agrar.png`, `ocean.png`, `desert.png`, `mining.png`, `ice.png`, `urban.png`, `resort.png`, `gasgiant.png`, `jungle.png`, `volcanic.png`, `colony.png`, `industrial.png`, `ruins.png`.
- Je Typ eine tatsächliche Touch-Ansicht mit geöffnetem Panel: `<typ>-mobile.png`.
- Heimatwelt: [Zustandswechsel](ruins-development.png), [48 freie Grundstücke](ruins-48-plots.png), [48 bebaute Grundstücke](ruins-48-developed.png).

Die Bilder stammen aus dem regulären Canvas und den bisherigen Panels. Alle Straßen, Wohnhäuser, Landschaften und festen Geschäftshäuser sind Bestandteil der jeweiligen Illustration. Variable Fabriken, Heimat-Einrichtungen, Strukturen und Figuren werden auf individuell gesetzte Standorte gezeichnet. Die Metropole besitzt Pendler-/Reiseterminals und höhere Bebauung; andere Typen erhalten unter anderem Hafenterrassen, geschützte Eisarchitektur, Fels-/Lavaterrassen, Dschungelwege, Ferienküsten oder ein durchgehendes bewohntes Gasförderdeck.

## Prüfung

- **320/320 automatisierte Tests erfolgreich** (`test-results.txt`).
- Gesonderte Heimatwelt-/Operations-/Hauptquestprüfungen: **29/29 erfolgreich** (`home-tests.txt`).
- Browserprüfung `scripts/verify-prd8.mjs`: **13 Typen, 233 interaktive Objekte, keine Fehlertreffer und keine JavaScript-Fehler**. Die Fixtures verwenden nun einen tatsächlich erlaubten ersten Fabriktyp je Planetentyp; die frühere pauschale Biofabrik war auf manchen Typen nicht erlaubt.
- Alle 13 Szenen zeichnen genau **ein Landschaftsbild pro Frame**, mit **null generierten Straßen** und **null separat verteilten Umgebungshäusern**. Alter Rasterplaner, Dekorverteilung und gespiegelte Randdarstellung sind entfernt.
- **104 reale Desktop-Kamera-Grenzfälle** und mobile Prüfung sämtlicher 13 Typen: die sichtbaren Bildecken liegen innerhalb der jeweiligen Illustration. Reine Kameratests prüfen zusätzlich mehrere Bildschirmformate, offene Panels und Randgebäude.
- Auf allen Typen wurde per tatsächlichem Touch ein Ort geöffnet und der Verlassen-Button unterhalb der Kopfzeile geprüft. Bestehende Bedienung einschließlich Escape, Namen, Fokus/Übersicht, Verschieben, Mausrad, Pinch und räumlicher Tastaturauswahl bleibt erhalten.
- Die zulässige höchste zusätzliche Waren- und Fabrikausstattung aller bewohnten Typen wurde im Planer getestet. Jedes Objekt hat einen eindeutigen Standort; Bauplatz/Fabrik teilen denselben Kategorienhof.
- Heimatwelt: reparierbare Einrichtungen, Baustellen, fertige Strukturen, Orbitalzustände und stabile Standorte bei Änderungen geprüft. Beide 48-Grundstücks-Varianten wurden im Browser gerendert; die bebaute Heimatwelt hat **58 eindeutige erreichbare Objekte**.
- PRD-7-Browserregression erfolgreich: Profil, Dialogbestätigung, Rathaus, lokaler/Fernzugang, Verbindungsverlust und fünf Bildschirmbreiten. Nachweise im Unterordner `prd7-regression/`.

## Korrekturen aus der Kontrolle

Trefferflächen für dicht stehende Gebäude präzisiert, Figuren auf freie Pflasterbereiche zurückgesetzt, zusätzliche Dienstleistungsstandorte der Paradieswelt versetzt und die Metropole gezielt von verbliebenen Agraranlagen befreit. Für Gebäudestandorte nahe Bildrändern wählt die Fokusfahrt bei Bedarf stärkere Vergrößerung, sodass die auswählbare Mitte auch auf schmalen Bildschirmen außerhalb der Bedienelemente liegt. Diese Korrektur beseitigt den im Touch-Test gefundenen oberen Randfall des Heimat-Wasserwerks. Die Kamera bleibt dabei vollständig innerhalb des Bildes.

## Grenzen und Reproduktion

Die illustrierten Städte verwenden pro Typ denselben Grundriss; Markt-/Besitzausstattung bestimmt die aktiven Trefferflächen und variablen Bauten. Inaktive gezeichnete Geschäfte bleiben als Stadtbestandteil ohne Aktion sichtbar. Heimat-Ausbaugrundstücke sind zu vier Parzellen in jeweils einem der zwölf gemalten Höfe zusammengefasst. Sehr starke Vergrößerung zeigt entsprechend vergrößerte Bildtextur; auf schmalen Bildschirmen kann die gesamte breite Stadt nicht gleichzeitig gezeigt werden.

Browseraufnahmen verwenden isolierte lokale Markt-/Bau-Fixtures nach einem regulären Heimatwelt-Dialogcheck. Sie verändern keine bestehenden Spielstände und ersetzen keine vollständige Wirtschaftssimulation; die Serverlogik ist unverändert und durch die bestehende Testsuite abgesichert. Der Entwicklungsserver lief auf Port 3008 ausschließlich mit Datenbank `:memory:`.

Reproduktion: separaten Homeworld-Server starten, dann `PRD8_QA_DIR=../docs/qa/prd8/rollout/` und gegebenenfalls `PLAYWRIGHT_MODULE` setzen; `node scripts/verify-prd8.mjs` ausführen. `PRD8_URL` erlaubt eine andere lokale Serveradresse. Die Produktionsprompts stehen unter [rollout-prompts.md](../../../art/prd8/rollout-prompts.md); endgültige Grafiken unter `client/assets/art/cities/<typ>-city-v2.png`.
