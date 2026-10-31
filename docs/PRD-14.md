# PRD 14: Lokaler Absatz, Ortslisten, Touristen und Nebenquests

## Ziel und Planungsstand

Die planetare Wirtschaft wird nachvollziehbar: Lokaler Absatz erscheint
getrennt in der Statistik, Preisregler beeinflussen die lokale Nachfrage,
und das verfügbare sowie stündliche Konsumbudget wird sichtbar.
Ortslisten erfassen alle Planetentypen und Rohstofffelder. Touristen können
an geeigneten Standorten ausgeladen werden und erhalten andernorts eine
zutreffende Fehlermeldung. Wohnhäuser erhalten drei Ausbaustufen mit
passenden Hochhausgrafiken. Nebenquests funktionieren unabhängig von
vollen Handelslagern und werden entsprechend dem Pilotenlevel parallel
spielbar.

Die Planung wurde am 31.10.2026 mit `grill-me` / `grilling` in Q1–Q8
abgestimmt, einschließlich der Nutzerkorrekturen. Abschließend hat der
Nutzer den Auftrag ausdrücklich auf **PRD erstellen, nicht umsetzen**
begrenzt. Dieses Dokument wird angelegt und gemäß AGENTS.md separat
committet. Sämtliche Umsetzungsschritte bleiben offen. Es erfolgt kein
Push ohne Zustimmung.

## Verbindliche Anforderungen

Umsetzungsauftrag am 31.10.2026 erteilt: PRD 14 vollständig umsetzen,
schrittweise committen und anschließend ohne weitere Rückfrage auf
`master` pushen. Die früheren Beschränkungen auf den Planungsauftrag
sind damit für diese Umsetzung aufgehoben.

### 1. Lokalen planetaren Absatz getrennt erfassen

Die Statistik unterscheidet tatsächlichen lokalen Absatz von Produktion,
sonstigem Verbrauch, Anlieferung und Abholung. Für lokale Verkäufe werden
die verkaufte Warenmenge und die tatsächlich gutgeschriebenen Credits
je Ware mit Zeitpunkt erfasst. Eine Lieferung vom Schiff ist noch kein
lokaler Verkauf; Produktionszutaten und reine interne Umlagerungen
erzeugen keinen Verkaufserlös.

In der bestehenden Drei-Stunden-Statistik eines Spielerplaneten erscheinen
lokal verkaufte Mengen und Verkaufseinnahmen je Ware sowie die Summe der
lokalen Verkaufseinnahmen über alle Waren für genau dieses Zeitfenster.
Die Darstellung benennt Zeitraum und Einheit eindeutig. Steuern,
Questbelohnungen und sonstige Einnahmen gehören nicht in diese Summe.
Bestehende Verbrauchswerte dürfen weiterhin den gesamten tatsächlichen
Verbrauch zeigen; der gesonderte Absatz ist dann ausdrücklich als darin
enthalten gekennzeichnet und wird nicht nochmals aufaddiert.

Erfasst werden ausschließlich tatsächlich bezahlte Verkäufe. Reicht das
Budget nur für einen Teil, darf die Statistik keinen vollen Warenwert als
Einnahme ausweisen. Die Zählung bleibt nach Aktualisierung und Neuladen
konsistent und erzeugt keine zweite Kontogutschrift. Historische lokale
Verkäufe werden nicht aus bisherigen Gesamtverbrauchsdaten rekonstruiert;
die separate Erfassung beginnt mit Einführung der Funktion.

### 2. Preisabhängige Nachfrage und sichtbare Budgets

Auf gekauften beziehungsweise eigenen Planeten beeinflusst der vorhandene
Verkaufspreisregler wieder die lokale Nachfrage: Ein günstigerer Preis
erhöht die nachgefragte Menge, ein höherer senkt sie. Bei ausreichendem
Bestand und Budget muss diese Wirkung auch im tatsächlichen Verbrauch
nachweisbar sein. Die Oberfläche zeigt die dazu passende Nachfrage pro
Stunde; sie darf nicht weiterhin eine preisunabhängige Rate darstellen.

