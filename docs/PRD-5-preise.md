# PRD 5 – reproduzierbare Basispreise

Erzeugt mit `npm run prices:prd5` aus dem Spielkatalog. Kein zusätzlicher Sonderwarenaufschlag. Mengen sind Spieleinheiten, Preise Credits. Standorte und Lagerfüllstand verändern anschließend die Handelspreise nach den bestehenden Formeln.

Produktpreis = Zutatenwert × 1,3 / Outputmenge + 2 × Stufe + Sekunden × 0,6; auf eine Nachkommastelle gerundet. Stufe = min(5, 1 + höchste Zutatenstufe).

| ID | Ware | Klasse | Stufe | Basispreis | Rezept |
|---|---|---|---:|---:|---|
| acid | Säure | hazard | 0 | 20.0 | Natürliche/Personenquelle |
| antimatter | Unstabile Antimaterie | hazard | 0 | 1900.0 | Natürliche/Personenquelle |
| biomass | Biomasse | normal | 0 | 10.0 | Natürliche/Personenquelle |
| crude | Rohöl | normal | 0 | 14.0 | Natürliche/Personenquelle |
| crystals | Kristalle | normal | 0 | 22.0 | Natürliche/Personenquelle |
| diamond | Rohdiamanten | normal | 0 | 650.0 | Natürliche/Personenquelle |
| exocrystals | Exotische Rohkristalle | normal | 0 | 880.0 | Natürliche/Personenquelle |
| gas | Rohgas | normal | 0 | 9.0 | Natürliche/Personenquelle |
| gold | Rohgold | normal | 0 | 420.0 | Natürliche/Personenquelle |
| grain | Getreide | normal | 0 | 9.0 | Natürliche/Personenquelle |
| helium3 | Helium-3 | normal | 0 | 18.0 | Natürliche/Personenquelle |
| ice | Eis | normal | 0 | 8.0 | Natürliche/Personenquelle |
| nebulagas | Rohes Nebelgas | normal | 0 | 310.0 | Natürliche/Personenquelle |
| ore | Erz | normal | 0 | 10.0 | Natürliche/Personenquelle |
| rareearth | Seltene Erden | normal | 0 | 28.0 | Natürliche/Personenquelle |
| silicate | Silikat | normal | 0 | 9.0 | Natürliche/Personenquelle |
| sulfur | Schwefel | normal | 0 | 12.0 | Natürliche/Personenquelle |
| tourists | Touristen | passenger | 0 | 28.0 | Natürliche/Personenquelle |
| uranium | Uranerz | hazard | 0 | 520.0 | Natürliche/Personenquelle |
| workers | Arbeiter | passenger | 0 | 24.0 | Natürliche/Personenquelle |
| chemicals | Chemikalien | hazard | 1 | 31.1 | chemplant |
| fertilizer | Dünger | normal | 1 | 18.1 | fertilizerplant |
| fuel | Brennstoff | normal | 1 | 39.9 | refinery |
| hydraulicoil | Hydrauliköl | normal | 1 | 40.2 | oilworks |
| plastics | Kunststoff | normal | 1 | 33.7 | chemworks |
| raremetals | Seltenmetalle | normal | 1 | 103.8 | refinery2 |
| shipfuel | Schiffstreibstoff | normal | 1 | 21.4 | fueldepot |
| silicon | Silizium | normal | 1 | 56.4 | siliconworks |
| textiles | Textilien | normal | 1 | 29.8 | weavery |
| water | Wasser | normal | 1 | 14.2 | waterworks |
| chips | Mikrochips | normal | 2 | 131.9 | chipfab |
| clothing | Kleidung | normal | 2 | 67.0 | tailor |
| coolant | Kühlmittel | normal | 2 | 45.1 | coolantworks |
| finegold | Feingold | normal | 2 | 1143.6 | goldpurifier |
| food | Nahrung | normal | 2 | 26.7 | foodplant |
| glass | Glas | normal | 2 | 43.7 | glassworks |
| ingots | Barren | normal | 2 | 45.0 | smelter |
| medicine | Medikamente | normal | 2 | 49.4 | pharma |
| alloys | Legierungen | normal | 3 | 135.0 | alloyworks |
| batteries | Akkus | normal | 3 | 125.9 | batteryplant |
| cutters | Fräser | normal | 3 | 231.0 | toolworks |
| enricheduranium | Angereichertes Uran | hazard | 3 | 1467.9 | uraniumrefiner |
| luxury | Luxusgüter | normal | 3 | 182.1 | jeweler |
| optics | Optiken | normal | 3 | 151.2 | opticsworks |
| plates | Platten | normal | 3 | 93.0 | rollingmill |
| preserves | Konserven | normal | 3 | 82.4 | cannery |
| refinednebulagas | Raffiniertes Nebelgas | normal | 3 | 647.0 | nebulagasrefiner |
| wires | Kabel | normal | 3 | 59.6 | cableworks |
| cutdiamonds | Geschliffene Diamanten | normal | 4 | 2007.3 | diamondcutter |
| electronics | Elektronik | normal | 4 | 174.8 | electronicsworks |
| gears | Zahnräder | normal | 4 | 192.3 | gearworks |
| hullparts | Rumpfsegmente | normal | 4 | 550.4 | hullworks |
| powercells | Energiezellen | normal | 4 | 214.0 | cellworks |
| reactorcores | Reaktorkerne | hazard | 4 | 645.3 | reactorworks |
| refinedexocrystals | Veredelte Exokristalle | normal | 4 | 2504.6 | exocrystalrefiner |
| sensors | Sensoren | normal | 4 | 379.6 | sensorworks |
| aicores | KI-Kerne | normal | 5 | 3407.6 | aiforge |
| computers | Computer | normal | 5 | 685.2 | computerworks |
| consumer | Konsumgüter | normal | 5 | 311.3 | consumerworks |
| engines | Triebwerke | normal | 5 | 895.2 | engineworks |
| habitats | Habitatmodule | normal | 5 | 2283.4 | habitatworks |
| machinery | Maschinen | normal | 5 | 688.5 | machineworks |
| medtech | Medizintechnik | normal | 5 | 503.4 | medtechworks |
| robots | Roboter | normal | 5 | 1236.7 | robotics |
| shipparts | Schiffsbauteile | normal | 5 | 1017.4 | shippartsworks |
| stableantimatter | Stabilisierte Antimaterie | hazard | 5 | 3110.0 | antimatterstabilizer |

