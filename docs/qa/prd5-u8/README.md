# U8 – Leitstellennetz

`npm test`: 182 Tests erfolgreich, davon zwölf neue Netztests. Geprüft sind
vollständige Hexflächen und Randpunkte, exakte Vereinigung überlappender Zonen,
schmale ungedeckte Lücken, getrennte eigene Netze, fehlende Konsortiumsfreigabe,
bekannte abgedeckte Wurmlöcher und echter Transit bei Abdeckungsverlust.
Begonnene Abschnitte enden nach Verlust/Neustart sicher; Folgeabschnitte warten
ohne neue Warnungsflut und setzen nach Wiederherstellung fort.

Mehrfachaufträge und Routenänderungen werden vor der Mutation validiert. Eine
echte lokale Route kauft 20 Eis, fliegt zur Heimat und lagert genau diese Menge
ein; weder zusätzliche Ware noch Handels-XP entstehen. Leitstellenausbau bindet
Geld, Materialien und Bauteam, mit höchstens 180 Sekunden je Stufe und geprüften
Zahlengrenzen. Mangel begrenzt neue Annahmen und erhält bestehende Flüge/Reichweite.
Die bedarfsgesteuerten Funktionsmodule werden hier baubar; ihre Disposition folgt U12.

Die reproduzierbare Einstiegssimulation mit Seed 42 erreicht unverändert H06
bei 1.997 Sekunden mit 101 Einwohnern, zwei Schiffen und 7.826 Cr.

Browserprüfung: dieselbe isolierte U7-Bauwelt auf localhost:3007, zusätzlich
20 Kabel als ausdrücklich künstliche QA-Ausstattung. Ausbau Stufe 1 → 2 per UI
zieht 8.000 Cr, zehn Platten und vier Kabel ab. Nach 60 Sekunden zeigt die
Leitstelle Stufe 2, zwölf Auftragsplätze und die nächsten konkreten Ausbaukosten.
Die Karte zeigt die Systemzone und anschließend die vollständige Hexgrenze.
Keine Browserfehler. Screenshots dokumentieren Bedienung und gerenderte Netzgrenzen.
