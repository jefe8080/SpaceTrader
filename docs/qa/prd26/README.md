# PRD 26 – Umsetzung und Abnahme

## Umfang

Umsetzung der bestätigten Q1–Q54 gemäß [PRD 26](../../PRD-26.md). Bestehende Systeme erweitert: Reservierungen, Kostenbasis, Marktverläufe, Routen und Diplomatie. Kein Hauptweltreset und kein Push. Die gezeichnete Taktik nutzt vorhandene Bilder; die Stilabnahme erfolgte ohne zusätzliche Nutzerfreigabe wie ausdrücklich gewünscht.

Die fünf neuen Systemideen sind begrenzte **Regelprototypen in einer getrennten Testwelt**, zugänglich unter Handel & Routen → Wirtschaft und Planung → Neue Spielweisen ausprobieren. Sie sind keine vollständig integrierten Livefeatures: öffentliche konkurrierende Vertragskapazität und Durchflugrechte in der Grenz-KI müssen vor Livebetrieb ergänzt werden. Beispielressourcen sind ausdrücklich markiert; normales Geld/Material/Fortschritt bleiben unverändert.

## Automatische Prüfung

- Gesamtsuite zuletzt 425/425 bestanden (`tests.txt`); finale Wiederholung nach Abnahmekorrekturen wird in derselben Datei dokumentiert.
- Zwischenzeitliche Regression: Lieferstatistik behandelte alte Routen-ID-Zeichenfolge als Objekt. Korrigiert und alter Verwaltungsmarkt-/Routenpfad erneut erfolgreich geprüft.
- Vergleichsproben: 128 Gefechte, acht Seeds je Seite/Haltung/Paarung (`balance.json`). Fregatten gewinnen offensiv gegen den zuvor dominierenden Zerstörer; keine pauschale Preis-/Kampfwertänderung.
- Alle sieben Varianten im Versuchslabor geprüft, inklusive Geld-/Warenkonservation, fehlender Finanzierung und doppelter Abgabe/Stornierung (`prototypes.json`).

## Browserprüfung

Separater Server auf Port 3040, eigener Kapitän `PRD26 Prüfung`; keine Hauptweltdaten. Kampfübung starten, Gefechtsbereich vergrößern, eigene Einheit auswählen, Halten→manuell und Schließen erfolgreich. Wirtschaftsfenster und Materialplan berechnet, kooperativer Prototyp erfolgreich ausgeführt. Manueller frischer Anflug/Landung; Wasserwerk trotz zerstörter Leitstelle → reale Eisquelle mit ausführbarem Anflug. Zwölf-Schiffe-Prüfwelt: sechs eigene kämpfende Schiffe erscheinen korrekt als kämpfend und nur der siebte untätige Frachter zählt als untätig.

Große Stadt mit 48 bebauten Plätzen plus ursprünglichen Einrichtungen/Orbitalring geprüft (`tests/browser/prd26.*`). Dabei gefundenen Kopfzeilenüberlauf bei 1.139 px Breite behoben: echte zweizeilige Höhe und dynamische Abstände statt überlappender Navigation. Direkter Schlachtknopf zusätzlich außerhalb des einklappbaren Kampfbereichs. Bestehende Stadt-/Bauzustandsbilder bleiben erhalten, zusätzliche Gebäude erhalten Bodenschatten, inaktive Anlagen rauchen nicht mehr.

## Leistung

Reproduzierbare In-Memory-Prüfserver: `node sim/prd26-render-qa.js` und `--baseline`. Referenzrenderer aus Commit `111fdff`; Vorbereitung laut Kommentar im Skript. Beide Varianten instrumentieren ausschließlich ihre tatsächliche Zeichenfunktion, keine Browserautomation durch Seitenskripte. Messung über DOM-Datenattribute, Fenster 1280×720, DPR 1; Hintergrundtabs zur gleichen Größe verwendet. Andere laufende Simulationen verursachen Messrauschen. Browser-CPU-Zeit ist keine GPU-/FPS-/Netzwerkmessung.

| Szene | Referenz Median / P95 | Neu Median / P95 | Beurteilung |
|---|---|---|---|
| 12 Kreuzer, 540–600 Bilder | 0,6 / 0,8 ms | 0,5 / 0,8 ms | Vergleichbares sehr kleines CPU-Budget; keine belastbare prozentuale Beschleunigung ableiten. |
| Stadt, 48 bebaute Plätze, 600 Bilder | 1,0 / 1,3 ms | 1,1 / 1,3 ms | Kleine Mehrarbeit für Gestaltung; P95 unverändert. |

Angewandte Abnahmegrenze nach Ausgangsmessung: P95 unter 8 ms und höchstens doppelter Referenzwert für diese beiden Szenarien. Beide erfüllt. Canvas wird jetzt nur bei Größenänderung neu dimensioniert; DPR maximal 2. Bewegungsoption System/reduziert/voll integriert. Der zusätzliche Server-Kampfbenchmark steht in `combat-cpu.txt` und misst keine Browserbilder.

## Relikt und Parallelbetrieb

