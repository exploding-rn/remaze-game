const {generate,slideCoverage,canVisitBeacons,traceMove,specialCoverage,canClearLevel,decorateLevel}=require('./game.js');
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
const sample=[[0,0,0,0,0],[0,1,1,1,0],[0,0,0,1,0],[0,1,1,1,0],[0,0,0,0,0]];
const special={teleporters:[{a:{x:3,y:3},b:{x:1,y:3}}],bouncers:[{x:2,y:3}]};
const jump=traceMove(sample,3,1,0,1,special);
if(JSON.stringify(jump.cells)!==JSON.stringify([13,18,16])||jump.x!==1||jump.y!==3||jump.jumps[0]!==2)throw Error('Teleporter did not paint both endpoints and stop at the destination.');
const bounce=traceMove(sample,1,3,1,0,{bouncers:[{x:2,y:3}]});
if(JSON.stringify(bounce.cells)!==JSON.stringify([17,16])||bounce.x!==1||bounce.y!==3)throw Error('Bounce did not reverse the glide.');
if(!specialCoverage(sample,{x:1,y:1},special,[{x:3,y:1}]))throw Error('Sample special level is not solvable.');
for(let stage=1;stage<=40;stage++){
 const seed=100000+stage*7919,base=generate(seed,stage>=3);
 const a=decorateLevel(base,seed,1,1),b=decorateLevel(base,seed,1,1);
 if(JSON.stringify(a)!==JSON.stringify(b)||!specialCoverage(a.grid,a.start,a,a.beacons||[])||!canClearLevel(a.grid,a.start,a,a.beacons||[]))throw Error(`Special stage ${stage} changed or cannot be cleared.`);
}
for(let level=1;level<=120;level++)for(const brain of [false,true]){
 const base=generate(level,brain),pairs=brain||level>=25?1:0,bounces=brain||level>=50?1:0;
 const maze=decorateLevel(base,level^(brain?0x51f15e:0),pairs,bounces);
 if(!specialCoverage(maze.grid,maze.start,maze,maze.beacons||[])||!canClearLevel(maze.grid,maze.start,maze,maze.beacons||[]))throw Error(`Classic/Brain special level ${level} cannot be cleared.`);
}
console.log('Verified teleports, bounce reversal, 40 endless stages and 240 Classic/Brain layouts with special tiles.');