Die vorhandenen Preisgrenzen und die bestehende Berechnung für
preisabhängigen lokalen Verbrauch dienen als Grundlage. Vorhandener
Warenbestand, nutzbare Reserven und das tatsächliche Konsumbudget bleiben
wirksame Grenzen. Es entstehen keine Verkäufe ohne Ware und keine
fiktiven Erlöse für Betriebsmittel. Produktionszutaten werden weiterhin
nach Rezept und tatsächlichem Betrieb verbraucht, nicht durch den
Verkaufspreisregler.

In der Planetenwirtschaft werden mindestens diese Werte angezeigt:

- Verbleibendes ziviles Konsumbudget in Credits.
- Aktueller Budgetzufluss pro Stunde in Credits, aus der bestehenden
  Einkommensberechnung nach Steuern und unter den aktuellen
  Versorgungs-/Beschäftigungsbedingungen.
- Ein verständlicher Hinweis, wenn das Budget lokale Käufe begrenzt,
  statt einen vorhandenen Warenbestand als ausreichende Kaufgarantie
  erscheinen zu lassen.

Das zivile Konsumbudget ist vom allgemeinen Beschaffungs-/NPC-Geldbestand
zu unterscheiden; werden beide angezeigt, sind sie getrennt beschriftet.
Der Stundenwert ist ein aktueller Zufluss, kein versprochenes
Verkaufsvolumen. Bestehende Budgetobergrenzen bleiben erhalten.

Die gemeldete Verbrauchsstörung wird auch unabhängig vom Regler geprüft:
Besitzübernahme darf den vorgesehenen zivilen Verbrauch nicht unbegründet
abschalten. Ein tatsächlicher Stillstand muss anhand von Bestand,
Nachfrage, Betriebsbedingungen und Budget erklärbar sein.

### 3. Vollständige filterbare Ortslisten

Die bestehenden filterbaren Orts-/Handelslisten umfassen alle bekannten
Planetentypen einschließlich Ruinen-/Heimatwelten sowie Erz- und andere
Rohstofffelder. Die Auswahl darf nicht länger auf `planet` und `station`
beschränkt sein. Einzelne Planetentypen und Rohstofffelder lassen sich
gezielt filtern; Suchtext, Warenfilter und bestehende Filter bleiben
kombinierbar.

Rohstofffelder erscheinen passend zu ihrem Inhalt und ihrer Förderbarkeit.
Sie erhalten keine erfundenen Marktpreise oder Kauf-/Verkaufsaktionen;
vorhandene Navigation und Abbauaktionen werden verwendet. Ein Feld mit
passendem Rohstoff darf durch den Warenfilter nicht allein wegen eines
fehlenden Handelsmarkts verschwinden. Eigene Planeten dürfen nicht allein
aufgrund ihres Besitzstatus aus passenden Ergebnissen fallen.

Erkundungs- und Sichtbarkeitsregeln bleiben maßgeblich: Die Erweiterung
verrät keine noch unbekannten Standorte. Filterwechsel und Aktualisierungen
erhalten eine konsistente Auswahl.

### 4. Touristen: passende Aufnahme und konkrete Ablehnungsgründe

Touristen nutzen ausschließlich ausdrücklich vorgesehene Gästeplätze.
Freier Wohnraum wird nicht in touristische Kapazität umgewandelt.
Auf Paradieswelten gelten die vorhandene Grundkapazität und die tatsächlich
verfügbare Tourismuskapazität. Eigener Besitz allein verhindert die
Aufnahme nicht.

Bestehende Orbitalhotels werden als geeignete Tourismusstandorte unterstützt.
Ihr Objekttyp `station` darf die Passagierabgabe nicht pauschal ausschließen.
Sie benötigen eine echte Gästeverwaltung mit begrenzter Kapazität,
Aufenthalt und anschließender Abholbarkeit, entsprechend dem bestehenden
Besuchermodell. Touristen dürfen nicht als gewöhnliche Verbrauchsware
verschwinden. Die konkrete Kapazität wird bei der Umsetzung aus den
bestehenden Hotelwerten abgeleitet und sichtbar gemacht.

