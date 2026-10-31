# PRD 16: Planetenansicht, Schiffsinformationen und Kampfkomfort

## Ziel und Freigabestand

Die Planetenansicht erhält passende aktuelle Grafiken, korrekt platzierte
Bauplätze und besser bedienbare Informationen. Schiffe werden im Almanach und
Baumenü vergleichbar. Erklärungen beschreiben die tatsächlichen Funktionen;
Produktionsrezepte werden durch eigene Gebäude freigeschaltet. Fehler bei
Rathauseinträgen und ziviler Finanzierung werden behoben. Angriffe werden
angekündigt und Schlachten laufen sichtbar langsamer ab.

Am 31.10.2026 mit dem Skill `grilling` in Q1–Q13 abgestimmt. Zunächst war
nur die Planung freigegeben. Der anschließende Auftrag „bitte setze prd 16 um“
hat die Umsetzung ausdrücklich freigegeben. Alle zehn Pakete sind umgesetzt
und geprüft; die Nutzerkorrektur zum gezeichneten Grafikstil ist berücksichtigt.

## 1. Grafiken und Ausrichtung der Planetenansicht

- Kleine und große Weltraumaufzüge erhalten neue, klar unterscheidbare Designs
  im bisherigen Sci-Fi-Comic-Fantasy-Stil. Ihr Wiedererkennungswert bleibt erhalten.
- Alle acht neuen Basisschiffe aus PRD 15 erhalten neue Designs: Falke, Keiler,
  Hornissenstaffel, Wespenstaffel, Habicht, Sperber, Greif und Bastion.
  Silhouette und Gestaltung vermitteln Größenklasse und Rolle; vorhandene
  Fraktionsmerkmale bleiben erkennbar. Die bestehenden 18 Fraktionsschiffgrafiken
  bleiben erhalten.
- Auf Ruinenplaneten werden die Vierergruppen der Bauplätze an die tatsächlich
  gemalten Flächen angepasst. Darstellung, Auswahlflächen und Gebäudepositionen
  müssen übereinstimmen; alle 48 Bauplätze bleiben erreichbar.
- Das Bild der planetaren Ansicht wird nach oben etwas erweitert, damit das
  Wasserwerk besser sichtbar ist. Bestehende Bildbereiche werden nicht verzerrt;
  Koordinaten, Kamera und Auswahlflächen werden konsistent angepasst.
- Neue Grafiken sind in allen betroffenen Ansichten und Erklärungen konsistent
  einzubinden, ohne alte 3D-Stadtvorschauen als Ersatz zu verwenden.

Abnahme: Kleine und große Aufzüge sowie die acht Schiffe sind visuell geprüft.
Alle Bauplatzgruppen passen auch bei Zoom und unterschiedlichen Fenstergrößen
zum Hintergrund. Wasserwerk und dessen Auswahlfläche sind vollständig nutzbar.

## 2. Planeteninformationen und Bedienung

- Beim Anklicken eines Planeten im Weltraum entfällt die Produktionsstatistik
  mit „produziert“, „verbraucht“, „angeliefert“ und „abgeholt“. Die Übersicht der
  Warenfüllstände bleibt bestehen.
- Abgeholte und abgeschlossene Objekteinträge, insbesondere Forschungsarchive
  beziehungsweise Forschungsfunde, verschwinden wieder aus dem Rathaus.
  Noch offene oder abholbare Einträge bleiben verfügbar; Belohnungen dürfen
  nicht mehrfach vergeben werden.
- Das Wohnhaus zeigt Gesamtbevölkerung und gesamte Wohnkapazität des Planeten
  sowie den eigenen Beitrag zur Wohnkapazität. Es wird keine individuelle
  Hausbelegung erfunden; die Bevölkerung wird weiterhin planetenweit verwaltet.
- Das rechte scrollbare Informationsmenü nutzt wieder die verfügbare Höhe,
  insbesondere beim Rathaus. Die bestehende Begrenzung auf 38vh bei schmaleren
  Fenstern wird überprüft und durch ein bedienbares responsives Layout ersetzt.
  Inhalte und Bedienelemente müssen vollständig erreichbar bleiben.
- Im Zentrallager erhält jeder dieser Bereiche einen eigenen einklappbaren Pfeil:
  Warenübersicht „verfügbar / geschützt / zu / Abfluss“, einstellbare Lagerlimits,
  physische Module, Bevölkerung und Reisen, lokale Nachfrage und Preise.
  Diese Bereiche sind anfangs geschlossen. Automatische Aktualisierungen
  behalten den vom Nutzer gewählten Öffnungszustand bei.

