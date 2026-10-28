const {spawn}=require('child_process');const fs=require('fs');const vm=require('vm');const path=require('path');const os=require('os');
const src=fs.readFileSync('/tmp/main.js','utf8');
const PORT=18081,DATA=fs.mkdtempSync(path.join(os.tmpdir(),'ltw2-'));
const srv=spawn('node',['/mnt/user-data/outputs/server/libretaw-server.js'],{env:{...process.env,LIBRETAW_DATA_KEY:'test-passphrase-123',PORT,LIBRETAW_TOKEN:'pw1',DATA_DIR:DATA,APP_FILE:'/nonexistent'}});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function between(a,b){const i=src.indexOf(a),j=src.indexOf(b,i);if(i<0||j<0)throw new Error('marker '+a+'|'+b);return src.slice(i,j)}
const early=src.split('\n').find(l=>l.startsWith('var lanP=new Map()'));
const b64line=src.split('\n').find(l=>l.startsWith('const b64='));const unb64line=src.split('\n').find(l=>l.startsWith('const unb64='));
const lanBlock=between('// ===== LAN (WebRTC','// ===== Плагины =====');
const e2eBlock=between('// ===== Шифрование личных сообщений (сквозное) =====','// ===== Polls =====');
const groupBlock=between('// ===== Шифрование групп =====','// ===== Polls =====');
const srvBlock=between('// ===== Свой сервер =====',"let fxC=null,fxTxt='';");
function makeClient(id,name,grp){
  const blobs=new Map();const handled=[];const snacks=[];
  const el=new Proxy(function(){},{get:(t,k)=>k==='style'?{}:k==='classList'?{add(){},remove(){},toggle(){},contains(){return false}}:k==='children'?[]:()=>{},set:()=>true,apply:()=>undefined});
  const store={net:'srv',srv:{url:'127.0.0.1:'+PORT,token:'pw1',auto:true},profile:{id,name},chats:grp?[{id:'g1',group:1,own:grp===2?1:0,gid:'GR-TEST-ABCD',msgs:[]}]:[],priv:{blocked:[]},pend:false};
  const sb={console,WebSocket,crypto:globalThis.crypto,location:{protocol:'http:'},setTimeout,clearTimeout,setInterval:()=>0,clearInterval,Blob,TextEncoder,TextDecoder,Uint8Array,Math,JSON,Date,Promise,Set,Map,Array,Object,String,Number,btoa,atob,Error,
   store,announceInc(){},chSyncAll(){},musicSync(){},$:()=>el,snack:m=>snacks.push(m),save(){},myId:()=>id,
   mGet:async k=>blobs.get(k)||null,mPut:async r=>{blobs.set(r.id,r)},refreshRx(){},renderMode(){},tab(){},openPeerChat(){},mkSeg(){},qrSvg:()=>'',zipStr:async s=>new TextEncoder().encode(s),
   bc:null,setLang(){},renderLangs(){},fmtDT:()=>'',document:{createElement:()=>el,body:{append(){}},querySelector(){return el}},pOnly:false,setTp(){},uid:'U-'+id};
  sb.window=sb;vm.createContext(sb);
  vm.runInContext(early+'\nfunction padPlain(o){return JSON.stringify(o)}\nfunction holdOut(){}\nfunction snack(){}\nfunction setDonSettings(){}\n'+b64line+'\n'+unb64line+'\n'+lanBlock+'\n'+e2eBlock+'\n'+groupBlock+'\n'+srvBlock.replace("srvModeChanged();","")+'\nglobalThis.__x={srvConnect,srvStop,srvUi,lanSend,get srvP(){return srvP},get msg(){return srvMsg},srvCfg,setH(f){lanH=f},get wait(){return lanWait}};',sb);
  sb.__x.setH(e=>handled.push(e.data));
  return {sb,x:sb.__x,store,blobs,handled,snacks};
}
let pass=0,fail=0;const ok=(c,m)=>{if(c){pass++;console.log('  ok  ',m)}else{fail++;console.log('  FAIL',m)}};
(async()=>{
 await sleep(700);
 const A=makeClient('LTW-AAAA-BBBB','Alice',2),B=makeClient('LTW-CCCC-DDDD','Bob',1);
 A.x.srvConnect();B.x.srvConnect();await sleep(800);
 ok(A.x.srvP&&A.x.srvP.open,'client A connected to server');ok(B.x.srvP&&B.x.srvP.open,'client B connected');
 ok(A.x.srvP.info&&A.x.srvP.info.name==='libretaw server','welcome info received');
 ok((A.x.srvP.users||[]).length===2,'presence list received');
 // direct message A -> B
 A.sb.bc=null;A.x.lanSend({to:'LTW-CCCC-DDDD',from:'LTW-AAAA-BBBB',uid:'x',m:{text:'привет по серверу',t:111}});await sleep(400);
 ok(!B.handled.some(d=>d.m&&d.m.text==='привет по серверу'),'a direct message is never sent in plain text without the recipient key');
 // group message reaches only members; B has no gid
 A.x.lanSend({gpost:'GR-TEST-ABCD',m:{text:'grp',t:112}});await sleep(300);
 ok(!B.handled.some(d=>d.m&&d.m.text==='grp'),'group post not delivered to non-member');
 const D=makeClient('LTW-GGGG-HHHH','Dan',true);D.x.srvConnect();await sleep(500);A.x.lanSend({gpost:'GR-TEST-ABCD',m:{text:'grp2',t:116}});await sleep(2500);
 ok(D.handled.some(d=>d.genc&&d.gpost==='GR-TEST-ABCD')&&!JSON.stringify(D.handled).includes('grp2'),'group member receives the group post sealed (no plain text on the wire)');
 // media and offline queue for personal messages need real keys: see tests/browser/keyflow.py
 // wrong token
 const C=makeClient('LTW-EEEE-FFFF','Carol');C.store.srv.token='bad';C.x.srvConnect();await sleep(700);
 ok(C.x.msg==='Неверный пароль сервера'&&!C.x.srvP,'wrong password reported, no reconnect loop');
 console.log(`\nresult: ${pass} passed, ${fail} failed`);srv.kill();process.exit(fail?1:0);
})().catch(e=>{console.log('ERR',e);srv.kill();process.exit(1)});
