# PRD 11: Almanach, Objekterklärungen und verlässliche Spielnavigation

## Ziel und Planungsstand

Spieler verstehen Gebäude und Weltobjekte beim ersten Kontakt und können ihre
Funktionen später nachlesen. Verständliche Begriffe und eine zur Oberfläche
passende Orbitalgrafik ergänzen die Einführung. Neue Schiffe starten vollgetankt,
erledigte persönliche Questobjekte verschwinden und die Schiffsliste führt
zuverlässig zurück zum gewählten Schiff.

Die Planung wurde am 27.10.2026 mit dem ausdrücklich gewünschten Skill
`grilling` in Q1–Q13 abgestimmt und vollständig bestätigt. Anschließend wurde
der Doppelklick auf die linke Schiffsliste als zusätzliche Anforderung genannt.
Dieses Dokument hält die Planung fest; der Spielcode ist noch nicht umgesetzt.

## Verbindliche Anforderungen

### 1. Almanach und gemeinsamer Erklärungskatalog

Der Almanach erhält eine Gebäudeseite mit Erklärungen. Auch die übrigen
Objekterklärungen sind dort nachlesbar. Ein gemeinsamer Katalog liefert Texte
und Bilder sowohl für den Almanach als auch für die Erklärfenster.

Abgedeckt werden alle anklickbaren Gebäude und Stationsarten einschließlich
Produktionsstationen, Werftvarianten, Hub, Außenposten, Hotel und
Spezialförderstationen, alle Planetentypen, Ressourcenfeldtypen,
Versorger-Schiffe und persönliche Questfundstellen. Varianten teilen ihre
Grundlagen und ergänzen ihre jeweiligen Unterschiede. Die konkrete Typenliste
wird gegen die registrierten Spielobjekte geprüft, damit kein Typ fehlt.

Allgemeine Funktionen und Gebäudeerklärungen sind sofort vollständig lesbar.
Konkrete Questfundorte und Belohnungen bleiben bis zur Entdeckung verborgen.
Bestehende Entdeckungsregeln für Rezepte, Schiffe und Module werden dadurch
nicht aufgehoben.

Jeder Eintrag enthält eine passende Abbildung, einen kurzen Einführungstext
und wenige konkrete Funktionspunkte einschließlich wichtiger Voraussetzungen.
Vorhandene Spielgrafiken werden bevorzugt; fehlende oder ungeeignete Bilder
werden ergänzt. Bilder und Texte sind in Fenster und Almanach identisch.

Der Hub-Eintrag erklärt zentralen Handel, Konsortiumgründung und den Kauf von
Pilotenlizenzen. Er unterscheidet das durch Erfahrung steigende Pilotenlevel
von der kaufbaren Lizenz und beschreibt deren aktuelle Auswirkungen auf
Schiffsklassen und Upgrades. Er behauptet keine durch PRD 10 entfernte
Lizenz-Flottenobergrenze. Versorger-Schiffe und Planeten sind getrennte Typen.

### 2. Bebildertes Fenster beim ersten Anklicken

Beim ersten Anklicken jeder Objektart erscheint zunächst ihre Erklärung.
Mit „Verstanden“ öffnet sich unmittelbar die normale Ansicht des angeklickten
Objekts; ein erneuter Objektklick ist nicht erforderlich. Weitere Exemplare
derselben Art lösen keine erneute Einführung aus. Varianten mit eigenen
Funktionen werden über eindeutige Katalogeinträge unterschieden.

Der Gelesenstatus wird dauerhaft pro Spieler im Spielstand gespeichert,
überlebt Neuladen und vermischt sich nicht zwischen Spielern. Bestehende
Spielstände ohne diesen Status erhalten jede Einführung ebenfalls einmalig.
Ein Hilfe-Symbol in der Objektansicht öffnet die Erklärung erneut; zusätzlich
ist sie im Almanach erreichbar. Einführung und Wiederaufruf dürfen keine
Spielaktion versehentlich auslösen oder Questinformationen vorwegnehmen.

### 3. Verständliche Begriffe

Die Bodeneinrichtung wird in Questtexten, Schaltflächen und Meldungen je nach
Kontext „Landeplatz“, „Zentrallager“ oder „Landeplatz und Zentrallager“ genannt.
Insbesondere entfällt „Das Dock reparieren“ als Bezeichnung des Bodenziels.
Tatsächliche Orbitaldocks behalten ihre fachlich passende Benennung.

Die Werftaktion „Rumpf bauen“ heißt „Schiff bauen“. Spielertexte zu fertigen
Schiffen verwenden konsequent „Schiff“. „Rumpf“ bleibt für die tatsächliche
Schiffshülle zulässig. Interne technische Bezeichner müssen nicht umbenannt
werden.

### 4. Orbitalanlage auf der Planetenoberfläche

