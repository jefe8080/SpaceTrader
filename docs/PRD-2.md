# PRD: SpaceTrader Erweiterung "Progression"

Stand: 2026-10-07 · Status: Entwurf, im Interview abgestimmt · Baut auf [PRD.md](PRD.md) (Erweiterung "Galaxie") auf

## 1. Ziel

Aktives Spielen soll sich lohnen, und der Handel soll lebendig bleiben. Heute ist Automatisierung über Routen der einzige sinnvolle Weg, und die Märkte kippen dauerhaft auf 0 % oder 100 %. Die Erweiterung umfasst:

- **Wirtschaft:** Märkte, die sich erholen und schwanken, NPC-Verkehr in beide Richtungen
- **Progression:** Erfahrungspunkte und Level für Piloten, Planeten und Werften, Fraktionsruf
- **Inhalte:** Quests, Hauptschiff, Sensormodul, Bestellslot, 12 neue Fraktionsschiffe
- **Atmosphäre:** prozedurale Musik und Effekte

Alle Zahlen in diesem Dokument sind Kalibrierungsannahmen und gehören zentral nach `shared/*`.

## 2. Ausgangslage (Codestand nach Phase 7)

- **Eigenverbrauch:** 2 % des Überschusses pro Minute, nur über 80 % Füllstand (`SELF_USE`, `shared/config.js`). Produzenten bleiben dadurch bei 100 %.
- **Versorger:** Nur Fabriken, Extraktoren und Werften schicken Versorger, Planeten nie. Verbrauchsgüter von Planeten laufen in ca. 20 min leer und bleiben dort.
- **Versorger-Ladung:** 100 Einheiten pro Fahrt, unabhängig vom Bedarf. Der Überschuss verfällt bei der Ablieferung.
- **Entfernungsprämie:** wird bei der Generierung aus der Flugzeit zum nächsten Produzenten berechnet und als Standort-Modifier mit ▲▼ angezeigt. Damit lässt sich die Lage von Produzenten erschließen.
- **Sensor:** globale Konstante 2.500 für alle Schiffe.
- **Pilotenlizenz:** Stufen 1 bis 6, nur gegen Credits. XP, Level und Ruf gibt es nicht.
- **Fraktionen:** 6 Fraktionen mit je 1 Schiff der Klasse F (ab Lizenz 4, 7 bis 10 Mio Cr plus Währungsware).
- **Audio:** nicht vorhanden.

Bereits behoben, vor diesem PRD:
- Routen lassen sich ohne neue Schiffe bearbeiten.
- NPC-Werften schalten nach 15 min ohne baubares Material auf den nächsten Typ der Bauliste.
- Mittelklick hängt Befehle an die Queue an, weil Firefox bei Shift+Rechtsklick immer sein Kontextmenü öffnet.

## 3. Grundsatzentscheidungen

| # | Entscheidung |
|---|---|
| P1 | Weltreset ohne Migration. Es gibt nur Test-Spielstände. `WORLD_GEN_VERSION` wird erhöht. |
| P2 | Fortschritt (XP, Level, Ruf) entsteht nur durch **aktive** Handlungen. Routenhandel bringt Geld, aber keine XP. |
| P3 | Lizenzen und Fraktionsschiffe sind **doppelt gesperrt**, durch Level bzw. Rang **und** Credits. |
| P4 | NPCs bewegen nur kleine Mengen. Große Warenströme bleiben Sache der Spieler. |
| P5 | Kein Audio aus fremden Quellen. Alles wird per WebAudio im Code erzeugt. |
| P6 | Quests haben keine Fristen. Die Belohnung richtet sich nach dem geschätzten Aufwand, nicht nach der gebrauchten Zeit. |

## 4. Wirtschaftsdynamik

### 4.1 Rückkehr zum Gleichgewicht

- **Ersetzt den bisherigen Eigenverbrauch** (`SELF_USE`).
- **Ziel-Füllstand:** Jeder Lagerplatz hat einen eigenen Ziel-Füllstand, bei Produzenten 60 bis 70 %, bei Verbrauchern 30 bis 40 %.
- **Drift:** Der Bestand bewegt sich exponentiell auf das Ziel zu, mit einer Halbwertszeit von ca. 45 min. Die Drift wirkt in beide Richtungen, also als Verbrauch über dem Ziel und als Zufluss unter dem Ziel.
- **Folge:** Eine leergehandelte Route erholt sich in 1 bis 2 h.
- **Spielerbesitz:** Die Drift gilt nicht für Lager in Spielerbesitz. Dort bleibt die bisherige Besitzerwirtschaft (Fixpreis-Verbrauch) bestehen.

