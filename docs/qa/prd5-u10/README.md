# U10 – physische Module und Werften

Alle 210 Tests erfolgreich. Neun neue Modultests und sechs Werfttests prüfen:

- Konkrete Zutaten und 60/90/120-s-Fertigung für alle sechs Module; ein Auftrag
  je geeigneter Anlage, tatsächliche Energie-/Personalzuordnung und Pausen.
- Gebundene Zutaten und reservierter normaler Lagerraum für das fertige Exemplar.
- Verpackte Module belegen 30 normale Frachteinheiten mit geschirmtem Überlauf,
  erzeugen verpackt aber keine Kammern oder Abbau-/Sensorfähigkeiten.
- Vorhandene Exemplare wechseln zwischen Lager, Fracht und Einbau. Ausbau zahlt
  nichts aus und prüft Gefahrgut/Passagiere sowie die verbleibende Gesamtkapazität.
  Auch eingebaute Module dürfen den gesamten Einbauraum des Rumpfs nicht überschreiten.
- Studium verbraucht ein vorhandenes Exemplar, pausiert bei fehlendem Betrieb
  und schaltet einen persönlichen Bauplan frei. Spielerhandel besitzt Gegenkonten
  und Lagerrechte; ein gekauftes Exemplar kann tatsächlich studiert werden.
- Reguläre und Fraktionswerften bauen mit `buildMaterials(type)` und den
  bestehenden Klassenzeiten. Ein bezahlter Auftrag erzeugt keine fehlenden Teile.
  Fertige Rümpfe haben eindeutige IDs, endliche Bestände und Vorkaufsfristen.
- Der Ursprung hat genau einen registrierten öffentlichen Einstiegs-Spatz mit
  dokumentierter Tankfüllung. Später gebaute Schiffe erhalten keinen Gratis-Tank.
- Schiffsankauf benötigt tatsächliches Geld und erhält Rumpf, Module, Upgrades
  und Tankfüllung im Wiederverkaufsbestand. Kauf leert das jeweilige Angebot.
- Neustarts erhalten Module, Ausgabereserven, gebundene Materialien, Rumpf-ID
  und Restzeiten. Abgeschaltete Zeit erzeugt keinen Fortschritt oder neue Hilfen.

Die Registrierung einmaliger fortgeschrittener Studienfunde gehört zu den
Questzweigen U14; Orbitalringe ebenfalls U14. Fraktionswährungsumstellung folgt
unmittelbar U11. Die Fertigungs-/Handels-/Studienmechanik ist bereits vollständig
mit tatsächlich vorhandenen Exemplaren nutzbar.

Die Seed-42-Einstiegssimulation bleibt erfolgreich: H06 bei 1.997 s,
101 Einwohner, zwei Frachter und 8.052 Cr. Finale Balance folgt U17.

Browserprüfung auf localhost:3009 mit frisch simulierter Welt. Nur für die
Bedienprüfung wurden zusätzlich 20 Glas, zehn Kunststoff, zehn Textilien und
zehn Hydrauliköl in diese isolierte QA-Welt gelegt. Die Werkbank selbst wurde
über den regulären Bauauftrag mit Credits/Material gebaut. Dies ist ausdrücklich
kein Nachweis für die vollständige Rohstoffkette oder die finale Balance.

`module-workbench.png`: Fertigung einer Geschirmten Kammer aus acht Platten,
vier Glas und zwei Hydrauliköl über die Oberfläche. Nach 60 Serversekunden
ein Exemplar im Lager, dann Laden → Fracht → Einbau (`module-installed.png`)
→ Ausbau ins Lager (`module-returned.png`). Genau ein Exemplar, keine Erstattung.
Keine Browserfehler. Übergangsgeometrie wird in U16 durch den freigegebenen
gezeichneten Stil vervollständigt.
