(function(root){
'use strict';
const te=new TextEncoder(),td=new TextDecoder();
const b64url=bytes=>{let s='';for(let i=0;i<bytes.length;i+=32768)s+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');};
const unb64=s=>{const raw=atob(s.replace(/-/g,'+').replace(/_/g,'/')+'==='.slice((s.length+3)%4)),out=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out;};
const digest=async s=>new Uint8Array(await crypto.subtle.digest('SHA-256',te.encode(s)));
async function identity(code){if(!/^[A-Za-z0-9_-]{43}$/.test(code))throw Error('Código de sincronização inválido.');const vault=await digest(code+':vault'),auth=await digest(code+':auth');return {vaultId:[...vault.slice(0,16)].map(x=>x.toString(16).padStart(2,'0')).join(''),auth:b64url(auth)};}
async function key(code){return crypto.subtle.importKey('raw',await digest(code+':encryption'),{name:'AES-GCM'},false,['encrypt','decrypt']);}
async function encrypt(value,code){const iv=crypto.getRandomValues(new Uint8Array(12)),cipher=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},await key(code),te.encode(JSON.stringify(value)))),joined=new Uint8Array(iv.length+cipher.length);joined.set(iv);joined.set(cipher,iv.length);const encoded=b64url(joined),chunks=[];for(let i=0;i<encoded.length;i+=500000)chunks.push(encoded.slice(i,i+500000));return chunks;}
async function decrypt(chunks,code){try{const joined=unb64(chunks.join('')),iv=joined.slice(0,12),plain=await crypto.subtle.decrypt({name:'AES-GCM',iv},await key(code),joined.slice(12));return JSON.parse(td.decode(plain));}catch{throw Error('Não foi possível decifrar a biblioteca. Confira o código de sincronização.');}}
function stable(items,tagCatalog){return {format:'mural',version:2,kind:'backup',tagCatalog:[...tagCatalog].sort(),items:[...items].sort((a,b)=>a.id.localeCompare(b.id))};}
async function fingerprint(value){return b64url(await digest(JSON.stringify(value)));}
function merge(remote,local){
 const map=new Map((remote.items||[]).map(i=>[i.id,i]));
 for(const right of local.items||[]){const left=map.get(right.id);if(!left){map.set(right.id,right);continue;}const newer=(right.modifiedAt||'')>(left.modifiedAt||'')?right:left;map.set(right.id,{...left,...right,text:(right.text||'').length>=(left.text||'').length?right.text:left.text,images:right.images?.length?right.images:left.images,tags:newer.tags||[],note:newer.note||'',read:newer.read===true,favorite:newer.favorite===true,archived:newer.archived===true,modifiedAt:newer.modifiedAt||''});}
 return stable([...map.values()],[...new Set([...(remote.tagCatalog||[]),...(local.tagCatalog||[]),...[...map.values()].flatMap(i=>i.tags||[])])]);
}
function generateCode(){return b64url(crypto.getRandomValues(new Uint8Array(32)));}
const api={identity,encrypt,decrypt,stable,fingerprint,merge,generateCode};if(typeof module!=='undefined')module.exports=api;else root.MuralSync=api;
})(globalThis);
