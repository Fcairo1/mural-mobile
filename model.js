(function(root){
'use strict';
const str=(v,n=20000)=>typeof v==='string'?v.slice(0,n):'';
const cleanTags=v=>Array.isArray(v)?[...new Set(v.map(x=>str(x,60).trim()).filter(Boolean))].slice(0,30):[];
const cleanCatalog=v=>Array.isArray(v)?[...new Set(v.map(x=>str(x,60).trim()).filter(Boolean))].slice(0,500):[];
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
 tags:annotations?cleanTags(raw.tags):[],note:annotations?str(raw.note):'',read:annotations&&raw.read===true,favorite:annotations&&raw.favorite===true,archived:annotations&&raw.archived===true,modifiedAt:annotations?str(raw.modifiedAt,40):''};
}
function parse(input){
 const obj=typeof input==='string'?JSON.parse(input):input;
 if(!obj||!((obj.format==='mural-x'&&obj.version===1)||(obj.format==='mural'&&obj.version===2))||!Array.isArray(obj.items)) throw Error('Use um arquivo Mural (.json) exportado pela extensão ou pelo app.');
 if(obj.items.length>50000) throw Error('O limite desta versão é de 50000 itens por arquivo.');
 const items=obj.items.map(i=>normalize(i,obj.kind==='backup'));
 const tagCatalog=cleanCatalog([...(Array.isArray(obj.tagCatalog)?obj.tagCatalog:[]),...items.flatMap(i=>i.tags)]);
 return {items,tagCatalog,backup:obj.kind==='backup'};
}
function merge(existing,incoming){
 const map=new Map(existing.map(x=>[x.id,x])); let added=0,updated=0;
 for(const item of incoming){const old=map.get(item.id);if(old){map.set(item.id,{...item,text:item.text.length>=old.text.length?item.text:old.text,images:item.images.length?item.images:old.images,tags:old.tags,note:old.note,read:old.read,favorite:old.favorite,archived:old.archived,modifiedAt:old.modifiedAt||''});updated++;}else{map.set(item.id,item);added++;}}
 return {items:[...map.values()],added,updated};
}
function backup(items,tagCatalog=[]){return {format:'mural',version:2,kind:'backup',exportedAt:new Date().toISOString(),tagCatalog:cleanCatalog([...tagCatalog,...items.flatMap(i=>i.tags||[])]),items};}
const api={normalize,parse,merge,backup,cleanTags,cleanCatalog}; if(typeof module!=='undefined')module.exports=api; else root.MuralModel=api;
})(globalThis);