Auf anderen Planeten ohne touristische Gästeplätze, insbesondere der
Heimatwelt, erscheint ein konkreter Hinweis, zum Beispiel:
„Dieser Planet hat keine touristischen Gästeplätze. Touristen können auf
Paradieswelten und in Orbitalhotels untergebracht werden.“
„Keine Gästeplätze verfügbar: X / Y belegt“ ist nur bei einem geeigneten,
tatsächlich ausgelasteten Standort zulässig. Fehlende Andockung oder
Zugangsrechte werden ebenfalls zutreffend benannt. Nicht entladene
Personen bleiben unverändert an Bord.

Die Rückkehr von Touristen an ihren Ursprungsort ist von einem neuen
touristischen Aufenthalt zu unterscheiden. Bestehende Rückkehrregeln
werden nicht durch eine pauschale Beschränkung auf Paradieswelten
ausgehebelt.

Es wird **kein neues Hotel-/Gästehausgebäude** und keine neue
Tourismusspezialisierung für die Heimatwelt eingeführt.

### 5. Veraltete Upgradeanzeige entfernen

Beim Anklicken eines fremden Planeten in der normalen Weltraumansicht
entfallen Anzeigen und Aktionen des alten, nicht mehr verwendbaren
Besitz-/Ausbausystems. Auch verwandte Detailansichten dürfen keine
wirkungslosen alten Upgradeaktionen anbieten.

Questgeberlevel, gültige Spezialisierungen sowie der aktuelle Gebäude-
und Ruinenausbau bleiben funktionsfähig. Das Entfernen der alten Anzeige
ist keine Entfernung dieser aktiven Systeme und führt keinen neuen
Upgradepfad ein.

### 6. Wohnhäuser mit drei Ausbaustufen und passenden Grafiken

Wohnblöcke auf eigenen Planeten erhalten drei Stufen:

| Stufe | Wohnplätze insgesamt je Gebäude | Darstellung |
| --- | ---: | --- |
| 1 | 200 | Niedriger Wohnblock / kleines Hochhaus |
| 2 | 400 | Sichtbar höheres Hochhaus |
| 3 | 800 | Größtes Hochhaus der Reihe |

Die Werte sind Gesamtkapazitäten, keine jeweils zusätzlich gewährten
Wohnplätze. Stufe 1 entspricht dem heutigen Wohnblock. Jeder Ausbau
verursacht einmalig Credits und Baumaterial, benötigt Bauzeit und erhöht
den Strombedarf. Die Kosten und Anforderungen steigen mit der Stufe und
werden vor Beauftragung vollständig angezeigt. Die konkreten Ausbauwerte
werden im Umsetzungsschritt zusammen mit dem bestehenden Gebäudebalancing
festgelegt und hier dokumentiert; 200 / 400 / 800 Plätze sind verbindlich.

Ruinen-/Heimatweltstrukturen und die Infrastruktur normaler eigener
Planeten werden gleichermaßen unterstützt. Besitz, Zugangsrechte,
Bauzustand, Ressourcenprüfung und Stufengrenze werden serverseitig geprüft.
Wiederholte Befehle oder Neuladen dürfen Kosten und Kapazität nicht
mehrfach verbuchen. Die vorhandenen Bau-/Betriebsregeln gelten auch für
den Ausbau. Bestehende Wohnblöcke bleiben funktional auf Stufe 1, ohne
Bestandsdatenmigration oder veränderte Kapazität.

Für die drei Stufen werden zusammenpassende Rastergrafiken im vorhandenen
Fantasy-Sci-Fi-Comicstil erstellt und tatsächlich im Spiel eingebunden.
Perspektive, Konturen, Farbgebung und Bodenanschluss passen zur bestehenden
Planetenbebauung; Höhe und Silhouette machen die Stufe erkennbar.
Die Grafiken müssen auch bei üblichem Spielzoom lesbar bleiben.
Assets und verwendete Prompts werden im Projekt abgelegt. Grafikgenerierung
und Integration erfolgen erst während einer gesondert beauftragten Umsetzung.

### 7. Ausschließlich Nebenquests überarbeiten

