const qualifications = ['basic','skilled','specialist'];
const sum = values => Object.values(values).reduce((a,b)=>a+b,0);

// Specs come from the actual operation scheduler, including units that cannot run.
// Reservations count as demand against the full employable pool, never a second deduction.
export function supplyOverview(population, workers, specs, reserved, generation) {
  const required = Object.fromEntries(qualifications.map(q => [q,reserved[q] || 0]));
  let power = 0;
  for (const spec of specs) {
    power += spec.power || 0;
    for (const q of qualifications) required[q] += spec.workers?.[q] || 0;
  }
  const limit = Math.max(0,Math.floor(population*.6));
  return {
    power:{required:power,available:generation},
    workers:{required:sum(required),available:Math.min(limit,sum(workers))},
    qualifications:Object.fromEntries(qualifications.map(q=>[q,{required:required[q],available:Math.min(limit,workers[q] || 0)}])),
  };
}
