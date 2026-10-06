// Read-only runtime checks. Telegram getMe/getChat do not send messages.
require('dotenv').config({quiet:true});const fs=require('node:fs');
(async()=>{
 const base='http://127.0.0.1:3000',checks=[];
 for(const path of ['/technical-analysis/BTCEUR','/technical-analysis/ETHEUR','/signals/BTCEUR/1h','/signals/ETHEUR/1h','/demo-trading/open','/demo-trading/summary','/trading-assistant/status']){
  const res=await fetch(base+path,{signal:AbortSignal.timeout(10000)});const body=await res.json();
  if(!res.ok)throw new Error('Local API rejected '+path);
  if(path.startsWith('/signals/') && (body.strategyVersion!==process.env.ACTIVE_STRATEGY_VERSION || body.analysis?.modelVersion!==process.env.ACTIVE_STRATEGY_VERSION))throw new Error('Local API strategy/model mismatch '+path);
  if(path==='/trading-assistant/status' && (!body.active || !body.unifiedStrategyActive || body.strategyVersion!==process.env.ACTIVE_STRATEGY_VERSION || !body.persistentDeduplication?.active))throw new Error('Local API unified assistant or persistent deduplication is disabled');
  checks.push({assistant:path==='/trading-assistant/status'?body:null,strategyVersion:body.strategyVersion??null,analysis:body.analysis??null,reason:body.reason??null,path,http:res.status,status:body.status??body.action??'OK',alignment:body.alignment??null,openPositions:body.openPositions?.length??null});
 }
 const telegram={configured:Boolean(process.env.TELEGRAM_BOT_TOKEN&&process.env.TELEGRAM_CHAT_ID),botVerified:false,chatVerified:false,messagesSent:0};
 if(telegram.configured){
  for(const method of ['getMe','getChat']){
   const query=method==='getChat'?'?chat_id='+encodeURIComponent(process.env.TELEGRAM_CHAT_ID):'';
   const r=await fetch('https://api.telegram.org/bot'+process.env.TELEGRAM_BOT_TOKEN+'/'+method+query,{signal:AbortSignal.timeout(10000)});
   const b=await r.json();if(!r.ok||b.ok!==true)throw new Error('Telegram '+method+' verification failed');
   telegram[method==='getMe'?'botVerified':'chatVerified']=true;
  }
 }
 const report={checkedAt:new Date(),checks,telegram,dbSynchronize:process.env.DB_SYNCHRONIZE,activeStrategy:process.env.ACTIVE_STRATEGY_VERSION,entriesPaused:process.env.DEMO_ENTRIES_PAUSED==='true',experimentalDemo:process.env.EXPLORATORY_DEMO_ENABLED==='true',approvedDemo:process.env.DEMO_TRADING_ENABLED==='true'};
 console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e.message.startsWith('Local API')||e.message.startsWith('Telegram ')?e.message:'Runtime verification connection failed.');process.exitCode=1});