### 4.2 Nachfrage-Schwankungen

- **Takt:** Pro Planet und Ware springt der Ziel-Füllstand alle 2 bis 6 h (zufällig) auf einen neuen Wert innerhalb einer Spanne, z. B. von 35 % auf 15 % (hohe Nachfrage) oder 55 % (Sättigung).
- **Glättung:** Der Übergang erfolgt über die Drift aus 4.1, nicht sprunghaft im Bestand.
- **Wirkung:** Handelsgelegenheiten entstehen und vergehen. Routen müssen gelegentlich angepasst werden.

### 4.3 Planeten-Abholer

- **Auslöser:** Planeten schicken NPC-Abholer zu Fabriken, Raffinerien und Extraktoren, deren Output-Lager über dem Ziel-Füllstand liegt und deren Ware der Planet verbraucht.
- **Ablauf:** Der Abholer kauft beim Produzenten und liefert an den Planeten. Der Planet verbraucht die Ware über seine normale Verbrauchsrate.
- **Reichweite und Takt:** wie die bestehenden Versorger (`SUPPLY.RANGE`, Cooldown).

### 4.4 Ladung von Versorgern und Abholern

- **Menge pro Fahrt:** höchstens `min(10 % der Kapazität des Ziellagers, Kapazität − Bestand)`, mindestens 5, höchstens 40 Einheiten.
- **Kein Verfall mehr:** Es wird nur geladen, was ins Ziellager passt.
- **Begrenzung:** pro Markt und Ware höchstens 1 NPC-Schiff gleichzeitig unterwegs.

### 4.5 Entfernungsprämie verschleiern

- **Anzeige entfernen:** Tooltip "Standort-Modifier" und die Markierungen ▲▼ in der Detailansicht entfallen.
- **Mehr Rauschen:** Der Zufallsanteil des Standort-Modifiers steigt von ±15 % auf ±25 %.
- **Prämie bleibt:** Die Entfernungsprämie selbst bleibt als Anreiz für Fernhandel erhalten. Die Schwankungen aus 4.1 und 4.2 überdecken sie im Preis.

## 5. Hauptschiff

- **Ernennung:** Der Spieler ernennt jederzeit eines seiner Schiffe zum Hauptschiff oder beruft es ab. Es gibt höchstens ein Hauptschiff pro Spieler.
- **Cooldown:** 5 min nach jeder Änderung (Ernennen, Abberufen, Wechseln).
- **Routen:**
  - Beim Ernennen werden alle Routenbefehle aus seiner Queue entfernt. Andere Befehle bleiben.
  - Das Hauptschiff kann keiner Route zugewiesen werden und erscheint nicht im Routeneditor.
- **Tempo:** ×4 (+300 %). Der Faktor wirkt zusätzlich zu Upgrades, Werftbonus und Zonen.
- **Treibstoff:** Der Verbrauch pro Sekunde steigt ebenfalls ×4. Der Verbrauch pro Strecke bleibt also gleich.
- **Klassen:** keine Beschränkung, jedes Schiff ist möglich.
- **Anzeige:** Kronensymbol am Schiff und in der Flottenliste.

## 6. Sensormodul "Sensorphalanx"

- **Wirkung:** Das erste Modul gibt +60 % Sensorreichweite, jedes weitere +30 %. Beispiel: 3 Module ergeben 2.500 × 2,2 = 5.500.
- **Belegung:** 30 Fracht pro Modul, wie die übrigen Module.
- **Nebelzonen:** Der Zonenfaktor (0,3) wirkt weiterhin multiplikativ.
- **Bezug:** Zufallspool der Module an großen Werften.
- **Technik:**
  - `shipStats().sensor` ersetzt die Konstante `WORLD.SENSOR_RANGE` in `scan()`.
  - Die Fernortung von Systemen (50.000) bleibt unverändert.

## 7. Audio

- **Effekte:** ca. 10 Klänge, prozedural per WebAudio synthetisiert:
  - Klick
  - Kauf und Verkauf
  - Andocken
  - Befehl bestätigt
  - Quest angenommen und abgeschlossen
  - Level-Aufstieg
  - Rangaufstieg
  - Fehler
