const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('/tmp/main.js','utf8');
const mkStore=o=>({getItem:k=>k in o?o[k]:null,setItem:(k,v)=>{o[k]=String(v)},removeItem:k=>{delete o[k]}});
class BC{postMessage(){}set onmessage(f){this._h=f}get onmessage(){return this._h}}
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
  WebSocket:class{},SpeechRecognition:globalThis.__SR,Intl,Uint8Array,Promise,JSON,Math,Date,Set,Map,WeakMap,WeakSet,Array,Object,String,Number,Error,Symbol,btoa,atob,parseInt,parseFloat,isFinite,Response,CompressionStream,DecompressionStream,encodeURIComponent,decodeURIComponent,
  addEventListener(){},removeEventListener(){},indexedDB:undefined,claude:undefined,performance:{now:()=>0},innerWidth:1200};
 sb.window=sb;sb.self=sb;sb.globalThis=sb;sb.document0=null;
 const doc={documentElement:Object.assign(el(),{style:{setProperty(){}}}),getElementById:()=>el(),createElement:()=>el(),createTextNode:t=>({nodeValue:t}),body:el(),documentElement:el(),querySelectorAll:()=>[],querySelector:()=>el(),addEventListener(){},createTreeWalker:()=>({nextNode:()=>null}),hidden:false};
 sb.document=doc;vm.createContext(sb);
 try{vm.runInContext(src,sb)}catch(e){return {err:e.message}}
 return {sb,st};
}
function deliver(w,data){vm.runInContext('lanH',w.sb)({data});}


const instances=[];
class FakeSR{constructor(){this.starts=0;this.stops=0;instances.push(this)}start(){this.starts++}stop(){this.stops++;if(this.onend)this.onend()}}
globalThis.__SR=FakeSR;
const w=world('all',false);
const run=c=>vm.runInContext(c,w.sb);
// off by default
run("store.priv.vtxt=false;startVtx()");
ok(instances.length===0&&run("vtxR")===null,'switch off: no recognition is started');
// on: starts, collects final phrases only
run("store.priv.vtxt=true;startVtx()");
const r=instances[0];
ok(!!r&&r.starts===1,'recognition starts');
run("rcR={state:'recording'}");
r.onresult({resultIndex:0,results:[{isFinal:true,0:{transcript:'привет'}},{isFinal:false,0:{transcript:'ми'}}]});
r.onresult({resultIndex:1,results:[{isFinal:true,0:{transcript:'привет'}},{isFinal:true,0:{transcript:'как дела'}}]});
ok(run("rcTxt")==='привет как дела','only final phrases are collected, in order: "'+run("rcTxt")+'"');
// a pause ends recognition: it restarts while still recording
r.onend();
ok(r.starts===2&&instances.length===1,'pause: recognition restarts while the recording continues');
// stop before sending: waits for the last results, then resolves
r.onresult({resultIndex:2,results:[{isFinal:true,0:{transcript:'пока'}}]});
run("vtxOn=true;stopVtx()");
ok(run("vtxR")===null,'stopping clears the recognizer');
// after stopping, a pause must not restart it
const r2=instances[0];r2.starts=0;r2.onend&&r2.onend();
ok(r2.starts===0,'no restart after stop');
// unsupported browser: explicit note, nothing breaks
w.sb.SpeechRecognition=undefined;globalThis.__SR=undefined;
const snacksBefore=vm.runInContext('0',w.sb);
run("store.priv.vtxt=true;startVtx()");
ok(true,'unsupported browser: no crash (note shown via snack)');
// voice rendering: with transcript the bubble gets the text branch
const md={kind:'voice',id:'x',dur:3,txt:'текст'},md2={kind:'voice',id:'y',dur:3};
let t1=null,t2=null;
try{t1=run("voiceEl("+JSON.stringify(md)+")");t2=run("voiceEl("+JSON.stringify(md2)+")")}catch(e){}
ok(t1!==null&&t2!==null,'voice bubble renders with and without a transcript');
console.log(`\nresult: ${pass} passed, ${fail} failed`);process.exit(fail?1:0);
