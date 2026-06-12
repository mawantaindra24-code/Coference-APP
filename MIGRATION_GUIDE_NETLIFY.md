# Panduan Migrasi & Integrasi Pangkalan Data (Netlify Compatibility Guide)

Sistem ini didesain dengan arsitektur **Hybrid / Adaptive Database** sehingga 100% kompatibel dideploy ke penyedia hosting statis seperti **Netlify** (`app.netlify.com`) secara langsung tanpa perlu menyewa server backend tambahan!

---

## 🚀 Bagaimana Cara Kerjanya?

1. **Pendeteksian Otomatis (Adaptive Fallback)**:
   Saat aplikasi dimuat pertama kali di browser Anda, ia akan mendeteksi apakah server Node.js aktif di latar belakang (misalnya berjalan lokal di `localhost:3000` atau di Cloud Run).
2. **Mode Offline/Sandbox Lokal**:
   Jika server dinamis tidak merespons atau mengembalikan halaman HTML statis (yang merupakan standar perilaku hosting statis Netlify untuk rute tidak terdefinisi), sistem akan secara otomatis masuk ke **Mode Demo Sandbox**.
3. **Penyimpanan Lokal (`localStorage`)**:
   Semua data registrasi peserta, pengajuan abstrak ilmiah, penilaian cerdas dari AI, serta pengaturan front-page akan dialihkan langsung ke pangkalan data internal browser Anda (`localStorage`). Anda dapat mengisi formulir, melakukan review AI khayalan secara instan, mengubah konfigurasi di menu Admin, dan menghapus entri seolah-olah Anda terhubung ke database asli!

---

## 🛠️ Opsi Hubungkan ke Pangkalan Data Riil & Server Produksi

Jika Anda berniat menggunakan aplikasi ini untuk kebutuhan fungsional publik yang sesungguhnya (di mana data dari seluruh pendaftar harus tersimpan terpusat pada satu database), gunakan salah satu opsi migrasi di bawah ini:

### 🌟 OPSI A: Hosting Server Dinamis Terpisah (Sangat Direkomendasikan)
Anda dapat mendeploy berkas server Express.js asli (`server.ts` / `dist/server.cjs`) ke gratisan hosting backend seperti **Render**, **Railway**, atau **Fly.io**:

1. Terapkan repository ini ke salah satu penyedia layanan di atas.
2. Atur command build di Render/Railway:
   `npm run build`
3. Atur command start:
   `npm run start`
4. Dapatkan URL backend dinamis Anda (misal: `https://icase-backend.onrender.com`).
5. Pada proyek frontend di Netlify Anda, tambahkan file redirect di direktori `public/_redirects` atau buat `netlify.toml` untuk mem-proxy permintaan `/api/*` ke URL backend Anda secara aman tanpa CORS issue:

```toml
# netlify.toml
[[redirects]]
  from = "/api/*"
  to = "https://icase-backend.onrender.com/api/:splat"
  status = 200
  force = true
```

### 🌟 OPSI B: Migrasi ke Firebase Firestore (Paling Praktis untuk Penyimpanan Cloud)
Jika Anda tidak ingin menyewa server dinamis dan ingin tetap menggunakan Netlify, Anda dapat menggunakan **Firebase (Firestore + Auth)** untuk menyimpan data di cloud secara aman dan mengambilnya langsung dari sisi klien:

1. Buat proyek baru di [Firebase Console](https://console.firebase.google.com).
2. Aktifkan **Cloud Firestore** dan **Firebase Authentication** (opsional untuk Admin).
3. Buat file inisialisasi Firebase di frontend (misal: `src/firebase.ts`) dengan kredensial proyek Anda.
4. Ganti pemanggilan `fetch('/api/register')` dan lainnya di `src/App.tsx` langsung menggunakan SDK Firebase:

```typescript
// Contoh implementasi register menggunakan Firestore SDK
import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';

const handleRegisterSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  // Simpan data langsung ke Google Firebase Cloud Firestore
  await addDoc(collection(db, "registrations"), regForm);
};
```

---

## 📝 Ringkasan Akun Uji Admin Mode Sandbox
Saat berada dalam Mode Demo Browser Aktif di Netlify, Anda dapat masuk ke dasbor admin konferensi dengan menekan tombol **Auto-Login** atau mengisi kredensial default berikut:

* **Username**: `admin`
* **Password**: `admin123`

Semua perubahan konten halaman, penambahan skema biaya, dan penghapusan entri pendaftar saat Anda login sebagai Admin akan tersimpan secara instan di browser Anda!

---
*Dibuat dengan dedikasi penuh untuk kompatibilitas tak terbatas ICASE 2026 Admin Ground.*
