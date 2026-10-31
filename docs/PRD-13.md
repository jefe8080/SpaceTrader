# PRD 13: Planetenbau, Schulpersonal und kompaktere Ansichten

## Ziel und Planungsstand

Die Planetenbedienung erhält eine stabile Beschriftung, wieder nutzbare
Fabrikbauplätze und verlässliches Schulpersonal. Weitere Ruinenwelten können
ihre Antriebswerkstatt nach Abschluss der zugehörigen Quest reparieren.
Planetenwerte und Flotte werden platzsparender dargestellt.

Die Planung wurde am 31.10.2026 mit dem Skill `grilling` abgestimmt
(Q1–Q8 einschließlich der Nutzerkorrekturen). Der Nutzer hat die Erstellung
und den Commit dieses PRD beauftragt. Die Umsetzung ist noch nicht gestartet
und wird vom Nutzer separat angestoßen.

## Verbindliche Anforderungen

### 1. Einheitlicher Buttontext „Landen“

Der Zugangsbutton in der Detailansicht eines angeklickten Planeten heißt
immer „Landen“. Das gilt sowohl bei angedocktem Schiff als auch bei
Fernverwaltung und verhindert wechselnde Buttonbreiten und verschobene
Listen. Zugangsberechtigungen, Aktivierungszustand und ausgeführte Aktion
folgen weiterhin den bestehenden Regeln.

### 2. Vorhandenen Fabrikbau auf Nicht-Ruinenplaneten wieder anbinden

Die alte Fabrikbaufunktion an den bereits vorhandenen Bauplätzen wird
wieder aktiviert und vollständig an die aktuelle Wirtschaft angebunden.
Es entsteht kein neues Bausystem. Vorhandene Rezeptauswahl, Baukosten,
Kategorien, Bauplatzbegrenzungen und sofortiger Bau werden übernommen.

Bauen und Verwalten erfordern Planetenbesitz und die bestehenden
Verwaltungsrechte, einschließlich der geltenden Konsortiumsrechte.
Der bestehende Bedarf eines angedockten eigenen Schiffs und die Bezahlung
aus Spieler-/Konsortiumsmitteln sowie dessen angedockten Laderäumen bleiben
erhalten. Ohne Besitz darf kein Bau möglich sein, auch nicht durch einen
direkten Serverbefehl. Die vorhandene Abrissfunktion ohne Erstattung bleibt.

Die Wiederanbindung umfasst Bauoberfläche, Serveraktion, Lager für Zutaten
und Produkte sowie den tatsächlichen Produktionsbetrieb. Bei fehlendem
Planetenbesitz stehen diese Fabriken entsprechend der bisherigen Regel still.

Manuelle Upgrades der bestehenden Warengebäude auf Nicht-Ruinenplaneten
entfallen in der normalen Weltraum-/Planetendetailbedienung einschließlich
der zugehörigen Serveraktion. Die vorhandene Beschleunigung durch
Questlevel bleibt erhalten. Ruinenaufbau und dessen Gebäudeausbau werden
durch diese Entfernung nicht eingeschränkt.

### 3. Zwei Fachkräfte für jede fertiggestellte Schule

Jede neu fertiggestellte wirtschaftlich wirksame Schule bringt einmalig
zwei zusätzliche Einwohner mit der Qualifikation Fachkraft (`skilled`) mit.
Dies gilt für Schulen auf Ruinenwelten und auf normalen Planeten und auch
für einen Neubau nach vorherigem Abriss. Die Gutschrift erfolgt bei
Fertigstellung, nicht beim Bauauftrag, und wird durch erneute Aktualisierung
oder Laden nicht wiederholt.

Ein Schul- oder Akademieupgrade erzeugt keine zusätzlichen Fachkräfte.
Bereits bestehende wirtschaftlich wirksame Schulen in alten Spielständen
erhalten die zwei Fachkräfte einmalig nachgetragen; eine gespeicherte
Kennzeichnung verhindert Mehrfachgutschriften. Rein dekorative Gebäude
zählen nicht als wirtschaftlich wirksame Schulen.

