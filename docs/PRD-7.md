# PRD 7 – Pilotenprofil, Questführung und planetare Fernverwaltung

Stand: 2026-10-25 · Status: Planung abgeschlossen, Umsetzung ausstehend

## 1. Ziel und Freigabe

Spieler erhalten einen persönlichen Überblick über Fortschritt und Erfolge, verlässliche Questführung und eine nachvollziehbar in der Geschichte verankerte Fernverwaltung ihrer Ruinenplaneten. Das Rathaus bündelt laufende Aufgaben und planetare Kennzahlen. Kartenbedienelemente werden korrigiert.

Die Anforderungen wurden mit dem ausdrücklich gewünschten Skill `grilling` in drei Fragerunden Q1–Q16 abgestimmt. Dieses Dokument hält die bestätigten Entscheidungen fest. Der aktuelle Auftrag umfasst Erstellung und Commit des PRD; die Implementierung erfolgt nach gesondertem Auftrag. Ein Push benötigt Zustimmung.

Dieses PRD ergänzt die bisherigen PRDs, insbesondere die Navigation aus PRD 6. Bestehende Fortschritts-, Wirtschafts- und Rufmechaniken werden nicht neu ausbalanciert.

## 2. Ausgangslage

- Das Pilotenprofil ist bisher ein Navigationscontainer mit persönlichen Basiswerten und Funktionszugängen, keine eigene Informationsseite.
- Fraktionsruf wird bereits gespeichert. Die vorhandenen Stufen sind Fremder, Partner, Vertrauter und Ehrenmitglied mit Schwellen 0/100/400/1200.
- Normale Missionen decken bereits mehrere Zielarten bei Annahme auf. Eine einheitliche Regel und Prüfung über alle Missionsarten fehlen.
- H3 und H4 werden nach H2 gleichzeitig verfügbar. H3 besitzt bislang keinen eigenen erzählerischen Einleitungsdialog; Dialoganzeige und tatsächlicher Queststart sind nicht zuverlässig gekoppelt.
- Das H4-Wrack wird um den Heimatplaneten erzeugt und dem Heimatsystem zugeordnet, ohne seine sichtbare Lage geometrisch sicher auf dieses System zu begrenzen.
- Die Werkstattübergabe startet eine Reparatur des Antriebs. Der Antrieb kann später eingebaut, ausgebaut und gelagert werden.
- Der Client verlangt für den Planetenzugang bislang ein gelandetes eigenes Schiff. Serverseitige Verwaltungsaktionen prüfen teilweise bereits Funkabdeckung des Planeten. Diese Regeln müssen vereinheitlicht werden.
- Die im Auftrag als Funkzentrale bezeichnete Infrastruktur heißt im Spiel Leitstelle. Das eigene Funknetz setzt sich aus eigenen Standorten zusammen; Konsortialabdeckung zählt nicht dazu.
- Das Heimatjournal zeigt auch zukünftige und abgeschlossene Quests. Planetare Bestands-, Produktions- und Versorgungsdaten sind teilweise bereits vorhanden.
- Die Kartenanzeige schreibt einen Text wie „Ansicht: System“. Der Markerknopf liegt bereits im Topbar-Markup; seine Darstellung benötigt eine Layoutkorrektur.

## 3. Umfang

Enthalten: neue Profilseite, Rufdarstellung und Statistiken, Missionszielaufdeckung, persistente Queststart-Warteschlange, lokales H4-Wrack, Hauptschiff und Fernverwaltung, Überarbeitung sämtlicher vorhandener Questtexte, Rathaus mit aktiven Quests und Planetenübersicht, Planetennamen samt Cooldown sowie Karten-UI-Korrektur.

Nicht enthalten: neue Questketten, neue Rufstufen, Änderungen an Missionsbedingungen oder Belohnungsbalance, neue Funknetzmechaniken und Ferntransport von Waren. Eine nachträgliche H4-Erklärung oder besondere Behandlung bereits abgeschlossener H4-Spielstände ist ausdrücklich unnötig: Noch niemand hat H4 abgeschlossen. Die Korrektur bestehender, noch nicht geborgener Wracks bleibt Bestandteil.

