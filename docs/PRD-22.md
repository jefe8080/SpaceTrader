# PRD 22 – Persönliche Kampfstatistik und Historie

## Ziel und vereinbarter Umfang
Im Pilotenprofil-Dropdown öffnet „Kampfstatistiken & Historie“ ein eigenes Fenster. Erfasst werden abgeschlossene Kämpfe mit eigenen Schiffen, einschließlich Offline-Angriffen und Unterstützung Verbündeter. Keine fremden Schlachten.

Die letzten 500 Berichte bleiben dauerhaft am Spieler gespeichert. Davon unabhängig zählen Gesamtstatistiken ab Einführung weiter: Kämpfe, Siege, Niederlagen, Unentschieden, eigene und gegnerische zerstörte Schiffe, verlorene und erbeutete Schiffe, Gefangennahmen, Rückzüge und Warenbeute. „Gewonnene Kämpfe“ im Profil nutzt denselben Zähler.

Berichte enthalten Spielzeit, reales Abschlussdatum, Dauer, Kampfart, Ort/Sektor/Koordinaten und gegebenenfalls Planet, Ergebnis/Endgrund sowie beide Seiten mit Besitzern, Fraktionen, Schiffsnamen/-typen und Ausgang. Die Identität wird zum Kampfzeitpunkt festgehalten. Verluste unterscheiden Zerstörung, Übernahme und Gefangenschaft.

Vorhandene Altberichte bleiben als unvollständig gekennzeichnet und zählen nicht in die neuen Summen. Fehlende Werte werden nicht erfunden. Bereits entfernte Berichte sind nicht rekonstruierbar.

Historienbereich und einzelne Berichte sind beim Öffnen eingeklappt. Neueste Berichte zuerst, 25 pro Seite, Suche nach Teilnehmer/Schiff/Ort und Ergebnisfilter. Keine taktische Wiederholung oder Kartenaktion.

## Umsetzung und Abnahme
- [ ] U1: Abschluss-Snapshots, persistente 500-Berichte-Grenze und dauerhafte Summen implementieren. Daten vor Zerstörung/Besitzwechsel sichern; Altberichte unverändert erhalten. Automatisierte Tests für Ergebnisse, Verluste, Unterstützung, Limit, Altbestand und Persistenz.
- [ ] U2: Persönliche Daten an Client übertragen; Profilzähler anbinden; zugängliches Fenster mit Statistik, eingeklappter Historie, Suche, Filter und Pagination erstellen. Leere und unvollständige Daten verständlich anzeigen.
- [ ] U3: Gesamttests und Oberflächenprüfung, Fehler korrigieren und Ergebnis dokumentieren.

## Prüfprotokoll
Planung durch Grilling abgeschlossen und vom Nutzer bestätigt. Noch keine Umsetzung.
