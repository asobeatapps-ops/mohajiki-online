(()=>{'use strict';
/* MOHAJIKI v2.1 Online Edition | ASOBeat | deterministic fixed-step 2D physics */
const $=id=>document.getElementById(id),TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),rand=(a=0,b=1)=>a+Math.random()*(b-a),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),mix=(a,b,t)=>a+(b-a)*t;
const C={orange:'#f58b50',blue:'#53b3c8',ink:'#294e42',pale:'#fbf7eb',land:'#edf0d6',sea:'#d6f3ed'};
const R=[
['land','ねこ','cat','ねこ','壁で1回反射','#efa46a','壁ではね返ってもう一度！'],
['land','ぞう','elephant','ぞう','まっすぐ突進','#a0b8bd','大きな体で一直線に突進'],
['land','くま','bear','くま','地響き・坂','#bb9878','地響きでまわりを揺らす'],
['land','うま','horse','うま','駆け足・坂','#ddae7d','俊足ダッシュで道を切り開く'],
['land','いぬ','dog','いぬ','短い追いかけ','#c6a27a','近くの駒を追いかける'],
['land','とり','bird','とり','羽ばたき・すり抜け','#a4c88b','ひらりとすり抜けて飛ぶ'],
['land','はな','flower','はな','種類で地形変化','#ed9dbc','花が咲いて地形が変わる'],
['land','うし','cow','うし','地響き突進','#d0ae8b','大きな一歩で地面が揺れる'],
['land','やま','mountain','やま','地響き・坂','#91b8a2','でっかい坂を作る'],
['land','さる','monkey','さる','跳びはね・草','#bfa577','軽やかなジャンプ！'],
['land','うさ','rabbit','うさ','二段跳ね・草','#c6add9','ふわっと二段ジャンプ'],
['sea','さめ','shark','さめ','獲物へ突進','#84bccb','近くの駒に向かって突進'],
['sea','えび','shrimp','えび','3回反射・波','#e9a78b','ぴょんぴょん3回はねる'],
['sea','かめ','turtle','かめ','甲羅ガード・渦','#90bc9b','甲羅で身を守る'],
['sea','たこ','octopus','たこ','足ばたき・渦','#b9a1d2','ぐるぐる吸い寄せる'],
['sea','かに','crab','かに','横歩き・渦','#ea978a','真横へダッシュする'],
['sea','ふね','ship','ふね','波しぶき・波','#8db8c3','大きな波を起こす'],
['sea','さけ','salmon','さけ','波乗りジャンプ','#eaa5a5','波に乗ってジャンプ'],
['sea','かい','shell','かい','貝殻ガード','#ddb99e','かたい貝でブロック'],
['sea','なみ','wave','なみ','うねる波・波','#8ad1dc','波紋が広がっていく'],
['sea','さば','mackerel','さば','横滑りダッシュ','#94b6cf','シュッと横すべり'],
].map(([board,word,type,name,skill,color,desc],i)=>({id:i,board,word,type,name,skill,color,desc,parts:[...word]}));
const BY_WORD=new Map(R.map(r=>[r.board+':'+[...r.word].sort().join(''),r]));
const VARIANTS={
 cat:[['normal','三毛ねこ'],['black','くろねこ'],['white','しろねこ']],
 elephant:[['normal','ぞう'],['mammoth','マンモス']],
 bear:[['normal','ひぐま'],['polar','ホッキョクグマ']],
 horse:[['normal','うま'],['race','サラブレッド']],
 flower:[['sakura','サクラ'],['blue','青いアサガオ'],['red','赤いアサガオ'],['poison','ラフレシア']],
 mountain:[['normal','富士山'],['everest','エベレスト']],
 monkey:[['normal','さる'],['onsen','ニホンザル'],['ring','ワオキツネザル']],
 rabbit:[['normal','うさぎ'],['nether','ネザーランドドワーフ'],['lop','ホーランドロップ']],
 cow:[['normal','うし'],['bull','トロ・ブラボ']]
};
const ZONENAMES={grass:'草',slope:'坂',frost:'氷山',hotspring:'温泉',poison:'毒',blue:'青い花',red:'赤い花',wave:'波',vortex:'渦'};
const settingsDefault={sound:true,volume:.33,guide:true,reducedMotion:false,difficulty:'normal',board:'land',mode:'cpu',variants:[{},{}]};
let settings={...settingsDefault,...load('mohajiki-settings-v2',{} )};
if(!Array.isArray(settings.variants))settings.variants=[{},{}];
settings.variants=[{...settings.variants[0]},{...settings.variants[1]}];
let discovered=new Set(load('mohajiki-discovered-v2',[]));
let records=load('mohajiki-record-v2',{games:0,wins:0,best:0});
function load(key,fallback){try{const x=localStorage.getItem(key);return x?JSON.parse(x):fallback}catch(e){return fallback}}
function save(key,data){try{localStorage.setItem(key,JSON.stringify(data))}catch(e){}}
function persist(){save('mohajiki-settings-v2',settings)}
const UI={home:$('homeScreen'),game:$('gameScreen'),court:$('court'),canvas:$('gameCanvas'),video:$('cameraVideo'),ctx:$('gameCanvas').getContext('2d',{alpha:true}),modal:$('modalLayer'),modalContent:$('modalContent')};
const state={screen:'home',board:'land',mode:'cpu',difficulty:'normal',W:960,H:580,portrait:false,discs:[],zones:[],particles:[],floaters:[],nextID:1,player:0,remaining:[6,6],scores:[0,0],phase:'home',shotElapsed:0,stillFor:0,chain:0,maxChain:0,totalFusions:0,shotWords:[],foundMatch:new Set(),drag:null,selected:null,launchSnapshot:null,undoUntil:0,canUndo:false,undoUsed:false,round:1,camera:false,cameraStream:null,cpuTimer:0,phaseTimer:0,token:0,shake:0,hitstop:0,time:0,tutorialShown:false,tutorialStep:0,hover:null};
let lastNow=0,acc=0,audioCtx=null,audioMaster=null,lastImpact=0,toastTimer=0,modalOpen=false;
function isPortrait(){return innerWidth<760&&innerHeight>innerWidth*1.06}
function resizeWorld(){const p=state.mode==='online'?true:isPortrait(),oldW=state.W,oldH=state.H;state.portrait=p;state.W=p?600:960;state.H=p?800:580;UI.court.dataset.orientation=p?'portrait':'wide';if(state.screen==='game'&&(oldW!==state.W||oldH!==state.H)){for(const a of [...state.discs,...state.zones,...state.particles,...state.floaters]){a.x=a.x/oldW*state.W;a.y=a.y/oldH*state.H;if('vx'in a){a.vx*=state.W/oldW;a.vy*=state.H/oldH}}state.drag=null}const rect=UI.canvas.getBoundingClientRect();const dpr=Math.min(devicePixelRatio||1,2.25);UI.canvas.width=Math.max(1,Math.round(rect.width*dpr));UI.canvas.height=Math.max(1,Math.round(rect.height*dpr));UI.ctx.setTransform(UI.canvas.width/state.W,0,0,UI.canvas.height/state.H,0,0)}
function setScreen(name){state.screen=name;UI.home.classList.toggle('active',name==='home');UI.game.classList.toggle('active',name==='game');if(name==='game')requestAnimationFrame(resizeWorld);document.title=(name==='game'?'対戦中 | ':'')+'もはじき Ver.2.1 | ASOBeat'}
function variant(type,owner){return (state.mode==='online'&&net.role==='guest'?net.hostVariants?.[owner]:settings.variants[owner])?.[type]||VARIANTS[type]?.[0]?.[0]||'normal'}
function colorFor(player){return player===0?C.orange:C.blue}
function flashToast(text){const el=$('toast');el.textContent=text;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2200)}
function showBanner(text){$('turnToast').textContent=text;$('statusText').textContent=text}
function clearTimers(){clearTimeout(state.cpuTimer);clearTimeout(state.phaseTimer);state.token++}
function start(){clearTimers();endCamera();const portrait=settings.mode==='online'||isPortrait();state.W=portrait?600:960;state.H=portrait?800:580;state.portrait=portrait;
 state.board=settings.board;state.mode=settings.mode;state.difficulty=settings.difficulty;state.discs=[];state.zones=[];state.particles=[];state.floaters=[];state.nextID=1;state.player=0;state.scores=[0,0];state.remaining=[6,6];state.phase='ready';state.shotElapsed=0;state.stillFor=0;state.chain=0;state.maxChain=0;state.totalFusions=0;state.shotWords=[];state.foundMatch=new Set();state.selected=null;state.drag=null;state.canUndo=false;state.undoUsed=false;state.round=1;state.shake=0;state.hitstop=0;state.time=0;state.camera=false;acc=0;$('netPausePanel').hidden=true;
 buildDiscs();setScreen('game');UI.court.dataset.stage=state.board;$('stageLabel').textContent=(state.board==='land'?'✿ 陸のステージ':'≈ 海のステージ');$('stageLabel').classList.toggle('sea',state.board==='sea');$('player2Label').innerHTML=state.mode==='cpu'?'CPU <small>ブルー</small>':'PLAYER 2 <small>ブルー</small>';renderHUD();setNetGameBadge();showBanner('文字を後ろに引いて、はなそう！');const seen=load('mohajiki-tutorial-v2',false);$('tutorialBubble').hidden=!!seen||(state.mode==='online'&&net.role==='guest');state.tutorialShown=!seen;state.tutorialStep=0;resizeWorld();}
function buildDiscs(){const w=state.W,h=state.H;const list=R.filter(r=>r.board===state.board);const double=(state.board==='land'?[2,3,4,9,10]:[0,1,2,3,4]);const groups=[...list,...double.map(i=>list[i])];shuffle(groups);const cols=4,rows=4,cellW=w/cols,cellH=h/rows;const cells=Array.from({length:16},(_,i)=>({col:i%4,row:Math.floor(i/4)}));shuffle(cells);
 for(let i=0;i<groups.length;i++){const recipe=groups[i],cell=cells[i];const cx=(cell.col+.5)*cellW+rand(-cellW*.08,cellW*.08),cy=(cell.row+.5)*cellH+rand(-cellH*.10,cellH*.10),angle=rand(0,TAU),gap=rand(65,84);const p1={x:clamp(cx-Math.cos(angle)*gap/2,38,w-38),y:clamp(cy-Math.sin(angle)*gap/2,38,h-38)},p2={x:clamp(cx+Math.cos(angle)*gap/2,38,w-38),y:clamp(cy+Math.sin(angle)*gap/2,38,h-38)};
  for(const [j,p] of [p1,p2].entries()){const r=state.portrait?23.8:23.6;for(let k=0;k<20;k++){if(state.discs.every(d=>Math.hypot(d.x-p.x,d.y-p.y)>d.r+r+5))break;p.x=clamp(p.x+rand(-16,16),r+4,w-r-4);p.y=clamp(p.y+rand(-16,16),r+4,h-r-4)}state.discs.push({id:state.nextID++,type:'letter',letter:recipe.parts[j],recipe:null,owner:-1,x:p.x,y:p.y,r,m:1,vx:0,vy:0,rotation:rand(-.17,.17),rotSpeed:0,shield:0,bounces:0,ghost:0,stuck:false,exit:false,variant:null})}
 }
}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[a[i],a[j]]=[a[j],a[i]]}return a}
function renderHUD(){if(state.screen!=='game')return;const s=state;$('scoreValue1').textContent=s.scores[0];$('scoreValue2').textContent=s.scores[1];$('scoreP1').classList.toggle('active',s.player===0&&s.phase!=='result');$('scoreP2').classList.toggle('active',s.player===1&&s.phase!=='result');s.round=clamp(1+Math.floor((12-s.remaining[0]-s.remaining[1])/2),1,6);$('roundValue').innerHTML=s.round+' <i>/ 6</i>';$('turnName').textContent=(s.player===0?'P1':(s.mode==='cpu'?'CPU':'P2'))+' の番';$('remain1').textContent=s.remaining[0];$('remain2').textContent=s.remaining[1];$('turnProgress').style.width=((12-s.remaining[0]-s.remaining[1])/12*100)+'%';$('undoBtn').disabled=!s.canUndo||s.mode==='online';
 $('sideTurnTitle').textContent=s.phase==='thinking'?'CPU が考え中…':s.phase==='rolling'?'何が起こる！？':s.phase==='result'?'ゲーム終了！':s.player===0?'ねらって、はじこう。':s.mode==='cpu'?'CPU のターン':'プレイヤー2 の番';$('sideTurnDescription').textContent=s.phase==='rolling'?'合体が起きたら連鎖のチャンス！':s.phase==='ready'?'文字を引っぱって、離すだけ。好きな駒を動かしてみよう！':'ひと投げの行方を見守ろう。';if(s.mode==='online'){const mine=(s.player===(net.role==='host'?0:1));$('sideTurnTitle').textContent=s.phase==='result'?'対戦終了！':mine?'あなたの番です！':'相手の番を待っています';$('sideTurnDescription').textContent=s.phase==='ready'?(mine?'文字を引いて発射！':'相手がおはじきを狙っています…'):'お互いの盤面は自動で同期します。';}
 const z=$('zoneSummary');if(!s.zones.length){z.textContent='まだ地形はありません'}else{z.replaceChildren();for(const [name,t] of [...new Map(s.zones.map(z=>[z.type,z.turns]))]){const span=document.createElement('span');span.textContent=(ZONENAMES[name]||name)+' '+t+'T';z.appendChild(span)}}
 let nearest=null,match=null,best=1e9;for(const a of s.discs){if(a.type!=='letter')continue;for(const b of s.discs){if(a.id===b.id||b.type!=='letter')continue;const r=BY_WORD.get(s.board+':'+[a.letter,b.letter].sort().join(''));if(r){const dd=dist(a,b);if(dd<best){best=dd;nearest=r;match=[a,b]}}}}$('hintPair').textContent=nearest?nearest.parts.join(' ＋ '):'すべて発見！';$('hintName').textContent=nearest?nearest.word+'！':'大勝負！';$('hintDescription').textContent=nearest?nearest.desc:'合体駒を弾いて盤外へ！'}
