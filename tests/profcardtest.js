const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('/tmp/main.js','utf8');
const mkStore=o=>({getItem:k=>k in o?o[k]:null,setItem:(k,v)=>{o[k]=String(v)},removeItem:k=>{delete o[k]}});
const posted=[];class BC{postMessage(d){posted.push(d)}set onmessage(f){this._h=f}get onmessage(){return this._h}}
const el=()=>new Proxy(function(){},{get:(t,k)=>k==='style'?{setProperty(){},removeProperty(){}}:k==='setProperty'?(()=>{}):k==='classList'?{add(){},remove(){},toggle(){},contains(){return false}}:k==='children'?[]:k==='value'?'':k==='textContent'?'':()=>el(),set:()=>true,apply:()=>el()});
let pass=0,fail=0;const ok=(c,m)=>{if(c){pass++;console.log('  ok  ',m)}else{fail++;console.log('  FAIL',m)}};
function world(inc,withChat){
 const ls={};
 const st={profile:{id:'LTW-AAAA-BBBB',name:'Я',emoji:'😀',hue:260},nick:'Я',hue:260,mode:'auto',net:'lan',
   chats:[{id:'fav',name:'Избранное',sys:'x',msgs:[]}].concat(withChat?[{id:'p1',name:'Боб',peer:'LTW-CCCC-DDDD',sys:'x',msgs:[]}]:[]),
   priv:{pin:'',lockHide:false,prev:false,blur:false,ttl:0,inc,blocked:[]}};
 ls.libretaw=JSON.stringify(st);
 const sb={console:{log(){},error(){},warn(){}},localStorage:mkStore(ls),sessionStorage:mkStore({}),navigator:{userAgent:'Mozilla/5.0 Chrome/120',language:'ru',clipboard:{writeText(){}}},
  location:{protocol:'http:',hostname:'localhost',reload(){}},screen:{width:1280,height:720},devicePixelRatio:1,matchMedia:()=>({matches:false,addEventListener(){}}),
  BroadcastChannel:BC,MutationObserver:class{observe(){}},NodeFilter:{SHOW_TEXT:4},
  setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},requestAnimationFrame:()=>0,cancelAnimationFrame(){},
  crypto:globalThis.crypto,TextEncoder,TextDecoder,Blob,URL:{createObjectURL:()=>'blob:x',revokeObjectURL(){}},Image:class{},FileReader:class{},
  WebSocket:class{},Intl,Uint8Array,Promise,JSON,Math,Date,Set,Map,WeakMap,WeakSet,Array,Object,String,Number,Error,Symbol,btoa,atob,parseInt,parseFloat,isFinite,Response,CompressionStream,DecompressionStream,encodeURIComponent,decodeURIComponent,
  addEventListener(){},removeEventListener(){},indexedDB:undefined,claude:undefined,performance:{now:()=>0},innerWidth:1200};
 sb.window=sb;sb.self=sb;sb.globalThis=sb;sb.document0=null;
 const doc={documentElement:Object.assign(el(),{style:{setProperty(){}}}),getElementById:()=>el(),createElement:()=>el(),createTextNode:t=>({nodeValue:t}),body:el(),documentElement:el(),querySelectorAll:()=>[],querySelector:()=>el(),addEventListener(){},createTreeWalker:()=>({nextNode:()=>null}),hidden:false};
 sb.document=doc;vm.createContext(sb);
 try{vm.runInContext(src,sb)}catch(e){return {err:e.message}}
 return {sb,st};
}
function deliver(w,data){vm.runInContext('lanH',w.sb)({data});}


