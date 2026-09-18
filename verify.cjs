const {generate,slideCoverage}=require('./game.js');
const levels=[...Array(100).keys()].map(x=>x+1).concat([...Array(500).keys()].map(x=>x+101),620,1000,50000,999999999);
for(const n of levels){const a=generate(n),b=generate(n);if(JSON.stringify(a)!==JSON.stringify(b))throw Error(`Non deterministic: ${n}`);if(!slideCoverage(a.grid,a.start))throw Error(`Uncoverable: ${n}`)}
console.log(`Verified ${levels.length} deterministic, slide-coverable levels.`);