## 4. Pilotenprofil und Kennzahlen

### 4.1 Zugang und Inhalte

Im Pilotenprofil wird eine eigene Informationsseite erreichbar. Die bisherigen Zugänge zu Besitz, Konsortium und Heimat bleiben erhalten. Die Seite bündelt:

| Gruppe | Inhalte |
| --- | --- |
| Spieler | Name, Level und EP, Pilotenlizenz, Gouverneursstufe |
| Ruf | Je Fraktion Rang, Punkte und Fortschritt zur nächsten Stufe; höchste Stufe als erreicht darstellen |
| Finanzen | Aktuelle Credits, kumulierter Handelsumsatz, kumulierter Handelsgewinn |
| Erfolge | Entdeckte Systeme und Planeten, abgeschlossene Missionen, gewonnene Kämpfe |
| Besitz | Anzahl eigener Schiffe und Planeten, Kennzeichnung des Hauptschiffs |

Vorhandene verlässliche Daten werden übernommen. Nicht rekonstruierbare historische Werte werden nicht erfunden; neue Zähler tragen eine verständliche Kennzeichnung „seit Einführung erfasst“. Unbekannt und null dürfen nicht verwechselt werden. Kennzahlen müssen über Neuladen und Serverneustart erhalten bleiben.

### 4.2 Handelswerte

Handelsumsatz ist der tatsächliche Erlös aus Warenverkäufen, einschließlich automatisierter Handelsrouten. Handelsgewinn ist dieser Erlös abzüglich der zugehörigen Einkaufskosten verkaufter Waren. Questbelohnungen und sonstige Geldquellen sind ausgeschlossen. Warenzukäufe sind nicht sofort negative realisierte Gewinne.

Bestehende belastbare Kosten- und Gewinnermittlung wird verwendet, soweit sie diese Definition erfüllt. Für fehlende historische Einkaufskosten wird kein scheinbar exakter Gewinn ausgewiesen. Bei der Umsetzung sind Kostenbewertung und Umgang mit Waren ohne Einkaufskosten ausdrücklich zu dokumentieren und anhand bestehender Wirtschaftsregeln zu prüfen; diese technische Festlegung darf keine erfundenen historischen Kosten einführen.

## 5. Missionsziele und Queststart

### 5.1 Sichtbarkeit

Sobald eine Mission tatsächlich startet, werden ihre benötigten Zielorte samt minimal erforderlichem Kartenkontext dauerhaft aufgedeckt. Dazu gehören je nach Mission Abholung, Lieferung, Zwischenstopps, Wrack und andere anzufliegende Ziele. Die Aufdeckung verrät weder die umliegende Region noch Ziele späterer Quests. Bestehende ausdrücklich auf Erkundung ausgelegte Missionsmechaniken bleiben erhalten.

Bei gewöhnlichen Aufträgen gilt die Annahme als Start. Bei wartenden Folgequests gilt die tatsächliche Aktivierung gemäß Abschnitt 5.2. Bereits aufgedeckte Ziele bleiben nach Abschluss sichtbar. Bei gestuften Missionen werden nur die für den aktuellen bekannten Auftrag benötigten Ziele veröffentlicht.

### 5.2 Persistente Aktivierungsreihenfolge

Wenn mehrere Quests gleichzeitig startbereit werden, werden sie in einer stabilen, fachlich definierten Reihenfolge vorgemerkt. In der Hauptgeschichte gilt die Questnummernfolge, insbesondere H3 vor H4.

Eine Quest wird aktiviert und erhält ihren Einleitungsdialog und Journaleintrag. Erst wenn der Spieler diesen Text ausdrücklich geschlossen beziehungsweise bestätigt hat, darf die nächste wartende Quest tatsächlich starten. Deren Fortschrittsbedingungen und Zielaufdeckung dürfen nicht vorzeitig wirksam werden. Eine bereits vorgestellte Quest muss nicht abgeschlossen sein, bevor die nächste Einleitung erscheint.

