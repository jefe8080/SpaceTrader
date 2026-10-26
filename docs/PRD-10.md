# PRD 10: Lagerausbau, sichere Handelsrouten und sichtbare Planetenentwicklung

## Ziel und Planungsstand

Die Lagerverwaltung eigener Ruinenwelten wird ausbaubar und direkt bedienbar.
Handelsrouten können ihre Beladung auf tatsächlich aufnehmbare Zielmengen
begrenzen. Der Wiederaufbau wird in der äußeren Planetenansicht sichtbar.
Leitstellen erhalten eine deutlich steilere Preiskurve; die zusätzliche
Flottenobergrenze durch die Pilotenlizenz entfällt.

Die Planung wurde mit dem Skill `grilling` in den Fragen Q1–Q21 abgestimmt
und am 26.10.2026 vollständig bestätigt. Beauftragt ist zunächst dieses PRD
einschließlich Commit. Die Umsetzung des Spielcodes erfolgt anschließend.
PRD 9 (Rathaus-Handel und Hub-Gleichgewicht) ist ein separates Arbeitspaket.

## Verbindlicher Umfang

### 1. Lagergebäude auf fünf Stufen ausbauen

Jedes Lagersilo und jedes Sicherheitslager ist einzeln bis Stufe 5 ausbaubar.
Upgrades benötigen keinen zusätzlichen Bauplatz. Bestehende Gebäude werden
als Stufe 1 behandelt. Während eines Upgrades bleibt die bisherige Kapazität
nutzbar; zusätzliche Kapazität und Betriebskosten gelten erst nach Abschluss.

Lagersilos liefern je Stufe 2.000 normale Lagerkapazität, insgesamt also
2.000 / 4.000 / 6.000 / 8.000 / 10.000. Strombedarf und Bedarf an einfachen
Arbeitskräften betragen jeweils 1 / 2 / 3 / 4 / 5.

| Zielstufe Silo | Credits | Barren | Bauzeit |
|---|---:|---:|---:|
| 2 | 6.000 | 20 | 60 s |
| 3 | 12.000 | 40 | 60 s |
| 4 | 24.000 | 80 | 60 s |
| 5 | 48.000 | 160 | 60 s |

Sicherheitslager liefern je Stufe 500 Gefahrstoffkapazität, insgesamt also
500 / 1.000 / 1.500 / 2.000 / 2.500. Strombedarf: 2 / 4 / 6 / 8 / 10;
Bedarf an Fachkräften: 2 / 2 / 3 / 4 / 5.

| Zielstufe Sicherheitslager | Credits | Platten | Elektronik | Bauzeit |
|---|---:|---:|---:|---:|
| 2 | 10.000 | 20 | 8 | 60 s |
| 3 | 20.000 | 40 | 16 | 60 s |
| 4 | 40.000 | 80 | 32 | 60 s |
| 5 | 80.000 | 160 | 64 | 60 s |

### 2. Leitstelle und Flottenbegrenzung

Der aktuelle Code verlangt für Leitstelle 1 → 2 noch 8.000 Cr; 20.000 Cr
werden als neuer Sollpreis eingeführt. Für 2 → 3 gelten 100.000 Cr,
danach verdoppelt sich der Creditpreis je Stufe: 200.000, 400.000 usw.
Vorhandene Materialkosten und Bauzeiten der Leitstellen-Upgrades bleiben
erhalten. Bereits gestartete Upgrades behalten ihre bezahlten Konditionen.

Die Leitstelle begrenzt weiterhin parallele Aufträge und bestimmt wie bisher
Netzreichweite und Auftragskapazität. Es entsteht keine neue Obergrenze für
den Besitz von Schiffen. Die bisherige Flottenobergrenze durch Pilotenlizenz
beziehungsweise Pilotenlevel wird in allen Erwerbswegen entfernt.
Andere Lizenzfunktionen, etwa erlaubte Schiffsklassen und Schiff-Upgrades,
bleiben erhalten. Eine grundsätzliche Bewertung des Pilotenlevels folgt später.

### 3. Eigene Gebäude auf Ruinenwelten abreißen

Selbst errichtete Bodengebäude und Produktionsanlagen können nach einer
Bestätigung sofort und ohne Erstattung der Bau- oder Upgradekosten entfernt
werden. Der Bauplatz wird wieder frei. Ursprüngliche Einrichtungen wie
Leitstelle, Zentrallager und Dock sowie Orbitalringe bleiben geschützt.

