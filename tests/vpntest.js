// Режимы доступа на настоящем сервере: «только через VPN» и «пароль не обязателен».
const {spawn}=require('child_process');const fs=require('fs');const path=require('path');const os=require('os');
const DATA=fs.mkdtempSync(path.join(os.tmpdir(),'ltwvpn-'));const PORT=18180;
const SRV=process.env.LTW_SERVER||'/mnt/user-data/outputs/libretaw-src/server/libretaw-server.js';
const srv=spawn('node',[SRV],{env:{...process.env,PORT:String(PORT),LIBRETAW_TOKEN:'pw',ADMIN_TOKEN:'adm',LIBRETAW_DATA_KEY:'test-passphrase-123',DATA_DIR:DATA,APP_FILE:'/x'}});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));let pass=0,fail=0;const ok=(c,m)=>{if(c){pass++;console.log('  ok  ',m)}else{fail++;console.log('  FAIL',m)}};
function conn(hello){return new Promise((res,rej)=>{const ws=new WebSocket('ws://127.0.0.1:'+PORT+'/ws');const c={ws,msgs:[],closed:null};ws.onmessage=e=>c.msgs.push(JSON.parse(String(e.data)));ws.onclose=e=>{c.closed=e.code};ws.onopen=()=>{ws.send(JSON.stringify(hello));setTimeout(()=>res(c),350)};ws.onerror=rej})}
const welcome=c=>c.msgs.find(m=>m.k==='welcome');
const errOf=c=>c.msgs.find(m=>m.k==='err');
const hello=(id,token)=>({k:'hello',id,sec:'s'.repeat(32),n:id,token});
(async()=>{
 await sleep(700);
 // 1. password is required by default
 const noTok=await conn(hello('LTW-AAAA-BBBB',undefined));
 ok(!welcome(noTok)&&errOf(noTok)&&errOf(noTok).m==='auth','with a password set, a connection without it is refused');
 const withTok=await conn(hello('LTW-AAAA-BBBB','pw'));
 ok(!!welcome(withTok),'with the right password the connection is accepted');
 ok(welcome(withTok)&&welcome(withTok).cfg.passOff===false,'the welcome says the password is required');
 // 2. the app cannot remove a password the owner set
 const A=await conn({k:'hello',id:'LTW-ADMN-PQRS',sec:'s'.repeat(32),n:'adm',token:'pw'});
 send(A,{k:'admin',t:'adm',a:'pass',v:false});await sleep(250);
 ok(A.msgs.some(m=>m.k==='admin'&&m.ok===false&&m.e==='locked'),'the app cannot turn off a password the owner set');
 const stillLocked=await conn(hello('LTW-CCCC-DDDD',undefined));
 ok(!welcome(stillLocked)&&errOf(stillLocked)&&errOf(stillLocked).m==='auth','a connection without the owner password is still refused');
 ok(welcome(withTok)&&welcome(withTok).cfg.passLocked===true,'the welcome tells the app the password is locked');
 // 4. VPN-only: a bad network is refused by the admin
 send(A,{k:'admin',t:'adm',a:'vpn',v:true,net:'not-a-network'});await sleep(250);
 const bad=A.msgs.filter(m=>m.k==='admin'&&m.ok===false&&m.e==='bad-net');
 ok(bad.length===1,'VPN-only with an invalid network is refused by the server');
 // 5. VPN-only with a network that does NOT contain 127.0.0.1: connections are refused
 send(A,{k:'admin',t:'adm',a:'vpn',v:true,net:'10.8.0.0/24'});await sleep(250);
 const outside=await conn(hello('LTW-GGGG-HHHH','pw'));
 ok(!welcome(outside)&&errOf(outside)&&errOf(outside).m==='vpn','a connection from outside the VPN network is refused with the VPN message');
 ok(outside.closed===4006,'the refused connection is closed with the VPN code');
 // 6. VPN-only with the network that contains the client: accepted
 send(A,{k:'admin',t:'adm',a:'vpn',v:true,net:'127.0.0.0/8'});await sleep(250);
 const inside=await conn(hello('LTW-IIII-JJJJ','pw'));
 ok(!!welcome(inside),'a connection from inside the VPN network is accepted');
 // 7. VPN-only is turned off again: outside connections are accepted
 send(A,{k:'admin',t:'adm',a:'vpn',v:false,net:''});await sleep(250);
 const back=await conn(hello('LTW-KKKK-LLLL','pw'));
 ok(!!welcome(back),'turning VPN-only off accepts connections again');
 // 8. a server the owner started WITHOUT a password accepts connections without one
 const P2=spawn('node',[SRV],{env:{...process.env,PORT:String(PORT+1),DATA_DIR:fs.mkdtempSync(path.join(os.tmpdir(),'ltwvpn2-')),LIBRETAW_DATA_KEY:'test-passphrase-123',APP_FILE:'/x'}});
 await sleep(700);
 const openConn=await new Promise((res)=>{const ws=new WebSocket('ws://127.0.0.1:'+(PORT+1)+'/ws');const c={msgs:[]};ws.onmessage=e=>c.msgs.push(JSON.parse(String(e.data)));ws.onopen=()=>{ws.send(JSON.stringify(hello('LTW-MMMM-NNNN',undefined)));setTimeout(()=>res(c),350)};ws.onerror=()=>res(c)});
 ok(!!welcome(openConn),'a server without an owner password accepts a connection without one');
 ok(welcome(openConn)&&welcome(openConn).cfg.passOff===true&&welcome(openConn).cfg.passLocked===false,'the welcome says the password is not set by the owner');
 P2.kill('SIGTERM');
 console.log(`\nresult: ${pass} passed, ${fail} failed`);srv.kill('SIGTERM');process.exit(fail?1:0);
})().catch(e=>{console.log('ERR',e);srv.kill();process.exit(1)});
function send(c,o){c.ws.send(JSON.stringify(o))}
