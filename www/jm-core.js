/* Jellyfish Master — inti bersama: perangkat, cek akun, offline, hapus data, unduh materi & audio */
(function(){
const ROOT=new URL(".",document.currentScript.src).href;           // folder aplikasi (tempat index.html)
const ls={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const DAY=86400e3;
/* APK native (Capacitor): tanpa service worker; materi dibuka lewat app.html, audio lewat blob URL */
const NATIVE=!!(window.JM_NATIVE||(window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform()));
const AURL={};
function devId(){let d=ls.get("jm-dev",null);if(!d){d=(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2));ls.set("jm-dev",d);}return d;}
function devLabel(){const u=navigator.userAgent;const m=u.match(/\(([^)]+)\)/);let s=m?m[1].split(";").map(x=>x.trim()).filter(x=>!/^(Linux|U|wv|K|x64|Win64|WOW64)$/.test(x)).slice(0,2).join(" · "):"Perangkat";
 const b=NATIVE?"APK "+(+window.JM_APK||0):/Edg\//.test(u)?"Edge":/Chrome\//.test(u)?"Chrome":/Firefox\//.test(u)?"Firefox":/Safari\//.test(u)?"Safari":"";return (s+(b?" · "+b:"")).slice(0,80);}
const st=()=>ls.get("jm-st",{});const put=o=>ls.set("jm-st",Object.assign(st(),o));
window.JM={ROOT,NATIVE,AURL,
 st,put,devId,
 appURL:()=>ROOT+"app/index.html",          /* kunci cache materi */
 openURL:()=>NATIVE?ROOT+"app.html":ROOT+"app/index.html",   /* alamat untuk membuka materi */
 apkVer:()=>+window.JM_APK||0,
 /* versi APK: hanya berlaku di aplikasi native */
 apkNeedsUpdate(){const s=st().settings||{};return NATIVE&&(+s.apk_version||0)>JM.apkVer()&&!!s.apk_url;},
 apkMust(){const s=st().settings||{};return NATIVE&&JM.apkVer()<(+s.apk_min||0)&&!!s.apk_url;},
 openApk(){const u=(st().settings||{}).apk_url;if(u)location.href=u;},
 cfg:k=>{const s=st().settings||{};return s[k];},
 offlineDays(){const d=+(st().settings||{}).offline_days;return d>0?d:7;},
 /* sisa waktu offline (ms); <=0 berarti terkunci */
 offlineLeft(){const s=st();if(!s.ok_at)return -1;return s.ok_at+JM.offlineDays()*DAY-Date.now();},
 /* cek akun ke server; mengembalikan hasil atau melempar error jaringan */
 async checkin(){const r=await JMSB.rpc("checkin",{p_device:devId(),p_label:devLabel(),p_ver:+(st().cver||0)});
  const o={status:r.status,role:r.role,username:r.username,display_name:r.display_name,devices:r.devices,settings:r.settings||{}};
  if(r.status=="active")o.ok_at=Date.now();put(o);return Object.assign({},st(),{status:r.status});},
 /* hapus semua data di perangkat ini (materi, audio, progres, sesi) */
 async wipe(reason){try{const ks=await caches.keys();await Promise.all(ks.filter(k=>!/^jm-shell/.test(k)&&k!="jm-mock-files").map(k=>caches.delete(k)));}catch(e){}
  try{const keep={};["jm-mock-db","jm-dev"].forEach(k=>{const v=localStorage.getItem(k);if(v!=null)keep[k]=v;});localStorage.clear();for(const k in keep)localStorage.setItem(k,keep[k]);sessionStorage.clear();}catch(e){}
  location.replace(ROOT+(reason?"?m="+encodeURIComponent(reason):""));},
 async hasContent(){try{const c=await caches.open("jm-content");return !!(await c.match(JM.appURL()));}catch(e){return false;}},
 needsUpdate(){const s=st();const v=+(s.settings||{}).content_version||0;return v>(+s.cver||0);},
 mustUpdate(){const s=st();const m=+(s.settings||{}).min_version||0;return (+s.cver||0)<m;},
 /* unduh materi versi terbaru ke cache */
 async installContent(onp){const s=st().settings||{};if(!s.content_path)throw new JMSB.Err("Admin belum mengunggah materi aplikasi.");
  onp&&onp("Mengunduh materi…");const blob=await JMSB.download(s.content_path);
  const c=await caches.open("jm-content");await c.put(JM.appURL(),new Response(blob,{headers:{"Content-Type":"text/html; charset=utf-8"}}));
  put({cver:+s.content_version||0});onp&&onp("Selesai");},
 /* audio: pastikan file ada di cache (unduh bila perlu). paths: ["aud/x.mp3", …] relatif terhadap app/ */
 async ensureAudio(paths,onp){const c=await caches.open("jm-audio");let i=0;
  for(const p of paths){const url=ROOT+"app/"+p;let r=await c.match(url);if(!r){const b=await JMSB.download(p);await c.put(url,new Response(b,{headers:{"Content-Type":"audio/mpeg"}}));r=NATIVE?await c.match(url):null;}
   if(NATIVE&&!AURL[p])AURL[p]=URL.createObjectURL(await r.blob());i++;onp&&onp(i,paths.length);}},
 async audioCached(paths){const c=await caches.open("jm-audio");let n=0;for(const p of paths)if(await c.match(ROOT+"app/"+p))n++;return n;},
 /* catatan aktivitas (dikirim saat online) */
 log(kind,data){const q=ls.get("jm-q",[]);q.push({k:kind,d:data,t:new Date().toISOString()});ls.set("jm-q",q.slice(-200));JM.flush();},
 async flush(){if(!navigator.onLine)return;const q=ls.get("jm-q",[]);if(!q.length||!JMSB.session())return;ls.set("jm-q",[]);
  for(const e of q){try{await JMSB.rpc("log_activity",{p_kind:e.k,p_data:e.d,p_at:e.t});}catch(err){const r=ls.get("jm-q",[]);r.push(e);ls.set("jm-q",r);break;}}},
 fmtLeft(ms){if(ms<=0)return "0 hari";const d=Math.floor(ms/DAY),h=Math.floor(ms%DAY/3600e3);return d?d+" hari"+(h?" "+h+" jam":""):h+" jam";}
};
})();
