# Panduan Lengkap Deploy Aplikasi React + Firebase Firestore ke cPanel

Panduan ini disusun dari awal demi memudahkan Anda melakukan kompilasi proyek React + Vite (dengan integrasi penuh pangkalan data **Google Firebase Cloud Firestore** & **Authentication**) dan menerapkannya secara mandiri pada hosting **cPanel**.

---

## 🌟 Mengapa Deploy ke cPanel Sangat Sederhana?

Karena aplikasi Anda menggunakan **Metode Client-Side SDK** untuk berinteraksi langsung secara aman dengan Firebase dari peramban (browser) pengguna, **Anda tidak memerlukan server Node.js dinamis yang berjalan terus-menerus di cPanel!** 

Cukup compile proyek web Anda menjadi file statis (HTML, CSS, JS), lalu letakkan pada direktori web server Apache di cPanel. CPanel akan bertindak murni sebagai web server statis berkecepatan tinggi yang sepenuhnya gratis dari penggunaan RAM server Node.js.

---

## 🚀 Langkah 1: Registrasikan Nama Domain Anda di Firebase Console

Demi keamanan, layanan **Google Authentication / Google Login** yang dipasang pada menu Admin Anda akan menolak permintaan otentikasi dari domain luar yang tidak dikenal/didaftarkan.

