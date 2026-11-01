# PRD 22 – Abnahme

Isolierte Browser-Testwelt: `node scripts/dev-prd22.js`, http://localhost:3022, Spieler QA22. Die Welt läuft ausschließlich im Arbeitsspeicher und enthält 31 neue Berichte plus einen unvollständigen Altbericht. Keine produktive Datenbank wird geöffnet.

Manuell im Browser geprüft:
- Menüpunkt öffnet eigenes Statistikfenster.
- Historie und Einzelberichte beim Öffnen sowie Wiederöffnen geschlossen.
- 32 Berichte auf zwei Seiten (25 und 7 Einträge).
- Suche nach altem Schiff findet den Altbericht, zeigt fehlende Felder und Ausschluss aus Summen.
- Ergebnisfilter „Siege“ findet elf Berichte; vollständiger Bericht zeigt beide Seiten und individuelle Ausgänge.
- Unbekannter Suchbegriff zeigt verständlichen Leerzustand.
- Keine JavaScript-Fehler in der Browserkonsole.
- Sichtprüfung des Fensters: Screenshot `combat-history.png`.

Automatisiert: vollständige Suite zunächst 393/393 erfolgreich. Zusätzliche gezielte Tests sichern Zugriff ausschließlich auf Berichte der angemeldeten Sitzung und die Trennung von Übernahme und Zerstörung. Neue Historientests prüfen außerdem Datenbank-Neustart, Verbündete, Ergebniszähler, Altbestand, 500er-Limit, stabile Summen, Suche und Seitenwechsel.

Altberichte sind nur im bisher gespeicherten Umfang vorhanden. Vollständige Statistik beginnt mit Einführung der Erfassung; keine rückwirkend erfundenen Daten.
