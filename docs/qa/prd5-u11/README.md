# U11 – Sonderveredelung und Produktwährungen

Alle 219 Tests erfolgreich. Neun neue Tests prüfen sechs vollständige
Veredelungszyklen, konkrete Energie-/Personalzuordnung, Spezialistenmangel,
Hubs/Fraktionsabnehmer, alle 18 wertneutral umgerechneten Schiffsgebühren,
Rohstoffhandel zwischen Spielern, sicheren Rezeptwechsel und echten Reaktorbrennstoff.
Die erste Veredelungsanlage ist ausdrücklich vor ihrem H10-Nachweis baubar.
Der Werfttest bestätigt zusätzlich: Zahlung mit Rohform wird ohne Abzug und ohne
Bestandsänderung abgewiesen; genau die neue Produktmenge ermöglicht den Kauf.

`npm run prices:prd5` erzeugt `docs/PRD-5-preise.md` und `.json`: 66 Waren,
46 Rezepte, sechs Produktwährungen und 18 Fraktionsschiffe. Die sechs Basispreise
sind Feingold 1.143,6, geschliffene Diamanten 2.007,3, angereichertes Uran 1.467,9,
stabilisierte Antimaterie 3.110,0, veredelte Exokristalle 2.504,6 und raffiniertes
Nebelgas 647,0 Cr. Es gilt die bestehende Rezeptpreisformel ohne Sonderaufschlag.
Fraktionsmengen und Nachfragekapazitäten werden mit der Rohwert-/Produktwertformel
aufgerundet; Nachfrageraten erhalten denselben vorgesehenen Warenwert pro Zeit.

Standortaufschläge werden nach Bereinigung der neuen öffentlichen Märkte aus
den tatsächlich vorhandenen Produzenten berechnet. Verworfenes Fabriklayout und
synthetische Planetenerzeugnisse beeinflussen die Entfernungspreise nicht mehr.
Die reproduzierbare Einstiegssimulation erreicht weiterhin H06 nach 1.997 s mit
101 Einwohnern und zwei Frachtern; Restgeld jetzt 8.083 Cr. Die Differenz zum
vorherigen Nachweis stammt aus den korrigierten Standortpreisen. Keine öffentliche
Fertigware im Simulationsbestand. Finale Balance bleibt U17.

Browserprüfung auf localhost:3010 mit frischer simulierter Welt. Für die
isolierte Anlagenprüfung wurden H07 und 100.000 Cr sowie 20 Kabel, 20 Glas,
sechs Rohgold und drei Chemikalien bereitgestellt. Solarfeld und Edelmetallwerk
wurden anschließend über reguläre Bauaufträge bezahlt und gebaut. Dies ist keine
Behauptung einer bereits vollständig simulierten fortgeschrittenen Rohstoffkette.
Die Oberfläche zeigt das konkrete Rezept (2 Rohgold + 1 Chemikalien → 1 Feingold),
zwölf Energie, vier einfache und vier Fachkräfte sowie zwölf Sekunden je Zyklus.
Die drei tatsächlichen Zyklen verbrauchen alle sechs Rohgold und drei Chemikalien
und ergeben genau drei Feingold im Lager (`refined-stock.png`); anschließend
pausiert die Anlage mangels Zutaten (`refining-plant.png`). Keine Browserfehler.
Rezeptwechsel verwirft den Zyklusfortschritt; höhere Baugruppen erfordern einen
entsprechenden Neubau. Gezeichnete Vollständigkeit bleibt U16.