Abhängige Ausbauten müssen zuerst entfernt werden. Betroffene laufende
Bau- oder Produktionsaufträge müssen vorher beendet oder abgebrochen sein.
Vor der Bestätigung werden direkte Folgen wie weniger Strom, Wohnraum oder
Lagerkapazität angezeigt. Strom- und Wohnraumverluste dürfen eintreten.
Ein Lagerabriss wird blockiert, wenn der aktuelle Bestand die anschließend
verbleibende Kapazität seiner Lagerklasse übersteigen würde. Keine Ware wird
durch Abriss vernichtet; auch andere tatsächlich kapazitätsbelegende Bestände
müssen bei der Prüfung berücksichtigt werden.

### 4. Optionale Zielkapazitätsprüfung für Handelsrouten

Jede Route erhält die speicherbare Checkbox **„Nur bei Platz am Ziel kaufen“**.
Sie ist für neue und bestehende Routen zunächst ausgeschaltet. Eingeschaltet
begrenzt sie den Einkauf sowie das Beladen aus eigenen Lagern pro Rohstoff.

Vor dem Beladen werden ausschließlich spätere, für diesen Rohstoff
konfigurierte Abladeziele bis zur nächsten Rückkehr zum aktuellen Einkaufsstopp
geprüft. Es zählen die physisch freie Kapazität, das selbst gesetzte
Rohstofflimit und die laut Route tatsächlich erlaubte Ablademenge. Die
Lagerklasse der Ware ist zu beachten. Bereits geladene, für diese Ziele
bestimmte Ware und bereits eingeplante Lieferungen geschützter Routen
verringern den noch nutzbaren Platz.

Die aufnehmbaren Mengen verschiedener Ziele werden addiert. Derselbe Planet
darf pro Rohstoff nur einmal mit seiner verfügbaren Kapazität zählen, auch
wenn er mehrfach in der Route vorkommt. Unterschiedliche Rohstoffe dürfen
dieselbe gemeinsame Lagerkapazität ebenfalls nicht mehrfach verplanen.
Andere bestehende Kauf-, Zugriffs-, Budget- und Frachtgrenzen bleiben wirksam.

Ist kein Platz verfügbar, wird der Einkauf übersprungen und die Route fährt
weiter. Bei begrenztem Platz wird nur die passende Teilmenge geladen.
Beispiel: Zwei unterschiedliche Ziele können je 50 Erz aufnehmen: maximal
100 Erz. Zweimal derselbe Planet mit 50 freiem Platz: maximal 50 Erz.

Ein Einkauf reserviert den benötigten Zielplatz. Reservierungen gelten
schiffsübergreifend für geschützte Routen und werden bei Ablieferung,
Routenänderung oder Abbruch angepasst beziehungsweise freigegeben. Auch
Zuweisungsänderungen und das Ausschalten der Option dürfen keine verwaisten
oder doppelt gezählten Reservierungen hinterlassen. Nach Laden eines
Spielstands muss der konsistente Reservierungszustand wiederhergestellt sein.
Beispiel: Von 100 freiem Platz reserviert Route A bereits 80; Route B darf
höchstens weitere 20 dafür kaufen.

Die Prüfung garantiert Platz zum Einkaufszeitpunkt. Produktion und manuelle
Lieferungen können den tatsächlichen Bestand später verändern. Bei Ankunft
nicht abladbare Ware bleibt an Bord; es gibt keinen Warenverlust und keine
erzwungene Einlagerung über ein Limit hinaus.

### 5. Lagerregler direkt am Rohstoff

Im Zentrallager erhält jede Rohstoffzeile unmittelbar einen Slider für das
Lagerlimit und einen für die Sperrmenge, jeweils mit zusätzlichem Zahlenfeld.
Beide Werte sind unabhängig zwischen 0 und der passenden gesamten
Lagerkapazität einstellbar. Limit 0 verhindert weitere Einlagerung;
Sperrmenge 0 schützt keine Mindestmenge. Bestehende Reservierungs- und
Sperrregeln bleiben wirksam.

