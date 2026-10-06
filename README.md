# Space Trader

Multiplayer-Handelsspiel im unendlichen Weltraum (Vorbild: Merchant of the Skies).

## Start

```bash
nvm use 24.13.0
npm install
npm start
```

Dann http://localhost:3000 öffnen. Für Entwicklung mit automatischem Neustart: `npm run dev`.
Der Spielstand liegt in `data/save.json` (alle 30 s und beim Beenden mit Strg+C gespeichert). Löschen = neue Welt.

## Aufbau

| Pfad | Inhalt |
|---|---|
| `shared/config.js` | Waren, Planeten-, Stations-, Schiffstypen, Preisformel. Von Server und Client genutzt, hier wird balanciert. |
| `server/world.js` | Prozedurale Welt in Chunks (3000 Einheiten), erst bei Entdeckung generiert. Fester Startbereich um (0,0). |
| `server/economy.js` | Produktion, Verbrauch, Stationsrezepte, Werftbau. |
| `server/ships.js` | Flug, Andocken, Abbau, Routenausführung. |
| `server/game.js` | Spieler, Nebel des Krieges, Handel, Befehle, Persistenz. |
| `server/index.js` | Express + Socket.IO, Ticks (10 Hz Simulation, 5 Hz Schiffsstatus, 0,5 Hz Märkte). |
| `client/js/*` | Canvas-Renderer, UI-Panels, Routen-Editor. Kein Build-Schritt. |
| `client/assets/*.svg` | Grafiken. `#ff00ff` wird zur Laufzeit durch Spieler- bzw. Stationsfarbe ersetzt. |

## Produktionsketten

| Station | Rezept |
|---|---|
| Schmelzwerk | 2 Erz → 1 Metall |
| Wasserwerk | 2 Eis → 1 Wasser |
| Raffinerie | 2 Gas → 1 Treibstoff |
| Chemiewerk | 1 Gas + 1 Biomasse → 1 Kunststoff |
| Chipfabrik | 2 Kristalle + 1 Seltene Erden → 1 Elektronik |
| Legierungswerk | 2 Metall + 1 Seltene Erden → 1 Legierungen |
| Pharmawerk | 2 Biomasse + 1 Wasser → 1 Medikamente |
| Luxusmanufaktur | 1 Kristalle + 1 Wasser → 1 Luxusgüter |
| Maschinenbau | 1 Legierungen + 1 Elektronik → 1 Maschinen |
| Konsumgüterfabrik | 2 Kunststoff + 1 Elektronik → 1 Konsumgüter |
| Robotikwerk | 1 Maschinen + 2 Elektronik → 1 Roboter |

Endprodukte (Medikamente, Luxus-, Konsumgüter, Maschinen, Roboter) werden von Planeten verbraucht, Metall, Legierungen, Elektronik, Maschinen und Treibstoff außerdem von Werften.

## Versorgung und Statistik

- Kann eine verarbeitende Station mangels eines Rohstoffs keinen Zyklus mehr starten, schickt sie einen eigenen Versorger
  (50 Laderaum) zur nächsten Quelle im Umkreis von 4500 (Produzent mit Vorrat oder passendes Asteroidenfeld). Ohne Quelle: neuer Versuch nach 120 s.
- Jeder Markt führt eine Statistik in 5-Minuten-Blöcken über 3 Stunden Spielzeit: produziert, verbraucht, von Schiffen angeliefert und abgeholt.

## Spielregeln

- Preise: `Basis × 1,8 × (0,45/1,8)^(Lager/Kapazität)`, plus 6 % Spread. Volles Lager = billig, leeres = teuer.
- Planeten produzieren mit 60 bis 100 % Leistung, je nachdem wie viele ihrer Bedarfsgüter vorrätig sind.
- Stationen verarbeiten genau ein Rezept. Ohne Nahrung halbe Geschwindigkeit.
- Werften bauen reihum Schiffstypen, sobald genug Material angeliefert ist (max. 3 im Angebot).
- Routen: beliebig viele Stopps mit Kaufen/Verkaufen/Abbauen, optional Menge und Preisgrenze.
