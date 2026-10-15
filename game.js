'use strict';
const $ = id => document.getElementById(id);
const canvas = $('art'), ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
const pads = Array.from(document.querySelectorAll('[data-pad]'));
const sceneObjects = ['snoop','cake','raccoon','key','fallen','opening','glove','box','silence','record','player','dance','finalOpen','birthday','letter'];
const chapters = ['A VERY NORMAL EMPTY SCREEN','THAT IS NOT A BOXING GLOVE','AN ENTIRELY UNBREAKABLE LOCK','ABSOLUTELY NO DANCING','THIS IS NOT A DANCE FLOOR','A COMPLETELY EMPTY BOX','…OKAY. SURPRISE.','FOR CARLOS'];
const pattern = [0,2,1,0,3];
let cakeOwned=false,keyOwned=false,keyDropped=false,keyUnlocked=false;let recordPosition={x:160,y:193},cakePosition={x:154,y:236},keyPosition={x:460,y:280};let speechSerial=0;let entered=false,resolveNarration=null;const recordedAudio=$('narrationAudio');let phase=0, signHits=0, lockHits=0, musicHits=0, recordFound=false;
let gloveOwned=false, recordOwned=false, selected=null, danceIndex=0, playing=false;
let ending=null;
let dodgeCount=0,boxOffset=0,boxVisualOffset=0,raccoonDeals=0,gentleMode=false,hintLevel=0,snoopClicks=0,litPad=-1,keyDropTime=-100,sceneStarted=0;
const reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false;
const storyBeats=[
 ['THE COVER-UP','Someone hid your birthday present. The sign looks nervous.'],
 ['EXHIBIT A','No tools? A loose sign counts as a tool.'],
 ['SECURITY LEVEL: CARLOS','An unbreakable lock. A boxer with something to prove.'],
 ['EVIDENCE: SIDE A','Your party playlist has apparently been classified.'],
 ['THE DANCE ALIBI','Prove this is your party. Copy the five flashes.'],
 ['AN INSIDE JOB','The narrator hired a raccoon. The raccoon prefers payment in cake.'],
 ['CASE CLOSED','The party was waiting for you the whole time.'],
 ['FROM YOUR FRIEND','One last thing. This part is actually for you.']
];
function react(text){$('reaction').textContent=text;queueSave();}
function updateStory(){const beat=storyBeats[phase];$('storyAct').textContent=beat[0];$('storyObjective').textContent=phase===5&&keyUnlocked?'The guard has been bribed. The lock is open. Go get your birthday.':beat[1];}
function positionBox(){ $('box').style.left=(32+boxOffset/6.4)+'%'; }
function highlightTargets(item=selected){
 const targets={sign:phase===1?'glove':null,glove:phase===2?'box':null,record:phase===3?'player':null,cake:phase===5&&!keyDropped?'raccoon':null,key:phase===5&&!keyUnlocked?'box':null};
 for(const id of ['glove','box','player','raccoon'])$(id).classList.toggle('drop-ready',targets[item]===id);
}