Eine Senkung des Limits unter den Bestand vernichtet keine Ware, sondern
verhindert weitere Einlagerung. Ist die Sperrmenge höher als das Lagerlimit,
erscheint ein verständlicher Hinweis. Gespeichert wird beim Loslassen des
Sliders beziehungsweise beim Bestätigen des Zahlenfelds. Live-Aktualisierungen
dürfen eine laufende Eingabe nicht überschreiben.

Ein gemeinsamer Slider mit Zahlenfeld setzt auf ausdrücklichen Klick auf
**„Anwenden“** die Lagerlimits aller Rohstoffe auf denselben Wert.
Vorher wird die Auswirkung angezeigt; Sperrmengen bleiben unverändert.
Pro Rohstoff bleibt die passende physische Lagerkapazität die Obergrenze.
Bestehende gespeicherte Werte werden bei der Einführung nicht zurückgesetzt.

### 6. Ausbau in der äußeren Planetenansicht zeigen

Nur die äußere Planetenansicht wird verändert. Stadtansicht und bebaubare
Oberfläche erhalten durch dieses PRD keine neue Darstellung.
Das Aussehen folgt dem aktuellen Ausbau und geht bei Abriss entsprechend
zurück. Kurzfristiger Strom- oder Personalmangel verändert die Stufe nicht.
Alle Spieler sehen denselben tatsächlichen Ausbauzustand.

Für Ruinenwelten gelten die folgenden Stufen; beide Voraussetzungen einer
Stufe müssen erfüllt sein, andernfalls gilt die höchste erfüllte niedrigere
Stufe. Gezählt werden fertiggestellte, nicht abgerissene Bodengebäude;
laufender Betrieb ist keine Voraussetzung.

| Erscheinung | Leitstelle | Gebäude |
|---|---:|---:|
| Ruinenwelt | Grundzustand | Grundzustand |
| Wiederaufbau | repariert, mindestens 1 | mindestens 4 |
| Entwickelte Welt | mindestens 2 | mindestens 12 |
| Metropole | mindestens 3 | mindestens 24 |

Die Bebauung wird zunehmend zusammenhängend und beleuchtet. Der kleine und
der große Orbitalring werden unabhängig davon entsprechend ihrem tatsächlich
fertiggestellten Bauzustand sichtbar. Die Darstellung muss gerade beim großen
Ring eine deutlich majestätische Gesamtwirkung erzeugen. Die vorhandenen
Bau- und Questvoraussetzungen der Ringe werden dadurch nicht geändert.

Andere bebaubare Planetentypen behalten ihre visuelle Identität und erhalten
dezente zusätzliche Bebauung und Beleuchtung in drei Stufen: Grundzustand,
ab 4 und ab 12 fertiggestellten Gebäuden. Unbebaubare Welten bleiben
unverändert. Die vorgesehenen Orbitalringe bleiben eine Besonderheit der
entsprechenden Ruinenwelt.

## Bestehende Spielstände und ausgeschlossener Umfang

Alle Änderungen funktionieren ohne Neustart. Bestehende Leitstellen bleiben
erhalten; es gibt keine nachträglichen Kosten oder Erstattungen. Die entfernte
Flottenobergrenze gilt sofort. Lagerwerte bleiben erhalten; vorhandene Silos
und Sicherheitslager erhalten Stufe 1. Die neue Routenoption startet aus.

Nicht enthalten sind eine allgemeine Überarbeitung des Pilotenlevels,
Änderungen an Lizenzfunktionen außerhalb der Schiffsanzahl, neue Ring-Bauregeln,
eine Neugestaltung der Planetenoberfläche und automatischer Abriss oder
automatisches Vernichten überschüssiger Waren.

## Umsetzungsschritte und Fortschritt

Jeder Schritt erhält passende Prüfungen und einen eigenen Commit; der
Fortschritt und die Prüfergebnisse werden im selben Commit hier ergänzt.

- [x] P0: Anforderungen mit grilling geklärt und vom Nutzer bestätigt;
  PRD mit Regeln, Schritten und Abnahmekriterien erstellt.
- [x] U1: Leitstellenpreise anpassen und Flottenobergrenze in sämtlichen
  Erwerbswegen und zugehörigen Anzeigen entfernen; übrige Lizenzregeln prüfen.
- [x] U2: Silo- und Sicherheitslager-Upgrades inklusive Kosten, Betrieb,
  Bauablauf, Bestandsmigration und Bedienung implementieren.
- [x] U3: Abriss eigener Bodengebäude mit Eigentumsschutz, Abhängigkeiten,
  Folgenvorschau und Schutz der Lagerbestände implementieren.
