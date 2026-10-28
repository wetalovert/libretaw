// Реальный серверный процесс: владелец пишет историю канала, подписчик читает её, посторонний писать не может.
const {spawn}=require('child_process');const fs=require('fs');const path=require('path');const os=require('os');
const DATA=fs.mkdtempSync(path.join(os.tmpdir(),'ltwsync-'));const PORT=18150;
const srv=spawn('node',['/mnt/user-data/outputs/libretaw-src/server/libretaw-server.js'],{env:{...process.env,PORT:String(PORT),LIBRETAW_TOKEN:'pw',LIBRETAW_DATA_KEY:'test-passphrase-123',DATA_DIR:DATA,APP_FILE:'/x'}});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));let pass=0,fail=0;const ok=(c,m)=>{if(c){pass++;console.log('  ok  ',m)}else{fail++;console.log('  FAIL',m)}};
function client(id){return new Promise((res,rej)=>{const ws=new WebSocket('ws://127.0.0.1:'+PORT+'/ws');const c={ws,msgs:[],id};ws.onmessage=e=>c.msgs.push(JSON.parse(e.data));ws.onopen=()=>{ws.send(JSON.stringify({k:'hello',id,sec:'s'.repeat(32),n:id,token:'pw'}));setTimeout(()=>res(c),300)};ws.onerror=rej})}
const send=(c,o)=>c.ws.send(JSON.stringify(o));
const last=(c,k)=>c.msgs.filter(m=>m.k===k).pop();
(async()=>{
 await sleep(700);
 const OWN=await client('LTW-AAAA-BBBB'),SUB=await client('LTW-CCCC-DDDD'),BAD=await client('LTW-EEEE-FFFF');
 const chid='CH-TEST-0001';
 send(OWN,{k:'chsync',chid,posts:[{id:'p1',t:100,text:'Пост один',fname:'Владелец'},{id:'p2',t:200,text:'Пост два',fname:'Владелец'}]});
 await sleep(300);
 ok(last(OWN,'chsync')&&last(OWN,'chsync').ok===1&&last(OWN,'chsync').n===2,'owner uploads the channel history');
 send(BAD,{k:'chsync',chid,posts:[{id:'x',t:300,text:'подделка',fname:'Чужой'}]});
 await sleep(300);
 ok(last(BAD,'chsync').ok===0&&last(BAD,'chsync').e==='not-owner','someone else cannot write into the channel history');
 send(SUB,{k:'chget',chid,since:0});
 await sleep(300);
 const got=last(SUB,'chget');
 ok(got&&got.posts.length===2&&got.posts[1].text==='Пост два','a subscriber reads the history');
 send(SUB,{k:'chget',chid,since:150});
 await sleep(300);
 ok(last(SUB,'chget').posts.length===1,'reading since a timestamp returns only newer posts');
 send(SUB,{k:'chget',chid:'../../etc',since:0});
 await sleep(200);
 ok(last(SUB,'chget').posts.length===0,'a malformed channel id is refused');
 send(OWN,{k:'chsync',chid,posts:[{id:'p3',t:300,text:'Пост три',fname:'Владелец'}]});
 await sleep(300);
 send(SUB,{k:'chget',chid,since:0});await sleep(300);
 ok(last(SUB,'chget').posts.length===3,'new posts are added to the history (not replaced)');
 console.log(`\nresult: ${pass} passed, ${fail} failed`);srv.kill('SIGTERM');process.exit(fail?1:0);
})().catch(e=>{console.log('ERR',e);srv.kill();process.exit(1)});