let epoch=0, clock=0, last=0, hitUntil=0, confetti=[], voiceEnabled=true, audio;
function visible(id, yes){ $(id).classList.toggle('hidden', !yes); }
function later(fn, ms){const version=epoch;setTimeout(()=>{if(version===epoch)fn();},ms);}
function stopNarration(){speechSerial++;recordedAudio.pause();if(resolveNarration){resolveNarration();resolveNarration=null;}$('audioState').textContent='';}
function say(line){
  queueSave();
  $('caption').textContent=line;stopNarration();
  if(!voiceEnabled||!entered)return Promise.resolve();
  const source=window.NARRATION?.[line.toLowerCase()];
  if(!source){console.warn('No recorded narration for:',line);return Promise.resolve();}
  const speechId=++speechSerial;recordedAudio.src=source;
  return new Promise(resolve=>{resolveNarration=resolve;
    recordedAudio.onended=()=>{if(speechId===speechSerial)stopNarration();};
    recordedAudio.onerror=()=>{if(speechId===speechSerial){stopNarration();$('audioState').textContent='CAPTIONS ON';}};
    recordedAudio.play().catch(()=>{if(speechId===speechSerial){stopNarration();$('audioState').textContent='TAP REPLAY';}});
  });
}
recordedAudio.addEventListener('timeupdate',()=>{if(voiceEnabled&&!recordedAudio.paused)$('audioState').textContent='SPEAKING '+Math.floor(recordedAudio.currentTime)+'s';});
recordedAudio.addEventListener('playing',()=>{if(voiceEnabled&&!recordedAudio.paused)$('audioState').textContent='SPEAKING';});
function enter(withSound){entered=true;voiceEnabled=withSound;$('voice').textContent=withSound?'VOICE ON':'VOICE OFF';$('voice').setAttribute('aria-pressed',String(withSound));visible('audioGate',false);say($('caption').textContent);}
$('enterSound').onclick=()=>enter(true);$('enterSilent').onclick=()=>enter(false);
$('replay').onclick=()=>{if(entered)say($('caption').textContent);};
function tone(freq=220, length=.09){
  if(!voiceEnabled)return;
  try{audio ||= new(window.AudioContext||window.webkitAudioContext)();audio.resume();
    const o=audio.createOscillator(), g=audio.createGain();o.type='triangle';o.frequency.value=freq;
    g.gain.setValueAtTime(.07,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+length);
    o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+length);
  }catch{}
}
function showPhase(n){
  hintLevel=0;visible('helpPanel',false);$('reaction').textContent='';boxOffset=0;positionBox();
  phase=n;sceneStarted=clock;sceneObjects.forEach(id=>visible(id,false));$('chapter').textContent=chapters[n];
  if(n===0)visible('opening',true);
  visible('snoop',n>=1&&n<=3);
  if(n===1){visible('glove',true);visible('fallen',true);}
  if(n===2){visible('box',true);$('boxLabel').textContent='DO NOT TOUCH';}
  if(n===3){visible('silence',musicHits<3);visible('record',recordFound&&!recordOwned);visible('player',true);}
  if(n===4)visible('dance',true);
  if(n===5){visible('box',true);visible('raccoon',true);visible('cake',!cakeOwned&&!keyDropped);visible('key',keyDropped&&!keyOwned&&!keyUnlocked);visible('finalOpen',keyUnlocked);$('boxLabel').textContent=keyUnlocked?'':'LOCKED';$('chapter').textContent=keyUnlocked?chapters[5]:'THE RACCOON HAS OTHER PLANS';}
  if(n===6)visible('birthday',true);
  if(n===7)visible('letter',true);
  updateStory();refreshPockets();
}
function refreshPockets(){
  queueSave();highlightTargets();updateStory();
  visible('itemGlove',gloveOwned && phase<6);visible('itemRecord',recordOwned && phase===3);
  visible('itemCake',cakeOwned&&phase===5&&!keyDropped);visible('itemKey',keyOwned&&phase===5&&!keyUnlocked);visible('empty',!(gloveOwned&&phase<6)&&!(recordOwned&&phase===3)&&!(cakeOwned&&phase===5&&!keyDropped)&&!(keyOwned&&phase===5&&!keyUnlocked));$('itemCake').classList.toggle('selected',selected==='cake');$('itemKey').classList.toggle('selected',selected==='key');
  $('itemGlove').classList.toggle('selected',selected==='glove');
  $('itemRecord').classList.toggle('selected',selected==='record');$('fallen').classList.toggle('selected',selected==='sign');
  $('held').textContent=selected ? `holding: ${selected==='glove'?'glove':selected==='sign'?'NOT sign':selected==='cake'?'cake':selected==='key'?'key':'record'}` : '';
}
function loosenSign(){
  if(!entered||phase!==0||signHits>=10)return;
  signHits++;react(['Still attached. Obviously.','Those bolts are starting to look optional.','Okay, yes. It is getting looser.'][Math.min(2,Math.floor(signHits/4))]+' '+Math.min(signHits,10)+'/10');tone(130+signHits*35);$('denial').classList.remove('shake');void $('denial').offsetWidth;$('denial').classList.add('shake');
  const lines=['Carlos. I said leave it alone.','That sign is structural. Probably.','You’re really going to keep doing that?','Fine. One more click and the whole thing falls apart.'];
  if(signHits<10){const i={1:0,3:1,6:2,9:3}[signHits];if(i!==undefined)say(lines[i]);}
  else{
    $('denial').classList.remove('shake');$('denial').classList.add('fall');
    later(()=>{showPhase(1);say('Excellent. You broke the sign. And uncovered a boxing glove. Which is decorative. Do not pick it up.');},650);
  }
}
function collectGlove(){if(phase!==1)return;if(selected!=='sign'){react('Bare hands? Try bringing something from the floor.');say('That sign is structural. Probably.');return;}playEffect('glass');gloveOwned=true;selected='glove';showPhase(2);say('Oh. A present. How embarrassing. That lock is unbreakable, Carlos. I checked. With science.');tone(440);}
function selectItem(item){selected=selected===item?null:item;refreshPockets();tone(200);}
function inspectBox(){
  if(phase===5){if(keyUnlocked){openGift();return;}if(selected==='key'&&keyOwned){keyUnlocked=true;selected=null;visible('key',false);visible('finalOpen',true);$('boxLabel').textContent='';$('chapter').textContent=chapters[5];refreshPockets();react('The narrator is out of excuses. Open it.');playEffect('glass');say('You earned it. Open the box anyway.');}else{$('raccoonBubble').textContent=keyDropped?'there. take it.':'cake?';}return;}
  if(phase!==2)return;
  if(selected!=='glove'){say('A lock. Very secure. Definitely don’t select that boxing glove from your pockets and try it here.');return;}
  if(!gentleMode&&dodgeCount<2){dodgeCount++;boxOffset=dodgeCount===1?72:-72;positionBox();react(dodgeCount===1?'Missed. The present has footwork.':'Fine. It is out of moves. The next punch lands.');tone(150,.08);queueSave();return;}
  boxOffset=0;positionBox();lockHits++;react('A very unbreakable lock: '+lockHits+'/6 punches.');playEffect('punch');hitUntil=clock+.16;tone(80+lockHits*20);
  const lines=['A punch? Really?','That was a fluke.','I’m sure the next one will do nothing.','You’ve been training, haven’t you?','Carlos. Please stop being good at boxing.'];
  if(lockHits<6){say(lines[lockHits-1]);$('boxLabel').textContent='CRACK…';}
  else{selected=null;showPhase(3);say('You broke it. But this present has a second security system: absolutely no music. Carlos cannot be trusted near a dance floor.');}
}
function loosenMusic(){
  if(phase!==3||recordFound)return;musicHits++;$('silence').style.transform='rotate('+(musicHits===1?-9:7)+'deg)';react(musicHits<3?'That sounded suspiciously like a record behind the sign.':'Evidence recovered. That is definitely your playlist.');tone(180+musicHits*70);
  if(musicHits<3)say(musicHits===1?'There is no record behind that sign.':'You’re not buying any of this, are you?');
  else{recordFound=true;visible('silence',false);visible('record',true);say('That is NOT your party playlist. Put it down. And leave that record player alone.');}
}
function collectRecord(){if(phase!==3||!recordFound||recordOwned)return;recordOwned=true;selected='record';visible('record',false);refreshPockets();say('Great. Now you have music. Whatever you do, don’t put it on the turntable.');tone(440);}
function usePlayer(){
  if(phase!==3)return;
  if(selected!=='record'||!recordOwned){say('The player is empty. That’s how I like my dance floors: completely silent.');return;}
  selected=null;showPhase(4);playing=true;$('danceStatus').textContent='LISTEN TO THE NARRATOR.';const version=epoch;say('Oh no. A dance floor. Watch the five flashes. If you copy them, the last lock opens. You wouldn’t do that to me, would you?').then(()=>{if(phase===4&&epoch===version)startDanceWhenQuiet(version);});
}
function playPattern(){
  if(phase!==4||playing)return;if(voiceEnabled&&resolveNarration){playing=true;$('danceStatus').textContent='LISTEN TO THE NARRATOR.';startDanceWhenQuiet(epoch);return;}playing=true;danceIndex=0;$('danceStatus').textContent='WATCH THE FIVE FLASHES.';
  pattern.forEach((number,i)=>later(()=>flashPad(number),i*650+400));
  later(()=>{playing=false;$('danceStatus').textContent='YOUR TURN.';},pattern.length*650+500);
}
function flashPad(number){litPad=number;pads[number].classList.add('lit');tone([262,330,392,440][number],.25);later(()=>{pads[number].classList.remove('lit');if(litPad===number)litPad=-1;},350);}
function hitPad(number){
  if(phase!==4||playing)return;
  flashPad(number);
  if(number!==pattern[danceIndex]){danceIndex=0;react('No lives lost. The narrator is just being dramatic.');$('danceStatus').textContent='TRY AGAIN. YOU HAVE THIS.';say('Wrong beat. The box is still locked. Unfortunately for me, you can listen again as often as you like.');return;}
  danceIndex++;$('danceStatus').textContent=`${danceIndex} / 5`;
  if(danceIndex===pattern.length){showPhase(5);say('Okay. You boxed. You danced. You won. But that present is empty. Definitely empty. Please don’t make me say it again.');}
}
function openGift(){
  if(phase!==5||!keyUnlocked)return;
  showPhase(6);selected=null;
  for(let i=0;i<120;i++)confetti.push({x:Math.random()*640,y:-Math.random()*300,v:35+Math.random()*80,color:['#f3ce84','#de94b0','#9dc9b3','#acb9db'][i%4]});
  say('SURPRISE, CARLOS! Of course it’s your present. Happy birthday. I was just making sure you were finally strong enough to get it.');
  [392,440,523,659,523,784].forEach((n,i)=>later(()=>tone(n,.2),i*180));
}
function finish(forgiven){
  ending=forgiven?'forgive':'roast';
  say(forgiven?'Okay. Friends again. Happy birthday, Carlos. Now go have a good one.':'Fair. I earned that. Happy birthday anyway, Carlos. You still get the present.');
  $('letter').querySelector('h2').textContent=forgiven?'friends again. ♡':'fair enough. ♡';
  $('forgive').disabled=true;$('roast').disabled=true;
}
const hints=[
  'That crooked NOT sign looks loose. Keep clicking it.',
  'Select the fallen NOT sign, then tap the glass case. You can also drag the sign onto it.',
  'Select the boxing glove in your pockets, then punch the box six times.',
  'The NO MUSIC sign is hiding something. Click it three times.',
  'The pattern is 1, 3, 2, 1, 4. You can replay it with LISTEN AGAIN.',
  'Tempt the raccoon with the cake, then use the key on the lock.',
  'The present has a note for you. Open it.',
  'This is the birthday note. You can forgive the narrator, or give him a hard time.'
];
$('fallen').onclick=()=>selectItem('sign');$('fallen').draggable=true;$('fallen').ondragstart=e=>{selected='sign';refreshPockets();e.dataTransfer.setData('text/plain','sign');};$('glove').ondragover=e=>e.preventDefault();$('glove').ondrop=e=>{e.preventDefault();if(e.dataTransfer.getData('text/plain')==='sign'){selected='sign';collectGlove();}};
$('denial').onclick=loosenSign;$('glove').onclick=collectGlove;$('box').onclick=inspectBox;
$('silence').onclick=loosenMusic;$('record').onclick=collectRecord;$('player').onclick=usePlayer;
$('itemGlove').onclick=()=>selectItem('glove');$('itemRecord').onclick=()=>selectItem('record');
$('listen').onclick=playPattern;pads.forEach((p,i)=>p.onclick=()=>hitPad(i));
$('finalOpen').onclick=openGift;$('letterOpen').onclick=()=>{showPhase(7);say('I’m going to stop talking for a second. This bit is from your friend.');};
$('forgive').onclick=()=>finish(true);$('roast').onclick=()=>finish(false);
const clueSteps=[
 ['The narrator is very protective of one particular word.','Try the crooked NOT sign. It can take more than one click.'],
 ['Something on the floor might be useful.','Pick up the fallen sign. That glass case looks breakable.'],
 ['The lock is less secure than advertised.','Use your glove. The box only dodges twice, then six punches break the lock.'],
 ['Why ban music at a birthday party?','Keep bothering the NO MUSIC sign. Then bring what you find to the turntable.'],
 ['Watch the pads, not the narrator.','It is five flashes. Wrong notes cost nothing. You can listen again.'],
 ['Your security guard seems distracted.','Try paying the raccoon in cake. He may need a second offer. Then look for the key.'],
 ['The cover-up is getting hard to maintain.','Open the present. You have earned it.'],
 ['There is no wrong choice here.','Forgive the narrator or give him a hard time. Both are birthday endings.']
];
function renderHint(){
 $('helpText').textContent=hintLevel<2?clueSteps[phase][hintLevel]:phase===3&&recordFound?'Pick up the record and drag it onto the turntable.':phase===5?(keyUnlocked?'Open the present.':keyDropped?'Pick up the key and use it on the present.':'Select the cake, offer it to the raccoon twice, then take his key.'):hints[phase];
 $('nextHint').textContent=hintLevel<2?'ANOTHER CLUE':'SOLUTION SHOWN';$('nextHint').disabled=hintLevel>=2;
}
$('hint').onclick=()=>{visible('helpPanel',true);renderHint();};
$('nextHint').onclick=()=>{hintLevel=Math.min(2,hintLevel+1);renderHint();};
$('closeHelp').onclick=()=>{visible('helpPanel',false);$('hint').focus?.();};
$('gentle').onclick=()=>{gentleMode=!gentleMode;$('gentle').setAttribute('aria-pressed',String(gentleMode));$('gentle').textContent=gentleMode?'MISCHIEF: LOW':'LESS MISCHIEF';if(gentleMode){boxOffset=0;positionBox();}react(gentleMode?'Okay. The props will behave. Mostly.':'The props have been given terrible ideas again.');queueSave();};
$('snoop').onclick=()=>{react(['The raccoon is definitely on somebody’s payroll.','He is carrying a key. And pretending very hard not to.','He points at a cake-shaped space on his invoice.'][Math.min(snoopClicks++,2)]);playEffect('raccoon');};
$('voice').onclick=()=>{voiceEnabled=!voiceEnabled;$('voice').textContent=voiceEnabled?'VOICE ON':'VOICE OFF';$('voice').setAttribute('aria-pressed',String(voiceEnabled));if(!voiceEnabled)stopNarration();else if(entered)say($('caption').textContent);};
$('restart').onclick=()=>{
  dodgeCount=raccoonDeals=snoopClicks=0;boxOffset=boxVisualOffset=0;litPad=-1;keyDropTime=-100;positionBox();
  ending=null;try{localStorage.removeItem(SAVE_KEY);}catch{}
  stopNarration();cakeOwned=keyOwned=keyDropped=keyUnlocked=false;resetMovables();epoch++;phase=signHits=lockHits=musicHits=danceIndex=0;recordFound=gloveOwned=recordOwned=playing=false;selected=null;confetti=[];
  $('silence').style.transform='';$('denial').classList.remove('fall','shake');pads.forEach(p=>p.classList.remove('lit'));
  $('forgive').disabled=$('roast').disabled=false;$('letter').querySelector('h2').textContent='you earned this.';
  showPhase(0);say('Carlos. Before you start clicking things: this is NOT your present. Especially that crooked sign. Leave it alone.');
};
// Every drag puzzle also works by selecting the item, then tapping its destination.
for(const[id,item]of[['itemGlove','glove'],['itemRecord','record']]){
  $(id).draggable=true;$(id).ondragstart=e=>{selected=item;refreshPockets();e.dataTransfer.setData('text/plain',item);};
}
for(const[id,action]of[['box',inspectBox],['player',usePlayer]]){
  $(id).ondragover=e=>e.preventDefault();$(id).ondrop=e=>{e.preventDefault();const item=e.dataTransfer.getData('text/plain');if((item==='glove'&&gloveOwned)||(item==='record'&&recordOwned)){selected=item;refreshPockets();action();}};
}
// Draw at the screen's actual resolution, with every rectangle snapped to a device pixel.
function resizeArt(){
  const bounds=canvas.getBoundingClientRect(),ratio=window.devicePixelRatio||1;
  const width=Math.max(1,Math.round(bounds.width*ratio)),height=Math.max(1,Math.round(bounds.height*ratio));
  if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;ctx.imageSmoothingEnabled=false;}
}
function spriteFrame(x,y,scale=1){
  const m=ctx.getTransform(),unit=Math.max(1,Math.round(Math.sqrt(Math.abs(m.a*m.d))*scale));
  ctx.setTransform(unit,0,0,unit,Math.round(m.a*x+m.e),Math.round(m.d*y+m.f));
}
function r(x,y,w,h,color){
  const m=ctx.getTransform(),left=Math.round(m.a*x+m.e),top=Math.round(m.d*y+m.f);
  const right=Math.round(m.a*(x+w)+m.e),bottom=Math.round(m.d*(y+h)+m.f);
  ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle=color;ctx.fillRect(left,top,right-left,bottom-top);ctx.restore();
}
function pixelText(t,x,y,size=9,color='#e5cfa8'){ctx.save();spriteFrame(x,y);ctx.fillStyle=color;ctx.textAlign='center';ctx.font=`${size}px Arcade,monospace`;ctx.fillText(t,0,0);ctx.restore();}
function present(x,y,scale=1,locked=true){
  ctx.save();spriteFrame(x,y,scale);
  r(-34,35,74,6,'#100c1d70');r(-31,-10,63,45,'#522d46');r(-28,-8,57,40,'#b76081');r(-28,-8,9,40,'#d68aa0');r(18,-8,11,40,'#974867');
  r(-33,-19,67,14,'#602f4a');r(-30,-17,61,10,'#d78199');r(-3,-19,10,51,'#edc584');r(-28,6,56,7,'#edc584');
  r(-19,-32,15,13,'#7b4c55');r(-17,-30,11,9,'#edc584');r(8,-32,15,13,'#7b4c55');r(10,-30,11,9,'#edc584');r(-3,-30,10,12,'#ffe1a0');
  if(!reducedMotion)ctx.translate(0,Math.round(Math.sin(clock*2)));
  if(locked){r(-8,7,20,15,'#3d354c');r(-5,2,14,8,'#b2a3bd');r(-2,5,8,5,'#4d3a55');r(-6,9,16,10,'#c4b0b1');r(0,12,4,5,'#56405b');if(lockHits>0)for(let i=0;i<Math.min(lockHits,5);i++)r(-8+i*5,8+i%3*4,3,3,'#5d3d57');}
  ctx.restore();
}
function gloveArt(x,y,s=1){ctx.save();spriteFrame(x,y,s);r(-19,-20,30,5,'#3c263e');r(-23,-15,38,24,'#3c263e');r(-20,-15,33,20,'#c96777');r(-17,-15,24,5,'#ed9aa0');r(-20,-10,5,12,'#e38892');r(9,-7,10,16,'#893e61');r(12,-5,4,11,'#d37886');r(-16,6,29,10,'#552f4c');r(-13,8,23,6,'#f0c989');r(-10,9,17,2,'#ffe4b1');ctx.restore();}
function recordArt(x,y,s=1){ctx.save();spriteFrame(x,y,s);for(const[a,b,w,h]of[[-19,-12,38,24],[-12,-19,24,38],[-16,-16,32,32]])r(a,b,w,h,'#0c1021');r(-16,-10,3,20,'#47415d');r(-10,-16,20,3,'#47415d');r(-8,-8,16,16,'#b46d89');r(-5,-5,10,10,'#e2b597');r(-1,-1,3,3,'#151329');const spin=reducedMotion?0:clock*2;r(Math.round(Math.cos(spin)*13),Math.round(Math.sin(spin)*13),3,3,'#b5a1b7');ctx.restore();}
function turntable(){ctx.save();spriteFrame(454,207);ctx.translate(-454,-207);r(369,232,173,12,'#111020');r(371,168,166,63,'#785466');r(371,168,166,9,'#b08787');r(377,183,153,37,'#45354e');r(386,185,83,30,'#25223b');r(412,188,31,22,'#727083');r(416,184,23,30,'#727083');r(416,188,23,22,'#8c8794');r(426,198,3,3,'#d4c1bc');r(483,181,5,30,'#dbbaa2');r(483,207,21,4,'#dbbaa2');r(499,200,5,10,'#9c7993');r(509,190,12,7,'#e6bf7f');r(508,210,14,4,'#9dc8b3');r(386,232,8,15,'#4a3449');r(516,232,8,15,'#4a3449');ctx.restore();}
function carlos(x,y,s=1,dance=false){ctx.save();spriteFrame(x,y,s);const t=dance&&!reducedMotion?Math.round(Math.sin(clock*7)):0;ctx.translate(0,t*2);r(-17,34,36,4,'#110e2344');r(-10,16,8,17+t*3,'#2e3c58');r(3,16,8,17-t*3,'#2e3c58');r(-9,17,3,14,'#52778a');r(4,17,3,14,'#52778a');r(-13,31+t*3,12,5,'#ede0b7');r(2,31-t*3,12,5,'#ede0b7');r(-14,-4,28,22,'#253746');r(-12,-3,24,21,'#6ab7a3');r(-10,-1,5,18,'#9fd6b6');r(7,0,5,17,'#458979');r(-12,15,24,4,'#edd49a');r(-11,-22,23,20,'#634552');r(-9,-20,19,17,'#cb9576');r(-8,-18,4,12,'#e7b792');r(6,-14,4,9,'#ac705e');r(-11,-24,23,8,'#322638');r(-7,-27,15,5,'#322638');r(-7,-23,13,3,'#4e3746');r(-11,-17,3,5,'#322638');r(9,-17,3,5,'#322638');const eye=!reducedMotion&&Math.floor(clock*3)%13===0?1:3;r(-5,-12,3,eye,'#382635');r(4,-12,3,eye,'#382635');r(-4,-6,7,2,'#edd4b3');r(-17,-2-t*7,6,18,'#dba482');r(13,-2+t*7,6,18,'#bb8069');if(!dance){gloveArt(-19,3,.38);gloveArt(20,3,.38)}ctx.restore();}
function room(){
  r(0,0,640,360,'#211f34');r(0,290,640,70,'#2d273f');r(0,289,640,3,'#514056');
  for(let i=0;i<12;i++){r(i*60,302,1,58,'#3b304b');r(i*60+18,338,33,1,'#3f324d');}
  r(16,18,608,2,'#59415b');r(16,20,2,260,'#493b53');r(622,20,2,260,'#493b53');
  for(let i=0;i<9;i++){const x=35+i*70;r(x,18,3,12,'#b88b85');r(x-4,31,11,5,'#f3c787');r(x-1,32,4,3,'#ffe3af');}
  r(16,18,33,74,'#583248');r(16,18,11,86,'#77485a');r(27,19,9,76,'#925969');r(38,19,8,69,'#3d293e');
  r(592,18,32,74,'#583248');r(611,18,11,86,'#77485a');r(601,19,9,76,'#925969');r(592,19,8,69,'#3d293e');
}
function draw(){
  ctx.setTransform(canvas.width/640,0,0,canvas.height/360,0,0);
  if(phase===0){r(0,0,640,360,'#06080d');}else room();
  if(phase===1){ctx.save();spriteFrame(474,230);ctx.translate(-474,-230);r(422,169,105,122,'#293846');r(425,172,99,114,'#6794a166');r(428,175,3,100,'#cce4e0');r(430,278,92,8,'#56687c');gloveArt(474,226+(reducedMotion?0:Math.round(Math.sin(clock*2)*2)),1.8);r(456,290,70,4,'#131124');ctx.restore();pixelText('HMM.',320,138,12,'#c8b3ca');}
  if(phase>=1&&phase<=3){const peek=reducedMotion?1:Math.min(1,(clock-sceneStarted)/.65);raccoonArt(66-90*(1-peek)*(1-peek),268,.7,false);}
  if(phase===2||phase===5){ctx.save();if(!reducedMotion&&clock<hitUntil)ctx.translate(Math.sin(clock*90)*5,0);present(320+boxVisualOffset,209,2.3,phase===2||(phase===5&&!keyUnlocked));ctx.restore();if(phase===5){raccoonArt(512,224,1.5,keyDropped);if(!cakeOwned&&!keyDropped)cakeArt(cakePosition.x,cakePosition.y,1.5);if(keyDropped&&!keyOwned&&!keyUnlocked){const flight=reducedMotion?1:Math.min(1,(clock-keyDropTime)/.45);keyArt(512+(keyPosition.x-512)*flight,224+(keyPosition.y-224)*flight-25*Math.sin(flight*Math.PI),1.5);}}}
  if(phase===3){turntable();if(recordFound&&!recordOwned)recordArt(recordPosition.x,recordPosition.y,1.7);r(76,261,122,10,'#785265');r(84,271,8,39,'#4b354b');r(181,271,8,39,'#4b354b');pixelText('SIDE A',452,157,8,'#b397b0');}
  if(phase===4){for(let i=0;i<10;i++)for(let j=0;j<3;j++)r(i*64,255+j*35,64,35,litPad>=0&&i%4===litPad?['#6787a8','#a95f83','#b69a59','#608c7f'][litPad]:(i+j)%2?'#4a3b59':'#353044');carlos(70,242,1.6,true);carlos(568,242,1.6,true);}
  if(phase>=6){
    for(let i=0;i<12;i++){ctx.fillStyle=['#d58ea6','#b7c9a2','#e4c183'][i%3];ctx.beginPath();ctx.moveTo(55+i*44,53);ctx.lineTo(79+i*44,53);ctx.lineTo(67+i*44,72);ctx.fill();}
    for(let i=0;i<6;i++){const x=70+i*100,y=170+(reducedMotion?0:Math.sin(clock*2+i)*4);r(x,y+14,1,91,'#9a799f');ctx.fillStyle=['#de93aa','#b1cdb4','#e2c386'][i%3];ctx.beginPath();ctx.ellipse(x,y,13,17,0,0,Math.PI*2);ctx.fill();r(x-5,y-10,3,6,'#ffffff60');}
    carlos(104,272,1.65,true);carlos(536,272,1.65,true);raccoonArt(430,292,.8,true);present(320,282,1.3,false);
  }
  if(clock<hitUntil){for(let i=0;i<5;i++)spark(260+i*30,165+(i%2)*80,1+i%2);}
  for(const p of confetti)r(p.x,p.y,3,5,p.color);
}
function spark(x,y,s=1){r(x-3*s,y,7*s,s,'#ffe2a0');r(x,y-3*s,s,7*s,'#ffe2a0');}
function loop(stamp){const dt=last?Math.min((stamp-last)/1000,.05):0;last=stamp;clock+=dt;boxVisualOffset=reducedMotion?boxOffset:boxVisualOffset+(boxOffset-boxVisualOffset)*Math.min(1,dt*14);if(!reducedMotion)confetti.forEach(p=>{p.y+=p.v*dt;p.x+=Math.sin(clock+p.v)*dt*12;if(p.y>370)p.y=-20;});draw();requestAnimationFrame(loop);}
showPhase(0);requestAnimationFrame(loop);

