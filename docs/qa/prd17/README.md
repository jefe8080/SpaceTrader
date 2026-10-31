# PRD 17 – Abnahme

## Automatisierte Prüfung

- `npm test`: 447 Tests bestanden, keine Fehler (siehe tests.txt).
- Neue Tests decken Werftkosten und 600 Sekunden, gleiche Größen, zwei Plätze, zwölf Ausgabeplätze, getrennte Zuteilung, Wiederladen während/nach Ausbau, alte Aufträge, Kontenmigration ohne Auszahlung sowie erhaltene Reisegeldbestände ab.
- Verbrauch geprüft an klassischen Planeten, Spezialwelten und Orbitalhotels, ergänzt durch Preis-/Reserventests und unveränderte Produktions-/NPC-Regressionen.
- Tourismus: 28 Cr je neuer Abreise, Teilen und Transfer, unbezahltes Ziel, teilweise Auszahlung, Weitertransport ohne erneute Förderung, Heimkehr und spätere neue Reise.
- Abfangen: Standardhaltung, eigene und verbündete Schiffe, deaktiviertes Bündnis, Schutzmodul, andere Haltungen, Reparatur und militärische Gruppenführer.

## Browserabnahme

Lokale isolierte In-Memory-Testwelt auf Port 3017, Einstieg /dev/prd17.html bei DEV_TOOLS=1. Browser über die Browserwerkzeuge geprüft. Die Fixture verwendet kontrollierte Spieldaten und fängt Befehle ab; die tatsächliche Serverausführung wird durch die Node-Tests geprüft.

- 1440×900, 390×844 und 844×390 geprüft. Kategorien und Almanachdetails starten geschlossen, Öffnungszustände überleben Aktualisierung.
- Alle 39 Schiffstypen genau einmal, drei Kategorien. Bauaktion sendet homeOrbitalBuild mit Ziel und gewähltem Typ.
- Almanachmaterial auch bei Fraktionsschiffen aus d.build; Spezialfähigkeiten außen, Bergbau und Kampfdetails innen. Schmaler Almanach ohne horizontalen Überlauf (317 px Inhalt und Scrollbreite).
- Rathaus: Welten und Expeditionen gemeinsam sowie separater Warpbereich; beide unabhängig geschlossen und geöffnet geprüft.
- Drei Wohnhausstufen neben Nachbarn in Übersicht und Fokus geprüft; Gebäude sind kleiner, höhere Stufen bleiben größer. Auswahlboxen verwenden dieselben Abmessungen wie die Darstellung.
- Dezent gefüllter Abfangkreis in der Sektoransicht, korrekte vergrößerte Kontur in Systemansicht; Hoverende entfernt ihn. Einheitenberechtigung und Bündniszustände werden serverseitig getestet.
- Keine Browser-Konsolenfehler. Screenshots in diesem Verzeichnis dokumentieren die Ansichten.

## Integrationshinweise

Protokollversion 8 erfordert einen Neustart laufender Spielserver und Neuladen der Oberfläche. Alte Konsumkonten werden ohne Auszahlung verworfen; bestehende Reisegeldbestände bleiben unverändert. NPC-Beschaffungskonten bleiben bestehen.
