# Warenquelleninventar für PRD 5

Stand: 2026-10-24, U9. Die Tabelle dokumentiert das ursprüngliche Quelleninventar und seine Umsetzungsschritte. Nach geprüftem Einstieg erzeugt das Profil `homeworld` jetzt ausschließlich Rohstoffförderer, Abnehmer, Händler und Dienstleister; öffentliche Rezeptfabriken und zufällige Fertigwarenbestände entfallen. Die neue Generierung wird an frischen Welten geprüft.

| Quelle / Senke | Bestehender Code und Verhalten | Ziel / Umsetzungsschritt |
|---|---|---|
| Neue Planeten | `server/markets.js`, `buildMarket`: zufällige Anfangsbestände für Förder-, Verbrauchs- und Händlerplätze; Planetentypen enthalten auch Fertigwaren | Nur natürliche Förderung; keine erzeugten Fertigwaren. U9 |
| Verarbeitende Stationen | `buildMarket`, Fabrikstrategie und `NOMINAL.factory`: Anfangsbestände und nicht vollständig zutatengebundene Drift | Verarbeitung nur auf Ruinenwelten; nicht mehr öffentlich generieren. U9 |
| Händler / Außenposten | `addTraders`: zufällige Ware und Bestand; Drift füllt oder entfernt Güter | Leere bestandsgebundene Handelsplätze, reales Einkaufsgeld, Transport. U9 |
| Hubs | `buildMarket`: Treibstoff erzeugt, seltene Rohformen und Handelswaren vorgefüllt; `NOMINAL.hub` | Importierter Treibstoff; nur veredelte Seltenwaren ankaufen. U9/U11 |
| Extraktoren / Asteroiden | `buildMarket`, Extraktorstrategie, `server/ships.js` `extract`: natürliche Förderung, teilweise als Drift | Reale Förderung, 25–100 % Versorgungsleistung; reale Lagergrenzen. U9 |
| Nachgenerierte Sektoren | `server/world.js` `ensureSector`, `server/worldgen.js` `generateSector`: sämtliche vorgenannten Anfangsbestände erneut | Gleiche Warenherkunft auch bei späterer Entdeckung. U9 |
| Startsystem | `server/worldgen.js` `createOrigin`: Sonderbestände, sofort kaufbarer Spatz und 25-%-Modifier | Öffentlicher Handel bleibt; persönliche Heimat trägt den Einstieg. U5/U9 |
| Startspieler | `server/game.js` `createPlayer`/`spawnShip`: Credits und vollgetanktes Startschiff | Einmalig registrierte Ausnahme mit Empfänger; Versorgung und Reparaturen gemäß `shared/homeworld.js`. U5 |
| Zweiter Frachter / Reliktfund | Noch nicht vorhanden | Eindeutige einmalige Questquelle; Frachter H05, versiegelter Fund H04, keine wiederholbare Frachtquelle. U5/U6 |
| Normale Werften | `buildMarket`: zufällige Bauteilbestände. `startBuild` verbraucht Material, Abschluss erzeugt ein Schiff | Keine zufälligen Bauteile; Materialbau bleibt erhalten. U9/U10 |
| Fraktionswerften | `server/worldgen.js`: dauerhaftes Angebot und zufälliger Währungsbestand. `buyFactionShip`: neues Schiff ohne Materialbau, Angebot bleibt | Tatsächlicher Bestand oder materialgebundener Bau; reale neue Produktwährung. U10/U11 |
| Module | `buyModule`: unbegrenzter virtueller Einkauf gegen Geld; `removeModule`: Geldrefund | Physisches Exemplar, reale Stückbestände und Rezepte, verpackt 30 Einheiten. U10 |
| Schiffsupgrades / Recycling | `server/handlers/shipyard.js`, `server/handlers/property.js`: Credits, Verbesserungen und Recycling | Im Herkunftsaudit mit Baukosten/Materialsenken abgleichen. U10 |
| NPC-Laden | `server/ships.js` `runSupply`: Ware erst an Quelle entnehmen, gegebenenfalls Eigentümer bezahlen | Budget vor Bestellung/Laden prüfen; Bestände/Reserven respektieren. U9 |
| NPC-Ankunft | `server/game.js` `finishSupply`: Liefermenge ins Lager, Schiff gelöscht, Restladung geht verloren | Nur tatsächlich entladene Menge abbuchen; Rest rückführen/einlagern/weiter anbieten. U9 |
| Eigene Lager / Konsortium | `ownerTransfer`, `memberTransfer`, `tradeWithOwner`: vorhandene Ware verschieben; Eigentümertransfer kostenlos, Konsortium mit Gegenkonto | Gemeinsame Reserven und neue Kapazität beachten; bestehende Rechtsunterschiede erhalten. U7/U9/U12 |
| Eigene Produktion | `server/markets.js` `runRecipe`, Gebäudefabriken; `server/property.js` | Nur persönliche Ruinenwelten, vollständige Zyklen, Energie, Personal, Reserven. U7/U9 |
| Questgeberlevel / Besitz-Upgrades | `applyLevel`, `applyProperty`: neue Slots teils vorgefüllt, höhere Raten/Kapazität, Ertragsboni | Kein unsichtbarer Leistungssprung; neue Slots leer; konkrete Infrastruktur. U9/U13 |
| Beschaffungs-/Abbauquests | `server/quests.js` `questProgress`: Fracht abziehen, am Ziel bis Lagergrenze hinzufügen; Rest kann verschwinden | Bedarf/Reservierung berücksichtigen; registrierte Funde und reale Übertragung. U9/U14 |
| Kurier / Rundreise | `questProgress`: gesonderter Questzustand, Touristen ohne normale Personenbestände | Registrierte Questfracht; Personenherkunft, Plätze, Aufenthalte/Abreise. U13/U14 |
| Questbelohnungen / Minispiele / Schmuggel | `server/quests.js`, `server/handlers/fun.js`, `shared/planetside.js`: überwiegend Geld/XP, Sonderzustände | Warenbelohnung nur als begrenzter Fund; Geldquellen getrennt bilanzieren. U9/U14 |
| Sondernachfrage | `server/events.js` `sellToEvent`: Fracht verbraucht, Credits erzeugt, kein Zielbestand | Ausgewiesener tatsächlicher Verbrauch mit begrenztem Nachfragebudget. U9 |
| Ziviler Verbrauch / Einnahmen | `server/property.js` `tickOwnedPlanet`: Warenverbrauch zahlt Fixpreiserlös ohne reale Kasse | Steuern und Konsumbudget aus demselben begrenzten Einkommen; Betriebsverbrauch zahlt nichts aus. U7/U9 |
| Schiffshandel / Kartenhandel | `server/offers.js`: Gegenkonten, ein bestehendes Schiff wechselt Besitzer, Gebühr als Geldsenke | Kein neuer Schiff-/Frachtbestand; Relikt-/Eigentumsregeln ergänzen. U6/U15 |