Abnahme: Warenfüllstände sind unverändert zugänglich; entfernte Statistiken
erscheinen nicht mehr in der Weltraum-Planeteninformation. Abgeholte Funde
verschwinden auch nach erneutem Öffnen und Laden. Wohnhauswerte entsprechen dem
Spielzustand. Menüs und Akkordeons bleiben bei Aktualisierung und verschiedenen
Fensterhöhen bedienbar.

## 3. Schiffsalmanach und Orbitalring-Baumenü

- Der Almanach ergänzt für jedes Schiff Lebenspunkte, Schild, Panzerung sowie
  Schaden und Bewaffnung. Richtungsabhängige Panzerung, Schildsektoren und
  unterschiedliche Waffentypen werden verständlich dargestellt, soweit vorhanden.
  Werte stammen aus den tatsächlichen zentralen Schiff- und Kampfdaten.
- Das Schiffsbaumenü erhält drei Kategorien: Zivil, Multifunktion, Kriegsschiff.
- Innerhalb jeder Kategorie gilt zuerst S → M → L → XL, innerhalb derselben
  Größenklasse der aufsteigende Kaufpreis. Fraktionsschiffe mit Sonderklasse F
  werden anhand ihrer technischen Größenstufe einsortiert.
- Fraktionsschiffe erhalten eine Hinterlegung mit ihrer Fraktionsfarbe;
  Beschriftungen bleiben lesbar.
- Jedes Schiff zeigt Geschwindigkeit, Verteidigung, Frachtraum und Angriff
  als Bewertung von jeweils 1 bis 5. Der Vergleich gilt für die gesamte Flotte,
  nicht nur innerhalb einer Größenklasse. Verteidigung berücksichtigt Lebenspunkte,
  Schild und Panzerung; Angriff basiert auf der tatsächlichen Bewaffnung und
  ihrem Schadenspotenzial. Sonderwaffen werden nachvollziehbar berücksichtigt.
- Die konkrete Ableitung und Grenzwerte werden bei der Umsetzung zentral
  dokumentiert und gegen repräsentative Schiffe geprüft. Bewertungen dürfen
  keine zusätzlichen, vom Spielzustand unabhängigen Kampfwerte einführen.

Abnahme: Alle baubaren Schiffe erscheinen genau einmal in der richtigen Kategorie
und Größen-/Preisreihenfolge. Fraktionsfarben und vier Bewertungen sind sichtbar;
Almanachwerte stimmen mit den verwendeten Spielwerten überein.

## 4. Objekt-Erklärungen und Rezeptfreischaltung

- Alle Erklärungen beim ersten Anklicken von Objekten und Planeten werden
  inventarisiert und individuell überarbeitet. Eine kurze schlüssige Einführung
  erklärt Zweck und Besonderheiten. Darunter stehen die relevanten Rezepte,
  Voraussetzungen, Kosten, Ergebnisse, Aktionen und sonstigen Funktionsmerkmale.
- Wiederholte allgemeine Platzhaltertexte werden durch objektbezogene Inhalte
  ersetzt. Längere Einträge dürfen scrollen. Aktuelle Spielwerte werden möglichst
  aus den bestehenden Daten bezogen, damit Erklärung und Spiel übereinstimmen.
- Alte Vorschauen aus `/assets/models/*/preview.png` werden durch die aktuellen
  Grafiken der Planetenansicht beziehungsweise passende aktuelle Objektgrafiken
  ersetzt. Kein Objekt darf durch eine sachfremde Grafik erklärt werden.
- Die bisherige Rezeptentdeckung durch Erkundung wird für Produktionsgebäude
  durch Freischaltung beim Fertigstellen des eigenen Gebäudes ersetzt.
- Die Fertigstellung schaltet alle Rezepte des jeweiligen Gebäudetyps dauerhaft
  frei. Abriss nimmt diese Freischaltung nicht zurück. Bereits entdeckte Rezepte
  bleiben erhalten.
- Bestehende eigene Produktionsgebäude schalten beim Laden alter Spielstände
  ihre Rezepte nachträglich frei. Die Migration muss wiederholbar sein, ohne
  Freischaltungen zu verlieren oder zusätzliche Belohnungen auszulösen.
- Bereits vor dem Bau erklären die Popups Zutaten, Ergebnisse und Voraussetzungen
  vollständig. Sichtbarkeit der Erklärung ist von der Produktionsfreigabe getrennt;
  die Produktion wird erst mit Fertigstellung des Gebäudes freigeschaltet.