function startTurn(){if(state.remaining[0]===0&&state.remaining[1]===0){endGame();return}state.player=state.remaining[state.player]>0?state.player:1-state.player;state.phase='ready';state.canUndo=false;state.drag=null;state.selected=null;for(const z of state.zones)z.turns--;state.zones=state.zones.filter(z=>z.turns>0);renderHUD();if(state.mode==='local'&&state.player===1){$('handoffTitle').textContent='PLAYER 2 の番！';$('handoffPanel').hidden=false;state.phase='handoff';showBanner('スマホをPLAYER 2へ渡そう');return}
 if(state.mode==='local'&&state.player===0){$('handoffTitle').textContent='PLAYER 1 の番！';$('handoffPanel').hidden=false;state.phase='handoff';showBanner('スマホをPLAYER 1へ渡そう');return}
 if(state.mode==='cpu'&&state.player===1){state.phase='thinking';showBanner('CPU が狙いを決めています…');renderHUD();let token=state.token;state.cpuTimer=setTimeout(()=>{if(state.token!==token||state.phase!=='thinking')return;cpuTurn()},680)}else showBanner('文字を後ろに引いて、はなそう！')}
function completeShotTransition(){if(state.mode==='online'&&!net.connected){net.pendingAdvance=true;return}state.canUndo=false;state.launchSnapshot=null;state.player=1-state.player;startTurn();if(state.mode==='online')broadcastSnapshot(true)}
function finishShot(){if(state.phase!=='rolling')return;for(const d of state.discs){d.vx=0;d.vy=0;d.rotSpeed=0}state.phase='settle';state.canUndo=state.mode==='online'?false:state.canUndo&&performance.now()<state.undoUntil;renderHUD();showBanner(state.chain>0?state.chain+'連鎖！ いい一投！':'ナイスおはじき！');const tok=state.token;state.phaseTimer=setTimeout(()=>{if(tok!==state.token||state.phase!=='settle')return;completeShotTransition()},840)}
function endGame(){clearTimers();state.phase='result';state.canUndo=false;const winner=state.scores[0]===state.scores[1]?-1:state.scores[0]>state.scores[1]?0:1;records.games++;if(winner===0&&state.mode==='cpu')records.wins++;records.best=Math.max(records.best,...state.scores);save('mohajiki-record-v2',records);renderHUD();openModal('result');if(state.mode==='online')broadcastSnapshot(true)}
function shotSnapshot(){return {discs:JSON.parse(JSON.stringify(state.discs)),zones:JSON.parse(JSON.stringify(state.zones)),scores:[...state.scores],remaining:[...state.remaining],nextID:state.nextID,totalFusions:state.totalFusions,maxChain:state.maxChain,foundMatch:[...state.foundMatch],discovered:[...discovered]}}
function undo(){if(state.mode==='online')return;if(!state.canUndo||!state.launchSnapshot||performance.now()>state.undoUntil)return;const a=state.launchSnapshot;clearTimeout(state.phaseTimer);state.discs=a.discs;state.zones=a.zones;state.scores=a.scores;state.remaining=a.remaining;state.nextID=a.nextID;state.totalFusions=a.totalFusions;state.maxChain=a.maxChain;state.foundMatch=new Set(a.foundMatch);discovered=new Set(a.discovered);save('mohajiki-discovered-v2',[...discovered]);state.particles=[];state.floaters=[];state.phase='ready';state.drag=null;state.canUndo=false;state.undoUsed=true;state.launchSnapshot=null;state.chain=0;state.hitstop=0;state.stillFor=0;renderHUD();showBanner('取り消しました。もう一度ねらおう！');playSound('undo')}
function shoot(d,vx,vy){if(!d||!['ready','thinking'].includes(state.phase)||!controllable(d))return false;const speed=Math.hypot(vx,vy);if(!Number.isFinite(speed)||speed<110||speed>1250)return false;
 if(state.mode==='online'){if(!net.connected)return false;const mine=net.role==='host'?0:1;if(state.player!==mine&&!net.remoteAction)return false;if(net.role==='guest'){const sent=netSend({t:'shot',discId:d.id,vx,vy,turn:12-state.remaining[0]-state.remaining[1]});if(sent){state.phase='waiting';state.selected=null;state.drag=null;net.waitingShot=true;$('tutorialBubble').hidden=true;if(state.tutorialShown){save('mohajiki-tutorial-v2',true);state.tutorialShown=false}renderHUD();showBanner('相手の端末へ発射情報を送っています…')}return sent;}}state.launchSnapshot=shotSnapshot();state.remaining[state.player]--;state.phase='rolling';state.shotElapsed=0;state.stillFor=0;state.chain=0;state.shotWords=[];state.canUndo=state.mode!=='online'&&(state.mode!=='cpu'||state.player===0);state.undoUntil=performance.now()+5000;state.undoUsed=false;state.selected=null;state.drag=null;state.hitstop=0;
 d.vx=vx;d.vy=vy;d.rotSpeed=rand(-3,3);particles(d.x,d.y,'#fff3bf',9,100);playSound('shoot');vibrate(9);renderHUD();showBanner('はじいた！ 合体をねらえ！');$('tutorialBubble').hidden=true;if(state.tutorialShown){save('mohajiki-tutorial-v2',true);state.tutorialShown=false}if(state.mode==='online')broadcastSnapshot(true);return true}