Kleine und große Orbitale erscheinen auf der Oberfläche als am Boden
verankerte Aufzugsanlage beziehungsweise Pfeiler mit einer nach oben
führenden Verbindung. Sie dürfen dort nicht wie ein frei über dem Boden
schwebender Ring aussehen. Beide Größen bleiben unterscheidbar.

Die Änderung umfasst die reguläre Oberflächengrafik und ihre Ersatzdarstellung.
Name und Funktion des Orbitalrings bleiben erhalten. Die Weltraum-Außenansicht
zeigt weiterhin den namensgebenden Ring.

### 5. Neue Schiffe mit vollem Tank

Jedes frisch fertiggestellte Schiff startet bei Ausgabe beziehungsweise
Übernahme mit seinem maximalen Treibstoffstand. Das gilt für öffentliche,
eigene und Konsortiumswerften sowie den Heimat-Orbitalbau und für bereits
laufende Bauaufträge.

Bereits fertiggestellte, noch nicht abgeholte neue Schiffe erhalten einmalig
ebenfalls den vollen Tank. Bereits eingesetzte und gebraucht weiterverkaufte
Schiffe behalten ihren tatsächlichen Tankstand. Herkunft und Ausgabestatus
müssen diese Fälle zuverlässig unterscheiden; wiederholtes Laden oder
Übernehmen darf keine wiederholte kostenlose Betankung erlauben.

Der festgestellte Fehler liegt in physisch gebauten Inventarschiffen mit
`fuel: 0`, deren Wert den zunächst vollen Tank beim Übernehmen überschreibt.
Die Korrektur muss Bau, Inventarausgabe und bestehende Bestände berücksichtigen.

### 6. Erledigte persönliche Questobjekte entfernen

Persönliche Questobjekte verschwinden nach vollständigem Abschluss ihrer
zugehörigen Aufgabe. Archivstellen mit erforderlicher Abgabe bleiben bis zu
dieser Abgabe erhalten und verschwinden anschließend. Einmalige
Studienfundstellen ohne spätere Abgabe verschwinden nach vollständiger Bergung.
Der Abschluss einer Quest, die eine Fundstelle erst freischaltet, darf diese
noch benötigte Fundstelle nicht entfernen. Das Reliktwrack wird entsprechend
seines tatsächlichen Aufgabenabschlusses behandelt.

Die Bereinigung gilt auch für bereits abgeschlossene Aufgaben in bestehenden
Spielständen. Entfernte Objekte dürfen weder beim Neuladen noch bei erneuter
Aufdeckung wieder entstehen. Weltindex, Clientanzeige sowie referenzierende
Schiffziele und Routen müssen konsistent aktualisiert werden. Andere Spieler
und noch benötigte Objekte bleiben unbeeinträchtigt; ausstehende Belohnungen
oder geborgene Questfracht dürfen nicht verloren gehen.

### 7. Doppelklick auf die linke Schiffsliste

Ein Doppelklick auf einen Schiffslisteneintrag wählt dieses Schiff aus,
schließt eine offene Planetenansicht und führt in die normale Weltraumansicht.
Die Kamera wird auf das gewählte Schiff zentriert und auf die normale
Weltraum-Zoomstufe gesetzt (bestehender Taste-1-Systemzoom: `0,3`), sodass das Schiff sichtbar ist. Der bisherige
Planeten- oder Kartenzoom darf nicht übernommen werden.

Das gilt auch beim Wechsel zu einem anderen Schiff und bei erneutem
Doppelklick auf das bereits gewählte Schiff sowie aus Galaxie- und Sektoransicht.
Ein laufender Kameraflug darf den neuen Fokus oder Zoom nicht überschreiben;
die Kamera verfolgt das Schiff anschließend weiter. Bewegte und angedockte
Schiffe sind eingeschlossen. Planeten-Gebäudepanel und Planeteninteraktion
werden mit geschlossen. Ein einfacher Klick behält seine bisherige
Auswahlfunktion; Gruppenumbenennung und Strg-/Shift-Auswahl bleiben erhalten.
Der Doppelklick erteilt keinen Bewegungsbefehl.

## Umsetzungsschritte und Fortschritt

Jeder abgeschlossene Schritt erhält einen eigenen Commit mit aktualisiertem
PRD-Fortschritt. Vor jedem Umsetzungscommit werden passende Prüfungen ausgeführt.

- [x] P0: Planung mit `grilling` abstimmen und PRD erstellen.
- [x] U1: Gemeinsamen Erklärungskatalog mit vollständiger Typenabdeckung,
  Texten, Bildern und Almanachansichten ergänzen.
- [x] U2: Erstkontaktfenster, gespeicherten Gelesenstatus und Wiederaufruf
  integrieren; vorhandene Spielstände berücksichtigen.