Gemeint sind die an Planeten und Werften annehmbaren Nebenquests,
einschließlich der betroffenen Schmugglerangebote. Storyquests,
Hauptquestketten, deren Texte und Freischaltungen werden nicht überarbeitet.

Alle vorhandenen Nebenquestarten werden gegen die aktuelle Wirtschaft und
Welt geprüft: Beschaffung, Kurier, Rundreise, Erkundung, Abbau und
Eilbestellung. Ziele, Voraussetzungen, Texte und Belohnungsberechnung
müssen zur tatsächlich ausgeführten Aufgabe passen. Neue Angebote dürfen
keine grundsätzlich ungeeigneten Ziele, nicht existierenden Quellen oder
bereits erledigten Erkundungsziele voraussetzen. Dynamische Bedingungen
werden bei Annahme erneut geprüft und bei Ablehnung verständlich erklärt.
Bei Abbauquests werden die aktuellen geeigneten Rohstofffeldarten und
tatsächlichen Abbaumöglichkeiten berücksichtigt.

Lieferquests erhalten eine ausdrücklich als Questabgabe erkennbare Aktion:

- Die geforderte Ware wird vom eigenen angedockten Schiff entnommen.
- Ein volles Handelslager oder ein fehlender regulärer Handelswarenplatz
  verhindert die Questabgabe nicht.
- Die abgegebene Ware zählt als Questlieferung und bezahlt die vereinbarte
  Questbelohnung. Sie wird nicht zugleich als normaler Verkauf oder als
  lokaler Absatz vergütet oder gezählt.
- Eigene Planeten sind als Auftraggeber beziehungsweise Lieferziele nicht
  allein wegen ihres Besitzstatus ausgeschlossen. Die bisherige pauschale
  Besitzsperre wird entsprechend korrigiert; sonstige echte
  Aufgabenbedingungen gelten weiterhin.
- Abschluss, Warenentnahme und Belohnung erfolgen genau einmal.

Das Handelslager muss durch diese Abgabe weder überfüllt noch heimlich
vergrößert werden. Es wird kein zusätzlicher, frei nutzbarer Spieler-
Lagerplatz geschaffen. Teillieferungen oder das Zusammenrechnen mehrerer
Schiffsladeräume sind nicht Bestandteil dieses Auftrags; der bisherige
Abgabeumfang kann bestehen bleiben.

Es gibt **keine Migration oder pauschale Ersetzung laufender Quests**.
Diese laufen mit ihren bestehenden Zielen, Fortschritten und Belohnungen
weiter. Spieler können sie weiterhin selbst abbrechen. Das gilt auch bei
der Einführung mehrerer Nebenquestslots: Eine bereits aktive Aufgabe
bleibt erhalten und zählt als belegter Slot. Die bisherige Datenform muss
ohne erzwungenen Reset unterstützt werden; eine flächendeckende
Bestandsdatenumschreibung ist nicht Teil des Vorhabens.

### 8. Ein Nebenquestslot je Pilotenlevel und erklärendes Popup

Das Limit gleichzeitig aktiver Nebenquests entspricht dem Pilotenlevel:
Level 1 bietet einen Slot, Level 2 zwei, bis derzeit sieben Slots auf
Level 7. Hauptquests belegen diese Slots nicht. Die Anzahl der Angebote
eines Questgebers ist ein separates System und wird damit nicht verwechselt.

Mehrere Nebenquests sind gleichzeitig sichtbar beziehungsweise gezielt
auswählbar. Annahme, Fortschritt, Abgabe und Abbruch beziehen sich eindeutig
auf die jeweilige Quest. Ein Abbruch betrifft nur diese Aufgabe; die
bestehenden Abbruch-/Sperrregeln werden nicht pauschal aufgehoben.
Parallele Aufgaben dürfen keine Waren oder questgebundenen Passagiere
mehrfach verwenden. Speicherung, Laden und Netzwerkaktualisierungen
erhalten alle aktiven Aufgaben und deren Fortschritt.

Bei einem tatsächlichen Aufstieg erscheint ein kleines, schließbares
Popup mit dem neuen Pilotenlevel und verständlicher Erklärung:

- Zusätzlicher Nebenquestslot und neues Gesamtlimit.
- Welche Pilotenlizenz nun gekauft werden kann, einschließlich des
  Hinweises, dass sie separat erworben werden muss.
- Weitere für dieses Level tatsächlich geltende Freischaltungen.

Das Popup vergibt keine Lizenz automatisch. Es erscheint nicht bei jeder
normalen Aktualisierung oder jedem Neuladen erneut. Überspringt eine
XP-Gutschrift mehrere Level, werden erreichtes Level, zusätzliche Slots
und relevante neue Möglichkeiten zusammen verständlich dargestellt.

## Umfangsgrenzen

- Dieser Auftrag liefert ausschließlich dieses PRD und dessen Commit.
- Keine Spielcodeänderung, Assetgenerierung, Datenmigration oder Umsetzung
  der nachfolgenden Arbeitsschritte ohne weiteren Umsetzungsauftrag.
- Keine Storyquest-Überarbeitung und kein neues Tourismusgebäude.
- Kein automatischer Push oder andere Veröffentlichung.

## Geplante Umsetzungsschritte und Fortschritt

- [x] Planung mit Q1–Q8 und Nutzerkorrekturen abstimmen; PRD erstellen.
- [x] Schritt 1: Lokalen Absatz getrennt protokollieren, Mengen und echte
  Einnahmen in der Drei-Stunden-Statistik ausweisen und Budgetanzeigen
  ergänzen. Zeitfenster, Teilzahlungen und Abgrenzung zu anderen
  Einnahmearten prüfen.

  Ergebnis: Zeitgestempelte bezahlte Verkäufe im Markt gespeichert, exaktes
  rollierendes Drei-Stunden-Fenster mit Menge und Credits je Ware sowie
  Gesamterlös im Statistikpanel. Keine Rekonstruktion aus Altverbrauch.
  Konsumbudget, Zufluss nach Steuern und getrennte NPC-Kasse angezeigt.
  Prüfung: `node --test tests/local-sales.test.js` und Syntaxprüfung.
- [x] Schritt 2: Preisabhängige lokale Nachfrage an die aktuelle Wirtschaft
  anbinden und Verbrauch gekaufter Planeten prüfen. Reglerwirkung,
  Warenbestand, Reserven, Budgetgrenzen und rezeptgebundene Verbräuche testen.

  Ergebnis: Gemeinsame Nachfrageformel für Anzeige und Warenentnahme,
  atomare Bezahlung mit budgetbegrenzter Menge für die fünf zivilen Waren,
  einschließlich Ruinenwelten. Rezeptzutaten bleiben unverändert. Wie auf
  gewöhnlichen Planeten bewertet die Heimatwelt Versorgung anhand des
  verfügbaren Grundbedarfs; Käufe sind davon getrennt budgetbegrenzt.
  27 gezielte Tests bestanden. Die erste Prüfung deckte eine anschließend
  behobene Ausbildungsregression auf. `npm ci` scheiterte am unnötigen
  nativen SQLite-Neubau; `npm ci --ignore-scripts` installiert die bereits
  enthaltene funktionsfähige Binärdatei unter Node 24.13.0.
- [x] Schritt 3: Filterbare Ortslisten um sämtliche Planetentypen und
  Rohstofffelder erweitern; Kombinationen, Sichtbarkeit, Warenfilter und
  passende Aktionen prüfen. Alte wirkungslose Upgradeanzeige entfernen.

  Ergebnis: Bekannte Planeten einschließlich Ruinen und alle Feldtypen
  mit Einzeltypfiltern und Rohstofffilter. Felder haben keine Marktpreise,
  Kauf- oder Handelsroutenaktionen; die vorhandene Navigation startet bei
  geeigneten Schiffen den Abbau. Alte Besitz-Upgradelinien sind im aktuellen
  Weltprofil auch an Werften ausgeblendet. Prüfung: fünf Trade-UI-Tests,
  Syntax und Whitespace bestanden.