function playEffect(name){if(!voiceEnabled)return;const effect=new Audio('assets/audio/'+name+'.wav');effect.volume=.35;effect.play().catch(()=>{});}

function takeCake(){if(phase!==5||keyDropped)return;cakeOwned=true;selected='cake';visible('cake',false);refreshPockets();$('raccoonBubble').textContent='is that for me?';tone(392);}
function feedRaccoon(){if(phase!==5)return;if(selected!=='cake'||!cakeOwned){$('raccoonBubble').textContent=keyDropped?'thanks, carlos.':'cake?';tone(500,.06);return;}if(!gentleMode&&raccoonDeals<1){raccoonDeals++;$('raccoonBubble').textContent='hmm. ask nicely.';react('He is negotiating. You still have the cake. Offer it once more.');queueSave();return;}keyDropped=true;keyDropTime=clock;cakeOwned=false;selected=null;visible('cake',false);visible('key',true);$('raccoonBubble').textContent='fair trade.';react('Security has accepted a bribe. Take the key.');refreshPockets();playEffect('raccoon');tone(660,.15);}
function takeKey(){if(phase!==5||!keyDropped||keyUnlocked)return;keyOwned=true;selected='key';visible('key',false);refreshPockets();$('raccoonBubble').textContent='all yours.';react('The key is yours. Try the lock.');tone(440);}
$('cake').onclick=takeCake;$('raccoon').onclick=feedRaccoon;$('key').onclick=takeKey;
$('itemCake').onclick=()=>selectItem('cake');$('itemKey').onclick=()=>selectItem('key');
function raccoonArt(x,y,s=1,fed=false){ctx.save();spriteFrame(x,y,s);if(!reducedMotion)ctx.translate(0,Math.round(Math.sin(clock*3))); r(-30,24,76,5,'#080b1644');for(let i=0;i<5;i++){r(24+i*5,9-i*3+(reducedMotion?0:Math.round(Math.sin(clock*3+i*.4)*2)),9,13,i%2?'#4f4e62':'#b6b1b9');}r(-19,-5,39,32,'#565969');r(-16,-5,30,30,'#a7adb1');r(-13,0,25,25,'#c9c9bf');r(-18,22,11,8,'#454755');r(6,22,11,8,'#454755');r(-22,-26,11,14,'#444652');r(11,-26,11,14,'#444652');r(-19,-23,5,9,'#b98799');r(14,-23,5,9,'#b98799');r(-23,-19,47,21,'#626574');r(-20,-17,41,19,'#b8b9b6');r(-21,-13,17,9,'#42454f');r(5,-13,17,9,'#42454f');const eyes=!reducedMotion&&Math.floor(clock*3)%11===0?1:4;r(-12,-10,4,eyes,'#eadcc0');r(11,-10,4,eyes,'#eadcc0');r(-7,-7,15,10,'#e0d5c2');r(-3,-5,7,4,'#45414c');r(-22,1,7,17,'#7b818c');r(16,1,7,17,'#7b818c');if(!fed)keyArt(-7,7,.5);else{r(-6,6,13,reducedMotion?11:10+Math.round(Math.sin(clock*10)),'#e5b280');r(-6,3,13,4,'#ead5b4');}ctx.restore();}
function cakeArt(x,y,s=1){ctx.save();spriteFrame(x,y,s);r(-18,16,40,4,'#302638');r(-18,-9,40,25,'#955879');r(-15,-8,34,22,'#cb829d');r(-15,2,34,5,'#e7c29c');r(-20,-14,42,9,'#f2dfb8');r(-12,-5,5,8,'#f2dfb8');r(11,-5,5,6,'#f2dfb8');r(-3,-22,6,8,'#ad687c');r(-2+(reducedMotion?0:Math.round(Math.sin(clock*9))),-27,4,6,'#f0c887');ctx.restore();}
function keyArt(x,y,s=1){ctx.save();spriteFrame(x,y,s);r(-15,-7,14,14,'#946746');r(-13,-6,10,12,'#eaca7f');r(-10,-3,4,5,'#342739');r(-4,-2,22,5,'#eaca7f');r(12,2,5,7,'#eaca7f');r(5,1,4,5,'#bc8d51');ctx.restore();}
function inside(id,e){const b=$(id).getBoundingClientRect();return e.clientX>=b.left&&e.clientX<=b.right&&e.clientY>=b.top&&e.clientY<=b.bottom;}
function resetMovables(){recordPosition={x:160,y:193};cakePosition={x:154,y:236};keyPosition={x:460,y:280};for(const[id,left,top]of[['fallen',23,76],['record',15,40],['cake',14,55],['key',65,68]]){$(id).style.left=left+'%';$(id).style.top=top+'%';}}
function movable(id,item){const el=$(id);el.draggable=false;let drag=null;
 el.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();const stage=$('stage').getBoundingClientRect(),b=el.getBoundingClientRect();drag={x:e.clientX,y:e.clientY,left:(b.left-stage.left)/stage.width*100,top:(b.top-stage.top)/stage.height*100,w:b.width/stage.width*100,h:b.height/stage.height*100,moved:false,stage};el.setPointerCapture(e.pointerId);highlightTargets(item);el.classList.add('dragging');});
 el.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>5)drag.moved=true;if(!drag.moved)return;const left=Math.max(0,Math.min(100-drag.w,drag.left+dx/drag.stage.width*100)),top=Math.max(15,Math.min(100-drag.h,drag.top+dy/drag.stage.height*100));el.style.left=left+'%';el.style.top=top+'%';const p={x:(left+drag.w/2)*6.4,y:(top+drag.h/2)*3.6};if(item==='record')recordPosition=p;if(item==='cake')cakePosition=p;if(item==='key')keyPosition=p;});
 el.addEventListener('pointerup',e=>{if(!drag)return;const moved=drag.moved;drag=null;el.classList.remove('dragging');highlightTargets();if(!moved){el.onclick?.(e);return;}selected=item==='sign'?item:null;refreshPockets();if(item==='sign'&&phase===1&&inside('glove',e))collectGlove();if(item==='record'&&phase===3&&inside('player',e)){collectRecord();usePlayer();}if(item==='cake'&&phase===5&&inside('raccoon',e)){takeCake();feedRaccoon();}if(item==='key'&&phase===5&&inside('box',e)){takeKey();inspectBox();}});
 el.addEventListener('pointercancel',()=>{drag=null;el.classList.remove('dragging');highlightTargets();});el.addEventListener('click',e=>{if(e.detail>0){e.preventDefault();e.stopImmediatePropagation();}},true);
}
movable('fallen','sign');movable('record','record');movable('cake','cake');movable('key','key');
for(const[id,item]of[['itemCake','cake'],['itemKey','key']]){$(id).draggable=true;$(id).ondragstart=e=>{selected=item;refreshPockets();e.dataTransfer.setData('text/plain',item);};}
$('raccoon').ondragover=e=>e.preventDefault();$('raccoon').ondrop=e=>{e.preventDefault();if(e.dataTransfer.getData('text/plain')==='cake'&&cakeOwned){selected='cake';feedRaccoon();}};
const oldBoxDrop=$('box').ondrop;$('box').ondrop=e=>{if(e.dataTransfer.getData('text/plain')==='key'&&keyOwned){e.preventDefault();selected='key';inspectBox();}else oldBoxDrop(e);};

