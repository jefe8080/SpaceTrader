# Warenquelleninventar für PRD 5

## Bestätigte Ausnahme seit PRD 9

Öffentliche Hubs verwenden wieder die historische rollenabhängige Bestandsdrift
(Verkauf 60–70 %, Ankauf 30–40 %, Handel 45–55 %, Halbwertszeit 45 Minuten).
Dadurch können ausschließlich dort auch verarbeitete Waren abstrakt zufließen.
Treibstoff wird wieder mit höchstens 1,2 Einheiten/s erzeugt. Individuelle
Sollwerte und der Ausschluss roher Seltenwaren bleiben erhalten. Die folgenden
U9-Nachweise beschreiben den historischen Stand vor dieser bestätigten Ausnahme.

Stand: 2026-10-24, U17 abgeschlossen. Die Tabelle dokumentiert das ursprüngliche Quelleninventar und seine Umsetzungsschritte. Das aktive Profil `homeworld` erzeugt ausschließlich Rohstoffförderer, Abnehmer, Händler und Dienstleister; öffentliche Rezeptfabriken und zufällige Fertigwarenbestände entfallen. Die vollständige frische Generierung und der laufende Hauptstart sind geprüft.

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

U13-Nachweise unter `docs/qa/prd5-u13/`: öffentliche Bevölkerungen sind als `existing_population` registriert. Personenangebote spiegeln verfügbare Einwohner und abreisebereite Besucher; Einsteigen entfernt Personen samt Qualifikation oder dieselben Besucher. Teil-Umladung erhält Kennung, Herkunft und Reisegeld. Ankunft respektiert Wohnung/Besucherplätze, Ausbildung wandelt tatsächliche Qualifikationen um. Aufenthaltserlöse stammen einmalig aus gebundenem zivilem Reisegeld; Besucher bleiben bis zur tatsächlichen Abreise erhalten. Rundreisen belegen echte Personen/Kabinen und geben sie am Ursprung zurück; Abbruch löscht niemanden. Natürliche Schwerpunkte konsumieren tatsächlichen Verschleiß, keine Rezeptverarbeitung auf normalen Welten und keine Waren-/Besitzwertsprünge aus Questgeberlevel.

U14-Nachweise unter `docs/qa/prd5-u14/`: vier registrierte einmalige Studienvorlagen je Spieler, nach tatsächlichem persönlichem Anflug in reale verpackte Fracht übernommen. Gespeicherte Fundkennung verhindert wiederholte Vergabe. Questlieferungen verbrauchen tatsächliche verfügbare Teilmengen; Eigenproduktionsnachweise bleiben getrennt. Orbitalringe übernehmen ein vorhandenes Schiff dauerhaft als dokumentierte Infrastruktur und verbrauchen gelieferte Baumaterialien. Schiffbau bindet für jeden Rumpf die reale bestehende Materialformel und einen Ausgabeplatz; fertige Rümpfe besitzen eindeutige IDs und keinen Gratis-Tank. Fraktions-L/XL verbrauchen zusätzlich Produktwährung mit eigenem Zahlungsnachweis, ohne sie als zweite frei erzeugte Materialquelle zu verbuchen. Reliktverbesserungen verändern dasselbe Exemplar.

U15-Nachweise unter `docs/qa/prd5-u15/`: freie Ruinenstandorte sind umgewidmete vorhandene Planeten ohne Warenproduktion oder Beute. Jede Gründung bindet tatsächliche Materialien, Geld, einen vorhandenen Spatz und 20 eigene Personen samt Qualifikation. Dock, Wohnraum und zertifizierbarer Lagerraum stammen aus dieser dokumentierten Investition; keine wiederholten Einstiegshilfen. Warp verschiebt denselben registrierten Standort, bewahrt Bestände und schafft weder Schiffe noch Waren. Bestandsänderungen sind während der Vorbereitung gesperrt.

U17-Gesamtabnahme A03: `docs/qa/prd5-u17/progression.json` dokumentiert einen vollständigen frischen Einzelspielerlauf mit ausschließlich tatsächlicher privater Verarbeitung und natürlichen Einkäufen. Normale Questbelohnungen sind separat gezählt; Exportverkäufe besitzen öffentliche Gegenkassen. Beide zusätzlichen Infrastruktur-Schiffe werden aus realen Beständen gebunden; die zweite Welt besitzt keine neuen Einstiegshilfen. `fresh-runtime.json` weist den tatsächlichen neuen Hauptstart mit 57 öffentlichen Märkten und null erzeugten Industriewaren nach. 286 Tests decken Mengen, Geld, Herkunft, Waren-/Modul-/Personenhandel, Konkurrenzreservierungen, Einmaligkeit und Neustarts ab. Explizite Geldquellen bleiben Start-/Quest-/Minispielbelohnungen, begrenztes öffentliches Nachfragekapital und ausgewiesenes ziviles Einkommen; Materialverarbeitung erzeugt davon keine zusätzliche Quelle.