- [x] U4: Direkte Rohstoffregler und gemeinsame Limitänderung mit Vorschau
  implementieren; Eingabestabilität und Persistenz prüfen.
- [x] U5: Zielkapazitätsberechnung und schiffsübergreifende Reservierungen
  einschließlich Teilmengen, doppelter Ziele und Lebenszyklus implementieren.
- [x] U6: Routenoption in Oberfläche und Speicherung integrieren und den
  tatsächlichen Routenablauf einschließlich eigener Lager prüfen.
- [ ] U7: Äußere Planetenentwicklung und sichtbare tatsächliche Orbitalringe
  implementieren; alle Stufen visuell prüfen.
- [ ] U8: Zusammenspiel und bestehende Spielstände prüfen; Abnahmekriterien
  abschließend dokumentieren und PRD-Fortschritt vervollständigen.

## Abnahmekriterien

1. Beide Lagertypen lassen sich einzeln bis Stufe 5 mit exakt den festgelegten
   Kosten, Kapazitäten und Betriebsbedarfen ausbauen. Stufe 6 wird abgelehnt;
   fehlende Mittel, fremdes Eigentum und doppelte laufende Upgrades ebenso.
2. Während des Upgrades gilt die alte Kapazität, danach genau einmal die neue;
   Speichern und Laden verändert weder Kosten noch Kapazitätsbeiträge.
3. Leitstellen-Upgrades kosten 20.000 / 100.000 / 200.000 / 400.000 Cr usw.;
   Materialkosten, Bauzeiten und bereits laufende Projekte bleiben korrekt.
4. Ein Spieler kann die bisherige Lizenz-Flottenobergrenze bei sämtlichen
   Erwerbswegen überschreiten. Klassen- und Upgradeberechtigungen sowie die
   Auftrags- und Reichweitenregeln der Leitstelle bleiben wirksam.
5. Zulässiger Abriss verlangt eine Bestätigung, erstattet nichts und gibt den
   Bauplatz frei. Geschützte Einrichtungen, Abhängigkeiten und laufende
   Aufträge verhindern unzulässigen Abriss. Beide Lagerklassen verlieren
   beim Abriss keine Ware.
6. Rohstofflimits und Sperrmengen sind direkt per Slider und Zahl bedienbar,
   werden korrekt gespeichert und bleiben bei Live-Aktualisierungen editierbar.
   Nullwerte, Limit unter Bestand und Sperrmenge über Limit verhalten sich wie
   beschrieben. Die Sammeländerung zeigt eine Vorschau und verändert keine
   Sperrmengen.
7. Ohne Routenoption bleibt das bisherige Kaufverhalten erhalten. Mit Option
   werden Einkäufe und eigene Beladungen durch reale Zielkapazitäten,
   Rohstofflimits, Ablademengen und bereits geladene Ware begrenzt.
8. Zwei Ziele mit je 50 Platz erlauben 100 Einheiten; derselbe Planet an zwei
   Stopps mit 50 Platz erlaubt insgesamt höchstens 50. Fehlende geeignete
   Ziele erlauben keinen Einkauf; die Route fährt weiter.
9. Zwei geschützte Routen können dieselben 100 freien Einheiten gemeinsam
   höchstens einmal reservieren, auch bei gleichzeitiger Verarbeitung und
   mehreren Rohstoffen derselben Lagerklasse. Vorhandene 80 reservierte
   Einheiten lassen höchstens 20 weitere zu.
10. Ablieferung, Routenänderung, Abbruch und Änderung der Zuweisung oder Option
    hinterlassen keine verwaisten Reservierungen. Speichern und Laden erhält
    einen konsistenten Zustand. Später fehlender Zielplatz lässt Restfracht
    verlustfrei an Bord.
11. Ruinenwelten erreichen exakt die festgelegten Erscheinungsstufen und fallen
    bei Abriss zurück; Versorgungsunterbrechungen lassen sie unverändert.
    Fertige kleine und große Orbitalringe sind in der äußeren Ansicht erkennbar,
    insbesondere der große Ring prägt sichtbar die Gesamtwirkung.
12. Andere bebaubare Planetentypen zeigen die drei dezenten Ausbaustufen,
    behalten ihre Identität und sind für alle Spieler konsistent sichtbar.
    Unbebaubare Welten und die innere Oberflächendarstellung bleiben erhalten.
