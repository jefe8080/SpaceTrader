# PRD 17: Doppelwerft, aufklappbare Menüs und ziviler Verbrauch

## Ziel und Freigabestand

Der große Orbitalring erhält eine Doppelwerft für zwei beliebige gleichzeitige
Schiffsaufträge. Bau- und Informationsmenüs werden übersichtlicher, Wohnhäuser
passen optisch besser zur Stadt und verbündete Abfangbereiche werden sichtbar.
Die zivile Konsumkasse entfällt vollständig: Bevölkerungsverbrauch und
touristisches Reisegeld werden durch neu erzeugtes Geld finanziert.

Am 31.10.2026 mit dem Skill `grilling` in Q1–Q15 und abschließender Ergänzung
abgestimmt und vom Nutzer bestätigt. Freigegeben sind die Erstellung und der
Commit dieses PRD. Die Umsetzung bleibt offen; dieses Dokument ist kein
Nachweis bereits implementierter Funktionen.

## 1. Orbitalring Stufe 2: Upgrade Doppelwerft

- Nach Fertigstellung des Orbitalrings Stufe 2 ist das einmalige Upgrade
  „Doppelwerft“ verfügbar, ohne zusätzliche Questvoraussetzung.
- Kosten: 100 Legierungen, 30 Schiffsbauteile, 10 Triebwerke und 4 Reaktorkerne;
  keine zusätzliche Creditgebühr. Bauzeit: **600 Sekunden**.
- Materialien werden einmalig beim Start gebunden. Mehrfachstarts und doppelte
  Abbuchungen sind ausgeschlossen. Laufende Schiffsaufträge dürfen weiterlaufen.
- Ohne Upgrade bleibt das bisherige System erhalten: ein Platz für kleine
  Schiffe bis M und ein Platz für große Schiffe L/XL.
- Mit Upgrade gibt es insgesamt zwei frei belegbare Plätze, auch für S+S,
  M+M oder XL+XL. Es entstehen keine vier parallelen Bauplätze.
- Beide Plätze arbeiten mit normaler Baugeschwindigkeit. Bestehende Lizenzen,
  Baupläne, Fraktionsränge, Materialkosten und das Ausgabelimit von zwölf
  fertigen beziehungsweise in Bau befindlichen Schiffen bleiben gültig.
- Nach dem Upgrade arbeitet jeder Auftrag unabhängig: bis M benötigt er
  20 Energie, 8 einfache und 6 qualifizierte Arbeiter; L/XL benötigt er
  80 Energie, 8 einfache und 16 qualifizierte Arbeiter sowie 4 Spezialisten.
  Leere Plätze benötigen keinen laufenden Betrieb.
- Die Bedarfe addieren sich. Damit benötigt beispielsweise S+L nach dem Upgrade
  100 Energie statt des bisherigen gemeinsamen Bedarfs von 80 Energie.
  Fehlende Versorgung pausiert den betroffenen Auftrag; es gibt keine feste
  Abhängigkeit zwischen den beiden Plätzen. Die vorhandene Zuteilung entscheidet
  bei knappen Ressourcen nachvollziehbar, welcher Auftrag arbeiten kann.
- Upgradezustand, laufender Ausbau und Aufträge bleiben beim Speichern und Laden
  erhalten. Alte Aufträge bleiben bei der Umstellung eindeutig zugeordnet.

Abnahme: Upgrade kostet genau die genannten Materialien und dauert 600 Sekunden.
Zwei beliebige zulässige Schiffe werden gleichzeitig fertiggestellt, ohne dritte
Belegung, Verlust oder doppelte Ausgabe. Versorgung und Pause sind je Auftrag
korrekt; Ausbau und Neuladen verändern bestehende Aufträge nicht ungewollt.

## 2. Aufklappbares Orbitalring-Baumenü