function startDanceWhenQuiet(version){if(phase!==4||epoch!==version)return;if(voiceEnabled&&resolveNarration){later(()=>startDanceWhenQuiet(version),180);return;}playing=false;playPattern();}


// Save puzzle state, not timers or audio; refreshing must never strand a puzzle.
const SAVE_KEY='carlos-birthday-progress-v1';
function queueSave(){Promise.resolve().then(saveProgress);}
function saveProgress(){
  if(!entered)return;
  try{
    const props={};
    for(const id of ['fallen','record','cake','key'])props[id]={left:$(id).style.left,top:$(id).style.top};
    localStorage.setItem(SAVE_KEY,JSON.stringify({version:1,dodgeCount,raccoonDeals,gentleMode,phase,signHits,lockHits,musicHits,recordFound,gloveOwned,recordOwned,cakeOwned,keyOwned,keyDropped,keyUnlocked,selected,danceIndex,playing,voiceEnabled,ending,caption:$('caption').textContent,reaction:$('reaction').textContent,bubble:$('raccoonBubble').textContent,recordPosition,cakePosition,keyPosition,props}));
  }catch{} // The game remains playable when browser storage is unavailable.
}
function restoreProgress(){
  try{
    const saved=JSON.parse(localStorage.getItem(SAVE_KEY));
    if(!saved||saved.version!==1||!Number.isInteger(saved.phase)||saved.phase<0||saved.phase>7)return;
    const count=(value,max)=>Number.isInteger(value)&&value>=0&&value<=max?value:0;
    dodgeCount=count(saved.dodgeCount,2);raccoonDeals=count(saved.raccoonDeals,1);gentleMode=saved.gentleMode===true;
    signHits=count(saved.signHits,10);lockHits=count(saved.lockHits,6);musicHits=count(saved.musicHits,3);danceIndex=count(saved.danceIndex,4);
    recordFound=saved.recordFound===true;gloveOwned=saved.gloveOwned===true;recordOwned=saved.recordOwned===true;
    cakeOwned=saved.cakeOwned===true;keyOwned=saved.keyOwned===true;keyDropped=saved.keyDropped===true;keyUnlocked=saved.keyUnlocked===true;
    selected=(saved.selected==='sign'&&saved.phase===1)||(saved.selected==='glove'&&gloveOwned)||(saved.selected==='record'&&recordOwned)||(saved.selected==='cake'&&cakeOwned)||(saved.selected==='key'&&keyOwned)?saved.selected:null;
    voiceEnabled=saved.voiceEnabled!==false;entered=true;ending=['forgive','roast'].includes(saved.ending)?saved.ending:null;
    resetMovables();
    const point=(p,fallback)=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=640&&p.y>=0&&p.y<=360?p:fallback;
    recordPosition=point(saved.recordPosition,recordPosition);cakePosition=point(saved.cakePosition,cakePosition);keyPosition=point(saved.keyPosition,keyPosition);
    for(const id of ['fallen','record','cake','key'])for(const axis of ['left','top']){
      const value=saved.props?.[id]?.[axis];
      if(typeof value==='string'&&/^\d+(?:\.\d+)?%$/.test(value)&&parseFloat(value)<=100)$(id).style[axis]=value;
    }
    // A refresh during the falling animation advances to its completed state.
    const resumePhase=saved.phase===0&&signHits===10?1:saved.phase;
    showPhase(resumePhase);visible('audioGate',false);
    $('voice').textContent=voiceEnabled?'VOICE ON':'VOICE OFF';$('voice').setAttribute('aria-pressed',String(voiceEnabled));
    if(typeof saved.caption==='string'&&saved.caption.length<=600)$('caption').textContent=saved.caption;
    if(typeof saved.reaction==='string'&&saved.reaction.length<=250)$('reaction').textContent=saved.reaction;
    if(resumePhase===1&&saved.phase===0)$('caption').textContent='Excellent. You broke the sign. And uncovered a boxing glove. Which is decorative. Do not pick it up.';
    $('gentle').setAttribute('aria-pressed',String(gentleMode));$('gentle').textContent=gentleMode?'MISCHIEF: LOW':'LESS MISCHIEF';
    if(resumePhase===2){if(lockHits>0)dodgeCount=2;boxOffset=gentleMode||lockHits?0:dodgeCount===1?72:dodgeCount===2?-72:0;boxVisualOffset=boxOffset;positionBox();}
    if(resumePhase===2&&lockHits>0)$('boxLabel').textContent='CRACK…';
    $('raccoonBubble').textContent=keyDropped?'fair trade.':cakeOwned?'is that for me?':'mine.';
    if(resumePhase===5&&typeof saved.bubble==='string'&&saved.bubble.length<100)$('raccoonBubble').textContent=saved.bubble;
    if(resumePhase===4){playing=false;if(saved.playing){danceIndex=0;$('danceStatus').textContent='PRESS LISTEN AGAIN FOR THE PATTERN.';}else $('danceStatus').textContent=danceIndex?`${danceIndex} / 5`:'YOUR TURN.';}
    if(resumePhase>=6)for(let i=0;i<80;i++)confetti.push({x:Math.random()*640,y:Math.random()*360,v:35+Math.random()*80,color:['#f3ce84','#de94b0','#9dc9b3','#acb9db'][i%4]});
    if(resumePhase===7&&ending){$('letter').querySelector('h2').textContent=ending==='forgive'?'friends again. ♡':'fair enough. ♡';$('forgive').disabled=$('roast').disabled=true;}
  }catch{} // Ignore old or damaged saves instead of blocking the opening screen.
}
restoreProgress();

// Captions and responsive layouts can change the stage height without a window resize.
if(typeof ResizeObserver!=='undefined')new ResizeObserver(resizeArt).observe($('stage'));
window.addEventListener?.('resize',resizeArt);
resizeArt();

window.addEventListener?.('keydown',e=>{if(e.key==='Escape')visible('helpPanel',false);});
