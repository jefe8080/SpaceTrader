# PRD-7-Einstiegsregression

Ursache: alter Node-Prozess auf Port 3000, neue statische Clientdateien auf der Festplatte. Der Start des neuen Prozesses war an EADDRINUSE gescheitert.

- 307/307 Servertests erfolgreich (test-results.txt).
- Echter erster Einstieg ohne Setzen von Tutorialflags: Hilfe → Schiffsklick → H00 → Neuladen ohne Bestätigung → erneutes Anmelden → H00 bestätigen → gefülltes Pilotenprofil.
- Neuer Pilot im selben Browser erhält die Hilfe trotz vorhandenem globalem Hilfemarker.
- Alte Spielerdaten aus SQLite liefern nach Neustart aktives H00 und Profildaten im tatsächlichen Netzwerkpaket.
- Inkompatibles Welcome-Paket zeigt ausdrücklich die nötige Serveraktualisierung.
- Browserprüfung auch für Rathaus, Funkverlust/-wiederkehr und Marker bei fünf Fensterbreiten erfolgreich (verified/browser-results.json).

Die Browserprüfung lief ausschließlich auf einer separaten In-Memory-Welt auf Port 3008. Die Hauptwelt wurde vor dem Serveraustausch unter data/backups gesichert. Kein Spielstandreset und keine Testspieler in der Hauptwelt. Der aktuelle lokale Server meldet Protokoll 7 und Profil homeworld über /api/status.

Firefox konnte wegen fehlender Computerzugriffsfreigabe nicht automatisch neu geladen werden; der Nutzer muss die geöffnete Seite einmal mit Strg+F5 aktualisieren.
