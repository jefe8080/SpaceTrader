# U9 – reale Waren und Gegenkassen

Alle 195 Tests erfolgreich, davon 13 neue Bilanztests. Frische Generierung über
25 Hexsektoren erzeugt keine öffentlichen Rezeptfabriken, Fertigwaren, Module
oder verkaufbaren Schiffe. Natürliche Anfangsvorräte tragen eine Quellen-ID;
Anfangsschiffe und deren Tankfüllung sind einmalige empfängergebundene Hilfen.

Förderung arbeitet mit 25–100 % und tatsächlichem Verbrauch. Keine Drift
erzeugt oder entfernt Handelsbestände. Questgeberlevel erzeugt keine Slots,
Fertigwaren oder Leistungsboni; gewöhnlicher Fabrikbau ist serverseitig gesperrt.

NPC-Einkäufe belasten tatsächliche Kassen. Die erneuerbare Zuweisung ergibt sich
aus geplanter Verwendung; ungenutztes generiertes Geld einschließlich reservierter
Transportkasse ist auf zwei Stunden begrenzt. Tatsächlich erwirtschaftete
Verkaufserlöse bleiben vorhanden. Händler benötigen eine finanzierbare reale
Zielnachfrage. Preise, Mengen, Reserven und Privatmodus begrenzen die Abholung.

Transporte reservieren Geld vor dem Start, bezahlen bei tatsächlichem Laden
und erstatten ungenutztes Geld einmalig. Ein echter Testflug erhält Quelllager +
Transit + Ziellager und die Gesamtgeldmenge. Volle Ziele behalten bezahlte
Restladung im Transport über Neustarts; nach 60 Sekunden darf ein anderer
zahlungsfähiger öffentlicher Abnehmer angeflogen werden. Ohne Abnehmer wartet
die Ladung, ohne gelöscht oder nochmals gekauft zu werden.

Bürger teilen dasselbe Einkommen in Steuern (0–40 %) und Konsumkasse. Nur
tatsächlich verbrauchte zivile Ware erhält eine begrenzte Konsumzahlung. Bau,
Produktionszutaten und kostenlose Eigentümertransfers erhalten keine solche
Zahlung. Die Bilanz weist Brutto, Steuer, Verbrauchszahlung und Rest aus.
Beschaffungsquests warten auf Platz für die vollständige tatsächliche Übergabe.
Sondernachfragen besitzen ein explizites endliches Budget und Verbrauchszähler.

`onboarding.json`: zweimal identische Seed-42-Simulation mit tatsächlichen
Flügen/Einkäufen, ohne zusätzliche Testwaren. H06 nach 1.997 s, 101 Einwohner,
zwei Frachter, 8.052 Cr; 234 öffentliche Märkte ohne Fertigwarenbestand.
124,168759 Cr ziviles Einkommen teilen sich in 24,833752 Cr Steuern und
99,335007 Cr bezahlten Konsum. Das ist keine abschließende Balanceabnahme U17.

Browser auf localhost:3008 verwendet ausschließlich diese frisch simulierte
Welt. Die Bürgerbilanz zeigt Einkommen und Konsumkasse; Steuersatz über UI von
20 auf 30 % geändert und serverseitigen Folgezustand bestätigt
(`civilian-account.png`). Keine Browserfehler. Physische Module/Werften folgen
U10, Währungen U11, Personen/Spezialisierungen U13; diese Nachweise werden dort
ergänzt. Gezeichnete Vollständigkeitsabnahme bleibt U16.