H3 erhält einen eigenen Einleitungstext. Pending-, Aktivierungs- und Bestätigungszustand werden gespeichert. Neuladen, Abmelden und erneutes Verbinden dürfen keine Quest verlieren, doppelt starten oder einen unbestätigten Text überspringen. Dialoge werden durch Renderzyklen nicht ersetzt. Die Reihenfolge und Journaleinträge müssen auch bei mehreren gleichzeitig erfüllten Voraussetzungen nachvollziehbar bleiben.

## 6. H4-Wrack und Hauptschiff

### 6.1 Wrackplatzierung

Das mysteriöse Wrack liegt bevorzugt innerhalb der geometrischen Grenzen des eigenen Heimatsystems, erreichbar und mit sinnvoller Kollisionsfreiheit. Nur wenn dort keine geeignete Position verfügbar ist, wird es unmittelbar außerhalb der Systemgrenze platziert. Eine bloße System-ID-Zuordnung erfüllt diese Anforderung nicht.

Der Platzierungsalgorithmus benötigt einen begrenzten Suchlauf und eine definierte grenznahe Ausweichposition statt einer unkontrollierten Verlagerung in die Ferne. Der verwendete Grenzabstand wird bei Umsetzung anhand der vorhandenen Kartenmaße dokumentiert und geprüft. Bestehende, noch nicht geborgene H4-Wracks außerhalb dieses Bereichs werden korrigiert; gültige Positionen bleiben erhalten. Questreferenzen und Zielmarker bleiben konsistent.

### 6.2 Hauptschiff

Das eigene Schiff mit eingebautem mysteriösem Antrieb gilt automatisch als Hauptschiff. Es ist im Pilotenprofil und in der Schiffsübersicht sichtbar gekennzeichnet. Die Rolle hängt am eingebauten Antrieb, nicht an der gerade ausgewählten oder manuell gesteuerten Einheit.

Beim Ausbau gibt es bis zum erneuten Einbau kein Hauptschiff. Ein Transfer des Antriebs überträgt die Rolle automatisch. Ein gelagerter Antrieb verleiht weder Hauptschiffstatus noch Fernverwaltungszugriff. Die bestehende Einzigartigkeit des Questgegenstands darf durch Einbau, Ausbau oder Wiederverbinden nicht verletzt werden.

## 7. Fernverwaltung der Ruinenplaneten

### 7.1 Erzählerische Freischaltung

Bei der H4-Abgabe des Antriebs in der Werkstatt erscheint ein Questfenster. Es erklärt stimmungsvoll, dass neben der Antriebstechnik ein fortgeschrittenes Kommunikationsmodul entdeckt wurde. Dieses ermöglicht die Verwaltung der eigenen Ruinenwelten über das Funknetz.

Der Text unterscheidet die Entdeckung von der tatsächlichen Betriebsbereitschaft: Nutzbar wird die Fähigkeit nach Reparatur und Einbau des Antriebs. Eine zusätzliche Nachholanzeige für frühere H4-Abschlüsse wird nicht implementiert.

### 7.2 Zugriffsregeln

Fernverwaltung ist möglich, wenn der reparierte mysteriöse Antrieb in einem eigenen Schiff eingebaut ist und dieses Hauptschiff innerhalb des eigenen Leitstellen-Funknetzes liegt. Die Auswahl des Schiffs ist unerheblich. Konsortialnetze zählen nicht. Die Bedingung bezieht sich auf den Standort des Hauptschiffs, nicht ersatzweise auf Funkabdeckung des verwalteten Planeten.

Die Fähigkeit gilt für alle eigenen Ruinenplaneten. Ohne Landung können deren Ansichten geöffnet und Verwaltungsaktionen wie Bauen, Produktion und Rathaus genutzt werden. Physische Aktionen wie Warenumladen, Gegenstandsübergabe, Antriebsarbeiten und andere ortsgebundene Lieferungen benötigen weiterhin die jeweils erforderliche Anwesenheit beziehungsweise Landung.