1. Buka [Firebase Console](https://console.firebase.google.com).
2. Pilih proyek Firebase Anda: `ai-studio-a4f3fdf1-fb3d-4fc0-967b-11ce41bcfa15` (atau proyek produksi Anda sendiri).
3. Masuk ke menu **Authentication** di panel navigasi kiri.
4. Klik tab **Settings** di bagian atas, lalu pilih opsi **Authorized domains** (Domain yang diizinkan).
5. Klik **Add domain** dan tambahkan nama domain website cPanel Anda, misalnya:
   - `namadomainanda.com`
   - `subdomain.namadomainanda.com`
6. Simpan perubahan. Kini Google Login akan berfungsi penuh di domain live Anda.

---

## 🛠️ Langkah 2: Build / Kompilasi Aplikasi di komputer lokal Anda

Sebelum diunggah ke cPanel, Anda wajib mengonversi kode sumber TypeScript (React + Tailwind) menjadi file production-ready yang optimal.

1. Unduh / Export proyek ini dari AI Studio berupa **ZIP** (melalui menu settings) atau clone dari **GitHub**.
2. Buka folder proyek tersebut menggunakan terminal komputer lokal Anda (misalnya VS Code atau CMD).
3. Jalankan perintah instalasi dependensi terlebih dahulu:
   ```bash
   npm install
   ```
4. Setelah instalasi selesai, mulailah proses kompilasi production:
   ```bash
   npm run build
   ```
5. Setelah perintah tersebut selesai berjalan, sebuah folder baru bernama **`dist`** akan terbentuk pada direktori root proyek Anda. Folder `dist` inilah yang menampung seluruh file HTML, CSS, dan Javascript hasil kompilasi.

---

## 📦 Langkah 3: Mengemas dan Mengunggah File ke cPanel

1. Masuk ke folder **`dist`** di komputer Anda.
2. Select (pilih) semua file dan folder di **dalam** folder `dist` tersebut (seperti file `index.html`, folder `assets/`, dll).
   > ⚠️ **PENTING**: Kemaslah (ZIP) isi di dalam folder `dist`, **bukan** membungkus folder `dist` itu sendiri. Hal ini dilakukan agar saat diekstrak di cPanel, file `index.html` terletak langsung pada folder tujuan.
3. Beri nama file arsip tersebut, misalnya `deploy.zip`.
4. Masuk ke dashboard **cPanel** Anda melalui browser.
5. Buka fitur **File Manager**.
6. Arahkan ke direktori root publik tempat Anda ingin menampilkan website:
   - Jika ingin tampil di domain utama: masuk ke folder **`public_html`**.
   - Jika ingin tampil di subdomain atau subfolder: masuk ke lokasi subfolder tujuan (contoh: `public_html/ibec2026`).
7. Klik tombol **Upload**, pilih file `deploy.zip`, lalu tunggu hingga indikator berwarna hijau (100% lengkap).
8. Kembali ke File Manager, klik kanan pada file `deploy.zip` yang baru diunggah, lalu pilih **Extract**.

---

## ⚓ Langkah 4: Membuat File `.htaccess` (Konfigurasi Wajib SPA React Router)

Aplikasi React Anda menggunakan sistem Client-Side Routing (**React Router**). Apabila Anda berada di sub-halaman (seperti `namadomainanda.com/admin` atau `/register`) lalu menekan tombol **F5 / Refresh** di Google Chrome, web server Apache di cPanel akan kebingungan mencari folder `/admin` sesungguhnya di server dan menghasilkan eror **404 Not Found**.

Untuk mengatasinya, Apache harus diarahkan agar selalu mengalirkan rute ke induk `index.html`.

1. Di dalam **cPanel File Manager** (pada direktori yang sama dengan `index.html` yang tadi diekstrak, misalkan di dalam `public_html`), buatlah file baru dengan nama **`.htaccess`** (diawali dengan tanda titik).
   > *Catatan: Jika file tidak terlihat setelah dibuat, aktifkan opsi "Show Hidden Files (dotfiles)" pada tombol Settings di pojok kanan atas File Manager.*
2. Klik kanan pada file `.htaccess` dan pilih **Edit**.
3. Salin dan tempel konfigurasi di bawah ini secara utuh:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

4. Klik **Save Changes** (Simpan Perubahan).

---

## 🔗 Tambahan: Jika Aplikasi diletakkan di Sub-direktori (Misal: `yourdomain.com/ibec2026`)

Apabila Anda meletakkan aplikasi di dalam sub-direktori tertentu (bukan root `public_html` langsung), silakan lakukan sedikit penyesuaian berikut sebelum menjalankan `npm run build`:

1. Buka file `vite.config.ts` di komputer Anda, lalu tambahkan properti `base`:
   ```typescript
   export default defineConfig({
     base: '/ibec2026/', // Sesuaikan dengan nama subfolder cPanel Anda
     plugins: [react(), tailwind()],
   });
   ```
2. Sesuaikan file `.htaccess` di dalam subfolder tersebut agar menunjuk path sub-direktori:
   ```apache
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteBase /ibec2026/
     RewriteRule ^index\.html$ - [L]
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteRule . /ibec2026/index.html [L]
   </IfModule>
   ```

---

## 🔒 Langkah 5: Terapkan Aturan Keamanan Firestore (Firestore Security Rules)

Agar database Anda aman dari aksi sabotase pihak luar, pastikan aturan keamanan database yang telah dikonfigurasikan di dalam berkas `firestore.rules` proyek ini terpasang sempurna di panel Firebase Anda:

1. Buka [Firebase Console](https://console.firebase.google.com).
2. Masuk ke menu **Firestore Database** -> klik tab **Rules** di bagian atas.
3. Salin seluruh isi berkas `firestore.rules` dari folder proyek Anda dan unggah langsung ke kolom editor peraturan Firestore tersebut.
4. Klik **Publish**.

---

## 🎉 Hasil Akhir & Verifikasi

Setelah seluruh proses di atas terpenuhi, buka alamat website Anda di browser. Cobalah fungsionalitas berikut:
- **Pendaftaran Peserta**: Isi formulir registrasi dan submit, lalu cek apakah entri baru langsung muncul secara realtime di dashboard Firebase Firestore Anda.
- **Pengajuan Abstrak**: Lakukan submit draf abstrak dan periksa apakah sistem AI Reviewer mengevaluasi serta merekam hasil penilaian instan dengan aman di database cloud.
- **Login Google Admin**: Akses panel Admin dan lakukan login via akun Google Admin Anda (`mawanta@eka-prasetya.ac.id`) untuk mengelola seluruh data dari berbagai perangkat secara bersamaan.

*Semoga sukses dengan penyelenggaraan konferensi internasional IBEC 2026!*
