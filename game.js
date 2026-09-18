'use strict';
// Pure, seeded maze functions are exported for the small verification script.
const STORAGE='glide-save-v1';
function rng(seed){let x=(seed^0x9e3779b9)>>>0;return()=>{x+=0x6d2b79f5;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
function shuffle(a,r){for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function dimensions(level,r){if(level<=10)return [2,2];if(level<=30)return [2+(level>20?1:0),2+(level>20?1:0)];if(level<=50)return [3,3+(level>42?1:0)];if(level<=75)return [3+(level>63?1:0),4];if(level<=100)return [4+(level>88?1:0),4];return [2+Math.floor(r()*4),2+Math.floor(r()*4)]}
function carve(cw,ch,r){const w=cw*2+1,h=ch*2+1,g=Array.from({length:h},()=>Array(w).fill(0));let seen=new Set(['0,0']);let stack=[[0,0]];g[1][1]=1;while(stack.length){const [x,y]=stack[stack.length-1];const dirs=shuffle([[1,0],[-1,0],[0,1],[0,-1]],r);let next=dirs.find(([dx,dy])=>x+dx>=0&&x+dx<cw&&y+dy>=0&&y+dy<ch&&!seen.has(`${x+dx},${y+dy}`));if(!next){stack.pop();continue}let [dx,dy]=next;g[y*2+1+dy][x*2+1+dx]=1;g[(y+dy)*2+1][(x+dx)*2+1]=1;seen.add(`${x+dx},${y+dy}`);stack.push([x+dx,y+dy])}return g}
function step(g,x,y,dx,dy){let cells=[];while(g[y+dy]?.[x+dx]===1){x+=dx;y+=dy;cells.push(y*g[0].length+x)}return {x,y,cells}}
function slideCoverage(g,start){const w=g[0].length,visited=new Set(),covered=new Set([start.y*w+start.x]),queue=[start];for(let i=0;i<queue.length;i++){const {x,y}=queue[i],key=y*w+x;if(visited.has(key))continue;visited.add(key);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const s=step(g,x,y,dx,dy);for(const c of s.cells)covered.add(c);if(s.cells.length&&!visited.has(s.y*w+s.x))queue.push({x:s.x,y:s.y})}}return covered.size===g.flat().filter(Boolean).length}
function snake(cw,ch){const w=cw*2+1,h=ch*2+1,g=Array.from({length:h},()=>Array(w).fill(0));for(let row=0;row<ch;row++){for(let x=1;x<w-1;x++)g[row*2+1][x]=1;if(row<ch-1)g[row*2+2][row%2===0?w-2:1]=1}return g}
function generate(level){let r=rng(level);const [cw,ch]=dimensions(level,r);for(let attempt=0;attempt<180;attempt++){const g=carve(cw,ch,r);const floors=[];g.forEach((row,y)=>row.forEach((c,x)=>{if(c)floors.push({x,y})}));const start=floors[Math.floor(r()*floors.length)];if(slideCoverage(g,start))return {grid:g,start}}const g=snake(cw,ch);return {grid:g,start:{x:1,y:1}}}
if(typeof module!=='undefined')module.exports={generate,slideCoverage,step};
if(typeof document!=='undefined'){
const $=id=>document.getElementById(id),defaults={level:1,highest:1,completed:{},coins:0,owned:{ball:['classic'],theme:['midnight'],trail:['paint']},selected:{ball:'classic',theme:'midnight',trail:'paint'},sound:true};let save;try{save={...defaults,...JSON.parse(localStorage.getItem(STORAGE)||'{}')}}catch{save={...defaults}}save.owned={...defaults.owned,...save.owned};save.selected={...defaults.selected,...save.selected};const catalog={ball:[['classic','Classic','●',0],['neon','Neon spark','✦',75],['cat','Cat mode','🐱',180],['planet','Little planet','🪐',250]],theme:[['midnight','Midnight','🌙',0],['peach','Peach dusk','🌅',100],['ocean','Deep ocean','🌊',160],['forest','Soft forest','🌿',200]],trail:[['paint','Fresh paint','〰',0],['glow','Afterglow','✨',110],['rainbow','Rainbow road','🌈',220]]};let grid,pos,painted,moves=0,total,won=false,busy=false,tab='ball',audio;let cells=[],ball,pending=null,animationId=0;function persist(){try{localStorage.setItem(STORAGE,JSON.stringify(save))}catch{}}function toast(msg){let el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2700)}function beep(freq=470){if(!save.sound)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();const o=audio.createOscillator(),gain=audio.createGain();o.type='sine';o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(freq*1.34,audio.currentTime+.08);gain.gain.setValueAtTime(.045,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.12);o.connect(gain).connect(audio.destination);o.start();o.stop(audio.currentTime+.13)}catch{}}function update(){const n=painted.size;$('painted').textContent=`${n} / ${total} TILES`;$('moves').textContent=`${moves} ${moves===1?'MOVE':'MOVES'}`;$('progressBar').style.width=`${n/total*100}%`;$('coins').textContent=save.coins;$('shopCoins').textContent=save.coins}
function draw(){
 const board=$('board'),w=grid[0].length,h=grid.length;
 board.style.gridTemplateColumns=`repeat(${w}, minmax(0,1fr))`;
 board.style.gridTemplateRows=`repeat(${h}, minmax(0,1fr))`;
 board.style.aspectRatio=`${w}/${h}`;
 const frag=document.createDocumentFragment();cells=[];
 grid.forEach((row,y)=>row.forEach((c,x)=>{
  const cell=document.createElement('div');
  cell.className=`cell${c?'':' wall'}${painted.has(y*w+x)?' painted':''}`;
  cell.style.setProperty('--hue',`${x*19+y*26}deg`);
  cells.push(cell);frag.append(cell)
 }));
 ball=document.createElement('div');ball.className='moving-ball ball';frag.append(ball);
 board.replaceChildren(frag);placeBall(pos.x,pos.y)
}
function tilePosition(x,y){const cell=cells[y*grid[0].length+x];return {left:cell.offsetLeft,top:cell.offsetTop,width:cell.offsetWidth,height:cell.offsetHeight}}
function placeBall(x,y){if(!ball)return;const tile=tilePosition(x,y);ball.style.width=`${tile.width}px`;ball.style.height=`${tile.height}px`;ball.style.transform=`translate3d(${tile.left}px,${tile.top}px,0)`}
function load(level){level=Math.max(1,Math.min(999999999,Math.trunc(Number(level))||1));save.level=level;const gen=generate(level);grid=gen.grid;pos={...gen.start};painted=new Set([pos.y*grid[0].length+pos.x]);moves=0;won=false;busy=false;pending=null;animationId++;total=grid.flat().filter(Boolean).length;$('win').hidden=true;$('levelName').textContent=level.toLocaleString();$('subtitle').textContent=level<=100?'The road to chaos starts here.':'Procedural chaos. Good luck out there.';document.body.dataset.ball=save.selected.ball;document.body.dataset.theme=save.selected.theme;document.body.dataset.trail=save.selected.trail;draw();update();persist()}
function finish(){won=true;pending=null;const first=!save.completed[save.level],earned=first?30+Math.round(total/2):5;save.completed[save.level]=true;save.coins+=earned;if(save.level>=save.highest)save.highest=save.level+1;persist();update();$('reward').textContent=`+${earned} COINS ${first?'EARNED':'REPLAY BONUS'}`;$('win').hidden=false;beep(740)}
function move(dx,dy){
 if(won)return;
 if(busy){pending=[dx,dy];return}
 const s=step(grid,pos.x,pos.y,dx,dy);
 if(!s.cells.length)return;
 busy=true;moves++;beep(390);update();
 const token=animationId,start=tilePosition(pos.x,pos.y),end=tilePosition(s.x,s.y);
 const duration=Math.min(420,Math.max(110,s.cells.length*52));
 let began=null,paintedCount=0;
 function frame(now){
  if(token!==animationId)return;
  if(began===null)began=now;
  const t=Math.min(1,(now-began)/duration),travel=t*s.cells.length;
  const x=start.left+(end.left-start.left)*t,y=start.top+(end.top-start.top)*t;
  ball.style.transform=`translate3d(${x}px,${y}px,0)`;
  while(paintedCount<Math.min(s.cells.length,Math.floor(travel))){
   const index=s.cells[paintedCount++];painted.add(index);cells[index].classList.add('painted')
  }
  if(t<1){requestAnimationFrame(frame);return}
  while(paintedCount<s.cells.length){const index=s.cells[paintedCount++];painted.add(index);cells[index].classList.add('painted')}
  pos={x:s.x,y:s.y};placeBall(pos.x,pos.y);busy=false;update();
  if(painted.size===total){finish();return}
  const next=pending;pending=null;if(next)move(...next)
 }
 requestAnimationFrame(frame)
}
const board=$('board');let gesture=null;
board.addEventListener('pointerdown',e=>{
 if(e.pointerType==='mouse'&&e.button!==0)return;
 gesture={id:e.pointerId,x:e.clientX,y:e.clientY,used:false};
 board.setPointerCapture(e.pointerId)
});
board.addEventListener('pointermove',e=>{
 if(!gesture||e.pointerId!==gesture.id)return;
 const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;
 if(Math.max(Math.abs(dx),Math.abs(dy))<18)return;
 gesture.x=e.clientX;gesture.y=e.clientY;gesture.used=true;
 if(Math.abs(dx)>Math.abs(dy))move(Math.sign(dx),0);else move(0,Math.sign(dy))
});
board.addEventListener('pointerup',e=>{
 if(!gesture||e.pointerId!==gesture.id)return;
 if(!gesture.used){const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;if(Math.max(Math.abs(dx),Math.abs(dy))>=18){if(Math.abs(dx)>Math.abs(dy))move(Math.sign(dx),0);else move(0,Math.sign(dy))}}
 gesture=null
});
board.addEventListener('pointercancel',()=>{gesture=null});
window.addEventListener('resize',()=>{if(!busy&&grid)placeBall(pos.x,pos.y)});
document.addEventListener('keydown',e=>{if(document.querySelector('dialog[open]')||e.target.matches('input'))return;const dirs={ArrowUp:[0,-1],w:[0,-1],ArrowDown:[0,1],s:[0,1],ArrowLeft:[-1,0],a:[-1,0],ArrowRight:[1,0],d:[1,0]};if(dirs[e.key]){e.preventDefault();move(...dirs[e.key])}});
$('restart').onclick=()=>load(save.level);$('previous').onclick=()=>load(save.level-1);$('next').onclick=()=>load(save.level+1);$('nextWin').onclick=()=>load(save.level+1);$('jump').onclick=()=>{$('levelInput').value=save.level;$('jumpDialog').showModal();$('levelInput').select()};function go(){const n=Number($('levelInput').value);if(!Number.isInteger(n)||n<1||n>999999999){toast('Choose a level from 1 to 999,999,999.');return}$('jumpDialog').close();load(n)}$('go').onclick=go;$('levelInput').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();go()}};$('sound').onclick=()=>{save.sound=!save.sound;$('sound').textContent=save.sound?'♪':'♩';persist();toast(save.sound?'Sound on':'Sound off')};$('sound').textContent=save.sound?'♪':'♩';$('shopOpen').onclick=()=>{renderShop();$('shopDialog').showModal()};$('shopClose').onclick=()=>$('shopDialog').close();document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;document.querySelectorAll('[data-tab]').forEach(t=>t.classList.toggle('active',t.dataset.tab===tab));renderShop()});function renderShop(){const container=$('shopItems');container.replaceChildren();$('shopCoins').textContent=save.coins;for(const [id,name,icon,price] of catalog[tab]){const row=document.createElement('div');row.className='shop-item';const preview=document.createElement('div');preview.className='item-preview';preview.textContent=icon;const copy=document.createElement('div');copy.className='item-copy';const title=document.createElement('strong');title.textContent=name;const sub=document.createElement('small');sub.textContent=price?`◉ ${price} · or free if you're broke`:'THE ORIGINAL';copy.append(title,sub);const button=document.createElement('button');const owned=save.owned[tab].includes(id),equipped=save.selected[tab]===id;button.textContent=equipped?'EQUIPPED':owned?'EQUIP':save.coins>=price?`◉ ${price}`:'BUY $0.00';button.classList.toggle('equipped',equipped);button.onclick=()=>{if(!owned){if(save.coins>=price){save.coins-=price;toast('Bought with actual coins. Respect.')}else toast('Payment declined successfully. Yours for $0.00.');save.owned[tab].push(id)}save.selected[tab]=id;document.body.dataset[tab==='theme'?'theme':tab]=id;update();persist();renderShop()};row.append(preview,copy,button);container.append(row)}}load(save.level);if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
}
