# PRD 6 – Aufgeräumte Benutzeroberfläche und Handelsübersicht

Stand: 2026-10-25 · Status: Umsetzung beauftragt und begonnen

## 1. Ziel, Freigabe und Geltung

Die Benutzeroberfläche soll weniger gleichzeitig sichtbare Knöpfe, Informationen und Optionen zeigen. Zusammengehörige Funktionen werden gebündelt; vertiefende Informationen und seltene Aktionen liegen in aufklappbaren Bereichen. Häufige Aktionen bleiben direkt erreichbar. Eine gemeinsame, gut filter- und sortierbare Handelsübersicht verbindet bekannte Orte, Warenvergleich, Favoriten und Routenverwaltung.

Die Entscheidungen Q1–Q18 und die anschließende Zusammenfassung wurden vom Nutzer bestätigt. Dieser Auftrag umfasst ausschließlich Erstellung und Commit dieses PRD. Die Umsetzung beginnt erst nach einem gesonderten Auftrag. Ein Push benötigt gesonderte Zustimmung.

Dieses Dokument ergänzt die bisherigen PRDs für die hier beschriebenen UI-Themen. Das abgeschlossene [PRD 6 zu Schiffsdesigns](PRD-6-schiffsdesigns.md) bleibt erhalten und dient als gestalterische Referenz. Die gemeinsame Nummerierung ist ausdrücklich abgestimmt.

## 2. Umfang und Grenzen

Enthalten sind globale Navigation, Pilotenprofil als Funktionscontainer, kompakte Hover-Hinweise, aufklappbare Ortsinformationstafeln, UI-Rahmen und Bedienelemente, die neue Handelsübersicht sowie deren integrierte Routenverwaltung. Alle bisherigen Spielfunktionen bleiben erreichbar.

Nicht enthalten sind neue Schiffsgrafiken, Welt- oder Planetengestaltung, Überarbeitung von Dialogen oder Questbildern, Spielbalance, neue Wirtschafts- oder Erkundungsregeln, neue Automatisierungsregeln, automatische Gewinnoptimierung und automatisch berechnete Handelsrouten. Bestehende Planetendarstellungen und Gebäudeansichten werden nicht als eigener Redesign-Auftrag erweitert. Änderungen an gemeinsamen UI-Bausteinen dürfen diese Ansichten nicht beschädigen.

Der Spielstand ist frisch. Eine Übernahme, Migration oder besondere Kompatibilität für bisherige Favoriten und Notizen wird nicht vorgesehen. Das Anlegen neuer Favoriten und Notizen gehört zum Umfang.

## 3. Ausgangslage

- `client/index.html`: separate Knöpfe für Marker, Routen, Favoriten, Almanach, Besitz, Konsortium, Nachfrage, Heimat/Start, Audio und Hilfe; Flotte als eigener Bereich.
- `client/js/ui/hud.js`: Hover-Hinweise enthalten vollständige Angebots- und Nachfragelisten samt Preisen.
- `client/js/ui/details.js`: viele kontextabhängige Informationen und Aktionen werden untereinander ausgegeben, einschließlich eigener Zielknöpfe je Schiff.
- `client/js/ui/favorites.js`: vorhandene Favoritenübersicht mit Waren-/Sektorfiltern und Routenaktionen als funktionaler Ausgangspunkt.
- `client/js/ui/routes.js`: Routenübersicht und separater Editor; bekannte Ziele als Dropdown, bis zu 16 Stopps und bestehende Handels-/Warteaktionen.
- `client/js/ui/planetPanel.js`: vorhandene Aufklappbereiche und Zustandserhaltung als mögliche technische Vorarbeit.

Diese Bestandsaufnahme dient der Umsetzung als Orientierung; sie schreibt keine bestimmte Komponentenstruktur vor.

## 4. Navigation und Pilotenprofil

Die Hauptnavigation bündelt die bisherigen Funktionen in vier beschriftete Einstiege:

| Einstieg | Unterpunkte und Aufgabe |
|---|---|
| Pilotenprofil | Profilinformationen sowie Besitz, Konsortium und Heimat; direkte Aktion „Heimat anzeigen“ |
| Handel & Routen | „Orte & Waren“ sowie „Meine Routen“; Nachfrage in den passenden Handelskontext integrieren |
| Wissen & Hilfe | Almanach und Hilfe |
| Einstellungen | Audio und weitere vorhandene allgemeine Einstellungen |

Die Flotte bleibt direkt erreichbar. Kartenmarker bleiben als kompakte Kartenfunktion erreichbar und benötigen keinen weiteren gleichrangigen Hauptmenüknopf. Die bisherige eigenständige Favoritenansicht und ihr Navigationsknopf entfallen. Vorhandene Tastaturzugänge werden auf die passenden neuen Bereiche geführt, soweit sie bestehen.

Das Pilotenprofil bündelt bestehende persönliche Informationen und Funktionen; es führt keine neue Fortschrittsmechanik ein. Bei der Umsetzung ist eine vollständige Zuordnung sämtlicher vorhandener Navigationseinträge zu dokumentieren, damit keine Funktion verloren geht.

## 5. Kompakte Ortsinformationen

### 5.1 Mouse-over

Hover-Hinweise für Planeten und Basen/Stationen enthalten ausschließlich Name, Ortstyp, Besitzer sowie Entfernung beziehungsweise Flugzeit, sofern ein geeigneter Schiffsbezug vorhanden ist. Fehlende Daten werden nicht durch erfundene Werte ersetzt. Vollständige Warenlisten, Preise und Aktionssammlungen entfallen im Hover.

Alle Informationen und Aktionen sind durch Anklicken beziehungsweise Tastatur und Touch erreichbar. Keine Funktion setzt Mouse-over voraus.

### 5.2 Anklicken und Informationstafel

Eine kompakte Kopfzusammenfassung zeigt die Ortsidentität und wenige wichtige, kontextabhängige Aktionen. Vertiefungen liegen in den Rubriken:

- Handel: Angebote, Nachfrage, Preise und passende Handelsaktionen.
- Infrastruktur & Dienste: vorhandene Einrichtungen und ortsgebundene Dienste, beispielsweise Werft, Module oder Warpservice.
- Aufträge: vorhandene Aufträge und zugehörige Statusinformationen.
- Besitz & Verwaltung: Eigentum, Heimat-/Kolonieverwaltung und passende Verwaltungsaktionen.

Weitere bestehende Informationen werden einer passenden Rubrik zugeordnet. Es werden nur verfügbare Rubriken angeboten; nicht zutreffende Bereiche erzeugen keine leeren Platzhalter. Ortsbeschreibungen bleiben kompakt, ausführliche Informationen werden eingeklappt.

Pro Informationstafel ist höchstens eine Rubrik gleichzeitig geöffnet. Die zuletzt gewählte Rubrik bleibt beim Ortswechsel geöffnet, wenn sie am neuen Ort verfügbar ist; andernfalls bleibt es bei der Zusammenfassung. Hauptnavigation und Routeneditor sind unabhängig von diesem Aufklappzustand.

Lange Knopflisten für einzelne eigene Schiffe werden durch eine kompakte Schiffs-/Aktionsauswahl ersetzt, unter Beibehaltung vorhandener Befehle und Berechtigungen. Häufige Aktionen dürfen durch die Bündelung keine unnötigen zusätzlichen Zwischenschritte erhalten.

## 6. Handelsübersicht: Orte & Waren

### 6.1 Orte, Daten und Zeilen

Die Liste umfasst alle bereits entdeckten Planeten und Basen/Stationen. Unentdeckte Orte bleiben verborgen; die Übersicht erweitert weder Sichtbarkeit noch Marktdatenzugriff. Bestehende weitere Routenzieltypen, beispielsweise Abbauziele, bleiben im Routeneditor erreichbar.

