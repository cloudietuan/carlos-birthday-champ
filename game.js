'use strict';
const $ = id => document.getElementById(id);
const canvas = $('art'), ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
const pads = Array.from(document.querySelectorAll('[data-pad]'));
const sceneObjects = ['cake','raccoon','key','fallen','opening','glove','box','silence','record','player','dance','finalOpen','birthday','letter'];
const chapters = ['A VERY NORMAL EMPTY SCREEN','THAT IS NOT A BOXING GLOVE','AN ENTIRELY UNBREAKABLE LOCK','ABSOLUTELY NO DANCING','THIS IS NOT A DANCE FLOOR','A COMPLETELY EMPTY BOX','…OKAY. SURPRISE.','FOR CARLOS'];
const pattern = [0,2,1,0,3];
let cakeOwned=false,keyOwned=false,keyDropped=false,keyUnlocked=false;let recordPosition={x:160,y:193},cakePosition={x:154,y:236},keyPosition={x:510,y:252};let speechSerial=0;let entered=false,resolveNarration=null;const recordedAudio=$('narrationAudio');let phase=0, signHits=0, lockHits=0, musicHits=0, recordFound=false;
let gloveOwned=false, recordOwned=false, selected=null, danceIndex=0, playing=false;
let epoch=0, clock=0, last=0, hitUntil=0, confetti=[], voiceEnabled=true, audio;
function visible(id, yes){ $(id).classList.toggle('hidden', !yes); }
function later(fn, ms){const version=epoch;setTimeout(()=>{if(version===epoch)fn();},ms);}
function stopNarration(){speechSerial++;recordedAudio.pause();if(resolveNarration){resolveNarration();resolveNarration=null;}$('audioState').textContent='';}
function say(line){
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
  phase=n;sceneObjects.forEach(id=>visible(id,false));$('chapter').textContent=chapters[n];
  if(n===0)visible('opening',true);
  if(n===1){visible('glove',true);visible('fallen',true);}
  if(n===2){visible('box',true);$('boxLabel').textContent='DO NOT TOUCH';}
  if(n===3){visible('silence',musicHits<3);visible('record',recordFound&&!recordOwned);visible('player',true);}
  if(n===4)visible('dance',true);
  if(n===5){visible('box',true);visible('raccoon',true);visible('cake',!cakeOwned&&!keyDropped);visible('key',keyDropped&&!keyOwned&&!keyUnlocked);visible('finalOpen',keyUnlocked);$('boxLabel').textContent=keyUnlocked?'':'LOCKED';$('chapter').textContent=keyUnlocked?chapters[5]:'THE RACCOON HAS OTHER PLANS';}
  if(n===6)visible('birthday',true);
  if(n===7)visible('letter',true);
  refreshPockets();
}
function refreshPockets(){
  visible('itemGlove',gloveOwned && phase<6);visible('itemRecord',recordOwned && phase===3);
  visible('itemCake',cakeOwned&&phase===5&&!keyDropped);visible('itemKey',keyOwned&&phase===5&&!keyUnlocked);visible('empty',!(gloveOwned&&phase<6)&&!(recordOwned&&phase===3)&&!(cakeOwned&&phase===5&&!keyDropped)&&!(keyOwned&&phase===5&&!keyUnlocked));$('itemCake').classList.toggle('selected',selected==='cake');$('itemKey').classList.toggle('selected',selected==='key');
  $('itemGlove').classList.toggle('selected',selected==='glove');
  $('itemRecord').classList.toggle('selected',selected==='record');$('fallen').classList.toggle('selected',selected==='sign');
  $('held').textContent=selected ? `holding: ${selected==='glove'?'glove':selected==='sign'?'NOT sign':selected==='cake'?'cake':selected==='key'?'key':'record'}` : '';
}
function loosenSign(){
  if(!entered||phase!==0||signHits>=10)return;
  signHits++;tone(130+signHits*35);$('denial').classList.remove('shake');void $('denial').offsetWidth;$('denial').classList.add('shake');
  const lines=['Carlos. I said leave it alone.','That sign is structural. Probably.','You’re really going to keep doing that?','Fine. One more click and the whole thing falls apart.'];
  if(signHits<10){const i={1:0,3:1,6:2,9:3}[signHits];if(i!==undefined)say(lines[i]);}
  else{
    $('denial').classList.remove('shake');$('denial').classList.add('fall');
    later(()=>{showPhase(1);say('Excellent. You broke the sign. And uncovered a boxing glove. Which is decorative. Do not pick it up.');},650);
  }
}
function collectGlove(){if(phase!==1)return;if(selected!=='sign'){say('That sign is structural. Probably.');return;}playEffect('glass');gloveOwned=true;selected='glove';showPhase(2);say('Oh. A present. How embarrassing. That lock is unbreakable, Carlos. I checked. With science.');tone(440);}
function selectItem(item){selected=selected===item?null:item;refreshPockets();tone(200);}
function inspectBox(){
  if(phase===5){if(keyUnlocked){openGift();return;}if(selected==='key'&&keyOwned){keyUnlocked=true;selected=null;visible('key',false);visible('finalOpen',true);$('boxLabel').textContent='';$('chapter').textContent=chapters[5];refreshPockets();playEffect('glass');say('You earned it. Open the box anyway.');}else{$('raccoonBubble').textContent=keyDropped?'there. take it.':'cake?';}return;}
  if(phase!==2)return;
  if(selected!=='glove'){say('A lock. Very secure. Definitely don’t select that boxing glove from your pockets and try it here.');return;}
  lockHits++;playEffect('punch');hitUntil=clock+.16;tone(80+lockHits*20);
  const lines=['A punch? Really?','That was a fluke.','I’m sure the next one will do nothing.','You’ve been training, haven’t you?','Carlos. Please stop being good at boxing.'];
  if(lockHits<6){say(lines[lockHits-1]);$('boxLabel').textContent='CRACK…';}
  else{selected=null;showPhase(3);say('You broke it. But this present has a second security system: absolutely no music. Carlos cannot be trusted near a dance floor.');}
}
function loosenMusic(){
  if(phase!==3||recordFound)return;musicHits++;tone(180+musicHits*70);
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
function flashPad(number){pads[number].classList.add('lit');tone([262,330,392,440][number],.25);later(()=>pads[number].classList.remove('lit'),350);}
function hitPad(number){
  if(phase!==4||playing)return;
  flashPad(number);
  if(number!==pattern[danceIndex]){danceIndex=0;$('danceStatus').textContent='TRY AGAIN. YOU HAVE THIS.';say('Wrong beat. The box is still locked. Unfortunately for me, you can listen again as often as you like.');return;}
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
$('hint').onclick=()=>{if(phase===5&&!keyUnlocked){$('caption').textContent=keyDropped?'Pick up the dropped key and drag it to the present’s lock.':'That raccoon stole your key. It seems more interested in the cake. Try dragging the slice over to it.';stopNarration();$('raccoonBubble').textContent=keyDropped?'key. box. easy.':'cake please.';}else say(phase===3&&recordFound?'Pick up the record, select it in your pockets, and click the turntable.':phase===5?'You earned it. Open the box anyway.':hints[phase]);};
$('voice').onclick=()=>{voiceEnabled=!voiceEnabled;$('voice').textContent=voiceEnabled?'VOICE ON':'VOICE OFF';$('voice').setAttribute('aria-pressed',String(voiceEnabled));if(!voiceEnabled)stopNarration();else if(entered)say($('caption').textContent);};
$('restart').onclick=()=>{
  if(phase>0&&!confirm('Start the puzzle over?'))return;
  stopNarration();cakeOwned=keyOwned=keyDropped=keyUnlocked=false;resetMovables();epoch++;phase=signHits=lockHits=musicHits=danceIndex=0;recordFound=gloveOwned=recordOwned=playing=false;selected=null;confetti=[];
  $('denial').classList.remove('fall','shake');pads.forEach(p=>p.classList.remove('lit'));
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
function r(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),w,h);}
function pixelText(t,x,y,size=9,color='#e5cfa8'){ctx.fillStyle=color;ctx.textAlign='center';ctx.font=`${size}px Arcade,monospace`;ctx.fillText(t,x,y);}
function present(x,y,scale=1,locked=true){
  ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
  r(-34,35,74,6,'#100c1d70');r(-31,-10,63,45,'#522d46');r(-28,-8,57,40,'#b76081');r(-28,-8,9,40,'#d68aa0');r(18,-8,11,40,'#974867');
  r(-33,-19,67,14,'#602f4a');r(-30,-17,61,10,'#d78199');r(-3,-19,10,51,'#edc584');r(-28,6,56,7,'#edc584');
  r(-19,-32,15,13,'#7b4c55');r(-17,-30,11,9,'#edc584');r(8,-32,15,13,'#7b4c55');r(10,-30,11,9,'#edc584');r(-3,-30,10,12,'#ffe1a0');
  if(locked){r(-8,7,20,15,'#3d354c');r(-5,2,14,8,'#b2a3bd');r(-2,5,8,5,'#4d3a55');r(-6,9,16,10,'#c4b0b1');r(0,12,4,5,'#56405b');if(lockHits>0)for(let i=0;i<Math.min(lockHits,5);i++)r(-8+i*5,8+i%3*4,3,3,'#5d3d57');}
  ctx.restore();
}
function gloveArt(x,y,s=1){ctx.save();ctx.translate(x,y);ctx.scale(s,s);r(-19,-20,30,5,'#3c263e');r(-23,-15,38,24,'#3c263e');r(-20,-15,33,20,'#c96777');r(-17,-15,24,5,'#ed9aa0');r(-20,-10,5,12,'#e38892');r(9,-7,10,16,'#893e61');r(12,-5,4,11,'#d37886');r(-16,6,29,10,'#552f4c');r(-13,8,23,6,'#f0c989');r(-10,9,17,2,'#ffe4b1');ctx.restore();}
function recordArt(x,y,s=1){ctx.save();ctx.translate(x,y);ctx.scale(s,s);for(const[a,b,w,h]of[[-19,-12,38,24],[-12,-19,24,38],[-16,-16,32,32]])r(a,b,w,h,'#0c1021');r(-16,-10,3,20,'#47415d');r(-10,-16,20,3,'#47415d');r(-8,-8,16,16,'#b46d89');r(-5,-5,10,10,'#e2b597');r(-1,-1,3,3,'#151329');ctx.restore();}
function turntable(){r(369,232,173,12,'#111020');r(371,168,166,63,'#785466');r(371,168,166,9,'#b08787');r(377,183,153,37,'#45354e');r(386,185,83,30,'#25223b');r(412,188,31,22,'#727083');r(416,184,23,30,'#727083');r(416,188,23,22,'#8c8794');r(426,198,3,3,'#d4c1bc');r(483,181,5,30,'#dbbaa2');r(483,207,21,4,'#dbbaa2');r(499,200,5,10,'#9c7993');r(509,190,12,7,'#e6bf7f');r(508,210,14,4,'#9dc8b3');r(386,232,8,15,'#4a3449');r(516,232,8,15,'#4a3449');}
function carlos(x,y,s=1,dance=false){ctx.save();ctx.translate(x,y);ctx.scale(s,s);const t=dance?Math.sin(clock*7):0;ctx.translate(0,t*2);r(-17,34,36,4,'#110e2344');r(-10,16,8,17+t*3,'#2e3c58');r(3,16,8,17-t*3,'#2e3c58');r(-9,17,3,14,'#52778a');r(4,17,3,14,'#52778a');r(-13,31+t*3,12,5,'#ede0b7');r(2,31-t*3,12,5,'#ede0b7');r(-14,-4,28,22,'#253746');r(-12,-3,24,21,'#6ab7a3');r(-10,-1,5,18,'#9fd6b6');r(7,0,5,17,'#458979');r(-12,15,24,4,'#edd49a');r(-11,-22,23,20,'#634552');r(-9,-20,19,17,'#cb9576');r(-8,-18,4,12,'#e7b792');r(6,-14,4,9,'#ac705e');r(-11,-24,23,8,'#322638');r(-7,-27,15,5,'#322638');r(-7,-23,13,3,'#4e3746');r(-11,-17,3,5,'#322638');r(9,-17,3,5,'#322638');r(-5,-12,3,3,'#382635');r(4,-12,3,3,'#382635');r(-4,-6,7,2,'#edd4b3');r(-17,-2-t*7,6,18,'#dba482');r(13,-2+t*7,6,18,'#bb8069');if(!dance){gloveArt(-19,3,.38);gloveArt(20,3,.38)}ctx.restore();}
function room(){
  r(0,0,640,360,'#211f34');r(0,290,640,70,'#2d273f');r(0,289,640,3,'#514056');
  for(let i=0;i<12;i++){r(i*60,302,1,58,'#3b304b');r(i*60+18,338,33,1,'#3f324d');}
  r(16,18,608,2,'#59415b');r(16,20,2,260,'#493b53');r(622,20,2,260,'#493b53');
  for(let i=0;i<9;i++){const x=35+i*70;r(x,18,3,12,'#b88b85');r(x-4,31,11,5,'#f3c787');r(x-1,32,4,3,'#ffe3af');}
  r(16,18,33,74,'#583248');r(16,18,11,86,'#77485a');r(27,19,9,76,'#925969');r(38,19,8,69,'#3d293e');
  r(592,18,32,74,'#583248');r(611,18,11,86,'#77485a');r(601,19,9,76,'#925969');r(592,19,8,69,'#3d293e');
}
function draw(){
  if(phase===0){r(0,0,640,360,'#06080d');}else room();
  if(phase===1){r(422,169,105,122,'#293846');r(425,172,99,114,'#6794a166');r(428,175,3,100,'#cce4e0');r(430,278,92,8,'#56687c');gloveArt(474,226,1.8);pixelText('HMM.',320,138,12,'#c8b3ca');r(456,290,70,4,'#131124');}
  if(phase===2||phase===5){ctx.save();if(clock<hitUntil)ctx.translate(Math.sin(clock*90)*5,0);present(320,209,2.3,phase===2||(phase===5&&!keyUnlocked));ctx.restore();if(phase===5){raccoonArt(512,224,1.5,keyDropped);if(!cakeOwned&&!keyDropped)cakeArt(cakePosition.x,cakePosition.y,1.5);if(keyDropped&&!keyOwned&&!keyUnlocked)keyArt(keyPosition.x,keyPosition.y,1.5);}}
  if(phase===3){turntable();if(recordFound&&!recordOwned)recordArt(recordPosition.x,recordPosition.y,1.7);r(76,261,122,10,'#785265');r(84,271,8,39,'#4b354b');r(181,271,8,39,'#4b354b');pixelText('SIDE A',452,157,8,'#b397b0');}
  if(phase===4){for(let i=0;i<10;i++)for(let j=0;j<3;j++)r(i*64,255+j*35,64,35,(i+j)%2?'#4a3b59':'#353044');carlos(70,242,1.6,true);carlos(568,242,1.6,true);}
  if(phase>=6){
    for(let i=0;i<12;i++){ctx.fillStyle=['#d58ea6','#b7c9a2','#e4c183'][i%3];ctx.beginPath();ctx.moveTo(55+i*44,53);ctx.lineTo(79+i*44,53);ctx.lineTo(67+i*44,72);ctx.fill();}
    for(let i=0;i<6;i++){const x=70+i*100,y=170+Math.sin(clock*2+i)*4;r(x,y+14,1,91,'#9a799f');ctx.fillStyle=['#de93aa','#b1cdb4','#e2c386'][i%3];ctx.beginPath();ctx.ellipse(x,y,13,17,0,0,Math.PI*2);ctx.fill();r(x-5,y-10,3,6,'#ffffff60');}
    carlos(104,272,1.65,true);carlos(536,272,1.65,true);raccoonArt(430,292,.8,true);present(320,282,1.3,false);
  }
  for(const p of confetti)r(p.x,p.y,3,5,p.color);
}
function loop(stamp){const dt=last?Math.min((stamp-last)/1000,.05):0;last=stamp;clock+=dt;confetti.forEach(p=>{p.y+=p.v*dt;p.x+=Math.sin(clock+p.v)*dt*12;if(p.y>370)p.y=-20;});draw();requestAnimationFrame(loop);}
showPhase(0);requestAnimationFrame(loop);

function playEffect(name){if(!voiceEnabled)return;const effect=new Audio('assets/audio/'+name+'.wav');effect.volume=.35;effect.play().catch(()=>{});}

function takeCake(){if(phase!==5||keyDropped)return;cakeOwned=true;selected='cake';visible('cake',false);refreshPockets();$('raccoonBubble').textContent='is that for me?';tone(392);}
function feedRaccoon(){if(phase!==5)return;if(selected!=='cake'||!cakeOwned){$('raccoonBubble').textContent=keyDropped?'thanks, carlos.':'cake?';tone(500,.06);return;}keyDropped=true;cakeOwned=false;selected=null;visible('cake',false);visible('key',true);$('raccoonBubble').textContent='fair trade.';refreshPockets();playEffect('raccoon');tone(660,.15);}
function takeKey(){if(phase!==5||!keyDropped||keyUnlocked)return;keyOwned=true;selected='key';visible('key',false);refreshPockets();$('raccoonBubble').textContent='all yours.';tone(440);}
$('cake').onclick=takeCake;$('raccoon').onclick=feedRaccoon;$('key').onclick=takeKey;
$('itemCake').onclick=()=>selectItem('cake');$('itemKey').onclick=()=>selectItem('key');
function raccoonArt(x,y,s=1,fed=false){ctx.save();ctx.translate(x,y);ctx.scale(s,s);r(-30,24,76,5,'#080b1644');for(let i=0;i<5;i++){r(24+i*5,9-i*3,9,13,i%2?'#4f4e62':'#b6b1b9');}r(-19,-5,39,32,'#565969');r(-16,-5,30,30,'#a7adb1');r(-13,0,25,25,'#c9c9bf');r(-18,22,11,8,'#454755');r(6,22,11,8,'#454755');r(-22,-26,11,14,'#444652');r(11,-26,11,14,'#444652');r(-19,-23,5,9,'#b98799');r(14,-23,5,9,'#b98799');r(-23,-19,47,21,'#626574');r(-20,-17,41,19,'#b8b9b6');r(-21,-13,17,9,'#42454f');r(5,-13,17,9,'#42454f');r(-12,-10,4,4,'#eadcc0');r(11,-10,4,4,'#eadcc0');r(-7,-7,15,10,'#e0d5c2');r(-3,-5,7,4,'#45414c');r(-22,1,7,17,'#7b818c');r(16,1,7,17,'#7b818c');if(!fed)keyArt(-7,7,.5);else{r(-6,6,13,11,'#e5b280');r(-6,3,13,4,'#ead5b4');}ctx.restore();}
function cakeArt(x,y,s=1){ctx.save();ctx.translate(x,y);ctx.scale(s,s);r(-18,16,40,4,'#302638');r(-18,-9,40,25,'#955879');r(-15,-8,34,22,'#cb829d');r(-15,2,34,5,'#e7c29c');r(-20,-14,42,9,'#f2dfb8');r(-12,-5,5,8,'#f2dfb8');r(11,-5,5,6,'#f2dfb8');r(-3,-22,6,8,'#ad687c');r(-2,-27,4,6,'#f0c887');ctx.restore();}
function keyArt(x,y,s=1){ctx.save();ctx.translate(x,y);ctx.scale(s,s);r(-15,-7,14,14,'#946746');r(-13,-6,10,12,'#eaca7f');r(-10,-3,4,5,'#342739');r(-4,-2,22,5,'#eaca7f');r(12,2,5,7,'#eaca7f');r(5,1,4,5,'#bc8d51');ctx.restore();}
function inside(id,e){const b=$(id).getBoundingClientRect();return e.clientX>=b.left&&e.clientX<=b.right&&e.clientY>=b.top&&e.clientY<=b.bottom;}
function resetMovables(){recordPosition={x:160,y:193};cakePosition={x:154,y:236};keyPosition={x:510,y:252};for(const[id,left,top]of[['fallen',23,76],['record',15,40],['cake',14,55],['key',73,62]]){$(id).style.left=left+'%';$(id).style.top=top+'%';}}
function movable(id,item){const el=$(id);el.draggable=false;let drag=null;
 el.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();const stage=$('stage').getBoundingClientRect(),b=el.getBoundingClientRect();drag={x:e.clientX,y:e.clientY,left:(b.left-stage.left)/stage.width*100,top:(b.top-stage.top)/stage.height*100,w:b.width/stage.width*100,h:b.height/stage.height*100,moved:false,stage};el.setPointerCapture(e.pointerId);el.classList.add('dragging');});
 el.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>5)drag.moved=true;if(!drag.moved)return;const left=Math.max(0,Math.min(100-drag.w,drag.left+dx/drag.stage.width*100)),top=Math.max(15,Math.min(100-drag.h,drag.top+dy/drag.stage.height*100));el.style.left=left+'%';el.style.top=top+'%';const p={x:(left+drag.w/2)*6.4,y:(top+drag.h/2)*3.6};if(item==='record')recordPosition=p;if(item==='cake')cakePosition=p;if(item==='key')keyPosition=p;});
 el.addEventListener('pointerup',e=>{if(!drag)return;const moved=drag.moved;drag=null;el.classList.remove('dragging');if(!moved){el.onclick?.(e);return;}selected=item==='sign'?item:null;refreshPockets();if(item==='sign'&&phase===1&&inside('glove',e))collectGlove();if(item==='record'&&phase===3&&inside('player',e)){collectRecord();usePlayer();}if(item==='cake'&&phase===5&&inside('raccoon',e)){takeCake();feedRaccoon();}if(item==='key'&&phase===5&&inside('box',e)){takeKey();inspectBox();}});
 el.addEventListener('pointercancel',()=>{drag=null;el.classList.remove('dragging');});el.addEventListener('click',e=>{if(e.detail>0){e.preventDefault();e.stopImmediatePropagation();}},true);
}
movable('fallen','sign');movable('record','record');movable('cake','cake');movable('key','key');
for(const[id,item]of[['itemCake','cake'],['itemKey','key']]){$(id).draggable=true;$(id).ondragstart=e=>{selected=item;refreshPockets();e.dataTransfer.setData('text/plain',item);};}
$('raccoon').ondragover=e=>e.preventDefault();$('raccoon').ondrop=e=>{e.preventDefault();if(e.dataTransfer.getData('text/plain')==='cake'&&cakeOwned){selected='cake';feedRaccoon();}};
const oldBoxDrop=$('box').ondrop;$('box').ondrop=e=>{if(e.dataTransfer.getData('text/plain')==='key'&&keyOwned){e.preventDefault();selected='key';inspectBox();}else oldBoxDrop(e);};

function startDanceWhenQuiet(version){if(phase!==4||epoch!==version)return;if(voiceEnabled&&resolveNarration){later(()=>startDanceWhenQuiet(version),180);return;}playing=false;playPattern();}
