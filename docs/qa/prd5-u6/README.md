# U6: Relikt, manuelle Präsenz und Handels-XP

2026-10-24. `npm test`: 160 Tests erfolgreich. Sechs zusätzliche Relikttests prüfen persönliche Bergung, Ausschluss wiederholter Funde/Belohnungen, Werkstattzeit, atomaren Standortwechsel, gesperrte Abgabe und Automatisierung, manuellen Schiffwechsel ohne Bonus, treibstofffreien Flug mit leerem Tank, XP-Ausschlüsse und Neustart während Werkstattarbeit.

`npm run sim:homeworld` fliegt tatsächlich, kauft Rohstoffe gegen Credits, transportiert sie im normalen Spatz und lagert sie kostenlos ein. Keine Rohstoffinjektion ins Heimatlager. H00–H06 einschließlich H04 werden regulär abgeschlossen. Zufall wird für den Simulationslauf aus dem Seed gespeist und danach wiederhergestellt. Zwei Durchläufe mit Seed 42 liefern identische Ergebnisse; siehe `onboarding.json`.

Der perfekte Bot erreicht H05 nach 19,5 und H06 nach 33,3 Serverminuten. Das ist noch keine abschließende Balanceabnahme: aktive Bedienzeit, Personal/Energie, neue reale öffentliche Wirtschaft und spätere Fortschrittszweige werden in U7–U17 ergänzt und gemeinsam kalibriert.

Echte Browserprüfung auf einer separaten, durch dieselbe Flugsimulation erzeugten Testwelt:

- Werkstatt zeigt genau einen eingelagerten Antrieb und die vor Ort verfügbaren Schiffe (`workshop-stored.png`).
- Einbau per UI startet einen 15-s-Auftrag und zeigt anschließend Falke als Träger (`workshop-installed.png`).
- Ausbau per UI lagert den Antrieb nach 15 s wieder an derselben Welt ein.
- Aktives manuelles Schiff ist von Reliktbesitz und Geschwindigkeit getrennt; Details und Flottenliste zeigen die Rollen.