const ME='LTW-AAAA-BBBB',PEER='LTW-CCCC-DDDD',STR='LTW-EEEE-FFFF';
const w=world('all',false);const R=c=>vm.runInContext(c,w.sb);
R(`store.profile={id:'${ME}',name:'Аня',emoji:'x',hue:1,bio:'привет'};store.chats.push({id:'p1',name:'Боб',peer:'${PEER}',sys:'x',msgs:[]});`);
const sent=()=>posted.splice(0);
// --- sending the card
R("store.priv.ovis='contacts';store.priv.cvis='none';store.cardOvPrev='none'");sent();R("cardSync()");
let ev=sent();
const toPeer=ev.find(d=>d.to===PEER&&d.card);
ok(toPeer&&toPeer.card.cmtVis==='none'&&toPeer.card.bio==='привет'&&toPeer.card.os,'contact gets OS, comment policy and bio');
ok(!ev.some(d=>!d.to&&d.card),'"Контактам": nothing broadcast to strangers');
R("store.priv.ovis='all'");sent();R("cardSync()");ev=sent();
ok(ev.some(d=>!d.to&&d.card&&d.card.osVis==='all'&&d.card.os),'"Всем": OS is broadcast to everyone online');
R("store.priv.ovis='none'");sent();R("cardSync()");ev=sent();
ok(ev.some(d=>!d.to&&d.card&&d.card.osVis==='none')&&!ev.some(d=>d.to===PEER&&d.card&&d.card.os),'"Никто": withdrawn from strangers and hidden from contacts');
// --- receiving the card
R("store.pc={}");
var dv=d=>R('lanH')({data:d});
dv({from:STR,fname:'Вова',uid:'x',card:{osVis:'contacts',os:'Linux · Chrome'}});
ok(!R("store.pc['"+STR+"']")||!R("store.pc['"+STR+"']").os,'stranger cannot see OS that is "контактам"');
dv({from:STR,fname:'Вова',uid:'x',card:{osVis:'all',os:'Android · Chrome'}});
ok(R("store.pc['"+STR+"']").os==='Android · Chrome','stranger sees OS that is "всем"');
dv({from:PEER,fname:'Боб',uid:'x',card:{osVis:'contacts',os:'Windows · Chrome',cmtVis:'all',bio:'hi'}});
ok(R("store.pc['"+PEER+"']").os==='Windows · Chrome'&&R("store.pc['"+PEER+"']").cmt==='all'&&R("store.pc['"+PEER+"']").bio==='hi','contact OS, comment policy and bio are stored');
dv({from:PEER,fname:'Боб',uid:'x',card:{osVis:'none',os:null}});
ok(!R("store.pc['"+PEER+"']").os,'contact hides OS: removed');
// --- commenting
R("store.pc['"+PEER+"']={cmt:'none',name:'Боб'}");posted.length=0;R("sendComment('"+PEER+"','привет')");
ok(!posted.some(d=>d.cmt),'comment is refused when the other person does not accept them');
R("store.pc['"+PEER+"']={cmt:'contacts',name:'Боб'}");posted.length=0;R("sendComment('"+PEER+"','привет')");
ok(posted.some(d=>d.cmt&&d.to===PEER&&d.cmt.text==='привет'),'contacts-only target with a chat: comment sent to that person');
R("store.pc['"+STR+"']={cmt:'contacts',name:'Вова'}");posted.length=0;R("sendComment('"+STR+"','x')");
ok(!posted.some(d=>d.cmt),'contacts-only target without a chat: refused');
R("store.pc['"+STR+"']={cmt:'all',name:'Вова'}");posted.length=0;R("sendComment('"+STR+"','x')");
ok(posted.some(d=>d.cmt&&d.to===STR),'"Все" target: comment sent');
posted.length=0;R("sendComment('"+STR+"','   ')");ok(!posted.some(d=>d.cmt),'empty comment is refused');
// --- owner side: policy decides what is accepted
const msg=(from,text,id,to=ME)=>({to,from,fname:'X',uid:'x',cmt:{id,t:Date.now(),text}});
R("store.comments=[]");
R("store.priv.cvis='none'");dv(msg(PEER,'a','c1'));ok(R("store.comments.length")===0,'"Никто": nothing is accepted');
R("store.priv.cvis='contacts'");dv(msg(STR,'b','c2'));ok(R("store.comments.length")===0,'"Контакты": a stranger is dropped');
dv(msg(PEER,'c','c3'));ok(R("store.comments.length")===1&&R("store.comments[0].text")==='c','"Контакты": a contact comment is kept');
dv(msg(PEER,'c','c3'));ok(R("store.comments.length")===1,'the same comment twice is kept once');
R("store.priv.cvis='all'");dv(msg(STR,'d','c4'));ok(R("store.comments.length")===2,'"Все": a stranger is accepted');
dv(msg(PEER,'x'.repeat(301),'c5'));ok(R("store.comments.length")===2,'too long comment is dropped');
dv(msg(PEER,'y','c6',STR));ok(R("store.comments.length")===2,'comment addressed to someone else is ignored');
console.log(`\nresult: ${pass} passed, ${fail} failed`);process.exit(fail?1:0);
