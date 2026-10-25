# PRD 9: Rathaus-Handel und Hub-Gleichgewicht

## Ziel und bestätigter Umfang

Eigene besiedelte Ruinenwelten erhalten im Rathaus einen Handelsschalter
privat/offen. Offener Handel erlaubt fremden Spielern und NPCs den Zugriff auf
verfügbare Waren; Reservierungen und bestehende Zugriffsprüfungen bleiben gültig.

Öffentliche Hubs erhalten als ausdrücklich bestätigte Ausnahme zur realen
Wirtschaft ihre frühere Bestandsdrift zurück, auch in bestehenden Spielständen.
Die bereits gespeicherten individuellen Sollwerte bleiben erhalten:
Verkaufsware 60–70 %, Ankaufsware 30–40 %, Handelsware 45–55 %.
Die Halbwertszeit beträgt 2.700 Sekunden. Treibstoffzufluss bleibt durch die
frühere Produktionsrate begrenzt. Veredelte Seltenwaren bleiben Ankaufswaren;
rohe Seltenwaren bleiben ausgeschlossen. Andere öffentliche Märkte behalten
ihre reale Beschaffung. Die Ausnahme erlaubt wieder abstrakten Warenzufluss
am Hub und ersetzt dort die NPC-Beschaffung.
Das Handelssortiment ist am Hub wieder ohne externe Zielnachfrage verkäuflich;
Ankäufe bleiben durch die vorhandene öffentliche Kasse begrenzt.

## Schritte und Fortschritt

- [x] Planung: historische Rollen, Sollwerte und Drift vor f5baf9b geprüft;
  Rathaus und rollenspezifische Wiederherstellung vom Nutzer bestätigt.
- [x] U1: Rathaus-Schalter für Hauptheimat und weitere eigene Ruinenwelten;
  bestehenden autorisierten propMode-Befehl verwenden, Verhalten prüfen.
- [x] U2: Historische Hub-Drift einschließlich Treibstoffrolle/-rate auch für
  bereits gespeicherte Märkte reaktivieren; Beschaffung und Wirtschaftstests
  auf die bestätigte Ausnahme abstimmen.

## Abnahmekriterien

1. Rathaus zeigt den aktuellen Modus und erlaubt offen/privat für eigene Welten.
2. Moduswechsel bleibt gespeichert; fremde Besitzer können ihn nicht ändern.
3. NPCs können bei offenem Handel unreservierte Ware kaufen; privat verhindert es.
4. Hub-Bestände nähern sich von unten und oben ihren individuellen Sollwerten;
   nach 45 Minuten ist die Abweichung für Handelswaren halbiert.
5. Treibstoff ist wieder Verkaufsware, mit begrenztem Zufluss; veredelte
   Seltenwaren behalten Ankaufsrolle und individuelles Soll.
6. Bestehende Hub-Märkte werden ohne Reset angepasst; andere Märkte erzeugen
   weiterhin keine verarbeiteten Waren durch Drift.
7. Passende automatisierte Prüfungen laufen vor jedem Umsetzungskommit.
   Fremde Änderungen sind von den Commits ausgeschlossen.

## Validierung

Wird mit den Umsetzungsschritten ergänzt.

- U1: 14 Tests erfolgreich (Rathaus-Handelsmodus und reale Wirtschaft),
  einschließlich Eigentumsschutz, NPC-Abholung mit Reserven und Persistenz.
  Syntaxprüfung beider geänderter UI-Dateien erfolgreich.
- U2: 26 gezielte Wirtschafts-/Handelstests erfolgreich, einschließlich
  individueller Rollenziele, Annäherung von oben/unten, begrenztem
  Treibstoffzufluss, Anpassung alter Marktrollen und tatsächlichem Hub-Handel.
  Gesamtlauf: 317/318 erfolgreich. Ein Fehler in der parallel geänderten,
  fremden Stadtansicht: `tests/planet-city.test.js:67`, Resort-Warenplätze
  `workers` und `preserves` überlagern Dienste. Diese Dateien wurden nicht
  für PRD 9 geändert oder aufgenommen. Kein visueller Laufzeittest durchgeführt.