function controllable(d){return d&&!d.exit&&(d.type==='letter'||d.owner===state.player)&&Math.hypot(d.vx,d.vy)<35}
function isHuman(){return state.mode==='online'?net.connected&&state.player===(net.role==='host'?0:1):state.mode==='local'||state.player===0}
function getPoint(ev){const r=UI.canvas.getBoundingClientRect();return{x:(ev.clientX-r.left)/r.width*state.W,y:(ev.clientY-r.top)/r.height*state.H}}
function findDisc(p){let chosen=null,best=60;for(const d of state.discs){if(!controllable(d))continue;let dx=dist(p,d);const zone=Math.max(d.r+18,state.portrait?40:36);if(dx<zone&&dx<best){best=dx;chosen=d}}return chosen}
function pointerDown(ev){if(state.phase!=='ready'||!isHuman()||modalOpen||!$('handoffPanel').hidden)return;const p=getPoint(ev),d=findDisc(p);if(!d)return;ev.preventDefault();UI.canvas.setPointerCapture(ev.pointerId);state.drag={id:ev.pointerId,discId:d.id,x:p.x,y:p.y,startX:p.x,startY:p.y,power:0};state.selected=d.id;const r=R.find(r=>r.board===state.board&&r.parts.includes(d.letter));if(r){$('hintPair').textContent=r.parts.join(' ＋ ');$('hintName').textContent=r.word+'！'}initSound()}
function pointerMove(ev){if(!state.drag||state.drag.id!==ev.pointerId)return;ev.preventDefault();const p=getPoint(ev);state.drag.x=p.x;state.drag.y=p.y;const d=state.discs.find(d=>d.id===state.drag.discId);if(d){const len=Math.hypot(d.x-p.x,d.y-p.y);state.drag.power=clamp(len/125,0,1)}}
function pointerUp(ev){if(!state.drag||state.drag.id!==ev.pointerId)return;ev.preventDefault();const pull=state.drag;state.drag=null;try{UI.canvas.releasePointerCapture(ev.pointerId)}catch(_){}const d=state.discs.find(x=>x.id===pull.discId);if(!d)return;const dx=d.x-pull.x,dy=d.y-pull.y,length=Math.hypot(dx,dy);state.selected=null;if(length<19){showBanner('もう少し後ろに引っぱって、離そう！');return}const power=clamp((length-10)/115,.04,1);const speed=145+power*850;shoot(d,dx/length*speed,dy/length*speed)}
function pointerCancel(ev){if(state.drag&&state.drag.id===ev.pointerId){state.drag=null;state.selected=null}}
UI.canvas.addEventListener('pointerdown',pointerDown,{passive:false});UI.canvas.addEventListener('pointermove',pointerMove,{passive:false});UI.canvas.addEventListener('pointerup',pointerUp,{passive:false});UI.canvas.addEventListener('pointercancel',pointerCancel,{passive:false});
const FIXED=1/120;
function gameTick(dt){state.time+=dt;state.shake=Math.max(0,state.shake-dt*15);for(const a of state.particles){a.x+=a.vx*dt;a.y+=a.vy*dt;a.vx*=Math.exp(-2.8*dt);a.vy*=Math.exp(-2.8*dt);a.life-=dt}state.particles=state.particles.filter(a=>a.life>0);for(const a of state.floaters){a.y-=dt*45;a.life-=dt}state.floaters=state.floaters.filter(a=>a.life>0);
 if(state.canUndo&&performance.now()>state.undoUntil){state.canUndo=false;$('undoBtn').disabled=true}if(state.mode==='online'&&(net.role==='guest'||!net.connected))return;if(state.phase!=='rolling'||modalOpen)return;
 if(state.hitstop>0){state.hitstop-=dt;return}state.shotElapsed+=dt;
 const w=state.W,h=state.H;
 for(const d of state.discs){if(d.exit)continue;d.stuck=false;
  for(const z of state.zones){const distance=Math.hypot(d.x-z.x,d.y-z.y);if(distance>z.r+d.r*.4)continue;const u=clamp(distance/z.r,0,1),fall=1-u*.4;switch(z.type){
   case'grass':d.vx*=Math.exp(-.95*dt);d.vy*=Math.exp(-.95*dt);break;
   case'frost':d.vx*=Math.exp(-1.7*dt);d.vy*=Math.exp(-1.7*dt);break;
   case'blue':d.vx*=Math.exp(-1.8*dt);d.vy*=Math.exp(-1.8*dt);break;
   case'red':d.vx*=Math.exp(.9*dt);d.vy*=Math.exp(.9*dt);break;
   case'slope':d.vx+=dt*(state.board==='land'?135:95)*fall*(d.x>z.x?1:-1);break;
   case'wave':d.vy+=Math.sin(state.time*7+z.x*.01)*75*dt*fall;d.vx+=Math.cos(state.time*4+z.y*.01)*35*dt*fall;break;
   case'vortex':{const dx=z.x-d.x,dy=z.y-d.y,inv=1/Math.max(28,distance);d.vx+=(dx*.52-dy*.72)*inv*210*dt*fall;d.vy+=(dy*.52+dx*.72)*inv*210*dt*fall;break}
   case'hotspring':d.vx=0;d.vy=0;d.stuck=true;break;
   case'poison':if(d.type==='letter'&&state.shotElapsed>.15){d.exit=true;particles(d.x,d.y,'#b276ac',16,100);floater(d.x,d.y,'どく！','#9b4a9b');playSound('poison')}break;
  }}if(d.exit)continue;
  if(d.type==='combo'&&(d.recipe.type==='dog'||d.recipe.type==='shark'||d.variant==='lop')&&state.shotElapsed<1.7){const target=state.discs.filter(q=>q.id!==d.id&&!q.exit).sort((a,b)=>dist(a,d)-dist(b,d))[0];if(target&&dist(d,target)<240){const dx=target.x-d.x,dy=target.y-d.y,dd=Math.hypot(dx,dy)||1;d.vx+=dx/dd*165*dt;d.vy+=dy/dd*165*dt}}
  if(d.ghost>0)d.ghost=Math.max(0,d.ghost-dt);
  const decay=Math.exp(-2.33*dt);d.vx*=decay;d.vy*=decay;const sp=Math.hypot(d.vx,d.vy);if(sp>1250){d.vx*=1250/sp;d.vy*=1250/sp}if(sp<4.4){d.vx=0;d.vy=0}d.x+=d.vx*dt;d.y+=d.vy*dt;d.rotation=clamp(d.rotation+d.rotSpeed*dt,-10000,10000);d.rotSpeed*=Math.exp(-3.3*dt);
  boundary(d);
 }
 state.discs=state.discs.filter(d=>!d.exit);
 const fusionQueue=[],claimed=new Set();
 for(let iteration=0;iteration<2;iteration++){
  for(let i=0;i<state.discs.length;i++){const a=state.discs[i];if(a.exit||claimed.has(a.id))continue;for(let j=i+1;j<state.discs.length;j++){const b=state.discs[j];if(b.exit||claimed.has(b.id))continue;if(a.ghost>0||b.ghost>0)continue;const dx=b.x-a.x,dy=b.y-a.y;const sep=a.r+b.r,dd2=dx*dx+dy*dy;if(dd2>=sep*sep)continue;
    if(iteration===0&&a.type==='letter'&&b.type==='letter'){const recipe=BY_WORD.get(state.board+':'+[a.letter,b.letter].sort().join(''));if(recipe){claimed.add(a.id);claimed.add(b.id);fusionQueue.push({a,b,recipe});continue}}
    const distance=Math.max(1e-6,Math.sqrt(dd2)),nx=dx/distance,ny=dy/distance,overlap=sep-distance,invA=1/a.m,invB=1/b.m,total=invA+invB;
    a.x-=nx*overlap*(invA/total)*.55;b.x+=nx*overlap*(invB/total)*.55;a.y-=ny*overlap*(invA/total)*.55;b.y+=ny*overlap*(invB/total)*.55;
    const relative=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;if(relative<0){const e=(a.shield||b.shield)?1.03:.77;const imp=-(1+e)*relative/total;a.vx-=imp*nx*invA;a.vy-=imp*ny*invA;b.vx+=imp*nx*invB;b.vy+=imp*ny*invB;const tangentX=-ny,tangentY=nx;const slip=(b.vx-a.vx)*tangentX+(b.vy-a.vy)*tangentY;const jt=clamp(-slip/total,-Math.abs(imp)*.08,Math.abs(imp)*.08);a.vx-=jt*tangentX*invA;a.vy-=jt*tangentY*invA;b.vx+=jt*tangentX*invB;b.vy+=jt*tangentY*invB;
      if(a.shield)a.shield=Math.max(0,a.shield-1);if(b.shield)b.shield=Math.max(0,b.shield-1);
      if(Math.abs(relative)>85){if(state.time-lastImpact>.07){playSound('impact',Math.min(1,Math.abs(relative)/700));lastImpact=state.time}particles((a.x+b.x)/2,(a.y+b.y)/2,'#fff7df',Math.min(6,Math.ceil(Math.abs(relative)/120)),Math.abs(relative)*.3)}}
   }}
 }
 if(fusionQueue.length){for(const c of fusionQueue){state.discs=state.discs.filter(d=>d.id!==c.a.id&&d.id!==c.b.id);fuse(c.a,c.b,c.recipe)}renderHUD()}
 const moving=state.discs.some(d=>Math.hypot(d.vx,d.vy)>14);state.stillFor=moving?0:state.stillFor+dt;
 if(state.stillFor>.64||state.shotElapsed>8.5)finishShot();
}
function boundary(d){const w=state.W,h=state.H,r=d.r,gateX=state.portrait?82:114,gateY=state.portrait?117:92;
 if(d.x< -r||d.x>w+r||d.y< -r||d.y>h+r){knockout(d);return}
 const goalTB=Math.abs(d.x-w/2)<gateX,goalLR=Math.abs(d.y-h/2)<gateY;
 if(d.x<r&&!(goalLR&&d.vx<0)){d.x=r;d.vx=Math.abs(d.vx)*.78;wallFX(d)}
 if(d.x>w-r&&!(goalLR&&d.vx>0)){d.x=w-r;d.vx=-Math.abs(d.vx)*.78;wallFX(d)}
 if(d.y<r&&!(goalTB&&d.vy<0)){d.y=r;d.vy=Math.abs(d.vy)*.78;wallFX(d)}
 if(d.y>h-r&&!(goalTB&&d.vy>0)){d.y=h-r;d.vy=-Math.abs(d.vy)*.78;wallFX(d)}
}
function wallFX(d){if(d.bounces>0){d.bounces--;d.vx*=1.2;d.vy*=1.2;particles(d.x,d.y,'#ffcb72',8,105);floater(d.x,d.y,'バウンド！','#d88b45')}if(state.time-lastImpact>.10&&Math.hypot(d.vx,d.vy)>150){playSound('wall');lastImpact=state.time}}
function knockout(d){if(d.exit)return;d.exit=true;let points=0;if(d.type==='letter')points=10*Math.max(1,state.chain);else if(d.owner!==state.player)points=30;state.scores[state.player]+=points;particles(clamp(d.x,0,state.W),clamp(d.y,0,state.H),'#ffd47e',17,165);floater(clamp(d.x,0,state.W),clamp(d.y,0,state.H),points?'+'+points:'OUT!',points?'#efa548':'#94a599');if(points)playSound('point');renderHUD()}
function fuse(a,b,recipe){const s=state,cx=(a.x+b.x)/2,cy=(a.y+b.y)/2;s.chain++;s.maxChain=Math.max(s.maxChain,s.chain);s.totalFusions++;s.shotWords.push(recipe.word);s.foundMatch.add(recipe.word);if(!discovered.has(recipe.word)){discovered.add(recipe.word);save('mohajiki-discovered-v2',[...discovered]);flashToast('図鑑に「'+recipe.word+'」が追加された！')}
 const scored=20*s.chain;s.scores[s.player]+=scored;const d={id:s.nextID++,type:'combo',letter:null,recipe,owner:s.player,x:cx,y:cy,r:28,m:1.4,vx:(a.vx+b.vx)*.54,vy:(a.vy+b.vy)*.54,rotation:0,rotSpeed:rand(-2,2),shield:0,bounces:0,ghost:0,exit:false,variant:variant(recipe.type,s.player)};
 const original=Math.hypot(d.vx,d.vy);if(original<70){const angle=rand(0,TAU);d.vx=Math.cos(angle)*120;d.vy=Math.sin(angle)*120}
 s.discs.push(d);effect(d);particles(cx,cy,recipe.color,21+(s.chain-1)*5,180);particles(cx,cy,'#fffbea',12,120);floater(cx,cy-14,recipe.word+'！','#fcffed',1.2);floater(cx,cy+20,'+'+scored+'  '+(s.chain>1?s.chain+' COMBO!':'NICE!'),'#f9af5f',1.6);s.shake=Math.min(11,3+s.chain*2.2);s.hitstop=.06;playSound('fusion',s.chain);vibrate(s.chain>1?[8,25,15]:10);
 if(s.chain>1)showBanner('すごい！ '+s.chain+'連鎖！  ×'+s.chain+'！');else showBanner(recipe.word+' が完成！ '+recipe.skill)
}
function addZone(type,x,y,r,owner,label){const z={id:state.nextID++,x:clamp(x,r*.75,state.W-r*.75),y:clamp(y,r*.75,state.H-r*.75),r,type,owner,turns:4,label:label||ZONENAMES[type]};const near=state.zones.find(z=>z.type===type&&dist(z,{x,y})<r*.68);if(near){near.r=Math.min(225,Math.max(r,near.r)+25);near.turns=4;near.x=mix(near.x,x,.16);near.y=mix(near.y,y,.16)}else state.zones.push(z)}
function radialForce(x,y,radius,strength,exclude){for(const t of state.discs){if(t.exit||t.id===exclude)continue;const dx=t.x-x,dy=t.y-y,dd=Math.hypot(dx,dy);if(dd<radius&&dd>1){const force=(1-dd/radius)*strength;t.vx+=dx/dd*force/t.m;t.vy+=dy/dd*force/t.m}}}
function push(d,speed){const a=Math.atan2(d.vy,d.vx)||rand(0,TAU);d.vx=Math.cos(a)*speed;d.vy=Math.sin(a)*speed}
function dashToNear(d,power=420){const t=state.discs.filter(x=>x.id!==d.id&&!x.exit).sort((a,b)=>dist(a,d)-dist(b,d))[0];if(!t){push(d,power);return}const dx=t.x-d.x,dy=t.y-d.y,dd=Math.max(1,Math.hypot(dx,dy));d.vx=dx/dd*power;d.vy=dy/dd*power}
function effect(d){const kind=d.recipe.type,v=d.variant,x=d.x,y=d.y,p=d.owner;
 switch(kind){
  case'cat':d.bounces=1;push(d,360);break;
  case'elephant':push(d,600);if(v==='mammoth')addZone('frost',x,y,95,p,'マンモス氷山');else radialForce(x,y,132,180,d.id);break;
  case'bear':radialForce(x,y,175,280,d.id);addZone(v==='polar'?'frost':'slope',x,y,116,p);break;
  case'horse':push(d,v==='race'?590:480);addZone('slope',x,y,100,p);break;
  case'dog':dashToNear(d,370);break;
  case'bird':d.ghost=1.45;push(d,470);break;
  case'flower':addZone(v==='poison'?'poison':v==='blue'?'blue':v==='red'?'red':'grass',x,y,v==='poison'?95:130,p);break;
  case'cow':radialForce(x,y,180,v==='bull'?400:270,d.id);push(d,v==='bull'?530:385);break;
  case'mountain':addZone(v==='everest'?'frost':'slope',x,y,154,p);radialForce(x,y,145,170,d.id);break;
  case'monkey':d.bounces=1;push(d,340);addZone(v==='onsen'?'hotspring':'grass',x,y,114,p);if(v==='ring')d.rotSpeed=rand(-9,9);break;
  case'rabbit':d.bounces=2;push(d,410);addZone('grass',x,y,v==='nether'?182:115,p);if(v==='lop')dashToNear(d,430);break;
  case'shark':dashToNear(d,570);break;
  case'shrimp':d.bounces=3;push(d,480);addZone('wave',x,y,99,p);break;
  case'turtle':d.shield=3;addZone('vortex',x,y,92,p);break;
  case'octopus':radialForce(x,y,130,-140,d.id);addZone('vortex',x,y,130,p);break;
  case'crab':{const vx=d.vx;d.vx=-(d.vy||120)*2.2;d.vy=vx*.22;addZone('vortex',x,y,103,p);break}
  case'ship':addZone('wave',x,y,145,p);radialForce(x,y,153,220,d.id);push(d,325);break;
  case'salmon':addZone('wave',x,y,108,p);d.vy-=460;d.vx+=150;break;
  case'shell':d.shield=4;break;
  case'wave':addZone('wave',x,y,175,p);radialForce(x,y,160,140,d.id);break;
  case'mackerel':d.vx=(d.vx>=0?1:-1)*590;d.vy=rand(-75,75);addZone('wave',x,y,90,p);break;
 }
}
function particles(x,y,color,count=10,speed=140){if(settings.reducedMotion)return;const max=180;for(let i=0;i<count&&state.particles.length<max;i++){const angle=rand(0,TAU),v=rand(speed*.2,speed);state.particles.push({x,y,vx:Math.cos(angle)*v,vy:Math.sin(angle)*v,life:rand(.22,.65),total:.65,r:rand(2,6),color})}}
function floater(x,y,text,color='#fff',life=1){state.floaters.push({x,y,text,color,life,total:life})}
function cpuTurn(){if(state.phase!=='thinking')return;const playable=state.discs.filter(controllable);if(playable.length===0){state.remaining[state.player]--;state.player=1-state.player;startTurn();return}
 const candidates=[];for(const d of playable){if(d.type==='letter'){for(const t of state.discs){if(t.id===d.id||t.type!=='letter')continue;const r=BY_WORD.get(state.board+':'+[d.letter,t.letter].sort().join(''));if(!r)continue;const distance=dist(d,t);if(distance<44||distance>670)continue;const blockers=state.discs.filter(b=>b.id!==d.id&&b.id!==t.id).reduce((n,b)=>{const projection=((b.x-d.x)*(t.x-d.x)+(b.y-d.y)*(t.y-d.y))/distance**2;if(projection<=0||projection>=1)return n;const ax=d.x+projection*(t.x-d.x),ay=d.y+projection*(t.y-d.y);return n+(Math.hypot(b.x-ax,b.y-ay)<b.r+d.r+5?1:0)},0);candidates.push({d,t,distance,score:140-distance*.12-blockers*32+rand(-8,8),angle:Math.atan2(t.y-d.y,t.x-d.x)})}}
 else{const enemies=state.discs.filter(t=>t.owner!==state.player&&t.id!==d.id);for(const t of enemies.slice(0,8)){candidates.push({d,t,distance:dist(d,t),score:25-dist(d,t)*.06+rand(-12,12),angle:Math.atan2(t.y-d.y,t.x-d.x)})}}}
 const difficulty=state.difficulty;let move;
 if(candidates.length){candidates.sort((a,b)=>b.score-a.score);let limit=difficulty==='hard'?4:difficulty==='normal'?8:Math.min(16,candidates.length);let choices=candidates.slice(0,limit);move=choices[(Math.random()*choices.length)|0]}else{const d=playable[(Math.random()*playable.length)|0];move={d,distance:180,angle:rand(0,TAU)}}
 const error=difficulty==='hard'?.075:difficulty==='normal'?.20:.44;const angle=move.angle+rand(-error,error);const targetSpeed=clamp(185+move.distance*2.55,320,940)*(difficulty==='easy'?rand(.75,1.07):rand(.96,1.10));shoot(move.d,Math.cos(angle)*targetSpeed,Math.sin(angle)*targetSpeed);
}
function initSound(){if(!settings.sound||audioCtx)return;try{audioCtx=new (window.AudioContext||window.webkitAudioContext)();audioMaster=audioCtx.createGain();audioMaster.gain.value=settings.volume*.26;audioMaster.connect(audioCtx.destination)}catch(_){audioCtx=null}}
function playSound(type,level=1){if(!settings.sound)return;initSound();if(!audioCtx)return;if(audioCtx.state==='suspended'){audioCtx.resume().catch(()=>{})}const t=audioCtx.currentTime;function tone(start,end,dur=.13,wave='sine',gain=.14,delay=0){const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=wave;o.frequency.setValueAtTime(start,t+delay);o.frequency.exponentialRampToValueAtTime(Math.max(30,end),t+delay+dur);g.gain.setValueAtTime(.0001,t+delay);g.gain.exponentialRampToValueAtTime(Math.max(.001,gain),t+delay+.012);g.gain.exponentialRampToValueAtTime(.0001,t+delay+dur);o.connect(g).connect(audioMaster);o.start(t+delay);o.stop(t+delay+dur+.025)}
 try{switch(type){case'shoot':tone(600,270,.115,'triangle',.1);tone(1000,400,.09,'sine',.04);break;case'wall':tone(310,185,.07,'triangle',.052);break;case'impact':tone(500,160,.10,'sine',.07*level);break;case'fusion':tone(480,760,.12,'sine',.16);tone(640,1170,.19,'triangle',.095,.08);if(level>1)tone(920,1750,.17,'sine',.08,.17);break;case'point':tone(750,1050,.12,'sine',.11);break;case'poison':tone(260,95,.21,'sawtooth',.05);break;case'undo':tone(320,520,.11,'triangle',.07);break;case'win':for(let i=0;i<4;i++)tone([523,659,784,1047][i],[640,770,980,1250][i],.17,'triangle',.12,i*.1);break;case'lose':tone(440,220,.27,'triangle',.10);break}}
 catch(_){}
}
function vibrate(pattern){try{if(!settings.reducedMotion)navigator.vibrate?.(pattern)}catch(_){}}
let cachedBackground=null,cachedKey='';
function background(){const key=state.board+'-'+state.W+'-'+state.H+'-'+state.camera;if(cachedKey===key&&cachedBackground)return cachedBackground;cachedKey=key;const cv=document.createElement('canvas');cv.width=state.W;cv.height=state.H;cachedBackground=cv;const g=cv.getContext('2d'),w=state.W,h=state.H,isSea=state.board==='sea';
 if(state.camera){g.fillStyle='rgba(17,65,60,.39)';g.fillRect(0,0,w,h)}else{const bg=g.createLinearGradient(0,0,w,h);if(isSea){bg.addColorStop(0,'#d2f2f0');bg.addColorStop(.6,'#e5f8f2');bg.addColorStop(1,'#bfe8eb')}else{bg.addColorStop(0,'#f4f0d9');bg.addColorStop(.6,'#edf3dc');bg.addColorStop(1,'#f9edcd')}g.fillStyle=bg;g.fillRect(0,0,w,h)}
 g.lineWidth=1;g.strokeStyle=isSea?'#63adb01d':'#8cad7924';const step=state.portrait?85:78;for(let x=step;x<w;x+=step){g.beginPath();g.moveTo(x,0);g.lineTo(x,h);g.stroke()}for(let y=step;y<h;y+=step){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke()}
 for(let i=0;i<70;i++){const x=(i*127.21+73.5)%w,y=(i*79.19+28.2)%h;g.globalAlpha=.20+(i%5)*.06;g.fillStyle=isSea?'#66bcc4':'#8dab83';if(isSea){g.beginPath();g.arc(x,y,(i%3)+1,0,TAU);g.fill()}else{g.save();g.translate(x,y);g.rotate(i*.79);g.fillRect(-3,-1.2,6,2);g.restore()}}g.globalAlpha=1;
 g.save();g.strokeStyle=isSea?'#67b3bd77':'#b3c29a99';g.lineWidth=6;g.strokeRect(3,3,w-6,h-6);g.setLineDash([4,12]);g.lineWidth=2;g.strokeStyle=isSea?'#c1fbf6':'#fffef1';g.strokeRect(16,16,w-32,h-32);g.restore();
 drawGate(g,'top');drawGate(g,'bottom');drawGate(g,'left');drawGate(g,'right');return cv}