- [x] Schritt 4: Touristenaufnahme an Paradieswelten und Orbitalhotels
  korrigieren; konkrete Ablehnungsgründe ergänzen. Gästeplatzgrenzen,
  Aufenthalt, Wiederabholung, Rückkehr und unveränderte Personenbestände
  prüfen.

  Ergebnis: Paradieswelten erhalten ihre 50 Grundgästeplätze bereits bei
  Initialisierung. Hotels verwalten echte Gäste mit 480 Plätzen, abgeleitet
  aus dem bisherigen Touristenwert 0,4/s × 1200 Sekunden Aufenthaltsdauer.
  Keine Erzeugung von Wohnbevölkerung im Hotel. Herkunft, Wallet, Aufenthalt
  und Wiederabholung bleiben erhalten. Fehlende Eignung, Vollbelegung,
  Andockung und private Zugänge werden getrennt erklärt. Acht vorhandene
  Bevölkerungstests und ein zusätzlicher integrierter Tourismusfall bestanden.
- [ ] Schritt 5: Wohnhausstufen in beiden Baupfaden ergänzen, Ausbaukosten
  und Betriebswerte dokumentieren, drei Hochhausgrafiken erstellen und
  integrieren. Kapazitäten, Rechte, Kosten, Fertigstellung, Speichern/Laden
  und visuelle Darstellung prüfen.
- [ ] Schritt 6: Alle Nebenquestarten überarbeiten, lagerunabhängige
  Questabgabe und konsistente Besitzregeln umsetzen. Aktive Aufgaben ohne
  Migration erhalten; Abschluss, Belohnung und Fehlermeldungen prüfen.
- [ ] Schritt 7: Parallele Nebenquests entsprechend Pilotenlevel inklusive
  UI, Speicherung und eindeutiger Einzelaktionen umsetzen. Levelaufstiegs-
  Popup ergänzen; Parallelfortschritt und Schutz vor Doppelverwendung prüfen.
- [ ] Schritt 8: Zusammenspiel und relevante Regressionstests abschließen;
  breite und schmale Ansichten visuell prüfen und Nachweise dokumentieren.

Bei späterer Umsetzung werden nach jedem fachlich abgeschlossenen Schritt
passende Prüfungen ausgeführt, Fortschritt und Ergebnisse hier aktualisiert
und gemeinsam mit dem Schritt committet. Fehlgeschlagene oder nicht
ausführbare Prüfungen werden ausdrücklich dokumentiert.

## Abnahmekriterien für die spätere Umsetzung

1. Tatsächliche lokale Verkäufe erscheinen je Ware mit Menge und bezahlten
   Credits getrennt vom übrigen Verbrauch. Die Summe der lokalen
   Verkaufseinnahmen umfasst exakt die letzten drei Stunden; ältere
   Buchungen fallen heraus. Lieferung, Steuer und Questabschluss erhöhen
   diese Summe nicht.
2. Bei gleichem Angebot und ausreichendem Budget bewirkt ein günstigerer
   Reglerpreis mehr lokale Nachfrage als ein höherer. Anzeige und
   tatsächliche Verarbeitung stimmen überein. Fehlende Ware, geschützte
   Bestände oder Budgetmangel erzeugen keine erfundenen Verkäufe.
3. Auf Spielerplaneten sind Restbudget und aktueller Budgetzufluss pro
   Stunde sichtbar. Budgetbedingte Kaufbegrenzungen sind nachvollziehbar;
   Betriebszutaten folgen weiterhin dem tatsächlichen Produktionsbedarf.
4. Jeder bekannte Planetentyp und jeder geeignete Rohstofffeldtyp ist in
   den Ortslisten auffindbar und gezielt filterbar. Kombinierte Such- und
   Warenfilter sowie Navigation/Abbau funktionieren, ohne unbekannte Orte
   offenzulegen oder Feldern Marktpreise zu erfinden.
5. Ein angedocktes berechtigtes Schiff kann Touristen an einer Paradieswelt
   mit freien Gästeplätzen sowie an einem geeigneten Orbitalhotel absetzen.
   Belegung, Aufenthalt und Wiederabholung erhalten die Personenanzahl.
   Auf der Heimatwelt ohne Gästeplätze erscheint ein Eignungshinweis;
   echte Vollbelegung wird davon unterscheidbar angezeigt.
