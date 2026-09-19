'use strict';
{
const $ = id => document.getElementById(id);
const defaults = {
 level:1, highest:1, completed:{}, brain:false, brightness:'dark', coins:0,
 owned:{ball:['classic'],theme:['midnight'],trail:['paint'],beacon:['classic']},
 selected:{ball:'classic',theme:'midnight',trail:'paint',beacon:'classic'}, sound:true,
 endlessDifficulty:'medium',
 mode:'classic', colors:{}, packs:[], activePack:null, packLevel:1,
 run:null, stats:{clears:0,tiles:0,moves:0,coinsEarned:0,seconds:0,swipes:0,distance:0,restarts:0,perfect:0,runs:0,bestStage:0,bestScore:0,fastest:null}
};
let save;
try { save={...defaults,...JSON.parse(localStorage.getItem(STORAGE)||'{}')}; } catch { save={...defaults}; }
save.owned={...defaults.owned,...save.owned};
save.selected={...defaults.selected,...save.selected};
save.stats={...defaults.stats,...save.stats};
save.colors=typeof save.colors==='object'&&save.colors&&!Array.isArray(save.colors)?save.colors:{};
save.packs=Array.isArray(save.packs)?save.packs.filter(p=>p&&typeof p.id==='string').slice(0,12):[];
if(!['light','dark','sun','oled'].includes(save.brightness))save.brightness='dark';
if(!['classic','endless','pack'].includes(save.mode))save.mode='classic';
if(save.mode==='pack'&&!save.packs.some(p=>p.id===save.activePack))save.mode='classic';
if(save.mode==='endless'&&(!save.run||save.run.lives<1))save.run=null;
const difficulties={
 baby:{lives:6,budget:2.6,pairs:0,bounces:0,description:'6 lives · huge move budget · special tiles later'},
 easy:{lives:5,budget:2.1,pairs:0,bounces:1,description:'5 lives · forgiving moves · bounce tiles later'},
 medium:{lives:3,budget:1.6,pairs:1,bounces:1,description:'3 lives · some special tiles'},
 hard:{lives:2,budget:1.25,pairs:1,bounces:2,description:'2 lives · tight moves · more special tiles'},
 hardcore:{lives:1,budget:1.05,pairs:1,bounces:2,description:'1 life · very tight moves'},
 impossiglide:{lives:1,budget:.8,pairs:2,bounces:3,description:'1 life · brutal moves · maximum chaos'}
};
if(!difficulties[save.endlessDifficulty])save.endlessDifficulty='medium';
const catalog={
 ball:[['classic','Classic','●',0],['neon','Neon spark','✦',75],['cat','Cat mode','🐱',180],['planet','Little planet','🪐',250],['heart','Heart','♥',90],['ghost','Ghost','👻',100],['star','Star','★',110],['rocket','Rocket','🚀',130],['frog','Frog','🐸',150],['gem','Gem','◆',160],['dice','Dice','🎲',170],['paw','Paw','🐾',190]],
 theme:[['midnight','Midnight','🌙',0],['peach','Peach dusk','🌅',100],['ocean','Deep ocean','🌊',160],['forest','Soft forest','🌿',200],['neon','Neon city','🌆',110],['lavender','Lavender','🪻',120],['ice','Ice cave','❄️',140],['terminal','Retro terminal','💻',150]],
 trail:[['paint','Fresh paint','〰',0],['glow','Afterglow','✨',110],['rainbow','Rainbow road','🌈',220],['checker','Checkerboard','▦',80],['gold','Gold rush','✦',90],['frost','Frost','❄',100],['ember','Embers','🔥',120],['pixel','Pixel dust','▪',130],['candy','Candy stripe','🍬',150],['aurora','Aurora','🌌',170]],
 beacon:[['classic','Classic','①',0],['diamond','Diamonds','◆',75],['square','Squares','▣',85],['star','Stars','★',95],['ring','Rings','◎',105],['flower','Flowers','✿',115]]
};
const directions=[[1,0],[-1,0],[0,1],[0,-1]];
let grid,pos,painted,moves=0,total,won=false,busy=false,tab='ball',audio,cells=[],ball,pending=null,animationId=0,beacons=[],beaconCount=0,teleporters=[],bouncers=[],gesture=null,stageStart=Date.now(),moveLimit=0;
function persist(){try{localStorage.setItem(STORAGE,JSON.stringify(save))}catch{toast('Storage full. Progress may not save.')}}
function toast(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),2700)}
function beep(freq=470){if(!save.sound)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(freq*1.34,audio.currentTime+.08);g.gain.setValueAtTime(.045,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.12);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+.13)}catch{}}
function pack(){return save.packs.find(p=>p.id===save.activePack)}
function applyColors(){
 const map={paint:'--filled',ball:'--ball-color',accent:'--accent',beacon:'--beacon-color'};
 for(const [key,css] of Object.entries(map)){
  const value=save.colors[key];
  document.body.style.setProperty(css,/^#[\da-fA-F]{6}$/.test(value||'')?value:'');
  const input=document.querySelector(`[data-color="${key}"]`);
  if(input)input.value=/^#[\da-fA-F]{6}$/.test(value||'')?value:{paint:'#9d80e8',ball:'#b69cff',accent:'#b69cff',beacon:'#ffd58a'}[key];
 }
}
function update(){
 const n=painted.size;
 $('painted').textContent=`${n} / ${total} TILES`;
 $('moves').textContent=moveLimit?`${moves} / ${moveLimit} MOVES`:`${moves} ${moves===1?'MOVE':'MOVES'}`;
 $('progressBar').style.width=`${n/total*100}%`;
 $('coins').textContent=save.coins;$('shopCoins').textContent=save.coins;
 $('gameHint').textContent=save.mode==='endless'?`♥ ${save.run.lives} · ${beaconCount}/${beacons.length} BEACONS`:beacons.length?`${beaconCount}/${beacons.length} BEACONS · DRAG ANYWHERE`:'↕ DRAG ANYWHERE TO STEER';
}
function fitBoard(){
 const wrap=$('board-wrap'),s=getComputedStyle(wrap);
 const w=wrap.clientWidth-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight),h=wrap.clientHeight-parseFloat(s.paddingTop)-parseFloat(s.paddingBottom);
 const ratio=grid[0].length/grid.length,width=Math.max(20,Math.min(w,h*ratio));
 $('board').style.width=`${width}px`;$('board').style.height=`${width/ratio}px`;
}
function tilePosition(x,y){const c=cells[y*grid[0].length+x];return {left:c.offsetLeft,top:c.offsetTop,width:c.offsetWidth,height:c.offsetHeight}}
function placeBall(x,y){if(!ball)return;const t=tilePosition(x,y);ball.style.width=`${t.width}px`;ball.style.height=`${t.height}px`;ball.style.transform=`translate3d(${t.left}px,${t.top}px,0)`}
function draw(){
 const board=$('board'),w=grid[0].length,h=grid.length;
 board.style.gridTemplateColumns=`repeat(${w},minmax(0,1fr))`;
 board.style.gridTemplateRows=`repeat(${h},minmax(0,1fr))`;
 board.style.aspectRatio=`${w}/${h}`;
 const frag=document.createDocumentFragment();cells=[];
 grid.forEach((row,y)=>row.forEach((c,x)=>{
  const cell=document.createElement('div');
  cell.className=`cell${c?'':' wall'}${painted.has(y*w+x)?' painted':''}`;
  cell.style.setProperty('--hue',`${x*19+y*26}deg`);
  const marker=beacons.findIndex(p=>p.x===x&&p.y===y);
  if(marker>=0){cell.classList.add('beacon');cell.dataset.beacon=String(marker+1)}
  const portal=teleporters.findIndex(pair=>(pair.a.x===x&&pair.a.y===y)||(pair.b.x===x&&pair.b.y===y));
  if(portal>=0){cell.classList.add('teleporter');cell.dataset.portal=String.fromCharCode(65+portal)}
  if(bouncers.some(p=>p.x===x&&p.y===y))cell.classList.add('bouncer');
  cells.push(cell);frag.append(cell);
 }));
 ball=document.createElement('div');ball.className='moving-ball ball';frag.append(ball);
 board.replaceChildren(frag);fitBoard();placeBall(pos.x,pos.y);
}
function load(level=save.level){
 if(grid&&!won)save.stats.seconds+=Math.max(0,Math.round((Date.now()-stageStart)/1000));
 animationId++;pending=null;gesture=null;busy=false;won=false;
 let gen,label,subtitle;
 if(save.mode==='endless'){
  if(!save.run)save.run={stage:1,lives:difficulties[save.endlessDifficulty].lives,score:0,difficulty:save.endlessDifficulty};
  const stage=save.run.stage,difficulty=difficulties[save.run.difficulty]||difficulties.medium;
  const seed=100000+stage*7919,brain=stage>=(save.run.difficulty==='baby'?6:save.run.difficulty==='easy'?4:3);
  const pairs=save.run.difficulty==='baby'?(stage>=5?1:0):save.run.difficulty==='easy'?(stage>=4?1:0):difficulty.pairs;
  const bounce=save.run.difficulty==='baby'?(stage>=7?1:0):save.run.difficulty==='easy'?(stage>=2?1:0):difficulty.bounces;
  gen=decorateLevel(generate(seed,brain),seed,pairs,bounce);
  label=String(stage);subtitle=`${(save.run.difficulty||'medium').toUpperCase()} · ${save.run.score.toLocaleString()} PTS · ${save.run.lives} ♥`;
  moveLimit=Math.max(8,Math.ceil(gen.grid.flat().filter(Boolean).length*difficulty.budget));
 }else if(save.mode==='pack'&&pack()){
  const levels=pack().levels;
  save.packLevel=Math.min(Math.max(1,Number(save.packLevel)||1),levels.length);
  gen=levels[save.packLevel-1];label=String(save.packLevel);subtitle=pack().name;
  moveLimit=0;
 }else{
  save.mode='classic';level=Math.max(1,Math.min(999999999,Math.trunc(Number(level))||1));save.level=level;
  gen=generate(level,save.brain);
  if(save.brain||level>=25)gen=decorateLevel(gen,level^(save.brain?0x51f15e:0),1,save.brain||level>=50?1:0);
  label=level.toLocaleString();
  subtitle=save.brain?'Paint every tile. Reach beacon 1, then 2.':level<=100?'The road to chaos starts here.':'Procedural chaos. Good luck out there.';
  moveLimit=0;
 }
 grid=gen.grid;beacons=gen.beacons||[];teleporters=gen.teleporters||[];bouncers=gen.bouncers||[];beaconCount=0;pos={...gen.start};
 painted=new Set([pos.y*grid[0].length+pos.x]);moves=0;total=grid.flat().filter(Boolean).length;stageStart=Date.now();
 $('win').hidden=true;$('board-wrap').classList.remove('result-active');
 $('levelName').textContent=label;$('subtitle').textContent=subtitle;
 $('modeLabel').textContent=save.mode==='endless'?'∞ ENDLESS RUN':save.mode==='pack'?'▣ MOD PACK':save.brain?'✧ BRAIN MODE':'✦ CLASSIC MODE';
 $('brainMode').setAttribute('aria-pressed',String(!!save.brain));$('brainMode').classList.toggle('active',!!save.brain);
 $('brainMode').querySelector('.mode-state').textContent=save.brain?'ON':'OFF';
 $('classicMode').classList.toggle('selected',save.mode==='classic');$('endlessMode').classList.toggle('selected',save.mode==='endless');
 $('jump').disabled=save.mode!=='classic';$('previous').disabled=save.mode==='endless'||(save.mode==='pack'&&save.packLevel===1);
 $('next').disabled=save.mode==='endless';$('restart').textContent=save.mode==='endless'?'↺ RETRY (−1 LIFE)':'↺ RESTART';
 document.body.dataset.ball=save.selected.ball;document.body.dataset.theme=save.selected.theme;
 document.body.dataset.trail=save.selected.trail;document.body.dataset.beacon=save.selected.beacon;document.body.dataset.brightness=save.brightness;
 document.querySelectorAll('[data-difficulty]').forEach(b=>{b.classList.toggle('selected',b.dataset.difficulty===save.endlessDifficulty);b.setAttribute('aria-pressed',String(b.dataset.difficulty===save.endlessDifficulty))});
 $('difficultyInfo').textContent=`${difficulties[save.endlessDifficulty].description}. ${save.run&&save.run.lives>0&&save.run.difficulty!==save.endlessDifficulty?'Selection applies to your next run.':'Each difficulty keeps the same seeded stage layouts.'}`;
 draw();update();applyColors();persist();
}
function result(title,kicker,message,action){
 won=true;pending=null;busy=false;$('resultTitle').textContent=title;$('resultKicker').textContent=kicker;
 $('reward').textContent=message;$('nextWin').textContent=action;
 $('board-wrap').classList.add('result-active');$('win').hidden=false;
}
function finish(){
 const seconds=Math.max(1,Math.round((Date.now()-stageStart)/1000));
 const stats=save.stats;stats.clears++;stats.seconds+=seconds;stats.perfect++;
 stats.fastest=stats.fastest===null?seconds:Math.min(stats.fastest,seconds);
 let earned;
 if(save.mode==='endless'){
  const run=save.run,score=total*10+beacons.length*50+Math.max(0,moveLimit-moves)*15;
  earned=15+Math.round(total/3);run.score+=score;
  stats.bestStage=Math.max(stats.bestStage,run.stage);
  stats.bestScore=Math.max(stats.bestScore,run.score);
  stats.bestByDifficulty??={};
  const best=stats.bestByDifficulty[run.difficulty||'medium']||{stage:0,score:0};
  stats.bestByDifficulty[run.difficulty||'medium']={stage:Math.max(best.stage,run.stage),score:Math.max(best.score,run.score)};
  run.stage++;
  result('STAGE CLEARED','ENDLESS RUN',`+${score} SCORE · +${earned} COINS`,'NEXT STAGE →');
 }else if(save.mode==='pack'){
  earned=10+Math.round(total/3);
  result('LEVEL CLEARED','MOD PACK',`+${earned} COINS`,'NEXT LEVEL →');
 }else{
  const key=save.brain?`brain:${save.level}`:save.level,first=!save.completed[key];
  earned=first?(save.brain?60:30)+Math.round(total/2):5;
  save.completed[key]=true;if(!save.brain&&save.level>=save.highest)save.highest=save.level+1;
  result('LEVEL CLEARED','FULLY PAINTED',`+${earned} COINS ${first?'EARNED':'REPLAY BONUS'}`,'NEXT LEVEL →');
 }
 save.coins+=earned;stats.coinsEarned+=earned;update();persist();beep(740);
}
function fail(reason='moves'){
 save.stats.seconds+=Math.max(1,Math.round((Date.now()-stageStart)/1000));
 save.run.lives--;
 $('subtitle').textContent=`${(save.run.difficulty||'medium').toUpperCase()} · ${save.run.score.toLocaleString()} PTS · ${save.run.lives} ♥`;
 update();
 if(save.run.lives<=0){
  save.stats.bestStage=Math.max(save.stats.bestStage,save.run.stage-1);
  save.stats.bestScore=Math.max(save.stats.bestScore,save.run.score);
  result('RUN OVER','OUT OF LIVES',`STAGE ${save.run.stage} · ${save.run.score.toLocaleString()} SCORE`,'NEW RUN →');
 }else result(reason==='retry'?'STAGE RETRY':'OUT OF MOVES',reason==='retry'?'LIFE SPENT':'TRY AGAIN',`${save.run.lives} LIVES LEFT · ${save.run.score.toLocaleString()} SCORE`,'RETRY STAGE →');
 persist();beep(180);
}
function collectBeacon(index){
 if(beaconCount>=beacons.length)return;
 const target=beacons[beaconCount];
 if(index===target.y*grid[0].length+target.x){cells[index].classList.add('collected');beaconCount++;update();beep(600)}
}
function move(dx,dy){
 if(won)return;if(busy){pending=[dx,dy];return}
 const s=traceMove(grid,pos.x,pos.y,dx,dy,{teleporters,bouncers});if(!s.cells.length)return;
 busy=true;moves++;save.stats.moves++;save.stats.distance+=s.cells.length;beep(390);update();
 const token=animationId,startIndex=pos.y*grid[0].length+pos.x;
 const duration=Math.min(420,Math.max(75,s.cells.length*42));let began=null,paintedCount=0;
 function paint(index){if(!painted.has(index))save.stats.tiles++;painted.add(index);cells[index].classList.add('painted');collectBeacon(index)}
 function frame(now){
  if(token!==animationId)return;if(began===null)began=now;
  const t=Math.min(1,(now-began)/duration),travel=t*s.cells.length;
  const segment=Math.min(s.cells.length-1,Math.floor(travel));
  const before=segment?s.cells[segment-1]:startIndex;
  const from=tilePosition(before%grid[0].length,Math.floor(before/grid[0].length));
  const target=s.cells[segment],to=tilePosition(target%grid[0].length,Math.floor(target/grid[0].length));
  const mix=s.jumps.includes(segment)?1:Math.min(1,travel-segment);
  ball.style.transform=`translate3d(${from.left+(to.left-from.left)*mix}px,${from.top+(to.top-from.top)*mix}px,0)`;
  while(paintedCount<Math.min(s.cells.length,Math.floor(travel)))paint(s.cells[paintedCount++]);
  if(t<1){requestAnimationFrame(frame);return}
  while(paintedCount<s.cells.length)paint(s.cells[paintedCount++]);
  pos={x:s.x,y:s.y};placeBall(pos.x,pos.y);busy=false;update();persist();
  if(painted.size===total&&beaconCount===beacons.length){finish();return}
  if(moveLimit&&moves>=moveLimit){fail();return}
  const next=pending;pending=null;if(next)move(...next);
 }
 requestAnimationFrame(frame);
}
function startRun(){save.mode='endless';save.activePack=null;save.run={stage:1,lives:difficulties[save.endlessDifficulty].lives,score:0,difficulty:save.endlessDifficulty};save.stats.runs++;load()}
function nextLevel(){
 if(save.mode==='endless'){
  if(save.run.lives<=0){startRun();return}
  load();return;
 }
 if(save.mode==='pack'){
  if(save.packLevel<pack().levels.length){save.packLevel++;load()}else{save.mode='classic';load();toast('Pack complete!')}
  return;
 }
 load(save.level+1);
}
function restart(){
 save.stats.restarts++;
 if(save.mode==='endless'&&!won){fail('retry');return}
 if(save.mode==='endless'&&save.run.lives<=0){startRun();return}
 load();
}
// The full play screen accepts directional swipes; buttons and open dialogs keep their taps.
document.addEventListener('pointerdown',e=>{
 if(e.pointerType==='mouse'&&e.button!==0)return;
 if(document.querySelector('dialog[open]')||won||e.target.closest('button,a,input,select,textarea,dialog,[role="button"]'))return;
 gesture={id:e.pointerId,x:e.clientX,y:e.clientY,used:false};
 try{document.documentElement.setPointerCapture(e.pointerId)}catch{}
});
document.addEventListener('pointermove',e=>{
 if(!gesture||e.pointerId!==gesture.id)return;
 const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;
 if(Math.max(Math.abs(dx),Math.abs(dy))<18)return;
 gesture.x=e.clientX;gesture.y=e.clientY;gesture.used=true;save.stats.swipes++;
 if(Math.abs(dx)>Math.abs(dy))move(Math.sign(dx),0);else move(0,Math.sign(dy));
});
document.addEventListener('pointerup',e=>{
 if(!gesture||e.pointerId!==gesture.id)return;
 if(!gesture.used){const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;
  if(Math.max(Math.abs(dx),Math.abs(dy))>=18){save.stats.swipes++;if(Math.abs(dx)>Math.abs(dy))move(Math.sign(dx),0);else move(0,Math.sign(dy))}}
 gesture=null;
});
document.addEventListener('pointercancel',()=>{gesture=null});
window.addEventListener('resize',()=>{if(!busy&&grid){fitBoard();placeBall(pos.x,pos.y)}});
new ResizeObserver(()=>{if(!busy&&grid){fitBoard();placeBall(pos.x,pos.y)}}).observe($('board-wrap'));
document.addEventListener('keydown',e=>{
 if(document.querySelector('dialog[open]')||e.target.matches('input'))return;
 const dirs={ArrowUp:[0,-1],w:[0,-1],ArrowDown:[0,1],s:[0,1],ArrowLeft:[-1,0],a:[-1,0],ArrowRight:[1,0],d:[1,0]};
 if(dirs[e.key]){e.preventDefault();move(...dirs[e.key])}
});
$('settingsOpen').onclick=()=>$('settingsDialog').showModal();
$('settingsClose').onclick=$('settingsDone').onclick=()=>$('settingsDialog').close();
$('brainMode').onclick=()=>{save.brain=!save.brain;if(save.mode==='classic')load();else persist();toast(save.brain?'Brain Mode on for Classic.':'Brain Mode off for Classic.')};
$('classicMode').onclick=()=>{save.mode='classic';save.activePack=null;load();toast('Classic mode')};
$('endlessMode').onclick=()=>{if(save.mode==='endless'){toast('Run already in progress');return}if(save.run&&save.run.lives>0){save.mode='endless';load();toast('Endless run resumed')}else{startRun();toast('Endless run started')}};
$('newRun').onclick=()=>{startRun();$('settingsDialog').close();toast(`${save.endlessDifficulty.toUpperCase()} run started`)};
document.querySelectorAll('[data-difficulty]').forEach(b=>b.onclick=()=>{
 save.endlessDifficulty=b.dataset.difficulty;
 document.querySelectorAll('[data-difficulty]').forEach(item=>{item.classList.toggle('selected',item===b);item.setAttribute('aria-pressed',String(item===b))});
 $('difficultyInfo').textContent=`${difficulties[save.endlessDifficulty].description}. ${save.run&&save.run.lives>0?'Applies to your next run.':'Start Endless to play.'}`;
 persist();toast(`${b.textContent} selected for the next run`);
});
$('restart').onclick=restart;$('previous').onclick=()=>{if(save.mode==='pack'){save.packLevel--;load()}else load(save.level-1)};
$('next').onclick=$('nextWin').onclick=nextLevel;
$('jump').onclick=()=>{$('levelInput').value=save.level;$('jumpDialog').showModal();$('levelInput').select()};
function go(){const n=Number($('levelInput').value);if(!Number.isInteger(n)||n<1||n>999999999){toast('Choose a level from 1 to 999,999,999.');return}$('jumpDialog').close();load(n)}
$('go').onclick=go;$('levelInput').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();go()}};
$('sound').onclick=()=>{save.sound=!save.sound;$('sound').textContent=save.sound?'ON':'OFF';persist();toast(save.sound?'Sound on':'Sound off')};
$('sound').textContent=save.sound?'ON':'OFF';
function setBrightness(mode){save.brightness=mode;document.body.dataset.brightness=mode;document.querySelectorAll('[data-brightness]').forEach(b=>{b.classList.toggle('selected',b.dataset.brightness===mode);b.setAttribute('aria-pressed',String(b.dataset.brightness===mode))});persist()}
document.querySelectorAll('[data-brightness]').forEach(b=>b.onclick=()=>setBrightness(b.dataset.brightness));setBrightness(save.brightness);
document.querySelectorAll('[data-color]').forEach(input=>input.oninput=()=>{save.colors[input.dataset.color]=input.value;applyColors();persist()});
$('resetColors').onclick=()=>{save.colors={};applyColors();persist();toast('Default colors restored')};
$('shopOpen').onclick=()=>{renderShop();$('shopDialog').showModal()};$('shopClose').onclick=()=>$('shopDialog').close();
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;document.querySelectorAll('[data-tab]').forEach(t=>t.classList.toggle('active',t.dataset.tab===tab));renderShop()});
function renderShop(){
 const container=$('shopItems');container.replaceChildren();$('shopCoins').textContent=save.coins;
 for(const [id,name,icon,price] of catalog[tab]){
  const row=document.createElement('div');row.className='shop-item';
  const preview=document.createElement('div');preview.className='item-preview';preview.textContent=icon;
  const copy=document.createElement('div');copy.className='item-copy';
  const title=document.createElement('strong');title.textContent=name;
  const sub=document.createElement('small');sub.textContent=price?`◉ ${price} · or free if you're broke`:'THE ORIGINAL';copy.append(title,sub);
  const button=document.createElement('button');const owned=save.owned[tab].includes(id),equipped=save.selected[tab]===id;
  button.textContent=equipped?'EQUIPPED':owned?'EQUIP':save.coins>=price?`◉ ${price}`:'BUY $0.00';button.classList.toggle('equipped',equipped);
  button.onclick=()=>{if(!owned){if(save.coins>=price){save.coins-=price;toast('Bought with actual coins. Respect.')}else toast('Payment declined successfully. Yours for $0.00.');save.owned[tab].push(id)}save.selected[tab]=id;document.body.dataset[tab]=id;update();persist();renderShop()};
  row.append(preview,copy,button);container.append(row);
 }
}
function renderStats(){
 const s=save.stats,entries=[['Career','Levels cleared',s.clears],['Career','Tiles painted',s.tiles],['Career','Moves made',s.moves],['Career','Coins earned',s.coinsEarned],['Career','Time played',`${Math.floor(s.seconds/3600)}h ${Math.floor(s.seconds%3600/60)}m`],['Performance','Perfect clears',s.perfect],['Performance','Average moves',s.clears?Math.round(s.moves/s.clears):0],['Performance','Fastest clear',s.fastest===null?'—':`${s.fastest}s`],['Performance','Swipes',s.swipes],['Performance','Distance glided',s.distance],['Performance','Restarts',s.restarts],['Endless','Runs started',s.runs],['Endless','Best stage cleared',s.bestStage],['Endless','Best score',s.bestScore.toLocaleString()],['Cosmetics','Custom colors',Object.keys(save.colors).length],['Cosmetics','Mod packs',save.packs.length]];
 for(const name of Object.keys(difficulties))if(s.bestByDifficulty?.[name])entries.push(['Endless records',name.toUpperCase(),`Stage ${s.bestByDifficulty[name].stage} · ${s.bestByDifficulty[name].score.toLocaleString()} pts`]);
 const content=$('statsContent');content.replaceChildren();let group='';
 for(const [section,label,value] of entries){if(group!==section){group=section;const h=document.createElement('h3');h.textContent=section;content.append(h)}const item=document.createElement('div');item.className='stat-card';const span=document.createElement('span'),strong=document.createElement('strong');span.textContent=label;strong.textContent=String(value);item.append(span,strong);content.append(item)}
}
$('statsOpen').onclick=()=>{renderStats();$('settingsDialog').close();$('statsDialog').showModal()};
$('modsOpen').onclick=()=>{renderMods();$('settingsDialog').close();$('modsDialog').showModal()};
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
// JSON packs are validated as data. They never execute scripts or inject HTML.
const hex=v=>typeof v==='string'&&/^#[\da-fA-F]{6}$/.test(v);
function validatePack(raw){
 if(!raw||raw.format!=='glide-pack-v1'||typeof raw.name!=='string'||raw.name.length<1||raw.name.length>50)throw Error('Use format glide-pack-v1 and a name (1–50 characters).');
 const out={id:`pack-${Date.now()}-${Math.floor(Math.random()*10000)}`,name:raw.name,colors:{},levels:[]};
 if(raw.colors!==undefined){if(!raw.colors||typeof raw.colors!=='object'||Array.isArray(raw.colors))throw Error('colors must be an object.');for(const k of ['paint','ball','accent','beacon']){if(raw.colors[k]!==undefined){if(!hex(raw.colors[k]))throw Error(`${k} must be a six-digit hex color.`);out.colors[k]=raw.colors[k]}}}
 if(raw.levels!==undefined){if(!Array.isArray(raw.levels)||raw.levels.length>30)throw Error('A pack supports up to 30 levels.');
  out.levels=raw.levels.map((level,i)=>{
   if(!level||!Array.isArray(level.grid)||level.grid.length<3||level.grid.length>17||!level.grid.every(row=>Array.isArray(row)&&row.length===level.grid[0].length&&row.length>=3&&row.length<=17&&row.every(c=>c===0||c===1)))throw Error(`Level ${i+1}: grid must be a rectangular 0/1 array up to 17×17.`);
   const valid=p=>p&&Number.isInteger(p.x)&&Number.isInteger(p.y)&&level.grid[p.y]?.[p.x]===1;
   if(!valid(level.start))throw Error(`Level ${i+1}: start must be on a floor tile.`);
   if(!slideCoverage(level.grid,level.start))throw Error(`Level ${i+1}: every floor tile must be reachable by sliding.`);
   const markers=level.beacons||[];
   if(!Array.isArray(markers)||markers.length>4||!markers.every(valid)||new Set(markers.map(p=>`${p.x},${p.y}`)).size!==markers.length)throw Error(`Level ${i+1}: invalid beacons.`);
   const teleporters=level.teleporters||[],bouncers=level.bouncers||[];
   if(!Array.isArray(teleporters)||teleporters.length>3||!teleporters.every(pair=>pair&&valid(pair.a)&&valid(pair.b)))throw Error(`Level ${i+1}: use up to three valid teleporter pairs.`);
   if(!Array.isArray(bouncers)||bouncers.length>8||!bouncers.every(valid))throw Error(`Level ${i+1}: use up to eight valid bounce tiles.`);
   const occupied=[level.start,...markers,...bouncers,...teleporters.flatMap(pair=>[pair.a,pair.b])];
   if(new Set(occupied.map(p=>`${p.x},${p.y}`)).size!==occupied.length)throw Error(`Level ${i+1}: start, beacons and special tiles cannot overlap.`);
   const specials={teleporters:teleporters.map(pair=>({a:{x:pair.a.x,y:pair.a.y},b:{x:pair.b.x,y:pair.b.y}})),bouncers:bouncers.map(p=>({x:p.x,y:p.y}))};
   if(!specialCoverage(level.grid,level.start,specials,markers))throw Error(`Level ${i+1}: special tiles block coverage or ordered beacons.`);
   if(level.grid.flat().filter(Boolean).length<=60&&!canClearLevel(level.grid,level.start,specials,markers,30000))throw Error(`Level ${i+1}: no route paints every tile and beacon.`);
   return {grid:level.grid,start:{x:level.start.x,y:level.start.y},beacons:markers.map(p=>({x:p.x,y:p.y})),...specials};
  });
 }
 if(!Object.keys(out.colors).length&&!out.levels.length)throw Error('Add colors or levels.');
 return out;
}
function renderMods(){
 const list=$('modList');list.replaceChildren();
 if(!save.packs.length){const p=document.createElement('p');p.textContent='No packs imported yet.';list.append(p)}
 for(const p of save.packs){
  const row=document.createElement('div');row.className='mod-row';
  const info=document.createElement('span');info.textContent=`${p.name} · ${p.levels.length} levels`;
  const apply=document.createElement('button');apply.textContent=p.levels.length?'PLAY / APPLY':'APPLY COLORS';
  apply.onclick=()=>{save.colors={...save.colors,...p.colors};if(p.levels.length){save.activePack=p.id;save.packLevel=1;save.mode='pack';load()}else{applyColors();persist()}$('modsDialog').close();toast(`${p.name} applied`)};
  const remove=document.createElement('button');remove.textContent='REMOVE';remove.onclick=()=>{save.packs=save.packs.filter(item=>item.id!==p.id);if(save.activePack===p.id){save.mode='classic';save.activePack=null;load()}persist();renderMods()};
  row.append(info,apply,remove);list.append(row);
 }
}
$('importMod').onchange=async e=>{
 const file=e.target.files?.[0];if(!file)return;
 try{if(file.size>100000)throw Error('Keep the JSON under 100 KB.');if(save.packs.length>=12)throw Error('Remove a pack before importing another.');const p=validatePack(JSON.parse(await file.text()));save.packs.push(p);persist();renderMods();toast(`${p.name} imported`)}
 catch(error){toast(error.message||'Invalid JSON pack')}
 e.target.value='';
};
$('exportExample').onclick=()=>{
 const example={format:'glide-pack-v1',name:'My Glide Pack',colors:{paint:'#ad8cff',ball:'#f6daff',accent:'#b99aff',beacon:'#ffe09c'},levels:[{grid:[[0,0,0,0,0],[0,1,1,1,0],[0,0,0,1,0],[0,1,1,1,0],[0,0,0,0,0]],start:{x:1,y:1},beacons:[{x:3,y:1}],teleporters:[{a:{x:3,y:3},b:{x:1,y:3}}],bouncers:[{x:2,y:3}]}]};
 const blob=new Blob([JSON.stringify(example,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='glide-pack-example.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
load();
if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
}
