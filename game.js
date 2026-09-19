'use strict';
// Pure, seeded maze functions are exported for the small verification script.
const STORAGE='glide-save-v1';
function rng(seed){let x=(seed^0x9e3779b9)>>>0;return()=>{x+=0x6d2b79f5;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
function shuffle(a,r){for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function dimensions(level,r){if(level<=10)return [2,2];if(level<=30)return [2+(level>20?1:0),2+(level>20?1:0)];if(level<=50)return [3,3+(level>42?1:0)];if(level<=75)return [3+(level>63?1:0),4];if(level<=100)return [4+(level>88?1:0),4];return [2+Math.floor(r()*4),2+Math.floor(r()*4)]}
function carve(cw,ch,r){const w=cw*2+1,h=ch*2+1,g=Array.from({length:h},()=>Array(w).fill(0));let seen=new Set(['0,0']);let stack=[[0,0]];g[1][1]=1;while(stack.length){const [x,y]=stack[stack.length-1];const dirs=shuffle([[1,0],[-1,0],[0,1],[0,-1]],r);let next=dirs.find(([dx,dy])=>x+dx>=0&&x+dx<cw&&y+dy>=0&&y+dy<ch&&!seen.has(`${x+dx},${y+dy}`));if(!next){stack.pop();continue}let [dx,dy]=next;g[y*2+1+dy][x*2+1+dx]=1;g[(y+dy)*2+1][(x+dx)*2+1]=1;seen.add(`${x+dx},${y+dy}`);stack.push([x+dx,y+dy])}return g}
function step(g,x,y,dx,dy){let cells=[];while(g[y+dy]?.[x+dx]===1){x+=dx;y+=dy;cells.push(y*g[0].length+x)}return {x,y,cells}}
// A teleport paints both ends and stops the glide. A bounce reverses the glide.
// The state guard makes even player-made bounce loops terminate.
function traceMove(g,x,y,dx,dy,specials={}){
 const w=g[0].length,cells=[],jumps=[],seen=new Set();
 const portals=new Map();
 for(const pair of specials.teleporters||[]){portals.set(pair.a.y*w+pair.a.x,pair.b);portals.set(pair.b.y*w+pair.b.x,pair.a)}
 const bounces=new Set((specials.bouncers||[]).map(p=>p.y*w+p.x));
 while(g[y+dy]?.[x+dx]===1){
  const state=`${x},${y},${dx},${dy}`;if(seen.has(state))break;seen.add(state);
  x+=dx;y+=dy;const index=y*w+x;cells.push(index);
  if(portals.has(index)){
   const target=portals.get(index);x=target.x;y=target.y;
   cells.push(y*w+x);jumps.push(cells.length-1);break;
  }
  if(bounces.has(index)){dx=-dx;dy=-dy}
 }
 return {x,y,cells,jumps};
}
function specialCoverage(g,start,specials,beacons=[]){
 const w=g[0].length,seen=new Set(),covered=new Set([start.y*w+start.x]);
 const queue=[{...start,done:0}];let canFinish=beacons.length===0;
 for(let i=0;i<queue.length;i++){
  const {x,y,done}=queue[i],key=`${x},${y},${done}`;if(seen.has(key))continue;seen.add(key);
  if(done===beacons.length)canFinish=true;
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const next=traceMove(g,x,y,dx,dy,specials);if(!next.cells.length)continue;
   let count=done;
   for(const index of next.cells){covered.add(index);if(count<beacons.length&&index===beacons[count].y*w+beacons[count].x)count++}
   queue.push({x:next.x,y:next.y,done:count});
  }
 }
 return canFinish&&covered.size===g.flat().filter(Boolean).length;
}
function decorateLevel(level,seed,pairCount=0,bounceCount=0){
 if(!pairCount&&!bounceCount)return {...level,teleporters:[],bouncers:[]};
 const {grid,start}=level,r=rng(seed^0x7c4a217d),beacons=level.beacons||[];
 const available=[];
 grid.forEach((row,y)=>row.forEach((floor,x)=>{if(floor&&!(x===start.x&&y===start.y)&&!beacons.some(p=>p.x===x&&p.y===y))available.push({x,y})}));
 for(let pairs=pairCount;pairs>=0;pairs--)for(let bounce=bounceCount;bounce>=0;bounce--){
  if(!pairs&&!bounce)continue;
  for(let attempt=0;attempt<60;attempt++){
   const spots=shuffle([...available],r),teleporters=[],bouncers=[];
   if(spots.length<pairs*2+bounce)break;
   for(let i=0;i<pairs;i++)teleporters.push({a:spots.pop(),b:spots.pop()});
   for(let i=0;i<bounce;i++)bouncers.push(spots.pop());
   const specials={teleporters,bouncers};
   if(specialCoverage(grid,start,specials,beacons))return {...level,...specials};
  }
 }
 // A rare incompatible layout keeps the original solvable maze.
 return {...level,teleporters:[],bouncers:[]};
}
function slideCoverage(g,start){const w=g[0].length,visited=new Set(),covered=new Set([start.y*w+start.x]),queue=[start];for(let i=0;i<queue.length;i++){const {x,y}=queue[i],key=y*w+x;if(visited.has(key))continue;visited.add(key);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const s=step(g,x,y,dx,dy);for(const c of s.cells)covered.add(c);if(s.cells.length&&!visited.has(s.y*w+s.x))queue.push({x:s.x,y:s.y})}}return covered.size===g.flat().filter(Boolean).length}
function snake(cw,ch){const w=cw*2+1,h=ch*2+1,g=Array.from({length:h},()=>Array(w).fill(0));for(let row=0;row<ch;row++){for(let x=1;x<w-1;x++)g[row*2+1][x]=1;if(row<ch-1)g[row*2+2][row%2===0?w-2:1]=1}return g}
function reachableStops(g,start){
 const w=g[0].length,seen=new Set([start.y*w+start.x]),queue=[{...start}];
 for(let i=0;i<queue.length;i++)for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
  const next=step(g,queue[i].x,queue[i].y,dx,dy),key=next.y*w+next.x;
  if(next.cells.length&&!seen.has(key)){seen.add(key);queue.push({x:next.x,y:next.y})}
 }
 return queue
}
function chooseBeacons(g,start){
 const distance=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
 const stops=reachableStops(g,start).filter(p=>distance(p,start)>0&&slideCoverage(g,p));
 if(stops.length<2)return null;
 const first=stops.sort((a,b)=>distance(b,start)-distance(a,start))[0];
 const second=reachableStops(g,first).filter(p=>distance(p,first)>0&&slideCoverage(g,p)).sort((a,b)=>distance(b,first)-distance(a,first))[0];
 return second?[first,second]:null
}
function canVisitBeacons(g,start,beacons){
 const w=g[0].length,queue=[{...start,done:0}],seen=new Set();
 for(let i=0;i<queue.length;i++){
  const {x,y,done}=queue[i],key=`${y*w+x}:${done}`;
  if(done===beacons.length)return slideCoverage(g,{x,y});
  if(seen.has(key))continue;seen.add(key);
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const next=step(g,x,y,dx,dy);if(!next.cells.length)continue;
   let count=done;
   for(const cell of next.cells)if(count<beacons.length&&cell===beacons[count].y*w+beacons[count].x)count++;
   queue.push({x:next.x,y:next.y,done:count})
  }
 }
 return false
}
function generate(level,brain=false){
 let r=rng(brain?(level^0x51f15e):level);
 const [cw,ch]=brain?[4+Math.floor(r()*2),4+Math.floor(r()*2)]:dimensions(level,r);
 for(let attempt=0;attempt<180;attempt++){
  const g=carve(cw,ch,r),floors=[];
  g.forEach((row,y)=>row.forEach((c,x)=>{if(c)floors.push({x,y})}));
  const start=floors[Math.floor(r()*floors.length)];
  if(!slideCoverage(g,start))continue;
  if(!brain)return {grid:g,start};
  const beacons=chooseBeacons(g,start);
  if(beacons&&canVisitBeacons(g,start,beacons))return {grid:g,start,beacons}
 }
 const g=snake(cw,ch),start={x:1,y:1};
 return brain?{grid:g,start,beacons:chooseBeacons(g,start)}:{grid:g,start}
}
if(typeof module!=='undefined')module.exports={generate,slideCoverage,step,canVisitBeacons,traceMove,specialCoverage,decorateLevel};
