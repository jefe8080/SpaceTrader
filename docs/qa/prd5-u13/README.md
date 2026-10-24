# U13 – Spezialisierungen, Bevölkerung und Reisen

Alle 251 Tests erfolgreich. 21 neue Prüfungen: konkrete Anwerbung und Qualifikation,
Teil-Umladung, Wohn-/Kabinenkapazität, einmalige Touristenzahlung und echte Abreise,
Ausbildungs-/Arbeitsplatzreservierung, Abwurfsperre, 60-%-Arbeitsgrenze, Rundreise,
Questabbruch und Neustart; außerdem materieller Förderausbau, nicht gestapelte
Stufen, bezahlter Schwerpunktwechsel, Hive ohne kostenlose Bevölkerung,
Schulkapazität, parallele Infrastruktur, Questgeber-/Preisunabhängigkeit,
bevölkerungsabhängiger Verbrauch, Förderwert/Verschleiß, tatsächliche
Abfertigungs-/Umschlaggrenzen, Generatorbrennstoffe und Übertragung geänderter Raten.

Fünf Minuten echter Marktticks je Förderstufe prüfen Faktor 1,5/2/3 und exakt
2/5/10 Maschinen sowie 1/2/4 Roboter pro Stunde. Die Bilanz entfernt abgeförderte
Rohstoffe laufend aus dem Lager und bewertet sie zum Basispreis; sie belegt
Materialleistung und wirtschaftliches Potenzial bei Grundversorgung, keinen
garantierten Absatz. Gegenübergestellt wird der Wert zusätzlicher Rohware und
des gesamten stufenabhängigen Verschleißes. Die typgebundenen natürlichen
Richtungen werden zusätzlich einzeln auf positiven Zusatzwert bei Grundversorgung
geprüft. Transport, Bauamortisation und gesamte Mehrspielerbalance bleiben U17.

Spezialisierungen verwenden die Werte aus PRD 12. Der natürliche Planetentyp
bleibt erhalten. Wechsel: 25 % des festen erreichten Stufenwerts, 180 s,
keine Materialerstattung, nur der Spezialbetrieb pausiert. Infrastruktur
bindet Lager-/Schiffsmaterial und Bauarbeiter. Gas-/Reaktorbetrieb verbraucht
echtes Rohgas beziehungsweise angereichertes Uran/Kühlmittel. Fehlendes
Personal, Energie oder Material pausiert, zerstört keine Bevölkerung.
Grundenergie gewöhnlicher Welten: 12; zusätzliche Erzeugung durch bezahlte
Generatoren. Infrastruktur ist auf 48 Plätze begrenzt. Auf Oberflächen folgen
die vollständigen gezeichneten Entwicklungsstände U16.

Logistik besitzt zusätzlich zu zwei Grundabfertigungen und 500 Einheiten/min
die festgelegten Schwerpunktwerte. Eine Abfertigung belegt für eine Serversekunde
einen Bedienplatz; das getrennte gesamte Umschlagbudget erneuert sich je
Serverminute. Warenhandel und NPC-Lieferung verwenden dieselbe Budgetierung.
Ruinen-Raumhäfen erhöhen diese Werte nur bei tatsächlichem Betrieb.

Jede bestehende öffentliche Planetenbevölkerung erhält eine registrierte Quelle.
Personenangebote sind Sichten auf diese Bevölkerung, keine produzierte Lagerware.
Angeworbene Kräfte verlassen den Bestand samt ihrer Qualifikation. Reisegruppen
behalten Kennung, Ursprung und restliches ziviles Reisegeld über Teil-Umladung
und Neustart. Wohnraummangel lässt Passagiere an Bord. Besucher erhalten 20 min
Aufenthalt und anschließend Abreisebedarf; ohne Transport bleiben dieselben
Besucher vor Ort. Aufenthalt zahlt einmalig aus mitgebrachtem Reisegeld, nicht
unbegrenzt aus einer neuen Geldquelle. Rundreisequests belegen reale Kabinen,
Abbruch erhält die Personen; Rückkehr bringt sie zum ursprünglichen Bestand.

Browser auf localhost:3012, frische isolierte Fixture aus
`node sim/specializations-qa.js`, Kapitän „U13 Aufbau“: Besitz/Gouverneurslizenz,
Solarfeld, Kabine, Credits und Material wurden für diese Bedienprüfung ausdrücklich
bereitgestellt. Keine Behauptung einer vollständig bezahlten Aufbauprogression.
Regulärer UI-Auftrag: Erz I für 25.000 Cr, 20 Platten und vier Maschinen, 120 s.
Danach aktive Spezialisierung mit zehn Energie bei 32 verfügbaren, Materialverbrauch
zwei Maschinen/ein Roboter je Stunde (`specialization.png`). Zustand auch nach
Serverneustart bestätigt. Anwerbung über UI: 1.270 → 1.260 Einwohner,
609 → 599 einfache Kräfte, zehn Arbeiter auf dem Frachter (`recruitment.png`).
Die Besitzübersicht zeigt einen gewöhnlichen Besitz von sechs Lizenzplätzen,
die persönliche Heimat wird zusätzlich geführt. Beim Browsercheck gefundener
Infrastruktur-Schlüssel und fehlende Aktualisierung dynamischer Raten behoben;
abschließender Client-Neustart ohne neue Browserfehler.

Reproduzierbare frühe Flugsimulation weiterhin H05 bei 1.170 s und H06 bei
1.997 s, 101 Einwohner, zwei Frachter, 8.162 Cr Rest, keine öffentlichen
Fertigwaren. Das ist weiterhin der frühe automatisierte Einstieg, keine finale
Abnahme der Spielzeitkorridore aus U17.
