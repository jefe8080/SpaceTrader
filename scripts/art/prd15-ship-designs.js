// PRD 15: Entwürfe der neuen Schiffstypen. Maße in Rumpfeinheiten, x = Bug, y = Steuerbord, z = oben.
import { MAT, hull, bulk, cyl, engine, turret, mast, light } from './prd15-ships.js';

const W = 'navy';
export const SHIPS = {
  // Schneller bewaffneter Kurier: schlanker Rumpf, gepfeilte Flügel, zwei Laser am Bug
  falke(s) {
    bulk(s, [0, 0, 0], 46, 15, 11, MAT.cream, { tw: 0.35, th: 0.45, dz: -1.5, ribs: 2, detail: 3 });
    bulk(s, [-28, 0, 0.5], 12, 16, 12, MAT.teal, { ribs: 1, detail: 2 });
    hull(s, [6, 0, 6.5], 16, 8, 4.5, MAT.glass, { tw: 0.4, th: 0.5, dz: -1 });
    for (const side of [-1, 1]) {
      hull(s, [-10, side * 16, -1], 22, 18, 2.4, MAT.teal, { tw: 0.4 });
      hull(s, [-6, side * 25, -1], 12, 4, 4, MAT.cream);
      cyl(s, [12, side * 24, -1.5], 20, 1.2, MAT.dark, { sides: 8 });
      engine(s, [-38, side * 6, 0], 10, 4.6);
    }
    hull(s, [-30, 0, 10], 10, 2.4, 10, MAT.teal, { tw: 0.3, dz: 1 });
    mast(s, [-4, 0, 8.5], 8);
    light(s, [23, 0, -1], '#7fe3ff');
  },
  // Robuster bewaffneter Frachter: gepanzerter Bug, Frachtkisten, drei Türme, drei Triebwerke
  keiler(s) {
    bulk(s, [0, 0, 0], 52, 30, 22, MAT.rust, { ribs: 3, pipes: true, detail: 8 });
    bulk(s, [34, 0, -1], 16, 30, 22, MAT.gunmetal, { tw: 0.6, th: 0.55, dz: -2, ribs: 1 });
    hull(s, [45, 0, -3], 6, 18, 9, MAT.brass, { tw: 0.8 });
    for (const side of [-1, 1]) for (let i = 0; i < 3; i++) bulk(s, [-15 + i * 15, side * 21, -2], 13, 10, 15, i % 2 ? MAT.cream : MAT.teal, { ribs: 1 });
    bulk(s, [-6, 0, 15.5], 28, 18, 9, MAT.cream, { tw: 0.85, detail: 4 });
    hull(s, [14, 0, 15], 10, 14, 8, MAT.glass, { tw: 0.7, th: 0.8 });
    turret(s, [-16, 0, 20], 4.4, 2);
    turret(s, [24, -10, 11], 3.6, 1, MAT.gunmetal);
    turret(s, [24, 10, 11], 3.6, 1, MAT.gunmetal);
    for (const y of [-9, 0, 9]) engine(s, [-32, y, 0], 12, 5.4);
    mast(s, [-22, 5, 20], 10); mast(s, [-22, -5, 20], 7);
  },
  // Abfangstaffel: sechs schnelle Jäger in Keilformation
  abfangstaffel(s) {
    const slots = [[0, 0, 0], [-22, -20, 4], [-22, 20, -4], [-44, -40, 8], [-44, 40, -8], [-66, 0, 2]];
    for (const [x, y, z] of slots) {
      bulk(s, [x, y, z], 20, 6, 5, MAT.steel, { tw: 0.2, th: 0.4, dz: -0.5, ribs: 1 });
      hull(s, [x + 2, y, z + 3], 6, 3.4, 1.8, MAT.glass, { tw: 0.5 });
      for (const side of [-1, 1]) hull(s, [x - 4, y + side * 7, z], 9, 10, 1.2, MAT.red, { tw: 0.3 });
      engine(s, [x - 12, y, z], 4, 2.3);
      cyl(s, [x + 9, y, z - 1.8], 9, 0.5, MAT.dark, { sides: 6 });
    }
  },
  // Bomberstaffel: vier schwere Bomber mit Bombenschächten
  bomberstaffel(s) {
    const slots = [[0, -14, 0], [0, 16, -2], [-32, -30, 4], [-32, 32, -4]];
    for (const [x, y, z] of slots) {
      bulk(s, [x, y, z], 22, 10, 7, MAT.gunmetal, { tw: 0.45, th: 0.6, dz: -0.6, ribs: 1, detail: 1 });
      hull(s, [x + 4, y, z + 4.2], 7, 4.4, 2.2, MAT.glass, { tw: 0.6 });
      for (const side of [-1, 1]) {
        hull(s, [x - 3, y + side * 9, z], 10, 9, 1.6, MAT.red, { tw: 0.5 });
        engine(s, [x - 13, y + side * 3.4, z], 5, 2.3);
      }
      cyl(s, [x, y, z - 5], 12, 2.2, MAT.brass, { r2: 1.2 });
    }
  },
  // Korvette Habicht: Eskortrumpf, Brückenturm, zwei Türme
  korvette(s) {
    bulk(s, [0, 0, 0], 58, 22, 16, MAT[W], { tw: 0.35, th: 0.5, dz: -2, ribs: 3, pipes: true, detail: 4 });
    bulk(s, [-36, 0, 0], 14, 24, 17, MAT.red, { ribs: 1, detail: 2 });
    bulk(s, [-10, 0, 12], 20, 13, 9, MAT.steel, { tw: 0.8, detail: 2 });
    hull(s, [2, 0, 12], 6, 10, 6, MAT.glass, { tw: 0.7 });
    turret(s, [15, 0, 8], 3.8, 2);
    turret(s, [-27, 0, 10.5], 3.2, 1);
    for (const side of [-1, 1]) {
      hull(s, [-24, side * 16, -2], 18, 12, 2, MAT.red, { tw: 0.4 });
      engine(s, [-47, side * 6, 0], 10, 5.2);
    }
    mast(s, [-12, 0, 16.5], 11);
    light(s, [30, 0, -2], '#ff6b5a');
  },
  // Fregatte Sperber: Bugkanone, Breitseitentürme, drei Triebwerke
  fregatte(s) {
    bulk(s, [0, 0, 0], 72, 28, 19, MAT[W], { tw: 0.38, th: 0.5, dz: -2, ribs: 4, pipes: true, detail: 6 });
    bulk(s, [-44, 0, 0], 16, 30, 21, MAT.gunmetal, { ribs: 1, detail: 3 });
    bulk(s, [-12, 0, 14], 34, 18, 9, MAT.steel, { tw: 0.85, detail: 5 });
    bulk(s, [-18, 0, 22.5], 14, 11, 8, MAT.red, { tw: 0.8, detail: 1 });
    hull(s, [-9, 0, 22.5], 4, 10, 6, MAT.glass);
    cyl(s, [44, 0, 4], 30, 2, MAT.dark, { sides: 10 });
    hull(s, [30, 0, 4], 10, 8, 7, MAT.brass, { tw: 0.8 });
    for (const side of [-1, 1]) {
      for (const x of [-22, 0]) turret(s, [x + 4, side * 11, 9.8], 3.4, 2, MAT.steel);
      hull(s, [-30, side * 19, -3], 20, 12, 2.4, MAT.red, { tw: 0.4 });
    }
    for (const y of [-9, 0, 9]) engine(s, [-56, y, 0], 10, 5.2);
    mast(s, [-20, 3, 26.5], 11); mast(s, [-24, -3, 26.5], 8);
    light(s, [36, 0, -3], '#ff6b5a');
  },
  // Zerstörer Greif: gepanzerter Rammbug, schwere Bugkanonen, Torpedorohre, hoher Aufbau
  zerstoerer(s) {
    bulk(s, [0, 0, 0], 80, 34, 22, MAT.gunmetal, { tw: 0.45, th: 0.5, dz: -3, ribs: 4, pipes: true, detail: 7 });
    hull(s, [46, 0, -3], 14, 14, 10, MAT.brass, { tw: 0.3, th: 0.4 });
    bulk(s, [-48, 0, 0], 18, 36, 24, MAT[W], { ribs: 1, detail: 3 });
    bulk(s, [-14, 0, 16], 40, 22, 10, MAT.red, { tw: 0.8, detail: 5 });
    bulk(s, [-20, 0, 26], 18, 14, 10, MAT.steel, { tw: 0.75, detail: 2 });
    hull(s, [-9, 0, 27], 5, 12, 7, MAT.glass);
    for (const side of [-1, 1]) {
      cyl(s, [40, side * 6, 7], 26, 2.4, MAT.dark, { sides: 10 });
      cyl(s, [34, side * 15, -3], 10, 2.8, MAT.copper, { frontMat: MAT.dark });
      turret(s, [12, side * 8.5, 11], 3.8, 2);
      hull(s, [-34, side * 22, -4], 22, 12, 2.8, MAT.red, { tw: 0.4 });
    }
    hull(s, [16, 0, 11], 14, 14, 7, MAT.brass, { tw: 0.8 });
    for (const y of [-13, -4.5, 4.5, 13]) engine(s, [-62, y, 0], 10, 5.2);
    mast(s, [-24, 4, 31], 13); mast(s, [-28, -4, 31], 9);
    light(s, [50, 0, -4], '#ff6b5a');
  },
  // Kreuzer Bastion: mehrstöckiger Koloss, viele Türme, Sprungsperren-Emitter, Schlote
  kreuzer(s) {
    bulk(s, [0, 0, 0], 100, 42, 26, MAT[W], { tw: 0.45, th: 0.55, dz: -3, ribs: 5, pipes: true, detail: 10 });
    bulk(s, [-58, 0, 0], 20, 44, 28, MAT.gunmetal, { ribs: 1, detail: 4 });
    bulk(s, [-14, 0, 18], 60, 30, 11, MAT.red, { tw: 0.8, detail: 7 });
    bulk(s, [-22, 0, 29], 32, 21, 11, MAT.steel, { tw: 0.8, detail: 4 });
    bulk(s, [-30, 0, 39], 14, 14, 9, MAT.cream, { tw: 0.85 });
    hull(s, [-21, 0, 40], 4, 12, 7, MAT.glass);
    cyl(s, [55, 0, 5], 26, 2.8, MAT.dark, { sides: 10 });
    cyl(s, [55, 0, -2], 26, 2.8, MAT.dark, { sides: 10 });
    hull(s, [42, 0, 1.5], 12, 14, 14, MAT.brass, { tw: 0.8 });
    for (const side of [-1, 1]) {
      for (const x of [-32, -9, 14]) turret(s, [x, side * 17.5, 12.8], 3.8, 2, MAT.steel);
      hull(s, [-40, side * 27, -4], 26, 14, 3.4, MAT.red, { tw: 0.4 });
      cyl(s, [-44, side * 7, 45], 9, 2.4, MAT.copper, { axis: 'z', frontMat: MAT.dark });
      s.lights.push({ p: [-44, side * 7, 50], color: '#ff8a3a' });
    }
    // Sprungsperren-Emitter: Messingschüssel mit blauem Kern
    cyl(s, [-2, 0, 25], 3, 8, MAT.brass, { axis: 'z', r2: 10 });
    cyl(s, [-2, 0, 28], 2.4, 3.4, MAT.glowBlue, { axis: 'z' });
    s.glows.push({ p: [-2, 0, 30], r: 7, color: '#7fe3ff' });
    for (const [y, z] of [[-15, -6], [0, -6], [15, -6], [-8, 7], [8, 7]]) engine(s, [-74, y, z], 12, 5.6);
    mast(s, [-30, 4, 43.5], 15); mast(s, [-34, -4, 43.5], 10);
    light(s, [60, 0, -4], '#ff6b5a');
  },
};
