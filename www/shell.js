/* Jellyfish Master — halaman login, pendaftaran, status akun, dan admin */
(function(){
const A=document.getElementById("app");const $=id=>document.getElementById(id);
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const brand=sub=>`<div class="brand"><img src="icon-192.png" alt=""><div><b>Jellyfish Master</b><small>${sub||"Khusus guru · materi bahasa Jepang"}</small></div></div>`;
const busy=(b,on,t)=>{if(!b)return;b.disabled=on;if(t)b.textContent=t;};
const err=e=>(e&&e.message)||String(e);
const fmt=t=>t?new Date(t).toLocaleString("id-ID",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}):"—";
const ago=t=>{if(!t)return "belum pernah";const d=(Date.now()-new Date(t))/86400e3;return d<1?"hari ini":Math.floor(d)+" hari lalu";};
if(!JM.NATIVE&&"serviceWorker" in navigator&&location.protocol!="file:")navigator.serviceWorker.register("sw.js").catch(()=>{});

/* ---------- Alur utama ---------- */
const MSG={disabled:"Akun Anda telah dinonaktifkan oleh admin. Data aplikasi di perangkat ini sudah dihapus.",
 deleted:"Akun Anda sudah tidak terdaftar. Data aplikasi di perangkat ini sudah dihapus.",
 expired:"Sesi Anda berakhir. Silakan login lagi.",logout:"Anda sudah keluar."};
async function start(){const q=new URLSearchParams(location.search);const h=new URLSearchParams(location.hash.slice(1));
 if(h.get("type")=="recovery"&&h.get("access_token")){await JMSB.setRecoverySession(h.get("access_token"),h.get("refresh_token"),h.get("expires_in"));history.replaceState(null,"",location.pathname);return viewReset();}
 const note=q.get("m")?MSG[q.get("m")]||"":"";if(q.get("m"))history.replaceState(null,"",location.pathname+location.hash);
 if(!JMSB.session())return viewLogin(note);
 return route();}
async function route(){const admin=location.hash=="#admin";
 if(!navigator.onLine){const s=JM.st();
  if(admin)return viewInfo("📡","Halaman admin butuh internet","Sambungkan perangkat ke internet untuk mengelola akun.",[["Buka materi",()=>go()],["Coba lagi",route]]);
  if(s.status=="active"&&JM.offlineLeft()>0&&await JM.hasContent())return go();
  return viewInfo("📡","Perlu internet sebentar","Aplikasi perlu online untuk mengecek akun (paling lama tiap "+JM.offlineDays()+" hari) atau untuk mengunduh materi.",[["Coba lagi",route],["Keluar",logout]]);}
 let s;try{s=await JM.checkin();}catch(e){if(e.status==400||e.status==401){if(/Refresh Token|JWT|not found/i.test(e.message)&&JM.st().status)return JM.wipe("deleted");JMSB.clearSession();return viewLogin(MSG.expired);}
  const st=JM.st();if(st.status=="active"&&JM.offlineLeft()>0&&await JM.hasContent()&&!admin)return go();return viewInfo("⚠️","Tidak bisa terhubung",err(e),[["Coba lagi",route],["Keluar",logout]]);}
 if(s.status=="deleted")return JM.wipe("deleted");
 if(s.status=="disabled")return JM.wipe("disabled");
 if(s.status=="pending")return viewPending();
 const set=s.settings||{};const isAdm=s.role=="admin";
 if(admin){if(!isAdm){location.hash="";return route();}return viewAdmin();}
 if(set.maintenance&&!isAdm)return viewInfo("🛠️","Sedang maintenance",set.maint_msg||"Aplikasi sedang diperbarui. Silakan coba beberapa saat lagi.",[["Coba lagi",route],["Keluar",logout]]);
 if(JM.apkMust()&&!isAdm)return viewInfo("📱","Perlu update aplikasi",`Versi aplikasi (APK) ini sudah tidak dipakai. Unduh dan pasang APK versi ${set.apk_version}, lalu buka lagi.`+(set.apk_msg?" "+set.apk_msg:""),[["Unduh APK baru",JM.openApk],["Coba lagi",route]]);
 if(!(await JM.hasContent())||JM.mustUpdate()||JM.needsUpdate())return viewDownload(isAdm);
 go();}
function go(){if(JM.NATIVE)location.replace(JM.openURL());else location.href=JM.openURL();}
async function logout(){await JMSB.signOut();JM.wipe("logout");}

/* ---------- Tampilan ---------- */
function viewInfo(icon,title,text,btns){A.className="wrap";A.innerHTML=brand()+`<div class="card"><div class="big">${icon}</div><h1 style="text-align:center">${esc(title)}</h1><p class="mu" style="text-align:center">${esc(text)}</p><div class="row" style="justify-content:center;margin-top:14px">${btns.map((b,i)=>`<button class="btn ${i?"":"pri"}" data-i="${i}">${esc(b[0])}</button>`).join("")}</div></div>`;
 A.querySelectorAll("[data-i]").forEach(b=>b.onclick=()=>btns[+b.dataset.i][1]());}
function viewLogin(note){A.className="wrap";A.innerHTML=brand()+`<div class="card"><h1>Masuk</h1><p class="mu">Gunakan ID atau email dan password Anda.</p>${note?`<div class="msg info">${esc(note)}</div>`:""}
 <form id="f"><label for="id">ID atau email</label><input id="id" autocomplete="username" required autocapitalize="off" spellcheck="false">
 <label for="pw">Password</label><input id="pw" type="password" autocomplete="current-password" required>
 <div id="e"></div><button class="btn pri full" id="b">Masuk</button></form>
 <div class="row" style="margin-top:14px"><button class="lnk" id="reg">Daftar akun baru</button><span class="sp"></span><button class="lnk" id="fg">Lupa password?</button></div></div>
 <p class="mu" style="text-align:center">Akun baru perlu disetujui (ACC) admin sebelum bisa dipakai.</p>`;
 $("reg").onclick=viewRegister;$("fg").onclick=viewForgot;
 $("f").onsubmit=async ev=>{ev.preventDefault();const b=$("b");busy(b,true,"Memeriksa…");$("e").innerHTML="";
  try{let id=$("id").value.trim(),email=id;if(!id.includes("@")){email=await JMSB.rpc("email_for_login",{ident:id});if(!email)throw new Error("ID tidak ditemukan.");}
   await JMSB.signIn(email,$("pw").value);JM.put({ok_at:0});await route();}
  catch(e){$("e").innerHTML=`<div class="msg err">${esc(err(e))}</div>`;busy(b,false,"Masuk");}};}
function viewRegister(){A.className="wrap";A.innerHTML=brand()+`<div class="card"><h1>Daftar akun guru</h1><p class="mu">Setelah mendaftar, akun Anda akan diperiksa dan disetujui oleh admin.</p>
 <form id="f"><label for="nm">Nama lengkap</label><input id="nm" required maxlength="60" autocomplete="name">
 <label for="un">ID (untuk login)</label><input id="un" required pattern="[A-Za-z0-9_.\\-]{3,30}" autocapitalize="off" spellcheck="false" autocomplete="username" aria-describedby="unh"><p class="mu" id="unh">3–30 karakter: huruf, angka, titik, garis bawah, atau strip.</p>
 <label for="em">Email</label><input id="em" type="email" required autocomplete="email"><p class="mu">Dipakai untuk reset password dan pemulihan akun.</p>
 <label for="pw">Password</label><input id="pw" type="password" required minlength="8" autocomplete="new-password"><p class="mu">Minimal 8 karakter.</p>
 <label for="pw2">Ulangi password</label><input id="pw2" type="password" required minlength="8" autocomplete="new-password">
 <div id="e"></div><button class="btn pri full" id="b">Daftar</button></form>
 <div class="row" style="margin-top:14px"><button class="lnk" id="back">← Sudah punya akun? Masuk</button></div></div>`;
 $("back").onclick=()=>viewLogin();
 $("f").onsubmit=async ev=>{ev.preventDefault();const b=$("b");$("e").innerHTML="";
  if($("pw").value!=$("pw2").value){$("e").innerHTML=`<div class="msg err">Password tidak sama.</div>`;return;}
  busy(b,true,"Mendaftarkan…");
  try{const un=$("un").value.trim();if(await JMSB.rpc("username_taken",{ident:un}))throw new Error("ID ini sudah dipakai. Pilih ID lain.");
   const r=await JMSB.signUp($("em").value.trim(),$("pw").value,{username:un,display_name:$("nm").value.trim()});
   if(!r.access_token&&!JMSB.session())return viewInfo("📧","Cek email Anda","Kami mengirim link konfirmasi ke "+$("em").value+". Setelah konfirmasi, tunggu persetujuan admin.",[["Ke halaman masuk",()=>viewLogin()]]);
   await route();}
  catch(e){$("e").innerHTML=`<div class="msg err">${esc(err(e))}</div>`;busy(b,false,"Daftar");}};}
function viewForgot(){A.className="wrap";A.innerHTML=brand()+`<div class="card"><h1>Lupa password</h1><p class="mu">Masukkan email akun Anda. Link untuk membuat password baru akan dikirim ke email tersebut.</p>
 <form id="f"><label for="em">Email</label><input id="em" type="email" required><div id="e"></div><button class="btn pri full" id="b">Kirim link</button></form>
 <div class="row" style="margin-top:14px"><button class="lnk" id="back">← Kembali</button></div></div>`;
 $("back").onclick=()=>viewLogin();
 $("f").onsubmit=async ev=>{ev.preventDefault();const b=$("b");busy(b,true,"Mengirim…");
  try{await JMSB.recover($("em").value.trim(),JM.NATIVE?null:JM.ROOT);$("e").innerHTML=`<div class="msg ok">Jika email terdaftar, link reset sudah dikirim. Cek juga folder spam.</div>`;}
  catch(e){$("e").innerHTML=`<div class="msg err">${esc(err(e))}</div>`;}busy(b,false,"Kirim link");};}
function viewReset(){A.className="wrap";A.innerHTML=brand()+`<div class="card"><h1>Buat password baru</h1>
 <form id="f"><label for="pw">Password baru</label><input id="pw" type="password" required minlength="8" autocomplete="new-password">
 <label for="pw2">Ulangi password</label><input id="pw2" type="password" required minlength="8" autocomplete="new-password"><div id="e"></div><button class="btn pri full" id="b">Simpan</button></form></div>`;
 $("f").onsubmit=async ev=>{ev.preventDefault();if($("pw").value!=$("pw2").value){$("e").innerHTML=`<div class="msg err">Password tidak sama.</div>`;return;}
  const b=$("b");busy(b,true,"Menyimpan…");try{await JMSB.updatePassword($("pw").value);await route();}catch(e){$("e").innerHTML=`<div class="msg err">${esc(err(e))}</div>`;busy(b,false,"Simpan");}};}
function viewPending(){const s=JM.st();viewInfo("⏳","Menunggu persetujuan admin",`Halo ${s.display_name||s.username||""}! Akun Anda sudah terdaftar dan sedang menunggu ACC dari admin. Setelah disetujui, buka lagi aplikasi ini.`,[["Cek lagi",route],["Keluar",logout]]);}
async function viewDownload(isAdm){A.className="wrap";const s=JM.st();const v=(s.settings||{}).content_version;
 A.innerHTML=brand()+`<div class="card"><h1>${s.cver?"Memperbarui materi":"Menyiapkan materi"}</h1><p class="mu">${s.cver?`Versi ${s.cver} → ${v}. `:""}Materi diunduh sekali dan disimpan di perangkat agar bisa dipakai offline.</p>
 <div class="bar" style="margin:14px 0"><i id="pb" style="width:15%"></i></div><p id="pt" class="mu">Mengunduh…</p><div id="e"></div>${isAdm?`<button class="btn full" id="adm">⚙ Halaman admin</button>`:""}</div>`;
 if($("adm"))$("adm").onclick=()=>{location.hash="#admin";route();};
 let t;try{let p=15;t=setInterval(()=>{p=Math.min(90,p+5);const b=$("pb");if(b)b.style.width=p+"%";else clearInterval(t);},400);await JM.installContent(m=>{const e=$("pt");if(e)e.textContent=m;});clearInterval(t);if($("pb"))$("pb").style.width="100%";go();}
 catch(e){clearInterval(t);if(!$("e"))return;$("e").innerHTML=`<div class="msg err">${esc(err(e))}</div><button class="btn" id="rt">Coba lagi</button>`;$("rt").onclick=route;}}

/* ---------- Admin ---------- */
let AD={tab:"pending",q:"",list:[],set:{}};
async function viewAdmin(){A.className="wrap wide";const s=JM.st();AD.set=s.settings||{};
 A.innerHTML=brand("Halaman admin · "+esc(s.display_name||s.username))+`<div class="row" style="margin-bottom:10px"><button class="btn" id="open">📚 Buka materi</button><button class="btn" id="rf">↻ Muat ulang</button><span class="sp"></span><button class="btn" id="out">Keluar</button></div><div id="adm"><p class="mu">Memuat data akun…</p></div>`;
 $("open").onclick=async()=>{location.hash="";if(!(await JM.hasContent())||JM.needsUpdate())return viewDownload(true);go();};$("rf").onclick=viewAdmin;$("out").onclick=logout;
 try{AD.list=await JMSB.rpc("admin_list");const c=await JM.checkin();AD.set=c.settings||{};drawAdmin();}catch(e){$("adm").innerHTML=`<div class="msg err">${esc(err(e))}</div>`;}}
function flags(p){const f=[],S=AD.set,inact=+S.inactive_days||30,maxd=+S.max_devices||3;
 if(p.status=="active"&&(!p.last_seen||(Date.now()-new Date(p.last_seen))/86400e3>inact))f.push(["🟡","Tidak online > "+inact+" hari"]);
 if(p.device_count>maxd)f.push(["🔴",p.device_count+" perangkat (batas "+maxd+")"]);
 if(p.status=="pending"&&(Date.now()-new Date(p.created_at))/86400e3>7)f.push(["⏳","Menunggu ACC > 7 hari"]);return f;}
function drawAdmin(){const L=AD.list,c=k=>L.filter(k).length;const flagged=L.filter(p=>flags(p).length);
 const T=[["pending","Menunggu ACC",c(p=>p.status=="pending")],["active","Aktif",c(p=>p.status=="active")],["disabled","Nonaktif",c(p=>p.status=="disabled")],["admin","Admin",c(p=>p.role=="admin")],["flag","Perlu dicek",flagged.length],["all","Semua",L.length],["set","⚙ Pengaturan"],["ver","⬆ Versi & materi"],["log","📜 Log"]];
 $("adm").innerHTML=`<div class="grid4"><div class="stat"><b>${L.length}</b><span>Total akun</span></div><div class="stat"><b>${c(p=>p.status=="pending")}</b><span>Menunggu ACC</span></div><div class="stat"><b>${c(p=>p.status=="active")}</b><span>Aktif</span></div><div class="stat"><b>${flagged.length}</b><span>Perlu dicek</span></div></div>
 ${AD.set.maintenance?`<div class="msg err">🛠️ Mode maintenance sedang AKTIF — guru tidak bisa membuka materi.</div>`:""}
 <div class="tabs" role="tablist">${T.map(t=>`<button data-t="${t[0]}" class="${AD.tab==t[0]?"on":""}">${t[1]}${t[2]!=null?` (${t[2]})`:""}</button>`).join("")}</div><div id="ab"></div>`;
 $("adm").querySelectorAll("[data-t]").forEach(b=>b.onclick=()=>{AD.tab=b.dataset.t;drawAdmin();});
 const B=$("ab");if(AD.tab=="set")return drawSettings(B);if(AD.tab=="ver")return drawVersion(B);if(AD.tab=="log")return drawLog(B);
 const F={pending:p=>p.status=="pending",active:p=>p.status=="active",disabled:p=>p.status=="disabled",admin:p=>p.role=="admin",flag:p=>flags(p).length,all:()=>true}[AD.tab];
 const q=AD.q.toLowerCase();const arr=L.filter(F).filter(p=>!q||[p.username,p.email,p.display_name].join(" ").toLowerCase().includes(q));
 B.innerHTML=`<input id="aq" placeholder="Cari nama, ID, atau email…" value="${esc(AD.q)}" style="margin-bottom:10px">`+(arr.length?arr.map(card).join(""):`<p class="mu">Tidak ada akun di sini.</p>`);
 $("aq").oninput=e=>{AD.q=e.target.value;const pos=e.target.selectionStart;drawAdmin();const i=$("aq");i.focus();i.setSelectionRange(pos,pos);};
 B.querySelectorAll("[data-a]").forEach(b=>b.onclick=()=>act(b.dataset.a,b.dataset.u));}
function card(p){const me=JM.st().username==p.username;const f=flags(p);
 const st={pending:"Menunggu ACC",active:"Aktif",disabled:"Nonaktif"}[p.status];
 const btn=(a,t,cls)=>`<button class="btn sm ${cls||""}" data-a="${a}" data-u="${p.id}">${t}</button>`;
 return `<div class="acc"><div class="acc-h"><b>${esc(p.display_name||p.username)}</b><span class="mu">@${esc(p.username)}</span><span class="tag t-${p.status}">${st}</span>${p.role=="admin"?`<span class="tag t-admin">Admin</span>`:""}${me?`<span class="tag">Anda</span>`:""}</div>
 <div class="mu">${esc(p.email)} · daftar ${fmt(p.created_at)}${p.approved_at?` · ACC ${fmt(p.approved_at)} oleh ${esc(p.approved_by||"-")}`:""}</div>
 <div class="mu">Terakhir online: <b>${ago(p.last_seen)}</b> · Perangkat: <b>${p.device_count}</b> · Aktivitas: <b>${p.activity_count}</b>${p.last_activity?` (terakhir ${ago(p.last_activity)})`:""}${p.app_version?` · versi materi ${p.app_version}`:""}</div>
 ${f.length?`<div class="flags">${f.map(x=>`<span class="flag">${x[0]} ${esc(x[1])}</span>`).join("")}</div>`:""}
 <div class="row" style="margin-top:6px">${p.status=="pending"?btn("acc","✓ Setujui","pri")+btn("rej","✕ Tolak & hapus","bad"):""}
 ${p.status=="active"&&!me?btn("dis","Nonaktifkan"):""}${p.status=="disabled"?btn("en","Aktifkan lagi"):""}
 ${btn("det","Detail")}${p.status=="active"?btn("dev","Reset perangkat"):""}
 ${p.status=="active"&&!me?(p.role=="admin"?btn("demote","Turunkan dari admin"):btn("promote","Jadikan admin")):""}
 ${!me&&p.status!="pending"?btn("del","Hapus akun","bad"):""}</div></div>`;}
function confirmBox(title,text,typeWord,okText){return new Promise(res=>{const o=document.createElement("div");o.className="ov";
 o.innerHTML=`<div class="card" role="dialog" aria-modal="true"><h2>${esc(title)}</h2><p>${text}</p>${typeWord?`<label for="cw">Ketik <b>${typeWord}</b> untuk melanjutkan</label><input id="cw" autocomplete="off">`:""}<div class="row" style="margin-top:14px;justify-content:flex-end"><button class="btn" id="cn">Batal</button><button class="btn pri" id="ck" ${typeWord?"disabled":""}>${esc(okText||"Ya")}</button></div></div>`;
 document.body.appendChild(o);const done=v=>{o.remove();res(v);};o.querySelector("#cn").onclick=()=>done(false);o.querySelector("#ck").onclick=()=>done(true);
 if(typeWord){const i=o.querySelector("#cw");i.focus();i.oninput=()=>o.querySelector("#ck").disabled=i.value.trim().toUpperCase()!=typeWord;}else o.querySelector("#ck").focus();});}
async function act(a,uid){const p=AD.list.find(x=>x.id==uid);const n=esc(p.display_name||p.username);
 try{if(a=="det")return detail(p);
  if(a=="acc"){await JMSB.rpc("admin_set_status",{uid,st:"active"});}
  else if(a=="rej"){if(!await confirmBox("Tolak pendaftaran?",`Pendaftaran <b>${n}</b> akan ditolak dan akunnya dihapus.`,null,"Tolak & hapus"))return;await JMSB.rpc("admin_delete_user",{uid});}
  else if(a=="dis"){if(!await confirmBox("Nonaktifkan akun?",`<b>${n}</b> tidak bisa membuka materi lagi. Saat perangkatnya online, data aplikasi di perangkat itu akan dihapus. Akun masih bisa diaktifkan lagi.`,null,"Nonaktifkan"))return;await JMSB.rpc("admin_set_status",{uid,st:"disabled"});}
  else if(a=="en"){await JMSB.rpc("admin_set_status",{uid,st:"active"});}
  else if(a=="dev"){if(!await confirmBox("Reset perangkat?",`Daftar perangkat <b>${n}</b> akan dikosongkan. Perangkat yang masih dipakai akan terdaftar ulang saat online.`,null,"Reset"))return;await JMSB.rpc("admin_reset_devices",{uid});}
  else if(a=="promote"){if(!await confirmBox("Jadikan admin?",`<b>${n}</b> akan mendapat akses penuh ke halaman admin (ACC, hapus akun, pengaturan).`,null,"Jadikan admin"))return;await JMSB.rpc("admin_set_role",{uid,r:"admin"});}
  else if(a=="demote"){await JMSB.rpc("admin_set_role",{uid,r:"teacher"});}
  else if(a=="del"){if(!await confirmBox("Hapus akun permanen?",`Akun <b>${n}</b> (${esc(p.email)}) beserta data perangkat dan aktivitasnya akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.`,"HAPUS","Hapus permanen"))return;await JMSB.rpc("admin_delete_user",{uid});}
  AD.list=await JMSB.rpc("admin_list");drawAdmin();}
 catch(e){await confirmBox("Gagal",esc(err(e)),null,"OK");}}
async function detail(p){const o=document.createElement("div");o.className="ov";o.innerHTML=`<div class="card" role="dialog" aria-modal="true"><h2>${esc(p.display_name||p.username)} <span class="mu">@${esc(p.username)}</span></h2><p class="mu">Memuat…</p></div>`;document.body.appendChild(o);
 o.onclick=e=>{if(e.target==o)o.remove();};
 try{const d=await JMSB.rpc("admin_user_detail",{uid:p.id});
  o.querySelector(".card").innerHTML=`<h2>${esc(p.display_name||p.username)} <span class="mu">@${esc(p.username)}</span></h2><p class="mu">${esc(p.email)}</p>
  <h2 style="margin-top:12px">Perangkat (${d.devices.length})</h2>${d.devices.length?`<table><tr><th>Perangkat</th><th>Pertama</th><th>Terakhir</th></tr>${d.devices.map(x=>`<tr><td>${esc(x.label)}</td><td>${fmt(x.first_seen)}</td><td>${fmt(x.last_seen)}</td></tr>`).join("")}</table>`:`<p class="mu">Belum ada.</p>`}
  <h2 style="margin-top:12px">Aktivitas terakhir</h2>${d.activity.length?`<table><tr><th>Waktu</th><th>Kegiatan</th></tr>${d.activity.map(x=>`<tr><td>${fmt(x.at)}</td><td>${esc(actText(x))}</td></tr>`).join("")}</table>`:`<p class="mu">Belum ada.</p>`}
  <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn pri" id="cx">Tutup</button></div>`;o.querySelector("#cx").onclick=()=>o.remove();}
 catch(e){o.querySelector(".card").innerHTML=`<div class="msg err">${esc(err(e))}</div><button class="btn" id="cx">Tutup</button>`;o.querySelector("#cx").onclick=()=>o.remove();}}
function actText(x){const d=x.data||{};if(x.kind=="sim")return `模試 ${d.t||""}: ${d.tot!=null?d.tot+"/"+d.max:""} ${d.pass===true?"(lulus)":d.pass===false?"(belum lulus)":""}`;
 if(x.kind=="bq")return `Kuis 文法 ${d.set||""} ${d.g||""}: ${d.ok}/${d.n}`;if(x.kind=="open")return "Membuka aplikasi"+(d.v?" (v"+d.v+")":"");return x.kind+" "+JSON.stringify(d);}
function drawSettings(B){const S=AD.set;B.innerHTML=`<div class="card"><h2>Maintenance</h2><p class="mu">Saat aktif, guru tidak bisa membuka materi (admin tetap bisa). Perangkat yang sedang offline baru melihatnya saat online lagi.</p>
 <div class="sw"><input type="checkbox" id="mt" ${S.maintenance?"checked":""}><label for="mt" style="margin:0">Aktifkan mode maintenance</label></div>
 <label for="mm">Pesan untuk guru</label><textarea id="mm" rows="2" placeholder="Contoh: Sedang menambahkan paket 模試 baru, selesai pukul 20.00.">${esc(S.maint_msg||"")}</textarea></div>
 <div class="card"><h2>Offline & penanda</h2><label for="od">Batas offline (hari)</label><input id="od" type="number" min="1" max="60" value="${+S.offline_days||7}"><p class="mu">Setelah sekian hari tanpa online, aplikasi terkunci sampai bisa mengecek akun.</p>
 <label for="ia">Tandai "tidak aktif" setelah (hari tidak online)</label><input id="ia" type="number" min="1" max="365" value="${+S.inactive_days||30}">
 <label for="md">Batas wajar jumlah perangkat per akun</label><input id="md" type="number" min="1" max="20" value="${+S.max_devices||3}"></div>
 <div id="e"></div><button class="btn pri" id="sv">Simpan pengaturan</button>`;
 $("sv").onclick=async()=>{const b=$("sv");busy(b,true,"Menyimpan…");const p={maintenance:$("mt").checked,maint_msg:$("mm").value.trim(),offline_days:+$("od").value||7,inactive_days:+$("ia").value||30,max_devices:+$("md").value||3};
  try{await JMSB.rpc("admin_settings_set",{p});Object.assign(AD.set,p);JM.put({settings:Object.assign({},JM.st().settings,p)});$("e").innerHTML=`<div class="msg ok">Tersimpan.</div>`;setTimeout(drawAdmin,700);}catch(e){$("e").innerHTML=`<div class="msg err">${esc(err(e))}</div>`;}busy(b,false,"Simpan pengaturan");};}
function drawVersion(B){const S=AD.set;const cur=+S.content_version||0;
 B.innerHTML=`<div class="card"><h2>Versi materi sekarang: ${cur||"belum ada"}</h2><p class="mu">File: ${esc(S.content_path||"—")} · versi minimum: ${+S.min_version||0}</p>
 <h2 style="margin-top:14px">⬆ Unggah versi baru</h2><p class="mu">Pilih file <b>app-vNN.html</b> dari paket update. Setelah diunggah, semua guru mendapat pemberitahuan update saat online.</p>
 <label for="fv">File materi (.html)</label><input id="fv" type="file" accept=".html,text/html">
 <label for="vn">Nomor versi</label><input id="vn" type="number" min="1" value="${cur+1}">
 <label for="um">Catatan update untuk guru (opsional)</label><input id="um" placeholder="Contoh: Tambah paket 模試 N2 Juli 2024" value="">
 <div class="sw"><input type="checkbox" id="mn"><label for="mn" style="margin:0">Wajib update (versi lama tidak bisa dipakai lagi)</label></div>
 <div class="bar"><i id="pb"></i></div><div id="e"></div><button class="btn pri" id="up">Unggah & terbitkan</button></div>
 <div class="card"><h2>🎧 Unggah audio</h2><p class="mu">Pilih semua file di folder <b>aud</b> dari paket update (boleh banyak sekaligus). File dengan nama sama akan diganti.</p>
 <input id="fa" type="file" accept="audio/mpeg,.mp3" multiple><div class="bar" style="margin-top:10px"><i id="pa"></i></div><div id="ea"></div><button class="btn pri" id="ua" style="margin-top:10px">Unggah audio</button></div>
 <div class="card"><h2>📱 Versi aplikasi (APK)</h2><p class="mu">Diumumkan: ${+S.apk_version||"belum ada"} · minimum: ${+S.apk_min||0}${JM.NATIVE?` · APK di perangkat ini: <b>${JM.apkVer()}</b>`:""}</p>
 <p class="mu">Isi setelah merakit APK baru di GitHub dan menaruhnya di Google Drive. Guru yang memakai APK lebih lama melihat tombol <b>Unduh APK</b>. Materi dan audio <b>tidak</b> perlu APK baru.</p>
 <label for="av">Nomor versi APK (angka dari GitHub, mis. 3)</label><input id="av" type="number" min="1" value="${+S.apk_version||""}">
 <label for="al">Link unduhan APK</label><input id="al" type="url" placeholder="https://drive.google.com/…" value="${esc(S.apk_url||"")}">
 <label for="am">Catatan untuk guru (opsional)</label><input id="am" value="${esc(S.apk_msg||"")}">
 <div class="sw"><input type="checkbox" id="ax"${+S.apk_min&&+S.apk_min>=(+S.apk_version||0)?" checked":""}><label for="ax" style="margin:0">Wajib update APK (APK lama tidak bisa dipakai)</label></div>
 <div id="eap"></div><button class="btn pri" id="sa">Simpan info APK</button></div>`;
 $("sa").onclick=async()=>{const v=+$("av").value,u=$("al").value.trim();if(!v||!/^https?:\/\//.test(u))return $("eap").innerHTML=`<div class="msg err">Isi nomor versi dan link (diawali https://).</div>`;
  const b=$("sa");busy(b,true,"Menyimpan…");const p={apk_version:v,apk_url:u,apk_msg:$("am").value.trim(),apk_min:$("ax").checked?v:0};
  try{await JMSB.rpc("admin_settings_set",{p});Object.assign(AD.set,p);JM.put({settings:Object.assign({},JM.st().settings,p)});$("eap").innerHTML=`<div class="msg ok">Tersimpan. Guru melihat pemberitahuan saat online.</div>`;}
  catch(e){$("eap").innerHTML=`<div class="msg err">${esc(err(e))}</div>`;}busy(b,false,"Simpan info APK");};
 $("fv").onchange=e=>{const m=(e.target.files[0]||{}).name;const v=m&&m.match(/v(\d+)/);if(v)$("vn").value=v[1];};
 $("up").onclick=async()=>{const f=$("fv").files[0],v=+$("vn").value;if(!f||!v)return $("e").innerHTML=`<div class="msg err">Pilih file dan isi nomor versi.</div>`;
  if(v<=cur&&!await confirmBox("Nomor versi tidak naik",`Versi ${v} tidak lebih besar dari versi sekarang (${cur}), jadi guru tidak akan mendapat pemberitahuan update. Tetap lanjutkan?`,null,"Lanjutkan"))return;
  const b=$("up");busy(b,true,"Mengunggah…");$("pb").style.width="30%";
  try{const path="app/app-v"+v+".html";await JMSB.upload(path,f,"text/html");$("pb").style.width="80%";
   const p={content_version:v,content_path:path,update_msg:$("um").value.trim()};if($("mn").checked)p.min_version=v;await JMSB.rpc("admin_settings_set",{p});Object.assign(AD.set,p);
   $("pb").style.width="100%";$("e").innerHTML=`<div class="msg ok">Versi ${v} sudah terbit. Guru akan melihat tombol update saat online.</div>`;}
  catch(e){$("e").innerHTML=`<div class="msg err">${esc(err(e))}</div>`;}busy(b,false,"Unggah & terbitkan");};
 $("ua").onclick=async()=>{const fs=[...$("fa").files];if(!fs.length)return;const b=$("ua");busy(b,true,"Mengunggah…");let i=0,bad=[];
  for(const f of fs){try{await JMSB.upload("aud/"+f.name,f,"audio/mpeg");}catch(e){bad.push(f.name+": "+err(e));}i++;$("pa").style.width=(i/fs.length*100)+"%";}
  $("ea").innerHTML=bad.length?`<div class="msg err">${bad.length} gagal:<br>${bad.map(esc).join("<br>")}</div>`:`<div class="msg ok">${fs.length} file audio terunggah.</div>`;busy(b,false,"Unggah audio");};}
async function drawLog(B){B.innerHTML=`<p class="mu">Memuat…</p>`;try{const L=await JMSB.rpc("admin_logs");
 B.innerHTML=L.length?L.map(l=>`<div class="log"><b>${fmt(l.at)}</b> · ${esc(l.admin_name||"")} — ${esc(l.action)}${l.target_name?`: ${esc(l.target_name)}`:""}${l.detail&&l.action!="Ubah pengaturan"?` <span class="mu">(${esc(l.detail)})</span>`:""}</div>`).join(""):`<p class="mu">Belum ada catatan.</p>`;}
 catch(e){B.innerHTML=`<div class="msg err">${esc(err(e))}</div>`;}}
window.addEventListener("hashchange",()=>{if(JMSB.session())route();});
start();
})();
