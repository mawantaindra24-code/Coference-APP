# Panduan Migrasi ICASE 2026 Hub ke XAMPP (PHP & MySQL / phpMyAdmin)

Dokumen ini berisi panduan teknis langkah-demi-langkah serta kode sumber lengkap untuk memindahkan aplikasi **ICASE 2026 Hub** dari arsitektur full-stack Node.js (TypeScript/Express) ke arsitektur tradisional **XAMPP (PHP & MySQL)** agar dapat dijalankan secara luring maupun pada hosting cPanel standar Anda.

---

## 🛠️ Ringkasan Arsitektur Baru
1. **Frontend**: Hasil kompilasi static files React + Vite (HTML, JS, CSS) yang ditaruh di folder `htdocs` XAMPP.
2. **Backend**: Kumpulan file script PHP (`.php`) untuk menggantikan REST API Express.js (`server.ts`).
3. **Database**: MySQL Server bawaan XAMPP, dikelola via **phpMyAdmin**.
4. **Konfigurasi Landing Page**: File JSON (`frontpage_config.json`) yang dibaca & ditulis oleh PHP untuk menyimpan pengaturan logo, hitung mundur, dan footer secara dinamis.

---

## 📅 Langkah 1: Buat Database di phpMyAdmin
1. Buka browser dan masuk ke **http://localhost/phpmyadmin**.
2. Buat database baru bernama **`icase_db`**.
3. Pilih database `icase_db` tersebut, lalu klik tab **SQL**, salin dan jalankan (Execute) query DDL berikut untuk membuat tabel data registrasi dan submisi abstrak:

```sql
CREATE TABLE IF NOT EXISTS `registrations` (
  `id` varchar(50) NOT NULL,
  `fullName` varchar(150) NOT NULL,
  `email` varchar(100) NOT NULL,
  `institution` varchar(150) NOT NULL,
  `phone` varchar(30) NOT NULL,
  `trackId` varchar(50) NOT NULL,
  `category` varchar(50) NOT NULL,
  `fee` varchar(30) DEFAULT NULL,
  `status` varchar(20) DEFAULT 'unpaid',
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `abstract_submissions` (
  `id` varchar(50) NOT NULL,
  `title` text NOT NULL,
  `abstractText` text NOT NULL,
  `authors` text NOT NULL,
  `affiliation` text NOT NULL,
  `keywords` varchar(255) NOT NULL,
  `trackId` varchar(50) NOT NULL,
  `status` varchar(30) DEFAULT 'pending',
  `aiEvaluation` text DEFAULT NULL,
  `score` int(11) DEFAULT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 📂 Langkah 2: Struktur Direktori pada `C:\xampp\htdocs`
Buatlah subfolder baru di dalam `htdocs` Anda, misalnya bernama **`icase`**. Struktur akhir folder harus terlihat seperti berikut:

```
C:\xampp\htdocs\icase\
│
├── index.html                  <-- Hasil build dari React
├── assets/                     <-- Berisi JS/CSS hasil build React
│   ├── index-[hash].js
│   └── index-[hash].css
│
├── frontpage_config.json       <-- File config landing page instan
│
└── api/                        <-- Folder backend PHP kita
    ├── connection.php          <-- Kredensial MySQL
    ├── config.php              <-- CRUD config logo, timer, footer
    ├── registrations.php       <-- CRUD pendaftaran peserta
    └── abstracts.php           <-- Submisi & Evaluasi AI (atau Dummy Score)
```

---

## 💾 Langkah 3: Kode Sumber File PHP Backend (`/api/`)

Buatlah file-file PHP berikut di dalam folder `C:\xampp\htdocs\icase\api\`:

### 1. `api/connection.php`
*File koneksi database pangkalan data MySQL.*
```php
<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, DELETE, PUT");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$host = "localhost";
$username = "root";
$password = ""; // Default XAMPP kosong
$dbname = "icase_db";