`node sim/prd26-relic.js` verwendet identische Kopien eines tatsächlich erspielten H06-Checkpoints. Je fünf echte Hin-/Rückflüge, zusammen 50 Eis geliefert:

| Variante | Zeit | Hauptschiff-Treibstoff | Helferlieferung |
|---|---:|---:|---:|
| gewöhnlicher Spatz | 280 s | 0,0567 | 0 |
| Reliktschiff | 70 s | 0 | 0 |
| Reliktschiff plus gewöhnlicher Helfer | 70 s | 0 | 30 Eis |

Das Relikt ist lokal viermal schneller; Arbeitsteilung liefert währenddessen tatsächlich zusätzliches Material. Dies ist eine lokale Gegenprobe, keine Bewertung aller Langstrecken oder späteren Reliktstufen. Keine Änderung an Tempo oder Treibstofffreiheit.

## Adaptive Progression

Der bestehende Planer erhält `--adaptive` (erwartbaren Mengenabsatz gegen rekursive Rohstoff-Wiederbeschaffungskosten prüfen, negative Exporte zeitweise sperren, Geldkategorien getrennt protokollieren) und `--fleet-supply` (wirkliches Zweitschiff bis zur dauerhaften Ringabgabe). Keine injizierten Spielerressourcen in diesen Läufen. Der Planer bleibt allwissend und seriell in der Industrie; Kostenprognosen enthalten keine vollständige Opportunitäts-/Bauzeitbewertung. Ergebnisse sind kein menschliches Spieltempo.

- Seed 131127, adaptiv seriell: H13 nach **113.994 s / 31 h 40 min**, sechs Finanzierungsquests. Gründung bei 113.833 s. Pfad abgeschlossen, bisheriger H13-Zielkorridor bis 108.000 s jedoch verfehlt; deshalb korrekter Exitcode 1.
- Seed 42, adaptiv seriell: H13 nach **131.345 s / 36 h 29 min**, keine Finanzierungsquests. Gründung bei 131.279 s. Pfad abgeschlossen, Zeitkorridor verfehlt; Exitcode 1.
- Parallelvergleich Seed 131127: H12 bei 107.175 s; H13 innerhalb von 144.004 s nicht abgeschlossen, Abbruch am 40-h-Limit, drei Finanzierungsquests, Exitcode 1 (`progression-fleet-131127.json`). Diese Strategie ist schlechter als der adaptive serielle Lauf desselben Seeds. Zusätzliche Einkaufs-/Versorgungsfahrten sind ohne passend optimierte Gesamtplanung kein automatischer Fortschrittsgewinn.
- Die langen Rohprotokolle entstanden vor der abschließenden Aufbewahrungskorrektur: `moneyCategories` wurde aus der auf 5.000 Gruppen begrenzten Historie differenziert und kann bei herausfallenden Altbuchungen falsche Vorzeichen enthalten. Diese Teilwerte werden nicht als verlässliche Kostenbilanz gewertet. Kontostand, realer `net`-Unterschied und Quest-/Gründungszeiten sind davon unabhängig. Für künftige Läufe verwendet der Planer dauerhafte Kategoriensummen; ein Test über 5.100 Buchungen bestätigt ihre Unabhängigkeit vom Historienlimit.
- Erster Parallelversuch scheiterte an zu langem Routennamen; erhalten als `progression-fleet-initial-failed.*`. Zweiter Versuch zeigte Überversorgung bis zur Lagerfüllung; erhalten als `progression-fleet-unbounded-failed.*`. Die korrigierte reale Route wartet jetzt bei Zielbestand über 120 Eis beziehungsweise 80 Getreide. Fehlversuche sind keine erfolgreichen Fortschrittsnachweise.

Interpretation: H13 ist mit realen Regeln erreichbar, seine gewünschte Zeitspanne bleibt ein Balanceprüfpunkt. Der frühere 40-h-Abbruch allein beweist keine allgemeine Sackgasse. Ohne passende Zielbestandsregeln kann Parallelbetrieb schlechter als serielles Vorgehen sein. Aus unterschiedlichen Seeds oder isolierten Planerlaufzeiten wird keine allgemeine Gewinn-/Tempoänderung abgeleitet.

## Offene menschliche und langfristige Abnahme

Audio technisch geprüft: getrennte Musik-/Effektregler, globale Stummschaltung und separat stummschaltbare Angriffstöne; Warnungen bleiben visuell. **Menschlicher Hörtest noch offen:** 30–60 Minuten Musik auf Wiederholung/Ermüdung, Warnungen bei leiser Musik, Gleichzeitigkeit mehrerer Ereignisse und Stummschalten beurteilen. Keine vorgetäuschte Hörqualitätsbewertung.

Weitere Grenzen: keine neue menschliche Mehrspielerpartie und kein manuelles H17-Durchspielen. Flexible Fernrichtungen/Kolonieprofile sind Planungsnotizen ohne Bonus oder neue Klassen. Geschäftsbuch umfasst erfasste Bewegungen seit Einführung, keine vollständige Rekonstruktion aller historischen Kontobewegungen. Diese Einschränkungen sind in der Oberfläche und im PRD ausgewiesen.