function drawGate(g,dir){const w=state.W,h=state.H,tb=state.portrait?82:114,lr=state.portrait?117:92;g.save();g.strokeStyle='#ffae7877';g.lineWidth=8;g.lineCap='round';g.fillStyle='#ad835e82';g.textAlign='center';g.font='900 9px system-ui';if(dir==='top'||dir==='bottom'){let y=dir==='top'?6:h-6;g.beginPath();g.moveTo(w/2-tb,y);g.lineTo(w/2+tb,y);g.stroke();g.fillText('OUT  ◇  OUT',w/2,dir==='top'?25:h-18)}else{let x=dir==='left'?6:w-6;g.beginPath();g.moveTo(x,h/2-lr);g.lineTo(x,h/2+lr);g.stroke()}g.restore()}
function drawZones(g){for(const z of state.zones){g.save();const pal={grass:['#76ba82',.23],slope:['#e0b17a',.24],frost:['#9ccfe5',.28],hotspring:['#f2a78e',.28],poison:['#bc82bc',.26],blue:['#86a4f2',.23],red:['#e88376',.25],wave:['#76c7d9',.24],vortex:['#91a9da',.25]};const [col,opacity]=pal[z.type]||['#88bba2',.2];g.globalAlpha=opacity;g.fillStyle=col;g.beginPath();g.arc(z.x,z.y,z.r,0,TAU);g.fill();g.globalAlpha=.68;g.strokeStyle=col;g.lineWidth=4;g.setLineDash([8,12]);g.beginPath();g.arc(z.x,z.y,z.r-5,0,TAU);g.stroke();g.setLineDash([]);g.translate(z.x,z.y);
 if(z.type==='wave'||z.type==='vortex'||z.type==='hotspring'){g.beginPath();g.arc(0,0,z.r*.43,0,TAU);g.stroke();g.beginPath();g.arc(0,0,z.r*.22,0,TAU);g.stroke()}else if(z.type==='slope'||z.type==='frost'){g.beginPath();g.moveTo(-z.r*.5,z.r*.3);g.lineTo(0,-z.r*.28);g.lineTo(z.r*.5,z.r*.3);g.stroke()}else if(z.type==='grass'){for(let i=0;i<8;i++){const a=i*TAU/8+state.time*.04;g.beginPath();g.moveTo(Math.cos(a)*z.r*.47,Math.sin(a)*z.r*.47);g.lineTo(Math.cos(a+.12)*z.r*.55,Math.sin(a+.12)*z.r*.55);g.stroke()}}g.restore();
 g.save();g.textAlign='center';g.font='900 11px system-ui';g.fillStyle=z.type==='poison'?'#9c4c9c':'#647a79';g.fillText((z.label||ZONENAMES[z.type])+' • '+z.turns+'T',z.x,z.y+z.r-13);g.restore()}}
function drawHints(g){if(!state.drag||!settings.guide)return;const chosen=state.discs.find(d=>d.id===state.drag.discId);if(!chosen||chosen.type!=='letter')return;g.save();for(const t of state.discs){if(t.id===chosen.id||t.type!=='letter')continue;const r=BY_WORD.get(state.board+':'+[chosen.letter,t.letter].sort().join(''));if(!r)continue;g.strokeStyle='#ffce65a1';g.setLineDash([7,9]);g.lineWidth=2;g.beginPath();g.moveTo(chosen.x,chosen.y);g.lineTo(t.x,t.y);g.stroke();g.setLineDash([]);g.beginPath();g.arc(t.x,t.y,t.r+7+Math.sin(state.time*6)*2,0,TAU);g.strokeStyle='#ffb94d';g.lineWidth=3;g.stroke()}g.restore()}
function drawAim(g){const a=state.drag;if(!a)return;const d=state.discs.find(d=>d.id===a.discId);if(!d)return;const dx=d.x-a.x,dy=d.y-a.y,len=Math.hypot(dx,dy);if(len<2)return;const nx=dx/len,ny=dy/len,p=clamp(len/125,0,1);
 g.save();g.strokeStyle='#345e5380';g.lineWidth=2;g.setLineDash([4,7]);g.beginPath();g.moveTo(d.x,d.y);g.lineTo(a.x,a.y);g.stroke();g.setLineDash([]);
 if(!settings.guide){g.restore();return}
 const maxlen=65+p*170,endX=d.x+nx*maxlen,endY=d.y+ny*maxlen;const grad=g.createLinearGradient(d.x,d.y,endX,endY);grad.addColorStop(0,'#f69c46');grad.addColorStop(1,'#f8ae6333');g.lineWidth=4.5;g.strokeStyle=grad;g.lineCap='round';g.setLineDash([11,9]);g.beginPath();g.moveTo(d.x+nx*(d.r+8),d.y+ny*(d.r+8));g.lineTo(endX,endY);g.stroke();g.setLineDash([]);g.translate(endX,endY);g.rotate(Math.atan2(ny,nx));g.fillStyle='#f49451';g.beginPath();g.moveTo(11,0);g.lineTo(-11,-8);g.lineTo(-11,8);g.closePath();g.fill();g.restore();
 g.save();g.translate(a.x,a.y);g.fillStyle='#ffffffdf';g.strokeStyle='#eab375';g.lineWidth=2;g.beginPath();g.arc(0,0,19,0,TAU);g.fill();g.stroke();g.fillStyle='#df8e55';g.beginPath();g.arc(0,0,5,0,TAU);g.fill();g.restore();
 g.save();const px=clamp(d.x+nx*60,40,state.W-50),py=clamp(d.y+ny*60,32,state.H-30);g.translate(px,py);g.fillStyle='#284e41e5';roundRect(g,-29,-15,58,28,13);g.fill();g.textAlign='center';g.textBaseline='middle';g.fillStyle='#fff';g.font='900 13px system-ui';g.fillText('⚡ '+Math.ceil(p*5)+'/5',0,0);g.restore();}
