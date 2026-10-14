(function(root){
'use strict';
const str=(v,n=20000)=>typeof v==='string'?v.slice(0,n):'';
const cleanTags=v=>Array.isArray(v)?[...new Set(v.map(x=>str(x,60).trim()).filter(Boolean))].slice(0,30):[];
const cleanCatalog=v=>Array.isArray(v)?[...new Set(v.map(x=>str(x,60).trim()).filter(Boolean))].slice(0,500):[];
const linkId=(url,description='')=>{let h=2166136261;for(const c of (String(url).trim().toLowerCase()+'\u001f'+String(description).trim().toLowerCase())){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return 'link:'+('00000000'+(h>>>0).toString(16)).slice(-8)+':'+String(url).length.toString(36);};
function normalizeLink(raw){
 if(!raw||typeof raw!=='object')throw Error('Link inválido.');
 const url=str(raw.url,8000).trim(),description=str(raw.description,2000).trim(),id=/^link:[a-z0-9:-]{4,80}$/i.test(str(raw.id,100))?str(raw.id,100):linkId(url,description);
 if(!url&&!description)throw Error('Um link está vazio.');
 return {id,url,description,note:str(raw.note),category:str(raw.category,120).trim(),subcategory:str(raw.subcategory,120).trim(),sheetRow:Number.isInteger(raw.sheetRow)&&raw.sheetRow>1?raw.sheetRow:null,createdAt:str(raw.createdAt,40)||new Date().toISOString(),modifiedAt:str(raw.modifiedAt,40),sheetStatus:['imported','synced','pending','error'].includes(raw.sheetStatus)?raw.sheetStatus:'pending'};
}
function normalize(raw, annotations=false){
 if(!raw||typeof raw!=='object') throw Error('Item inválido.');
 const source=raw.source==='reddit'||String(raw.id).startsWith('reddit:')?'reddit':'x';
 if(!(source==='reddit'?/^(?:reddit:)?t[13]_[a-z0-9]{1,20}$/:/^\d{1,25}$/).test(String(raw.id))) throw Error('Um item tem ID inválido. Nenhum dado foi importado.');
 const id=source==='reddit'?'reddit:'+String(raw.id).replace(/^reddit:/,''):String(raw.id), text=str(raw.text), handle=str(raw.handle,80).replace(/^@/,'');
 const images=Array.isArray(raw.images)?raw.images.map(x=>{try{const u=new URL(x);if(u.protocol!=='https:'||!['pbs.twimg.com','i.redd.it','preview.redd.it','external-preview.redd.it','a.thumbs.redditmedia.com','b.thumbs.redditmedia.com'].includes(u.hostname))return '';if(u.hostname!=='pbs.twimg.com')return u.href;if(!u.searchParams.has('format')&&!/\.(?:jpe?g|png|webp|gif)$/i.test(u.pathname))u.searchParams.set('format','jpg');u.searchParams.set('name','medium');return u.href;}catch{return '';}}).filter(Boolean).slice(0,8):[];
 let url=`https://x.com/${/^[a-zA-Z0-9_]+$/.test(handle)?handle:'i'}/status/${id}`;
 if(source==='reddit'){try{const u=new URL(raw.url);if(u.protocol!=='https:'||!['reddit.com','www.reddit.com','old.reddit.com'].includes(u.hostname)||!u.pathname.includes('/comments/'))throw Error();u.hostname='www.reddit.com';u.search='';u.hash='';url=u.href;}catch{throw Error('Link de post/comentário Reddit inválido.');}}
 return {id,source,title:str(raw.title,1000),subreddit:str(raw.subreddit,100).replace(/^r\//,''),kind:source==='reddit'&&id.startsWith('reddit:t1_')?'comment':'post',text,author:str(raw.author,150)||handle||'Autor',handle,url,images,
 type:raw.type==='video'?'video':images.length?'image':'text',date:str(raw.date,40),capturedAt:str(raw.capturedAt,40)||new Date().toISOString(),truncated:raw.truncated===true,
 tags:annotations?cleanTags(raw.tags):[],note:annotations?str(raw.note):'',read:annotations&&raw.read===true,favorite:annotations&&raw.favorite===true,archived:annotations&&raw.archived===true,inbox:annotations&&raw.inbox===true,modifiedAt:annotations?str(raw.modifiedAt,40):''};
}
function mergeLinks(existing,incoming){const map=new Map(existing.map(x=>[x.id,x]));let added=0,updated=0;for(const raw of incoming){const link=normalizeLink(raw),old=map.get(link.id);if(!old){map.set(link.id,link);added++;continue;}const newer=(link.modifiedAt||'')>(old.modifiedAt||'')?link:old;map.set(link.id,{...old,...link,...newer,sheetRow:old.sheetRow||link.sheetRow,sheetStatus:old.sheetStatus==='synced'?'synced':link.sheetStatus});updated++;}return {links:[...map.values()],added,updated};}
function parse(input){
 const obj=typeof input==='string'?JSON.parse(input):input;
 if(!obj||!((obj.format==='mural-x'&&obj.version===1)||(obj.format==='mural'&&[2,3].includes(obj.version)))||!Array.isArray(obj.items)) throw Error('Use um arquivo Mural (.json) exportado pela extensão ou pelo app.');
 if(obj.items.length>50000||(obj.links?.length||0)>10000) throw Error('O arquivo ultrapassa o limite desta versão.');
 const items=obj.items.map(i=>normalize(i,obj.kind==='backup')),links=Array.isArray(obj.links)?obj.links.map(normalizeLink):[];
 const tagCatalog=cleanCatalog([...(Array.isArray(obj.tagCatalog)?obj.tagCatalog:[]),...items.flatMap(i=>i.tags)]);
 return {items,links,tagCatalog,backup:obj.kind==='backup'};
}
function merge(existing,incoming){
 const map=new Map(existing.map(x=>[x.id,x])); let added=0,updated=0;
 for(const item of incoming){const old=map.get(item.id);if(old){map.set(item.id,{...item,text:item.text.length>=old.text.length?item.text:old.text,images:item.images.length?item.images:old.images,tags:old.tags,note:old.note,read:old.read,favorite:old.favorite,archived:old.archived,inbox:old.inbox===true,modifiedAt:old.modifiedAt||''});updated++;}else{map.set(item.id,{...item,inbox:true});added++;}}
 return {items:[...map.values()],added,updated};
}
function backup(items,tagCatalog=[],links=[]){return {format:'mural',version:3,kind:'backup',exportedAt:new Date().toISOString(),tagCatalog:cleanCatalog([...tagCatalog,...items.flatMap(i=>i.tags||[])]),items,links:links.map(normalizeLink)};}
const api={normalize,normalizeLink,parse,merge,mergeLinks,backup,cleanTags,cleanCatalog,linkId}; if(typeof module!=='undefined')module.exports=api; else root.MuralModel=api;
})(globalThis);