- Die Kategorien Zivil, Multifunktion und Kriegsschiff sind einzeln aufklappbar
  und beim ersten Öffnen geschlossen. Mehrere dürfen gleichzeitig offen sein.
- Kategorieüberschriften zeigen Pfeil und Schiffanzahl. Der gewählte offene
  oder geschlossene Zustand bleibt bei automatischen Aktualisierungen erhalten.
- Einheitliche Schiffskarten zeigen Bild, Name, Größenklasse, relevante Werte,
  Material- und gegebenenfalls Fraktionskosten, Bauzeit und eine klare Bauaktion.
  Bestehende Größen-/Preissortierung, Fraktionsfarben und vier Bewertungen bleiben.
- Bauplatzstatus und Upgradeaktion sind klar erkennbar. Nicht mögliche Aktionen
  zeigen einen konkreten Sperrgrund, etwa fehlende Lizenz, Materialien oder Plätze.
- Gestaltung folgt der vorhandenen Spieloptik mit klarer Hierarchie, lesbaren
  Abständen und gut bedienbaren Aufklappflächen. Auch schmale und flache Fenster
  lassen sämtliche Inhalte und Aktionen erreichen.

Abnahme: Jeder baubare Typ erscheint genau einmal in der richtigen Kategorie.
Aufklappen, Bauen und regelmäßige Aktualisierungen funktionieren ohne
Zustandsverlust; Karten und Bauplatzanzeige sind visuell geprüft.

## 3. Schiffsalmanach

- Jeder Schiffseintrag hat einen eigenen, standardmäßig geschlossenen Bereich
  „Details“.
- Dauerhaft sichtbar bleiben Bild, Name, Klasse und Fraktion sowie die
  Spezialfähigkeiten. Im oberen Wertebereich stehen Laderaum, Tempo, Tank,
  Preis und Material; tatsächliche Baumaterialien werden auch für
  Fraktionsschiffe angezeigt.
- Im unteren Bereich bleiben Tempo, Verteidigung, Frachtraum und Angriff
  jeweils als Bewertung x/5 sichtbar.
- Beschreibung, Bergbauwert und zusätzliche technische Kampfdetails wie
  Lebenspunkte, Schild, Panzerung und Bewaffnung stehen im aufklappbaren Bereich.
- Werte und Bewertungen stammen weiterhin aus den tatsächlichen Spieldaten.
  Aktualisierungen dürfen einen geöffneten Detailbereich nicht wieder schließen.

Abnahme: Im geschlossenen Zustand sind genau die vereinbarten Informationen
sichtbar; Spezialfähigkeiten bleiben außen, Bergbau steht innen. Alle Details
sind erreichbar und Materialkosten stimmen auch bei Fraktionsschiffen.

## 4. Wohnhausgröße

- Die vorhandenen Wohnhausgrafiken aller drei Ausbaustufen werden in der
  Planetenansicht kleiner dargestellt und an Bauplatzfläche und Nachbargebäude
  angepasst. Höhere Stufen bleiben als größere Ausbaustufen erkennbar.
- Auswahlflächen und Beschriftungen passen zur Darstellung, auch bei Zoom.
- Wohnkapazität, Baukosten und sonstige Spielwerte bleiben unverändert.

Abnahme: Alle drei Stufen sind neben anderen baubaren Gebäuden visuell geprüft,
wirken angemessen proportioniert und lassen sich zuverlässig auswählen.

## 5. Aufklappbare Rathausbereiche

- „Eigene Welten und Expeditionen“ bleibt ein gemeinsamer Unterpunkt und wird
  als Ganzes aufklappbar. Der Warpservice erhält einen eigenen Aufklappbereich.
- Beide Bereiche sind beim ersten Öffnen geschlossen und unabhängig bedienbar.
  Anzahl beziehungsweise laufende Aktivitäten bleiben im geschlossenen Kopf
  erkennbar. Automatische Aktualisierungen erhalten den Öffnungszustand.