function roundRect(g,x,y,w,h,r){g.beginPath();if(g.roundRect)g.roundRect(x,y,w,h,r);else{g.moveTo(x+r,y);g.lineTo(x+w-r,y);g.quadraticCurveTo(x+w,y,x+w,y+r);g.lineTo(x+w,y+h-r);g.quadraticCurveTo(x+w,y+h,x+w-r,y+h);g.lineTo(x+r,y+h);g.quadraticCurveTo(x,y+h,x,y+h-r);g.lineTo(x,y+r);g.quadraticCurveTo(x,y,x+r,y)}g.closePath()}
function paintDisc(g,d){const selected=state.selected===d.id,combo=d.type==='combo';const r=d.r;g.save();g.translate(d.x,d.y);if(selected){g.save();g.lineWidth=4;g.strokeStyle=colorFor(state.player);g.globalAlpha=.84;g.beginPath();g.arc(0,0,r+10+Math.sin(state.time*9)*2,0,TAU);g.stroke();g.restore()}
 g.save();g.fillStyle='#22332630';g.beginPath();g.ellipse(3,7,r+3,r*.70,0,0,TAU);g.fill();g.restore();
 const base=combo?d.recipe.color:(d.letter==='ね'||d.letter==='さ'||d.letter==='う')?'#f5c28e':'#b6ddc2';const grad=g.createRadialGradient(-r*.4,-r*.49,1,0,0,r*1.22);grad.addColorStop(0,'#ffffff');grad.addColorStop(.3,base);grad.addColorStop(.77,base);grad.addColorStop(1,combo?'#856c65':'#7ea899');g.fillStyle=grad;g.strokeStyle=combo?'#fff9de':'#fafdf3';g.lineWidth=2.8;g.beginPath();g.arc(0,0,r,0,TAU);g.fill();g.stroke();g.strokeStyle=combo?'#c8a68a9c':'#9ec5b4a8';g.lineWidth=2.3;g.beginPath();g.arc(0,0,r-4,0,TAU);g.stroke();
 g.save();g.globalAlpha=.39;g.fillStyle='#fff';g.beginPath();g.ellipse(-r*.29,-r*.48,r*.39,r*.16,-.6,0,TAU);g.fill();g.restore();
 if(combo){g.save();g.translate(0,-6);paintSymbol(g,d.recipe.type);g.restore();g.font='900 11px "Hiragino Kaku Gothic ProN",system-ui,sans-serif';g.fillStyle='#324b40';g.textAlign='center';g.textBaseline='middle';g.fillText(d.recipe.word,0,r*.60);g.fillStyle=colorFor(d.owner);g.beginPath();g.arc(r*.69,-r*.67,6,0,TAU);g.fill();if(d.shield){g.strokeStyle='#fbfff7';g.lineWidth=2;g.beginPath();g.arc(0,0,r+3+Math.sin(state.time*3)*2,0,TAU);g.stroke()}}
 else{g.font='900 27px "Hiragino Kaku Gothic ProN","Yu Gothic",system-ui,sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillStyle='#2b6553';g.fillText(d.letter,0,2)}
 if(d.ghost>0){g.globalAlpha=.37;g.fillStyle='#f6fefd';g.beginPath();g.arc(0,0,r+3,0,TAU);g.fill()}g.restore()}
function paintSymbol(g,type){g.save();g.lineCap='round';g.lineJoin='round';const dark='#3b6558',light='#fffdf5';g.strokeStyle=dark;g.fillStyle=light;g.lineWidth=2.3;
 const oval=(x,y,rx,ry,fill=light)=>{g.fillStyle=fill;g.beginPath();g.ellipse(x,y,rx,ry,0,0,TAU);g.fill();g.stroke()};
 const tri=(coords,fill=light)=>{g.beginPath();g.moveTo(coords[0][0],coords[0][1]);for(const p of coords.slice(1))g.lineTo(p[0],p[1]);g.closePath();g.fillStyle=fill;g.fill();g.stroke()};
 const eyes=(x=6,y=-2)=>{g.fillStyle=dark;g.beginPath();g.arc(-x,y,1.6,0,TAU);g.arc(x,y,1.6,0,TAU);g.fill()};
 if(['cat','dog','bear','monkey','rabbit','cow','horse'].includes(type)){
  if(type==='cat'){tri([[-11,-10],[-10,-22],[-1,-12]]);tri([[1,-12],[10,-22],[11,-10]])}
  if(type==='rabbit'){oval(-10,-17,5,13,'#ffeedc');oval(10,-17,5,13,'#ffeedc')}
  if(type==='dog'){oval(-14,-7,6,11,'#f7d5ac');oval(14,-7,6,11,'#f7d5ac')}
  if(type==='bear'){oval(-11,-13,6,6);oval(11,-13,6,6)}
  if(type==='cow'){tri([[-11,-9],[-15,-19],[-4,-10]]);tri([[11,-9],[15,-19],[4,-10]])}
  if(type==='horse'){tri([[-10,-10],[-8,-20],[-1,-11]]);tri([[10,-10],[8,-20],[1,-11]])}
  if(type==='monkey'){oval(-13,-3,6,7);oval(13,-3,6,7)}
  oval(0,-2,14,type==='rabbit'?12:11,type==='cow'?'#f9f3e9':'#fef0d8');eyes(6,-4);g.strokeStyle=dark;g.beginPath();g.arc(0,1,3,.1,Math.PI-.1);g.stroke();if(type==='cat'){g.beginPath();g.moveTo(-4,2);g.lineTo(-14,1);g.moveTo(4,2);g.lineTo(14,1);g.stroke()}
 }else if(type==='elephant'){oval(0,-3,16,11,'#cfdae0');oval(-13,-5,6,10,'#e5edf0');eyes(5,-6);g.beginPath();g.moveTo(9,-2);g.quadraticCurveTo(19,11,7,13);g.stroke()}
 else if(type==='flower'){for(let i=0;i<6;i++){const a=TAU*i/6;oval(Math.cos(a)*11,Math.sin(a)*11-5,6,8,'#ffebec')}oval(0,-5,7,7,'#f5c866')}
 else if(type==='bird'){oval(0,-4,13,9,'#fff5df');tri([[9,-6],[20,-2],[9,1]],'#efb25f');g.beginPath();g.arc(-3,-2,2,0,TAU);g.fillStyle=dark;g.fill();g.beginPath();g.moveTo(-4,1);g.quadraticCurveTo(-14,-8,-18,-1);g.stroke()}
 else if(type==='mountain'){tri([[-18,10],[0,-19],[19,10]],'#81b5a2');tri([[-8,-7],[0,-19],[8,-7]],'#ffffff')}
 else if(['shark','salmon','mackerel'].includes(type)){oval(0,-3,16,8,'#d9f4f4');tri([[-10,-4],[-24,-14],[-23,9]],'#93d1d9');tri([[-2,-11],[2,-20],[7,-11]],'#96c9d7');g.fillStyle=dark;g.beginPath();g.arc(9,-5,2,0,TAU);g.fill()}
 else if(type==='shrimp'){g.lineWidth=5;g.strokeStyle='#d47d6b';g.beginPath();g.arc(0,-3,11,-1.3,Math.PI*.72);g.stroke();tri([[-8,4],[-16,9],[-18,-1]],'#efc2ac');eyes(5,-7)}
 else if(type==='turtle'){oval(0,-4,14,12,'#79a98d');oval(14,-7,6,5,'#d3eac6');g.strokeStyle='#e1efd8';g.beginPath();g.moveTo(-8,-10);g.lineTo(7,4);g.moveTo(8,-11);g.lineTo(-6,4);g.stroke()}
 else if(type==='octopus'){oval(0,-9,13,11,'#e3c1ec');for(let i=-2;i<=2;i++){g.beginPath();g.moveTo(i*5,0);g.quadraticCurveTo(i*8,14,i*7+4,10);g.stroke()}eyes(6,-10)}
 else if(type==='crab'){oval(0,-3,12,8,'#f0b3a8');for(const s of [-1,1]){g.beginPath();g.moveTo(s*7,0);g.lineTo(s*16,6);g.moveTo(s*8,-5);g.lineTo(s*17,-14);g.stroke();oval(s*18,-15,4,5,'#e0a192')}eyes(5,-5)}
 else if(type==='ship'){tri([[-19,0],[20,0],[11,11],[-11,11]],'#c49b7a');tri([[-2,-17],[-2,-2],[14,-2]],'#fff5e0');g.strokeStyle=dark;g.beginPath();g.moveTo(-3,-19);g.lineTo(-3,3);g.stroke()}
 else if(type==='shell'){oval(0,0,14,13,'#e7c7a6');for(let i=-2;i<=2;i++){g.beginPath();g.moveTo(0,10);g.lineTo(i*7,-11);g.stroke()}}
 else if(type==='wave'){g.strokeStyle='#367ea3';g.lineWidth=4;for(let j=0;j<2;j++){g.beginPath();g.moveTo(-19,-8+j*12);g.bezierCurveTo(-7,-20+j*12,3,5+j*12,20,-8+j*12);g.stroke()}}
 g.restore()}
function render(){if(state.screen!=='game')return;const g=UI.ctx,w=state.W,h=state.H;if(!UI.canvas.width||!UI.canvas.height)return;g.setTransform(UI.canvas.width/w,0,0,UI.canvas.height/h,0,0);g.clearRect(0,0,w,h);g.save();if(state.shake&&!settings.reducedMotion){g.translate(rand(-state.shake,state.shake),rand(-state.shake,state.shake))}
 g.drawImage(background(),0,0,w,h);drawZones(g);drawHints(g);
 const discs=[...state.discs].sort((a,b)=>a.y-b.y);for(const d of discs){if(state.mode==='online'&&net.role==='guest'&&state.phase==='rolling'){const prev=net.prevPositions.get(d.id);if(prev){const t=clamp((performance.now()-prev.t)/70,0,1);paintDisc(g,{...d,x:mix(prev.x,d.x,t),y:mix(prev.y,d.y,t)});continue}}paintDisc(g,d)}drawAim(g);
 for(const p of state.particles){g.save();g.globalAlpha=Math.max(0,p.life/p.total);g.fillStyle=p.color;g.translate(p.x,p.y);g.rotate((p.x+p.y)*.12);g.fillRect(-p.r/2,-p.r/2,p.r,p.r);g.restore()}
 for(const p of state.floaters){g.save();g.globalAlpha=clamp(p.life/p.total,0,1);g.textAlign='center';g.font='950 23px "Hiragino Kaku Gothic ProN",system-ui';g.lineWidth=5;g.strokeStyle='#3c493ba8';g.strokeText(p.text,p.x,p.y);g.fillStyle=p.color;g.fillText(p.text,p.x,p.y);g.restore()}
 g.restore();}
function raf(now){if(!lastNow)lastNow=now;const dt=clamp((now-lastNow)/1000,0,.05);lastNow=now;if(state.screen==='game'){acc+=dt;let loops=0;while(acc>=FIXED&&loops++<8){gameTick(FIXED);acc-=FIXED}if(loops>=8)acc=0;if(state.mode==='online'&&net.role==='host')broadcastSnapshot();render()}requestAnimationFrame(raf)}
/* -------- Dialogs -------- */
function openModal(name,tab){if(name==='result'&&state.phase!=='result')return;modalOpen=true;UI.modal.hidden=false;UI.modal.dataset.kind=name;let html='';
 if(name==='help')html=`<div class="modal-kicker">HOW TO PLAY / 01</div><h2 id="modalTitle">ことばを、はじこう。</h2><p class="modal-lead">操作は指一本。ねらいを決めたら、後ろに引っぱって手を離すだけ！</p><div class="rules-list"><div class="rule-item"><span class="rule-num">1</span><div><b>後ろに引いて、はなす。</b><p>発射ラインの方向へ飛ぶよ。長く引くほど強い一投に。短く引くとキャンセルできる。</p></div></div><div class="rule-item"><span class="rule-num">2</span><div><b>文字がくっつくと、合体！</b><p>「ね」＋「こ」で「ねこ」！陸は11種類、海は10種類。できた駒が技を使う。</p></div></div><div class="rule-item"><span class="rule-num">3</span><div><b>連鎖をつないで得点アップ！</b><p>合体は20点×連鎖数。盤外へ出した文字は10点×連鎖数。相手の合体駒は30点。自分の合体駒は0点。</p></div></div><div class="rule-item"><span class="rule-num">4</span><div><b>6投ずつで勝負！</b><p>通常の文字は両方が使える。合体駒は作った人だけが動かせる。地形は約4ターン継続。</p></div></div></div><button class="modal-action" data-close="modal">わかった！</button>`;
 if(name==='settings'){let rows=Object.entries(VARIANTS).map(([type,vs])=>{const r=R.find(r=>r.type===type);return [0,1].map(p=>`<label><span>${r.name} / ${p===0?'PLAYER 1':state.mode==='cpu'?'CPU':'PLAYER 2'}</span><select data-variant="${type}" data-owner="${p}" ${state.mode==='online'&&net.role==='guest'?'disabled':''}>${vs.map(([id,label])=>`<option value="${id}" ${variant(type,p)===id?'selected':''}>${label}</option>`).join('')}</select></label>`).join('')}).join('');html=`<div class="modal-kicker">SETTINGS / 02</div><h2 id="modalTitle">ちょうどいい、あそび心地。</h2><p class="modal-lead">設定と図鑑はこのブラウザだけに保存されます。外部AIやアカウントは不要です。${state.mode==='online'&&net.role==='guest'?'オンライン対戦中の種類設定はP1（ホスト）が管理します。':''}</p><label class="settings-row"><span>効果音<small>軽いガラスの音、合体音、連鎖音</small></span><input id="soundSetting" type="checkbox" ${settings.sound?'checked':''}></label><label class="settings-row"><span>音量<small>初期値は小さめ</small></span><input id="volumeSetting" type="range" min="0" max="1" step="0.05" value="${settings.volume}"></label><label class="settings-row"><span>発射ガイド<small>射線のヒントを表示（ON推奨）</small></span><input id="guideSetting" type="checkbox" ${settings.guide?'checked':''}></label><label class="settings-row"><span>動きを控える<small>画面の揺れ・パーティクルを抑える</small></span><input id="motionSetting" type="checkbox" ${settings.reducedMotion?'checked':''}></label><div class="variant-section"><h3 class="modal-section-heading">✿ 陸の仲間の種類を設定</h3><p class="modal-lead">種類によって特殊技や地形が変わります。次の合体から反映されます。</p><div class="variant-grid">${rows}</div></div><button class="modal-action" data-close="modal">この設定であそぶ</button>`}
 if(name==='zukan'){const board=tab||state.board;html=`<div class="modal-kicker">MOHAJIKI COLLECTION / 03</div><h2 id="modalTitle">もはじき図鑑。</h2><p class="modal-lead">はじいて出会った言葉を記録。<b>${discovered.size} / 21</b> 発見済み。すべて見つけられるかな？</p><div class="zukan-tabs"><button data-zukan="land" class="${board==='land'?'selected':''}">✿ 陸の11種</button><button data-zukan="sea" class="${board==='sea'?'selected':''}">≈ 海の10種</button></div><div class="zukan-list">${R.filter(r=>r.board===board).map(r=>{const ok=discovered.has(r.word);return `<div class="zukan-entry ${ok?'':'locked'}"><div class="zukan-symbol">${ok?r.word:'?'}</div><b>${ok?r.parts.join('＋')+' = '+r.word:'???'}</b><p>${ok?r.skill:'まだ見つけてないよ'}</p></div>`}).join('')}</div><p class="modal-lead" style="margin-top:18px">同じ文字でも動きや地形は選択した種類によって変化。種類設定は「せってい」から。</p><button class="modal-action" data-close="modal">とじる</button>`}
 if(name==='waitingRematch')html=`<div class="modal-kicker">REMATCH / ONLINE</div><h2 id="modalTitle">もう一戦、やろう！</h2><p class="modal-lead">あなたは準備OK！ 相手の「もう一戦！」を待っています。</p><button class="modal-action" data-action="exit">タイトルに戻る</button>`;
 if(name==='exit')html=`<div class="modal-kicker">LEAVE BATTLE?</div><h2 id="modalTitle">タイトルへ戻りますか？</h2><p class="modal-lead">進行中の対戦は終了します。発見した図鑑は保存されています。</p><div class="result-buttons"><button data-close="modal">対戦にもどる</button><button class="primary" data-action="exit">タイトルに戻る</button></div>`;
 if(name==='result'){const win=state.scores[0]===state.scores[1]?-1:state.scores[0]>state.scores[1]?0:1;const who=win<0?'ひきわけ！':win===0?'PLAYER 1 WIN!':state.mode==='cpu'?'CPU WIN!':'PLAYER 2 WIN!';html=`<div class="modal-kicker">GAME SET / NICE HAJIKI!</div><div class="result-winner"><span>6 THROWS × 2 PLAYERS</span><h2 id="modalTitle">${who}</h2><p class="modal-lead" style="margin:0">${win===0?'いい一投だったね！また勝負しよう。':win===1?'次は大逆転を決めよう！':'互角の勝負！もう一戦！'}</p></div><div class="result-score-row"><div class="result-score"><span>PLAYER 1</span><b>${state.scores[0]}</b></div><div class="result-score p2"><span>${state.mode==='cpu'?'CPU':'PLAYER 2'}</span><b>${state.scores[1]}</b></div></div><div class="result-grid"><div><b>${state.maxChain}</b><small>最大連鎖</small></div><div><b>${state.totalFusions}</b><small>合体回数</small></div><div><b>${state.foundMatch.size}</b><small>できた言葉</small></div></div><div class="result-buttons"><button data-action="share">↗ Xに投稿</button><button data-action="card">▣ 結果画像を保存</button><button class="primary" data-action="retry">↺ もう一戦！</button><button data-action="exit">← タイトルへ</button></div>`;playSound(win===0?'win':'lose')}
 UI.modalContent.innerHTML=html;UI.modal.querySelector('.modal-panel').scrollTop=0;
}
function closeModal(){modalOpen=false;UI.modal.hidden=true;UI.modal.dataset.kind='';UI.modalContent.innerHTML=''}
function applySelection(){document.querySelectorAll('.option[data-board]').forEach(b=>b.classList.toggle('selected',settings.board===b.dataset.board));document.querySelectorAll('.mode[data-mode]').forEach(b=>b.classList.toggle('selected',settings.mode===b.dataset.mode));document.querySelectorAll('.difficulty-buttons button').forEach(b=>b.classList.toggle('selected',settings.difficulty===b.dataset.difficulty));$('difficultyRow').style.display=settings.mode==='cpu'?'flex':'none';$('startBtn').hidden=settings.mode==='online';$('onlineSetup').hidden=settings.mode!=='online';$('soundGlyph').textContent=settings.sound?'♫':'×';persist()}
function shareResult(){let best=Math.max(...state.scores),url=location.protocol==='https:'||location.protocol==='http:'?location.origin+location.pathname:'';const copy=`「もはじき」でことば大合戦！\nスコア：${state.scores[0]} - ${state.scores[1]}\n最大連鎖：${state.maxChain}連鎖！\n21種類の合体、あなたは何種類見つけられる？\n\n#もはじき #ASOBeat${url?'\n'+url:''}`;if(!url)flashToast('公開後はURLが自動で入ります');const x='https://twitter.com/intent/tweet?text='+encodeURIComponent(copy);const pop=window.open(x,'_blank','noopener,noreferrer');if(!pop)navigator.clipboard?.writeText(copy).then(()=>flashToast('投稿文をコピーしました')).catch(()=>flashToast('投稿文をコピーできませんでした'))}
function resultCard(){const cv=document.createElement('canvas');cv.width=1200;cv.height=630;const g=cv.getContext('2d');const bg=g.createLinearGradient(0,0,1200,630);bg.addColorStop(0,'#f8f2d6');bg.addColorStop(1,state.board==='sea'?'#9bdadc':'#d3e6cc');g.fillStyle=bg;g.fillRect(0,0,1200,630);g.fillStyle='#fffdf5d9';roundRect(g,55,50,1090,530,35);g.fill();g.textAlign='center';g.fillStyle='#6c9c79';g.font='900 24px system-ui';g.fillText('ASOBeat  /  MOHAJIKI',600,122);g.fillStyle='#e68350';g.font='950 88px system-ui';g.fillText('もはじき。',600,239);g.fillStyle='#325d51';g.font='900 29px system-ui';g.fillText('ことばでバトル！ 6投ずつの大勝負',600,297);g.font='950 82px system-ui';g.fillStyle='#e98d5d';g.fillText(state.scores[0],425,408);g.fillStyle='#4e7061';g.fillText('—',600,408);g.fillStyle='#5fb4c8';g.fillText(state.scores[1],775,408);g.font='900 25px system-ui';g.fillStyle='#4d856e';g.fillText('最大 '+state.maxChain+' 連鎖　/　合体 '+state.totalFusions+' 回',600,473);g.fillStyle='#7f9b84';g.font='900 20px system-ui';g.fillText('#もはじき  #ASOBeat',600,532);const a=document.createElement('a');a.download='mohajiki-result.png';a.href=cv.toDataURL('image/png');a.click();flashToast('結果カードを作成しました')}
async function toggleCamera(){if(state.camera){endCamera();showBanner('通常盤面に戻りました');return}if(!navigator.mediaDevices?.getUserMedia){flashToast('この環境ではカメラを利用できません（HTTPSが必要です）');return}try{const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});if(state.screen!=='game'){stream.getTracks().forEach(t=>t.stop());return}state.cameraStream=stream;UI.video.srcObject=stream;await UI.video.play();state.camera=true;UI.court.classList.add('camera-on');$('cameraBtn').textContent='▣ 通常盤面';cachedKey='';flashToast('カメラ背景ON（3D平面認識ではありません）')}catch(e){flashToast('カメラを利用できません。ブラウザの権限を確認してください')}}
function endCamera(){state.cameraStream?.getTracks().forEach(t=>t.stop());state.cameraStream=null;state.camera=false;UI.video.srcObject=null;UI.court.classList.remove('camera-on');$('cameraBtn').textContent='▣ カメラ盤面';cachedKey=''}
/* -------- 2-device online battle / PeerJS signaling + host-authoritative state -------- */
const net={peer:null,conn:null,role:null,room:'',connected:false,hasMatch:false,matchId:0,lastMatchId:0,
  rematch:[false,false],remoteAction:false,lastSnapshotSeq:0,snapshotSeq:0,lastSync:0,
  retryTimer:null,watchdog:null,connectTimeout:null,connectStarted:0,lastReceived:0,heartbeat:0,
  pendingAdvance:false,waitingShot:false,hostVariants:null,closing:false,prevPositions:new Map()};