- **Musik:**
  - Ein prozeduraler Ambient-Generator mit langsamen Pads und Arpeggien in Moll.
  - Die Musik wiederholt sich nicht.
  - Sie startet erst nach der ersten Interaktion (Autoplay-Sperre der Browser).
- **Bedienung:**
  - Ein Lautsprecher-Icon im HUD öffnet ein Aufklappmenü.
  - Es gibt getrennte Regler für Musik und Effekte und einen Stummschalter.
  - Die Einstellungen werden im localStorage gespeichert.

## 8. Erfahrung und Pilotenlevel

### 8.1 XP-Quellen

| Quelle | Anteil am Fortschritt |
|---|---|
| Quests | ca. 80 % |
| Erstentdeckung eines Sektors | Nebenquelle |
| Neuer Eintrag im Almanach (Rezept, Schiff, Modul) | Nebenquelle |
| Manueller Handel des Hauptschiffs, z. B. 1 XP je 1.000 Cr Gewinn | Nebenquelle |
| Routenhandel | keine XP |

### 8.2 Level und Lizenzen

| Pilotenlevel | XP kumuliert | erreicht nach ca. (aktiv) | schaltet frei |
|---|---|---|---|
| 1 | 0 | Start | Pilotenlizenz 1 (vorhanden) |
| 2 | 100 | 1 h | Kauf von Pilotenlizenz 2 |
| 3 | 600 | 5 h | Kauf von Pilotenlizenz 3 |
| 4 | 2.000 | 15 h | Kauf von Pilotenlizenz 4 |
| 5 | 5.500 | 35 h | Kauf von Pilotenlizenz 5 |
| 6 | 12.000 | 70 h | Kauf von Pilotenlizenz 6 |
| 7 | 30.000 | 150 h | Titel "Arbeitsloses Opfer" |

- **Annahme:** Ein aktiver Spieler erreicht 100 bis 200 XP/h.
- **Lizenzkauf:** Die Lizenzpreise bleiben wie bisher. Für Lizenz n gilt zusätzlich: Pilotenlevel ≥ n.
- **Titel:** Der Titel von Level 7 erscheint im Tooltip beim Überfahren der Schiffe des Spielers, auch für andere Spieler.
- **HUD:** zeigt Pilotenlevel und XP-Fortschritt.
- **Klasse F:** entfällt aus Lizenz 4 (siehe Kapitel 11).

## 9. Quests

### 9.1 Ablauf

- **Questgeber:** Jeder Planet und jede Werft hat eine Questtafel, auch im Spielerbesitz.
- **Angebot:**
  - Die Zahl der Slots richtet sich nach dem Level (Kapitel 10).
  - Neue Angebote erscheinen alle 30 bis 60 min.
  - Die Tafel ist sichtbar, sobald das Objekt bekannt ist, ohne Andocken.
- **Annehmen:**
  - Nur mit einem eigenen Schiff, das beim Questgeber angedockt ist.
  - Pro Spieler ist nur eine Quest gleichzeitig aktiv.
  - Ein angenommenes Angebot verschwindet für alle anderen Spieler.
- **Frist:** keine.
- **Abbruch:**
  - jederzeit möglich
  - danach 10 min Sperre für neue Quests
  - bei Fraktionsquests zusätzlich ein kleiner Rufverlust (Kapitel 11)
- **Abschluss:** Credits und XP gehen an den Spieler, XP an den Questgeber, bei Fraktionsplaneten zusätzlich Ruf.

### 9.2 Katalog

| Typ | Ablauf | Questgeber | Voraussetzung |
|---|---|---|---|
| Beschaffung | x Einheiten Ware y beschaffen (Kauf bei Station z oder frei) und an den Questgeber liefern | Planet, Werft | - |
| Kurier | Questfracht bei z abholen (kostenlos, nicht verkäuflich) und zu a bringen | Planet | - |
| Rundreise | Touristen abholen, 3 Stationen anfliegen, zurückbringen | Planet (Resort, Urban) | Passagierkabine |
| Erkundung | n % von Sektor y aufdecken oder Sondergebiet z besuchen | Planet, Werft | - |
| Abbau | x Einheiten Erz oder Eis selbst abbauen und liefern | Werft | Abbaugeräte |
| Eilbestellung | Material für den aktuellen Bau der Werft liefern | Werft | - |