Ohne ausgewählte Ware erscheint eine kompakte Ortsübersicht. Bei ausgewählter Ware werden passende Handelsdaten ergänzt. Ortsidentität, Ortstyp, System, Sektor, Favoritenstatus sowie schiffsbezogene Entfernung/Flugzeit sind vergleichbar darstellbar; vertiefende Details und Notizen bleiben aufklappbar.

### 6.2 Filter und Sortierung

| Funktion | Verbindliches Verhalten |
|---|---|
| Namenssuche | Suche nach Ortsnamen, kombinierbar mit weiteren Filtern |
| Ortstyp | Planeten beziehungsweise Basen/Stationen gezielt auswählen |
| System und Sektor | Örtliche Eingrenzung; Sektor ausdrücklich als Filter und Sortierkriterium |
| Ware | Auswahl einer Ware als Bezug für Preise und Mengen |
| Hier kaufen | Orte mit Warenangebot; Preis ist der Einkaufspreis des Spielers |
| Hier verkaufen | Orte mit Nachfrage; Preis ist der Verkaufspreis des Spielers |
| Preisgrenze | Maximaler Einkaufspreis beziehungsweise minimaler Verkaufspreis |
| Menge | Verfügbarer Angebotsbestand beziehungsweise nachgefragte Menge, soweit bekannt |
| Favoriten | Nur Favoriten anzeigen oder Favoriten oben anheften |

Sortierbar sind Name, Ortstyp, System, Sektor, Entfernung, Flugzeit, Einkaufspreis, Verkaufspreis und Warenmenge. Jede Sortierung unterstützt beide Richtungen und zeigt die aktive Richtung an. Preis- und Mengensortierung beziehen sich auf die ausgewählte Ware und sind ohne diese nicht als scheinbar aussagekräftige Werte verfügbar. Gleichstände erhalten eine stabile Reihenfolge. Unbekannte Werte werden gekennzeichnet und nicht als Nullpreis behandelt.

Filter sind kombinierbar und können zurückgesetzt werden. Die aktive Filterung und ein leerer Trefferstand sind verständlich sichtbar. Ein leerer Trefferstand bietet einen direkten Weg zum Zurücksetzen.

### 6.3 Referenzschiff und Aktualisierung

Ein sichtbarer Schiffsselektor bestimmt den Bezug für Entfernung und Flugzeit. Beim Einstieg wird zunächst das aktuell ausgewählte Schiff übernommen. Ohne Referenzschiff bleiben Warenvergleich und Routenverwaltung nutzbar; schiffsabhängige Werte werden als nicht verfügbar dargestellt. Die Flugzeitanzeige verwendet die bestehende Berechnung und berücksichtigt deren bekannte Einschränkungen.

Verfügbare Preise und Bestände aktualisieren sich automatisch. Suchtext, Filter, Sortierung, Auswahl, Scrollposition, Referenzschiff und geöffnete Bereiche bleiben während der Sitzung erhalten. Bei Preissortierung werden aktualisierte Werte angezeigt, die Zeilenreihenfolge jedoch erst durch „Liste aktualisieren“ neu angewendet. Ein Hinweis macht eine ausstehende Neusortierung erkennbar. Laufende Datenaktualisierungen dürfen keine Zeile unter dem Zeiger austauschen; notwendige Änderungen an der Treffermenge werden ohne Verlust der Bedienposition übernommen beziehungsweise zum ausdrücklichen Aktualisieren vorgemerkt.

Fehlende Daten erscheinen als „unbekannt“. Preise dienen der Planung und garantieren keinen späteren Ausführungspreis. Die Übersicht verwendet dieselben spielerbezogenen Kauf-/Verkaufspreise und Handelsberechtigungen wie der bestehende Handel.

### 6.4 Ortsaktionen und Favoriten

