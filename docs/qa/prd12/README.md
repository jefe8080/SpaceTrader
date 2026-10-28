# PRD 12 – Prüfprotokoll

Geprüft am 28.10.2026 mit einer isolierten In-Memory-Welt und der
Testansicht `/dev/prd12.html`. Die Testansicht verwendet das echte
Anwendungs-DOM, die produktiven UI-Module und den Stadt-Renderer.
Sie ist nur am Entwicklungsserver mit `DEV_TOOLS=1` erreichbar.

## Automatische Prüfungen

- Gesamte Testsuite: 364 Tests erfolgreich, keine Fehler.
- PRD-12-Tests: stabile Questauswahl, Umlauf und Abschluss-Fallback;
  geschützte Reserven und rezeptgebundene Waren; Bestandsgrenzen;
  Stillstandsgründe und Pausenvorrang; Sollbedarf trotz Zutatenstillstand;
  Ausschluss pausierter Anlagen und Baustellen; Einsatzgrenze und
  Qualifikationen; getrennte Lager einschließlich Modulen und Ausgabeplätzen;
  Übertragung herkömmlicher Fabrikzustände.
- Bestehende Logistik-, Bau-, Produktions-, Spezialisierungs-, Quest- und
  Kameratests sind Teil der Gesamtsuite.
- Syntaxprüfungen der geänderten Browsermodule und `git diff --check` erfolgreich.

## Browserprüfung

- Hauptquest H02 → H03 mit korrektem Text und Position 2/3; Abschluss
  von H03 setzt die Anzeige auf H02 und 1/2 zurück.
- Geöffnetes Wasserwerk: Bedarf 2 Eis, nutzbarer Bestand 1 rot;
  Produktbestand 10 grün. Nach Bestandswechsel ohne Schließen:
  Eis 9 grün und Wasser 0 rot.
- Qualifikationsmangel 17/12 und 2/0 rot trotz ausreichender Gesamtzahl
  39/60. Strom 120/100 rot; 100/100 ohne Warnfarbe.
- Fehlende Bestands-, Kapazitäts- und Versorgungsdaten erscheinen als
  „—“; unbekannte Bestände erhalten keine Mangelbewertung.
- Zutatenstillstand zeigt „???“, manuelle Pause trotz Zutatenmangel „Zzz“;
  bei Stromstillstand verschwindet die Blase. Blasen bewegen sich und
  bleiben bei Fokusfahrten am sichtbaren Gebäude. Die Anzeige wird auf
  Canvas gezeichnet und nimmt keine eigenen Klicks entgegen.
- Breite Ansicht 1280×720 und schmale Ansicht 390×844 geprüft:
  Übersicht ohne horizontalen Überlauf; Planetensteuerung bleibt frei.
  Beim Gebäudefokus bleibt die Blase unterhalb der Kopfbereiche sichtbar.
- Belege: `paused-wide.jpg`, `ingredients-narrow.jpg`.

Die Browserprüfung nutzt kontrollierte Zustandswechsel für reproduzierbare
Darstellungsfälle. Wirtschaftsabläufe und paralleler Questfortschritt werden
zusätzlich durch die serverseitige Testsuite geprüft.