6. Beim Anklicken eines fremden Planeten im Weltall ist das alte ungenutzte
   Upgradesystem nicht mehr sichtbar. Aktive Questgeberlevel, Gebäude-
   upgrades und Spezialisierungen bleiben verfügbar.
7. Ein Wohnblock hat je nach Stufe insgesamt 200, 400 oder 800 Wohnplätze.
   Beide Planetenbaupfade unterstützen den Ausbau; Kosten werden einmalig
   fällig, Stufengrenzen gelten serverseitig und Fertigstellung erhöht die
   Kapazität genau einmal. Drei passende Hochhausgrafiken zeigen die Stufe.
8. Jede Nebenquestart wird mit geeigneten und ungeeigneten Zielen geprüft.
   Eine Lieferquest kann bei vollem Handelslager und auf einem eigenen
   Planeten regulär abgegeben werden. Die Ware verschwindet genau einmal
   aus dem angedockten Schiff, die vereinbarte Belohnung wird genau einmal
   gezahlt und es entsteht kein zusätzlicher Handels- oder Absatzumsatz.
9. Bereits laufende Nebenquests behalten Ziele, Fortschritt und Belohnung;
   keine wird automatisch ersetzt oder zurückgesetzt. Ein normaler
   selbst gewählter Abbruch bleibt möglich. Storyquests bleiben unverändert.
10. Pilotenlevel 1 erlaubt eine, Level 2 zwei und Level 7 sieben aktive
    Nebenquests. Eine weitere Annahme wird verständlich abgewiesen.
    Hauptquests verbrauchen keinen Slot. Abschluss und Abbruch einer
    ausgewählten Aufgabe verändern keine andere; Speichern und Laden
    erhalten den Parallelfortschritt ohne doppelte Warenverwendung.
11. Ein tatsächlicher Levelaufstieg zeigt ein schließbares Popup mit neuem
    Questlimit, separat kaufbarer Lizenz und echten weiteren Freischaltungen.
    Mehrfachaufstiege und normale Aktualisierungen erzeugen keine
    irreführenden oder wiederkehrenden Dialoge.
12. Breite und schmale Ansichten halten Statistik, Budgetwerte, Filter,
    Questauswahl, Abgabeaktionen und Popup lesbar und bedienbar. Passende
    automatisierte Tests und die abschließende Regression bestehen.

## Technische Anknüpfungspunkte

Die Bestandsaufnahme ist eine Orientierung für die spätere Umsetzung,
keine bereits durchgeführte Änderung:

- Wirtschaft und Statistik: `server/real-economy.js`, `server/markets.js`,
  `server/property.js`, `shared/property.js`, `client/js/ui/property.js`,
  `client/js/ui/details.js`.
- Ortslisten: `client/js/ui/favorites.js`, `client/js/ui/tradeModel.js`.
- Personen: `server/population.js`, `client/js/ui/population.js`.
- Wohnbau: `shared/homeworld.js`, `server/homeworld-operations.js`,
  `server/specializations.js`, `client/js/planetCityLayout.js` und die
  bestehende Gebäude-/Planetendarstellung.
- Nebenquests und Level: `server/quests.js`, `server/handlers/quest.js`,
  `shared/progression.js`, `server/game.js`, `server/net.js`,
  `client/js/ui/quests.js` sowie sämtliche bisherigen `player.quest`-Zugriffe.
- Vorhandene Tests insbesondere `tests/quests.test.js`,
  `tests/population.test.js`, `tests/real-economy.test.js` und
  `tests/property.test.js`; Storyquesttests dienen nur der Regression.

## Prüfstand dieses Planungsauftrags

Es wurden Anforderungen und relevante bestehende Regeln gelesen; Spielcode
und Assets wurden nicht verändert. Umsetzungstests und visuelle
Spielabnahme sind noch nicht durchgeführt und für diesen reinen
Planungsauftrag nicht erforderlich. Vor dem Dokumentationscommit werden
Dokumentdiff, Änderungsumfang und Whitespace geprüft. Die vollständige
Spieltestsuite ist erst für die spätere Umsetzung vorgesehen.