Jeder Ort kann über einen Stern als Favorit markiert und wieder entfernt werden. Neue Notizen sind in einem aufklappbaren Detailbereich bearbeitbar. Ortsaktionen umfassen Ortsanzeige auf der Karte, verfügbare bestehende Anflug-/Handelsaktionen sowie „Neue Route ab hier“ und „Zu Route hinzufügen“. Seltene Aktionen liegen in einem kompakten Aktionsmenü.

## 7. Handelsübersicht: Meine Routen

„Meine Routen“ zeigt bestehende Routen, ihre Stopps, zugewiesene Schiffe und den vorhandenen Routenstatus. Aus beiden Unterbereichen ist der integrierte, aufklappbare Routeneditor erreichbar.

Der Editor unterstützt:

- Routen erstellen, benennen, ändern und löschen.
- Orte aus der Handelsübersicht als Stopps übernehmen; das Hinzufügen öffnet beziehungsweise verändert zunächst einen Entwurf.
- Stopps hinzufügen, entfernen und umordnen.
- Bestehende Aktionen Kaufen, Verkaufen, Abbau, Warten und Tanken mit ihren bisherigen Mengen-, Preis-, Bedingungs- und Zeitlimitfeldern bearbeiten, soweit am Ziel erlaubt.
- Bestehenden Mindestkontostand und bestehende Schiffszuweisung verwalten.
- Explizit speichern oder Änderungen verwerfen. Vor dem Speichern erfolgt keine Änderung der laufenden Route durch bloßes Bearbeiten eines Entwurfs.

Die bestehenden maximal 16 Stopps, Zielberechtigungen und Regeln für automatische Schiffe bleiben erhalten. Die Integration ersetzt keine manuellen Flugbefehle und verändert keine Wirtschaftssimulation.

Gespeicherte Änderungen wirken nach den bestehenden Regeln auf zugewiesene Schiffe; dies wird vor dem Speichern verständlich angezeigt. Vor dem Löschen erscheint eine Bestätigung mit betroffenen Schiffen und tatsächlicher Folge. Die bisherige Oberfläche beschreibt diese Folge als „Zugewiesene Schiffe werden untätig“; die Umsetzung muss dies mit dem Serververhalten abgleichen und korrekt wiedergeben. Bestehende Route-/Queue-Regeln werden nicht neu definiert.

## 8. Grafikstil und Bedienbarkeit

Die UI orientiert sich an den jüngsten Questbildern und freigegebenen Schiffen: erwachsener Fantasy-Sci-Fi-Comiclook mit technischen Instrumententafeln, dezenten Tuschekonturen, dunklen ruhigen Leseflächen, verwittertem Türkis, Ocker und sparsamen warmen Lichtakzenten.

Referenzen sind [die PRD-5-Bilddokumentation](art/prd5/README.md), die dort referenzierten Questbilder und [die Schiffsdesigns](PRD-6-schiffsdesigns.md). Vor der visuellen Umsetzung werden die tatsächlichen Referenzbilder betrachtet. Verzierungen konzentrieren sich auf Rahmen, Kopfzeilen und Symbole. Text bleibt als lesbarer UI-Text getrennt von dekorativen Bildern; Tabellen erhalten keine unruhigen Bildhintergründe.

Bedienelemente benötigen erkennbare Fokus-, Auswahl-, Offen-/Geschlossen- und deaktivierte Zustände. Favoriten und Statusinformationen sind nicht ausschließlich über Farbe erkennbar. Aufklappen und wesentliche Aktionen funktionieren per Tastatur, Klick und Touch.

Auf Desktop und in schmaleren Fenstern bleiben die Kernabläufe nutzbar. Bei wenig Platz stapeln sich Bereiche; Tabellen dürfen innerhalb ihres Bereichs horizontal scrollen. Primäre Aktionen und Schließen-/Zurück-Bedienung bleiben erreichbar. Nicht die gesamte Seite soll wegen einer breiten Tabelle horizontal überlaufen.

## 9. Umsetzungsschritte und Fortschritt

Planung:

- [x] Bestand und grafische Referenzen identifiziert; Anforderungen Q1–Q18 geklärt.
- [x] Gemeinsames Verständnis durch den Nutzer bestätigt; PRD erstellt.
- [x] Umsetzung separat beauftragt (2026-10-25).

Die folgenden Schritte sind geplant, noch nicht umgesetzt:

| Schritt | Ergebnis | Prüfungen vor dem jeweiligen Commit |
|---|---|---|
| U1: UI-Grundlagen und Navigation | Gemeinsame Gestaltung, vier Navigationseinstiege, Pilotenprofil und vollständige Funktionszuordnung | Alle bisherigen Funktionen auffindbar; Tastaturzugänge; visuelle Kontrolle breit/schmal |
| U2: Ortsinformationen | Kompaktes Hover, Zusammenfassung, Rubriken und kompakte Schiffsaktionen | Unterschiedliche Planeten-/Basentypen, verfügbare Aktionen, Zustandsübernahme und Eingabemethoden |
| U3: Orte und Waren | Gemeinsame Liste mit Filtern, Sortierung, Referenzschiff und stabilen Datenaktualisierungen | Kauf-/Verkaufsrichtung und Preise, Filterkombinationen, Sektor, unbekannte Werte, Zeilenstabilität |
| U4: Favoriten und Ortsaktionen | Sterne und neue Notizen integriert; separate Favoritenansicht entfernt | Anlegen/Entfernen, Notizen, Karten-/Handelsaktionen; keine verlorenen Einstiege |
| U5: Integrierte Routenverwaltung | Unterbereich Meine Routen und aufklappbarer Entwurfseditor | Erstellen/Ändern/Verwerfen/Löschen, Stopps und Aktionen, Schiffszuweisung, laufende Routen |
| U6: Gesamtprüfung und visuelle Abnahme | Zusammenhängende UI im bestätigten Stil, dokumentierte Prüfergebnisse | Kernabläufe, Regressionen, Desktop/schmal, Tastatur/Touch und Vergleich mit Bildreferenzen |

Nach jedem fachlich abgeschlossenen Schritt werden Fortschritt und Prüfergebnisse in diesem Dokument ergänzt und zusammen mit den zugehörigen Änderungen committet. Fehlgeschlagene oder nicht ausführbare Prüfungen werden dokumentiert und dem Nutzer mitgeteilt. Fremde Änderungen werden nicht mitcommittet. Ein Push bleibt zustimmungspflichtig.

## 10. Abnahmekriterien