Client und Server verwenden dieselben fachlichen Regeln; der Server prüft Eigentum, Antrieb und aktuelle Reichweite bei jeder Verwaltungsaktion. Bestehende abweichende Zugriffspfade sind anzupassen.

### 7.3 Verbindungsverlust

Verlässt das Hauptschiff die Funkabdeckung oder wird der Antrieb ausgebaut, endet die Fernsteuerung sofort. Eine geöffnete Planetenansicht bleibt sichtbar, kennzeichnet den Verbindungsverlust und sperrt weitere Fernverwaltungsaktionen. Bereits laufende Produktionen und Bauaufträge laufen weiter. Bei wiederhergestellter Verbindung werden die Aktionen erneut verfügbar.

Lokale Verwaltung nach den bestehenden Landeregeln bleibt möglich, auch ohne Fernverbindung. Ein Netzverlust darf eine legitim lokal verfügbare Aktion nicht sperren.

## 8. Rathaus

### 8.1 Bezeichnung und Aufgaben

Das Gebäude Heimatjournal heißt künftig Rathaus. Sichtbare Gebäudebezeichnungen, Texte und Verweise werden konsistent angepasst; bestehender Gebäude- und Questfortschritt bleibt erhalten.

Das Rathaus zeigt ausschließlich aktuell laufende Quests. Zukünftige Quests sind einschließlich Titel und Vorschauen verborgen. Abgeschlossene Quests verschwinden aus der aktiven Liste. Bereits erlebte Geschichten bleiben über ein getrenntes Archiv nachlesbar; dieses darf keine zukünftigen Inhalte verraten.

Vorhandene weitere Rathausfunktionen bleiben erreichbar, soweit dieses PRD sie nicht ausdrücklich verändert.

### 8.2 Aufklappbare Planetenübersicht

Das Rathaus erhält einen aufklappbaren Bereich „Planetenübersicht“ mit:

- Bevölkerung und Wohnraum;
- Energieerzeugung und -bedarf;
- Lagerbeständen;
- Produktion und Verbrauch pro Stunde;
- Engpässen und relevanter Personalversorgung;
- laufendem Bau- und Ausbildungsfortschritt.

Die Werte stammen aus der tatsächlichen Simulation. Raten und Bestände werden klar unterschieden; fehlende Produktion wird nicht als laufende Produktion dargestellt. Die Übersicht ist lokal und bei gültiger Fernverbindung erreichbar.

### 8.3 Planetennamen

Der Eigentümer kann jeden eigenen Ruinenplaneten im jeweiligen Rathaus umbenennen. Die erste Änderung ist sofort möglich. Jede erfolgreiche Namensänderung startet für diesen Planeten einen eigenen Cooldown von 24 real verstrichenen Stunden, einschließlich Offlinezeit und Serverstillstand.

Namen haben nach Entfernen äußerer Leerzeichen 3–32 Zeichen. Umlaute, Leerzeichen und Bindestriche sind zulässig; leere Namen und Steuerzeichen werden abgewiesen. Gleiche Namen verschiedener Planeten sind erlaubt. Das unveränderte erneute Speichern eines Namens ist keine Namensänderung und verbraucht keinen Cooldown.

Der Server validiert Eigentum, Namen und Cooldown und speichert den Zeitpunkt dauerhaft. Das Rathaus zeigt Namen und gegebenenfalls verbleibende Wartezeit. Ein geänderter Name erscheint konsistent in Karte, Profil/Besitz, Planetensicht und dynamischen Zielreferenzen; stabile interne Orts-IDs bleiben erhalten.

## 9. Questtexte und Kartenoberfläche

### 9.1 Redaktion

Sämtliche vorhandenen Questtexte werden überarbeitet: Hauptgeschichte sowie gewöhnliche beziehungsweise generierte Missionsarten einschließlich Schmuggel, soweit vorhanden. Das umfasst Einleitungen, Beschreibungen, Hinweise, Abschluss- und Journaltexte.

