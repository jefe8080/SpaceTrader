# PRD 12: Questwechsel und planetare Produktionsübersicht

## Ziel und Planungsstand

Spieler können zwischen parallel aktiven Hauptquests wechseln und erkennen
auf Planeten unmittelbar Ressourcenbestände, Produktionsstillstände und
Versorgungsengpässe.

Die Planung wurde am 28.10.2026 mit dem Skill `grilling` in Q1–Q9
abgestimmt. Alle Empfehlungen einschließlich der Anpassungen zu Q2 und Q3
wurden mit „alles ja“ bestätigt. Dieses PRD dokumentiert die Planung;
die Umsetzung ist noch offen.

## Verbindliche Anforderungen

### 1. Hauptquests im Questfenster wechseln

Das Questfenster links oben in allen nicht planetaren Ansichten erhält bei
mehreren aktiven, nicht abgeschlossenen Hauptquests Vor-/Zurück-Pfeile
und eine Positionsanzeige wie „1/3“. Bei höchstens einer Hauptquest sind
die Wechselsteuerungen ausgeblendet. Die Auswahl bestimmt nur die Anzeige;
alle aktiven Hauptquests sammeln unabhängig davon weiter Fortschritt.
Normale Aufträge bleiben unabhängig davon sichtbar und unverändert bedienbar.

Die Auswahl bleibt bei normalen UI-Aktualisierungen und Ansichtswechseln
erhalten. Entfällt die gewählte Quest, wird eine verbleibende aktive Quest
angezeigt. Questbezogene Texte und Aktionen müssen zur angezeigten Quest
passen. Eine dauerhafte Speicherung der Auswahl ist nicht erforderlich.

### 2. Lagerbestände direkt am Produktionsrezept

Beim Anklicken jedes Produktionsgebäudes stehen hinter allen Eingangs- und
Ausgangsressourcen die jeweiligen Bestände in Klammern. Dies umfasst
Grundanlagen, neue Produktionsstrukturen und herkömmliche Fabriken.
Die Werte beziehen sich auf den betreffenden Planeten und aktualisieren
sich mit dessen Wirtschaftsdaten, auch bei bereits geöffnetem Fenster.

Für Zutaten wird der tatsächlich für die Produktion verfügbare Bestand
angezeigt: geschützte Reserven und gebundene Waren sind abgezogen.
Die Klammerangabe ist rot, wenn der Bestand für einen vollständigen
Produktionszyklus des angezeigten Rezepts nicht reicht, andernfalls grün.
Gleichheit mit dem Zyklusbedarf reicht aus. Rezeptmengen selbst behalten
ihre bisherige Farbe.

Bei Ausgangsprodukten zeigt die Klammer den vorhandenen Lagerbestand;
0 ist rot, ein positiver Bestand grün. Fehlende oder nicht einsehbare
Werte werden als „—“ ohne irreführende Mangelbewertung dargestellt.

### 3. Bewegte Sprechblasen für Produktionsstillstand

Über manuell pausierten Produktionsgebäuden erscheint „Zzz“. Über
eingeschalteten Produktionsgebäuden, die wegen fehlender nutzbarer Zutaten
stillstehen, erscheint „???“. Geschützte oder gebundene Bestände gelten
dabei nur entsprechend ihrer tatsächlichen Nutzbarkeit als vorhanden.
Manuelle Pause hat Vorrang vor Rohstoffmangel.

Andere Stillstandsgründe, insbesondere fehlender Strom, fehlende
Arbeitskräfte, volles Lager und erreichtes Produktionsziel, erzeugen keine
dieser Sprechblasen. Baustellen und Ruinen erhalten keine Produktionsblase.
Die Einordnung folgt dem aktuellen Produktionszustand und dessen Grund;
ein bloß niedriger Zutatenbestand bei einem anderen Stillstandsgrund
reicht nicht aus.

Beide Blasen bewegen sich sanft hin und her, mit leicht versetzter
Bewegungsphase pro Gebäude. Sie bleiben dem Gebäude bei Kamerabewegung
und Zoom zugeordnet und blockieren keine Gebäudeinteraktion.
Statuswechsel werden ohne erneutes Öffnen der Planetenansicht sichtbar.

### 4. Dauerhaftes kompaktes Planetenfenster

In der planetaren Ansicht erscheint ein zusätzliches kleines Fenster für
den aktuell betrachteten Planeten. Es bleibt während der Ansicht sichtbar,
aktualisiert sich mit den Wirtschaftsdaten und verdeckt keine wesentlichen
Bedienelemente. Beim Planetenwechsel wechseln sämtliche Angaben mit.

Das Fenster zeigt:

- Normales Lager: belegt/gesamte Kapazität.
- Gefahrgutlager: belegt/gesamte Kapazität in einer separaten Zeile.
- Arbeitskräfte: benötigt/verfügbar insgesamt, ergänzt um eine kompakte
  Aufschlüsselung nach einfacher Arbeit, Fachkräften und Spezialisten.
- Strom: benötigt/erzeugt.

Lagerbelegung folgt den bestehenden Lagerregeln einschließlich Modulen
und reservierten Modulausgabeplätzen. Volle Lager erhalten in diesem
Arbeitspaket keine zusätzliche Warnfarbe.

„Benötigt“ bezeichnet den Sollbedarf aller eingeschalteten, fertiggestellten
Anlagen, auch wenn sie wegen Mangels aktuell stillstehen. Manuell pausierte
Anlagen zählen nicht mit. Aktive Bau- und Projektreservierungen werden
entsprechend den bestehenden Versorgungsregeln berücksichtigt, ohne
Doppelzählung. Die angezeigte Verfügbarkeit der Arbeitskräfte berücksichtigt
die geltenden Einsatzgrenzen; sie ist nicht die gesamte Bevölkerung.

