const fs=require('fs');const src=fs.readFileSync('/tmp/main.js','utf8');
function fn(name){const i=src.indexOf('function '+name+'(');if(i<0)throw new Error('no '+name);let d=0,j=src.indexOf('{',i);for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(d===0)return src.slice(i,k+1)}}}
function afn(name){const i=src.indexOf('async function '+name+'(');let d=0,j=src.indexOf('{',i);for(let k=j;k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'){d--;if(d===0)return src.slice(i,k+1)}}}
let sent=[],handled=[];
const ctx=`
function e2eTo(d){return d.to||''}
function isSrvNet(){return store.net==='srv'||store.net==='host'}
function srvQueue(){}
function srvUp(){}
function e2eExempt(){return true}
function groupOf(){return ''}
var ecPriv=null,e2eCache={};
var store={net:'mesh'};var lanP=new Map(),lanH=d=>handled.push(d.data),meshSeen=new Set(),meshNodes={},MESH_TTL=6;
function myId(){return 'ME'}
const lanWait={};
async function lanRaw(p,str){sent.push([p.id,JSON.parse(str)])}
function lanFetch(){}function lanServe(){}function lanChunk(){}function lanUi(){}
${fn('lanOn')}${fn('meshOn')}${fn('meshNote')}${fn('lanList')}${fn('lanTargets')}${fn('lanSendRaw')}${fn('lanSend')}${fn('lanIn')}
`;
eval(ctx+`
const A={id:'A',open:true,dc:{},key:'a'},B={id:'B',open:true,dc:{},key:'b'};lanP.set('a',A);lanP.set('b',B);
// 1 relay: event from A, originator A, ttl 6
lanIn(A,JSON.stringify({k:'ev',d:{chpost:'CH1',m:{text:'hi'},uid:'x'},mid:'m1',ttl:6,src:'A'}));
console.log('handled',handled.length,'forwarded to',sent.map(s=>s[0]+':ttl'+s[1].ttl+':src'+s[1].src).join(','));
// 2 duplicate ignored
sent.length=0;handled.length=0;lanIn(B,JSON.stringify({k:'ev',d:{chpost:'CH1',m:{text:'hi'},uid:'x'},mid:'m1',ttl:5,src:'A'}));
console.log('dup -> handled',handled.length,'forwarded',sent.length);
// 3 spoof: first hop claims src=Z but p is A
lanIn(A,JSON.stringify({k:'ev',d:{from:'Z',to:'ME'},mid:'m2',ttl:6,src:'Z'}));
console.log('spoof -> handled',handled.length);
// 4 relayed (ttl 4) from B with src A, from matches src -> accepted & forwarded to A
sent.length=0;lanIn(B,JSON.stringify({k:'ev',d:{from:'A',to:'ME'},mid:'m3',ttl:4,src:'A'}));
console.log('relayed ok -> handled',handled.length,'fwd',sent.map(s=>s[0]+':ttl'+s[1].ttl).join(','));
// 5 inconsistent from vs src on relayed
const h=handled.length;lanIn(B,JSON.stringify({k:'ev',d:{from:'Q',to:'ME'},mid:'m4',ttl:4,src:'A'}));console.log('inconsistent -> handled delta',handled.length-h);
// 6 ttl 0: processed but not forwarded
sent.length=0;lanIn(B,JSON.stringify({k:'ev',d:{x:1},mid:'m5',ttl:0,src:'A'}));console.log('ttl0 -> forwarded',sent.length);
// 7 not mesh mode: no relay
store.net='lan';sent.length=0;lanIn(A,JSON.stringify({k:'ev',d:{x:2},mid:'m6',ttl:6,src:'A'}));console.log('lan mode -> forwarded',sent.length);
// 8 sending in mesh mode floods to all peers; in lan mode filtered
store.net='mesh';sent.length=0;lanSend({chpost:'CHX',m:{text:'a'}});console.log('mesh send targets',sent.map(s=>s[0]).join(','),'ttl',sent[0][1].ttl,'src',sent[0][1].src);
store.net='lan';sent.length=0;lanSend({chpost:'CHX',m:{text:'a'}});console.log('lan send targets (no peer has chat)',sent.length);
// 9 own echo is ignored (mid seen)
const mid=sent.length?0:0;
`);