## Bilanznachweise vor der Umstellung

- Für jeden Anfangsbestand Quelle, Empfänger/Fund-ID, Ware, Menge und einmalige Entnahme erfassen.
- Produktion: Eingangsmenge, vollständige Zyklen, Ausgangsmenge und Lagergrenze; kein Drift-Gegenhandel.
- Transport: Quelllager + Transitfracht + Ziellager bleiben erhalten, außer ausgewiesenem Verbrauch.
- Geld: Steuer und Konsum teilen das Einkommen; Käufer besitzen ausreichende Kassen. Angebot erzeugt kein Nachfragegeld.
- Spielerbeitritt, neue Sektoren, Wiederanmeldung und Neustart dürfen keine zweite Einstiegshilfe auslösen.
- Alle 40 vorhandenen Rezepte und sechs Module bleiben im Katalogaudit; sechs neue Veredelungen werden in U11 ergänzt.

U9-Nachweise unter `docs/qa/prd5-u9/`: 25 generierte Sektoren ohne öffentliche Verarbeitung/Fertigwaren, natürliche Anfangsvorräte mit Quellen-ID, einmalige Startschiffe samt Tank, echte Förderung/Verbrauch statt Drift, getrennte Kassen und reservierte NPC-Einkäufe, verlustfreie Transport-/Weiterverkaufsbilanz, begrenzte Bürgerzahlungen und vollständige Questübergaben. Einkaufs-/Verkaufszahlungen besitzen Gegenkassen; lokale Produktionszutaten erzeugen keine Auszahlung. Generierte Nachfragebudgets sind einschließlich ungenutzter Transportkasse auf zwei Stunden begrenzt; tatsächlich erwirtschaftete Erlöse bleiben erhalten.

U10-Nachweise unter `docs/qa/prd5-u10/`: sechs materialgebundene Modulrezepte, physische Lager-/Frachtexemplare, Ein-/Ausbau ohne Refund und verbrauchendes Studium. Öffentliche Modulbestände stammen aus tatsächlichem Handel. Reguläre und Fraktionswerften verbrauchen dieselbe konkrete Materialformel; fertige Rümpfe haben IDs und endliche Stückbestände. Genau ein öffentlicher Einstiegs-Spatz am Ursprung ist als `public_start_exception` mit Tankfüllung registriert. Spätere Schiffe starten ohne kostenlosen Treibstoff. Wiederverkauf erhält Rumpf, Module, Ausbau und Tank bei tatsächlicher Gegenkasse.

U11-Nachweise unter `docs/qa/prd5-u11/`: sechs Sonderveredelungen nur auf persönlichen Welten, vollständige Zyklen und konkrete Betriebsanforderungen. Hubs und Fraktionen nehmen nur Produkte an; Rohformen bleiben zwischen Spielern handelbar. Alle 18 Schiffsgebühren und Nachfragekapazitäten sind nach Rohwert/Produktwert umgerechnet; keine zweite Verbuchung der Käuferwährung als Baumaterial. Reproduzierbare Preisliste für sämtliche 66 Waren unter `docs/PRD-5-preise.md` und `.json`. Standortaufschläge berücksichtigen ausschließlich tatsächlich vorhandene öffentliche Produzenten.

Das Inventar ist noch keine vollständige A03-Gesamtabnahme: Personenbestände in U13 und registrierte spätere Questfunde in U14 ergänzen die Nachweise. U17 führt sie zusammen.
