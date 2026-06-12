import { ConferenceTrack, ImportantDate, KeynoteSpeaker } from './types';

export const CONFERENCE_TRACKS: ConferenceTrack[] = [
  {
    id: "track-ai",
    nameEn: "IoT, AI, and Machine Learning",
    nameId: "IoT, Artificial Intelligence & Machine Learning",
    descriptionEn: "Deep learning models, predictive diagnostics, computer vision, smart nodes, and robotic sensor automation systems in research & industry.",
    descriptionId: "Model deep learning, diagnostik prediktif, computer vision, simpul pintar, dan sistem otomasi sensor robotik pada riset & industri.",
    iconName: "Cpu"
  },
  {
    id: "track-energy",
    nameEn: "Renewable & Sustainable Energy",
    nameId: "Energi Terbarukan & Berkelanjutan",
    descriptionEn: "Photovoltaic optimizations, wind power integration, smart micro-grids, hydrogen fuel innovations, and clean carbon emission models.",
    descriptionId: "Optimasi sistem fotovoltaik, integrasi energi angin, kluster jaringan mikro pintar, bahan bakar hidrogen, dan model emisi karbon nol bersih.",
    iconName: "Zap"
  },
  {
    id: "track-materials",
    nameEn: "Advanced Materials & Chemical Engineering",
    nameId: "Material Maju & Rekayasa Kimia",
    descriptionEn: "Nanomaterials synthesis, polymer composites, lightweight alloys for engineering, catalytic innovations, and industrial thermodynamics.",
    descriptionId: "Sintesis nanomaterial, komposit polimer, paduan logam ringan untuk rekayasa industri, katalis baru, dan termodinamika industri.",
    iconName: "Atom"
  },
  {
    id: "track-environment",
    nameEn: "Environmental Sciences & Green Tech",
    nameId: "Ilmu Lingkungan & Teknologi Hijau",
    descriptionEn: "Eco-conservation, modern climate prediction models, green architecture, waste recycling tech, and maritime soil erosion mitigation.",
    descriptionId: "Pelestarian lingkungan hidup, model iklim modern, arsitektur hijau, teknologi pengolahan limbah organik, dan mitigasi erosi pesisir pantai.",
    iconName: "Leaf"
  },
  {
    id: "track-social",
    nameEn: "Social & Digital Humanity in Industry 5.0",
    nameId: "Sosiologi Digital & Humaniora Industri 5.0",
    descriptionEn: "Computational social sciences, digital education transformations, tech-business ethics, and human-computer collaborative models.",
    descriptionId: "Ilmu sosial komputasional, transformasi pendidikan digital, etika bisnis teknologi, dan pola kolaborasi manusia-komputer.",
    iconName: "Globe"
  }
];

export const IMPORTANT_DATES: ImportantDate[] = [
  {
    titleEn: "Abstract Submission Opens",
    titleId: "Pendaftaran & Pembukaan Abstrak",
    date: "May 10, 2026",
    badgeEn: "Open",
    badgeId: "Dibuka",
    completed: true
  },
  {
    titleEn: "Abstract Submission Deadline",
    titleId: "Batas Akhir Unggah Abstrak",
    date: "July 12, 2026",
    badgeEn: "Standard",
    badgeId: "Standar",
    completed: false
  },
  {
    titleEn: "Acceptance Notification",
    titleId: "Pengumuman Penerimaan Abstrak",
    date: "July 20, 2026",
    badgeEn: "Within 2 min",
    badgeId: "Instan 2 Menit",
    completed: false
  },
  {
    titleEn: "Early Bird Registration",
    titleId: "Batas Pembayaran Early Bird",
    date: "July 31, 2026",
    badgeEn: "Discount Rate",
    badgeId: "Potongan Biaya",
    completed: false
  },
  {
    titleEn: "Camera-Ready Full Paper Due",
    titleId: "Batas Akhir Naskah Lengkap (Full)",
    date: "August 15, 2026",
    badgeEn: "Strict",
    badgeId: "Ketat",
    completed: false
  },
  {
    titleEn: "Main Conference Days",
    titleId: "Pelaksanaan Konferensi Utama",
    date: "August 25 - 26, 2026",
    badgeEn: "Hybrid Event",
    badgeId: "Hybrid (Online/Offline)",
    completed: false
  }
];

export const KEYNOTE_SPEAKERS: KeynoteSpeaker[] = [
  {
    name: "Prof. Sarah Jenkins, Ph.D.",
    title: "Chairperson of Environmental AI Research Institute",
    institution: "University of Oxford, United Kingdom",
    imageUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=350",
    topicEn: "Climate Resilience Analytics using Multi-Spectral Satellite Deep Learning Model",
    topicId: "Analisis Ketahanan Iklim menggunakan Model Deep Learning Satelit Multi-Spektral"
  },
  {
    name: "Akihiro Taniguchi, Dr.Eng",
    title: "Senior Lead of Renewable Microgrid System Innovation Lab",
    institution: "Tokyo Institute of Technology, Japan",
    imageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=350",
    topicEn: "Autonomous Peak-Utility Decentralization via Algorithmic Smart Grids and Local Photovoltaics",
    topicId: "Desentralisasi Utilitas Beban Puncak Mandiri via Smart Grid Berbasis Algoritma & Panel Surya Lokal"
  },
  {
    name: "Prof. Dr. Richard Sitorus, M.Sc",
    title: "Professor of Intelligent Grid & Machine Learning",
    institution: "Universitas Indonesia, Indonesia",
    imageUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=350",
    topicEn: "Evolutionary Urban Power Scheduling: Balancing Local Battery Reservoirs and Grid Transmission Costs",
    topicId: "Penjadwalan Pengisian Energi Urban Evolusioner: Balancing Baterai Lokal dan Biaya Transmisi Listrik"
  }
];

export const REGISTRATION_FEES = {
  presenter: {
    domesticEarly: "IDR 1.250.000",
    domesticNormal: "IDR 1.500.000",
    intlEarly: "USD 150",
    intlNormal: "USD 200"
  },
  attendee: {
    domestic: "IDR 350.000",
    intl: "USD 35"
  },
  poster: {
    domesticEarly: "IDR 750.000",
    domesticNormal: "IDR 900.000",
    intlEarly: "USD 80",
    intlNormal: "USD 100"
  }
};
