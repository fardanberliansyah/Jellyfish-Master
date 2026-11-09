/* Jellyfish Master — penjaga di dalam halaman materi */
(function(){
const ROOT=JM.ROOT,st=JM.st();
/* 1. Cek cepat sebelum materi tampil */
if(!JMSB.session()||st.status!="active"){location.replace(ROOT);return;}
let locked=false;
/* APK native: file audio "aud/…" diputar dari blob URL (tidak ada service worker) */
if(JM.NATIVE){const map=u=>{if(typeof u!="string")return u;const k=u.replace(/^\.?\//,"");return JM.AURL[k]||u;};
 const d=Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype,"src");
 Object.defineProperty(HTMLMediaElement.prototype,"src",{configurable:true,enumerable:d.enumerable,get(){return d.get.call(this);},set(v){d.set.call(this,map(v));}});
 const A0=window.Audio;const A1=function(u){const a=new A0();if(u!==undefined)a.src=u;return a;};A1.prototype=A0.prototype;window.Audio=A1;}
function css(){if(document.getElementById("jmg-css"))return;const s=document.createElement("style");s.id="jmg-css";s.textContent=`
.jmg-ov{position:fixed;inset:0;z-index:2147483000;background:rgba(10,20,24,.72);display:flex;align-items:center;justify-content:center;padding:16px}
.jmg-box{background:var(--surface,#fff);color:var(--tx,#15262b);border-radius:16px;max-width:420px;width:100%;padding:22px;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,.3)}
.jmg-box .i{font-size:2.6rem}.jmg-box h2{margin:6px 0 6px;font-size:1.2rem}.jmg-box p{margin:6px 0;color:var(--mu,#5d6f75);font-size:.95rem;line-height:1.55}
.jmg-b{display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:8px 16px;border-radius:10px;border:1px solid var(--line,#d9e3e6);background:var(--surface,#fff);color:inherit;font:inherit;cursor:pointer;margin:10px 4px 0}
.jmg-b.p{background:var(--pri,#0f766e);border-color:var(--pri,#0f766e);color:#fff;font-weight:700}
.jmg-ban{position:fixed;left:12px;right:12px;bottom:112px;z-index:2147482000;background:var(--surface,#fff);border:1px solid var(--pri,#0f766e);border-radius:14px;padding:10px 12px;display:flex;gap:10px;align-items:center;box-shadow:0 8px 24px rgba(0,0,0,.18);max-width:560px;margin:0 auto;font-size:.92rem}
.jmg-ban span{flex:1}.jmg-chip{position:fixed;left:10px;bottom:72px;z-index:2147481000;font-size:.72rem;border-radius:999px;padding:3px 9px;background:var(--surface,#fff);border:1px solid var(--line,#d9e3e6);color:var(--mu,#5d6f75);opacity:.92}
.jmg-chip.w{color:#b45309;border-color:#b45309}.jmg-adm{position:fixed;right:10px;bottom:72px;z-index:2147481000;font-size:.78rem;border-radius:999px;padding:5px 11px;background:var(--pri,#0f766e);color:#fff;border:0;cursor:pointer}`;document.head.appendChild(s);}
function ov(icon,title,text,btns,keep){css();let o=document.getElementById("jmg-ov");if(!o){o=document.createElement("div");o.id="jmg-ov";o.className="jmg-ov";o.setAttribute("role","dialog");o.setAttribute("aria-modal","true");document.body.appendChild(o);}
 o.innerHTML=`<div class="jmg-box"><div class="i">${icon}</div><h2>${title}</h2><p>${text}</p><div>${btns.map((b,i)=>`<button class="jmg-b ${i?"":"p"}" data-i="${i}">${b[0]}</button>`).join("")}</div></div>`;
 o.querySelectorAll("[data-i]").forEach(b=>b.onclick=()=>btns[+b.dataset.i][1]());if(!keep)locked=true;}
function closeOv(){const o=document.getElementById("jmg-ov");if(o)o.remove();locked=false;}
function chip(){css();let c=document.getElementById("jmg-chip");if(!c){c=document.createElement("div");c.id="jmg-chip";c.className="jmg-chip";document.body.appendChild(c);}
 const left=JM.offlineLeft();if(navigator.onLine){c.textContent="● online";c.classList.remove("w");}
 else{c.textContent="Offline · cek akun dalam "+JM.fmtLeft(left);c.classList.toggle("w",left<86400e3);}
 const s=JM.st();if(s.role=="admin"&&!document.getElementById("jmg-adm")){const b=document.createElement("button");b.id="jmg-adm";b.className="jmg-adm";b.textContent="⚙ Admin";b.onclick=()=>location.href=ROOT+"#admin";document.body.appendChild(b);}}
function lockOffline(){ov("📡","Perlu internet sebentar",`Aplikasi sudah ${JM.offlineDays()} hari tidak mengecek akun. Sambungkan ke internet, lalu tekan "Coba lagi".`,[["Coba lagi",check]]);}
function banner(text,btn,fn){css();let b=document.getElementById("jmg-ban");if(!b){b=document.createElement("div");b.id="jmg-ban";b.className="jmg-ban";document.body.appendChild(b);}
 b.innerHTML=`<span>${text}</span><button class="jmg-b p" style="margin:0">${btn}</button><button class="jmg-b" style="margin:0" aria-label="Tutup">✕</button>`;b.querySelector(".p").onclick=fn;b.querySelector("[aria-label]").onclick=()=>b.remove();}
let checking=false;
async function check(){if(checking)return;if(!navigator.onLine){chip();if(JM.offlineLeft()<=0)lockOffline();return;}
 checking=true;let s;try{s=await JM.checkin();}
 catch(e){checking=false;if((e.status==400||e.status==401)&&/Refresh Token|JWT|not found/i.test(e.message))return JM.wipe("deleted");
  chip();if(JM.offlineLeft()<=0)lockOffline();return;}
 checking=false;
 if(s.status=="deleted")return JM.wipe("deleted");if(s.status=="disabled")return JM.wipe("disabled");if(s.status!="active")return location.replace(ROOT);
 const set=s.settings||{},adm=s.role=="admin";
 if(set.maintenance&&!adm)return ov("🛠️","Sedang maintenance",set.maint_msg||"Aplikasi sedang diperbarui. Silakan coba beberapa saat lagi.",[["Coba lagi",check]]);
 if(JM.mustUpdate())return ov("⬆️","Perlu update",`Versi materi ini sudah tidak dipakai. Perbarui ke versi ${set.content_version} untuk melanjutkan.${set.update_msg?"<br><b>"+set.update_msg+"</b>":""}`,[["Perbarui sekarang",()=>location.replace(ROOT)]]);
 if(JM.apkMust()&&!adm)return ov("📱","Perlu update aplikasi",`Versi aplikasi (APK) ini sudah tidak dipakai. Unduh dan pasang APK versi ${set.apk_version}, lalu buka lagi.${set.apk_msg?"<br><b>"+set.apk_msg+"</b>":""}`,[["Unduh APK baru",JM.openApk],["Coba lagi",check]]);
 if(locked)closeOv();
 if(JM.needsUpdate())banner(`Versi baru ${set.content_version} tersedia.${set.update_msg?" "+set.update_msg:""}`,"Perbarui",()=>location.replace(ROOT));
 if(JM.apkNeedsUpdate())banner(`Aplikasi versi ${set.apk_version} tersedia.${set.apk_msg?" "+set.apk_msg:""}`,"Unduh APK",JM.openApk);
 chip();JM.flush();}
/* audio: unduh ke perangkat sebelum diputar */
window.jmAudio=async src=>{if(!src||/^(data|blob|https?):/.test(src))return src;const k=src.replace(/^\.?\//,"");await JM.ensureAudio([k]);return JM.AURL[k]||src;};
window.jmAudioMany=(list,onp)=>JM.ensureAudio(list.filter(s=>!/^(data|blob|https?):/.test(s)).map(s=>s.replace(/^\.?\//,"")),onp);
window.jmAudioCount=list=>JM.audioCached(list.map(s=>s.replace(/^\.?\//,"")));
window.jmLog=(k,d)=>{try{JM.log(k,d)}catch(e){}};
document.addEventListener("DOMContentLoaded",()=>{chip();if(!navigator.onLine&&JM.offlineLeft()<=0)lockOffline();JM.log("open",{v:+(JM.st().cver||0)});check();});
window.addEventListener("online",check);window.addEventListener("offline",chip);
setInterval(check,30*60e3);
})();
