const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('/tmp/main.js','utf8');
const block=src.slice(src.indexOf('// ===== Уведомления ====='),src.indexOf('// ===== Polls ====='));
let pass=0,fail=0;const ok=(c,m)=>{if(c){pass++;console.log('  ok  ',m)}else{fail++;console.log('  FAIL',m)}};
let shown=[],snacks=[],opened=[],beeps=0;
class FakeNotif{constructor(t,o){this.t=t;this.o=o;shown.push(this)}close(){}}
FakeNotif.permission='granted';
const els={};const $=i=>els[i]||(els[i]={style:{},value:'',onclick:null,onchange:null,classList:{toggle(){},add(){},remove(){}},textContent:''});
const sb={store:{chats:[],nt:undefined,priv:{archHide:false}},cur:null,document:{hidden:false,querySelectorAll:()=>[]},
 Notification:FakeNotif,snack:m=>snacks.push(m),tab(){},open:id=>opened.push(id),save(){},updFx(){},mLabel:()=>'фото',arcHidden:c=>!!(sb.store.priv.archHide&&c.arch),
 $,setTimeout,setInterval:()=>0,Date,Math,Object,JSON,String,Number,Promise,console,document:{hidden:false,querySelectorAll:()=>[]}};
vm.createContext(sb);vm.runInContext(block,sb);
const R=c=>vm.runInContext('{'+c+'}',sb);
const reset=()=>{shown.length=0;snacks.length=0;opened.length=0;FakeNotif.permission='granted';R("store.nt=undefined;ntCfg();cur=null;document.hidden=false;store.priv.archHide=false");};
const peer={id:'p',name:'Боб',peer:'LTW-C',msgs:[]},group={id:'g',name:'Группа',group:1,gid:'GR-1',msgs:[]},chan={id:'k',name:'Канал',ch:1,chid:'CH-1',msgs:[]},svc={id:'s',name:'libretaw',svc:1,msgs:[]};
const inc={text:'привет',t:1,me:0,from:'Боб'};
const notify=(c,m=inc)=>{shown.length=0;vm.runInContext('',sb);sb.__c=c;sb.__m=m;R("notifyIncoming(__c,__m)");return shown.length};
reset();
ok(notify(peer)===1&&shown[0].t==='Боб'&&shown[0].o.body==='привет','incoming message in a closed chat: system notification with name and text');
ok(shown[0].o.silent===true&&shown[0].o.tag==='p','notification is silent (sound is controlled separately) and grouped by chat');
reset();R("cur='p'");ok(notify(peer)===0,'chat is open and page visible: no notification');
reset();R("cur='p'");sb.document.hidden=true;ok(notify(peer)===1,'chat open but page hidden: notified');
reset();ok(notify({...peer,mute:true})===0,'muted chat: no notification');
reset();R("store.nt.group=false");ok(notify(group)===0&&notify(peer)===1,'groups off: groups silent, personal still notify');
reset();R("store.nt.ch=false");ok(notify(chan)===0,'channels off: channel silent');
reset();R("store.nt.svc=false");ok(notify(svc,{text:'вход',t:2,me:0,from:'libretaw'})===0,'service notices off');
reset();R("store.nt.on=false");ok(notify(peer)===0,'master switch off: nothing');
reset();ok(notify(peer,{text:'мой',t:3,me:1})===0&&notify(peer,{text:'sys',t:4,sys:1})===0,'own and system messages never notify');
reset();R("store.nt.prev=false");ok(notify(peer)===1&&shown[0].t==='libretaw'&&shown[0].o.body==='Новое сообщение','text hidden: generic title and body');
reset();ok(notify(peer,{text:'',t:5,me:0,media:{kind:'image'}})===1&&shown[0].o.body==='фото','media-only message shows its type');
reset();FakeNotif.permission='denied';ok(notify(peer)===0&&snacks.length===1&&/привет/.test(snacks[0]),'permission denied: falls back to an in-app notice with the text');
reset();FakeNotif.permission='default';ok(notify(peer)===0&&snacks.length===1,'permission not asked yet: in-app notice, no system popup');
reset();sb.store.priv.archHide=true;ok(notify({...peer,arch:1})===0,'hidden archive: archived chat never notifies');
// quiet hours
const hm=d=>String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
const now=new Date();const addM=(d,m)=>new Date(d.getTime()+m*60000);
reset();R(`store.nt.qh=true;store.nt.qf='${hm(addM(now,-60))}';store.nt.qt='${hm(addM(now,60))}'`);
ok(notify(peer)===0,'inside quiet hours: silent');
reset();R(`store.nt.qh=true;store.nt.qf='${hm(addM(now,60))}';store.nt.qt='${hm(addM(now,120))}'`);
ok(notify(peer)===1,'outside quiet hours: notifies');
reset();R(`store.nt.qh=true;store.nt.qf='${hm(addM(now,-120))}';store.nt.qt='${hm(addM(now,-60))}'`);
ok(notify(peer)===1,'quiet window already passed today: notifies');
reset();R(`store.nt.qh=true;store.nt.qf='23:00';store.nt.qt='07:00'`);
const hr=now.getHours();const inNight=hr>=23||hr<7;ok(notify(peer)===(inNight?0:1),'overnight window (23:00-07:00) handled across midnight');
// sound
reset();R("store.nt.snd=true");notify(peer);ok(true,'sound on: no crash without AudioContext (silent fallback)');
// click opens the chat

console.log(`\nresult: ${pass} passed, ${fail} failed`);process.exit(fail?1:0);