Figuren, Handlung, Missionsbedingungen und Belohnungen bleiben erhalten. Texte vermitteln Atmosphäre, Motive und Ingame-Lore und erklären zugleich verständlich, was der Spieler als Nächstes tun soll, wo und warum. Technische Implementierungsbegriffe und handbuchartige Formulierungen werden durch passende erzählerische Hinweise ersetzt. Konkrete Zielnamen und relevante Bedingungen müssen dennoch eindeutig erkennbar bleiben. Keine Vorwegnahme späterer Geheimnisse.

H3-Einleitung und H4-Kommunikationsmodul-Erklärung sind ausdrücklich Bestandteil. Variablentexte müssen auch mit umbenannten Planeten grammatisch und sachlich funktionieren.

### 9.2 Karte

Die Bemerkung zur aktuellen Ansicht („Ansicht: Planet/System/Sektor/Galaxie“) entfällt. Die Schaltfläche „Marker: Farbe“ wird funktionsfähig und sauber in den oberen Balken integriert. Sie darf bei den unterstützten Fenstergrößen weder überlagert noch abgeschnitten sein. Bestehende Markerbedienung bleibt erhalten.

## 10. Umsetzungsschritte und Fortschritt

Jeder Schritt wird mit passenden Prüfungen abgeschlossen. Fortschritt und Prüfergebnis werden im selben Commit dokumentiert. Sachfremde Änderungen werden nicht aufgenommen.

| Schritt | Arbeitspaket | Abhängigkeit | Status |
| --- | --- | --- | --- |
| P0 | Anforderungen abstimmen, PRD erstellen und committen | – | Abgeschlossen (Planungscommit) |
| U1 | Questaktivierungszustände und Dialogwarteschlange; H3-Einleitung; einheitliche Zielaufdeckung | P0, Umsetzungsauftrag | Offen |
| U2 | H4-Wrack lokal platzieren und vorhandene ungeborgene Ausreißer korrigieren | U1 | Offen |
| U3 | Hauptschiff ableiten, H4-Erklärung, Fernzugriff und Verbindungsverlust konsistent umsetzen | U1 | Offen |
| U4 | Rathaus umbenennen, aktive Quests/Archiv trennen, Planetenübersicht und Namensänderung | U1, U3 | Offen |
| U5 | Verlässliche Profilstatistiken, Handelszählung und neue Profilseite | U3 | Offen |
| U6 | Gesamte Questredaktion und Karten-Topbar korrigieren | U1–U5 für finale Textbezüge | Offen |
| U7 | Integrierte Prüfung, verbleibende Fehler beheben, Abnahme dokumentieren | U1–U6 | Offen |

## 11. Abnahmekriterien und Prüfplan

### A. Profil

- Profilseite und bisherige Navigationsfunktionen sind erreichbar.
- Alle vereinbarten Informationen erscheinen mit korrekten Einheiten; Rufschwellen und höchster Rang funktionieren.
- Manuelle und automatisierte Verkäufe zählen genau einmal; reine Einkäufe und Questbelohnungen erhöhen den Verkaufsumsatz nicht.
- Teilverkäufe und fehlende historische Einkaufskosten erzeugen keine erfundenen Gewinne; neue Zähler sind entsprechend gekennzeichnet und persistent.

### B. Quests und Karte

- Nach H2 erscheint zuerst H3 samt Einleitung und Journaleintrag. Vor dessen Bestätigung startet H4 nicht.
- Nach Bestätigung folgt H4 genau einmal; Neuladen während jeder Phase erhält Reihenfolge und Dialogzustand.
- Missionsstart deckt benötigte aktuelle Ziele auf, einschließlich Abholung, Zwischenstopps und H4-Wrack; spätere Ziele und fremde Umgebung bleiben verborgen.
- Die Entdeckung bleibt nach Abschluss erhalten.
- Wrackplatzierung wird anhand tatsächlicher Koordinaten innerhalb beziehungsweise unmittelbar an der Heimatsystemgrenze geprüft, einschließlich Platzmangel und bestehender ungeborgener Ausreißer.