### 9.3 Belohnung

- **Formel:** `Belohnung = Basis × geschätzter Aufwand × Schwierigkeitsfaktor × Warenwert-Anteil`
  - Der geschätzte Aufwand sind die Flugminuten bei Speed 150 plus Lade- und Stoppzeiten.
  - Der Schwierigkeitsfaktor richtet sich nach dem Questlevel, also höchstens dem Level des Questgebers.
- **Zielwert:** Eine Quest bringt das 3- bis 5-fache dessen, was eine Handelsroute im gleichen Zeitraum bringt.
- **XP:** skalieren mit derselben Aufwandsschätzung.

## 10. Level von Planeten und Werften

- **Spanne:** Level 0 bis 6, Start bei 0, kein Verfall.
- **XP-Quellen:** Quests dieses Questgebers sind die Hauptquelle. Dazu kommt wenig XP aus dem Handelsvolumen, das Spieler dort umsetzen.
- **Questtafel:** 1 Slot bei Level 0 bis 1, 2 Slots bei 2 bis 4, 3 Slots bei 5 bis 6. Die Questschwierigkeit reicht bis zum eigenen Level.

### 10.1 Planeten

- **Produktion und Verbrauch:** +10 % pro Level, bei Level 6 also +60 %.
- **Lager:** +15 % pro Level.
- **Neue Waren:** Bei Level 2, 4 und 6 wird je eine zusätzliche Ware freigeschaltet, abwechselnd produziert und verbraucht. Sie kommt aus einem Pool passend zum Planetentyp.
- **Kaufpreis:** ×(1 + 0,4 × Level), bei Level 6 also ×3,4.
- **Spielerbesitz:** Planeten im Spielerbesitz geben weiter Quests und steigen im Level. Der Besitzer profitiert von allen Effekten.

### 10.2 Werften

- **Baubonus:** +5 % pro Level auf alle Werte der gebauten Schiffe (Tempo, Fracht, Tank, Abbau), bei Level 6 also +30 %.
- **Bonus haftet am Schiff:** Er geht beim Verkauf mit und wird angezeigt, z. B. "Gebaut in Werft Stufe 4 (+20 %)".
- **Gilt für:** NPC-Bau, Bestellslot (Kapitel 12) und Spielerwerften.
- **Abgrenzung:** Das Werftlevel ist unabhängig von der Werftgröße (normale oder große Werft).

## 11. Fraktionsruf und Fraktionsschiffe

### 11.1 Ruf

- **Ränge:** 0 bis 3, mit den Schwellen 0 / 100 / 400 / 1.200 Ruf.
- **Quelle:** Quests bei Planeten der Fraktion. Der Ruf ist proportional zu den XP.
- **Verlust:** Nur beim Abbruch von Fraktionsquests. Der Ruf fällt nie unter die Schwelle des aktuellen Rangs, ein erreichter Rang bleibt also erhalten.
- **Fraktionen untereinander:** Ruf bei einer Fraktion senkt nicht den Ruf bei einer anderen.

### 11.2 Schiffe

- **Umfang:** Jede Fraktion hat 3 Schiffe. Das bisherige F-Schiff wird zum Spezialschiff, mit höheren Werten und einer eigenen Fraktionsfähigkeit. Je ein L und ein XL kommen neu hinzu. Insgesamt sind das 12 neue Schiffe mit Sprites. Werte und Fähigkeiten stehen in Kapitel 17.4.

| Schiff | Fraktionsrang | Pilotenlizenz |
|---|---|---|
| Fraktions-L | 1 | 3 |
| Fraktions-XL | 2 | 5 |
| Spezial (bisheriges F-Schiff) | 3 | 5 |

- **Werte:** +40 bis 60 % auf die Kernwerte gegenüber dem normalen Gegenstück, mit dem Profil der Fraktion. Beispiele:
  - Handelsliga: Fracht
  - Bergbaugilde: Abbau
  - Nomadenclan: Tempo und Tank
- **Preis:** ×2,5 des normalen Gegenstücks plus die Währungsware der Fraktion, die mit der Klasse skaliert.
- **Kauf:** an Fraktionswerften, wie bisher. Die Währungsware muss im Laderaum der angedockten eigenen Schiffe liegen.

## 12. Bestellslot an Werften