Abnahme: Jeder inventarisierte Eintrag hat eine passende aktuelle Grafik und
konkrete Erklärung. Neubau, Abriss, erneutes Laden und bestehende Spielstände
erfüllen die Rezeptregeln. Unfertige Gebäude erlauben keine vorzeitige Produktion.

## 5. Ziviles Budget untersuchen und korrigieren

- Reproduzieren, weshalb einzelne Planeten scheinbar kein ziviles Budget haben
  oder nach Erschöpfung kein Geld mehr erhalten. Ziviles Konsumbudget und
  Beschaffungskasse der NPC-Wirtschaft sind getrennt zu untersuchen.
- Insbesondere Bevölkerung, Versorgung, Beschäftigung, Einkommensberechnung,
  Budgetobergrenze, vorzeitige Rückgaben im Wirtschaftstick und Migration prüfen.
- Nullbudget kann in begründeten Zuständen korrekt sein. Die Korrektur muss die
  nachgewiesene Ursache beheben, statt pauschal unbegrenzt Geld zu vergeben.
- Verhalten bei ausgeschöpftem Budget, vorhandener Bevölkerung, fehlender
  Versorgung und alten Spielständen anhand reproduzierbarer Zustände prüfen.

Abnahme: Ursache und Korrektur sind dokumentiert. Berechtigte Planeten erhalten
nach den Wirtschaftsregeln wieder Einkommen; berechtigte Nullzustände bleiben
erklärbar. Wiederholte Ticks und Neustarts erzeugen weder dauerhafte unbegründete
Zahlungsunfähigkeit noch unkontrollierte Geldschöpfung.

## 6. Angriffswarnung und langsameres Schlachttempo

- Beim Beginn einer neuen feindlichen Schlacht gegen eigene Einheiten oder
  Planeten ertönt einmal ein Warnton und es erscheint ein schließbares Popup.
  Es zeigt Angreifer, Ort und betroffene eigene Einheiten beziehungsweise Planet
  sowie eine Aktion „Zur Schlacht“.
- Das Popup pausiert das Spiel nicht. Einzelne Schüsse und weitere beitretende
  Schiffe derselben Schlacht lösen keine neue Warnung aus. Gleichzeitige neue
  Angriffe bleiben zugänglich, ohne dass sich Popups gegenseitig verlieren.
- Der Ton verwendet das bestehende Audiosystem und beachtet Lautstärke und
  Stummschaltung. Die visuelle Warnung funktioniert auch bei deaktiviertem Ton.
- Die gesamte Kampfzeit läuft zunächst mit Faktor 0,5: Bewegung, Schussfolgen,
  Geschosse, Wartung beziehungsweise Regeneration und Rückzugsvorbereitung
  werden konsistent verlangsamt. Lebenspunkte, Waffenwerte und Kräfteverhältnisse
  bleiben unverändert. Eine längere Dauer durch mehr Lebenspunkte ist nicht Ziel.
- Die Verlangsamung gilt serverseitig für alle Teilnehmer und wirkt sich nicht
  auf normale Reisen oder die übrige Wirtschaft aus. Speichern und Laden darf
  den Zeitfaktor weder verlieren noch doppelt anwenden.
- Performance gesondert vergleichen: Eine kleinere simulierte Zeit pro Tick
  allein spart keine Rechenarbeit. Zusätzliche Optimierungen nur bei belegtem
  Bedarf und ohne Änderung der vereinbarten Kampfregeln.

Abnahme: Neue Angriffe erzeugen genau eine Warnung je Schlacht. Ton respektiert
Audioeinstellungen. Vergleichbare Kämpfe laufen ungefähr halb so schnell ab,
bei vergleichbarem Verlauf und Ergebnis in simulierter Kampfzeit. Rückzug,
Regeneration, Projektile und Neustart funktionieren konsistent. Performancewerte
werden dokumentiert; eine Verbesserung wird nicht ungeprüft behauptet.

## 7. Geplante Umsetzungspakete und Fortschritt

Umsetzung am 31.10.2026 durch „bitte setze prd 16 um“ freigegeben. Die bestehende
Planung mit `grilling` bleibt Grundlage. Für alle Pakete
werden passende Prüfungen vor jedem Umsetzungskommit ausgeführt und dieser
Fortschritt im selben Commit aktualisiert. Änderungen bleiben fachlich getrennt.

