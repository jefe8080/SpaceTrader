# PRD 18: Legacy-Weltprofil entfernen

## Ziel und Freigabestand

Das Spiel kennt heute zwei Weltprofile: `legacy` (Weltversion 3, alte Wirtschaft)
und `homeworld` (Weltversion 5, Heimatwelten, echte Wirtschaft). Produktiv läuft
ausschließlich `homeworld`. Der gesamte Legacy-Code in Server, Client, Shared,
Tests, Sims und Doku wird entfernt. Für die `homeworld`-Welt ist das ein reines
Refactoring: Ihr Verhalten bleibt unverändert.

Am 31.10.2026 mit dem Skill `grill-me` in Q1 bis Q7 abgestimmt und vom Nutzer
bestätigt. Die Umsetzung erfolgt in einer späteren, eigenen Session.

## Ausgangslage (geprüft am 31.10.2026)

- Der Container startet mit Profil `homeworld` und
  `DB_FILE=/app/data/world-v5/spacetrader.db` (Dockerfile).
- Der einzige Prod-Spielstand (Kopie: `C:\Users\Jens\Desktop\spacetrader.db`) hat
  `meta.worldProfile = "homeworld"` und `meta.worldGen = 5`. Alle anderen
  Spielstände sind Testdaten und werden nicht berücksichtigt.
- Im Prod-Spielstand nutzt nichts einen Legacy-Pfad: 1.998 Märkte, davon 1.970
  mit `realEconomy`, 7 Heimatwelt-Märkte, 21 `homeResource`, 0 alte Märkte.
  Alle 6 Spieler haben eine Heimatwelt, kein Schiff hat `main` (altes
  Hauptschiff), alle `ownership.upg` sind leer (kein alter Planetenausbau).
- Daraus folgt: **Es ist keine Datenmigration nötig.** Der ursprünglich geplante
  Zwischenschritt mit einem Migrationsrelease entfällt.
- Legacy-Abhängigkeiten im Code:
  - `Game` und `World` haben den Standard `profile = 'legacy'`
  - rund 60 Profil-Abfragen auf dem Server
  - Client-Weichen über `state.homeworld` und `e.market.realEconomy`
  - 26 Testdateien (etwa 170 Tests) erzeugen mindestens ein Spiel im Profil `legacy`
  - `sim/simulate.js`, `sim/prd15-balance.js` und `scripts/benchmark-prd16.js`
    laufen in `legacy`

## Entscheidungen

### E1: Profil-Konzept fällt komplett weg (Q4)

- Es gibt nur noch eine Weltart. `WORLD_PROFILES`, die Umgebungsvariable
  `WORLD_PROFILE` und der Parameter `profile` von `Game` und `World` entfallen.
  Alle Abfragen wie `profile === 'homeworld'` werden zugunsten des
  `homeworld`-Zweigs aufgelöst.
- Die Startprüfung bleibt: `checkWorldFile` erwartet in `meta`
  `worldGen === 5` und `worldProfile === 'homeworld'` und weist jede andere
  Datei ab, ohne sie zu verändern. Neue Welten schreiben weiterhin
  `worldProfile = 'homeworld'`, damit Spielstände kompatibel bleiben.
- Der Datenpfad `data/world-v5/spacetrader.db` bleibt, damit auf dem Server
  nichts umkonfiguriert werden muss. Der Schutz vor `data/spacetrader.db` in
  `runtimeOptions` darf bestehen bleiben.
- Im Client werden die Weichen über `state.homeworld` aufgelöst. Das Feld
  `state.homeworld` selbst bleibt, denn es enthält die Heimatwelt-Daten des Spielers.

### E2: Abgrenzung und Verhalten (Q5)

- Für die `homeworld`-Welt ändert sich kein Verhalten. Alles, was dort
  erreichbar ist, bleibt erhalten, auch wenn es aus dem Legacy-System stammt.
  Beispiele: Gouverneurslizenz (begrenzt Besitzkauf, ist in Prod genutzt),
  Fabriken über `facBuild`/`facDemolish`, Konsortiumsstufen, Fixpreise für
  zivile Güter.