const ROOM_ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PEER_PREFIX='asobeat-mohajiki-v21-';
let peerLoading=null;
function roomCode(){const bytes=new Uint8Array(8);if(crypto?.getRandomValues)crypto.getRandomValues(bytes);else for(let i=0;i<8;i++)bytes[i]=Math.floor(Math.random()*256);return [...bytes].map(n=>ROOM_ALPHABET[n%ROOM_ALPHABET.length]).join('')}
function sanitizeRoom(value){return String(value||'').replace(/[^a-zA-Z0-9]/g,'').toUpperCase()}
function peerId(room){return PEER_PREFIX+room.toLowerCase()}
function inviteUrl(){if(!/^https?:$/.test(location.protocol))return '';const url=new URL(location.href);url.searchParams.set('room',net.room);url.hash='';return url.href}
function setRoomStatus(message){$('roomStatus').textContent=message}
function showRoomPanel(){const shown=!!net.role;$('roomPanel').hidden=!shown;if(!shown)return;
 $('roomCode').textContent=net.room;document.querySelector('.room-divider').hidden=shown;document.querySelector('.room-join-row').hidden=shown;$('createRoom').hidden=shown;
 $('onlineStart').hidden=net.role!=='host';
 $('onlineStart').disabled=!(net.role==='host'&&net.connected&&!net.hasMatch);
 $('createRoom').disabled=!!net.role;$('joinRoom').disabled=!!net.role;$('roomInput').disabled=!!net.role;
 if(net.role==='host')setRoomStatus(net.connected?'友だちと接続しました。あなたはP1です！':'友だちの参加を待っています…（あなたはP1）');
 else setRoomStatus(net.connected?'ホストと接続しました！ あなたはP2です。ゲーム開始を待とう。':'部屋を探しています…');
}
function setNetGameBadge(){const badge=$('netGameStatus');badge.hidden=state.mode!=='online';if(badge.hidden)return;
 badge.classList.toggle('offline',!net.connected);badge.textContent=(net.connected?'● 接続中 / ':'◌ 再接続中 / ')+(net.role==='host'?'あなたは P1':'あなたは P2');}