| Paket | Inhalt | Nachweis vor Abschluss | Status |
| --- | --- | --- | --- |
| P01 | Aufzug- und acht Schiffsdesigns | Nach Nutzerkorrektur: acht gemalte PNGs und zwei Aufzug-PNGs nach aktuellen Zivilschiff-/Stadtreferenzen; SVG-Rückfall unverändert | Erledigt |
| P02 | Ruinenbauplätze und Bild nach oben erweitern | Browser-Overlay aller Gruppen; 17 Stadt-/Kameratests; Originalbild unverändert, 128 px obere Fortsetzung | Erledigt |
| P03 | Planetenstatistik, Rathaus und Wohnhaus | Filter anhand persistierter Questzustände; Wohnwerte aus Planeten-/Gebäudedaten; Regressionstests | Erledigt |
| P04 | Panelhöhe und Zentrallager-Akkordeons | Verfügbare Höhe ab Menüleiste; fünf gewünschte geschlossene Bereiche; DOM-Patcher bewahrt Öffnungszustand | Erledigt |
| P05 | Schiffsalmanach, Kategorien, Farben und Ratings | 20 Tests: vollständige Kategorien, technische Größen, Staffel- und Sonderwaffenwerte, Orbitalregression | Erledigt |
| P06 | Individuelle Erklärungen und aktuelle Grafiken | Inventar aller 117 Einträge in PRD-16-object-guide-inventory.md; Daten-/Bilddateitest erfolgreich | Erledigt |
| P07 | Rezeptfreischaltung und Bestandsmigration | 13 Tests: Fertigstellung, vorher gesperrt, Abriss, Laden und wiederholte Migration ohne XP | Erledigt |
| P08 | Zivilbudget-Ursache und Korrektur | 17 Tests: Altkasse ohne Bevölkerungsfelder, Erschöpfung, Mangelversorgung, Obergrenzen, Nullbevölkerung und zwei echte Neustarts | Erledigt |
| P09 | Angriffspopup und Warnton | Verteidiger/Planet, getrennte Schlachten, Beitritt stumm; WebAudio-Test für Mute/Lautstärke; zwei Karten im Browser | Erledigt |
| P10 | Kampfzeitfaktor und Abschlussprüfung | Deterministischer Zustandsvergleich, Reload-äquivalente JSON-Runde, Raid-Regression und Benchmark | Erledigt |

## 8. Technische Ausgangspunkte und Grenzen

Die Planung basiert auf einer lesenden Prüfung. Relevante Ausgangspunkte sind
`client/js/planetCityScene.js`, `client/js/planetHomeCitySites.js`,
`client/js/ui/details.js`, `client/js/ui/homeworld.js`,
`client/js/ui/almanacShips.js`, `shared/object-guide.js`, `shared/ships.js`,
`shared/combat.js`, `server/real-economy.js`, `server/war/battle.js` und
`client/js/audio.js`. Vermutete Fehlerursachen sind noch keine bestätigten Befunde.

Nicht enthalten sind neue Schiffstypen, eine individuelle Bewohnerzuordnung,
eine neue Wirtschaftsordnung oder eine Erhöhung von Lebenspunkten zur
Kampfverlängerung. Push und Veröffentlichung benötigen eine separate Zustimmung.

## Umsetzung: zentrale Schiffsbewertungen (P05)

`shared/ship-comparison.js` definiert vier aufsteigende Untergrenzen pro
Bewertung: Tempo 90/150/230/300; Frachtraum 30/160/520/1800;
Verteidigung 500/1500/3500/7000; Angriff 1/60/150/350. Darunter gilt 1,
pro erreichter Grenze ein weiterer Punkt bis 5. Verteidigung ist Rumpf-LP
multipliziert mit dem Mittel der vier inversen Panzerungsfaktoren gegen
Durchschlag 0, plus Gesamtschild. Angriff ist die Summe aus Schaden ×
Schussfolge aller Waffen, bei Staffeln × voller Fluggerätezahl. Strahlen
verwenden ihre maximale Aufladung; Frontstrahl-/Belagerungsboni entsprechen
dem Kampfcode. Ionenwaffen und PD zählen mit ihrem echten Schaden; Störung,
Abfangwirkung, Feuerwinkel, Trefferchance und Munition werden nicht als
erfundener Zusatzschaden bewertet. Die Bewertung beschreibt Potenzial,
keine Siegwahrscheinlichkeit, und ändert keine Kampfwerte.

## Budgetbefund (P08)

