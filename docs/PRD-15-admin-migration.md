# PRD 15: Verwaltungsplaneten und Bestandswelt korrigieren

## Ziel und bestätigter Umfang

Bestehende und neue Verwaltungsplaneten erfüllen PRD 15, Abschnitt 10.2.
Die bestätigte Planung ersetzt das nicht verfügbare `grillme`.

- Planetenname um „Verwaltungszentrum der <Fraktion>“ ergänzen; IDs erhalten.
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
- [ ] Migration und gemeinsame Handels-/Versorgungsregeln implementiert.
- [ ] Regressionstests und vollständige Tests bestanden.
- [ ] Bestandsweltkopie migriert, simuliert und erneut geladen; keine Doppelvergütung.

## Abnahmekriterien

1. Alle Verwaltungszentren sind eindeutig benannt, IDs bleiben stabil.
2. Andere Waren können weder manuell noch per Route regulär verkauft werden.
3. Wasser/Nahrung nutzen Versorgung und Pool; Mengen, Preislimit, Feindschaft,
   voller Puffer und unzureichender Pool werden ohne Warenverlust berücksichtigt.
4. Alter Warenbestand wird genau einmal umgewandelt, Grundversorgung erhalten.
5. Neustart wiederholt weder Namenszusatz noch Vergütung; alte Produktion bleibt aus.
6. Quest-/Beutewege und übrige Märkte funktionieren weiterhin.
7. Bestandsprüfung verändert die Originalwelt nicht. Live-Neustart erfolgt erst
   nach erfolgreicher Prüfung und mit gesichertem Originalstand.