Bei Bedarf über Verfügbarkeit wird die gesamte jeweilige Zahlenangabe rot,
ansonsten in normaler Textfarbe dargestellt. Das gilt auch für einzelne
Arbeitsqualifikationen: Ein Fachkräftemangel bleibt bei ausreichender
Gesamtkopfzahl erkennbar. Gleichheit ist kein Mangel.

Die Übersicht gilt für alle Planeten, soweit die Daten für den Spieler
sichtbar sind. Fehlende oder nicht einsehbare Werte erscheinen als „—“.
Bestehende Sichtbarkeits- und Berechtigungsregeln bleiben maßgeblich.

## Umfang und technische Anknüpfungspunkte

Die Änderung ergänzt Anzeige und Navigation. Produktionsregeln, Rezepte,
Lagergrenzen, Reservenschutz und paralleler Questfortschritt werden dadurch
nicht verändert.

- `client/js/ui/quests.js`: Hauptquestauswahl statt erster aktiver Quest.
- `client/js/ui/homeworld.js` und `client/js/ui/planetPanel.js`:
  Rezeptanzeigen und Bestandsangaben.
- `client/js/planetside.js` und `client/js/planetCityScene.js`:
  Gebäudezuordnung, aktuelle Stillstandsgründe und animierte Blasen.
- Bestehende Wirtschaftsdaten unter `market.homeworld` und `market.economy`
  sowie Lager- und Reservierungsberechnung bilden die Datengrundlage.

Vor der Umsetzung ist insbesondere die gemeinsame Berechnung von
Sollbedarf und Verfügbarkeit abzugleichen. Bestehende `used`-Werte reichen
für die Mangelanzeige nicht aus, da sie nur erfolgreich versorgten Betrieb
zählen. Zusätzliche Anzeigedaten müssen dieselben Wirtschaftsregeln nutzen.

## Umsetzungsschritte und Fortschritt

- [x] Planung abstimmen und PRD erstellen.
- [x] Schritt 1: Hauptquestauswahl mit stabiler Auswahl und passenden Aktionen
  umsetzen; Questwechsel, Questabschluss und parallelen Fortschritt prüfen.
- [x] Schritt 2: Gemeinsame Bestandsdarstellung in allen Rezeptpfaden ergänzen;
  Zyklusgrenzen, Reserven, Ausgangsbestände und Aktualisierung prüfen.
- [x] Schritt 3: Stillstandszuordnung und bewegte Sprechblasen ergänzen;
  Zustandswechsel, Priorität und Kameraverhalten prüfen.
- [x] Schritt 4: Planetenfenster mit Lagertrennung, Sollbedarf und
  Qualifikationen ergänzen; Mangelgrenzen und Datenberechtigungen prüfen.
- [ ] Schritt 5: Zusammenspiel in den betroffenen Ansichten visuell prüfen
  und relevante vorhandene Regressionstests ausführen.

Nach jedem fachlich abgeschlossenen Schritt erfolgen passende Prüfungen,
eine Fortschrittsaktualisierung in diesem PRD und ein eigener Commit.
Fehlgeschlagene oder nicht ausführbare Prüfungen werden dokumentiert.

## Abnahmekriterien

1. Bei mindestens zwei aktiven Hauptquests lässt sich im nicht planetaren
   Questfenster jede auswählen; Positionsanzeige und Inhalt stimmen überein.
   Fortschritt nicht ausgewählter Quests läuft weiter. Abschluss und
   Ansichtswechsel führen nicht zu ungültigen Auswahlen.
2. Alle Produktionsgebäude zeigen Bestände an jeder Rezeptressource.
   Bei Zutatenbedarf 2 sind nutzbare Bestände 0 und 1 rot, 2 und 3 grün.
   Geschützte und gebundene Waren verfälschen die Bewertung nicht.
   Ausgangsbestand 0 ist rot, positiver Ausgangsbestand grün.
3. Manuelle Pause zeigt „Zzz“, Zutatenstillstand „???“; bei manueller Pause
   trotz fehlender Zutaten erscheint ausschließlich „Zzz“. Andere
   Stillstandsgründe, Baustellen und Ruinen zeigen keine dieser Blasen.
4. Blasen schweben dezent, folgen dem Gebäude bei Zoom und Kamerabewegung
   und aktualisieren sich beim Pausieren, Fortsetzen und Zutatenwechsel live.
5. Die Planetenübersicht zeigt getrennte Lagerwerte, Arbeitskräfte samt
   Qualifikationen und Strom. Werte entsprechen den bestehenden Regeln
   für Belegung, Reservierungen und nutzbare Arbeitskräfte.
6. Benötigt 120/verfügbar 100 erscheint rot, 100/100 und 80/100 normal.
   Der Sollbedarf bleibt bei automatischem Stillstand erkennbar;
   manuell pausierte Anlagen erhöhen ihn nicht. Qualifikationsmangel
   erscheint auch bei ausreichender Gesamtzahl rot.
7. Planetenwechsel und laufende Wirtschaftsaktualisierungen aktualisieren
   sämtliche Angaben. Nicht einsehbare Daten erscheinen als „—“ und
   werden nicht als 0 oder als sichtbarer Mangel ausgegeben.
8. Bestehende Quest-, Produktions-, Reservierungs- und Interaktionsfunktionen
   bleiben bei den relevanten Prüfungen funktionsfähig.

## Prüfstand

Planungsdokument erstellt; noch keine Implementierung und keine
Implementierungsprüfungen durchgeführt.
