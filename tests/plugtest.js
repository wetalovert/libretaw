process.on('unhandledRejection',()=>{});
const fs=require('fs');
const src=fs.readFileSync('/tmp/main.js','utf8');
function grab(startMarker,endMarker){const i=src.indexOf(startMarker);const j=src.indexOf(endMarker,i);return src.slice(i,j)}
// pieces
const PERMS_SRC=grab("const PERMS=","const PSENS");
const PB_SRC=grab("const PB=function(){","function plugKey");
const PARSE_SRC=grab("function plugParse(","function plugSrcdoc");
const SRCDOC_SRC=grab("function plugSrcdoc(","function plugStart");
eval(PERMS_SRC+PB_SRC+PARSE_SRC+SRCDOC_SRC+";globalThis.__t={PB,plugParse,plugSrcdoc,PERMS}");
const T=globalThis.__t;
// 1. parse example files
for(const f of ['hello-bot.js','night-sky-theme.js','message-counter.js']){
  const t=fs.readFileSync('/mnt/user-data/outputs/plugins/'+f,'utf8');const p=T.plugParse(t);
  console.log(f,'->',p.id,p.permissions.join(','),p.code.length);
  const doc=T.plugSrcdoc(p);
  const nScripts=(doc.match(/<script>/g)||[]).length, nClose=(doc.match(/<\/script>/g)||[]).length;
  console.log('  srcdoc scripts',nScripts,nClose);
}
// bad manifests
for(const bad of ['no manifest','/* libretaw-plugin {oops} */','/* libretaw-plugin {"id":"x","name":"n"} */']){try{T.plugParse(bad);console.log('UNEXPECTED ok')}catch(e){console.log('rejects:',e.message)}}
// closing tag escaping
const evil=T.plugParse('/* libretaw-plugin {"id":"evil.plugin","name":"E"} */ var s="</script><img>";');
console.log('escaped:',!T.plugSrcdoc(evil).includes('"</script><img>"'));
// 2. run bootstrap in fake sandbox and talk to a fake host
const listeners=[];const sent=[];
const fakeParent={postMessage:(m)=>sent.push(m)};
globalThis.window={parent:fakeParent,addEventListener:(n,f)=>{if(n==='message')listeners.push(f)}, onerror:null};
const origAdd=window.addEventListener;
(0,eval)('('+T.PB.toString()+')()');globalThis.libretaw=globalThis.window.libretaw;
const hostReply=(i,v,err)=>listeners.forEach(f=>f({data:{ltw:1,k:'ret',i,v,err}}));
// plugin code: hello-bot
const code=fs.readFileSync('/mnt/user-data/outputs/plugins/hello-bot.js','utf8');
(0,eval)(code);
console.log('calls sent:',sent.map(x=>x.m+JSON.stringify(x.a)).join(' | '));
// simulate host answers: ready/cmd.add/toast OK; then command invocation
sent.forEach(m=>hostReply(m.i,true));
sent.length=0;
listeners.forEach(f=>f({data:{ltw:1,k:'cmd',n:'hello',args:'Вася',ctx:{chatId:'c1'}}}));
setTimeout(()=>{console.log('after /hello:',JSON.stringify(sent.map(x=>[x.m,x.a])));
 // event + permission error propagation
 const code2=fs.readFileSync('/mnt/user-data/outputs/plugins/message-counter.js','utf8');
 (0,eval)(code2);
 sent.length=0;
 listeners.forEach(f=>f({data:{ltw:1,k:'ev',n:'message',v:{text:'hi'}}}));
 setTimeout(()=>{console.log('after message event:',JSON.stringify(sent.map(x=>[x.m,x.a])));
  const last=sent[0];hostReply(last.i,undefined,'Нет разрешения: storage');
  setTimeout(()=>{console.log('error forwarded to log:',JSON.stringify(sent.slice(-1).map(x=>[x.m,x.a])))},10)},10)},10);
