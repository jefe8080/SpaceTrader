export const ADVANCED_HOME_QUESTS={
  H07:{title:'Mehr als eine Werkstatt',requires:['H06'],goal:'Schule betreiben, zehn zusätzliche Fachkräfte ausbilden; 40 Platten und 20 Kabel selbst herstellen.',credits:5000,xp:50},
  H08:{title:'Der gebrochene Ring',requires:['H07'],goal:'100 Platten, 40 Elektronik und zehn Rumpfsegmente liefern; einen Spatz dauerhaft als Infrastruktur abgeben; kleinen Ring 600 s wiederaufbauen.',credits:10000,xp:80},
  H09:{title:'Stimmen aus dem Archiv',requires:['H07'],goal:'Forschungswerkstatt errichten, zehn Sensoren liefern und die Archivstelle persönlich besuchen.',credits:8000,xp:60},
  H10:{title:'Wert unter der Oberfläche',requires:['H09'],goal:'Eine Sonderveredelung errichten und zehn ihrer Produkte selbst herstellen.',credits:12000,xp:80},
  H11:{title:'Ein Ort zum Leben',requires:['H07'],goal:'250 Einwohner, passenden Wohnraum und 30 Minuten aufsummierte volle Grundversorgung nachweisen.',credits:8000,xp:60},
  H12:{title:'Werkzeuge für eine andere Zeit',requires:['H09'],goal:'Forschungszentrum errichten, 20 Roboter und zehn Computer liefern.',credits:20000,xp:100},
  H13:{title:'Ein zweiter Anfang',requires:['H10','H11','H12'],goal:'Zweiten Ruinenstandort erkunden; 100.000 Cr, 100 Platten, 20 Maschinen, vier Habitatmodule und 20 eigene Auswanderer anliefern; einen Spatz dauerhaft abgeben; 300 s Aufbau.',credits:0,xp:150},
  H14:{title:'Die Sprache der Schaltkreise',requires:['H12','H13'],goal:'20 Computer und zehn veredelte Exokristalle liefern; weitere Archivstelle persönlich besuchen.',credits:0,xp:120},
  H15:{title:'Ein Ring für große Schiffe',requires:['H08','H12'],goal:'100 Legierungen, 30 Schiffsbauteile, zehn Triebwerke und vier Reaktorkerne liefern; großen Ring in zwei Abschnitten zu je 600 s ausbauen.',credits:30000,xp:150},
  H16:{title:'Koordinaten einer Heimat',requires:['H13'],goal:'Zwei eigene Leitstellen nachweisen; 20 Energiezellen und zehn Computer liefern.',credits:0,xp:100},
  H17:{title:'Was zwischen den Zeilen bleibt',requires:['H14','H15'],goal:'20 KI-Kerne und zehn stabilisierte Antimaterie liefern; persönliche Expedition abschließen.',credits:0,xp:200},
};
export const QUEST_DELIVERIES={H08:{plates:100,electronics:40,hullparts:10},H09:{sensors:10},H12:{robots:20,computers:10},H14:{computers:20,refinedexocrystals:10},H15:{alloys:100,shipparts:30,engines:10,reactorcores:4},H16:{powercells:20,computers:10},H17:{aicores:20,stableantimatter:10}};
export const STUDY_FINDS={acidex:{quest:'H09',name:'Versiegelter Säureextraktor'},sensor:{quest:'H09',name:'Sensorarchiv'},gascoll:{quest:'H10',name:'Kollektor-Forschungsdepot'},drill:{quest:'H10',name:'Bohrer-Forschungsdepot'}};
