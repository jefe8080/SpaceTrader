# PRD 14 – Abnahme am 31.10.2026

Die vollständige Testsuite besteht: **383 Tests, 0 Fehler**.
Protokoll: [tests.txt](tests.txt). Node 24.13.0, SQLite mit der im Paket
enthaltenen Binärdatei; Installation mit `npm ci --ignore-scripts`.

## Automatisierte Abnahme

- Absatz: exaktes Drei-Stunden-Fenster, bezahlte Teilmengen, Preiswirkung,
  Bestands- und Reservegrenzen, Budgetgrenzen und tatsächlicher
  Datenbankneustart ohne erneute Kontogutschrift.
- Ortslisten: konkrete Planetentypen, Ruinen und Rohstofffelder mit
  kombinierten Such-, Waren- und Typfiltern, fehlende Feldmarktpreise und
  unverändertes Verhalten expliziter Listenaktualisierung.
- Tourismus: eigene Paradieswelt, Hotel mit 480 Plätzen, unveränderte
  Personenbestände, 20 Minuten Aufenthalt, Abholbarkeit, Rückkehr und
  unterschiedliche Fehlermeldungen für Eignung und Vollbelegung.
- Wohnbau: 200/400/800 Plätze, ansteigende Kosten und Stromwerte, beide
  Baupfade, Doppelauftrag, ausstehender Ausbau über Datenbankneustart,
  Fertigstellung und fehlende Besitzrechte.
- Nebenquests: sechs Arten, echte Quellen und Ziele, erneute
  Voraussetzungenprüfung, eigener Auftraggeber, volles beziehungsweise
  fehlendes Handelswarenlager, ausdrückliche Abgabe und einmalige Belohnung.
- Parallele Aufträge: Levelgrenzen 1/2/7, eindeutige Einzelaktionen,
  unveränderte Altaufgabe, zusätzliche Fortschritte über Neustart,
  gesonderte Erkundungsfortschritte, keine Wiederverwendung von Abbaumengen,
  getrennte Rundreisepassagiere bei Abbruch und Umladung.
- Levelaufstieg: tatsächliches Ereignis einschließlich Mehrfachaufstieg,
  keine automatisch vergebene Lizenz, nur vorhandene Lizenzen 2–6.
- Bestehende Story-, Produktions-, Eigentums-, Logistik-, Bau-, Netzwerk-
  und Bevölkerungstests dienen der Regression.

## Browserabnahme

Wiederholbar mit einem isolierten Entwicklungsserver:

```powershell
$env:PORT='3014'
$env:DB_FILE=':memory:'
$env:WORLD_PROFILE='homeworld'
$env:DEV_TOOLS='1'
node server/index.js
# Separates Terminal; Playwright muss lokal verfügbar sein:
node scripts/verify-prd14.mjs
```

Testseite `/dev/prd14.html`; das Testskript fängt Clientbefehle ab.
Es verändert keine regulären Spielstände. Ergebnisse: [browser.json](browser.json).
Edge wurde bei **1440 × 900** und **390 × 844** geprüft, ohne JavaScriptfehler
oder horizontales Überlaufen der Seite. Breite Tabellen bleiben in ihrem
eigenen Bereich seitlich scrollbar; lange Panels und der Questkasten sind
vertikal scrollbar. Das Levelpopup bleibt vollständig im kleinen Viewport
bedienbar und öffnet sich nach Schließen und normalem Neuzeichnen nicht erneut.

| Ansicht | Desktop | Mobil |
| --- | --- | --- |
| Wohnhaus und Ausbau | [Bild](housing-1440.png) | [Bild](housing-390.png) |
| Normales Wohnviertel | [Bild](infrastructure-1440.png) | [Bild](infrastructure-390.png) |
| Wirtschaft und Questauswahl | [Bild](economy-1440.png) | [Bild](economy-390.png) |
| Bezahlter lokaler Absatz | [Bild](sales-1440.png) | [Bild](sales-390.png) |
| Rohstofffilter | [Bild](places-1440.png) | [Bild](places-390.png) |
| Levelpopup | [Bild](level-up-1440.png) | [Bild](level-up-390.png) |

Grafiken und verwendete Prompts: [housing-prompts.md](housing-prompts.md).
Die Ausgaben des integrierten ImageGen-Werkzeugs liegen als `housing-1.png`,
`housing-2.png` und `housing-3.png` unter `client/assets/art/cities/`.

## Während der Abnahme korrigierte Prüfungen

- `npm ci` versuchte einen nativen SQLite-Neubau, der wegen fehlender
  lokaler Spectre-Bibliotheken scheiterte. Auch die vorhandene Node-20-
  Alternative half nicht und ist für SQLite 13 zu alt. Die mitgelieferte
  Binärdatei funktioniert unter Node 24 mit `--ignore-scripts`.
- Ein alter Test erwartete unbedingten Verbrauch bei vollem Handelslager;
  er prüft jetzt die ausdrücklich beauftragte, lagerunabhängige Questabgabe.
- Eine weitere alte Erwartung setzte preis- und budgetunabhängigen
  zivilen Verbrauch voraus. Sie prüft nun die unveränderte Grundbedarfsrate
  und die tatsächlich bezahlte, budgetbegrenzte Warenentnahme getrennt.
- Die Versorgung für Ausbildungsbetrieb wird wie bei normalen Planeten
  anhand des vorhandenen Grundbedarfs bewertet. Ein erster Ansatz, der sie
  an zusätzliche preisabhängige Nachfrage band, wurde durch die bestehenden
  Ausbildungsregressionen erkannt und korrigiert.
- Neue Testfixtures wurden hinsichtlich bereits bekannter Ziele,
  Fehlertextschreibung und tatsächlicher Abbauausrüstung berichtigt.
- Die Browserprüfung wählt Nebenquests in der normalen Weltraumansicht;
  der Questkasten ist in der Planetenansicht weiterhin regulär verborgen.
  Stadtscreenshots warten auf Laden und Fokuswechsel und zeichnen den
  endgültigen Kamerastand vor der Aufnahme.

Weitere Randprüfungen: Heimatpreisregler unterstützen die dortigen allgemeinen
Lagerrollen für zivile Waren, alte Hotelspielstände initialisieren echte
Gästeverwaltung ohne Datenmigration, und besuchte beziehungsweise nicht mehr
erfüllbare Erkundungsangebote werden anhand des persönlichen Fortschritts
ausgeblendet. Auf schmalen Geräten bleibt der Questkasten bei geöffneten
Ortsdetails in der linken Spalte, sodass beide unabhängig scrollbar sind.
