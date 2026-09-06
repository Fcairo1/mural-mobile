(function(root){
'use strict';
const fold=s=>String(s||'').toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9+#]+/g,' ').trim();
const stop=new Set('uma uns umas com sem que isso isto esse essa meu minha seus suas mais menos muito como para por voce ele ela the and from this that your our are was have has about how what why when'.split(' '));
const tokens=s=>new Set(fold(s).split(/\s+/).filter(x=>x.length>2&&!stop.has(x)));
const topics=[
 ['AI',['inteligencia artificial','artificial intelligence','chatgpt','claude','gemini','llm','machine learning','prompt','openai']],
 ['Programming',['programacao','programming','developer','coding','codigo','javascript','python','github','software','api','terminal','linux']],
 ['Technology',['tecnologia','technology','tech','gadget','iphone','android','macos','computer','internet','app']],
 ['Design',['design','typography','tipografia','ui','ux','layout','branding','logo','interior design','architecture','arquitetura']],
 ['3D Printing',['impressao 3d','3dprinting','3d print','bambu lab','filament','stl','makerworld','petg','pla']],
 ['Travel',['viagem','travel','trip','hotel','flight','voo','turismo','toronto','vacation','ferias']],
 ['Cooking',['receita','recipe','food','cooking','cozinha','restaurant','comida','bread','bolo','drink','cocktail']],
 ['Health',['saude','health','medical','medicine','doctor','mental health','sono','sleep','nutrition','nutricao']],
 ['Fitness',['fitness','workout','gym','treino','muay thai','running','corrida','muscle','exercise','exercicio']],
 ['Finance',['financas','finance','money','dinheiro','invest','budget','orcamento','stock','crypto','economia']],
 ['Productivity',['produtividade','productivity','workflow','habit','habito','calendar','calendario','organize','organizacao','automation']],
 ['Books',['livro','books','book','reading','leitura','author','escritor','novel']],
 ['Music',['musica','music','song','album','spotify','singer','band','concert','guitar']],
 ['TV and Movies',['movie','movies','film','cinema','netflix','series','tv show','television','filme']],
 ['Games',['games','gaming','game','videogame','playstation','xbox','nintendo','steam']],
 ['Photography',['fotografia','photography','photo','camera','lens','portrait','imagem']],
 ['Science',['ciencia','science','research','study','space','biology','physics','astronomy']],
 ['History',['historia','history','historical','ancient','arqueologia','geography','geografia']],
 ['Funny',['humor','funny','meme','memes','joke','piada','comedy','engracado','engracada']],
 ['Politics',['politics','political','government','governo','election','eleicao','president','congress','congresso','senate','senado']],
 ['Interesting Facts',['did you know','today i learned','todayilearned','interesting fact','curiosidade','voce sabia','fact']],
 ['Practical Tips',['life hack','life hacks','practical tip','practical tips','dica pratica','tutorial','guide','tips and tricks']],
 ['Looksmaxxing',['looksmaxxing','looksmax','male grooming','grooming','mens style','male appearance']],
 ['Self-Care',['self care','skincare','skin care','grooming','hair care','autocuidado']],
 ['Body & Wellness',['wellness','bem estar','body care','mobility','posture','postura','recovery']]
];
function hits(text,term){const f=fold(text),t=fold(term);return t.includes(' ')?f.includes(t):new RegExp(`(?:^| )${t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?: |$)`).test(f);}
function suggest(item,library){
 const scores=new Map(),add=(tag,n,reason)=>{const x=scores.get(tag)||{score:0,reasons:[]};x.score+=n;if(reason&&!x.reasons.includes(reason))x.reasons.push(reason);scores.set(tag,x);};
 const title=`${item.title||''} ${item.subreddit||''}`,body=item.text||'';
 for(const [tag,terms] of topics){let score=0;for(const term of terms){if(hits(title,term))score+=3;else if(hits(body,term))score+=1;}if(score>=2)add(tag,score,'pelo conteúdo');}
 const mine=tokens(`${item.title||''} ${item.text||''}`),groups=new Map(),fixed=new Set(topics.map(x=>x[0]));
 for(const sample of library){if(sample.id===item.id||!sample.tags?.length)continue;for(const tag of sample.tags){if(!groups.has(tag))groups.set(tag,[]);groups.get(tag).push(sample);}}
 for(const [tag,samples] of groups){
  let sameCommunity=false,strong=0;const frequency=new Map();
  for(const sample of samples){
   if(item.subreddit&&sample.subreddit&&fold(item.subreddit)===fold(sample.subreddit))sameCommunity=true;
   const theirs=tokens(`${sample.title||''} ${sample.text||''}`);let common=0;
   for(const token of theirs){frequency.set(token,(frequency.get(token)||0)+1);if(mine.has(token))common++;}
   const ratio=common/Math.max(1,Math.min(mine.size,theirs.size));if(common>=3&&ratio>=0.22)strong=Math.max(strong,Math.min(5,2+common));
  }
  const repeated=[...frequency].filter(([token,count])=>count>=2&&mine.has(token)).length;
  if(sameCommunity)add(tag,5,'pela mesma comunidade');
  else if(fixed.has(tag))continue;
  else if(strong)add(tag,strong,'aprendida com um exemplo muito parecido');
  else if(samples.length>=2&&repeated>=2)add(tag,Math.min(5,1+repeated),'por padrões recorrentes nos seus exemplos');
 }
 return [...scores].filter(([tag,x])=>x.score>=2&&!item.tags?.includes(tag)).sort((a,b)=>b[1].score-a[1].score||a[0].localeCompare(b[0],'pt-BR')).slice(0,3).map(([tag,x])=>({tag,reason:x.reasons.join(' e '),score:x.score}));
}
function scan(library,onlyUntagged=true){const byId=new Map();for(const item of library){if(item.archived||(onlyUntagged&&item.tags?.length))continue;const found=suggest(item,library);if(found.length)byId.set(item.id,found);}return byId;}
const api={fold,tokens,suggest,scan};if(typeof module!=='undefined')module.exports=api;else root.MuralTagger=api;
})(globalThis);