- **Ort:** NPC-Werften bekommen einen vierten Slot neben den drei Angebotsplätzen. Spielerwerften haben keinen Bestellslot.
- **Bestellbar:** Schiffe, die der Spieler kennt (Almanach), besitzen darf (Lizenz, Fraktionsrang) und die die Werftgröße bauen kann:
  - normale Werft: S und M
  - große Werft: L und XL
  - Fraktionsschiffe: nur an der Fraktionswerft der jeweiligen Fraktion
- **Anzahlung:** Bei der Bestellung werden sofort 2 × Katalogpreis fällig. Es gibt keine Erstattung.
- **Bau:**
  - Das bestellte Schiff hat Vorrang vor der Bauliste.
  - Das Material muss normal angeliefert werden. Die Versorger der Werft holen gezielt Material dafür, Spieler können liefern.
- **Kauf:**
  - Fertig erscheint das Schiff im normalen Angebot zum normalen Preis (1 × Angebotspreis).
  - Für 10 min nach Fertigstellung darf nur der Besteller kaufen, danach ist das Schiff frei.
- **Belegung:**
  - Pro Werft gibt es eine offene Bestellung, für alle Spieler gemeinsam.
  - Der Slot zeigt "Bestellt: <Typ>".
  - Eine neue Bestellung ist erst nach Fertigstellung möglich.
- **Werftbonus:** gilt wie bei jedem Bau (Kapitel 10.2).

## 13. Nicht im Umfang

- Fristen für Quests
- Rivalität oder Feindschaft zwischen Fraktionen
- Fremde Audiodateien
- Migration bestehender Spielstände
- Gruppenquests mehrerer Spieler
- Weiterhin nicht im Umfang (siehe [PRD.md](PRD.md) Kapitel 12): Kampf, Authentifizierung, Chat

## 14. Risiken

| Risiko | Gegenmaßnahme |
|---|---|
| Drift und Schwankungen machen den Handel zu zufällig, und Routen lohnen sich nicht mehr | Halbwertszeit und Spanne der Ziel-Füllstände in der Simulation kalibrieren |
| NPC-Verkehr (Versorger plus Abholer) belastet Tick und Netzwerk | Begrenzung 1 je Markt und Ware, Abholer nur in Sektoren mit Spielerpräsenz (Kapitel 17.1) |
| Quests lassen sich exploiten, z. B. eine Beschaffung aus eigenem Besitz zum Nulltarif | Beschaffungsquest nie mit Quelle im Besitz des Annehmenden erzeugen, Belohnung auf Aufwand statt Warenwert stützen |
| Ein Hauptschiff mit ×4 auf einem XL- oder Fraktionsschiff dominiert | Bewusst akzeptiert, die Gewinne pro Stunde in der Simulation beobachten |
| Die Lizenzsperre über das Level bremst reine Händler zu stark | Nebenquellen der XP kalibrieren (Kapitel 8.1) |

## 15. Phasenplan

Jede Phase ist für sich spielbar. Ein Weltreset ist in jeder Phase erlaubt.

| Phase | Inhalt |
|---|---|
| 8 Wirtschaftsdynamik | Ziel-Füllstand und Drift, Nachfrage-Schwankungen, Planeten-Abholer, Ladung 10 %, Entfernungsprämie verschleiern, Simulation anpassen |
| 9 Komfort | Hauptschiff, Sensormodul, Audio (Effekte, Musik, Aufklappmenü) |
| 10 Erfahrung und Quests | XP und Pilotenlevel, Lizenzsperre, Titel, Questtafeln, 6 Questtypen, Belohnungsformel, Quest-Bot in der Simulation |
| 11 Level und Fraktionen | Level von Planeten und Werften mit Effekten, Werftbonus am Schiff, Fraktionsruf, 12 neue Fraktionsschiffe |
| 12 Bestellslot | Vierter Werftslot, Anzahlung, Vorrang beim Bau, Vorkaufsfrist |

## 16. Offene Punkte und Annahmen

1. **Annahmen zur Kalibrierung:**
   - alle Zahlen in diesem Dokument, insbesondere Ziel-Füllstände, Halbwertszeit, Schwankungsspanne
   - XP-Kurve und Belohnungsfaktor 3 bis 5
   - Rufschwellen
   - Werte und Preise der Fraktionsschiffe
2. **Ausarbeitungen:** entschieden in Kapitel 17.
3. **Unsicherheit:** Ob Spieler das Questen ohne Fristen als zu entspannt empfinden, zeigt sich erst im Spiel.