- Dies gilt für alle Rathausansichten, in denen diese Bereiche vorkommen.
  Bestehende Freischaltungen, Sperrfristen und Aktionen bleiben wirksam.

Abnahme: Zwei getrennte Aufklappbereiche, keine Trennung von Welten und
Expeditionen. Laufende Vorgänge bleiben erkennbar; Aktionen sind nach dem
Aufklappen vollständig bedienbar.

## 6. Abfangreichweite beim Hover

- Beim Hover über eigene oder verbündete Kriegsschiffe in Haltung „Abfangen“
  erscheint ein sehr transparenter Kreis mit feiner Kontur. Dies gilt auch für
  den dargestellten Anführer einer entsprechenden militärischen Schiffsgruppe.
- Mittelpunkt ist die aktuelle Schiffsposition; Radius und Berechtigung folgen
  den tatsächlichen Abfangregeln, einschließlich der bisherigen Standardhaltung.
- Die Markierung verschwindet beim Hoverende und erscheint weder bei Gegnern
  noch bei anderen Haltungen. System- und Sektoransicht berücksichtigen Zoom
  und Koordinaten korrekt.

Abnahme: Eigene und verbündete Einzelschiffe und Gruppen zeigen die tatsächliche
Reichweite dezent an; Gegner und ungeeignete Haltungen zeigen keinen Kreis.

## 7. Ziviles Konsumkonto vollständig entfernen

### Geltungsbereich und Warenverbrauch

- Die Änderung gilt für **alle Weltraumobjekte mit entsprechender Zivilwirtschaft**,
  ausdrücklich auch Spezialplaneten und Stationen wie Orbitalhotels. Sie ist
  nicht auf klassische oder eigene Planeten beschränkt.
- Das zivile Konsumbudget entfällt vollständig, einschließlich Kontoführung,
  Auffüllung, Obergrenze, Abbuchung und UI-Anzeigen. Es bleibt keine Reisekasse
  als Ersatz zurück. Andere Konten, etwa NPC-Beschaffungs- und Betreiberkonten,
  werden dadurch nicht abgeschafft.
- Betroffen sind Wasser, Nahrung, Kleidung, Medizin und Konsumgüter für den
  Bevölkerungsverbrauch. Bisherige Nachfrageberechnung, Preisabhängigkeit,
  Verbrauchsraten, verfügbare Bestände und geschützte Reserven bleiben gültig.
- Fehlendes Bürgergeld begrenzt den Verbrauch nicht mehr. Für tatsächlich
  verbrauchte Waren erhält der bisherige Zahlungsempfänger den bisherigen
  Verkaufserlös aus neu erzeugtem Geld. Steuern bleiben unverändert.
- Verbrauch und Verkaufsstatistiken erfassen ausschließlich tatsächliche
  Entnahmen und Erlöse. Produktionszutaten und interne Umlagerungen erzeugen
  dadurch keine neuen Verkaufserlöse. Objektarten ohne solchen Verbrauch
  erhalten durch die Umstellung keine erfundene Nachfrage.

### Touristisches Reisegeld

- Jeder neu abreisende Tourist erhält 28 Credits Reisegeld aus neu erzeugtem
  Geld, ohne Bürgerbudget als Voraussetzung. Weitertransport und Abholen von
  Gästen erzeugen kein zweites Reisegeld für dieselbe laufende Reise.
- Zahlung am Gästeziel und Aufenthaltsregeln bleiben erhalten: Das vorhandene
  Reisegeld wird genau einmal an den berechtigten Betreiber ausgezahlt.
  Bei einem Ziel ohne berechtigten Empfänger bleibt es zunächst beim Gast.
- Bei Heimkehr verfällt ein unverbrauchter Rest. Nach abgeschlossener Heimkehr
  gilt eine spätere echte neue Abreise als neue Reise mit erneutem Reisegeld.