function showNetDisconnect(){if(state.mode!=='online'||state.screen!=='game')return;
 $('netPausePanel').hidden=net.connected;
 $('netPauseTitle').textContent=net.role==='host'?'友だちの再接続を待っています':'通信が切れました';
 $('netPauseText').textContent=net.role==='host'?'盤面を保存したまま接続を待ちます。ホストはページを閉じないでください。':'再接続を試みます。盤面はホスト側で一時停止します。';
 $('netReconnect').hidden=net.role!=='guest';setNetGameBadge();}
function netSend(data){try{if(net.conn?.open){net.conn.send(data);return true}}catch(e){console.warn('もはじき: 送信失敗',e)}return false}
function closeNetwork(){net.closing=true;clearTimeout(net.retryTimer);clearTimeout(net.connectTimeout);clearInterval(net.watchdog);
 const conn=net.conn,peer=net.peer;net.conn=null;net.peer=null;
 try{conn?.close()}catch(_){}try{peer?.destroy()}catch(_){}
 Object.assign(net,{role:null,room:'',connected:false,hasMatch:false,matchId:0,lastMatchId:0,rematch:[false,false],
 remoteAction:false,lastSnapshotSeq:0,snapshotSeq:0,lastSync:0,pendingAdvance:false,waitingShot:false,hostVariants:null,prevPositions:new Map(),closing:false});
 $('roomPanel').hidden=true;document.querySelector('.room-divider').hidden=false;document.querySelector('.room-join-row').hidden=false;$('createRoom').hidden=false;$('createRoom').disabled=false;$('joinRoom').disabled=false;$('roomInput').disabled=false;$('netPausePanel').hidden=true;setNetGameBadge();
}
function loadPeerJS(){if(window.Peer)return Promise.resolve();if(peerLoading)return peerLoading;
 const urls=['https://cdnjs.cloudflare.com/ajax/libs/peerjs/1.5.5/peerjs.min.js','https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js'];
 peerLoading=new Promise((resolve,reject)=>{let n=0;const next=()=>{if(n>=urls.length){reject(new Error('通信ライブラリを読み込めませんでした。通信環境を確認してください。'));return}
 const tag=document.createElement('script');tag.async=true;tag.src=urls[n++];tag.onload=()=>window.Peer?resolve():next();tag.onerror=()=>{tag.remove();next()};document.head.appendChild(tag)};next()}).catch(err=>{peerLoading=null;throw err});return peerLoading;
}
function watchNetwork(){clearInterval(net.watchdog);net.lastReceived=Date.now();net.heartbeat=Date.now();net.watchdog=setInterval(()=>{
 if(!net.role||!net.peer)return;
 if(net.connected){if(Date.now()-net.heartbeat>6500){netSend({t:'ping',at:Date.now()});net.heartbeat=Date.now()}
  if(Date.now()-net.lastReceived>30000){try{net.conn?.close()}catch(_){}}}
 },3000)}
function networkFailure(err){const type=err?.type||'';const desc=type==='unavailable-id'?'同じルームコードの部屋が使用されています。もう一度作成してください。':
 type==='peer-unavailable'?'部屋が見つかりません。ルームコードを確認してください。':
 type==='network'?'通信が不安定です。Wi-Fiやモバイル回線を確認してください。':
 '通信エラーが発生しました。もう一度お試しください。';
 setRoomStatus(desc);flashToast(desc);console.warn('もはじき online',type,err?.message||'');
}
async function makeRoom(){if(net.role||net.peer)return;initSound();$('roomPanel').hidden=false;$('roomCode').textContent='準備中…';setRoomStatus('ルームを作成しています…');$('createRoom').disabled=true;
 try{await loadPeerJS();const code=roomCode();net.room=code;net.role='host';net.connectStarted=Date.now();
 const peer=new Peer(peerId(code),{debug:0});net.peer=peer;
 peer.on('open',()=>{if(net.peer!==peer)return;showRoomPanel();watchNetwork();});
 peer.on('connection',conn=>{if(net.peer!==peer){conn.close();return}if(net.conn){conn.on('open',()=>{conn.send({t:'busy'});conn.close()});return}bindNetConnection(conn)});
 peer.on('error',err=>{if(net.peer!==peer)return;networkFailure(err);if(err.type==='unavailable-id'){closeNetwork();setRoomStatus('部屋が使用されています。もう一度作ってください。')}});
 peer.on('disconnected',()=>{if(net.peer===peer&&!peer.destroyed)try{peer.reconnect()}catch(_){}});
 showRoomPanel();
 }catch(err){closeNetwork();networkFailure(err)}}
async function enterRoom(code){const valid=sanitizeRoom(code);if(!/^[A-HJ-NP-Z2-9]{8}$/.test(valid)){flashToast('8文字のルームコードを入力してください');return}
 if(net.role||net.peer)return;initSound();$('roomPanel').hidden=false;$('roomCode').textContent=valid;setRoomStatus('部屋に接続しています…');$('joinRoom').disabled=true;
 try{await loadPeerJS();net.room=valid;net.role='guest';net.connectStarted=Date.now();const peer=new Peer(undefined,{debug:0});net.peer=peer;
 peer.on('open',()=>{if(net.peer!==peer)return;watchNetwork();guestConnect()});
 peer.on('error',err=>{if(net.peer!==peer)return;networkFailure(err)});
 peer.on('disconnected',()=>{if(net.peer===peer&&!peer.destroyed)try{peer.reconnect()}catch(_){}});
 showRoomPanel();
 }catch(err){closeNetwork();networkFailure(err)}}
function guestConnect(){if(net.role!=='guest'||!net.peer||net.connected||net.closing)return;
 clearTimeout(net.retryTimer);clearTimeout(net.connectTimeout);
 try{const conn=net.peer.connect(peerId(net.room),{reliable:true,serialization:'json'});bindNetConnection(conn);
 net.connectTimeout=setTimeout(()=>{if(net.conn===conn&&!net.connected){try{conn.close()}catch(_){}setRoomStatus('接続がタイムアウトしました。ルームコードを確認してください。')}} ,16000);
 }catch(err){networkFailure(err);scheduleRetry()}}
function scheduleRetry(){if(net.role!=='guest'||net.connected||net.closing)return;clearTimeout(net.retryTimer);net.retryTimer=setTimeout(()=>guestConnect(),3800)}
function bindNetConnection(conn){net.conn=conn;
 conn.on('open',()=>{if(net.conn!==conn)return;net.connected=true;net.lastReceived=Date.now();clearTimeout(net.connectTimeout);clearTimeout(net.retryTimer);
 showRoomPanel();showNetDisconnect();setNetGameBadge();
 if(net.role==='guest')netSend({t:'hello',version:21});
 else{netSend({t:'lobby',board:settings.board,version:21});if(net.hasMatch){netSend({t:'start',matchId:net.matchId,snapshot:gameSnapshot(),variants:settings.variants});if(net.pendingAdvance&&state.phase==='settle'){net.pendingAdvance=false;completeShotTransition()}broadcastSnapshot(true)} }
 });
 conn.on('data',message=>{if(net.conn!==conn)return;net.lastReceived=Date.now();onNetMessage(message)});
 conn.on('close',()=>{if(net.conn!==conn||net.closing)return;net.connected=false;net.conn=null;clearTimeout(net.connectTimeout);
 showRoomPanel();showNetDisconnect();setNetGameBadge();if(net.role==='guest')scheduleRetry();
 });
 conn.on('error',err=>{if(net.conn===conn){console.warn('通信路エラー',err?.message);setRoomStatus('通信が不安定です。再接続を試します。')}});
}
function gameSnapshot(){const s=state;return{board:s.board,W:s.W,H:s.H,phase:s.phase,player:s.player,
 remaining:[...s.remaining],scores:[...s.scores],nextID:s.nextID,chain:s.chain,maxChain:s.maxChain,
 totalFusions:s.totalFusions,shotWords:[...s.shotWords],foundMatch:[...s.foundMatch],
 discs:s.discs.map(d=>({...d,recipe:d.recipe?d.recipe.id:null})),zones:s.zones.map(z=>({...z})), time:s.time,
 turn:12-s.remaining[0]-s.remaining[1]};}
function broadcastSnapshot(force=false){if(net.role!=='host'||!net.connected||!net.hasMatch||state.screen!=='game')return;
 const now=performance.now(),delay=state.phase==='rolling'?55:state.phase==='ready'?250:160;
 if(!force&&now-net.lastSync<delay)return;
 net.lastSync=now;netSend({t:'state',matchId:net.matchId,seq:++net.snapshotSeq,snapshot:gameSnapshot()});}
function hydrateRemote(snapshot){if(!snapshot||!Array.isArray(snapshot.discs)||snapshot.discs.length>150||!Array.isArray(snapshot.zones)||snapshot.zones.length>50)return;
 if(snapshot.W!==600||snapshot.H!==800||!['land','sea'].includes(snapshot.board))return;
 const previousPhase=state.phase,previousChain=state.totalFusions,previousTurn=12-state.remaining[0]-state.remaining[1];
 if(net.waitingShot&&snapshot.phase==='ready'&&snapshot.player===1&&snapshot.turn===previousTurn)return;
 const keepAim=!!(state.drag&&snapshot.phase==='ready'&&previousPhase==='ready'&&state.player===1&&snapshot.player===1);
 const nums=['player','nextID','chain','maxChain','totalFusions'];for(const key of nums)if(Number.isFinite(snapshot[key]))state[key]=snapshot[key];
 if(!Array.isArray(snapshot.scores)||!Array.isArray(snapshot.remaining))return;
 state.scores=snapshot.scores.slice(0,2);state.remaining=snapshot.remaining.slice(0,2);
 if(!state.drag){for(const d of state.discs){net.prevPositions.set(d.id,{x:d.x,y:d.y,t:performance.now()})}}
 state.board=snapshot.board;state.W=600;state.H=800;state.portrait=true;
 const previousDiscs=new Map(state.discs.map(d=>[d.id,d]));
 state.discs=snapshot.discs.map(d=>({...d,recipe:d.recipe===null?null:R[d.recipe]||null}));
 state.zones=snapshot.zones.map(z=>({...z}));state.shotWords=Array.isArray(snapshot.shotWords)?snapshot.shotWords:[];
 state.foundMatch=new Set(snapshot.foundMatch||[]);for(const w of state.foundMatch){if(R.some(r=>r.word===w))discovered.add(w)}save('mohajiki-discovered-v2',[...discovered]);state.phase=snapshot.phase;state.time=snapshot.time||state.time;
 state.canUndo=false;if(!keepAim){state.drag=null;state.selected=null}state.shotElapsed=0;state.stillFor=0;
 for(const d of state.discs){if(d.type==='combo'&&d.recipe&&!discovered.has(d.recipe.word)){discovered.add(d.recipe.word);save('mohajiki-discovered-v2',[...discovered])}}
 if(state.phase==='ready'){const who=state.player===1?'あなた':'相手';showBanner(who+'の番！ おはじきをねらおう');if(state.player===1&&state.tutorialShown)$('tutorialBubble').hidden=false;else $('tutorialBubble').hidden=true;}
 else if(state.phase==='rolling')showBanner('おはじきが動いています…');
 else if(state.phase==='settle')showBanner('次のターンを準備中…');
 else if(state.phase==='result')showBanner('試合終了！');
 if(state.totalFusions>previousChain){playSound('fusion');vibrate(8)}
 if(state.phase==='rolling'&&previousPhase==='ready'&&previousTurn<snapshot.turn)playSound('shoot');
 if(state.phase==='result'&&previousPhase!=='result'){closeModal();openModal('result')}
 UI.court.dataset.stage=state.board;renderHUD();}
