// Режим «только через VPN» из переменных запуска: VPN_ONLY=1 VPN_NET=... на настоящем сервере.
const {spawn}=require('child_process');const fs=require('fs');const path=require('path');const os=require('os');
const SRV=process.env.LTW_SERVER||'/mnt/user-data/outputs/libretaw-src/server/libretaw-server.js';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));let pass=0,fail=0;const ok=(c,m)=>{if(c){pass++;console.log('  ok  ',m)}else{fail++;console.log('  FAIL',m)}};
function run(port,env){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ltwvpnenv-'));return spawn('node',[SRV],{env:{...process.env,PORT:String(port),LIBRETAW_DATA_KEY:'test-passphrase-123',DATA_DIR:dir,APP_FILE:'/x',...env}})}
function probe(port){return new Promise(res=>{const ws=new WebSocket('ws://127.0.0.1:'+port+'/ws');const msgs=[];let closed=null;ws.onmessage=e=>msgs.push(JSON.parse(String(e.data)));ws.onclose=e=>{closed=e.code};ws.onopen=()=>{ws.send(JSON.stringify({k:'hello',id:'LTW-ABCD-EFGH',sec:'s'.repeat(32),n:'x'}));setTimeout(()=>res({msgs,closed}),400)};ws.onerror=()=>res({msgs,closed:'err'})})}
(async()=>{
 // 1. VPN_ONLY with a network that does not contain 127.0.0.1: refused
 const a=run(18190,{VPN_ONLY:'1',VPN_NET:'10.8.0.0/24'});await sleep(800);
 const ra=await probe(18190);
 ok(ra.msgs.some(m=>m.k==='err'&&m.m==='vpn')&&ra.closed===4006,'VPN_ONLY=1 with 10.8.0.0/24 refuses a connection from outside the network');
 a.kill('SIGTERM');await sleep(200);
 // 2. VPN_ONLY with the network that contains the client: accepted
 const b=run(18191,{VPN_ONLY:'1',VPN_NET:'127.0.0.0/8'});await sleep(800);
 const rb=await probe(18191);
 ok(rb.msgs.some(m=>m.k==='welcome'),'VPN_ONLY=1 with 127.0.0.0/8 accepts a connection from inside the network');
 b.kill('SIGTERM');await sleep(200);
 // 3. VPN_ONLY without a valid network: the server refuses to start
 const c=run(18192,{VPN_ONLY:'1',VPN_NET:'не-сеть'});let cout='';c.stderr.on('data',d=>cout+=d);
 const code=await new Promise(r=>c.on('exit',r));
 ok(code===1&&cout.includes('VPN_NET'),'VPN_ONLY=1 without a valid VPN_NET does not start');
 console.log(`\nresult: ${pass} passed, ${fail} failed`);process.exit(fail?1:0);
})().catch(e=>{console.log('ERR',e);process.exit(1)});
