# Nachweise zum erweiterten Spieltest

Ausgangsstand: b8aa3e4, nach PRD 25. Ausgeführt am 13. November 2026.

Auswertung: [Erweiterter Spieltest](../../Spieltest-2026-11-13-erweitert.md).

| Datei | Inhalt | Ergebnis |
|---|---|---|
| tests.txt | Gesamtsuite `npm test` | 411/411 bestanden |
| onboarding42.json | Reale Befehle/Flüge, Seed 42, 30 s Entscheidungsannahme | H06 bei 3235 s |
| probes.json | Seeds 7/77/2026, 80 Gefechte, 46 Rezeptkalkulationen | Drei weitere Einstiege erfolgreich; kein offenes Gefecht |
| probes.log | Kompaktes Protokoll der zusätzlichen Proben | Erfolgreich |
| combat.log | Zusätzliche Wiederholung der identischen acht Kampfpaare | Gleiche Siegerfolgen; keine unabhängige weitere Stichprobe |
| progression131126.json | Ununterbrochener Fortschrittsversuch mit realen Regeln | H11 erreicht; H13 nicht erreicht; 40-h-Zeitlimit, Exitcode 1 |
| progression131126.log | Ereignisse und Ergebnisausgabe desselben Laufs | 143 Finanzierungsquests, 34 Exporte |

Die Simulation verwendet einen allwissenden seriellen Planer. Die Zeiten sind Spielzeit einschließlich modellierter Bedienzeit und keine menschliche Sitzungsdauer. Kampfrümpfe werden für isolierte Vergleichskämpfe bereitgestellt; Käufe/Finanzierung dieser Flotten sind nicht Bestandteil der Kampfstichprobe. Rezeptkalkulationen sind keine Gesamtwirtschaftssimulation.

Manuelle Browserprüfung: separater frischer Spielstand auf Port 3033; Kopien echter H06-/H10-Snapshots auf 3034/3035; künstliche Kriegsprüfwelt auf 3039. Geprüft wurden Einstieg, Reparatur, Gebäudewechsel, Versorgungslink, Planetenlage, Lagertransfer und aktive Schlacht einschließlich Halten/KI. Frühere Versuche mit anderen Prüfservern dienen nicht als zusätzliche Spielbalance-Nachweise. Hauptspielstand unverändert.

Konkrete reproduzierbare Browserbefunde:

1. Frisch landen, Wasserwerk öffnen, „Versorgung organisieren“: führt zur noch zerstörten Leitstelle, ohne manuellen Eisweg dort.
2. Prüfflotte `Kampftest`, Greif auswählen: Flotte „Wartet im All“ und „Untätig“, aufgeklappter Kampfbereich gleichzeitig „In einer Schlacht“. Ursache im queuebasierten Untätigfilter und Statusformatter bestätigt.
3. Stadtansicht im geprüften ca. 1140 px breiten Fenster: detaillierte Versorgungswerte konkurrieren mit den Hauptmenüs, Spezialistenbereich angeschnitten; horizontales Scrollen ist als Hilfe vorgesehen.

Keine Gameplayänderungen, kein Reset, kein Push. Lokale SQLite-Dateien bleiben außerhalb des Commits.