function handleStartMessage(m){if(net.role!=='guest'||!m.snapshot||!Number.isInteger(m.matchId))return;
 if(net.lastMatchId!==m.matchId||state.screen!=='game'){
 net.lastMatchId=m.matchId;net.hasMatch=true;net.rematch=[false,false];net.waitingShot=false;
 settings.mode='online';settings.board=m.snapshot.board;applySelection();closeModal();start();
 $('netPausePanel').hidden=false;net.hostVariants=Array.isArray(m.variants)?m.variants:null;
 }
 hydrateRemote(m.snapshot);setNetGameBadge();showNetDisconnect();}
function onNetMessage(m){if(!m||typeof m!=='object'||typeof m.t!=='string')return;
 if(m.t==='ping'){netSend({t:'pong'});return}if(m.t==='pong')return;
 if(m.t==='busy'){flashToast('この部屋は満員です。別の部屋をお試しください。');closeNetwork();return}
 if(net.role==='host'){
  if(m.t==='hello'){netSend({t:'lobby',board:settings.board,version:21});if(net.hasMatch)netSend({t:'start',matchId:net.matchId,snapshot:gameSnapshot(),variants:settings.variants});return}
  if(m.t==='shot'){
   const d=state.discs.find(d=>d.id===m.discId);const speed=Math.hypot(m.vx,m.vy);
   const valid=net.connected&&net.hasMatch&&state.screen==='game'&&state.mode==='online'&&state.phase==='ready'&&state.player===1&&
     Number.isFinite(m.vx)&&Number.isFinite(m.vy)&&Number.isInteger(m.turn)&&m.turn===12-state.remaining[0]-state.remaining[1]&&speed>=110&&speed<=1000&&controllable(d);
   if(valid){net.remoteAction=true;try{shoot(d,m.vx,m.vy)}finally{net.remoteAction=false}netSend({t:'shotAccepted',turn:m.turn});broadcastSnapshot(true)}
   else{netSend({t:'shotRejected'});broadcastSnapshot(true)}
   return;
  }
  if(m.t==='rematch'&&net.hasMatch&&state.phase==='result'){net.rematch[1]=true;flashToast('相手がもう一戦を希望しています！');if(net.rematch[0])startOnlineMatch();return}
  if(m.t==='requestSnapshot'&&net.hasMatch){netSend({t:'start',matchId:net.matchId,snapshot:gameSnapshot(),variants:settings.variants});return}
 } else if(net.role==='guest'){
  if(m.t==='lobby'){if(m.version!==21){flashToast('ゲームのバージョンが違います。両端末を更新してください。');return}
   if(['land','sea'].includes(m.board)){settings.board=m.board;applySelection()}
   showRoomPanel();return}
  if(m.t==='start'){handleStartMessage(m);return}
  if(m.t==='shotRejected'){net.waitingShot=false;flashToast('投球が受理されませんでした。盤面を同期します。');netSend({t:'requestSnapshot'});return}
  if(m.t==='shotAccepted'){net.waitingShot=false;return}
  if(m.t==='state'){
   if(!net.hasMatch||m.matchId!==net.lastMatchId||!Number.isInteger(m.seq)||m.seq<=net.lastSnapshotSeq)return;
   net.lastSnapshotSeq=m.seq;hydrateRemote(m.snapshot);return;
  }
  if(m.t==='notice'){flashToast(String(m.message||'').slice(0,90));return}
 }
}
function startOnlineMatch(){if(net.role!=='host'||!net.connected)return;
 net.hasMatch=true;net.matchId++;net.snapshotSeq=0;net.lastSnapshotSeq=0;net.rematch=[false,false];net.pendingAdvance=false;
 settings.mode='online';persist();start();netSend({t:'start',matchId:net.matchId,snapshot:gameSnapshot(),variants:settings.variants});broadcastSnapshot(true);
}
function requestOnlineRematch(){if(!net.connected){flashToast('再接続後に再戦できます');return}
 if(net.role==='host'){net.rematch[0]=true;if(net.rematch[1]){closeModal();startOnlineMatch();return}}
 else{net.rematch[1]=true;netSend({t:'rematch'})}
 openModal('waitingRematch');}
function disconnectToHome(){closeModal();clearTimers();endCamera();closeNetwork();state.phase='home';setScreen('home');applySelection();window.scrollTo(0,0)}
async function copyInvite(){const text=inviteUrl()||net.room;try{await navigator.clipboard.writeText(text);flashToast(inviteUrl()?'招待URLをコピーしました！':'ルームコードをコピーしました！')}catch(_){flashToast('コピーできません。コードを長押しでコピーしてください。')}}
async function shareInvite(){const url=inviteUrl(),message='「もはじき」で2台対戦しよう！ ルームコード：'+net.room;
 if(navigator.share){try{await navigator.share({title:'もはじき 2台対戦',text:message,...url?{url}:{}})}catch(e){if(e.name!=='AbortError')copyInvite()}}
 else copyInvite();}
$('createRoom').addEventListener('click',makeRoom);
$('joinRoom').addEventListener('click',()=>enterRoom($('roomInput').value));
$('roomInput').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();enterRoom($('roomInput').value)}});
$('roomInput').addEventListener('input',e=>{const next=sanitizeRoom(e.target.value).slice(0,8);if(next!==e.target.value)e.target.value=next});
$('copyInvite').addEventListener('click',copyInvite);$('shareInvite').addEventListener('click',shareInvite);
$('leaveRoom').addEventListener('click',()=>{closeNetwork();flashToast('部屋から退出しました')});
$('onlineStart').addEventListener('click',startOnlineMatch);
$('netReconnect').addEventListener('click',()=>{if(net.role==='guest'){guestConnect();flashToast('再接続しています…')}});
$('netQuit').addEventListener('click',disconnectToHome);
const invitedRoom=new URLSearchParams(location.search).get('room');if(invitedRoom&&/^[A-HJ-NP-Z2-9]{8}$/.test(sanitizeRoom(invitedRoom))){
 settings.mode='online';settings.board='land';$('roomInput').value=sanitizeRoom(invitedRoom);
 setTimeout(()=>enterRoom($('roomInput').value),250);
}

/* -------- Controls & lifecycle -------- */
document.querySelectorAll('.option[data-board]').forEach(el=>el.addEventListener('click',()=>{if(net.role==='guest'){flashToast('ステージは部屋を作った人が選びます');return}if(net.hasMatch){flashToast('対戦中はステージを変更できません');return}settings.board=el.dataset.board;applySelection();playSound('point');if(net.role==='host'&&net.connected)netSend({t:'lobby',board:settings.board,version:21})}));
document.querySelectorAll('.mode[data-mode]').forEach(el=>el.addEventListener('click',()=>{if(net.role&&el.dataset.mode!=='online')closeNetwork();settings.mode=el.dataset.mode;applySelection()}));
document.querySelectorAll('.difficulty-buttons button').forEach(el=>el.addEventListener('click',()=>{settings.difficulty=el.dataset.difficulty;applySelection()}));
$('startBtn').addEventListener('click',()=>{initSound();start()});$('homeLogo').addEventListener('click',ev=>{ev.preventDefault();if(state.screen==='game')openModal('exit');else window.scrollTo({top:0,behavior:'smooth'})});
$('backToHome').addEventListener('click',()=>openModal('exit'));
$('openZukanHome').addEventListener('click',()=>openModal('zukan'));$('openHelpHome').addEventListener('click',()=>openModal('help'));$('openSettingsHome').addEventListener('click',()=>openModal('settings'));
$('gameZukan').addEventListener('click',()=>openModal('zukan'));$('gameHelp').addEventListener('click',()=>openModal('help'));$('gameSettings').addEventListener('click',()=>openModal('settings'));
$('undoBtn').addEventListener('click',undo);$('cameraBtn').addEventListener('click',toggleCamera);$('globalSound').addEventListener('click',()=>{settings.sound=!settings.sound;persist();applySelection();if(settings.sound){initSound();playSound('point')}else{audioCtx?.suspend().catch(()=>{})}flashToast(settings.sound?'効果音をONにしました':'効果音をOFFにしました')});
$('handoffReady').addEventListener('click',()=>{$('handoffPanel').hidden=true;state.phase='ready';showBanner('文字を後ろに引いて、はなそう！');renderHUD()});$('skipTutorial').addEventListener('click',()=>{$('tutorialBubble').hidden=true;state.tutorialShown=false;save('mohajiki-tutorial-v2',true)});
$('modalClose').addEventListener('click',closeModal);
UI.modal.addEventListener('click',ev=>{if(ev.target.matches('[data-close="modal"]')||ev.target.closest('[data-close="modal"]')){closeModal();return}const z=ev.target.closest('[data-zukan]');if(z){openModal('zukan',z.dataset.zukan);return}const a=ev.target.closest('[data-action]');if(!a)return;switch(a.dataset.action){case 'retry':if(state.mode==='online'){requestOnlineRematch()}else{closeModal();start()}break;case 'exit':disconnectToHome();break;case'share':shareResult();break;case'card':resultCard();break}});
UI.modalContent.addEventListener('change',ev=>{const t=ev.target;if(t.id==='soundSetting'){settings.sound=t.checked;applySelection();if(settings.sound){initSound();playSound('point')}else audioCtx?.suspend().catch(()=>{});return}
 if(t.id==='guideSetting')settings.guide=t.checked;
 if(t.id==='motionSetting')settings.reducedMotion=t.checked;
 if(t.matches('[data-variant]')){if(state.mode==='online'&&net.role==='guest'){flashToast('種類の設定はホスト側で変更できます');return}const owner=Number(t.dataset.owner),type=t.dataset.variant;settings.variants[owner][type]=t.value;flashToast('「'+R.find(r=>r.type===type).name+'」の種類を変更しました')}
 persist()});
UI.modalContent.addEventListener('input',ev=>{if(ev.target.id==='volumeSetting'){settings.volume=+ev.target.value;if(audioMaster)audioMaster.gain.value=settings.volume*.26;persist()}});
window.addEventListener('keydown',ev=>{if(ev.key==='Escape'){if(modalOpen)closeModal();else if(state.screen==='game')openModal('exit')}if((ev.key==='z'||ev.key==='Z')&&ev.ctrlKey&&state.screen==='game'){ev.preventDefault();undo()}});
window.addEventListener('resize',()=>{if(state.screen==='game')resizeWorld()},{passive:true});document.addEventListener('visibilitychange',()=>{if(document.hidden){lastNow=0;acc=0}});
applySelection();requestAnimationFrame(raf);
/* lightweight diagnostics used by automated smoke tests; no mutation of live state. */
window.MOHAJIKI_DEBUG={getState:()=>({screen:state.screen,phase:state.phase,board:state.board,mode:state.mode,player:state.player,scores:[...state.scores],remaining:[...state.remaining],chain:state.chain,totalFusions:state.totalFusions,discs:state.discs.map(d=>({id:d.id,type:d.type,letter:d.letter,recipe:d.recipe?.word,owner:d.owner,x:d.x,y:d.y,vx:d.vx,vy:d.vy})),zones:state.zones.map(z=>({type:z.type,turns:z.turns})),discovered:[...discovered]}),getRecipes:()=>R.map(r=>({board:r.board,word:r.word,type:r.type})),getNet:()=>({role:net.role,connected:net.connected,room:net.room,hasMatch:net.hasMatch,matchId:net.matchId,lastMatchId:net.lastMatchId,seq:net.lastSnapshotSeq,rematch:[...net.rematch]}),debugShoot:(id,vx,vy)=>{const d=state.discs.find(d=>d.id===id);return shoot(d,vx,vy)}};
})();
