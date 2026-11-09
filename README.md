# Jellyfish Master — APK Android

Proyek ini dirakit otomatis oleh GitHub Actions (tab **Actions → Rakit APK → Run workflow**).

- `www/` — tampilan login/admin di dalam APK. Materi dan audio **tidak** ada di sini: diunduh setelah login dari Supabase.
- `www/config.js` — dibiarkan apa adanya; saat dirakit, isinya diambil otomatis dari aplikasi web (Netlify).
- `res/`, `tools/` — ikon, layar pembuka, dan pengaturan versi.
- Kunci tanda tangan APK disimpan di **Settings → Secrets and variables → Actions** (`KEYSTORE_B64`, `KEYSTORE_PASS`), bukan di repositori.