### C. Hauptschiff und Fernverwaltung

- Reparatur, Einbau, Ausbau und Schiffwechsel übertragen beziehungsweise entfernen Hauptschiffstatus korrekt.
- Fernverwaltung funktioniert mit nicht ausgewähltem Hauptschiff in eigener Funkabdeckung für mehrere eigene Ruinenplaneten.
- Ein gelagerter Antrieb, fremdes Eigentum oder alleinige Abdeckung des Zielplaneten gewähren keinen Fernzugriff.
- Reichweitenverlust während geöffneter Ansicht sperrt weitere Remoteaktionen auch serverseitig; Wiederkehr stellt Zugriff wieder her.
- Produktion/Bau laufen weiter; lokale Verwaltung bei Landung bleibt möglich; physische Transfers sind ohne passende Anwesenheit gesperrt.
- Werkstattdialog erklärt Kommunikationsmodul und nötigen reparierten Einbau ohne einen verfrühten Freischaltungsanspruch.

### D. Rathaus

- Rathaus zeigt nur laufende Quests; Archiv enthält nur bereits erlebte Inhalte.
- Planetenübersicht lässt sich aufklappen und entspricht tatsächlichen Beständen, Raten und Aufträgen.
- Erstes Umbenennen, ungültige Namen, identischer Name, fremdes Eigentum, unabhängige Cooldowns mehrerer Planeten und die 24-Stunden-Grenze werden geprüft.
- Cooldown übersteht Neustart; der Name ist in allen dynamischen Ortsreferenzen konsistent.

### E. Redaktion und Oberfläche

- Alle Questtextquellen sind inventarisiert und redaktionell geprüft; Handlung und Bedingungen stimmen mit der Simulation überein.
- H3 und H4 sind verständlich, stimmungsvoll und frei von späteren Spoilern.
- Ansichtsvermerk fehlt; Markerknopf ist im Topbar sichtbar, bedienbar und ohne Überlagerung bei unterstützten Fenstergrößen.

Die Umsetzung nutzt vorhandene Projektprüfungen und ergänzt gezielte Tests für Zustandsübergänge, Zeitgrenzen, Berechtigungen und Zähler. Visuelle und erzählerische Kriterien werden zusätzlich manuell im Spiel geprüft. Nicht ausführbare oder fehlgeschlagene Prüfungen werden ausdrücklich dokumentiert. Ein reiner Dokumentationscommit benötigt keine Spieltests.

## 12. Entscheidungsnachweis

- Q1–Q6: Gesamter Umfang, Profil, minimale dauerhafte Zielaufdeckung, vollwertige Verwaltung ohne physische Transfers, gesamte Questredaktion und reale 24-Stunden-Namenssperre bestätigt.
- Q7: Tatsächlicher Queststart wird bis zum Schließen des vorangehenden Einleitungstexts verzögert; persistente Reihenfolge bestätigt.
- Q8–Q9: Eingebauter Antrieb in einem eigenen Schiff innerhalb des eigenen Netzes; dieses ist das Hauptschiff. Alle eigenen Ruinenplaneten; Sperre bei Verbindungsverlust bestätigt.
- Q10–Q12: Aktive Quests plus separates Archiv, aufklappbare Planetenübersicht, Umbenennung pro Ruinenplanet und Korrektur noch ungeborgener Wracks bestätigt.
- Q13: Vereinbarte Profilwerte und kenntlich gemachte neue Langzeitzähler bestätigt.
- Q14: Hauptschiffrolle folgt dem eingebauten Antrieb, sichtbare Kennzeichnung und Entfall beim Ausbau bestätigt.
- Q15: Keine besondere Rücksicht auf abgeschlossene H4-Spielstände erforderlich; noch niemand hat H4 abgeschlossen.
- Q16: Tatsächliche Warenverkäufe einschließlich Routen, Gewinn nach zugehörigen Einkaufskosten, keine Questbelohnungen und keine erfundenen historischen Gewinne bestätigt.