13. Ein bestehender Spielstand funktioniert ohne Reset, nachträgliche Zahlungen
    oder Verlust von Lagerwerten, Waren, Gebäuden oder laufenden Projekten.

## Validierung

P0: Planungsentscheidungen Q1–Q21 gegen das Dokument geprüft. Noch keine
Änderung am Spielcode und keine Umsetzungstests. Vor dem Planungscommit wird
`git diff --check` ausgeführt; es wird ausschließlich dieses PRD aufgenommen.

Für U1–U6 sind gezielte automatisierte Prüfungen der Spielregeln und der
Persistenz vorgesehen. Für die Lagerbedienung und U7 sind zusätzlich visuelle
Laufzeitprüfungen erforderlich. U8 prüft das Zusammenspiel und die relevante
Regressionstestsuite. Fehlgeschlagene oder nicht ausführbare Prüfungen werden
mit Ursache dokumentiert und dem Nutzer mitgeteilt.

U1: Leitstellenpreise angepasst; Erwerbswege und Anzeigen von der Lizenz-Schiffsanzahl entkoppelt. Klassen- und Upgradegrenzen bleiben bestehen. Gezielte Tests für Schiffe, Werften, Heimatbetrieb und Leitstellennetz ausgeführt. Bestehende Tests mit alten Sollpreisen bzw. Flottenlimit auf PRD 10 aktualisiert.

U2: Einzelne Lagerstufen 1–5, exakte Kosten, Bauteams, 60-s-Projekte und stufenabhängiger Betrieb implementiert. Altgebäude werden als Stufe 1 normalisiert. Neue Kapazität gilt erst nach Abschluss. 13 Tests (PRD 10 und Heimatbetrieb) bestanden, einschließlich Speichern/Laden, Fremdzugriff, fehlender Mittel und mehrfacher Fertigstellung.

U3: Bestätigter Abriss eigener Gebäude und abhängiger Ausbauten mit Folgenvorschau, ohne Erstattung. Schutz für ursprüngliche Einrichtungen, laufende Projekte, Antriebsarbeit und abhängige Industrie. Laufende Produktionszyklen müssen abgeschlossen oder durch Pausieren abgebrochen werden. Lagerprüfung berücksichtigt beide Klassen, Module und reservierte Modulausgaben. 15 gezielte Tests bestanden.

U4: Slider und Zahlenfelder je Rohstoff für Limit/Sperrmenge, Warnhinweis und gemeinsame Limitänderung mit Vorschau implementiert. Speicherung über bestehende Heimatdaten; keine Migration bestehender Werte. Eingaben bleiben durch den vorhandenen Fokus-Schutz gegen Live-Updates stabil. Einlagerung und Produktion beachten Null-/Teillimits. Gezielte Heimat-, Logistik- und PRD-10-Tests bestanden; visuelle Laufzeitprüfung folgt in U8.

U4-Prüfkorrektur: Der neue Sammellimit-Test erwartete Gefahrstoffkapazität vor dem ersten Betriebstick. Testvorbereitung korrigiert; anschließend alle 27 Heimat-, Logistik- und PRD-10-Tests bestanden. Der erste U4-Lauf hatte diesen einen Testfehler; der Commit erfolgte versehentlich vor dessen Korrektur.

U5: Zielplaner und persistierbare Reservierungen an Routenbefehlen implementiert, mit Neuabgleich aus vorhandener Fracht. Physischer Platz, Limits, Ablademengen, doppelte Planeten und gemeinsame Lagerklassen werden berücksichtigt. Fünf gezielte Tests bestanden (100/50-Beispiele, 80+20, gemischte Klassen, Änderungen/Abbruch und Rekonstruktion). Einbindung in den tatsächlichen Handel folgt in U6.

U6: Checkbox „Nur bei Platz am Ziel kaufen“ im Routeneditor und Routenkennzeichnung ergänzt; neue/alte Routen starten ohne Schutz. Reale Käufe und Eigentümerbeladungen verwenden die Zielplanung; nur tatsächlich geladene Mengen werden reserviert. Kommandoänderungen und Speichern/Laden gleichen Reservierungen ab. 21 gezielte Tests bestanden, darunter konkurrierende reale Beladungen, später volles Ziel ohne Frachtverlust und echter Datenbankneustart.