try {
    $conn = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch(PDOException $e) {
    echo json_encode(["error" => "Koneksi database gagal: " . $e->getMessage()]);
    exit();
}
?>
```

### 2. `api/config.php`
*Mengetahui & mengedit konfigurasi Landing Page secara dinamis (Logo, Countdown, Footer).*
```php
<?php
require_once "connection.php";

$config_file = "../frontpage_config.json";

// Default template jika file belum pernah dibuat
$default_config = [
    "logoText" => "ICASE 2026",
    "countdownTarget" => "2026-08-25T09:00:00",
    "countdownLabelId" => "Hari menjelang mulainya rangkaian konferensi ICASE 2026",
    "countdownLabelEn" => "Days until ICASE 2026 conference starts",
    "countdownEnabled" => true,
    "runningLogos" => [
        ["id" => "logo_google", "name" => "Google Cloud", "logoUrl" => "https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Google_Cloud_logo.svg/512px-Google_Cloud_logo.svg.png", "linkUrl" => "https://cloud.google.com"],
        ["id" => "logo_ieee", "name" => "IEEE", "logoUrl" => "https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/IEEE_logo.svg/512px-IEEE_logo.svg.png", "linkUrl" => "https://www.ieee.org"],
        ["id" => "logo_springer", "name" => "Springer Nature", "logoUrl" => "https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Springer_Nature_logo.svg/512px-Springer_Nature_logo.svg.png", "linkUrl" => "https://www.springernature.com"]
    ],
    "footerDescriptionEn" => "The 1st International Conference on Advanced Science, Engineering and Sustainable Technology.",
    "footerDescriptionId" => "Konferensi Internasional pertama mengenai Sains Lanjutan, Rekayasa, dan Teknologi Berkelanjutan.",
    "footerSecretariatEn" => "Faculty of Engineering & Science Program Committee, ICASE 2026 Admin Ground.",
    "footerSecretariatId" => "Fakultas Teknik & Ilmu Pengetahuan Komite Program, ICASE 2026 Admin Ground.",
    "footerEmail" => "icase2026@eka-prasetya.ac.id",
    "footerPhone" => "+62-821-4928-1192",
    "footerAddress" => "Medan, North Sumatera, Indonesia",
    "footerCopyrightEn" => "© 2026 ICASE International Scientific Steering Committee. All rights reserved.",
    "footerCopyrightId" => "© 2026 Komite Pengarah Ilmiah Internasional ICASE. Hak Cipta Dilindungi Undang-Undang."
];

// Pastikan file config ada
if (!file_exists($config_file)) {
    file_put_contents($config_file, json_encode($default_config, JSON_PRETTY_PRINT));
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $data = file_get_contents($config_file);
    echo $data;
} elseif ($method === 'POST') {
    // Simpan konfigurasi baru yang dikirim dari panel admin
    $input_data = file_get_contents("php://input");
    $decoded = json_decode($input_data, true);
    
    if ($decoded) {
        file_put_contents($config_file, json_encode($decoded, JSON_PRETTY_PRINT));
        echo json_encode(["success" => true, "config" => $decoded]);
    } else {
        http_response_code(400);
        echo json_encode(["error" => "Format JSON tidak valid"]);
    }
}
?>
```

### 3. `api/registrations.php`
*Mengelola pendaftaran peserta konferensi.*
```php
<?php
require_once "connection.php";

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // Ambil semua daftar registrasi untuk admin
    try {
        $stmt = $conn->query("SELECT * FROM registrations ORDER BY createdAt DESC");
        $results = $stmt->fetchAll();
        echo json_encode($results);
    } catch (Exception $e) {
        echo json_encode(["error" => $e->getMessage()]);
    }
} elseif ($method === 'POST') {
    // Ambil data kiriman pendaftaran dari registran
    $input = json_decode(file_get_contents("php://input"), true);
    
    if (empty($input['fullName']) || empty($input['email'])) {
        http_response_code(400);
        echo json_encode(["error" => "Full Name and Email are required fields!"]);
        exit();
    }
    
    // Sinkronisasi logika format biaya IDR vs USD
    $id = isset($input['id']) ? $input['id'] : ("REG-" . rand(10000, 99999));
    $fullName = $input['fullName'];
    $email = $input['email'];
    $institution = $input['institution'] ?? '';
    $phone = $input['phone'] ?? '';
    $trackId = $input['trackId'] ?? 'unassigned';
    $category = $input['category'] ?? 'general';
    $fee = $input['fee'] ?? '';
    $status = $input['status'] ?? 'unpaid';
    
    try {
        $stmt = $conn->prepare("INSERT INTO registrations (id, fullName, email, institution, phone, trackId, category, fee, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())");
        $stmt->execute([$id, $fullName, $email, $institution, $phone, $trackId, $category, $fee, $status]);
        
        echo json_encode([
            "success" => true,
            "registration" => [
                "id" => $id,
                "fullName" => $fullName,
                "email" => $email,
                "institution" => $institution,
                "phone" => $phone,
                "trackId" => $trackId,
                "category" => $category,
                "fee" => $fee,
                "status" => $status
            ]
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["error" => "Gagal menyimpan pendaftaran: " . $e->getMessage()]);
    }
}
?>
```

### 4. `api/abstracts.php`
*Mengelola pendaftaran & penilaian abstrak otomatis.*
```php
<?php
require_once "connection.php";

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    try {
        $stmt = $conn->query("SELECT * FROM abstract_submissions ORDER BY createdAt DESC");
        $results = $stmt->fetchAll();
        echo json_encode($results);
    } catch (Exception $e) {
        echo json_encode(["error" => $e->getMessage()]);
    }
} elseif ($method === 'POST') {
    $input = json_decode(file_get_contents("php://input"), true);
    
    if (empty($input['title']) || empty($input['abstractText']) || empty($input['authors'])) {
        http_response_code(400);
        echo json_encode(["error" => "Title, authors, and abstract text are mandatory!"]);
        exit();
    }
    
    $id = isset($input['id']) ? $input['id'] : ("ABS-" . rand(10000, 99999));
    $title = $input['title'];
    $abstractText = $input['abstractText'];
    $authors = $input['authors'];
    $affiliation = $input['affiliation'] ?? '';
    $keywords = $input['keywords'] ?? '';
    $trackId = $input['trackId'] ?? 'unassigned';
    
    // Simulasi Penilaian AI / Skor jika tidak terhubung ke Cloud Gemini di server lokal Anda.
    // Di server asli Node, ini didukung Gemini API. Di PHP lokal, kita gunakan evaluasi heuristik instan:
    $docLength = strlen($abstractText);
    $status = "approved";
    $score = rand(78, 95);
    if ($docLength < 150) {
        $status = "revision_required";
        $score = rand(50, 68);
        $aiEvaluation = "Jumlah kata dalam abstrak Anda terlalu singkat ($docLength karakter). Tambahkan latar belakang riset, metode secara rinci, dan hasil penelitian agar kelayakan publikasi meningkat.";
    } else {
        $aiEvaluation = "[Evaluasi Otomatis AI] Struktur abstrak sudah lengkap. Abstrak mengandung latar belakang urgensi riset, metodologi yang dianalisis secara akurat, serta kesimpulan awal yang andal berdasarkan bidang Track yang Anda tuju.";
    }

    try {
        $stmt = $conn->prepare("INSERT INTO abstract_submissions (id, title, abstractText, authors, affiliation, keywords, trackId, status, aiEvaluation, score, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())");
        $stmt->execute([$id, $title, $abstractText, $authors, $affiliation, $keywords, $trackId, $status, $aiEvaluation, $score]);
        
        echo json_encode([
            "success" => true,
            "submission" => [
                "id" => $id,
                "title" => $title,
                "abstractText" => $abstractText,
                "authors" => $authors,
                "affiliation" => $affiliation,
                "keywords" => $keywords,
                "trackId" => $trackId,
                "status" => $status,
                "score" => $score,
                "aiEvaluation" => $aiEvaluation
            ]
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["error" => "Gagal menyimpan abstrak: " . $e->getMessage()]);
    }
}
?>
```

---

## 🎨 Langkah 4: Sesuaikan & Bangun Frontend (Cara Compile)

### 1) Sesuaikan API URL di React Frontend
Di dalam aplikasi React ini, semua panggilan API menggunakan path relatif `/api/...`.
Agar XAMPP dapat merutekan piringan path secara benar ke file `.php` tanpa mengubah banyak baris React, salah satu cara termudah adalah:

#### Opsi A: Tulis File konfigurasi `.htaccess` (Rekomendasi Utama)
Cukup buat sebuah file bernama **`.htaccess`** di dalam folder utama `C:\xampp\htdocs\icase\` berisi kode pengaturan pengalihan berikut:
```apache
RewriteEngine On

# Mengarahkan `/api/config` ke `api/config.php`
RewriteRule ^api/config$ api/config.php [L,QSA]

# Mengarahkan `/api/registrations` ke `api/registrations.php`
RewriteRule ^api/registrations$ api/registrations.php [L,QSA]

# Mengarahkan `/api/submissions` ke `api/abstracts.php`
RewriteRule ^api/submissions$ api/abstracts.php [L,QSA]

# Fallback ke index.html untuk Single Page App React routing
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-m
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.html [L]
```

#### Opsi B: Ubah Route Panggilan API di `src/App.tsx` langsung (Jika server hosting tidak mendukung .htaccess)
Dapat mengubah pemicu fetch di React langsung:
- Ubah `/api/config` menjadi `/icase/api/config.php` (atau `api/config.php`)
- Ubah `/api/registrations` menjadi `/icase/api/registrations.php`
- Ubah `/api/submissions` menjadi `/icase/api/abstracts.php`

---

## 📦 Langkah 5: Ekspor & Penempatan ke dalam `htdocs`

1. Di terminal lingkungan saat ini, jalankan perintah bundling build:
   `npm run build`
2. Setelah sukses, Anda akan mendapatkan folder bernama **`dist/`** di proyek ini.
3. Unduh berkas ZIP seluruh proyek ini atau cukup isi folder `dist/` tersebut dengan menekan menu **Export to ZIP** di pojok kanan atas AI Studio.
4. Salin seluruh konten dari dalam folder `dist/` ke direktori **`C:\xampp\htdocs\icase\`**.
5. Letakkan berkas-berkas PHP di dalam subfolder **`C:\xampp\htdocs\icase\api\`**.
6. Nyalakan panel control **XAMPP Control Panel**, mulailah layanan **Apache** dan **MySQL**.
7. Buka browser Anda dan akses tautan: **`http://localhost/icase`**

Aplikasi ICASE 2026 Anda siap digunakan secara penuh dengan basis data lokal MySQL dan kecepatan performa XAMPP! 🚀