Strom, Wohnraum und die bestehenden Regeln zur Verfügbarkeit von
Arbeitskräften bleiben reguläre Betriebsvoraussetzungen. Die Personalzugabe
ersetzt diese Voraussetzungen nicht.

### 4. Antriebswerkstatt auf weiteren Ruinenwelten reparieren

Nach Abschluss von H04 lässt sich die Antriebswerkstatt auf weiteren
eigenen Ruinenplaneten manuell zu den vorgesehenen Reparaturkosten und
Voraussetzungen reparieren. H04 muss nicht wiederholt werden. Die erste
questgebundene Freischaltung bleibt erhalten. Die Prüfung muss den
Questfortschritt und die bestehenden Besitz-/Zugangsrechte berücksichtigen.

### 5. Planetenübersicht in den oberen Balken integrieren

Das separate Übersichtsfenster aus PRD 12 entfällt. Seine vollständigen
Inhalte werden in den oberen Balken integriert und ausschließlich in der
Planetenansicht angezeigt:

- Normales Lager und Gefahrgutlager jeweils mit Belegung und Kapazität.
- Arbeitskräfte mit Bedarf und Verfügbarkeit sowie Aufschlüsselung nach
  einfacher Arbeit, Fachkräften und Spezialisten.
- Strombedarf und Erzeugung.

Berechnungsregeln, Mangelmarkierungen, Datenberechtigungen und die Anzeige
„—“ für unbekannte Werte aus PRD 12 bleiben erhalten. Planetenwechsel und
Wirtschaftsaktualisierungen aktualisieren die Werte. Bei schmalen Ansichten
darf der Balken mehrzeilig werden; wesentliche Bedienelemente bleiben
sichtbar und erreichbar.

### 6. Flottenfenster einklappen

Ein Pfeil klappt das linke Flottenfenster zu einem schmalen Streifen ein
und wieder auf. Eingeklappt erscheinen je Schiff nur Zustandssymbol und
Schiffsymbol. Die Schiffe bleiben auswählbar; beim Darüberfahren erscheint
der Schiffsname. Der Pfeil bleibt erreichbar und zeigt die Klapprichtung an.

Bestehende Auswahl, Reihenfolge und Filterung werden weiter berücksichtigt.
Der Klappzustand bleibt über Ansichtswechsel und Neuladen erhalten.
Ausgeklappt steht die bisherige vollständige Flottenbedienung zur Verfügung.

## Technische Ausgangspunkte

- `client/js/ui/details.js`: Beschriftung des Landebuttons.
- `client/js/ui/planetPanel.js`: Warengebäude, alte Fabrikbauplätze,
  Rezeptauswahl und bisheriges Planetenübersichtsfenster.
- `server/handlers/planet.js`, `shared/planetside.js` und Wirtschaftstakt:
  vorhandenen `facBuild`-Pfad samt Lager und Produktion wieder verbinden;
  Sperren für die aktuelle Wirtschaft gezielt prüfen.
- `server/homeworld.js`: bisherige pauschale Werkstatt-Reparatursperre.
- `server/homeworld-operations.js` und `server/specializations.js`:
  Fertigstellung der beiden wirtschaftlichen Schulbaupfade.
- `client/index.html`, zugehörige Styles und `client/js/ui/fleet.js`:
  Integration der Übersicht und kompakte Flottenliste.

## Umsetzungsschritte und Fortschritt

- [x] Anforderungen mit `grilling` abstimmen und PRD erstellen.
- [x] Schritt 1: Einheitlichen Landebutton und Reparaturfreigabe nach H04
  umsetzen; lokale/ferne Zugänge und Quest-/Besitzgrenzen prüfen.
