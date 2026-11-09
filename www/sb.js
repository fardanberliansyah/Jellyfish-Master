/* Jellyfish Master — klien Supabase mini (tanpa library luar) + server tiruan untuk uji coba */
(function(){
const C=window.JM_CONFIG||{};const SK="jm-sess";const BASE=new URL(".",document.currentScript.src).href;
const ls={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}},del(k){try{localStorage.removeItem(k)}catch(e){}}};
const errMsg=j=>(j&&(j.msg||j.message||j.error_description||j.error||j.hint))||"Terjadi kesalahan";
const TR={"Invalid login credentials":"ID/email atau password salah.","User already registered":"Email ini sudah terdaftar.",
 "Password should be at least 6 characters":"Password minimal 6 karakter.","Email rate limit exceeded":"Terlalu banyak permintaan email. Coba lagi nanti.",
 "invalid JWT":"Sesi berakhir. Silakan login lagi.","Failed to fetch":"Tidak ada koneksi internet."};
const tr=m=>{for(const k in TR)if(String(m).includes(k))return TR[k];return m;};
class JMError extends Error{constructor(m,status){super(tr(m));this.status=status;}}

/* ---------- Server tiruan (hanya untuk uji coba, JM_CONFIG.mock=true) ---------- */
const MOCK=C.mock?(()=>{const K="jm-mock-db";
 const db=()=>ls.get(K,{users:[],profiles:[],devices:[],activity:[],logs:[],settings:{maintenance:false,maint_msg:"",content_version:0,content_path:"",min_version:0,offline_days:7,inactive_days:30,max_devices:3,update_msg:""}});
 const save=d=>ls.set(K,d);const now=()=>new Date().toISOString();
 const uidOf=t=>{if(!t||!t.startsWith("mock:"))return null;const [,u,exp]=t.split(":");return +exp>Date.now()?u:"EXPIRED";};
 const prof=(d,id)=>d.profiles.find(p=>p.id==id);const nm=p=>p?(p.display_name||p.username):"";
 const admins=d=>d.profiles.filter(p=>p.role=="admin"&&p.status=="active").length;
 const tok=u=>({access_token:"mock:"+u.id+":"+(Date.now()+3600e3),refresh_token:"mockr:"+u.id,expires_in:3600,user:{id:u.id,email:u.email}});
 const R={};
 R.email_for_login=(d,a)=>{const p=d.profiles.find(p=>p.username.toLowerCase()==String(a.ident).trim().toLowerCase());return p?p.email:null;};
 R.username_taken=(d,a)=>d.profiles.some(p=>p.username.toLowerCase()==String(a.ident).trim().toLowerCase());
 R.checkin=(d,a,me)=>{const p=prof(d,me);if(!p)return{status:"deleted"};p.last_seen=now();p.app_version=a.p_ver;
  if(p.status=="active"&&a.p_device){const x=d.devices.find(x=>x.user_id==me&&x.device_id==a.p_device);if(x){x.last_seen=now();x.label=a.p_label;}else d.devices.push({user_id:me,device_id:a.p_device,label:a.p_label,first_seen:now(),last_seen:now()});}
  return{status:p.status,role:p.role,username:p.username,display_name:p.display_name,devices:d.devices.filter(x=>x.user_id==me).length,settings:d.settings};};
 R.log_activity=(d,a,me)=>{const p=prof(d,me);if(!p||p.status!="active")return null;d.activity.push({user_id:me,kind:a.p_kind,data:a.p_data,at:a.p_at||now()});p.last_activity=a.p_at||now();return null;};
 const guard=(d,me)=>{const p=prof(d,me);if(!p||p.role!="admin"||p.status!="active")throw new JMError("Hanya admin",403);return p;};
 const log=(d,me,action,target,detail)=>{const t=prof(d,target);d.logs.unshift({at:now(),admin_name:nm(prof(d,me)),action,target_name:t?nm(t)+" ("+t.username+")":null,detail});};
 R.admin_list=(d,a,me)=>{guard(d,me);return d.profiles.map(p=>Object.assign({},p,{device_count:d.devices.filter(x=>x.user_id==p.id).length,activity_count:d.activity.filter(x=>x.user_id==p.id).length})).sort((a,b)=>b.created_at.localeCompare(a.created_at));};
 R.admin_user_detail=(d,a,me)=>{guard(d,me);return{devices:d.devices.filter(x=>x.user_id==a.uid),activity:d.activity.filter(x=>x.user_id==a.uid).slice(-30).reverse()};};
 R.admin_set_status=(d,a,me)=>{guard(d,me);const p=prof(d,a.uid);if(!p)throw new JMError("Akun tidak ditemukan");if(p.role=="admin"&&a.st!="active"&&admins(d)<=1)throw new JMError("Tidak bisa: ini admin aktif terakhir");
  const was=p.status;p.status=a.st;if(was=="pending"&&a.st=="active"){p.approved_at=now();p.approved_by=nm(prof(d,me));}log(d,me,was=="pending"&&a.st=="active"?"ACC":a.st=="disabled"?"Nonaktifkan":"Aktifkan",a.uid,was+" → "+a.st);return null;};
 R.admin_set_role=(d,a,me)=>{guard(d,me);const p=prof(d,a.uid);if(p.role=="admin"&&a.r=="teacher"&&admins(d)<=1)throw new JMError("Tidak bisa: ini admin aktif terakhir");p.role=a.r;log(d,me,a.r=="admin"?"Jadikan admin":"Turunkan dari admin",a.uid);return null;};
 R.admin_reset_devices=(d,a,me)=>{guard(d,me);d.devices=d.devices.filter(x=>x.user_id!=a.uid);log(d,me,"Reset perangkat",a.uid);return null;};
 R.admin_delete_user=(d,a,me)=>{guard(d,me);if(a.uid==me)throw new JMError("Tidak bisa menghapus akun sendiri");const p=prof(d,a.uid);if(p&&p.role=="admin"&&p.status=="active"&&admins(d)<=1)throw new JMError("Tidak bisa: ini admin aktif terakhir");
  log(d,me,"Hapus akun",a.uid,p&&p.email);d.users=d.users.filter(u=>u.id!=a.uid);d.profiles=d.profiles.filter(p=>p.id!=a.uid);d.devices=d.devices.filter(x=>x.user_id!=a.uid);d.activity=d.activity.filter(x=>x.user_id!=a.uid);return null;};
 R.admin_settings_set=(d,a,me)=>{guard(d,me);Object.assign(d.settings,a.p);d.logs.unshift({at:now(),admin_name:nm(prof(d,me)),action:"Ubah pengaturan",detail:JSON.stringify(a.p)});return null;};
 R.admin_logs=(d,a,me)=>{guard(d,me);return d.logs.slice(0,300);};
 const route=async(path,o)=>{const d=db();const H=o.headers||{};const auth=(H.Authorization||"").replace("Bearer ","");const me=uidOf(auth);const body=o.body&&typeof o.body=="string"?JSON.parse(o.body):null;
  const ok=j=>{save(d);return{ok:true,status:200,json:async()=>j,blob:async()=>new Blob([JSON.stringify(j)])};};
  const bad=(m,s)=>({ok:false,status:s||400,json:async()=>({msg:m})});
  if(path=="/auth/v1/signup"){if(d.users.some(u=>u.email==body.email))return bad("User already registered",422);if((body.password||"").length<6)return bad("Password should be at least 6 characters",422);
   const u={id:"u"+Math.random().toString(36).slice(2,10),email:body.email,pw:body.password};d.users.push(u);const first=!d.profiles.length;
   d.profiles.push({id:u.id,username:body.data.username,email:u.email,display_name:body.data.display_name||body.data.username,role:first?"admin":"teacher",status:first?"active":"pending",created_at:now(),approved_at:first?now():null,approved_by:first?"sistem (akun pertama)":null,last_seen:null,last_activity:null,app_version:null});return ok(tok(u));}
  if(path.startsWith("/auth/v1/token?grant_type=password")){const u=d.users.find(u=>u.email==body.email&&u.pw==body.password);return u?ok(tok(u)):bad("Invalid login credentials",400);}
  if(path.startsWith("/auth/v1/token?grant_type=refresh_token")){const id=(body.refresh_token||"").slice(6);const u=d.users.find(u=>u.id==id);return u?ok(tok(u)):bad("Invalid Refresh Token: Refresh Token Not Found",400);}
  if(path=="/auth/v1/logout"||path=="/auth/v1/recover")return ok({});
  if(path=="/auth/v1/user"&&o.method=="PUT"){const u=d.users.find(u=>u.id==me);if(u)u.pw=body.password;return ok({});}
  if(path.startsWith("/rest/v1/rpc/")){const f=path.slice(13);if(me=="EXPIRED")return bad("invalid JWT",401);if(!R[f])return bad("unknown rpc",404);
   if(!["email_for_login","username_taken"].includes(f)&&!me)return bad("invalid JWT",401);try{return ok(R[f](d,body||{},me));}catch(e){return bad(e.message,400);}}
  if(path.startsWith("/storage/v1/object/authenticated/jm/")){const p=prof(d,me);if(!p||p.status!="active")return bad("Object not found",400);
   const key=path.slice(36);const c=await caches.open("jm-mock-files");const r=await c.match("/mock-files/"+key);if(r)return r;return fetch(BASE+"mock/"+key);}
  if(path.startsWith("/storage/v1/object/jm/")){guard(d,me);const key=path.slice(22);const c=await caches.open("jm-mock-files");await c.put("/mock-files/"+key,new Response(o.body,{headers:{"Content-Type":H["Content-Type"]||"application/octet-stream"}}));return ok({Key:key});}
  return bad("not found",404);};
 return{route};})():null;

