const {spawn}=require('child_process');const fs=require('fs');const path=require('path');const os=require('os');
const DATA=fs.mkdtempSync(path.join(os.tmpdir(),'ltw3-'));const PORT=18082;
process.env.LIBRETAW_DATA_KEY='test-passphrase-123';process.env.DATA_DIR=DATA;const core=require('/mnt/user-data/outputs/server/libretaw-server.js');
const env={...process.env,LIBRETAW_DATA_KEY:'test-passphrase-123',MAX_FAILS:'8',PORT,LIBRETAW_TOKEN:'static1',DYNAMIC_PASSWORD:'1',ADMIN_TOKEN:'adm',DATA_DIR:DATA,APP_FILE:'/x'};
let srv=spawn('node',['/mnt/user-data/outputs/server/libretaw-server.js'],{env});let out='';srv.stdout.on('data',d=>out+=d);srv.stderr.on('data',d=>out+=d);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));let pass=0,fail=0;const ok=(c,m)=>{if(c){pass++;console.log('  ok  ',m)}else{fail++;console.log('  FAIL',m)}};
function client(){return new Promise((res,rej)=>{const ws=new WebSocket('ws://127.0.0.1:'+PORT+'/ws');const c={ws,msgs:[],closed:false,code:null};ws.onmessage=e=>c.msgs.push(JSON.parse(e.data));ws.onclose=e=>{c.closed=true;c.code=e.code};ws.onopen=()=>res(c);ws.onerror=e=>rej(e)})}
const send=(c,o)=>c.ws.send(JSON.stringify(o));
const otp=()=>core.readData(path.join(DATA,'current-password.txt')).toString().trim();
const id=n=>'LTW-'+n.repeat(4)+'-'+n.repeat(4);
const sec=n=>n.repeat(32);
const has=(c,k,m)=>c.msgs.find(x=>x.k===k&&(m===undefined||x.m===m));
(async()=>{
 await sleep(800);
 const o1=otp();ok(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(o1),'one-time password generated (format XXXX-XXXX): '+o1);
 // no password
 let c=await client();send(c,{k:'hello',id:id('A'),sec:sec('a'),n:'A'});await sleep(300);ok(has(c,'err','auth')&&has(c,'err','auth').o===true&&c.closed,'no password rejected (flag says dynamic is on)');
 // static token still works
 c=await client();send(c,{k:'hello',id:id('B'),sec:sec('b'),n:'B',token:'static1'});await sleep(300);ok(has(c,'welcome')&&has(c,'welcome').via==='token','static password still works');
 ok(otp()===o1,'static password does not consume one-time password');
 // OTP works once
 let u1=await client();send(u1,{k:'hello',id:id('C'),sec:sec('c'),n:'Carol',token:o1.toLowerCase().replace('-',' ')});await sleep(300);
 ok(has(u1,'welcome')&&has(u1,'welcome').via==='otp','one-time password accepted (case/format tolerant)');
 const o2=otp();ok(o2!==o1,'new one-time password generated after use: '+o2);
 // reuse of consumed password fails
 let u2=await client();send(u2,{k:'hello',id:id('D'),sec:sec('d'),n:'Dan',token:o1});await sleep(300);ok(has(u2,'err','auth')&&u2.closed,'consumed password no longer works');
 // next person uses new password
 u2=await client();send(u2,{k:'hello',id:id('D'),sec:sec('d'),n:'Dan',token:o2});await sleep(300);ok(has(u2,'welcome')&&has(u2,'welcome').via==='otp','next person enters the new password');
 const o3=otp();ok(o3!==o2&&o3!==o1,'and again a fresh password: '+o3);
 // enrolled device reconnects without password
 u1.ws.close();await sleep(200);
 u1=await client();send(u1,{k:'hello',id:id('C'),sec:sec('c'),n:'Carol'});await sleep(300);ok(has(u1,'welcome')&&has(u1,'welcome').via==='enrolled','enrolled device reconnects without a password');
 ok(otp()===o3,'reconnect does not consume the password');
 // same id with another secret rejected even with valid password
 const h=await client();send(h,{k:'hello',id:id('C'),sec:sec('z'),n:'Evil',token:o3});await sleep(300);ok(has(h,'err','id'),'id hijack rejected');ok(otp()===o3,'failed hijack did not burn the password');
 // re-hello on same connection with stale token must not kick
 send(u1,{k:'hello',id:id('C'),sec:sec('c'),n:'Carol',token:'stale',gs:['G1']});await sleep(300);ok(!u1.closed,'periodic re-hello with stale token keeps the connection');
 // admin
 send(u1,{k:'admin',t:'wrong',a:'status'});await sleep(200);ok(has(u1,'admin')&&u1.msgs.filter(x=>x.k==='admin').pop().e==='denied','admin with wrong token denied');
 send(u1,{k:'admin',t:'adm',a:'status'});await sleep(200);let a=u1.msgs.filter(x=>x.k==='admin').pop();ok(a.ok&&a.dyn===true&&a.otp===o3&&a.users.length>=3,'admin status shows current password and users');
 send(u1,{k:'admin',t:'adm',a:'rotate'});await sleep(200);a=u1.msgs.filter(x=>x.k==='admin').pop();ok(a.otp!==o3&&a.otp===otp(),'admin rotate gives a new password');
 // revoke Dan
 send(u1,{k:'admin',t:'adm',a:'revoke',id:id('D')});await sleep(300);ok(u2.closed&&has(u2,'err','revoked'),'revoked device is disconnected');
 u2=await client();send(u2,{k:'hello',id:id('D'),sec:sec('d'),n:'Dan'});await sleep(300);ok(has(u2,'err','auth'),'revoked device cannot return without a password');
 // disable dynamic
 send(u1,{k:'admin',t:'adm',a:'dyn',v:false});await sleep(300);a=u1.msgs.filter(x=>x.k==='admin').pop();ok(a.dyn===false&&a.otp==='','admin can turn dynamic password off');
 ok(!fs.existsSync(path.join(DATA,'current-password.txt')),'password file removed when off');
 const o4='AAAA-AAAA';let x=await client();send(x,{k:'hello',id:id('E'),sec:sec('e'),n:'E',token:o4});await sleep(300);ok(has(x,'err','auth')&&has(x,'err','auth').o===false,'old style: wrong password rejected, flag off');
 x=await client();send(x,{k:'hello',id:id('E'),sec:sec('e'),n:'E',token:'static1'});await sleep(300);ok(has(x,'welcome'),'static password works with dynamic off');
 // enrolled user still allowed after dynamic off (documented)
 u2=await client();send(u2,{k:'hello',id:id('C'),sec:sec('c'),n:'Carol'});await sleep(300);ok(has(u2,'welcome')&&has(u2,'welcome').via==='enrolled','already enrolled devices keep access when dynamic is off');
 // turn back on
 send(u1,{k:'admin',t:'adm',a:'dyn',v:true});await sleep(300);ok(fs.existsSync(path.join(DATA,'current-password.txt')),'dynamic password turned on again');
 // brute-force ban: 5 failures from this ip
 for(let i=0;i<8;i++){const b=await client();send(b,{k:'hello',id:id('F'),sec:sec('f'),n:'F',token:'bad'+i});await sleep(120)}
 const b2=await client();send(b2,{k:'hello',id:id('F'),sec:sec('f'),n:'F',token:otp()});await sleep(300);ok(has(b2,'err','ban')&&b2.closed,'ip blocked after repeated wrong passwords (even with the right one)');
 console.log(`\nresult: ${pass} passed, ${fail} failed`);
 srv.kill('SIGTERM');await sleep(400);
 // restart: persisted dyn setting + enrolled users
 srv=spawn('node',['/mnt/user-data/outputs/server/libretaw-server.js'],{env:{...env,DYNAMIC_PASSWORD:'0'}});let out2='';srv.stdout.on('data',d=>out2+=d);await sleep(900);
 console.log('after restart output has dynamic ON (state overrides env):',/ВКЛЮЧЁН/.test(out2));
 srv.kill();process.exit(fail?1:0);
})().catch(e=>{console.log('ERR',e);console.log(out);srv.kill();process.exit(1)});
