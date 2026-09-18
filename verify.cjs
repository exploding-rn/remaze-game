const {generate,slideCoverage,canVisitBeacons}=require('./game.js');
const levels=[...Array(100).keys()].map(x=>x+1).concat([...Array(500).keys()].map(x=>x+101),620,1000,50000,999999999);
for(const n of levels){
 for(const brain of [false,true]){
  const a=generate(n,brain),b=generate(n,brain);
  if(JSON.stringify(a)!==JSON.stringify(b))throw Error(`Non deterministic: ${n}, brain=${brain}`);
  if(!slideCoverage(a.grid,a.start))throw Error(`Uncoverable: ${n}, brain=${brain}`);
  if(brain&&(!a.beacons||a.beacons.length!==2||!canVisitBeacons(a.grid,a.start,a.beacons)))throw Error(`Impossible beacons: ${n}`);
 }
}
console.log(`Verified ${levels.length} classic and ${levels.length} Brain Mode levels: deterministic, slide-coverable and ordered beacons reachable.`);