/* ---------- Klien ---------- */
async function req(path,o){o=o||{};o.headers=Object.assign({apikey:C.key||""},o.noCT?{}:{"Content-Type":"application/json"},o.headers||{});delete o.noCT;
 let r;try{r=MOCK?await MOCK.route(path,o):await fetch(C.url+path,o);}catch(e){throw new JMError("Failed to fetch",0);}
 if(!r.ok){let j={};try{j=await r.json()}catch(e){}throw new JMError(errMsg(j),r.status);}return r;}
const sess={get:()=>ls.get(SK,null),set:s=>ls.set(SK,s),clear:()=>ls.del(SK)};
function keep(j){const s={access_token:j.access_token,refresh_token:j.refresh_token,expires_at:Date.now()+(j.expires_in||3600)*1000,user:j.user?{id:j.user.id,email:j.user.email}:null};sess.set(s);return s;}
async function token(){const s=sess.get();if(!s)return null;if(s.expires_at-Date.now()>60e3)return s.access_token;
 const r=await req("/auth/v1/token?grant_type=refresh_token",{method:"POST",body:JSON.stringify({refresh_token:s.refresh_token})});return keep(await r.json()).access_token;}
async function authH(){const t=await token();return t?{Authorization:"Bearer "+t}:{};}
window.JMSB={
 session:sess.get, clearSession:sess.clear, isMock:!!MOCK, Err:JMError,
 async signUp(email,password,meta){const r=await req("/auth/v1/signup",{method:"POST",body:JSON.stringify({email,password,data:meta})});const j=await r.json();if(j.access_token)keep(j);return j;},
 async signIn(email,password){const r=await req("/auth/v1/token?grant_type=password",{method:"POST",body:JSON.stringify({email,password})});return keep(await r.json());},
 async signOut(){try{await req("/auth/v1/logout",{method:"POST",headers:await authH()})}catch(e){}sess.clear();},
 async recover(email,redirect){await req("/auth/v1/recover"+(redirect?"?redirect_to="+encodeURIComponent(redirect):""),{method:"POST",body:JSON.stringify({email})});},
 async setRecoverySession(access,refresh,exp){keep({access_token:access,refresh_token:refresh,expires_in:+exp||3600});},
 async updatePassword(pw){await req("/auth/v1/user",{method:"PUT",headers:await authH(),body:JSON.stringify({password:pw})});},
 async rpc(fn,args){const r=await req("/rest/v1/rpc/"+fn,{method:"POST",headers:await authH(),body:JSON.stringify(args||{})});const t=await r.text?await r.text():JSON.stringify(await r.json());try{return t?JSON.parse(t):null}catch(e){return t}},
 async download(path){const r=await req("/storage/v1/object/authenticated/jm/"+path,{method:"GET",headers:await authH(),noCT:true});return r.blob();},
 async upload(path,blob,type){await req("/storage/v1/object/jm/"+path,{method:"POST",headers:Object.assign(await authH(),{"Content-Type":type||blob.type||"application/octet-stream","x-upsert":"true","cache-control":"no-cache"}),body:blob});}
};
})();
