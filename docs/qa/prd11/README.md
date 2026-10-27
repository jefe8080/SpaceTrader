# PRD 11 – Abnahme am 27.10.2026

## Ergebnis

Alle Umsetzungsschritte abgeschlossen. `npm test`: **356/356 bestanden**.
Vollständige Ausgabe: [tests.txt](tests.txt).
`node scripts/verify-prd11.mjs`: **bestanden**, keine Browser-JavaScriptfehler.
`git diff --check`: bestanden.

## Automatisierte Zustandsprüfungen

- Alle registrierten Stationen, Planeten und Felder haben einen Eintrag mit
  Text, Funktionspunkten und vorhandener Bilddatei.
- Gelesenstatus: validierte Schlüssel, idempotente Bestätigung, getrennte
  Spieler und persistentes Speichern/Laden, auch ohne vorbestehendes Feld.
- Tank: fertiggestellte öffentliche und Fraktionsbauten, Orbitalausgabe,
  laufende Aufträge, Altinventar, verwendete Schiffe und Wiederverkauf.
  Gemeinsame Inventarausgabe gilt auch für eigene und Konsortiumswerften.
- Queststellen: noch benötigte Archivstellen bleiben erhalten; das Ende der
  Freischaltquest entfernt keine Studienfundstelle. Bergung entfernt die
  Fundstelle und erhält physische Fracht. Erledigte Archive verschwinden;
  fremde Spielerobjekte bleiben erhalten. Weltindex, Andock- und manuelle
  Referenzen, direkte Befehle und Routenstopps werden bereinigt.
- Ein alter Spielstand wird zweimal geladen: volle Neubestände, unveränderte
  gebrauchte/aktive Schiffe, bereinigte abgeschlossene Archive und kein
  erneutes Erzeugen beim Aufdecken.
- Bestehende Relikt-, Quest-, Bau-, Handels-, Kamera- und Mehrspielertests
  sind Teil der vollständigen Suite.

## Browsernachweise

Die Prüfung verwendet einen separaten Server mit `DB_FILE=:memory:` und
Port 3011. Die UI-Testzustände sind gezielt vorbereitete Clientfixtures;
nach dem Login wird die Netzwerkverbindung getrennt. Persistenz und echte
Spielzustandsübergänge werden ergänzend in den serverseitigen Tests geprüft.
Kein vorhandener Spielstand wird verändert.

- [Erstkontakt, breite Ansicht](introduction-wide.png): „Verstanden“ führt
  direkt zum Objekt; erneute Auswahl öffnet keine Einführung. Hilfe öffnet
  denselben Katalogtext erneut.
- [Erstkontakt, 390 Pixel](introduction-narrow.png): lesbarer Text,
  erreichbare Bestätigung und kein horizontaler Überlauf.
- [Gebäudealmanach](almanac-buildings.png) und
  [Almanach bei 390 Pixel](almanac-narrow.png): aufklappbare Einträge mit
  gemeinsamen Bildern und Texten, kein horizontaler Überlauf.
- Gebäude-Erstkontakt am Landeplatz: Bestätigung öffnet unmittelbar das
  richtige Gebäudepanel; keine Bau- oder Handelsaktion.
- [Kleine Orbitalanlage](orbital-small.png),
  [große Orbitalanlage](orbital-large.png) und
  [gerenderte 3D-Ersatzdarstellung](orbital-fallback.png): Bodenplattform,
  Aufzugspfeiler und nach oben laufende Verbindungen; große Variante mit
  zusätzlicher Plattform. Die Weltraum-Außenansicht bleibt unverändert.
- [Schiffsfokus](fleet-focus.png): Doppelklick schließt Planetenansicht und
  Gebäudepanel, setzt Zoom 0,3 und verfolgt das gewählte Schiff. Geprüft mit
  gleichem/anderem Schiff, angedocktem/bewegtem Schiff sowie Ausgangszoom
  0,002, 0,03, 0,9 und 0,3. Das Schiff liegt nahe der Kameramitte. Ein laufender
  Taste-3-Kameraflug überschreibt den neuen Fokus nicht. Es werden keine
  Bewegungsbefehle gesendet.

Maschinenlesbares Ergebnis: [browser-results.json](browser-results.json).

## Während der Umsetzung korrigierte Prüfungen

Alte Tests erwarteten noch den leeren Tank, den Begriff „Rumpf“ und eine nach
Bergung weiterhin vorhandene Studienfundstelle. Diese Erwartungen wurden
entsprechend PRD 11 aktualisiert. Die Browserfixture berücksichtigt, dass der
Hub beim Heimatstart noch nicht entdeckt ist und der Almanach über das
Wissensmenü beziehungsweise Taste A geöffnet wird. Ein Vergleich wurde an
die durch CSS großgeschriebene Gebäudeüberschrift angepasst. Alle korrigierten
Prüfungen bestehen im abschließenden Lauf.

## Wiederholung

Server in PowerShell starten:

```powershell
$env:PORT='3011'
$env:DB_FILE=':memory:'
$env:WORLD_PROFILE='homeworld'
node server/index.js
```

In einem zweiten Terminal `npm test` und `node scripts/verify-prd11.mjs`
ausführen. Das Browserprüfskript benötigt Playwright und Microsoft Edge;
bei extern installiertem Playwright dessen Modulpfad über
`PLAYWRIGHT_MODULE` angeben. Eine abweichende Testserveradresse kann über
`PRD11_URL` gesetzt werden.