## 17. Entscheidungen zu den offenen Punkten

Diese Punkte hat Claude nach dem Interview entschieden. Alle Werte sind Annahmen für die erste Kalibrierung.

### 17.1 Regeln

- **Spielerbesitz und Drift:** Lager im Spielerbesitz bekommen keine Rückkehr zum Ziel-Füllstand und keine Nachfrage-Schwankungen. Dort steuert der Besitzer über Fixpreis-Verbrauch und Zoll. Eine Drift würde seine Einstellungen unterlaufen.
- **Planeten-Abholer:**
  - Abholer werden nur in Sektoren simuliert, in denen in den letzten 30 min ein Spielerschiff unterwegs war oder ein Spieler Besitz hat.
  - In anderen Sektoren hält allein die Drift den Markt im Gleichgewicht. Das Ergebnis ist ähnlich, aber ohne sichtbaren Verkehr.
- **Beschaffungsquests:** Eine Beschaffungsquest wird nie mit einer Quelle oder einem Ziel erzeugt, das dem annehmenden Spieler gehört. Liefert der Spieler trotzdem aus eigenem Lager, ist das erlaubt. Die Belohnung stützt sich auf den Aufwand, nicht auf den Warenwert, deshalb lohnt sich ein solcher Kreislauf nicht.

### 17.2 XP der Nebenquellen

| Quelle | XP | Begrenzung |
|---|---|---|
| Erstentdeckung eines Sektors (erster Spieler weltweit) | 60 | - |
| Sektor erstmals selbst besucht (bereits von anderen entdeckt) | 20 | - |
| Almanach: neues Rezept | 5 | - |
| Almanach: neues Schiff oder Modul | 10 | - |
| Manueller Handel des Hauptschiffs | 1 je 1.000 Cr Gewinn | höchstens 40 XP pro Stunde |

Plausibilitätsprüfung:
- Mit Quests kommt ein aktiver Spieler auf 100 bis 200 XP/h (Kapitel 8.2).
- Die Nebenquellen bringen anfangs 20 bis 40 XP/h und versiegen später, wenn der Almanach weitgehend gefüllt ist.
- Damit bleibt der Anteil der Quests bei ca. 80 %.
- Wer nur handelt, erreicht Level 2 und 3 auch ohne Quests in vertretbarer Zeit, darüber hinaus nicht.

### 17.3 Zusatzwaren je Planetentyp

- **Freischaltung:** Level 2 produziert, Level 4 verbraucht, Level 6 produziert.
- **Rate:** Die Rate einer Zusatzware entspricht einem Warenfluss von 6 Cr/s zum Basispreis, also `Rate = 6 / Basispreis` Einheiten pro Sekunde. Sie skaliert mit der Planetengröße.

| Planetentyp | Level 2 (produziert) | Level 4 (verbraucht) | Level 6 (produziert) |
|---|---|---|---|
| Agrarwelt | Konserven | Medikamente | Textilien |
| Ozeanwelt | Wasser | Maschinen | Kunststoff |
| Wüstenwelt | Glas | Kühlmittel | Silizium |
| Bergbauwelt | Barren | Fräser | Seltenmetalle |
| Eiswelt | Wasser | Elektronik | Kühlmittel |
| Metropole | Elektronik | Habitatmodule | Roboter |
| Paradieswelt | Arbeiter | Medikamente | Konserven |
| Gasriese | Schiffstreibstoff | Kühlmittel | Chemikalien |
| Dschungelwelt | Medikamente | Fräser | Textilien |
| Vulkanwelt | Seltenmetalle | Maschinen | Chemikalien |
| Kolonie | Arbeiter | Konsumgüter | Barren |
| Industriewelt | Platten | Elektronik | Rumpfsegmente |

Regel: Eine Zusatzware ist nie eine Ware, die der Planet schon in der Gegenrichtung handelt. Ein höher gelevelter Planet beliefert damit Fabriken und wird für Spieler zur neuen Quelle bzw. zum neuen Abnehmer.

### 17.4 Fraktionsschiffe