- [x] Schritt 2: Alte Fabrikbauplätze vollständig wieder anbinden und
  manuelle Warengebäude-Upgrades entfernen; Baukosten, Rechte, Lager,
  Produktionsbetrieb und erhaltene Questlevel-Beschleunigung prüfen.
- [x] Schritt 3: Schulpersonal für beide Baupfade und einmalige Migration
  bestehender Schulen umsetzen; Mehrfachgutschriften ausschließen.
- [x] Schritt 4: Planetenübersicht in den oberen Balken integrieren und
  einklappbare Flottenliste mit gespeichertem Zustand umsetzen.
- [ ] Schritt 5: Zusammenspiel, vorhandene Regressionstests und visuelle
  Darstellung bei breiten und schmalen Ansichten prüfen.

Nach jedem fachlich abgeschlossenen Umsetzungsschritt erfolgen passende
Prüfungen, eine Fortschrittsaktualisierung hier und ein eigener Commit.
Fehlgeschlagene oder nicht ausführbare Prüfungen werden dokumentiert.
Ein Push erfolgt erst nach Zustimmung des Nutzers.

## Abnahmekriterien

1. Der Zugangsbutton zeigt bei lokalem Zugang, Fernverwaltung und Wechseln
   zwischen beiden stets „Landen“; seine Zugangsregeln bleiben funktionsfähig.
2. Auf einem eigenen Nicht-Ruinenplaneten lassen sich vorhandene freie
   Fabrikbauplätze über die alte Rezeptauswahl bebauen. Kosten werden einmal
   abgezogen, Platzgrenzen eingehalten und unberechtigte Befehle abgewiesen.
3. Gebaute Fabriken entnehmen Zutaten aus dem Planetenlager und liefern
   Produkte dorthin. Ohne Besitzer stehen sie still. Abriss funktioniert
   weiterhin ohne Erstattung.
4. Manuelle Warengebäude-Upgrades sind weder über die betroffene Oberfläche
   noch per Serveraktion möglich. Questlevel erhöhen die Geschwindigkeit
   weiterhin nach den bestehenden Regeln; Ruinenausbau bleibt verfügbar.
5. Jede fertiggestellte Schule fügt genau zwei Einwohner als Fachkräfte
   hinzu, einschließlich zweiter Schule und Neubau nach Abriss. Abbruch,
   Upgrade, wiederholte Aktualisierung und Neuladen erzeugen keine
   zusätzlichen Gutschriften.
6. Bestehende wirtschaftlich wirksame Schulen erhalten einmalig je zwei
   Fachkräfte. Wiederholtes Laden desselben Spielstands dupliziert sie nicht.
7. Nach abgeschlossenem H04 ist die Antriebswerkstatt auf einer zweiten und
   weiteren eigenen Ruinenwelt regulär reparierbar. Vor der Freischaltung
   bleibt der bisherige Questablauf wirksam; unberechtigte Reparaturen scheitern.
8. Die vollständige Planetenübersicht erscheint ausschließlich im oberen
   Balken der Planetenansicht. Werte, Warnfarben und unbekannte Angaben
   entsprechen PRD 12 und wechseln korrekt mit dem betrachteten Planeten.
9. Die Flotte lässt sich ein- und ausklappen. Im kompakten Zustand bleiben
   Zustands- und Schiffssymbole, Namenshinweis und Schiffsauswahl nutzbar.
   Ansichtswechsel und Neuladen erhalten den Klappzustand.
10. Bei breiter und schmaler Ansicht überdecken die neuen Darstellungen
    keine wesentlichen Bedienelemente. Relevante vorhandene Tests bestehen.

## Prüfstand

Nur die Planung ist abgeschlossen. Es wurden keine Spielcodeänderungen
vorgenommen und noch keine Umsetzungsprüfungen ausgeführt. Die Umsetzung
wartet auf den separaten Start durch den Nutzer.