- [x] U3: Landeplatz-/Zentrallager- und Schiffbaubegriffe konsistent korrigieren.
- [ ] U4: Kleine/große Orbitalanlagen in Oberflächen- und Ersatzgrafik ändern.
- [ ] U5: Erstbetankung aller Bauwege und Korrektur unabgeholter neuer
  Bestände mit Schutz gebrauchter und bereits aktiver Schiffe umsetzen.
- [ ] U6: Lebenszyklus persönlicher Questobjekte einschließlich Altbeständen,
  Referenzen und dauerhaftem Schutz vor Wiedererscheinen korrigieren.
- [ ] U7: Schiffsdoppelklick mit Ansichtswechsel, Zentrierung und Normalzoom
  vervollständigen.
- [ ] U8: Zusammenspiel, bestehende Spielstände, Mehrspielertrennung und
  relevante Regressionen prüfen; visuelle Nachweise dokumentieren.

## Abnahmekriterien und Prüfplan

1. Jede relevante Objektart besitzt einen bebilderten, sachlich korrekten
   Eintrag. Gebäudeseite und übrige Erklärungen sind im Almanach auffindbar;
   Questinformationen bleiben bis zur Entdeckung verborgen.
2. Erstkontakt zeigt die passende Erklärung genau einmal je Typ und Spieler.
   „Verstanden“ führt direkt zum Objekt. Neuladen erhält den Status;
   Hilfe-Symbol und Almanach erlauben erneutes Lesen.
3. Hub-Texte unterscheiden Level, Lizenz und Konsortium korrekt und geben
   keine veraltete Flottenobergrenze an.
4. Die Bodeneinrichtung heißt kontextgerecht Landeplatz/Zentrallager;
   die Bauaktion heißt „Schiff bauen“. Tatsächliche Rumpfbegriffe bleiben korrekt.
5. Kleine und große Orbitale sind auf der Oberfläche eindeutig verankert,
   auch in der Ersatzdarstellung. Außenringe bleiben sichtbar.
6. Neue Schiffe aller Bauwege werden voll ausgegeben. Laufende Aufträge und
   fertige unabgeholte Altbestände sind eingeschlossen. Aktive und gebrauchte
   Schiffe werden nicht aufgefüllt; wiederholtes Speichern/Laden ist idempotent.
7. Abgeschlossene Archivstellen und Questwracks verschwinden zum richtigen
   Abschlusszeitpunkt. Studienfundstellen bleiben nach Freischaltung erhalten
   und verschwinden erst nach vollständiger Bergung.
8. Questbereinigung funktioniert auch mit Altspielständen, offenen
   Objektreferenzen und mehreren Spielern, ohne Waren-/Belohnungsverlust oder
   erneutes Spawnen nach Laden und Aufdecken.
9. Schiffsdoppelklick funktioniert aus Planetenansicht, abweichendem
   Weltraumzoom und bereits normaler Ansicht sowie für gleiches/anderes Schiff.
   Das Zielschiff ist auf Normalzoom sichtbar; Einfachklick bleibt erhalten.
10. Fenster und Almanach sind in schmaler und breiter Ansicht lesbar und
    bedienbar. Bilder werden korrekt geladen, Texte nicht abgeschnitten.

Für U1/U2 werden Typenabdeckung, Informationsfreigabe, Persistenz und
Spielertrennung gezielt geprüft. U5/U6 erhalten automatisierte Prüfungen für
die genannten Zustandsübergänge und Altbestände. U3 wird anhand der betroffenen
Spielertexte geprüft. U4/U7 sowie die Einführung benötigen visuelle
Laufzeitprüfungen; U8 umfasst `npm test` und dokumentierte Laufzeitnachweise
unter `docs/qa/prd11/`. Fehlgeschlagene oder nicht ausführbare Prüfungen werden
hier und gegenüber dem Nutzer mit Ursache festgehalten.

P0: Anforderungen Q1–Q13 und den ergänzten Schiffsdoppelklick gegen das PRD
geprüft. Für den Planungscommit wird `git diff --check` ausgeführt. Spieltests
folgen mit der Umsetzung; in diesem Schritt wurde nur das PRD erstellt.

U1: Gemeinsamer Katalog und Almanachreiter ergänzt. Registrierte Stationen, Planeten und Felder sowie Bilddateien mit node --test tests/prd11.test.js geprüft (1/1 bestanden); git diff --check bestanden.

U2: Erstkontakt, Verstanden-Fortsetzung und Hilfe in Objekt-/Gebäudeansichten integriert. Gelesenstatus wird im Spieler gespeichert. Persistenz, Idempotenz, Validierung und Spielertrennung automatisiert geprüft (2/2 Tests bestanden). Visuelle Prüfung folgt in U8.

U3: Landeplatz und Zentrallager sowie Schiffbau-Begriffe korrigiert. Orbitaldocks und Rumpfsegmente beibehalten. Betroffene Heimat-, Story- und PRD11-Tests: 13/13 bestanden.
