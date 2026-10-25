# PRD 7 – Prüfprotokoll und Textinventar

## Questtextquellen

| Quelle | Redaktion und fachliche Prüfung |
| --- | --- |
| shared/home-story.js | H00–H17: Sprecher, Einleitung, Hinweis und individueller Abschluss. H3 Netzaufbau; H4 Fund und Werkstatt-Kommunikationsmodul. Keine Herkunftsauflösung. |
| shared/homeworld.js | H00–H06: konkrete Arbeitsziele bleiben als prüfbare Auftragsliste erhalten. |
| shared/advanced-homequests.js | H07–H17: Mengen, Lieferungen und persönliche Expeditionen mit Implementierung verglichen; Zahlen bleiben erhalten. |
| client/js/ui/quests.js | Beschaffung, Eilbestellung, Kurier, Tour, Gebiet-/Sektorerforschung, Bergbau und Schmuggel: Motivation plus konkrete nächste Handlung. Ortsnamen über IDs dynamisch aufgelöst. |
| server/homeworld.js, server/homequests.js | Journalabschlüsse verwenden individuelle Erzähltexte. Forschungsbesuche behalten offene menschliche Herkunft. |
| server/quests.js | Kurierübernahme und Erfolgsmeldung erzählerisch angepasst; Belohnung unverändert. |
| server/relic.js | Versiegelte Bergung und Kommunikationsmodul; tatsächliche Freischaltung erst mit repariertem eingebautem Antrieb. |

Die numerischen Auftragslisten bleiben bewusst präzise. Einleitungen liefern die Atmosphäre, ohne Mengen oder Bedingungen zu ersetzen.

## Endstand

- `test-results.txt`: 305/305 Tests erfolgreich.
- `onboarding-results.txt`: H00–H06 mit echten Flügen, Käufen, Lieferungen, Eigenproduktion und Reliktarbeit erfolgreich.
- `browser-results.json`: Edge-Browserprüfung ohne JavaScriptfehler, fünf Fensterbreiten.
- `profile-desktop.png`: Profilseite mit Ruf, Finanzen und Besitz.
- `map-*.png`: Markerknopf innerhalb des oberen Balkens, ohne Überschneidung mit Navigation.
- `town-hall.png`: aufgeklappte Übersicht, echte Bestände/Raten und Namenseingabe.
- `connection-lost.png` / `remote-restored.png`: geöffnete Ansicht bleibt bestehen; Verwaltung wird bei Funkrückkehr wieder freigegeben.

Zwischenläufe deckten veraltete Testannahmen zu Dialogbestätigungen und Fernzugriff sowie einen Fehler beim Wiederfreigeben von Knöpfen auf. Diese sind behoben. Die erneute Ausführung der Browserprüfung verwendet einen frischen Testspieler. Die Browserprüfung läuft gegen einen isolierten Server mit `DB_FILE=:memory:`; keine produktive Welt wurde geändert.

Die volle manuelle Kampagne wurde nicht durchgespielt. Questtexte wurden quellenweise redigiert; die Simulation und Servertests prüfen die tatsächlichen Bedingungen. Eine Kampfmechanik ist nicht vorhanden; das Profil behauptet dafür keine historischen Nullwerte.