Reproduzierbarer Kompatibilitätsfall: Ein alter Planet mit
`economy: {cash: 0}` wird von `ensureCash` bisher unverändert zurückgegeben.
Damit fehlt die Bevölkerung, `tickCivilMoney` kehrt früh zurück und zahlt
kein Einkommen; fehlende Buchungsfelder können zudem NaN erzeugen. Die
Migration ergänzt ausschließlich fehlende Bevölkerungs- und Kassenfelder.
Explizite Nullbevölkerung bleibt erhalten. Beschaffungs- und Konsumkasse
bleiben getrennt und unterliegen weiterhin ihren bisherigen Obergrenzen.
Der Regressionstest bildet diesen Altzustand nach; ein konkreter privater
Nutzerspielstand wurde dafür nicht verändert. Mangelversorgung erzeugt nach
bestehender Regel weiterhin vermindertes Einkommen, keine unbegrenzte Zuwendung.

## Kampfzeit und Performance (P10)

`tickBattles` übersetzt reale Spielzeit genau einmal mit `COMBAT.TIME_SCALE=0.5`
in taktische Zeit; `tickBattle` arbeitet ausschließlich in taktischer Zeit.
Der Faktor wird nicht in Spielständen gespeichert und kann beim Laden nicht
doppelt angewandt werden. Bewegung, Waffen, Geschosse, Regeneration,
Sprungvorbereitung und auch Plünderungsphasen verwenden dieselbe Uhr.
Deterministischer Test: 400 × 0,1 s verlangsamt = 400 × 0,05 s direkt,
mit identischen Einheiten-, Projektil- und Schadenszuständen.

Reproduzierbarer Microbenchmark: `node scripts/benchmark-prd16.js`, zwölf
Kreuzer, 400 Ticks, ein Aufwärmlauf und fünf Messungen. Median auf diesem
Rechner: Faktor 1: 102,19 ms; Faktor 0,5: 83,67 ms. Die simulierten Zeiträume
sind verschieden (40/20 s); dies belegt keine allgemeine Performanceverbesserung.
Für gleiche simulierte Zeit sind beim langsameren Tempo doppelt so viele
Ticks erforderlich. Keine zusätzlichen Optimierungen ohne belegten Bedarf.

## Grafiken (P01/P02)

Nach Nutzerkorrektur am 31.10.2026 verwenden Schiffe und Aufzüge gemalte
PNG-Illustrationen aus dem eingebauten ImageGen. Stilreferenzen sind die
aktuellen PNGs von Spatz/Lastesel und das Ruinenstadtgemälde. Die zuvor
erstellten SVG-Entwürfe wurden verworfen und die Rückfall-SVGs wiederhergestellt.
Promptset und endgültige Pfade stehen in `docs/art/prd16/painted-assets.json`.
Nur die acht beauftragten Basisschiff-PNGs und zwei Aufzüge wurden ersetzt; die
18 Fraktionsgrafiken bleiben unverändert. Die gemeinsame Galerie unter
`/dev/prd16-art.html` zeigt alle Designs und die 48 Bauplatzanker.

## Abschlussprüfung am 31.10.2026

- `npm test`: **437 Tests bestanden, 0 fehlgeschlagen**.
- `git diff --check`: erfolgreich.
- Isolierter Testserver: Port 3016, Datenbank `:memory:`, keine Änderung
  vorhandener Spielstände. Wiederholbare Browserfixture: `/dev/prd16.html`.
- Browserfixture bestätigt fünf unabhängige, anfangs geschlossene Lagerbereiche,
  erhaltene offene **und** geschlossene Zustände nach Aktualisierung, ausgeblendete
  geborgene Forschungsfunde sowie alle 39 baubaren Schiffe genau einmal in drei Kategorien.
- Sichtprüfung der Menüs bei 1600×1000, 390×844 und 844×390. Panelhöhe im
  schmalen Fenster 675 px, im flachen Fenster 236 px, jeweils bis 12 px vor
  dem unteren Rand; längere Inhalte bleiben scrollbar.
- Almanach: 39/39 Einträge mit Rumpf, benannten Schildsektoren, gerichteter
  Panzerung, Waffenarten und Ratings; keine Browserfehler in der Fixture.
- Zwei gleichzeitige Angriffskarten bleiben getrennt schließbar. WebAudio-Test
  prüft tatsächliche Oszillatorerzeugung, getrennte gleichzeitige Warnungen,
  Stummschaltung und die SFX-Lautstärke. Physischer Lautsprecherton wurde nicht
  unabhängig aufgenommen; die Audioansteuerung ist automatisiert geprüft.
- Finale Bildgalerie zeigt die tatsächlichen PNGs. Alle zehn Illustrationen
  visuell geprüft, Hornissenstaffel mit sechs und Wespenstaffel mit vier Fluggeräten.
  Die alte SVG-Vorschau ist ersetzt. Prompts und Pfade: `docs/art/prd16/painted-assets.json`.
- Kein Push und keine Veröffentlichung durchgeführt.