## Fraktionsmengen

`max(1, ceil(alte Menge × Rohstoffbasispreis / Produktbasispreis))`. Aufrundung unterschreitet den bisherigen Warenwert nie; die Differenz bleibt kleiner als ein Produkt. Rohformen sind als Fraktionszahlung und am Hub ausgeschlossen.

| Schiff | Rohform vorher | Menge vorher | Wert vorher | Produkt | Neue Menge | Neuer Wert |
|---|---|---:|---:|---|---:|---:|
| fl_miners | diamond | 100 | 65000.0 | cutdiamonds | 33 | 66240.9 |
| fx_miners | diamond | 250 | 162500.0 | cutdiamonds | 81 | 162591.3 |
| f_miners | diamond | 500 | 325000.0 | cutdiamonds | 162 | 325182.6 |
| fl_tech | exocrystals | 60 | 52800.0 | refinedexocrystals | 22 | 55101.2 |
| fx_tech | exocrystals | 150 | 132000.0 | refinedexocrystals | 53 | 132743.8 |
| f_tech | exocrystals | 300 | 264000.0 | refinedexocrystals | 106 | 265487.6 |
| fl_nomads | nebulagas | 120 | 37200.0 | refinednebulagas | 58 | 37526.0 |
| fx_nomads | nebulagas | 300 | 93000.0 | refinednebulagas | 144 | 93168.0 |
| f_nomads | nebulagas | 600 | 186000.0 | refinednebulagas | 288 | 186336.0 |
| fl_order | antimatter | 25 | 47500.0 | stableantimatter | 16 | 49760.0 |
| fx_order | antimatter | 60 | 114000.0 | stableantimatter | 37 | 115070.0 |
| f_order | antimatter | 120 | 228000.0 | stableantimatter | 74 | 230140.0 |
| fl_league | gold | 80 | 33600.0 | finegold | 30 | 34308.0 |
| fx_league | gold | 200 | 84000.0 | finegold | 74 | 84626.4 |
| f_league | gold | 400 | 168000.0 | finegold | 147 | 168109.2 |
| fl_syndicate | uranium | 70 | 36400.0 | enricheduranium | 25 | 36697.5 |
| fx_syndicate | uranium | 175 | 91000.0 | enricheduranium | 62 | 91009.8 |
| f_syndicate | uranium | 350 | 182000.0 | enricheduranium | 124 | 182019.6 |
