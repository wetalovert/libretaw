const {spawn}=require('child_process');const fs=require('fs');const path=require('path');const os=require('os');
const DATA=fs.mkdtempSync(path.join(os.tmpdir(),'ltw-'));
const PORT=18080;
const srv=spawn('node',['/mnt/user-data/outputs/server/libretaw-server.js'],{env:{...process.env,LIBRETAW_DATA_KEY:'test-passphrase-123',PORT,LIBRETAW_TOKEN:'tok123',DATA_DIR:DATA,APP_FILE:'/mnt/user-data/outputs/libretaw.html',SERVER_NAME:'Test'}});
let out='';srv.stdout.on('data',d=>out+=d);srv.stderr.on('data',d=>out+=d);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let pass=0,fail=0;const ok=(c,m)=>{if(c){pass++;console.log('  ok  ',m)}else{fail++;console.log('  FAIL',m)}};
function client(){return new Promise((res,rej)=>{const ws=new WebSocket('ws://127.0.0.1:'+PORT+'/ws');const c={ws,msgs:[],closed:false,code:null};ws.onmessage=e=>c.msgs.push(JSON.parse(e.data));ws.onclose=e=>{c.closed=true;c.code=e.code};ws.onopen=()=>res(c);ws.onerror=e=>rej(e)})}
const send=(c,o)=>c.ws.send(JSON.stringify(o));
const A='LTW-AAAA-BBBB',B='LTW-CCCC-DDDD',C='LTW-EEEE-FFFF';
const SA='a'.repeat(32),SB='b'.repeat(32),SC='c'.repeat(32);
(async()=>{
 await sleep(700);
 // 1 http
 let r=await fetch('http://127.0.0.1:'+PORT+'/health');ok((await r.text())==='ok','health ok');
 r=await fetch('http://127.0.0.1:'+PORT+'/');const t=await r.text();ok(t.includes('<title>libretaw</title>'),'serves libretaw.html at /');
 r=await fetch('http://127.0.0.1:'+PORT+'/nope');ok(r.status===404,'404 for unknown path');
 // 2 wrong token
 let x=await client();send(x,{k:'hello',id:A,sec:SA,n:'A',token:'bad'});await sleep(400);ok(x.msgs.some(m=>m.k==='err'&&m.m==='auth')&&x.closed,'wrong token rejected');
 // 3 a,b online
 const a=await client(),b=await client(),c=await client();
 send(a,{k:'hello',id:A,sec:SA,n:'Alice',token:'tok123',gs:['GR1'],cs:['CH1']});
 send(b,{k:'hello',id:B,sec:SB,n:'Bob',token:'tok123',gs:['GR1'],cs:[]});
 send(c,{k:'hello',id:C,sec:SC,n:'Carol',token:'tok123',gs:[],cs:[]});
 await sleep(600);
 const w=a.msgs.find(m=>m.k==='welcome');ok(w&&w.name==='Test','welcome with server name');
 const pr=a.msgs.filter(m=>m.k==='presence').pop();ok(pr&&pr.users.length===3,'presence lists 3 users');
 // 4 direct message
 send(a,{k:'ev',mid:'m1',d:{to:B,from:A,m:{text:'привет',t:1}}});await sleep(300);
 let ev=b.msgs.find(m=>m.k==='ev'&&m.mid==='m1');ok(ev&&ev.src===A&&ev.d.m.text==='привет','direct message delivered with verified src');
 ok(!c.msgs.some(m=>m.k==='ev'),'third user did not get private message');
 // 5 spoof
 const nb=b.msgs.length;send(a,{k:'ev',mid:'m2',d:{to:B,from:C,m:{text:'fake'}}});await sleep(300);ok(b.msgs.length===nb,'spoofed from rejected');
 // 6 group routing
 send(a,{k:'ev',mid:'m3',d:{gpost:'GR1',m:{text:'grp'}}});await sleep(300);
 ok(b.msgs.some(m=>m.mid==='m3'),'group member received group post');ok(!c.msgs.some(m=>m.mid==='m3'),'non-member did not receive');ok(!a.msgs.some(m=>m.mid==='m3'),'sender not echoed');
 // 7 channel routing
 send(b,{k:'ev',mid:'m4',d:{chpost:'CH1',m:{text:'ch'}}});await sleep(300);ok(a.msgs.some(m=>m.mid==='m4'),'channel subscriber received post');
 // 8 broadcast (public room)
 send(a,{k:'ev',mid:'m5',d:{chat:'lan',m:{text:'all'}}});await sleep(300);ok(b.msgs.some(m=>m.mid==='m5')&&c.msgs.some(m=>m.mid==='m5'),'public room broadcast');
 // 9 offline queue
 b.ws.close();await sleep(300);
 send(a,{k:'ev',mid:'m6',d:{to:B,from:A,m:{text:'while offline'}}});await sleep(300);
 const b2=await client();send(b2,{k:'hello',id:B,sec:SB,n:'Bob',token:'tok123',gs:['GR1']});await sleep(500);
 ok(b2.msgs.some(m=>m.mid==='m6'),'offline message delivered after reconnect');
 // second reconnect must not redeliver
 b2.ws.close();await sleep(200);const b3=await client();send(b3,{k:'hello',id:B,sec:SB,n:'Bob',token:'tok123',gs:['GR1']});await sleep(500);ok(!b3.msgs.some(m=>m.mid==='m6'),'queued message not delivered twice');
 // 10 id hijack
 const h=await client();send(h,{k:'hello',id:A,sec:'z'.repeat(32),n:'Evil',token:'tok123'});await sleep(400);ok(h.msgs.some(m=>m.k==='err'&&m.m==='id')&&h.closed,'id hijack with wrong secret rejected');
 // 11 blobs
 const data=Buffer.alloc(50000,7);data[0]=1;data[49999]=9;const CH=24000,n=Math.ceil(data.length/CH);
 for(let i=0;i<n;i++)send(a,{k:'put',id:'m123abc',i,n,t:'image/jpeg',d:data.subarray(i*CH,(i+1)*CH).toString('base64')});
 await sleep(400);send(b3,{k:'mreq',id:'m123abc'});await sleep(400);
 const parts=b3.msgs.filter(m=>m.k==='mch'&&m.id==='m123abc').sort((p,q)=>p.i-q.i);
 const got=Buffer.concat(parts.map(p=>Buffer.from(p.d,'base64')));ok(parts.length===n&&got.equals(data)&&parts[0].t==='image/jpeg','blob upload/download round trip');
 send(b3,{k:'mreq',id:'../../etc/passwd'});await sleep(200);ok(!b3.msgs.some(m=>m.k==='mch'&&m.id==='../../etc/passwd'),'path traversal blocked');
 // 12 large message ok, oversize closes
 const big='x'.repeat(1000000);send(a,{k:'ev',mid:'m7',d:{to:C,from:A,m:{text:big}}});await sleep(600);ok(c.msgs.some(m=>m.mid==='m7'),'1 MB message delivered');
 // 13 info
 send(a,{k:'info'});await sleep(200);ok(a.msgs.filter(m=>m.k==='welcome').length>=2,'info request answered');
 // 14 restart persistence of users/queue
 console.log(`\nresult: ${pass} passed, ${fail} failed`);
 srv.kill('SIGTERM');await sleep(500);
 console.log('state file exists:',fs.existsSync(path.join(DATA,'state.json')),'blob file:',fs.existsSync(path.join(DATA,'blobs','m123abc')));
 process.exit(fail?1:0);
})().catch(e=>{console.log('ERR',e);console.log(out);srv.kill();process.exit(1)});