- Code, Konstanten und Tests, die nur im Legacy-Profil erreichbar sind, werden
  entfernt. Bekannte Beispiele:
  - **Hauptschiff:** Befehl `flagship`, `FLAGSHIP`, `flagshipButton` mit
    `case 'flagship'` sowie `flagshipAt`.
  - **Planetenausbau:** Befehl `propUpgrade`, Ausbau-Tabelle und Extras-Auswahl
    in `client/js/ui/property.js`, `maxLevel` der Gouverneurs- und Konsortiumsstufen.
  - **Alte Wirtschaft:** Drift-Märkte, `tickOwnedPlanet`, alte Fixpreis- und
    Produktionsanzeigen für Märkte ohne `realEconomy`.
  - **Alte Modulwerft:** der Modul-Block in `client/js/ui/shipyard.js` hinter
    `!state.homeworld` und die Legacy-Zweige von Modul-Ein- und -Ausbau.
  - **Weitere Profil-Zweige:** Legacy-Zweige in Ereignissen, Handel, Routen,
    Abdeckung und Navigation.
- **Irreführende Texte werden angepasst:** Sichtbare Texte, die auf entfernte
  Funktionen verweisen, werden geändert. Bekannt: „Ausbau bis Stufe X“ bei
  Gouverneurslizenz und Konsortiumsstufen. Das ist die einzige Änderung, die
  Spieler sehen.
- **Spielmechanik wird nicht bereinigt.** Ausgenommen sind die genannten Texte.
  Spielmechanik wird nur entfernt, wenn sie in `homeworld` unerreichbar ist.
- **Keine Datenbankmigration:** Ungenutzte Altfelder im Spielstand bleiben
  unangetastet liegen.
- **Mitentfernen:** der tote Klick-Handler `case 'send'` in
  `client/js/ui/details.js` (seit `d76c32f` durch `sendSelected` ersetzt).

### E3: Tests (Q3)

- Tests für Funktionen, die es in `homeworld` gibt, werden auf `homeworld`
  umgestellt und an dessen Regeln angepasst (Abdeckung, echte Wirtschaft,
  keine Rezept-Stationen). Das betrifft zum Beispiel Krieg, Stacks, Routen,
  Quests und Konsortien.
- Tests für reine Legacy-Funktionen werden gelöscht.
- Die Umstellung erfolgt, solange der Legacy-Code noch vorhanden ist. So ist
  belegt, dass die umgestellten Tests am bestehenden Verhalten grün werden.

### E4: Nachweis der Verhaltensgleichheit (Q6)

- Zentrales Abnahmekriterium ist ein **deterministischer Vergleich mit dem
  Prod-Spielstand**:
  - Ein Prüfskript ersetzt vor dem Laden `Math.random` durch einen
    Zufallsgenerator mit festem Seed und friert `Date.now`, `new Date()` und
    `performance.now` auf feste Werte ein. Diese Zeitquellen werden unter anderem
    in `server/game.js`, `consortium.js`, `offers.js`, `pilot-profile.js` und
    `planet-name.js` genutzt.
  - Es lädt je eine frische Kopie des Spielstands einmal mit dem Code vor dem
    Umbau (Referenz: Commit `3e992d7`, über einen Git-Worktree) und einmal mit
    dem neuen Code.
  - Beide Läufe simulieren dieselbe Spielzeit in festen Zeitschritten. Annahme:
    30 Spielminuten in Schritten von 0,5 s, entsprechend der Serverschleife.
  - Danach wird der vollständige serialisierte Spielzustand verglichen: Spieler,
    Schiffe, Märkte, Besitz, Konsortien, Routen, Krieg und Meta.
    **Erwartet: keine Abweichung.**
  - Jede Differenz zeigt eine Verhaltensänderung und muss vor der Abnahme
    behoben werden. Die einzige Ausnahme ist eine ausdrücklich dokumentierte,
    begründete Ausnahme.