**Grundregeln:**
- **Fraktions-L und -XL:** Sie übertreffen das passende normale Gegenstück im Profilwert um ca. 50 %, in den übrigen Werten um ca. 20 %.
- **Preis:** 2,5 × Gegenstück, gerundet.
- **Währungsware:** L ca. 1/5, XL ca. 1/2 der Menge des Spezialschiffs. Die Menge des Spezialschiffs bleibt wie bisher.
- **Spezialschiffe:** Die bisherigen F-Schiffe werden aufgewertet und bekommen eine **eigene Fraktionsfähigkeit**. Bisher waren sie bei Fracht schwächer als normale XL-Schiffe, für ein Rang-3-Schiff ist das zu wenig.
- **Sprites:** Für die 12 neuen Schiffe werden über `npm run sprites` neue Sprites erzeugt.

| Fraktion | Schiff | Klasse | Fracht | Tempo | Abbau | Tank | Preis | Währung | Gegenstück |
|---|---|---|---|---|---|---|---|---|---|
| Bergbaugilde | Gildenhauer | L | 720 | 100 | 42 | 180 | 1,6 Mio | 100 Diamant | Mammut |
| | Tiefenbrecher | XL | 2.200 | 100 | 60 | 620 | 14 Mio | 250 Diamant | Titan |
| | Erzbrecher | Spezial | 1.500 | 125 | 80 | 400 | 20 Mio | 500 Diamant | - |
| Tech-Konsortium | Datenpfeil | L | 600 | 210 | 0 | 250 | 3,75 Mio | 60 Exot. Kristalle | Kondor |
| | Netzkreuzer | XL | 1.900 | 140 | 0 | 620 | 14 Mio | 150 Exot. Kristalle | Titan |
| | Quantensegler | Spezial | 1.000 | 320 | 0 | 360 | 22 Mio | 300 Exot. Kristalle | - |
| Nomadenclan | Wanderzelt | L | 600 | 170 | 0 | 420 | 3,75 Mio | 120 Nebelgas | Kondor |
| | Sippenschiff | XL | 2.000 | 120 | 0 | 1.200 | 14 Mio | 300 Nebelgas | Titan |
| | Karawane | Spezial | 2.000 | 180 | 0 | 1.000 | 20 Mio | 600 Nebelgas | - |
| Tiefraum-Orden | Novize | L | 620 | 200 | 0 | 250 | 3,75 Mio | 25 Antimaterie | Kondor |
| | Kathedrale | XL | 2.000 | 135 | 0 | 650 | 14 Mio | 60 Antimaterie | Titan |
| | Sternenläufer | Spezial | 1.200 | 280 | 0 | 400 | 24 Mio | 120 Antimaterie | - |
| Handelsliga | Kontorkogge | L | 1.350 | 90 | 0 | 230 | 2,75 Mio | 80 Gold | Wal |
| | Großkogge | XL | 4.500 | 70 | 0 | 950 | 24 Mio | 200 Gold | Leviathan |
| | Hansekogge | Spezial | 3.500 | 120 | 0 | 600 | 25 Mio | 400 Gold | - |
| Schwerindustrie-Syndikat | Stahlträger | L | 1.200 | 85 | 0 | 230 | 2,75 Mio | 70 Uran | Wal |
| | Schmiedeberg | XL | 4.000 | 70 | 0 | 950 | 24 Mio | 175 Uran | Leviathan |
| | Stahlkoloss | Spezial | 4.200 | 100 | 6 | 650 | 25 Mio | 350 Uran | - |

**Fähigkeiten der Spezialschiffe:**

| Schiff | Fähigkeit |
|---|---|
| Erzbrecher | Baut ultraseltene Vorkommen ohne Tiefbohrer-Modul ab |
| Quantensegler | Doppelte Sensorreichweite, eingebaut. Sie kombiniert sich mit der Sensorphalanx |
| Karawane | Treibstoffverbrauch −50 % |
| Sternenläufer | Kein Tempo-Malus durch Gravitationszonen. Der Sensor-Malus in Nebelzonen halbiert sich |
| Hansekogge | Zahlt keinen Zoll an Spielerbesitz, +5 % Verkaufserlös |
| Stahlkoloss | Transportiert Gefahrgut ohne Geschirmte Kammer |

- **Einordnung der Preise:** Die Preise der Spezialschiffe liegen über denen der normalen XL-Schiffe (Leviathan 9,5 Mio). Sie sind damit eine Senke für die Phase nach Lizenz 5.
- **Kalibrierung:** Die Werte werden in Phase 11 mit der Simulation kalibriert. Zu prüfen ist besonders, ob Großkogge und Schmiedeberg den Leviathan vollständig verdrängen.