- A1: Die Hauptnavigation hat die vier vereinbarten Gruppen; Flotte ist direkt erreichbar. Besitz, Konsortium und Heimat sind unter dem Pilotenprofil erreichbar, einschließlich „Heimat anzeigen“.
- A2: Keine bestehende Spielfunktion geht durch die Neuordnung verloren; die Zuordnung ist dokumentiert. Der separate Favoriteneinstieg entfällt.
- A3: Planeten-/Basen-Hover zeigt nur die vereinbarten Kerndaten und keine Waren- oder Aktionslisten.
- A4: Nach Anklicken bleibt die Ortsübersicht kompakt. Je Informationstafel ist höchstens eine Rubrik offen; die letzte verfügbare Rubrik wird beim Ortswechsel übernommen.
- A5: Die Handelsübersicht enthält bekannte Planeten und Stationen, ohne unentdeckte Orte oder nicht verfügbare Marktdaten offenzulegen.
- A6: Namens-, Typ-, System-, Sektor-, Waren-, Handelsrichtungs-, Preis-, Mengen- und Favoritenfilter sind kombinierbar. Alle vereinbarten Sortierungen funktionieren in beiden Richtungen; Favoriten lassen sich anheften.
- A7: „Hier kaufen“ und „Hier verkaufen“ zeigen die richtige Spielersicht und spielerbezogene Preise. Unbekannte Werte erscheinen nicht als günstige Nullwerte.
- A8: Das Referenzschiff ist sichtbar auswählbar; ohne Schiff bleiben Vergleich und Routenverwaltung nutzbar, ohne erfundene Flugzeiten.
- A9: Datenaktualisierungen erhalten Eingaben, Auswahl, Scrollposition und offene Bereiche. Bei Preissortierung springt die Reihenfolge erst nach „Liste aktualisieren“ auf die neu berechnete Ordnung.
- A10: Neue Favoriten und Notizen lassen sich vollständig in der Handelsübersicht verwalten. Die bisherige Favoritenansicht wird nicht mehr benötigt; eine Altbestandsmigration ist nicht Teil der Abnahme.
- A11: Eine Route kann aus einem Ort begonnen, um weitere Orte ergänzt, umgeordnet, mit Aktionen versehen, gespeichert, erneut bearbeitet und gelöscht werden. Änderungen bleiben bis zum Speichern ein Entwurf; Verwerfen lässt die bestehende Route unverändert.
- A12: Routenstatus und zugewiesene Schiffe sind erkennbar. Die Löschbestätigung nennt die tatsächlichen Folgen. Bestehende Stopplimits, Aktionsregeln und Schiffsbefehle bleiben gültig.
- A13: Karten-/Routen-/Profilnavigation, Informationstafeln und Handelsübersicht sind per Tastatur und ohne Hover bedienbar. In schmalen Fenstern bleiben Kernaktionen erreichbar und breite Tabellen scrollen lokal.
- A14: Die UI ist visuell mit den Questbildern und Schiffen abgestimmt; Texte und Tabellen bleiben ruhig und lesbar. Welt-, Planeten-, Schiffs- und Dialoggrafiken werden im Rahmen dieses PRD nicht neu gestaltet.

## 11. Prüfstrategie und Dokumentationsstand

Für die spätere Umsetzung werden gezielte funktionale Prüfungen für Filter-/Sortierlogik, Datenaktualisierung und Routenentwürfe mit den vorhandenen passenden Regressionstests kombiniert. Visuelle Browserprüfungen decken Navigation, Ortsinformationen, Handelsvergleich und Routenverwaltung auf Desktop und in schmalen Fenstern ab. Aufklappzustände, Tastaturfokus, unbekannte Daten, leere Trefferlisten und laufende Routen werden ausdrücklich geprüft.

Für diesen Dokumentationsauftrag: Inhalt gegen die bestätigten Interviewentscheidungen und Umfangsgrenzen prüfen, Links kontrollieren und `git diff --check` ausführen. Spieltests sind für die reine PRD-Erstellung nicht erforderlich. Umsetzung und visuelle Abnahme sind offen.

## Umsetzungsprotokoll

U1: Vier native, per Tastatur/Touch bedienbare Navigationsgruppen und gemeinsamer Instrumententafelstil eingerichtet. Referenzbilder style-sample.png und civilian-approved.png vor der Gestaltung betrachtet. Zuordnung: Besitz/B, Konsortium/K und Heimat/Start → Pilotenprofil mit Lizenz-/Levelinformationen; Favoriten/F → Orte & Waren; Routen/R → Meine Routen; Nachfrage und Stop-Loss → Handel & Routen; Almanach/A und Hilfe → Wissen & Hilfe; Audio → Einstellungen; Marker/Zoom → kompakte Kartenfunktion; Flotte/Gruppen bleiben direkt sichtbar. Syntax und Diff geprüft; visuelle Gesamtprüfung folgt in U6.

U2: Orts-Hover auf Identität, Besitzer und schiffsbezogene Entfernung/Flugzeit reduziert. Ortsfunktionen in bedarfsabhängige Rubriken überführt; native Aufklappbereiche mit höchstens einer offenen Rubrik und Übernahme beim Ortswechsel. Schiffsauswahl und direkter Anflug ersetzen die Knöpfe je Flottenschiff; angedockte Schiffsauswahl bestimmt Handelsaktionen. Landen/Favorit bleiben im Kopf. Syntax-/Diff-Prüfung erfolgreich; Interaktionsprüfung folgt U6.