- Zusätzlich:
  - Testsuite vollständig im Profil `homeworld` grün
  - `homeworld`-Sims ohne Fehler (`sim:homeworld`, `sim:progression`, `sim/*-qa.js`)
  - Browser-Test in der lokalen Vorschau: Login, Dialoge, Planetenansicht und
    Werft ohne Konsolen- oder Serverfehler
  - `knip` (Produktionsmodus) und ESLint `no-unused-vars` ohne neue Befunde

### E5: Datenschutz beim Prod-Spielstand

- Der Spielstand enthält Spielernamen und Spielverläufe. Er wird nur zur
  Abnahmeprüfung dieses PRD verwendet.
- Arbeitskopien liegen ausschließlich im Scratchpad der Session, außerhalb des
  Repos. Sie werden nie committet.
- Nach Abschluss der Abnahme werden die Arbeitskopien gelöscht. Prüfergebnisse
  im PRD enthalten nur Kennzahlen, keine Spielernamen.

### Annahmen (in der Umsetzung zu bestätigen)

- Für `sim/simulate.js`, `sim/prd15-balance.js` und
  `scripts/benchmark-prd16.js` gilt: Sie werden auf `homeworld` umgestellt,
  wenn ihr Zweck dort sinnvoll ist, sonst entfernt. Die Entscheidung wird je
  Datei im Fortschritt dokumentiert. Bei einer Umstellung auf `homeworld` wird
  der npm-Script-Eintrag mitgezogen.
- `tests/world-profile.test.js` wird auf die verbleibende Startprüfung reduziert
  (v5/`homeworld` wird angenommen, alles andere abgewiesen).

## Nicht im Umfang

- Spielmechanische Änderungen oder Balancing in der `homeworld`-Welt.
- Migration oder Bereinigung des Prod-Spielstands.
- Änderungen am Deployment (Image, Volume, `DB_FILE`).

## Umsetzungsschritte und Fortschritt

Jeder Schritt endet mit grüner Testsuite und einem eigenen Commit; dieser
Fortschritt wird im selben Commit aktualisiert.

- [x] **S0: PRD.** Planung abgestimmt und dieses Dokument angelegt.
- [x] **S1: Prüfskript.**
  - Deterministischen Vergleich mit dem Prod-Spielstand bauen (E4).
  - Referenzlauf mit Commit `3e992d7` erzeugen.
  - Selbsttest: Zwei Läufe mit demselben Code ergeben keine Abweichung.
  - Umgesetzt in `scripts/compare-prd18.mjs` (`run` und `diff`). Der Lauf kopiert
    den Spielstand, ersetzt `Math.random` durch einen Generator mit festem Seed,
    lässt `Date`/`performance.now` mit 500 ms je Schritt laufen, ruft
    `game.tick(0.5)` auf, speichert und vergleicht alle SQLite-Tabellen zeilenweise.
    Die Ausgabe enthält nur IDs und Feldnamen.
  - Referenz `3e992d7`, 30 Minuten: 3.600 Schritte, 20 Tabellen, 338.099 Zeilen,
    Laufzeit rund 5,5 min.
  - Selbsttest (2 Minuten, zwei Läufe mit `3e992d7`): keine Abweichung. Gegenprobe
    0 gegen 2 Minuten: 6.325 abweichende Zeilen, der Vergleich erkennt also
    Zustandsänderungen.
