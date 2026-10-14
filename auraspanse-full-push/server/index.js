import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 10000;
const supabase = process.env.SUPABASE_URL ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY) : null;
const SECRET = process.env.RESEND_WEBHOOK_SECRET || '';
const seen = new Set();

function verify(raw, headers, secret){
  try{
    const id = headers['svix-id'];
    const ts = headers['svix-timestamp'];
    const sig = headers['svix-signature'];
    if(!id||!ts||!sig) return {valid:false};
    const now = Math.floor(Date.now()/1000);
    if(Math.abs(now-parseInt(ts))>300) return {valid:false, reason:'timestamp'};
    let b64 = secret.startsWith('whsec_')?secret.slice(6):secret;
    const key = Buffer.from(b64,'base64');
    const toSign = `${id}.${ts}.${raw}`;
    const exp = crypto.createHmac('sha256', key).update(toSign).digest('base64');
    for(const s of sig.split(' ')){
      const [v, hash]=s.split(',');
      if(v!=='v1') continue;
      try{ if(crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(exp))) return {valid:true, id}; }catch{}
      if(hash===exp) return {valid:true, id};
    }
    return {valid:false};
  }catch(e){ return {valid:false, reason:e.message}; }
}

app.post('/api/webhooks/resend', express.raw({type:'*/*'}), async (req,res)=>{
  const raw = req.body instanceof Buffer ? req.body.toString('utf8') : JSON.stringify(req.body);
  if(SECRET){
    const v = verify(raw, req.headers, SECRET);
    if(!v.valid) return res.status(401).json({error:'invalid sig'});
    if(seen.has(v.id)) return res.status(200).json({received:true, duplicate:true});
    seen.add(v.id);
  }
  let evt; try{ evt=JSON.parse(raw);}catch{ return res.status(400).json({error:'bad json'}); }
  res.status(200).json({received:true, type:evt.type});
  (async()=>{
    try{
      const type=evt.type||'unknown';
      const data=evt.data||evt;
      const emailId=data.email_id||data.id||null;
      console.log('[Resend]', type, emailId||'');
      if(!supabase) return;
      const row={svix_id:req.headers['svix-id']||null, type, email_id:emailId, payload:data, from_email:data.from||null, to_email:Array.isArray(data.to)?data.to[0]:data.to||null, subject:data.subject||null, created_at:new Date().toISOString()};
      await supabase.from('resend_events').upsert(row,{onConflict:'svix_id'});
      // email lifecycle
      if(type.startsWith('email.') && emailId){
        await supabase.from('aura_emails').upsert({email_id:emailId, last_event_type:type, last_event_at:row.created_at, to_email:row.to_email, from_email:row.from_email, subject:row.subject, updated_at:row.created_at},{onConflict:'email_id'});
      }
      if(type.startsWith('contact.')){
        const cid=data.id||data.contact_id||emailId;
        if(cid) await supabase.from('aura_contacts').upsert({contact_id:cid, email:data.email||row.to_email, last_event_type:type, payload:data, updated_at:row.created_at},{onConflict:'contact_id'});
      }
      if(type.startsWith('domain.')){
        const did=data.id||data.name||'unknown';
        await supabase.from('aura_domains').upsert({domain_id:did, name:data.name||did, last_event_type:type, status:data.status||null, payload:data, updated_at:row.created_at},{onConflict:'domain_id'});
      }
    }catch(e){ console.error(e); }
  })();
});

app.post('/supabase', express.raw({type:'*/*'}), (req,res)=>{ req.url='/api/webhooks/resend'; app.handle(req,res); });

app.use(express.json());
app.use(cors());
app.get('/api/health',(req,res)=>res.json({ok:true, service:'aurascope-full-spectrum', supabase:!!supabase, resend:!!SECRET, entire_spectrum:true, events:['email.sent','email.delivered','email.delivery_delayed','email.bounced','email.complained','email.opened','email.clicked','email.failed','email.scheduled','email.suppressed','email.received','contact.created','contact.updated','contact.deleted','domain.created','domain.updated','domain.deleted']}));
app.post('/api/aura', async (req,res)=>{
  if(!supabase) return res.json({stored:false});
  const {birthMonth,birthDay,birthYear,time,location,inner,outer,spectrum,blended}=req.body;
  const {data,error}=await supabase.from('aura_readings').insert({birth_month:birthMonth,birth_day:birthDay,birth_year:birthYear,time_opt:time,location,inner_hue:inner,outer_hue:outer,spectrum,blended_middle:blended,created_at:new Date().toISOString()}).select().single();
  if(error) return res.status(500).json({error:error.message});
  res.json({stored:true, id:data.id});
});
app.get('/api/aura', async (req,res)=>{
  if(!supabase) return res.json([]);
  const {data,error}=await supabase.from('aura_readings').select('*').order('created_at',{ascending:false}).limit(100);
  if(error) return res.status(500).json({error:error.message});
  res.json(data);
});
const dist=path.join(__dirname,'../dist');
app.use(express.static(dist));
app.get('*',(req,res)=>{ res.sendFile(path.join(dist,'index.html'), err=>{ if(err) res.json({service:'aurascope', health:'/api/health'}); }); });
app.listen(PORT,()=>console.log(`AuraScope listening ${PORT} webhook /api/webhooks/resend`));
