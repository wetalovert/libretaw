const {spawn}=require('child_process');const fs=require('fs');const path=require('path');const os=require('os');const vm=require('vm');
const src=fs.readFileSync('/tmp/main.js','utf8');
const ROOT=fs.mkdtempSync(path.join(os.tmpdir(),'ltwdon-'));const DATAG=path.join(ROOT,'d');const PORT=18101;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let pass=0,fail=0;const ok=(c,m)=>{if(c){pass++;console.log('  ok  ',m)}else{fail++;console.log('  FAIL',m)}};
const H=spawn('node',['/mnt/user-data/outputs/server/libretaw-host.js'],{env:{...process.env,LIBRETAW_DATA_KEY:'test-passphrase-123',PORT:String(PORT),DATA_DIR:DATAG,BACKUP_DIR:path.join(ROOT,'b'),BACKUP_HOURS:'0',ADMIN_TOKEN:'adm',LIBRETAW_TOKEN:'pw',APP_FILE:'/nonexistent'}});
function between(a,b){const i=src.indexOf(a),j=src.indexOf(b,i);return src.slice(i,j)}
const early=src.split('\n').find(l=>l.startsWith('var lanP=new Map()'));
const b64line=src.split('\n').find(l=>l.startsWith('const b64='));const unb64line=src.split('\n').find(l=>l.startsWith('const unb64='));
const lanBlock=between('// ===== LAN (WebRTC','// ===== Плагины =====');const e2eBlock=between('// ===== Шифрование личных сообщений (сквозное) =====','// ===== Polls =====');
const groupBlock=between('// ===== Шифрование групп =====','// ===== Polls =====');
const srvBlock=between('// ===== Свой сервер =====',"let fxC=null,fxTxt='';");
function client(id,tok){const el0=()=>new Proxy(function(){},{get:(t,k)=>k==='style'?{}:k==='classList'?{add(){},remove(){},toggle(){},contains(){return false}}:(k==='firstChild'||k==='querySelector')?(k==='firstChild'?el0():()=>el0()):k==='children'?[]:k==='value'?'':k==='textContent'?'':()=>{},set:()=>true,apply:()=>undefined});
 const $=i=>el0();const store={net:'host',host:{url:'127.0.0.1:'+PORT,token:tok,auto:true},srv:{url:'',token:'',auto:true},profile:{id,name:id,emoji:'x',hue:1},chats:[],priv:{blocked:[]},pend:false};
 const sb={console,WebSocket,crypto:globalThis.crypto,location:{protocol:'http:'},setTimeout,clearTimeout,setInterval:()=>0,clearInterval,Blob,TextEncoder,TextDecoder,Uint8Array,Math,JSON,Date,Promise,Set,Map,Array,Object,String,Number,btoa,atob,Error,
  store,$,snack(){},setDonSettings(){},save(){},myId:()=>id,mGet:async()=>null,mPut:async()=>{},refreshRx(){},renderMode(){},tab(){},openPeerChat(){},mkSeg(){},qrSvg:()=>'',zipStr:async s=>new TextEncoder().encode(s),
  bc:null,document:{createElement:()=>el0(),body:{append(){}},querySelector(){return el0()}},pOnly:false,setTp(){},uid:'U-'+id,copyTxt(){},announceInc(){},chSyncAll(){},snack(){},musicSync(){},hostUi(){},devInfo:()=>({os:'Linux',br:'Chrome'})};
 sb.window=sb;vm.createContext(sb);
 vm.runInContext(early+'\n'+b64line+'\n'+unb64line+'\n'+lanBlock+'\n'+e2eBlock+'\n'+groupBlock+'\n'+srvBlock.replace("srvModeChanged();","")+'\nglobalThis.__x={srvConnect,srvStop,srvAdmin,get srvP(){return srvP},get msg(){return srvMsg},setTok(t){srvAdTok=t},get adm(){return srvP&&srvP.adm},get hk(){return srvP&&srvP.hk}};',sb);
 return sb.__x}
(async()=>{
 await sleep(900);
 const owner=client('LTW-AAAA-BBBB','pw');owner.setTok('adm');owner.srvConnect();await sleep(700);
 owner.srvAdmin('donate',{op:'add',kind:'crypto',label:'BTC',value:'bc1qtestwalletaddress0001'});await sleep(300);
 ok(owner.hk&&owner.hk.donate&&owner.hk.donate.items.length===1,'the owner adds a wallet from the app');
 owner.srvAdmin('donate',{op:'on'});await sleep(300);
 ok(owner.hk.donate.on===true,'the owner switches donations on');
 const u=client('LTW-CCCC-DDDD','pw');u.srvConnect();await sleep(700);
 ok(u.srvP&&u.srvP.info&&u.srvP.info.donate&&u.srvP.info.donate.items[0].value==='bc1qtestwalletaddress0001','a connected user sees the wallet');
 owner.srvAdmin('donate',{op:'off'});await sleep(300);
 const u2=client('LTW-EEEE-FFFF','pw');u2.srvConnect();await sleep(700);
 ok(u2.srvP&&u2.srvP.info&&!u2.srvP.info.donate,'with donations off, users see nothing');
 const st=require('fs').readFileSync(require('path').join(DATAG,'state.json'));
 ok(!st.toString('latin1').includes('bc1qtestwallet')&&st.slice(0,4).toString()==='LTWE','the wallet is encrypted on disk');
 console.log(`\nresult: ${pass} passed, ${fail} failed`);H.kill('SIGTERM');process.exit(fail?1:0);
})().catch(e=>{console.log('ERR',e);H.kill();process.exit(1)});
