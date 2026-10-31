# PRD 15: Verwaltungsplaneten und Bestandswelt korrigieren

## Ziel und bestätigter Umfang

Bestehende und neue Verwaltungsplaneten erfüllen PRD 15, Abschnitt 10.2.
Die bestätigte Planung ersetzt das nicht verfügbare `grillme`.

- Planetenname um „Verwaltungszentrum (<Fraktion>)“ ergänzen; IDs erhalten.
- Regulärer Handel (manuell und Route) kauft ausschließlich Wasser/Nahrung
  zum regulären Bestpreis, aus dem Fraktionspool und in denselben Versorgungspuffer.
- Feindliche Lieferungen erfolgen nur ausdrücklich als unbezahlte Abgabe.
- Quest-, Geschenk- und Beutewege bleiben bestehen.
- Vorhandene andere Waren einmalig zum Bestpreis (Feingold: Goldkurs) in den
  Fraktionspool umwandeln; Pooldeckel beachten. Wasser/Nahrung erhalten,
  auch wenn Altbestände den Puffer überschreiten; keine weitere Annahme bis Platz frei ist.
- Alte Planetenproduktion und allgemeiner Handel dürfen keine Waren nacherzeugen.
- Originalwelt vor Übernahme sichern; Migration zuerst auf Datenbankkopie prüfen.

## Schritte und Fortschritt

- [x] Planung dokumentiert.
- [x] Migration und gemeinsame Handels-/Versorgungsregeln implementiert.
- [x] Regressionstests und vollständige Tests bestanden (428/428).
- [x] Bestandsweltkopie migriert, simuliert und erneut geladen; keine Doppelvergütung.
- [x] Lokalen Originalstand nach Backup und Prüfung auf laufende Server migriert
  und erneut geladen; 3 Spieler, 3 Schiffe und alle bestehenden IDs erhalten.

## Abnahmekriterien

1. Alle Verwaltungszentren sind eindeutig benannt, IDs bleiben stabil.
2. Andere Waren können weder manuell noch per Route regulär verkauft werden.
3. Wasser/Nahrung nutzen Versorgung und Pool; Mengen, Preislimit, Feindschaft,
   voller Puffer und unzureichender Pool werden ohne Warenverlust berücksichtigt.
4. Alter Warenbestand wird genau einmal umgewandelt, Grundversorgung erhalten.
5. Neustart wiederholt weder Namenszusatz noch Vergütung; alte Produktion bleibt aus.
6. Quest-/Beutewege und übrige Märkte funktionieren weiterhin.
7. Bestandsprüfung verändert die Originalwelt nicht. Übernahme erfolgt erst
   nach erfolgreicher Prüfung und mit gesichertem Originalstand.

## Prüfung und Übernahme am 31.10.2026

- `npm test`: 428 Tests erfolgreich; `git diff --check`: erfolgreich.
- Vier neue Regressionstests: wiederholbare Migration/Neustart, manuelle und
  Routen-Handelsaufrufe, Feindschaft/Beute/Pooldeckel sowie Questabgaben.
- Beide Weltkopien nach Migration erneut geladen; 60 Sekunden simuliert.
- Originalbackup: `data/backups/before-admin-market-migration-2026-10-31.db`.
- Kein Spielserverprozess und kein Listener auf 3000/3001/3015 gefunden.
- `data/world-v5/spacetrader.db` ohne Zeitsimulation migriert und erneut geladen.
- Umgewandelter Altbestand: Tech 56.336 Cr, Syndikat 24.580 Cr, Liga 38.026 Cr
  zusätzlich zum jeweiligen Startpool. Jeweils 150 Wasser und 150 Nahrung erhalten.
- Keine zusätzliche Vergütung beim erneuten Laden. Server wurde nicht gestartet.