- [x] **S2: Tests.** Legacy-Tests auf `homeworld` umstellen oder löschen (E3),
  solange der Legacy-Code noch vorhanden ist.
  - Der Standard von `Game` und `World` ist jetzt `homeworld`; der Legacy-Code ist
    noch vorhanden. Damit laufen alle Tests in `homeworld` (vorher 60 Fehlschläge
    in 20 Dateien).
  - Neue Hilfe `tests/world-helper.js`: Leitstellenabdeckung (`coverAll`),
    Andocken (`dockAt`) und Aufdecken (`reveal`). Automatische Befehle und Ziele
    im Startsektor brauchen in `homeworld` Abdeckung und Sichtbarkeit.
  - Gelöscht als reine Legacy-Tests: Hauptschiff (Tempo, Sperre), Modulkauf an
    großer Werft mit 50 % Erstattung, Werftlevel-Bonus beim NPC-Bau,
    Planeten-Abholer (`checkHaul`). Für Module, Werften und NPC-Versorgung gibt es
    `homeworld`-Tests in `physical-modules`, `physical-yards` und `real-economy`.
  - An `homeworld`-Regeln angepasst: Besitz (Werft statt Fabrik), Fraktionswerft
    und Bestellslot (reale Rümpfe), Handels-XP (manueller statt Hauptschiff-Handel),
    Planetenlevel (ohne Wirkung in der echten Wirtschaft), Beschaffungsquests
    (reale Quelle), Treibstoff (Hub statt Treibstoffdepot), Routen und Krieg
    (Abdeckung), Modulausbau (Modul landet im Laderaum), Weltprofil (Altwelt per
    Meta-Eintrag).
  - Ergebnis: `npm test` 382 von 382 grün.
- [x] **S3: Server.**
  - Profil-Abfragen auflösen und Legacy-Pfade entfernen.
  - `Game` und `World` ohne `profile`.
  - `world-profile.js` wird zur reinen Startprüfung.
  - Vergleich aus S1 ohne Abweichung.
  - Umgesetzt: alle `game.profile`-Abfragen in Spiel, Welt, Abdeckung, Abfertigung,
    Ereignissen, Schiffen, Quests, Spezialisierung, Krieg und Handlern zugunsten von
    `homeworld` aufgelöst. `world-profile.js` exportiert `WORLD_GEN`/`WORLD_KIND`,
    `checkWorldFile` und `runtimeOptions` (ohne `WORLD_PROFILE`); `/api/status`
    liefert nur noch das Protokoll.
  - Entfernt, weil in `homeworld` unerreichbar: Befehl `flagship` samt
    Hauptschiff-Sperren, `propUpgrade`, alter Werftbau (`buildableTypes`,
    `yardClasses`), alte Modul-Ein- und -Ausbauzweige, alte NPC-Versorger
    (`checkSupply`, `checkHaul`, `sendNpc`, `findSource`, `npcBusy`),
    `tickOwnedPlanet`, `payForDelivery`, Legacy-Startspieler, Drift- und
    Strategie-Ticks der Märkte (alle öffentlichen Märkte haben `realEconomy`).
  - Bleibt, weil in `homeworld` erreichbar: Hub-Gleichgewicht (`tickHubEquilibrium`
    mit Drift), fehlende Zutaten für Eilaufträge, `applyProperty`/`applyLevel` für
    gekaufte Heimatwelt-Rohstoffquellen (`homeResource`, ohne `realEconomy`),
    Gouverneurslizenz, Fabriken auf Bauplätzen, Konsortiumsstufen.
  - Der Optionsparameter `profile` ist aus Tests, Sims und Skripten entfernt;
    nur `scripts/compare-prd18.mjs` übergibt ihn noch für den Referenzcode.
  - Tests: Hilfsprüfungen auf entfernte Interna angepasst (`findSource`,
    `markNpc`, `npcBusy`, `flagship`, `WORLD_PROFILE`), außerdem die reinen
    Legacy-Tests NPC-Ladung, Drift und Nachfrage-Schwankung gelöscht.
    `npm test` 379 von 379 grün.
  - Vergleich mit dem Prod-Spielstand (30 min): **keine Abweichung**, SHA-256
    identisch mit der Referenz.