- Bevölkerung, reservierter Personalbedarf, Passagierplätze und freie Gästeplätze
  begrenzen Reisen weiterhin. Es wird keine zusätzliche zeitliche Fördergrenze
  eingeführt.

### Migration und bewusste Regeländerung

- Bestehende zivile Budgets werden beim Laden ohne Auszahlung entfernt.
  Vorhandene Reisegeldbestände unterwegs bleiben unverändert. Wiederholtes
  Laden erzeugt weder neue Guthaben noch doppelte Reise- oder Verkaufserlöse.
- Alle betroffenen Objektarten, Persistenzpfade, Statistiken, Hilfetexte und
  Anzeigen werden auf verbliebene Abhängigkeiten vom Konsumkonto geprüft.
- Diese Vorgabe ersetzt bewusst die Budgetbegrenzung aus PRD 14 und die
  entsprechende Beschränkung der Geldschöpfung aus PRD 16 für zivilen
  Warenverbrauch und touristisches Reisegeld.

Abnahme: Bei bisher leerem Bürgerbudget erfolgen Verbrauch und vollständige
Bezahlung mit unveränderter Nachfragerate. Fehlender oder geschützter Bestand
wird nicht verbraucht. Tests decken klassische Planeten, Spezialplaneten und
geeignete Stationen ab. Neue Touristen erhalten genau 28 Credits pro Person;
Weitertransport erzeugt keine zweite Förderung. Heimkehr und Altspielstände
erzeugen keine Bürgerkasse und keine unbeabsichtigten Gutschriften.

## Umsetzungsschritte und Fortschritt

Alle Umsetzungspakete sind offen. Nach jedem abgeschlossenen Paket werden
passende Prüfungen ausgeführt, dieser Fortschritt aktualisiert und die
zusammengehörigen Änderungen separat committet.

| Paket | Umfang und Prüfung | Stand |
| --- | --- | --- |
| P01 | Doppelwerft: Ausbau, freie Bauplätze, unabhängiger Betrieb, Migration; gezielte Orbital-/Versorgungstests | Offen |
| P02 | Orbitalring-Baumenü: Kategorien, Karten, Bauplatzanzeige; Browser- und Sichtprüfung bei mehreren Fenstergrößen | Offen |
| P03 | Almanach und Rathaus: Aufklappbereiche und sichtbare Werte; Aktualisierungs- und Browserprüfung | Offen |
| P04 | Wohnhäuser: Darstellung, Auswahlflächen und Zoom; visuelle Prüfung aller Stufen | Offen |
| P05 | Abfangkreis: Berechtigung, Gruppen, Haltungen und Reichweite; Logik- und Sichtprüfung | Offen |
| P06 | Konsumkonto entfernen: sämtliche Objektarten, Warenverbrauch, Erlöse und Migration; gezielte Wirtschaftsregressionstests | Offen |
| P07 | Touristisches Reisegeld ohne Konto: neue Reise, Weitertransport, Auszahlung und Heimkehr; Passagier-/Tourismustests | Offen |
| P08 | Gesamtabnahme: relevante Regressionen, vollständige Testsuite, UI-Sichtprüfung und Dokumentationsabgleich | Offen |

Ausgangspunkt für die Umsetzung sind insbesondere `server/orbital.js`,
`server/homeworld-operations.js`, `client/js/ui/homeworld.js`,
`client/js/ui/almanacShips.js`, `client/js/ui/colonies.js`,
`client/js/planetCityScene.js`, `client/js/render.js`, `shared/combat.js`,
`shared/local-demand.js`, `server/real-economy.js` und `server/population.js`.
Zusätzliche betroffene Pfade werden je Paket ermittelt.

## Prüfung des Planungsdokuments

- Inhalt gegen die bestätigten Antworten Q1–Q15 und die Ergänzung zum
  Geltungsbereich aller Weltraumobjekte geprüft.
- Umsetzung und technische Tests sind noch nicht durchgeführt.
- Kein Push ohne ausdrückliche Zustimmung.