- [x] **S4: Client.**
  - Weichen über `state.homeworld` und `realEconomy` auflösen.
  - Legacy-UI entfernen.
  - `case 'send'` entfernen.
  - Irreführende Texte anpassen.
  - Umgesetzt: Hauptschiff-Schaltfläche, Krone und Routensperre für `ship.main`,
    `flagshipAt`, Ausbau-Tabelle mit Extras-Auswahl, alter Modulblock der Werft und
    Modulangebot der Außenposten (Märkte der echten Wirtschaft haben keine Module)
    entfernt. Weichen über `state.homeworld` in Detailpanel, Favoriten, Flotte,
    HUD und Heimat-Taste aufgelöst. `case 'send'` und `case 'flagship'` entfernt.
  - Texte angepasst: „Ausbau bis Stufe“ bei Gouverneurslizenz, Konsortiumsstufen
    und Konsortiumsmeldung, Ausbau-Spalte im Konsortiumsbesitz, „nicht
    Hauptschiff“ beim Schiffshandel, „Das Hauptschiff fährt keine Routen“ im
    Routeneditor, „Bietet Module an“ bei Außenposten. „Hauptschiff“ bleibt dort,
    wo die Heimatwelt das Schiff mit eingebautem Antrieb meint (Zugang, Flotte).
  - Mit den Client-Verweisen entfallen `FLAGSHIP`, `MODULE_REFUND`,
    `propUpgradeCost`, `extraOptions` und `maxLevel` in Lizenz- und
    Konsortiumstabellen. Stadtplanungstests und `verify-agrar-revision.mjs` nutzen
    für ihre Belastungsprobe eine eigene Liste weiterer Rohstoffe.
  - Bleibt: Anzeigen für Märkte ohne `realEconomy` in Planetenpanel und
    Besitzverwaltung, weil gekaufte Heimatwelt-Rohstoffquellen (`homeResource`)
    solche Märkte sind; `state.homeworld` in der Questbox als Datenprüfung, ob die
    Heimatwelt schon übertragen wurde.
  - Browser-Test (Vorschau, Testspieler): Login, Hilfe, Heimatwelt mit Handel und
    Modulen, Besitz, Konsortium, Routeneditor, Anflug, Landung und
    Planetenansicht ohne Konsolen- oder Serverfehler. Werft-, Fraktionswerft- und
    Hubabschnitte mit den echten Client-Modulen gerendert, weil im frischen
    Spielstand keine Werft aufgedeckt war.
- [ ] **S5: Shared, Sims, Skripte, Doku.**
  - Nicht mehr erreichbare Konstanten entfernen (per `knip`).
  - Sims und Skripte nach den Annahmen behandeln.
  - README und `docs/container-deployment.md` anpassen.
- [ ] **S6: Abnahme.**
  - Vergleich mit dem Prod-Spielstand ohne Abweichung.
  - Sims und Browser-Test erfolgreich.
  - `knip` und ESLint sauber.
  - Arbeitskopien des Spielstands gelöscht.

## Abnahmekriterien

1. Im Code gibt es kein Weltprofil `legacy` mehr: keine Profil-Abfragen, kein
   `WORLD_PROFILE`, kein Parameter `profile`.
2. Ein Spielstand mit `worldGen 5`/`homeworld` startet unverändert. Jeder andere
   Spielstand wird beim Start abgewiesen und nicht verändert.
3. Der deterministische Vergleich mit dem Prod-Spielstand (E4) zeigt keine
   Abweichung zwischen altem und neuem Code.
4. `npm test` ist grün, und alle Tests laufen in der `homeworld`-Welt.
5. Die `homeworld`-Sims und der Browser-Test laufen ohne Fehler.
6. Kein sichtbarer Text verweist mehr auf entfernte Funktionen (Hauptschiff,
   Planetenausbau, „Ausbau bis Stufe“).
7. `knip` (Produktionsmodus) und ESLint `no-unused-vars` melden keine neuen
   ungenutzten Dateien, Exporte oder Variablen.
8. Arbeitskopien des Prod-Spielstands sind gelöscht und nicht im Repo.
