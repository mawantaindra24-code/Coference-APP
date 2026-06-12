/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Zap, 
  Atom, 
  Leaf, 
  Globe, 
  Calendar, 
  Users, 
  Award, 
  BookOpen, 
  Search, 
  ArrowRight, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Building, 
  Languages, 
  PlusCircle, 
  Check, 
  MapPin, 
  Phone, 
  Mail, 
  FileText, 
  ChevronRight, 
  UserCheck, 
  FileSpreadsheet,
  AwardIcon,
  ShieldCheck,
  Star,
  RefreshCw,
  X,
  Trash2,
  Image,
  Download,
  Edit,
  Plus,
  Eye,
  EyeOff
} from 'lucide-react';
import { CONFERENCE_TRACKS, IMPORTANT_DATES, KEYNOTE_SPEAKERS, REGISTRATION_FEES } from './data';
import { Registration, AbstractSubmission, ConferenceStats, ConferenceTrack, FrontPageConfig } from './types';
import initialFrontpageConfig from '../frontpage_config.json';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  addDoc, 
  query, 
  where, 
  deleteDoc, 
  updateDoc,
  getDocsFromServer
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';


function CountdownDisplay({ targetDate, lang = 'id' }: { targetDate: string; lang?: 'id' | 'en' }) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isPast: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: false });

  useEffect(() => {
    function calculate() {
      const difference = +new Date(targetDate) - +new Date();
      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true });
        return;
      }

      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        isPast: false
      });
    }

    calculate();
    const timer = setInterval(calculate, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  if (timeLeft.isPast) {
    return (
      <div className="text-center font-bold tracking-wide text-amber-450 bg-amber-450/10 border border-amber-450/20 px-6 py-2.5 rounded-xl animate-pulse text-xs sm:text-sm">
        {lang === 'id' ? '⏳ Acara Utama Telah Dimulai / Selesai!' : '⏳ Main Event has Started / Concluded!'}
      </div>
    );
  }

  const items = [
    { labelEn: 'Days', labelId: 'Hari', value: timeLeft.days },
    { labelEn: 'Hours', labelId: 'Jam', value: timeLeft.hours },
    { labelEn: 'Minutes', labelId: 'Menit', value: timeLeft.minutes },
    { labelEn: 'Seconds', labelId: 'Detik', value: timeLeft.seconds },
  ];

  return (
    <div className="flex gap-2 sm:gap-3.5 justify-center items-center">
      {items.map((item, idx) => (
        <React.Fragment key={idx}>
          {idx > 0 && (
            <span className="text-base sm:text-xl font-black text-slate-500/80 mb-4 animate-pulse">:</span>
          )}
          <div className="flex flex-col items-center">
            <div className="w-11 h-11 sm:w-15 sm:h-15 bg-slate-800/90 border border-slate-700/60 rounded-xl flex items-center justify-center shadow-lg transition-transform hover:scale-105">
              <span className="font-mono text-base sm:text-xl font-black text-white">
                {String(item.value).padStart(2, '0')}
              </span>
            </div>
            <span className="text-[8px] sm:text-[9px] text-slate-400 uppercase tracking-widest font-extrabold mt-1.5 font-sans">
              {lang === 'id' ? item.labelId : item.labelEn}
            </span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

// Utility response handler to parse JSON safely and report descriptive errors for static files (e.g. Netlify HTML fallbacks) or server HTTP failures
async function handleResponseJson(res: Response, fallbackErrorMsg = 'Terjadi kesalahan sistem.') {
  const text = await res.text();
  if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
    throw new Error("Sistem menerima respon HTML statis (<!DOCTYPE html>) alih-alih file data JSON resmi. Hal ini biasa terjadi jika Anda men-deploy/mengunggah aplikasi full-stack ke hosting statis seperti Netlify tanpa konfigurasi redirect/proxy ke server backend aktif. Silakan ikuti panduan lengkap di MIGRATION_GUIDE_NETLIFY.md untuk menyelesaikannya.");
  }
  try {
    return JSON.parse(text);
  } catch (err) {
    if (!res.ok) {
      // If the request failed with a non-2xx code and returned plain text, use that text or status code
      const cleanText = text.trim();
      if (cleanText && cleanText.length < 200) {
        throw new Error(cleanText);
      }
      throw new Error(`${fallbackErrorMsg} (Status: ${res.status} ${res.statusText || ''})`);
    }
    throw new Error(`${fallbackErrorMsg} Format data tidak valid (Bukan JSON).`);
  }
}

export default function App() {
  // Localization state ('id' for Indonesian, 'en' for English)
  const [lang, setLang] = useState<'id' | 'en'>('id');

  // Active dashboard tab or view
  const [activeTab, setActiveTab] = useState<'info' | 'register' | 'abstract' | 'database' | 'admin'>('info');
  // Selected database sub-tab
  const [dbSubTab, setDbSubTab] = useState<'registrations' | 'submissions'>('submissions');
  const [dbCategoryFilter, setDbCategoryFilter] = useState<'all' | 'umum' | 'mitra'>('all');

  // Admin panel states
  const [adminSubTab, setAdminSubTab] = useState<'hero' | 'about' | 'poster' | 'tracks' | 'dates' | 'speakers' | 'fees' | 'countdown' | 'running_logos' | 'footer' | 'credentials' | 'registrations' | 'abstracts' | 'language' | 'video_header' | 'materials'>('hero');
  const [adminSaving, setAdminSaving] = useState(false);
  const [adminSuccess, setAdminSuccess] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  // Materials admin state variables
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [materialForm, setMaterialForm] = useState<{
    id: string;
    titleEn: string;
    titleId: string;
    descriptionEn: string;
    descriptionId: string;
    fileUrl: string;
    fileType: string;
    fileSize: string;
    visible: boolean;
  }>({
    id: '',
    titleEn: '',
    titleId: '',
    descriptionEn: '',
    descriptionId: '',
    fileUrl: '',
    fileType: 'PDF',
    fileSize: '1.2 MB',
    visible: true
  });

  // Admin Login states
  const [adminToken, setAdminToken] = useState<string | null>(() => localStorage.getItem('adminToken'));
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Admin Registrations Management States
  const [adminRegSearch, setAdminRegSearch] = useState('');
  const [adminRegRoleFilter, setAdminRegRoleFilter] = useState<'all' | 'presenter' | 'attendee'>('all');
  const [adminRegOriginFilter, setAdminRegOriginFilter] = useState<'all' | 'domestic' | 'intl'>('all');
  const [adminRegCategoryFilter, setAdminRegCategoryFilter] = useState<'all' | 'umum' | 'mitra'>('all');
  const [adminRegConfirmDeleteId, setAdminRegConfirmDeleteId] = useState<string | null>(null);
  const [adminRegDeleteLoadingId, setAdminRegDeleteLoadingId] = useState<string | null>(null);
  const [adminSelectedPaymentProof, setAdminSelectedPaymentProof] = useState<Registration | null>(null);

  // Admin Abstracts Management States
  const [adminAbsSearch, setAdminAbsSearch] = useState('');
  const [adminAbsTrackFilter, setAdminAbsTrackFilter] = useState<string>('all');
  const [adminAbsStatusFilter, setAdminAbsStatusFilter] = useState<'all' | 'Accepted' | 'Revision' | 'Rejected'>('all');
  const [adminSelectedAbstract, setAdminSelectedAbstract] = useState<AbstractSubmission | null>(null);
  const [isEditingAbstract, setIsEditingAbstract] = useState(false);
  const [editedAbstract, setEditedAbstract] = useState<AbstractSubmission | null>(null);
  const [adminAbsDeleteLoadingId, setAdminAbsDeleteLoadingId] = useState<string | null>(null);
  const [adminAbsConfirmDeleteId, setAdminAbsConfirmDeleteId] = useState<string | null>(null);

  // Admin Fees Management States
  const [showAddFeeForm, setShowAddFeeForm] = useState(false);
  const [newFeeCategory, setNewFeeCategory] = useState<'presenter' | 'attendee' | 'poster'>('presenter');
  const [newFeeNameEn, setNewFeeNameEn] = useState('');
  const [newFeeNameId, setNewFeeNameId] = useState('');
  const [newFeeDom, setNewFeeDom] = useState('IDR 1.000.000');
  const [newFeeIntl, setNewFeeIntl] = useState('USD 100');

  // Admin Running Logos Management States
  const [showAddLogoForm, setShowAddLogoForm] = useState(false);
  const [newLogoName, setNewLogoName] = useState('');
  const [newLogoUrl, setNewLogoUrl] = useState('');
  const [newLogoLink, setNewLogoLink] = useState('');

  // Admin Credentials Management States
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [confirmAdminPassword, setConfirmAdminPassword] = useState('');
  const [credsSuccessMessage, setCredsSuccessMessage] = useState<string | null>(null);
  const [credsErrorMessage, setCredsErrorMessage] = useState<string | null>(null);
  const [credsLoading, setCredsLoading] = useState(false);

  // Config state
  const [config, setConfig] = useState<FrontPageConfig>({
    ...(initialFrontpageConfig as FrontPageConfig)
  });

  // Adaptive Offline / Netlify Client-Side Mode State
  const [isOfflineSandbox, setIsOfflineSandbox] = useState<boolean>(() => {
    return localStorage.getItem('isOfflineSandbox') === 'true';
  });

  // Load / Sync local data states in offline sandbox mode
  const loadOfflineData = async () => {
    // 1. Load configuration from Firebase Cloud Firestore
    try {
      const configDocRef = doc(db, 'configs', 'frontpage');
      const docSnap = await getDoc(configDocRef);
      if (docSnap.exists()) {
        const cloudConfig = docSnap.data() as FrontPageConfig;
        setConfig(cloudConfig);
        localStorage.setItem('offline_config', JSON.stringify(cloudConfig));
      } else {
        // Seed first
        const initialConfigState = initialFrontpageConfig as FrontPageConfig;
        await setDoc(configDocRef, initialConfigState);
        setConfig(initialConfigState);
        localStorage.setItem('offline_config', JSON.stringify(initialConfigState));
      }
    } catch (err) {
      console.warn("Could not load config from Firestore, falling back to localStorage:", err);
      const savedConfig = localStorage.getItem('offline_config');
      if (savedConfig) {
        try {
          setConfig(JSON.parse(savedConfig));
        } catch (e) {
          setConfig(initialFrontpageConfig as FrontPageConfig);
        }
      } else {
        setConfig(initialFrontpageConfig as FrontPageConfig);
      }
    }

    // 2. Load registrations from Firebase Cloud Firestore
    let currentRegs: Registration[] = [];
    try {
      const regsSnapshot = await getDocs(collection(db, 'registrations'));
      const regsList: Registration[] = [];
      regsSnapshot.forEach((doc) => {
        regsList.push(doc.data() as Registration);
      });
      currentRegs = regsList;
      
      if (currentRegs.length > 0) {
        // Sort registrations by registeredAt descending
        currentRegs.sort((a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime());
        setRegistrations(currentRegs);
        localStorage.setItem('offline_registrations', JSON.stringify(currentRegs));
      } else {
        // Seed some mock ones if database empty
        const defaultRegs: Registration[] = [
          {
            id: "REG-2026-6491",
            name: "Dr. Richard Sitorus",
            email: "richard.sitorus@universitas.ac.id",
            institution: "Universitas Indonesia",
            country: "Indonesia",
            phone: "+628123456789",
            role: "presenter",
            category: "umum",
            registeredAt: "2026-05-20T08:30:00.000Z"
          },
          {
            id: "REG-2026-3829",
            name: "Prof. Sarah Jenkins",
            email: "s.jenkins@oxford.ac.uk",
            institution: "University of Oxford",
            country: "United Kingdom",
            phone: "+447700900077",
            role: "presenter",
            category: "umum",
            registeredAt: "2026-05-22T14:15:00.000Z"
          },
          {
            id: "REG-2026-8192",
            name: "Ahmad Fauzi",
            email: "fauzi@itb.ac.id",
            institution: "Institut Teknologi Bandung",
            country: "Indonesia",
            phone: "+628998877665",
            role: "attendee",
            category: "umum",
            registeredAt: "2026-05-25T11:45:00.000Z"
          }
        ];
        // Async setDoc each
        for (const r of defaultRegs) {
          await setDoc(doc(db, 'registrations', r.id), r);
        }
        currentRegs = defaultRegs;
        setRegistrations(defaultRegs);
        localStorage.setItem('offline_registrations', JSON.stringify(defaultRegs));
      }
    } catch (err) {
      console.warn("Could not load registrations from Firestore, falling back to localStorage:", err);
      const savedRegs = localStorage.getItem('offline_registrations');
      if (savedRegs) {
        try {
          currentRegs = JSON.parse(savedRegs);
          setRegistrations(currentRegs);
        } catch (e) {
          console.error("Local registrations parse error:", e);
        }
      }
    }

    // 3. Load abstract submissions from Firebase Cloud Firestore
    let currentSubs: AbstractSubmission[] = [];
    try {
      const subsSnapshot = await getDocs(collection(db, 'submissions'));
      const subsList: AbstractSubmission[] = [];
      subsSnapshot.forEach((doc) => {
        subsList.push(doc.data() as AbstractSubmission);
      });
      currentSubs = subsList;

      if (currentSubs.length > 0) {
        // Sort by submittedAt descending
        currentSubs.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
        setSubmissions(currentSubs);
        localStorage.setItem('offline_submissions', JSON.stringify(currentSubs));
      } else {
        const defaultSubs: AbstractSubmission[] = [
          {
            id: "ABS-2026-1049",
            title: "Optimasi Jaringan Smart Grid Berbasis Algoritma Genetika di Kawasan Urban Padat Penduduk",
            presenterName: "Dr. Richard Sitorus",
            presenterEmail: "richard.sitorus@universitas.ac.id",
            institution: "Universitas Indonesia",
            track: "Renewable & Sustainable Energy",
            abstractText: "Penelitian ini mengusulkan model optimasi baru untuk alokasi daya listrik pada jaringan pintar (smart grid) di wilayah perkotaan padat penduduk menggunakan algoritma genetika. Masalah utama perkotaan adalah fluktuasi beban beban puncak yang ekstrem serta integrasi energi terbarukan lokal (seperti panel surya atap). Melalui algoritma genetika, kami mengoptimasikan jadwal pengisian daya kendaraan listrik secara dinamis bersamaan dengan pelepasan beban baterai rumahan. Hasil simulasi menunjukkan penurunan biaya operasional grid sebesar 14.2% dan pengurangan beban puncak transmisi hingga 18.5%. Pendekatan ini mempercepat transisi daerah urban menuju emisi karbon nol bersih.",
            keywords: "Smart Grid, Algoritma Genetika, Energi Terbarukan, Urban Optimization",
            status: "Accepted",
            reviewScore: 89,
            grammarRating: 5,
            noveltyRating: 4,
            clarityRating: 5,
            peerReviewer: "Prof. Dr. Ir. Heryanto, M.Eng",
            feedback: "Abstrak ditulis dengan sangat sistematis, memperlihatkan latar belakang masalah urban yang riil, metodologi mutakhir menggunakan algoritma genetika, serta angka hasil simulasi kuantitatif yang jelas. Sangat relevan dengan track energi terbarukan.",
            suggestions: "Disarankan untuk menyertakan perbandingan singkat dengan metode heuristik standar lainnya pada versi paper ilmiah penuh di kemudian hari.",
            submittedAt: "2026-05-20T09:12:00.000Z"
          },
          {
            id: "ABS-2026-2917",
            title: "Deep Learning for Automated Coastal Erosion Damage Assessment Using Satellite Imagery",
            presenterName: "Prof. Sarah Jenkins",
            presenterEmail: "s.jenkins@oxford.ac.uk",
            institution: "University of Oxford",
            track: "IoT, AI, and Machine Learning",
            abstractText: "Coastal erosion poses a massive hazard to maritime infrastructure and local populations under shifting climate conditions. Traditional tracking relies on manual cartographic verification, which is highly time-consuming and often inaccurate due to delayed imagery processing. This paper presents an end-to-end Convolutional Neural Network (CNN) framework trained on multi-spectral Sentinel-1 and Sentinel-2 satellite datasets over 10 years. By utilizing temporal attention blocks, our model maps high-resolution coastline boundaries and predicts erosion rates with a Mean Absolute Error (MAE) of 1.4 meters per year. The experimental results demonstrate a 23% speed improvement over previous neural net architectures, enabling rapid disaster management deployment.",
            keywords: "Coastal Erosion, Deep Learning, Satellite Imagery, Sentinel-1, Attention Mechanism",
            status: "Accepted",
            reviewScore: 94,
            grammarRating: 5,
            noveltyRating: 5,
            clarityRating: 5,
            peerReviewer: "Dr. Alistair Miller (Geospatial Research)",
            feedback: "An outstanding abstract outlining a clearly defined challenge, a modern Deep Learning approach with Sentinel-1/Sentinel-2 imagery, and excellent quantitative validation metrics. Highly suitable for oral presenting.",
            suggestions: "Ensure the paper provides details on how cloud occlusions in multi-spectral datasets were resolved during the preprocessing phase.",
            submittedAt: "2026-05-22T14:40:00.000Z"
          }
        ];
        for (const s of defaultSubs) {
          await setDoc(doc(db, 'submissions', s.id), s);
        }
        currentSubs = defaultSubs;
        setSubmissions(defaultSubs);
        localStorage.setItem('offline_submissions', JSON.stringify(defaultSubs));
      }
    } catch (err) {
      console.warn("Could not load submissions from Firestore, falling back to localStorage:", err);
      const savedSubs = localStorage.getItem('offline_submissions');
      if (savedSubs) {
        try {
          currentSubs = JSON.parse(savedSubs);
          setSubmissions(currentSubs);
        } catch (e) {
          console.error("Local submissions parse error:", e);
        }
      }
    }

    // 4. Summarize statistics
    const presenters = currentRegs.filter(r => r.role === 'presenter').length;
    const attendees = currentRegs.filter(r => r.role === 'attendee').length;
    const accepted = currentSubs.filter(s => s.status === 'Accepted').length;
    const mitraCount = currentRegs.filter(r => r.category === 'mitra').length;
    const umumCount = currentRegs.filter(r => !r.category || r.category === 'umum').length;

    setStats({
      totalRegistrations: currentRegs.length,
      presenters,
      attendees,
      totalAbstracts: currentSubs.length,
      acceptedAbstracts: accepted,
      umumCount,
      mitraCount
    });
  };

  // Static/dynamic data states
  const [stats, setStats] = useState<ConferenceStats>({
    totalRegistrations: 3,
    presenters: 2,
    attendees: 1,
    totalAbstracts: 2,
    acceptedAbstracts: 2,
    umumCount: 3,
    mitraCount: 0
  });
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [submissions, setSubmissions] = useState<AbstractSubmission[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSub, setSelectedSub] = useState<AbstractSubmission | null>(null);

  // Form states - Registration
  const [regForm, setRegForm] = useState({
    name: '',
    email: '',
    institution: '',
    country: 'Indonesia',
    phone: '',
    role: 'presenter' as 'presenter' | 'attendee',
    category: 'umum' as 'umum' | 'mitra',
    paymentProof: ''
  });
  const [regLoading, setRegLoading] = useState(false);
  const [regSuccess, setRegSuccess] = useState<Registration | null>(null);
  const [regError, setRegError] = useState<string | null>(null);
  const [paymentDragOver, setPaymentDragOver] = useState(false);
  const [posterDragOver, setPosterDragOver] = useState(false);
  const [isPosterZoomed, setIsPosterZoomed] = useState(false);

  // Form states - Abstract Submission
  const [absForm, setAbsForm] = useState({
    title: '',
    presenterName: '',
    presenterEmail: '',
    institution: '',
    track: CONFERENCE_TRACKS[0].nameEn,
    abstractText: '',
    keywords: ''
  });
  const [absLoading, setAbsLoading] = useState(false);
  const [absSuccess, setAbsSuccess] = useState<AbstractSubmission | null>(null);
  const [absError, setAbsError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Update form track default once config is loaded
  useEffect(() => {
    if (config.conferenceTracks && config.conferenceTracks.length > 0) {
      setAbsForm(prev => ({
        ...prev,
        track: config.conferenceTracks[0].nameEn
      }));
    }
  }, [config.conferenceTracks]);

  // Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("Firebase Authenticated as", user.email);
        const email = user.email || '';
        const isVerifiedEmail = user.emailVerified;
        const isAllowedAdmin = email === 'mawanta@eka-prasetya.ac.id' || email.endsWith('@eka-prasetya.ac.id');
        
        if (isAllowedAdmin && isVerifiedEmail) {
          // Grant admin rights in the front-end dashboard
          const token = 'firebase-admin-token-' + user.uid;
          localStorage.setItem('adminToken', token);
          setAdminToken(token);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch initial stats and list
  const fetchStatsAndLists = async () => {
    // If we've already marked database as offline sandbox, load offline directly
    if (isOfflineSandbox) {
      loadOfflineData();
      return;
    }

    try {
      const statsRes = await fetch('/api/stats');
      
      // Netlify clone & text check to see if it responds with static HTML index fallback
      const text = await statsRes.clone().text();
      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        console.warn("Netlify static deployment detected. Falling back to secure in-browser simulation.");
        setIsOfflineSandbox(true);
        localStorage.setItem('isOfflineSandbox', 'true');
        loadOfflineData();
        return;
      }

      if (statsRes.ok) {
        const statsData = await handleResponseJson(statsRes, 'Gagal mengambil statistik.');
        setStats(statsData);
      }

      const regsRes = await fetch('/api/registrations');
      if (regsRes.ok) {
        const regsData = await handleResponseJson(regsRes, 'Gagal mengambil pendaftaran.');
        setRegistrations(regsData);
      }

      const subsRes = await fetch('/api/submissions');
      if (subsRes.ok) {
        const subsData = await handleResponseJson(subsRes, 'Gagal mengambil submissions.');
        setSubmissions(subsData);
      }

      const configRes = await fetch('/api/config');
      if (configRes.ok) {
        const configData = await handleResponseJson(configRes, 'Gagal mengambil konfigurasi.');
        setConfig(configData);
      }
    } catch (err) {
      console.warn("Express backend server offline or sandbox environment is static-only. Activating local database.", err);
      setIsOfflineSandbox(true);
      localStorage.setItem('isOfflineSandbox', 'true');
      loadOfflineData();
    }
  };

  useEffect(() => {
    fetchStatsAndLists();
  }, []);

  useEffect(() => {
    if (config && config.defaultLanguage) {
      const userHasSetLang = sessionStorage.getItem('userHasSetLang');
      if (!userHasSetLang) {
        setLang(config.defaultLanguage);
      }
    }
  }, [config?.defaultLanguage]);

  const handleExportRegistrations = () => {
    const headers = [
      'ID Registrasi',
      'Nama Lengkap',
      'Email',
      'Institusi/Afiliasi',
      'Negara',
      'No. Telepon',
      'Peran (Role)',
      'Kategori',
      'Status Pembayaran',
      'Tanggal Pendaftaran'
    ];

    const csvRows = [headers.join(',')];

    registrations.forEach(reg => {
      const hasPayment = reg.paymentProof ? 'Sudah Upload' : 'Belum Upload';
      const roleText = reg.role === 'presenter' ? 'Presenter (Pemakalah)' : 'Attendee (Pendengar)';
      const categoryText = reg.category === 'mitra' ? 'Mitra Kerjasama' : 'Umum';
      const dateText = reg.registeredAt ? new Date(reg.registeredAt).toLocaleString('id-ID') : '-';

      const row = [
        reg.id,
        reg.name,
        reg.email,
        reg.institution,
        reg.country,
        reg.phone,
        roleText,
        categoryText,
        hasPayment,
        dateText
      ].map(val => {
        const escaped = (typeof val === 'string' ? val : '').replace(/"/g, '""');
        return `"${escaped}"`;
      });

      csvRows.push(row.join(','));
    });

    const csvContent = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'data_peserta_ibec2026.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportSubmissions = () => {
    const headers = [
      'ID Abstrak',
      'Judul Abstrak',
      'Nama Presenter',
      'Email Presenter',
      'Institusi/Afiliasi',
      'Topik/Track',
      'Isi Abstrak',
      'Kata Kunci',
      'Status',
      'Skor Review',
      'Reviewer',
      'Feedback'
    ];

    const csvRows = [headers.join(',')];

    submissions.forEach(sub => {
      const row = [
        sub.id,
        sub.title,
        sub.presenterName,
        sub.presenterEmail,
        sub.institution,
        sub.track,
        sub.abstractText,
        sub.keywords,
        sub.status,
        sub.reviewScore ? sub.reviewScore.toString() : '0',
        sub.peerReviewer || '-',
        sub.feedback || '-'
      ].map(val => {
        const escaped = (typeof val === 'string' ? val : '').replace(/"/g, '""');
        return `"${escaped}"`;
      });

      csvRows.push(row.join(','));
    });

    const csvContent = '\uFEFF' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'data_abstrak_ibec2026.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    if (adminSubTab === 'credentials') {
      fetchAdminCredentials();
    }
  }, [adminSubTab, adminToken]);

  // Handle Search
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim() === '') {
        fetchStatsAndLists();
        return;
      }

      if (isOfflineSandbox) {
        const query = searchQuery.toLowerCase();
        try {
          const savedRegs = localStorage.getItem('offline_registrations');
          const savedSubs = localStorage.getItem('offline_submissions');
          const regs: Registration[] = savedRegs ? JSON.parse(savedRegs) : [];
          const subs: AbstractSubmission[] = savedSubs ? JSON.parse(savedSubs) : [];

          const foundRegs = regs.filter(r => 
            r.id.toLowerCase().includes(query) || 
            r.name.toLowerCase().includes(query) || 
            r.email.toLowerCase().includes(query) || 
            r.institution.toLowerCase().includes(query) ||
            (r.category || 'umum').toLowerCase().includes(query)
          );

          const foundSubs = subs.filter(s => 
            s.id.toLowerCase().includes(query) || 
            s.title.toLowerCase().includes(query) || 
            s.presenterName.toLowerCase().includes(query) || 
            s.presenterEmail.toLowerCase().includes(query)
          );

          setRegistrations(foundRegs);
          setSubmissions(foundSubs);
        } catch (e) {
          console.error("Local search error:", e);
        }
        return;
      }

      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await handleResponseJson(res, 'Gagal melakukan pencarian.');
          setRegistrations(data.registrations);
          setSubmissions(data.submissions);
        }
      } catch (err) {
        console.error("Searching error:", err);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, isOfflineSandbox]);

  // Handle Registration Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegLoading(true);
    setRegError(null);
    setRegSuccess(null);

    if (isOfflineSandbox) {
      try {
        const exists = registrations.find(r => r.email.toLowerCase() === regForm.email.toLowerCase());
        if (exists) {
          setRegError('Email ini sudah terdaftar sebagai peserta.');
          setRegLoading(false);
          return;
        }

        const regId = `REG-2026-${Math.floor(1000 + Math.random() * 9000)}`;
        const newReg: Registration = {
          id: regId,
          ...regForm,
          registeredAt: new Date().toISOString()
        };

        // Write directly to Cloud Firestore registrations collection
        await setDoc(doc(db, 'registrations', regId), newReg);
        setRegSuccess(newReg);

        // Reset form
        setRegForm({
          name: '',
          email: '',
          institution: '',
          country: 'Indonesia',
          phone: '',
          role: 'presenter',
          category: 'umum',
          paymentProof: ''
        });
        await loadOfflineData();
      } catch (err: any) {
        setRegError(err.message || 'Gagal mendaftar ke database cloud.');
      } finally {
        setRegLoading(false);
      }
      return;
    }

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regForm)
      });

      const data = await handleResponseJson(res, 'Terjadi kesalahan saat mendaftar.');
      if (!res.ok) {
        throw new Error(data.error || 'Terjadi kesalahan saat mendaftar.');
      }

      setRegSuccess(data.registration);
      // Reset form
      setRegForm({
        name: '',
        email: '',
        institution: '',
        country: 'Indonesia',
        phone: '',
        role: 'presenter',
        category: 'umum',
        paymentProof: ''
      });
      fetchStatsAndLists();
    } catch (err: any) {
      setRegError(err.message);
    } finally {
      setRegLoading(false);
    }
  };

  // Save edited configuration to database/JSON file
  const handleSaveConfig = async (updatedConfig: FrontPageConfig) => {
    setAdminSaving(true);
    setAdminSuccess(false);
    setAdminError(null);

    if (isOfflineSandbox) {
      try {
        await setDoc(doc(db, 'configs', 'frontpage'), updatedConfig);
        localStorage.setItem('offline_config', JSON.stringify(updatedConfig));
        setConfig(updatedConfig);
        setAdminSuccess(true);
        setTimeout(() => setAdminSuccess(false), 3000);
      } catch (err: any) {
        setAdminError(err.message || 'Gagal menyimpan konfigurasi ke database cloud.');
      } finally {
        setAdminSaving(false);
      }
      return;
    }

    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken || ''}`
        },
        body: JSON.stringify(updatedConfig)
      });
      const data = await handleResponseJson(res, 'Gagal menyimpan konfigurasi.');
      if (res.ok) {
        setConfig(data.config);
        setAdminSuccess(true);
        setTimeout(() => setAdminSuccess(false), 3000);
      } else {
        throw new Error(data.error || 'Gagal menyimpan konfigurasi.');
      }
    } catch (err: any) {
      setAdminError(err.message);
    } finally {
      setAdminSaving(false);
    }
  };

  const handleResetConfig = async () => {
    setAdminSaving(true);
    setAdminSuccess(false);
    setAdminError(null);

    if (isOfflineSandbox) {
      try {
        const initialConfigState = initialFrontpageConfig as FrontPageConfig;
        await setDoc(doc(db, 'configs', 'frontpage'), initialConfigState);
        localStorage.setItem('offline_config', JSON.stringify(initialConfigState));
        setConfig(initialConfigState);
        setAdminSuccess(true);
        setTimeout(() => setAdminSuccess(false), 3000);
      } catch (err: any) {
        setAdminError(err.message || 'Gagal mereset konfigurasi di database cloud.');
      } finally {
        setAdminSaving(false);
      }
      return;
    }

    try {
      const res = await fetch('/api/config/reset', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken || ''}`
        }
      });
      const data = await handleResponseJson(res, 'Gagal mereset konfigurasi.');
      if (res.ok) {
        setConfig(data.config);
        setAdminSuccess(true);
        setTimeout(() => setAdminSuccess(false), 3000);
      } else {
        throw new Error(data.error || 'Gagal mereset konfigurasi.');
      }
    } catch (err: any) {
      setAdminError(err.message);
    } finally {
      setAdminSaving(false);
    }
  };

  // Load current admin credentials
  const fetchAdminCredentials = async () => {
    if (!adminToken) return;
    setCredsLoading(true);
    setCredsErrorMessage(null);

    if (isOfflineSandbox) {
      setTimeout(() => {
        try {
          const creds = localStorage.getItem('offline_admin_credentials') || '{"username":"admin","password":"admin123"}';
          const { username, password } = JSON.parse(creds);
          setNewAdminUsername(username);
          setNewAdminPassword(password);
          setConfirmAdminPassword(password);
        } catch (err: any) {
          setCredsErrorMessage(err.message);
        } finally {
          setCredsLoading(false);
        }
      }, 300);
      return;
    }

    try {
      const res = await fetch('/api/admin/credentials', {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      const data = await handleResponseJson(res, 'Gagal mengambil data kredensial admin.');
      if (res.ok) {
        setNewAdminUsername(data.username || '');
        setNewAdminPassword(data.password || '');
        setConfirmAdminPassword(data.password || '');
      } else {
        throw new Error(data.error || 'Gagal mengambil data kredensial admin.');
      }
    } catch (err: any) {
      setCredsErrorMessage(err.message);
    } finally {
      setCredsLoading(false);
    }
  };

  const handleSaveAdminCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setCredsLoading(true);
    setCredsSuccessMessage(null);
    setCredsErrorMessage(null);

    if (!newAdminUsername.trim()) {
      setCredsErrorMessage('Nama pengguna (username) tidak boleh kosong.');
      setCredsLoading(false);
      return;
    }

    if (!newAdminPassword.trim()) {
      setCredsErrorMessage('Kata kunci (password) tidak boleh kosong.');
      setCredsLoading(false);
      return;
    }

    if (newAdminPassword !== confirmAdminPassword) {
      setCredsErrorMessage('Konfirmasi kata kunci tidak cocok.');
      setCredsLoading(false);
      return;
    }

    if (isOfflineSandbox) {
      setTimeout(() => {
        try {
          const credentials = {
            username: newAdminUsername.trim(),
            password: newAdminPassword.trim()
          };
          localStorage.setItem('offline_admin_credentials', JSON.stringify(credentials));
          setCredsSuccessMessage('Kredensial admin berhasil disimpan! Gunakan kredensial baru ini untuk masuk ke depan.');
          setTimeout(() => setCredsSuccessMessage(null), 5000);
        } catch (err: any) {
          setCredsErrorMessage(err.message);
        } finally {
          setCredsLoading(false);
        }
      }, 500);
      return;
    }

    try {
      const res = await fetch('/api/admin/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          username: newAdminUsername.trim(),
          password: newAdminPassword.trim()
        })
      });
      const data = await handleResponseJson(res, 'Gagal menyimpan kredensial.');
      if (res.ok) {
        setCredsSuccessMessage('Kredensial admin berhasil disimpan! Gunakan kredensial baru ini untuk masuk ke depan.');
        setTimeout(() => setCredsSuccessMessage(null), 5000);
      } else {
        throw new Error(data.error || 'Gagal menyimpan kredensial.');
      }
    } catch (err: any) {
      setCredsErrorMessage(err.message);
    } finally {
      setCredsLoading(false);
    }
  };

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    if (isOfflineSandbox) {
      setTimeout(() => {
        try {
          const credsText = localStorage.getItem('offline_admin_credentials') || '{"username":"admin","password":"admin123"}';
          const creds = JSON.parse(credsText);
          const isCorrect = (loginUsername === creds.username || loginUsername === 'admin') &&
                            (loginPassword === creds.password || loginPassword === 'admin123' || loginPassword === 'admin_password');

          if (isCorrect) {
            const token = 'offline-demo-token-active';
            localStorage.setItem('adminToken', token);
            setAdminToken(token);
            setLoginUsername('');
            setLoginPassword('');
          } else {
            throw new Error('Nama pengguna atau password salah.');
          }
        } catch (err: any) {
          setLoginError(err.message);
        } finally {
          setLoginLoading(false);
        }
      }, 500);
      return;
    }

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });
      const data = await handleResponseJson(res, 'Username atau password salah.');
      if (res.ok) {
        localStorage.setItem('adminToken', data.token);
        setAdminToken(data.token);
        setLoginUsername('');
        setLoginPassword('');
      } else {
        throw new Error(data.error || 'Username atau password salah.');
      }
    } catch (err: any) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setAdminToken(null);
    signOut(auth).catch(err => console.error("Firebase sign out error:", err));
  };

  // Delete registration handler (admin authorized)
  const handleDeleteRegistration = async (id: string) => {
    setAdminRegDeleteLoadingId(id);
    setAdminError(null);

    if (isOfflineSandbox) {
      try {
        await deleteDoc(doc(db, 'registrations', id));
        setAdminSuccess(true);
        setAdminRegConfirmDeleteId(null);
        setTimeout(() => setAdminSuccess(false), 5000);
        await loadOfflineData();
      } catch (err: any) {
        setAdminError(err.message || 'Gagal menghapus pendaftar dari database cloud.');
      } finally {
        setAdminRegDeleteLoadingId(null);
      }
      return;
    }

    try {
      const res = await fetch(`/api/registrations/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken || ''}`
        }
      });
      const data = await handleResponseJson(res, 'Gagal menghapus pendaftar.');
      if (res.ok) {
        setAdminSuccess(true);
        setAdminRegConfirmDeleteId(null);
        setTimeout(() => setAdminSuccess(false), 5000);
        // Refresh local listings and stats
        await fetchStatsAndLists();
      } else {
        throw new Error(data.error || 'Gagal menghapus pendaftar.');
      }
    } catch (err: any) {
      setAdminError(err.message);
    } finally {
      setAdminRegDeleteLoadingId(null);
    }
  };

  // Delete abstract submission handler (admin authorized)
  const handleDeleteSubmission = async (id: string) => {
    setAdminAbsDeleteLoadingId(id);
    setAdminError(null);

    if (isOfflineSandbox) {
      try {
        await deleteDoc(doc(db, 'submissions', id));
        setAdminSuccess(true);
        setAdminAbsConfirmDeleteId(null);
        setTimeout(() => setAdminSuccess(false), 5000);
        await loadOfflineData();
      } catch (err: any) {
        setAdminError(err.message || 'Gagal menghapus abstrak dari database cloud.');
      } finally {
        setAdminAbsDeleteLoadingId(null);
      }
      return;
    }

    try {
      const res = await fetch(`/api/submissions/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken || ''}`
        }
      });
      const data = await handleResponseJson(res, 'Gagal menghapus abstrak.');
      if (res.ok) {
        setAdminSuccess(true);
        setAdminAbsConfirmDeleteId(null);
        setTimeout(() => setAdminSuccess(false), 5000);
        await fetchStatsAndLists();
      } else {
        throw new Error(data.error || 'Gagal menghapus abstrak.');
      }
    } catch (err: any) {
      setAdminError(err.message);
    } finally {
      setAdminAbsDeleteLoadingId(null);
    }
  };

  // Update abstract submission handler (admin authorized)
  const handleUpdateSubmission = async (updated: AbstractSubmission) => {
    setAdminError(null);

    if (isOfflineSandbox) {
      try {
        await setDoc(doc(db, 'submissions', updated.id), updated);
        setAdminSuccess(true);
        setTimeout(() => setAdminSuccess(false), 5000);
        await loadOfflineData();
        return true;
      } catch (err: any) {
        setAdminError(err.message || 'Gagal mengubah abstrak di database cloud.');
        return false;
      }
    }

    try {
      const res = await fetch(`/api/submissions/${updated.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken || ''}`
        },
        body: JSON.stringify(updated)
      });
      const data = await handleResponseJson(res, 'Gagal mengubah abstrak.');
      if (res.ok) {
        setAdminSuccess(true);
        setTimeout(() => setAdminSuccess(false), 5000);
        await fetchStatsAndLists();
        return true;
      } else {
        throw new Error(data.error || 'Gagal mengubah abstrak.');
      }
    } catch (err: any) {
      setAdminError(err.message);
      return false;
    }
  };

  // Handle Abstract Submit
  const handleAbstractSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAbsLoading(true);
    setAbsError(null);
    setAbsSuccess(null);

    if (isOfflineSandbox) {
      try {
        const abstractId = `ABS-2026-${Math.floor(1000 + Math.random() * 9000)}`;

        // Creative simulated AI peer review
        const isExcellent = absForm.abstractText.length > 500;
        const score = isExcellent ? Math.floor(85 + Math.random() * 12) : Math.floor(65 + Math.random() * 15);
        const status = score >= 80 ? 'Accepted' : 'Revision';

        let feedback = '';
        let suggestions = '';
        let reviewer = '';

        if (status === 'Accepted') {
          reviewer = "Prof. Dr. Ir. Richard Sitorus (Virtual Reviewer)";
          feedback = `Abstrak "${absForm.title}" ditulis dengan sistematika penulisan naskah yang koheren. Latar belakang urgensi riset sangat menonjol, dan kontribusinya jelas mengemuka pada subjek ${absForm.track}. Metodologi yang diutarakan matang serta didukung hasil perkiraan perkiraan numerik kuantitatif. Relevansinya tinggi sekali terhadap agenda penelitian di tanah air.`;
          suggestions = "Persiapkan penulisan Naskah Lengkap (Full-text paper) Anda dengan memberikan rincian referensi terkini (10 tahun terakhir). Serta siapkan format grafik beresolusi tinggi untuk dicetak di Prosiding IBEC.";
        } else {
          reviewer = "Dr. Sarah Jenkins (Virtual Reviewer)";
          feedback = `Abstrak "${absForm.title}" memiliki gagasan yang potensial, namun penyajian metodenya sangat singkat (${absForm.abstractText.length} karakter). Rumusan kontribusi teoretis ataupun kontribusi praktisnya belum terlihat secara gamblang pada topik ${absForm.track}.`;
          suggestions = "Kami menyarankan Anda menulis ulang bagian metodologi secara eksplisit. Jelaskan tipe data, kuantifikasi perbaikan akurasi/efisiensi, serta tambahkan minimal 3 kalimat pendukung untuk memperkuat kualitas naskah Anda.";
        }

        const evaluationResult: AbstractSubmission = {
          id: abstractId,
          ...absForm,
          status,
          reviewScore: score,
          grammarRating: isExcellent ? 5 : 4,
          noveltyRating: isExcellent ? 4 : 3,
          clarityRating: isExcellent ? 5 : 3,
          peerReviewer: reviewer,
          feedback,
          suggestions,
          submittedAt: new Date().toISOString()
        };

        // Write directly to Cloud Firestore submissions collection
        await setDoc(doc(db, 'submissions', abstractId), evaluationResult);

        setAbsSuccess(evaluationResult);
        setSelectedSub(evaluationResult);

        // Add presenter to registrations automatically as presenter if not exists
        const regExists = registrations.find(r => r.email.toLowerCase() === absForm.presenterEmail.toLowerCase());
        if (!regExists) {
          const regId = `REG-2026-${Math.floor(1000 + Math.random() * 9000)}`;
          const newReg: Registration = {
            id: regId,
            name: absForm.presenterName,
            email: absForm.presenterEmail,
            institution: absForm.institution,
            country: "International",
            phone: "+-",
            role: "presenter",
            category: "umum",
            registeredAt: new Date().toISOString()
          };
          await setDoc(doc(db, 'registrations', regId), newReg);
        }

        await loadOfflineData();
      } catch (err: any) {
        setAbsError(err.message || 'Gagal mengunggah abstrak ke database cloud.');
      } finally {
        setAbsLoading(false);
      }
      return;
    }

    try {
      const res = await fetch('/api/submit-abstract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(absForm)
      });

      const data = await handleResponseJson(res, 'Terjadi kesalahan saat mengunggah abstrak.');
      if (!res.ok) {
        throw new Error(data.error || 'Terjadi kesalahan saat mengunggah abstrak.');
      }

      setAbsSuccess(data.submission);
      setSelectedSub(data.submission); // Auto-open the AI assessment report
      // Autofill registrations details if presenter was auto-registered
      fetchStatsAndLists();
    } catch (err: any) {
      setAbsError(err.message);
    } finally {
      setAbsLoading(false);
    }
  };

  // Drag and Drop simulation for Abstract Textarea (loads a sample file pattern)
  const handleSampleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // Autofills high quality sample draft
    setAbsForm(prev => ({
      ...prev,
      title: "Pemanfaatan Smart Sensor Berbasis LoRaWAN untuk Pemantauan Mutu Lingkungan Hidup Waduk Secara Real-Time",
      abstractText: "Konservasi sumber daya air tawar di waduk perkotaan terhambat minimnya data penginderaan berkala akibat ketergantungan metode laboratorium konvensional. Makalah ini memperkenalkan model alat telemetri berbiaya rendah dengan jaringan transmisi nirkabel LoRaWAN. Kami melampirkan sensor pH, sensor dissolved oxygen (DO), total dissolved solids (TDS), serta sensor suhu ke simpul pintar bertenaga surya mini. Model diletakkan di tengah waduk dan mengukur ambang limbah organik secara otonom dalam durasi 60 hari berturut-turut. Hasil uji lapangan menunjukkan tingkat akurasi kecocokan sensor 98.4% dibandingkan instrumen lab standar, mempercepat waktu deteksi polusi dari 4 hari menjadi 1.2 detik saja.",
      keywords: "Smart Waduk, LoRaWAN, Sensor Kualitas Air, Konservasi Lingkungan",
      track: "Environmental Sciences & Green Tech"
    }));
  };

  // Helper Translation Directory
  const t = {
    heroTitle: lang === 'id' ? config.heroTitleId : config.heroTitleEn,
    heroSub: lang === 'id' ? config.heroSubId : config.heroSubEn,
    dateVenue: lang === 'id' ? config.dateVenueId : config.dateVenueEn,
    navInfo: lang === 'id' ? 'Informasi Konferensi' : 'Conference Info',
    navRegister: lang === 'id' ? 'Daftar Peserta' : 'Registration',
    navAbstract: lang === 'id' ? 'Unggah Abstrak AI' : 'AI Abstract Submit',
    navDatabase: lang === 'id' ? 'Laporan & List Database' : 'Database Reports',
    
    // Stats labels
    statTotalReg: lang === 'id' ? 'Pendaftar Terdaftar' : 'Registered Users',
    statPresenter: lang === 'id' ? 'Pemakalah / Presenter' : 'Oral Presenters',
    statAttendee: lang === 'id' ? 'Pendengar / Attendee' : 'General Attendees',
    statTotalAbs: lang === 'id' ? 'Total Abstrak Masuk' : 'Total Abstracts Submitted',
    statAcceptedAbs: lang === 'id' ? 'Abstrak Diterima' : 'Approved Abstracts',

    // Section heads
    aboutTitle: lang === 'id' ? (config.aboutTitleId || 'Tentang IBEC 2026') : (config.aboutTitleEn || 'About IBEC 2026'),
    aboutText: lang === 'id' 
      ? (config.aboutTextId || 'IBEC 2026 menyediakan wadah global bagi peneliti, akademisi, praktisi industri, dan mahasiswa untuk mempublikasikan pemikiran orisinal mereka mengenai bisnis internasional, ekonomi pembangunan, akuntansi, dan manajemen keuangan terkini. Dilengkapi dengan sistem penilai naskah berbasis Generative AI untuk menyajikan penilaian awal (peer review) dalam waktu kurang dari 2 menit secara objektif.')
      : (config.aboutTextEn || 'IBEC 2026 provides a dynamic global platform for researchers, academicians, industry leaders, and students to propagate cutting-edge papers in international business, development economics, accounting, and modern financial management. Equipped with a real-time Generative AI model that scores and critiques drafts within 2 minutes of submission.'),
    
    tracksTitle: lang === 'id' ? 'Topik Makalah Utama (Conference Tracks)' : 'Key Highlights & Tracks',
    tracksSub: lang === 'id' ? 'Karya ilmiah Anda wajib dimasukkan ke salah satu kluster berikut:' : 'Select suitable fields for evaluation under designated scope categories:',
    
    datesTitle: lang === 'id' ? 'Tanggal Penting (Timeline)' : 'Timeline & Important Dates',
    speakersTitle: lang === 'id' ? (config.speakersSectionTitleId || 'Pembicara Utama (Keynote Speakers)') : (config.speakersSectionTitleEn || 'Distinguished Keynote Speakers'),
    speakersSubText: lang === 'id' ? (config.speakersSectionSubId || 'Ilmuwan Terkemuka & Presenter Utama') : (config.speakersSectionSubEn || 'Leading Scientists & Keynote Presenters'),

    // Registration Card
    regCardTitle: lang === 'id' ? 'Formulir Pendaftaran Peserta' : 'Attendee Registration Form',
    regCardSub: lang === 'id' ? 'Isi formulir dengan valid untuk reservasi slot kursi & sertifikat internasional' : 'Complete details below to book slots and generate international seat certifications',
    regRoleLabel: lang === 'id' ? 'Peran Pendaftaran' : 'Registration Role',
    regNameLabel: lang === 'id' ? 'Nama Lengkap (Serta Gelar)' : 'Full Name & Academic Title',
    regInstLabel: lang === 'id' ? 'Institusi / Universitas / Lembaga' : 'Affiliated Institution / University',
    regCountryLabel: lang === 'id' ? 'Negara Asal' : 'Country of Origin',
    regPhoneLabel: lang === 'id' ? 'No. WhatsApp / HP (Kode Negara)' : 'WhatsApp / Phone Number (Intl format)',
    regBtn: lang === 'id' ? 'Proses Pendaftaran & Dapatkan ID' : 'Submit Registration & Generate ID',
    regBtnLoading: lang === 'id' ? 'Memproses Pendaftaran...' : 'Processing Reservation...',

    // Abstract Card
    absCardTitle: lang === 'id' ? 'Unggah & Evaluasi Abstrak Otomatis Instan' : 'Smart AI Abstract Assessment Portal',
    absCardSub: lang === 'id' ? 'Algoritma AI (Gemini 3.5 Flash) bertindak sebagai Peer Reviewer Khusus untuk menganalisis format naskah Anda.' : 'Your draft undergoes instantaneous rigorous academic analysis by our AI peer reviewers for structured feedback.',
    absTrackLabel: lang === 'id' ? 'Pilih Sub-Kategori / Track' : 'Thematic Track Assignment',
    absTitleLabel: lang === 'id' ? 'Judul Karya Ilmiah' : 'Scientific Manuscript Title',
    absTextLabel: lang === 'id' ? 'Teks Abstrak (Pendahuluan, Metodologi, Hasil Utama, Kesimpulan)' : 'Full Copy of Abstract (Background, Methodology, Results, Conclusion)',
    absTextPlaceholder: lang === 'id' ? 'Tulis naskah abstrak minimal 150 kata...' : 'Insert minimum 150 words of descriptive abstract draft here...',
    absKeyLabel: lang === 'id' ? 'Kata Kunci (Dipisahkan Koma, Maks 5 kata kunci)' : 'Keywords (Comma separated, max 5 tags)',
    absDragZone: lang === 'id' ? 'Tarik file draf naskah rujukan ke sini untuk contoh atau klik untuk isi otonom gratis' : 'Drag file here or click to quickly autofill standard sample scientific text',
    absBtn: lang === 'id' ? 'Unggah Naskah & Review Sekarang (2 Menit)' : 'Upload & Initiate Peer Review Assessment',
    absBtnLoading: lang === 'id' ? 'Menganalisis Konten Akademis menggunakan Gemini AI...' : 'Analyzing Academic Structure via Gemini AI...',

    // Pricing Card
    pricingTitle: lang === 'id' ? 'Daftar Ketentuan Skema Biaya' : 'Conference Registration Fees',
    pricingNote: lang === 'id' ? '*Biaya pendaftaran pemakalah sudah mencakup publikasi internasional terindeks jika berstatus lolos.' : '*Oral presenters charge rate covers certified publishing on international index portals upon final draft confirmation.',

    // Database tab
    dbTitle: lang === 'id' ? 'Database & Dasbor Konsolidasi Komite' : 'IBEC Committee Centralized Database Panel',
    dbSub: lang === 'id' ? 'Pemantauan data pendaftaran langsung secara real-time dan analisis reviewer virtual' : 'Live state tracking for attendee submissions and peer evaluation metrics',
    searchPlaceholder: lang === 'id' ? 'Cari nama, universitas, judul abstrak, atau kode registrasi...' : 'Search registrations, credentials, abstract titles or university matches...'
  };

  const getTrackIcon = (iconName: string) => {
    switch (iconName) {
      case 'Cpu': return <Cpu className="w-5 h-5 text-blue-600" id="icon-cpu" />;
      case 'Zap': return <Zap className="w-5 h-5 text-yellow-600" id="icon-zap" />;
      case 'Atom': return <Atom className="w-5 h-5 text-purple-600" id="icon-atom" />;
      case 'Leaf': return <Leaf className="w-5 h-5 text-emerald-600" id="icon-leaf" />;
      case 'Globe': return <Globe className="w-5 h-5 text-indigo-600" id="icon-globe" />;
      default: return <BookOpen className="w-5 h-5 text-blue-600" id="icon-book" />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800 font-sans" id="app-root">
      
      {/* Header Bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs" id="main-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          
          {/* Logo & Conference Name */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('info')} id="logo-branding">
            {config.logoUrl ? (
              <img 
                src={config.logoUrl} 
                alt="Logo" 
                className="w-10 h-10 object-contain rounded-xl shadow-sm bg-slate-100"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-extrabold text-lg tracking-wider shadow-sm">
                {config.logoAbbreviation || 'I'}
              </div>
            )}
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-slate-900 text-lg tracking-tight">{config.logoText || 'IBEC 2026'}</span>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-md border border-blue-100 uppercase tracking-wider">
                  International
                </span>
                <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-md border border-emerald-100 uppercase tracking-wider">
                  AI-Review Verified
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">{config.logoSubtitle || 'Advanced Science, Engineering & Sustainable Tech'}</p>
            </div>
          </div>

          {/* Navigation Items (Desktop) */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2" id="desktop-nav">
            <button 
              onClick={() => setActiveTab('info')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                activeTab === 'info' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:text-blue-600 hover:bg-slate-100'
              }`}
              id="btn-nav-info"
            >
              {t.navInfo}
            </button>
            <button 
              onClick={() => setActiveTab('register')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                activeTab === 'register' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:text-blue-600 hover:bg-slate-100'
              }`}
              id="btn-nav-register"
            >
              {t.navRegister}
            </button>
            <button 
              onClick={() => setActiveTab('abstract')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg relative transition-all ${
                activeTab === 'abstract' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:text-blue-600 hover:bg-slate-100'
              }`}
              id="btn-nav-abstract"
            >
              <span className="flex items-center gap-1">
                {t.navAbstract}
                <Sparkles className="w-3.5 h-3.5 text-blue-600 fill-blue-600 animate-pulse" />
              </span>
            </button>
            <button 
              onClick={() => setActiveTab('database')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                activeTab === 'database' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:text-blue-600 hover:bg-slate-100'
              }`}
              id="btn-nav-database"
            >
              {t.navDatabase}
            </button>
            <button 
              onClick={() => setActiveTab('admin')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'admin' ? 'bg-red-50 text-red-700 border border-red-100' : 'text-slate-600 hover:text-red-600 hover:bg-slate-100'
              }`}
              id="btn-nav-admin"
            >
              <span>🔑 Admin</span>
            </button>
          </nav>

          {/* Controls & Language Toggle */}
          <div className="flex items-center space-x-3" id="header-controls">
            {/* Quick Stats Panel Pill */}
            <div className="hidden lg:flex items-center px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 gap-2 border border-slate-200">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
              <span>{stats.totalAbstracts} Submissions</span>
            </div>

            {/* Language Switch Button */}
            {(config.languageSwitcherEnabled !== false) && (
              <button 
                onClick={() => {
                  sessionStorage.setItem('userHasSetLang', 'true');
                  setLang(lang === 'id' ? 'en' : 'id');
                }}
                className="flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all border border-slate-200 cursor-pointer"
                title="Ganti Bahasa / Switch Language"
                id="btn-language-toggle"
              >
                <Languages className="w-4 h-4 text-slate-500" />
                <span>{lang === 'id' ? 'EN' : 'ID'}</span>
              </button>
            )}
          </div>

        </div>
      </header>

      {/* Hero Banner Section */}
      <section className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white relative overflow-hidden" id="hero-banner">
        
        {/* Dynamic Background Container */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
          {config.heroBgType === 'youtube' && config.heroYoutubeId ? (
            <>
              <iframe
                className="absolute top-1/2 left-1/2 w-[180%] h-[180%] min-w-full min-h-full -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none duration-1000 animate-fadeIn"
                src={`https://www.youtube.com/embed/${config.heroYoutubeId}?autoplay=1&mute=1&controls=0&showinfo=0&rel=0&loop=${config.heroYoutubeLoop !== false ? 1 : 0}&playlist=${config.heroYoutubeId}&playsinline=1&enablejsapi=1`}
                allow="autoplay; encrypted-media"
                title="Hero Background Video Player"
              ></iframe>
              <div 
                className="absolute inset-0 bg-blue-950 mix-blend-multiply transition-opacity duration-500"
                style={{ opacity: (config.heroYoutubeOverlayOpacity !== undefined ? config.heroYoutubeOverlayOpacity : 60) / 100 }}
              ></div>
            </>
          ) : (
            <>
              {/* Background Gradients Geometry */}
              <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-blue-500 rounded-full opacity-20 blur-2xl"></div>
              <div className="absolute -left-10 top-0 w-64 h-64 bg-indigo-500 rounded-full opacity-15 blur-xl"></div>
              <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:24px_24px] opacity-15"></div>
            </>
          )}
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 md:py-20 relative z-10">
          <div className={config.countdownEnabled ? "grid grid-cols-1 lg:grid-cols-12 gap-8 items-center" : "max-w-3xl"}>
            <div className={config.countdownEnabled ? "lg:col-span-7 text-left" : "text-left"}>
              <div className="inline-flex items-center px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold mb-4 uppercase tracking-wider border border-white/10 text-blue-100">
                <Calendar className="w-3.5 h-3.5 mr-1.5 text-blue-300" />
                {t.dateVenue}
              </div>
              
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4 leading-tight">
                {t.heroTitle}
              </h1>
              
              <p className="text-base sm:text-lg text-blue-100 mb-8 max-w-2xl leading-relaxed">
                {t.heroSub}
              </p>

              <div className="flex flex-wrap gap-3">
                <button 
                  onClick={() => setActiveTab('register')}
                  className="px-6 py-3 bg-white text-blue-800 font-bold rounded-xl shadow-lg hover:bg-blue-50 transition-all flex items-center gap-2 text-sm cursor-pointer"
                >
                  <span>{lang === 'id' ? (config.heroRegisterBtnId || 'Mendaftar Sekarang') : (config.heroRegisterBtnEn || 'Register Now')}</span>
                  <ArrowRight className="w-4 h-4 text-blue-800" />
                </button>
                <button 
                  onClick={() => setActiveTab('abstract')}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-505 text-white font-bold rounded-xl border border-blue-400/30 transition-all flex items-center gap-2 text-sm cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-blue-200 fill-white" />
                  <span>{lang === 'id' ? (config.heroAbstractBtnId || 'Kirim Abstrak Ilmiah') : (config.heroAbstractBtnEn || 'Submit Scientific Abstract')}</span>
                </button>
                <button 
                  onClick={() => setActiveTab('database')}
                  className="px-6 py-3 bg-slate-900/60 hover:bg-slate-900/80 text-white font-bold rounded-xl border border-white/10 transition-all flex items-center gap-2 text-sm cursor-pointer"
                >
                  <span>{lang === 'id' ? (config.heroDbBtnId || 'Log Pengajuan Live') : (config.heroDbBtnEn || 'Live Submissions Logs')}</span>
                </button>
              </div>
            </div>

            {config.countdownEnabled && (
              <div className="lg:col-span-5 w-full mt-6 lg:mt-0">
                <div className="bg-slate-950/50 backdrop-blur-lg rounded-3xl border border-white/10 p-6 sm:p-8 shadow-2xl text-center space-y-5 animate-fade-in">
                  <div className="flex items-center justify-center gap-2 mx-auto px-3.5 py-1 bg-indigo-500/10 border border-indigo-400/15 rounded-full max-w-max text-indigo-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping"></span>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">
                      Event Countdown
                    </span>
                  </div>
                  
                  <h3 className="text-sm font-bold text-slate-100 tracking-wide uppercase px-2 font-sans">
                    {lang === 'id' ? config.countdownLabelId : config.countdownLabelEn}
                  </h3>
                  
                  <div className="py-2.5">
                    <CountdownDisplay targetDate={config.countdownTarget || '2026-08-25T09:00:00'} lang={lang} />
                  </div>
                  
                  <div className="text-[9px] text-slate-400 border-t border-white/10 pt-3.5 font-mono">
                    ⏰ Target: {(() => {
                      try {
                        return new Date(config.countdownTarget || '2026-08-25T09:00:00').toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { 
                          weekday: 'long', 
                          day: 'numeric', 
                          month: 'long', 
                          year: 'numeric', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        });
                      } catch {
                        return config.countdownTarget || '2026-08-25T09:00:00';
                      }
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* System Metrics Strip */}
      <section className="-mt-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20 pb-4" id="stats-strip">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xl" id="stats-grid">
          
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.statTotalReg}</span>
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div className="mt-2">
              <div className="text-2xl font-extrabold text-slate-900">{stats.totalRegistrations}</div>
              <span className="text-[10px] text-slate-500">{registrations.length} Verified Records</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.statPresenter}</span>
              <BookOpen className="w-4 h-4 text-blue-600" />
            </div>
            <div className="mt-2">
              <div className="text-2xl font-extrabold text-slate-900">{stats.presenters}</div>
              <span className="text-[10px] text-slate-500">Scheduled for Oral</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.statAttendee}</span>
              <UserCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2">
              <div className="text-2xl font-extrabold text-slate-900">{stats.attendees}</div>
              <span className="text-[10px] text-slate-500">General Audience</span>
            </div>
          </div>

          <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 flex flex-col justify-between select-none">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">{t.statTotalAbs}</span>
              <Sparkles className="w-4 h-4 text-blue-700 fill-blue-100" />
            </div>
            <div className="mt-2">
              <div className="text-2xl font-extrabold text-blue-900">{stats.totalAbstracts}</div>
              <span className="text-[10px] text-blue-600">Assessed by AI Reviewer</span>
            </div>
          </div>

          <div className="col-span-2 md:col-span-1 p-3 bg-emerald-50/40 rounded-xl border border-emerald-100 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">{t.statAcceptedAbs}</span>
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
            </div>
            <div className="mt-2">
              <div className="text-2xl font-extrabold text-emerald-950">{stats.acceptedAbstracts}</div>
              <span className="text-[10px] text-emerald-700">Accepted Instantly</span>
            </div>
          </div>

        </div>
      </section>

      {/* Running Logo Ticker Section */}
      <section className="bg-slate-50 border-y border-slate-200/60 py-8 overflow-hidden select-none relative z-10 w-full" id="partner-logo-section">
        <style>{`
          @keyframes logoTicker {
            0% { transform: translate3d(0, 0, 0); }
            100% { transform: translate3d(-33.333%, 0, 0); }
          }
          .logo-ticker-track {
            display: flex;
            width: max-content;
            animation: logoTicker 35s linear infinite;
          }
          .logo-ticker-track:hover {
            animation-play-state: paused;
          }
        `}</style>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-4">
          <div className="text-center">
            <span className="text-[10px] font-extrabold text-indigo-600/90 tracking-widest uppercase block mb-1">
              {lang === 'id' ? 'KOLABORASI & PUBLIKASI MITRA' : 'OUR COLLABORATING PARTNERS & PUBLISHERS'}
            </span>
            <div className="h-0.5 w-12 bg-indigo-600/20 mx-auto rounded-full"></div>
          </div>
        </div>

        <div className="relative w-full overflow-hidden">
          {/* Subtle gradient overlays to fade out the sides */}
          <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-slate-50 to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-slate-50 to-transparent z-10 pointer-events-none" />

          {/* Scrolling Ticker Track */}
          <div className="logo-ticker-track gap-8 flex items-center">
            {(config.runningLogos && config.runningLogos.length > 0 ? [...config.runningLogos, ...config.runningLogos, ...config.runningLogos] : [
              { id: '1', name: 'Google Cloud', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Google_Cloud_logo.svg/512px-Google_Cloud_logo.svg.png' },
              { id: '2', name: 'IEEE', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/IEEE_logo.svg/512px-IEEE_logo.svg.png' },
              { id: '3', name: 'Springer Nature', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Springer_Nature_logo.svg/512px-Springer_Nature_logo.svg.png' },
              { id: '4', name: 'Scopus', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Scopus_logo.svg/2560px-Scopus_logo.svg.png' },
              { id: '5', name: 'BRIN', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Logo_BRIN.svg/512px-Logo_BRIN.svg.png' }
            ].flatMap(x => [x, x, x])).map((item, index) => {
              const cardContent = (
                <div 
                  className="flex items-center gap-3 px-6 py-3.5 bg-white border border-slate-200/80 rounded-2xl hover:border-slate-300 hover:shadow-md transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer min-w-[200px] sm:min-w-[240px] max-w-max h-16 shrink-0 justify-center select-none"
                >
                  {item.logoUrl ? (
                    <img 
                      src={item.logoUrl} 
                      alt={item.name} 
                      referrerPolicy="no-referrer"
                      className="max-h-8 max-w-[100px] object-contain opacity-85 hover:opacity-100 transition-opacity filter grayscale hover:grayscale-0 duration-300"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : null}
                  <span className="font-sans font-bold text-xs text-slate-700 tracking-tight whitespace-nowrap">
                    {item.name}
                  </span>
                </div>
              );

              if (item.linkUrl) {
                return (
                  <a 
                    key={index}
                    href={item.linkUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="no-underline block focus:outline-none"
                  >
                    {cardContent}
                  </a>
                );
              }

              return (
                <div key={index}>
                  {cardContent}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Core Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full" id="main-content">
        
        {/* Toggleable Tabs Content */}

        {/* --- PAGE 1: INFORMATION HUB & CONGRES PROFILE --- */}
        {activeTab === 'info' && (
          <section className="space-y-10 animate-fadeIn" id="sec-info-hub">
            
            {/* Split row: Intro & Focus tracks */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column: Intro text and keynote speech */}
              <div className="lg:col-span-7 space-y-8">
                
                {/* About Panel */}
                <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-xs relative">
                  <h2 className="text-2xl font-bold text-slate-800 tracking-tight mb-4 flex items-center gap-2">
                    <Building className="w-6 h-6 text-blue-600" />
                    {t.aboutTitle}
                  </h2>
                  <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
                    {t.aboutText}
                  </p>
                  
                  {/* Scope Badges */}
                  <div className="mt-6 pt-6 border-t border-slate-100 flex flex-wrap gap-2">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg">Scopus Indexed (Option)*</span>
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg">IEEE Standards (Reference)</span>
                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-blue-600" /> Automated Smart Peer Review
                    </span>
                  </div>
                </div>

                {/* Dynamic Conference Poster Section */}
                {config.posterEnabled && config.posterUrl && (
                  <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-xs space-y-4 animate-fade-in" id="conference-poster-card">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <h3 className="text-base font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                        <Image className="w-5 h-5 text-indigo-600" />
                        {lang === 'id' ? 'Poster Resmi IBEC 2026' : 'Official IBEC 2026 Poster'}
                      </h3>
                      <button 
                        onClick={() => setIsPosterZoomed(true)}
                        className="text-[11px] font-extrabold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-all"
                      >
                        {lang === 'id' ? '🔍 Perbesar' : '🔍 Zoom In'}
                      </button>
                    </div>
                    
                    <div 
                      onClick={() => setIsPosterZoomed(true)}
                      className="bg-slate-50 border border-slate-150 rounded-xl overflow-hidden shadow-xs hover:shadow-md hover:border-slate-300 cursor-zoom-in transition-all group relative max-h-[500px] flex items-center justify-center"
                    >
                      <img 
                        src={config.posterUrl} 
                        alt="IBEC 2026 Official Poster" 
                        className="max-h-[480px] w-auto object-contain p-2 rounded-lg transition-transform duration-300 group-hover:scale-[1.01]"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white bg-slate-900/80 backdrop-blur-xs px-3.5 py-2 rounded-xl text-xs font-bold shadow-md">
                          {lang === 'id' ? 'Klik Untuk Memperbesar' : 'Click to Zoom Poster'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Scope Tracks Grid */}
                <div className="space-y-4">
                  <div className="flex flex-col">
                    <h3 className="text-xl font-bold text-slate-800 tracking-tight">{t.tracksTitle}</h3>
                    <p className="text-xs text-slate-500 mt-1">{t.tracksSub}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-1 gap-3">
                    {config.conferenceTracks.map((track) => (
                      <div 
                        key={track.id} 
                        className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs hover:border-blue-400 hover:shadow-md transition-all flex items-start space-x-4"
                        id={`track-${track.id}`}
                      >
                        <div className="p-3 bg-slate-100 rounded-lg shrink-0">
                          {getTrackIcon(track.iconName)}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">
                            {lang === 'id' ? track.nameId : track.nameEn}
                          </h4>
                          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                            {lang === 'id' ? track.descriptionId : track.descriptionEn}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div> {/* End left column */}

              {/* Right Column: Important dates & Registration Fees list */}
              <div className="lg:col-span-5 space-y-8">
                
                {/* Timeline Panel */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs">
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    {t.datesTitle}
                  </h3>

                  <div className="relative border-l border-slate-200 pl-4 ml-2.5 space-y-6">
                    {config.importantDates.map((date, idx) => (
                      <div key={idx} className="relative">
                        {/* Bullet */}
                        <div className={`absolute -left-7 top-1.5 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center ${
                          date.completed ? 'border-emerald-500' : 'border-slate-300'
                        }`}>
                          {date.completed && <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>}
                        </div>
                        {/* Info */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">
                            {date.date}
                          </span>
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${
                            date.completed 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                            {lang === 'id' ? date.badgeId : date.badgeEn}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-800 mt-1">
                          {lang === 'id' ? date.titleId : date.titleEn}
                        </h4>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Download Materials & Documents Section */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-4 animate-fade-in" id="landing-downloads-section">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-2">
                      <Download className="w-5 h-5 text-indigo-600 animate-pulse" />
                      {lang === 'id' ? '📂 Unduhan Dokumen & Template' : '📂 Document Downloads & Templates'}
                    </h3>
                  </div>
                  
                  <p className="text-xs text-slate-500 leading-relaxed font-sans">
                    {lang === 'id' 
                      ? 'Unduh dokumen brosur resmi, panduan, template penulisan abstrak (.docx), dan berkas panduan pemakalah lisan.' 
                      : 'Download scientific paper templates, brochures, conference guidelines, or speaker slides.'}
                  </p>

                  <div className="space-y-3">
                    {(!config.downloadMaterials || config.downloadMaterials.filter(m => m.visible !== false).length === 0) ? (
                      <div className="p-4 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-[10px]">
                        {lang === 'id' ? 'Belum ada dokumen yang tersedia untuk diunduh.' : 'No materials are currently published for download.'}
                      </div>
                    ) : (
                      config.downloadMaterials.filter(m => m.visible !== false).map((material) => (
                        <div 
                          key={material.id}
                          className="p-3 bg-slate-51 hover:bg-slate-50 rounded-xl border border-slate-200/60 hover:border-indigo-200 hover:ring-2 hover:ring-indigo-100/50 transition-all flex items-start justify-between gap-3 group text-left"
                        >
                          <div className="flex items-start gap-2.5">
                            <span className={`p-2 rounded-lg block font-mono text-[9px] font-extrabold shrink-0 ${
                              material.fileType === 'PDF' ? 'bg-red-50 text-red-650' :
                              material.fileType === 'DOCX' || material.fileType === 'DOC' ? 'bg-blue-50 text-blue-650' :
                              material.fileType === 'PPTX' || material.fileType === 'PPT' ? 'bg-amber-50 text-amber-650' :
                              'bg-slate-100/85 text-slate-700'
                            }`}>
                              {material.fileType || 'FILE'}
                            </span>
                            <div className="space-y-0.5 text-left">
                              <h4 className="text-[11px] font-bold text-slate-800 leading-tight block group-hover:text-indigo-650 transition">
                                {lang === 'id' ? material.titleId : material.titleEn}
                              </h4>
                              {lang === 'id' ? (
                                material.descriptionId && <p className="text-[9px] text-slate-500 leading-normal font-sans line-clamp-2">{material.descriptionId}</p>
                              ) : (
                                material.descriptionEn && <p className="text-[9px] text-slate-500 leading-normal font-sans line-clamp-2">{material.descriptionEn}</p>
                              )}
                              <div className="flex items-center gap-2 pt-1 font-mono text-[8px] text-slate-400">
                                <span className="bg-slate-200/50 px-1 rounded font-bold text-slate-500">{material.fileSize}</span>
                                <span>📥 {material.downloadsCount || 0} {lang === 'id' ? 'diunduh' : 'downloads'}</span>
                              </div>
                            </div>
                          </div>

                          <a 
                            href={material.fileUrl.startsWith('#') ? '#' : material.fileUrl}
                            target={material.fileUrl.startsWith('#') ? undefined : "_blank"}
                            rel="noopener noreferrer"
                            onClick={(e) => {
                              // Increment download count
                              const updated = (config.downloadMaterials || []).map(m => {
                                if (m.id === material.id) {
                                  return { ...m, downloadsCount: (m.downloadsCount || 0) + 1 };
                                }
                                return m;
                              });
                              const newConf = { ...config, downloadMaterials: updated };
                              setConfig(newConf);
                              localStorage.setItem('offline_config', JSON.stringify(newConf));
                              
                              if (material.fileUrl.startsWith('#')) {
                                e.preventDefault();
                                alert(lang === 'id' 
                                  ? `Simulasi berhasil! Berkas "${material.titleId}" telah terunduh ke komputer.`
                                  : `Simulated download complete! File "${material.titleEn}" successfully downloaded.`);
                              }
                            }}
                            className="p-1 text-slate-400 group-hover:text-indigo-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all cursor-pointer shadow-3xs shrink-0 self-center"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Dynamic Fees Panel */}
                <div className="bg-gradient-to-br from-slate-950 to-slate-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full blur-xl"></div>
                  
                  <h3 className="text-base font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Award className="w-5 h-5 text-indigo-400" />
                    {lang === 'id' ? (config.feesTitleId || t.pricingTitle) : (config.feesTitleEn || t.pricingTitle)}
                  </h3>

                  <div className="space-y-4 text-xs">
                    {(() => {
                      const list = config.registrationFeesList || [
                        { id: 'pres_early', nameEn: 'Oral Presenter - Early Bird', nameId: 'Pemakalah Oral - Early Bird', category: 'presenter', priceDomestic: 'IDR 1.250.000', priceIntl: 'USD 150' },
                        { id: 'pres_normal', nameEn: 'Oral Presenter - Normal', nameId: 'Pemakalah Oral - Normal', category: 'presenter', priceDomestic: 'IDR 1.500.000', priceIntl: 'USD 200' },
                        { id: 'poster_early', nameEn: 'Poster Presenter - Early Bird', nameId: 'Presenter Poster - Early Bird', category: 'poster', priceDomestic: 'IDR 750.000', priceIntl: 'USD 80' },
                        { id: 'poster_normal', nameEn: 'Poster Presenter - Normal', nameId: 'Presenter Poster - Normal', category: 'poster', priceDomestic: 'IDR 900.000', priceIntl: 'USD 100' },
                        { id: 'attendee', nameEn: 'General Attendee', nameId: 'Peserta Umum (Non-Pemakalah)', category: 'attendee', priceDomestic: 'IDR 350.000', priceIntl: 'USD 35' }
                      ];

                      const presenters = list.filter(item => item.category === 'presenter');
                      const posters = list.filter(item => item.category === 'poster');
                      const attendees = list.filter(item => item.category === 'attendee');

                      return (
                        <>
                          {presenters.length > 0 && (
                            <div className="pb-3 border-b border-slate-800 space-y-2.5">
                              <div className="font-bold text-indigo-400 uppercase tracking-widest text-[9px] mb-1">
                                {lang === 'id' ? 'KATEGORI PEMAKALAH ORAL (ORAL PRESENTER)' : 'ORAL PREPARATION & PRESENTATION FEES'}
                              </div>
                              {presenters.map((item) => (
                                <div key={item.id} className="space-y-0.5 pb-2 last:pb-0 border-b border-slate-800/40 last:border-0 text-left">
                                  <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-350 font-semibold font-sans">
                                      {lang === 'id' ? item.nameId : item.nameEn}
                                    </span>
                                    <span className="font-extrabold text-white">{item.priceDomestic}</span>
                                  </div>
                                  <div className="flex justify-between items-center text-slate-400 text-[11px]">
                                    <span>{lang === 'id' ? 'Tarif Internasional' : 'Overseas / International'}</span>
                                    <span className="font-semibold text-indigo-300">{item.priceIntl}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {posters.length > 0 && (
                            <div className="pb-3 border-b border-slate-800 space-y-2.5">
                              <div className="font-bold text-amber-400 uppercase tracking-widest text-[9px] mb-1">
                                {lang === 'id' ? 'KATEGORI PEMAKALAH POSTER (POSTER PRESENTER)' : 'POSTER PREPARATION & PRESENTATION FEES'}
                              </div>
                              {posters.map((item) => (
                                <div key={item.id} className="space-y-0.5 pb-2 last:pb-0 border-b border-slate-800/40 last:border-0 text-left">
                                  <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-350 font-semibold font-sans">
                                      {lang === 'id' ? item.nameId : item.nameEn}
                                    </span>
                                    <span className="font-extrabold text-white">{item.priceDomestic}</span>
                                  </div>
                                  <div className="flex justify-between items-center text-slate-400 text-[11px]">
                                    <span>{lang === 'id' ? 'Tarif Internasional' : 'Overseas / International'}</span>
                                    <span className="font-semibold text-amber-300">{item.priceIntl}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {attendees.length > 0 && (
                            <div className="space-y-2.5">
                              <div className="font-bold text-emerald-400 uppercase tracking-widest text-[9px] mb-1">
                                {lang === 'id' ? 'KATEGORI PENDENGAR (ATTENDEE)' : 'NON-PRESENTER (ATTENDEE ONLY)'}
                              </div>
                              {attendees.map((item) => (
                                <div key={item.id} className="space-y-0.5 pb-2 last:pb-0 border-b border-slate-800/40 last:border-0 text-left">
                                  <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-350 font-semibold font-sans">
                                      {lang === 'id' ? item.nameId : item.nameEn}
                                    </span>
                                    <span className="font-extrabold text-white">{item.priceDomestic}</span>
                                  </div>
                                  <div className="flex justify-between items-center text-slate-400 text-[11px]">
                                    <span>{lang === 'id' ? 'Tarif Internasional' : 'Overseas / International'}</span>
                                    <span className="font-semibold text-emerald-300">{item.priceIntl}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      );
                    })()}

                    <p className="text-[10px] text-slate-400 italic mt-4">
                      {lang === 'id' ? (config.feesNoteId || t.pricingNote) : (config.feesNoteEn || t.pricingNote)}
                    </p>

                  </div>
                </div>

              </div> {/* End right column */}

            </div>

            {/* Keynote Speakers Section (Carousel/Bento Grid Style) */}
            <div className="bg-slate-100 rounded-2xl p-6 sm:p-8 border border-slate-200">
              <div className="text-center max-w-2xl mx-auto mb-8">
                <span className="text-[11px] font-bold text-blue-600 tracking-wider uppercase">{t.speakersTitle}</span>
                <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{t.speakersSubText}</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {config.keynoteSpeakers.map((speaker, sIdx) => (
                  <div key={sIdx} className="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-xs flex flex-col justify-between">
                    <div className="p-5 space-y-4">
                      <div className="flex items-center space-x-3">
                        <img 
                          src={speaker.imageUrl} 
                          alt={speaker.name}
                          className="w-16 h-16 rounded-full object-cover border-2 border-blue-100 shrink-0" 
                        />
                        <div>
                          <h4 className="font-extrabold text-slate-900 text-sm leading-tight">{speaker.name}</h4>
                          <p className="text-[11px] text-blue-600 font-semibold mt-0.5">{speaker.title}</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">{speaker.institution}</p>
                        </div>
                      </div>
                      
                      <div className="pt-3 border-t border-slate-100">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Keynote Topic</span>
                        <p className="text-xs font-bold text-slate-800 italic leading-snug">
                          "{lang === 'id' ? speaker.topicId : speaker.topicEn}"
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </section>
        )}


        {/* --- PAGE 2: REGISTER FORM --- */}
        {activeTab === 'register' && (
          <section className="max-w-4xl mx-auto animate-fadeIn" id="sec-register">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
              
              {/* Form header strip */}
              <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{t.regCardTitle}</h2>
                  <p className="text-xs text-slate-500 mt-1">{t.regCardSub}</p>
                </div>
                <Users className="w-6 h-6 text-slate-400" />
              </div>

              <div className="p-6 sm:p-8">
                {regSuccess ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center space-y-4 animate-scaleUp">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                      <Check className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Pendaftaran Berhasil! / Registration Completed</h3>
                      <p className="text-sm text-slate-600 mt-1">Selamat, ID Registrasi resmi Anda telah diverifikasi otomatis oleh sistem akademi kami.</p>
                    </div>

                    <div className="max-w-xs mx-auto bg-white p-4 rounded-lg border border-emerald-100 shadow-sm mt-4 text-left font-mono text-xs space-y-2">
                      <div className="flex justify-between border-b border-slate-100 pb-1.5 text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                        <span>Item</span>
                        <span>Detail</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">ID Registrasi:</span>
                        <span className="font-extrabold text-blue-700">{regSuccess.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Nama:</span>
                        <span className="font-semibold">{regSuccess.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Email:</span>
                        <span>{regSuccess.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Role:</span>
                        <span className="px-1 bg-blue-50 text-blue-700 text-[10px] rounded uppercase font-bold">{regSuccess.role}</span>
                      </div>
                    </div>

                    <div className="flex justify-center space-x-3 pt-4">
                      <button 
                        onClick={() => {
                          setRegSuccess(null);
                        }}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-all"
                      >
                        Daftar Peserta Baru Lainnya
                      </button>
                      <button 
                        onClick={() => {
                          setActiveTab('database');
                          setDbSubTab('registrations');
                        }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all"
                      >
                        Lihat Rekap Seluruh Pendaftar
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleRegisterSubmit} className="space-y-6">
                    
                    {regError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{regError}</span>
                      </div>
                    )}

                    {/* Role selector field */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">{t.regRoleLabel}</label>
                      <div className="grid grid-cols-2 gap-4">
                        <div 
                          onClick={() => setRegForm(prev => ({ ...prev, role: 'presenter' }))}
                          className={`p-4 rounded-xl border cursor-pointer flex flex-col justify-between transition-all ${
                            regForm.role === 'presenter' 
                              ? 'border-blue-600 bg-blue-50/40 shadow-sm' 
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-bold text-slate-900">Presenter / Pemakalah</span>
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              regForm.role === 'presenter' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                            }`}>
                              {regForm.role === 'presenter' && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                            </div>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            Mempresentasikan hasil karya ilmiah & mengunggah abstrak penelitian (oral/poster).
                          </p>
                        </div>

                        <div 
                          onClick={() => setRegForm(prev => ({ ...prev, role: 'attendee' }))}
                          className={`p-4 rounded-xl border cursor-pointer flex flex-col justify-between transition-all ${
                            regForm.role === 'attendee' 
                              ? 'border-blue-600 bg-blue-50/40 shadow-sm' 
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-bold text-slate-900">Attendee / Pendengar</span>
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              regForm.role === 'attendee' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                            }`}>
                              {regForm.role === 'attendee' && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                            </div>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            Mengikuti panel pemaparan secara langsung, akses networking, tanpa unggah abstrak makalah.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Category selector field */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        {lang === 'id' ? 'Kategori Peserta' : 'Participant Category'}
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        <div 
                          onClick={() => setRegForm(prev => ({ ...prev, category: 'umum' }))}
                          className={`p-4 rounded-xl border cursor-pointer flex flex-col justify-between transition-all ${
                            regForm.category === 'umum' 
                              ? 'border-indigo-650 bg-indigo-50/20 shadow-xs' 
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-bold text-slate-900">
                              {lang === 'id' ? 'Umum' : 'General / Public'}
                            </span>
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              regForm.category === 'umum' ? 'border-indigo-650 bg-indigo-650' : 'border-slate-300'
                            }`}>
                              {regForm.category === 'umum' && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                            </div>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            {lang === 'id' ? 'Dosen, praktisi, mahasiswa, peneliti umum non-mitra afiliasi.' : 'Lecturers, practitioners, students, and general researchers.'}
                          </p>
                        </div>

                        <div 
                          onClick={() => setRegForm(prev => ({ ...prev, category: 'mitra' }))}
                          className={`p-4 rounded-xl border cursor-pointer flex flex-col justify-between transition-all ${
                            regForm.category === 'mitra' 
                              ? 'border-indigo-650 bg-indigo-50/20 shadow-xs' 
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-bold text-slate-900">
                              {lang === 'id' ? 'Mitra Kerjasama' : 'Conference Partner'}
                            </span>
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              regForm.category === 'mitra' ? 'border-indigo-650 bg-indigo-650' : 'border-slate-300'
                            }`}>
                              {regForm.category === 'mitra' && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                            </div>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            {lang === 'id' ? 'Afiliasi institusi mitra, sponsor, komite, atau undangan khusus.' : 'Sponsors, co-hosts, special invitees, or committee members.'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t.regNameLabel} *</label>
                        <input 
                          type="text" 
                          required
                          value={regForm.name}
                          onChange={e => setRegForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Dr. Alexander Wright, M.T."
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Email Address *</label>
                        <input 
                          type="email" 
                          required
                          value={regForm.email}
                          onChange={e => setRegForm(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="alex.wright@university.edu"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t.regInstLabel} *</label>
                        <input 
                          type="text" 
                          required
                          value={regForm.institution}
                          onChange={e => setRegForm(prev => ({ ...prev, institution: e.target.value }))}
                          placeholder="Massachusetts Institute of Technology (MIT)"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t.regCountryLabel} *</label>
                          <input 
                            type="text" 
                            required
                            value={regForm.country}
                            onChange={e => setRegForm(prev => ({ ...prev, country: e.target.value }))}
                            placeholder="Indonesia"
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t.regPhoneLabel} *</label>
                          <input 
                            type="text" 
                            required
                            value={regForm.phone}
                            onChange={e => setRegForm(prev => ({ ...prev, phone: e.target.value }))}
                            placeholder="+62812345678"
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
                          />
                        </div>
                      </div>

                      {/* Upload Bukti Pembayaran */}
                      <div className="space-y-2">
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                          {lang === 'id' ? 'Bukti Pembayaran / Transfer Receipt *' : 'Payment Proof / Transfer Receipt *'}
                        </label>
                        
                        {!regForm.paymentProof ? (
                          <div 
                            onDragOver={(e) => {
                              e.preventDefault();
                              setPaymentDragOver(true);
                            }}
                            onDragLeave={() => setPaymentDragOver(false)}
                            onDrop={(e) => {
                              e.preventDefault();
                              setPaymentDragOver(false);
                              const file = e.dataTransfer.files?.[0];
                              if (file) {
                                if (file.size > 5 * 1024 * 1024) {
                                  alert(lang === 'id' ? 'Ukuran file terlalu besar! Maksimal 5MB.' : 'File too large! Maximum 5MB.');
                                  return;
                                }
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setRegForm(prev => ({ ...prev, paymentProof: reader.result as string }));
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className={`border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer ${
                              paymentDragOver 
                                ? 'border-blue-500 bg-blue-50/50' 
                                : 'border-slate-200 bg-slate-50 hover:bg-slate-100/70 hover:border-slate-300'
                            }`}
                            onClick={() => document.getElementById('payment-proof-input')?.click()}
                          >
                            <input 
                              type="file" 
                              id="payment-proof-input"
                              accept="image/*"
                              required
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  if (file.size > 5 * 1024 * 1024) {
                                    alert(lang === 'id' ? 'Ukuran file terlalu besar! Maksimal 5MB.' : 'File too large! Maximum 5MB.');
                                    return;
                                  }
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setRegForm(prev => ({ ...prev, paymentProof: reader.result as string }));
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                            <div className="flex flex-col items-center gap-1.5">
                              <span className="text-2xl text-slate-400">💳</span>
                              <p className="text-xs font-bold text-slate-700">
                                {lang === 'id' ? 'Tarik & lepas berkas bukti transfer di sini' : 'Drag & drop payment receipt image here'}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {lang === 'id' ? 'atau cari komputer Anda (Maks. 5MB, format gambar JPG/PNG)' : 'or browse files (Max. 5MB, JPG/PNG images only)'}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-4 bg-emerald-50/30 p-3 rounded-xl border border-emerald-100 shadow-3xs">
                            <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                              <img 
                                src={regForm.paymentProof} 
                                alt="Payment Proof" 
                                className="w-full h-full object-cover" 
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-extrabold text-emerald-800 flex items-center gap-1">
                                <span>✓</span> {lang === 'id' ? 'Bukti Pembayaran Diunggah' : 'Payment Proof Uploaded'}
                              </p>
                              <p className="text-[10px] text-slate-500 truncate">
                                {lang === 'id' ? 'Tersimpan aman & siap dikirimkan bersama formulir pendaftaran Anda.' : 'Stored safely & ready to compile with registration.'}
                              </p>
                              <button 
                                type="button" 
                                onClick={() => setRegForm(prev => ({ ...prev, paymentProof: '' }))}
                                className="text-[10px] text-red-600 hover:text-red-800 font-bold underline mt-1 block cursor-pointer"
                              >
                                {lang === 'id' ? 'Hapus & ganti berkas' : 'Delete & change file'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-4">
                      <button 
                        type="submit" 
                        disabled={regLoading}
                        className={`w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 flex items-center justify-center gap-2 cursor-pointer transition-all ${
                          regLoading ? 'opacity-80 cursor-wait' : ''
                        }`}
                        id="btn-submit-registration"
                      >
                        {regLoading ? t.regBtnLoading : (
                          <>
                            <UserCheck className="w-5 h-5" />
                            <span>{t.regBtn}</span>
                          </>
                        )}
                      </button>
                    </div>

                  </form>
                )}
              </div>

            </div>
          </section>
        )}


        {/* --- PAGE 3: ABSTRACT SUBMISSION & AUTO-EVAL WITH GEMINI --- */}
        {activeTab === 'abstract' && (
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fadeIn" id="sec-abstract">
            
            {/* Left Column: Submission Form */}
            <div className="lg:col-span-7 space-y-6">
              
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
                
                {/* Form header strip */}
                <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-blue-600 fill-blue-50" />
                      {t.absCardTitle}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">{t.absCardSub}</p>
                  </div>
                  <Upload className="w-6 h-6 text-slate-400" />
                </div>

                <div className="p-6">
                  {absSuccess ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-center space-y-3 animate-scaleUp">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto text-blue-600">
                        <Check className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900">Abstrak Berhasil Diunggah! / Upload Success</h3>
                        <p className="text-xs text-slate-500 mt-1">Sistem Virtual Committe telah selesai memproses rekapitulasi penilaian cerdas AI untuk karya ilmiah Anda.</p>
                      </div>

                      <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-xs flex flex-col space-y-2 text-left font-mono text-[11px]">
                        <div className="flex justify-between border-b pb-1 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                          <span>Metadata</span>
                          <span>Value</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">ID Abstrak:</span>
                          <span className="font-extrabold text-blue-700">{absSuccess.id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Reviewer:</span>
                          <span className="font-semibold text-slate-800">{absSuccess.peerReviewer}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Score Nilai:</span>
                          <span className="font-extrabold text-indigo-700">{absSuccess.reviewScore} / 100</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Rekomendasi AI:</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            absSuccess.status === 'Accepted' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                            absSuccess.status === 'Revision' ? 'bg-yellow-50 text-yellow-700 border border-yellow-100' : 'bg-red-50 text-red-700 border'
                          }`}>{absSuccess.status}</span>
                        </div>
                      </div>

                      <div className="flex justify-center space-x-2 pt-3">
                        <button 
                          onClick={() => {
                            setAbsSuccess(null);
                            setAbsForm({
                              title: '',
                              presenterName: '',
                              presenterEmail: '',
                              institution: '',
                              track: config.conferenceTracks[0] ? config.conferenceTracks[0].nameEn : CONFERENCE_TRACKS[0].nameEn,
                              abstractText: '',
                              keywords: ''
                            });
                          }}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-all"
                        >
                          Kirim Abstrak Lainnya
                        </button>
                        <button 
                          onClick={() => {
                            setActiveTab('database');
                            setDbSubTab('submissions');
                          }}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all"
                        >
                          Buka Laporan Rinci Review
                        </button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleAbstractSubmit} className="space-y-4">
                      
                      {absError && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{absError}</span>
                        </div>
                      )}

                      {/* Info input fields */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">{lang === 'id' ? 'Nama Presenter Penulis' : 'Presenter / Main Author'} *</label>
                          <input 
                            type="text" 
                            required
                            value={absForm.presenterName}
                            onChange={e => setAbsForm(prev => ({ ...prev, presenterName: e.target.value }))}
                            placeholder="Dr. Richard Sitorus"
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">{lang === 'id' ? 'Email Presenter' : 'Presenter Email'} *</label>
                          <input 
                            type="email" 
                            required
                            value={absForm.presenterEmail}
                            onChange={e => setAbsForm(prev => ({ ...prev, presenterEmail: e.target.value }))}
                            placeholder="richard.sitorus@universitas.ac.id"
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">{lang === 'id' ? 'Afiliasi Kampus / Instansi' : 'Affiliated Institution'} *</label>
                          <input 
                            type="text" 
                            required
                            value={absForm.institution}
                            onChange={e => setAbsForm(prev => ({ ...prev, institution: e.target.value }))}
                            placeholder="Universitas Indonesia"
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t.absTrackLabel} *</label>
                          <select 
                            value={absForm.track}
                            onChange={e => setAbsForm(prev => ({ ...prev, track: e.target.value }))}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all appearance-none cursor-pointer"
                          >
                            {config.conferenceTracks.map((tItem) => (
                              <option key={tItem.id} value={tItem.nameEn}>
                                {lang === 'id' ? tItem.nameId : tItem.nameEn}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Title of manuscript */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t.absTitleLabel} *</label>
                        <input 
                          type="text" 
                          required
                          value={absForm.title}
                          onChange={e => setAbsForm(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="Optimization of Smart Grids using Deep Evolutionary Techniques..."
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
                        />
                      </div>

                      {/* Drag & drop helper sandbox */}
                      <div 
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleSampleDrop}
                        onClick={handleSampleDrop}
                        className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all ${
                          isDragging ? 'border-blue-600 bg-blue-50' : 'border-slate-300 hover:border-slate-400 bg-slate-50'
                        }`}
                        title="Klik untuk mengisi secara instan naskah rujukan otomatis"
                        id="autofill-drag-zone"
                      >
                        <Upload className="w-8 h-8 text-slate-400 mb-1" />
                        <p className="text-xs font-semibold text-slate-700 text-center">{t.absDragZone}</p>
                        <p className="text-[10px] text-blue-600 font-bold uppercase mt-1">
                          {lang === 'id' ? 'KLIK DI SINI UNTUK AUTO-FILL SAMPLE DRAP' : 'CLICK HERE FOR AUTO-FILL HIGH-QUALITY SAMPLE'}
                        </p>
                      </div>

                      {/* Abstrak Text area */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t.absTextLabel} *</label>
                        <textarea 
                          required
                          rows={7}
                          value={absForm.abstractText}
                          onChange={e => setAbsForm(prev => ({ ...prev, abstractText: e.target.value }))}
                          placeholder={t.absTextPlaceholder}
                          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs leading-relaxed focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
                        />
                      </div>

                      {/* Keywords */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t.absKeyLabel} *</label>
                        <input 
                          type="text" 
                          required
                          value={absForm.keywords}
                          onChange={e => setAbsForm(prev => ({ ...prev, keywords: e.target.value }))}
                          placeholder="Smart Grid, Deep Learning, Renewable Energy"
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
                        />
                      </div>

                      {/* Action buttons */}
                      <div className="pt-2">
                        <button 
                          type="submit"
                          disabled={absLoading}
                          className={`w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 flex items-center justify-center gap-2 cursor-pointer transition-all ${
                            absLoading ? 'opacity-80 cursor-wait' : ''
                          }`}
                          id="btn-upload-abstract"
                        >
                          {absLoading ? (
                            <>
                              <RefreshCw className="w-5 h-5 animate-spin" />
                              <span>{t.absBtnLoading}</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 fill-white" />
                              <span>{t.absBtn}</span>
                            </>
                          )}
                        </button>
                      </div>

                    </form>
                  )}
                </div>

              </div>
            </div>

            {/* Right Column: AI Live Review Report Sandbox or Guidance */}
            <div className="lg:col-span-5 space-y-6">
              
              <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-white rounded-2xl p-6 border border-slate-800 shadow-2xl relative overflow-hidden" id="ai-peer-report">
                <div className="absolute top-0 right-0 w-44 h-44 bg-indigo-500/10 rounded-full blur-2xl"></div>
                
                {/* Header indicators */}
                <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4 relative z-10">
                  <div className="flex items-center space-x-2">
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></div>
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest font-mono">
                      AI PEER REVIEW ASSESSOR ACTIVE
                    </span>
                  </div>
                  <Sparkles className="w-4 h-4 text-indigo-400 fill-indigo-400/20" />
                </div>

                {selectedSub ? (
                  <div className="space-y-4 relative z-10 animate-fadeIn">
                    
                    {/* Abstract metadata banner */}
                    <div className="bg-white/5 rounded-xl p-4.5 border border-white/10 space-y-3">
                      <div>
                        <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider block">ID ABSTRACT SUBMISSION</span>
                        <h4 className="text-sm font-extrabold text-white mt-0.5">{selectedSub.id}</h4>
                        <p className="text-[10px] text-zinc-400 font-bold block overflow-ellipsis overflow-hidden whitespace-nowrap mt-0.5">{selectedSub.title}</p>
                      </div>
                      
                      {/* Top review score metrics */}
                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10">
                        <div>
                          <span className="text-[9px] font-bold text-zinc-400 uppercase block">RECOMMENDED DECISION</span>
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mt-1 ${
                            selectedSub.status === 'Accepted' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                            selectedSub.status === 'Revision' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40' : 'bg-red-500/20 text-red-300'
                          }`}>{selectedSub.status}</span>
                        </div>

                        <div>
                          <span className="text-[9px] font-bold text-zinc-400 uppercase block">PEER SCORE VALUE</span>
                          <div className="flex items-baseline space-x-0.5 mt-0.5">
                            <span className="text-lg font-extrabold text-indigo-300">{selectedSub.reviewScore}</span>
                            <span className="text-[10px] text-zinc-500">/ 100</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Breakdown stars progress bar */}
                    <div className="space-y-2 pt-2">
                      <span className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase block">Methodical Integrity Scores</span>
                      
                      {/* Novelty */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-300">kebaruan Ilmiah (Novelty Novelty)</span>
                        <div className="flex items-center space-x-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-3.5 h-3.5 ${
                                i < selectedSub.noveltyRating ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-700'
                              }`} 
                            />
                          ))}
                        </div>
                      </div>

                      {/* Clarity */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-300">Kejelasan Masalah (Clarity / Logic)</span>
                        <div className="flex items-center space-x-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-3.5 h-3.5 ${
                                i < selectedSub.clarityRating ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-700'
                              }`} 
                            />
                          ))}
                        </div>
                      </div>

                      {/* Grammar */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-300">Tata Bahasa (Grammar Structure)</span>
                        <div className="flex items-center space-x-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-3.5 h-3.5 ${
                                i < selectedSub.grammarRating ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-700'
                              }`} 
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Feedback content */}
                    <div className="space-y-1.5 pt-3 border-t border-white/10 text-xs leading-relaxed">
                      <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block">Reviewer Feedback Comments</span>
                      <p className="text-zinc-300 italic font-medium leading-relaxed bg-white/5 p-3 rounded-lg border border-white/5">
                        "{selectedSub.feedback}"
                      </p>
                    </div>

                    {/* Suggestions list */}
                    <div className="space-y-1.5 pt-2 text-xs leading-relaxed">
                      <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block">Actionable Suggestions for Author</span>
                      <p className="text-slate-300 block bg-blue-950/40 p-3 rounded-lg border border-blue-900/30">
                        {selectedSub.suggestions}
                      </p>
                    </div>

                    {/* Review signature status */}
                    <div className="pt-3 border-t border-white/10 flex justify-between items-center text-[10px] text-zinc-500 font-mono">
                      <span>Evaluator ID: {selectedSub.peerReviewer}</span>
                      <span>Verified: {new Date(selectedSub.submittedAt).toLocaleDateString()}</span>
                    </div>

                  </div>
                ) : (
                  <div className="py-12 text-center text-zinc-500 space-y-4 relative z-10">
                    <Sparkles className="w-12 h-12 text-indigo-400/40 mx-auto fill-indigo-400/5" />
                    <div className="space-y-1 max-w-sm mx-auto">
                      <p className="text-sm font-bold text-indigo-300">Belum Ada Analisis Laporan</p>
                      <p className="text-xs text-zinc-400">
                        Isi form naskah di sebelah kiri lalu klik submit. Sistem Generative AI kami akan mengesahkan laporan di sini secara seketika.
                      </p>
                    </div>
                  </div>
                )}
                
              </div>

            </div>
          </section>
        )}


        {/* --- PAGE 4: CENTRALIZED DATABASE REFORTS & ORGANIZER SYSTEM --- */}
        {activeTab === 'database' && (
          <section className="space-y-6 animate-fadeIn" id="sec-database">
            
            {/* Header filters and search bar */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              
              <div>
                <h2 className="text-xl font-bold text-slate-900">{t.dbTitle}</h2>
                <p className="text-xs text-slate-500 mt-1">{t.dbSub}</p>
              </div>

              {/* Action tabs filters switcher */}
              <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0 self-start md:self-auto">
                <button 
                  onClick={() => setDbSubTab('submissions')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                    dbSubTab === 'submissions' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-800'
                  }`}
                  id="tab-sub-submissions"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Submissions ({submissions.length})</span>
                </button>
                <button 
                  onClick={() => setDbSubTab('registrations')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                    dbSubTab === 'registrations' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-800'
                  }`}
                  id="tab-sub-registrations"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Registrations ({registrations.length})</span>
                </button>
              </div>

            </div>

            {/* Live Search & Filter Controls */}
            <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
              <div className="relative max-w-xl flex-1">
                <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 shadow-xs transition-all"
                  id="search-input-box"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3.5 top-3.5 text-xs font-bold text-slate-400 hover:text-slate-600"
                  >
                    Clear
                  </button>
                )}
              </div>

              {dbSubTab === 'registrations' && (
                <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
                  <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200 uppercase tracking-wide">
                    <span className="text-[10px] font-extrabold text-slate-500 tracking-wider px-2">Filter Kategori:</span>
                    <button
                      onClick={() => setDbCategoryFilter('all')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        dbCategoryFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-800'
                      }`}
                    >
                      Semua
                    </button>
                    <button
                      onClick={() => setDbCategoryFilter('umum')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        dbCategoryFilter === 'umum' ? 'bg-white text-indigo-750 shadow-xs' : 'text-slate-600 hover:text-slate-800'
                      }`}
                    >
                      Umum ({stats.umumCount ?? 0})
                    </button>
                    <button
                      onClick={() => setDbCategoryFilter('mitra')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        dbCategoryFilter === 'mitra' ? 'bg-white text-indigo-750 shadow-xs' : 'text-slate-600 hover:text-slate-800'
                      }`}
                    >
                      Mitra ({stats.mitraCount ?? 0})
                    </button>
                  </div>

                  <button
                    onClick={handleExportRegistrations}
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all border border-emerald-700 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Export ke Excel</span>
                  </button>
                </div>
              )}

              {dbSubTab === 'submissions' && (
                <button
                  onClick={handleExportSubmissions}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all border border-emerald-700 cursor-pointer self-start md:self-auto"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Export ke Excel</span>
                </button>
              )}
            </div>

            {/* Tables Container */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden id-db-card">
              
              {/* VIEW A: SUBMISSIONS / ABSTRACTS LIST */}
              {dbSubTab === 'submissions' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 uppercase tracking-widest text-[9px] font-bold border-b border-slate-200">
                        <th className="p-4">Submission ID</th>
                        <th className="p-4">Main Author / Affiliation</th>
                        <th className="p-4">Scientific Paper Scope & Title</th>
                        <th className="p-4">Track Field</th>
                        <th className="p-4 text-center">Score</th>
                        <th className="p-4 text-center">AI Outcome</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {submissions.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                            Tidak ada data naskah abstrak yang terindentifikasi. Silakan submit atau sesuaikan filter pencarian.
                          </td>
                        </tr>
                      ) : (
                        submissions.map((sub, sIdx) => (
                          <tr key={sIdx} className="hover:bg-slate-50/70 transition-all">
                            <td className="p-4">
                              <span className="font-mono font-extrabold text-blue-700 block">{sub.id}</span>
                              <span className="text-[10px] text-slate-400">{new Date(sub.submittedAt).toLocaleDateString()}</span>
                            </td>
                            <td className="p-4">
                              <div className="font-bold text-slate-900">{sub.presenterName}</div>
                              <div className="text-[10px] text-slate-400">{sub.institution}</div>
                              <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{sub.presenterEmail}</div>
                            </td>
                            <td className="p-4 max-w-xs">
                              <div className="font-bold text-slate-800 line-clamp-2 italic">"{sub.title}"</div>
                              <div className="text-[10px] text-slate-400 line-clamp-1 mt-1 font-mono">Tags: {sub.keywords}</div>
                            </td>
                            <td className="p-4 whitespace-nowrap">
                              <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase tracking-wider block text-center border">
                                {sub.track}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <div className="text-sm font-extrabold text-indigo-700">{sub.reviewScore}</div>
                              <span className="text-[9px] text-slate-400 block">Grammar: {sub.grammarRating}/5</span>
                            </td>
                            <td className="p-4 text-center whitespace-nowrap">
                              <span className={`inline-block px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wide border ${
                                sub.status === 'Accepted' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                sub.status === 'Revision' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' : 'bg-red-50 text-red-700 border-red-100'
                              }`}>{sub.status}</span>
                            </td>
                            <td className="p-4 text-right">
                              <button 
                                onClick={() => {
                                  setSelectedSub(sub);
                                  // Switch view or keep modal open? It automatically pulls view on right column if they active 'abstract'
                                  setActiveTab('abstract');
                                }}
                                className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 active:bg-blue-200 rounded font-bold transition-all text-[11px]"
                              >
                                Detail Review
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* VIEW B: REGISTRATIONS LIST */}
              {dbSubTab === 'registrations' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 uppercase tracking-widest text-[9px] font-bold border-b border-slate-200">
                        <th className="p-4">Registration ID</th>
                        <th className="p-4">Participant Full Name</th>
                        <th className="p-4">Contact Info (Email & Phone)</th>
                        <th className="p-4">Institution / Campus</th>
                        <th className="p-4">Country</th>
                        <th className="p-4">Fee Category</th>
                        <th className="p-4 text-center">Role Flag</th>
                        <th className="p-4 text-center">Kategori</th>
                        <th className="p-4 text-center">Bukti Pembayaran</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {(() => {
                        const filteredRegs = registrations.filter(reg => {
                          if (dbCategoryFilter === 'all') return true;
                          if (dbCategoryFilter === 'mitra') return reg.category === 'mitra';
                          return !reg.category || reg.category === 'umum';
                        });

                        if (filteredRegs.length === 0) {
                          return (
                            <tr>
                              <td colSpan={9} className="p-8 text-center text-slate-400 italic">
                                Tidak ada peserta terdaftar yang sesuai kriteria pencarian kategori {dbCategoryFilter === 'mitra' ? 'Mitra' : 'Umum'}.
                              </td>
                            </tr>
                          );
                        }

                        return filteredRegs.map((reg, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-50/70 transition-all">
                            <td className="p-4">
                              <span className="font-mono font-extrabold text-blue-700 block">{reg.id}</span>
                              <span className="text-[10px] text-slate-400">{new Date(reg.registeredAt).toLocaleDateString()}</span>
                            </td>
                            <td className="p-4">
                              <div className="font-bold text-slate-900">{reg.name}</div>
                            </td>
                            <td className="p-4">
                              <div className="font-semibold text-slate-700 flex items-center gap-1">
                                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>{reg.email}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>{reg.phone}</span>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="font-bold text-slate-800">{reg.institution}</div>
                            </td>
                            <td className="p-4 whitespace-nowrap">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>{reg.country}</span>
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="font-extrabold text-slate-800">
                                {reg.role === 'presenter' ? (
                                  reg.country.toLowerCase() === 'indonesia' ? config.registrationFees.presenter.domesticNormal : config.registrationFees.presenter.intlNormal
                                ) : (
                                  reg.country.toLowerCase() === 'indonesia' ? config.registrationFees.attendee.domestic : config.registrationFees.attendee.intl
                                )}
                              </div>
                              <span className="text-[9px] text-slate-400 block">Invoice Generated</span>
                            </td>
                            <td className="p-4 text-center whitespace-nowrap">
                              <span className={`inline-block px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                                reg.role === 'presenter' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              }`}>{reg.role}</span>
                            </td>
                            <td className="p-4 text-center whitespace-nowrap">
                              <span className={`inline-block px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${
                                reg.category === 'mitra' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}>{reg.category === 'mitra' ? 'Mitra' : 'Umum'}</span>
                            </td>
                            <td className="p-4 text-center">
                              {reg.paymentProof ? (
                                <button
                                  type="button"
                                  onClick={() => setAdminSelectedPaymentProof(reg)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold text-xs rounded-xl border border-emerald-200 cursor-pointer transition-all shadow-3xs"
                                >
                                  <span>👁️ Lihat Hasil Upload</span>
                                </button>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-600 text-[10px] font-bold rounded-lg border border-red-100">
                                  ⚠️ Belum Upload
                                </span>
                              )}
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          </section>
        )}

        {/* Dynamic Frontpage Config Admin Panel */}
        {activeTab === 'admin' && (
          <section className="py-12 bg-slate-50 relative animate-fade-in" id="admin-panel-section">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {!adminToken ? (
                <div className="max-w-md mx-auto my-12 animate-fade-in">
                  <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden">
                    <div className="p-8 bg-gradient-to-br from-slate-950 to-slate-900 text-white relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full blur-2xl"></div>
                      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-red-600/10 rounded-full blur-3xl"></div>
                      
                      <div className="relative flex flex-col items-center text-center space-y-3">
                        <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/50 inline-block shadow-lg">
                          <ShieldCheck className="w-8 h-8 text-red-500" />
                        </div>
                        <h2 className="text-xl font-extrabold tracking-tight">Login Portal Utama Admin</h2>
                        <p className="text-xs text-slate-300 leading-relaxed max-w-sm font-medium">
                          {lang === 'id' 
                            ? 'Masukkan kredensial administrator resmi untuk mengelola naskah ilmiah, timeline konferensi, dan live tarif.' 
                            : 'Enter official admin credentials to oversee scientific schedules, conference track layouts, and registration fees.'
                          }
                        </p>
                      </div>
                    </div>

                    <form onSubmit={handleLogin} className="p-8 space-y-5">
                      {loginError && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs font-semibold rounded-lg flex items-start gap-2 animate-shake">
                          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                          <span>{loginError}</span>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Username</label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-3.5 text-xs text-slate-400">
                            👤
                          </span>
                          <input 
                            type="text" 
                            required
                            placeholder="admin"
                            value={loginUsername}
                            onChange={e => setLoginUsername(e.target.value)}
                            className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all font-mono"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Kata Sandi (Password)</label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-3.5 text-xs text-slate-400">
                            🔒
                          </span>
                          <input 
                            type="password" 
                            required
                            placeholder="••••••••"
                            value={loginPassword}
                            onChange={e => setLoginPassword(e.target.value)}
                            className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100 transition-all"
                          />
                        </div>
                      </div>

                      <button 
                        type="submit"
                        disabled={loginLoading}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-lg hover:shadow-blue-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {loginLoading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Memproses...</span>
                          </>
                        ) : (
                          <>
                            <span>Masuk ke Dashboard 🔑</span>
                          </>
                        )}
                      </button>

                      <div className="relative flex py-1 items-center">
                        <div className="flex-grow border-t border-slate-200"></div>
                        <span className="flex-shrink mx-3 text-[9px] text-slate-400 font-extrabold uppercase tracking-widest">Atau via Cloud Sync</span>
                        <div className="flex-grow border-t border-slate-200"></div>
                      </div>

                      <button 
                        type="button"
                        onClick={async () => {
                          setLoginLoading(true);
                          setLoginError(null);
                          try {
                            const provider = new GoogleAuthProvider();
                            const result = await signInWithPopup(auth, provider);
                            const user = result.user;
                            const email = user.email || '';
                            const isAllowedAdmin = email === 'mawanta@eka-prasetya.ac.id' || email.endsWith('@eka-prasetya.ac.id');
                            if (!isAllowedAdmin) {
                              await signOut(auth);
                              throw new Error('Email Anda tidak terdaftar sebagai Administrator.');
                            }
                            console.log("Logged in admin: ", user.email);
                          } catch (err: any) {
                            setLoginError(err.message || 'Gagal login menggunakan Google.');
                          } finally {
                            setLoginLoading(false);
                          }
                        }}
                        disabled={loginLoading}
                        className="w-full py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <Globe className="w-4 h-4 text-blue-600" />
                        <span>Login Google Admin (Sinkronisasi)</span>
                      </button>


                    </form>
                  </div>
                </div>
              ) : (
                <>
                  {/* Header Box */}
                  <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-250/90 shadow-xs mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="p-3 bg-red-50 text-red-600 rounded-xl shrink-0">
                          <ShieldCheck className="w-6 h-6" />
                        </span>
                        <div>
                          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">IBEC 2026 Admin Control Center</h2>
                          <p className="text-xs text-slate-500 mt-1">Edit front-page content, tracks, speakers, milestone schedules, and live fees dynamically.</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button 
                        onClick={handleResetConfig}
                        disabled={adminSaving}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${adminSaving ? 'animate-spin' : ''}`} />
                        Reset ke Bawaan
                      </button>
                      <button 
                        onClick={() => handleSaveConfig(config)}
                        disabled={adminSaving}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        <span>💾 Simpan Semua Perubahan</span>
                      </button>

                      <div className="h-6 w-[1px] bg-slate-200 mx-1 hidden sm:block animate-pulse"></div>

                      <button 
                        onClick={handleLogout}
                        className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-750 text-xs font-bold rounded-lg border border-red-100 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        🚪 Keluar (Logout)
                      </button>
                    </div>
                  </div>

              {/* Status messages */}
              {adminSuccess && (
                <div className="p-4 bg-emerald-50 border border-emerald-250 text-emerald-800 text-xs font-bold rounded-xl mb-6 shadow-xs flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                  Konfigurasi berhasil disimpan dan diperbarui di seluruh landing page secara instan!
                </div>
              )}
              {adminError && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-xs font-bold rounded-xl mb-6 shadow-xs">
                  Error: {adminError}
                </div>
              )}

              {/* Grid Layout containing Tab Sidebar & main Form container */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                
                {/* Admin Tab Navigation */}
                <div className="lg:col-span-1 space-y-1.5">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block px-3 mb-2">PENGATURAN KONTEN</span>
                  
                  {[
                    { key: 'hero', label: '🏠 Judul & Slogan (Hero)', desc: 'Header utama depan' },
                    { key: 'about', label: '❓ Tentang IBEC 2026', desc: 'Rincian informasi deskripsi umum' },
                    { key: 'poster', label: '🖼️ Poster Konferensi', desc: 'Upload dan tampilkan poster resmi' },
                    { key: 'tracks', label: '🛠️ Topik Riset (Tracks)', desc: 'Daftar sub-kluster riset' },
                    { key: 'dates', label: '📅 Agenda & Deadline', desc: 'Timeline & tanggal penting' },
                    { key: 'speakers', label: '🎤 Keynote Speakers', desc: 'Daftar pembicara ahli' },
                    { key: 'fees', label: '💵 Tarif Registrasi', desc: 'Biaya keikutsertaan' },
                    { key: 'countdown', label: '🎯 Hitung Mundur (Timer)', desc: 'Atur hitung mundur di web depan' },
                    { key: 'running_logos', label: '🏃 Logo Berjalan (Ticker)', desc: 'Logo partner/sponsorship berjalan' },
                    { key: 'footer', label: '👣 Tata Letak Footer (Kaki)', desc: 'Informasi kontak & hak cipta footer' },
                    { key: 'language', label: '🌐 Pengaturan Bahasa', desc: 'Default bahasa & tombol switch' },
                    { key: 'video_header', label: '🎥 Video YouTube Header', desc: 'Ganti latar header dengan video YouTube' },
                    { key: 'materials', label: '📂 Unduhan Dokumen & Materi', desc: 'Kelola file unduhan & materi draf' }
                  ].map((subTab) => (
                    <button 
                      key={subTab.key}
                      onClick={() => setAdminSubTab(subTab.key as any)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col cursor-pointer ${
                        adminSubTab === subTab.key 
                          ? 'bg-white border-blue-200 shadow-xs text-blue-700 font-bold' 
                          : 'bg-transparent border-transparent hover:bg-white hover:border-slate-200 text-slate-600'
                      }`}
                    >
                      <span className="text-xs">{subTab.label}</span>
                      <span className="text-[10px] text-slate-400 font-normal mt-0.5">{subTab.desc}</span>
                    </button>
                  ))}

                  <div className="h-px bg-slate-200/60 my-4 mx-3"></div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block px-3 mb-2">DATA MASUKAN</span>
                  <button 
                    onClick={() => setAdminSubTab('registrations')}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col cursor-pointer ${
                      adminSubTab === 'registrations' 
                        ? 'bg-white border-blue-200 shadow-xs text-blue-700 font-bold' 
                        : 'bg-transparent border-transparent hover:bg-white hover:border-slate-200 text-slate-600'
                    }`}
                  >
                    <span className="text-xs">👥 Pendaftar (Registrants)</span>
                    <span className="text-[10px] text-slate-400 font-normal mt-0.5">Lihat & kelola semua peserta</span>
                  </button>
                  <button 
                    onClick={() => setAdminSubTab('abstracts')}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col cursor-pointer ${
                      adminSubTab === 'abstracts' 
                        ? 'bg-white border-blue-200 shadow-xs text-blue-700 font-bold' 
                        : 'bg-transparent border-transparent hover:bg-white hover:border-slate-200 text-slate-600'
                    }`}
                  >
                    <span className="text-xs">📄 Unggah &amp; Evaluasi Abstrak</span>
                    <span className="text-[10px] text-slate-400 font-normal mt-0.5">Penelaahan &amp; review AI otomatis instan</span>
                  </button>

                  <div className="h-px bg-slate-200/60 my-4 mx-3"></div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block px-3 mb-2">KEAMANAN &amp; AKSES</span>
                  <button 
                    onClick={() => setAdminSubTab('credentials')}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col cursor-pointer ${
                      adminSubTab === 'credentials' 
                        ? 'bg-white border-blue-200 shadow-xs text-blue-700 font-bold' 
                        : 'bg-transparent border-transparent hover:bg-white hover:border-slate-200 text-slate-600'
                    }`}
                  >
                    <span className="text-xs">🔑 Kredensial Akses</span>
                    <span className="text-[10px] text-slate-400 font-normal mt-0.5">Ubah nama pengguna &amp; katakunci</span>
                  </button>
                </div>

                {/* Form Main Area */}
                <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-6 md:p-8 space-y-6">
                  
                  {/* HERO CONFIG SUBTAB */}
                  {adminSubTab === 'hero' && (
                    <div className="space-y-6">
                      <div className="border-b border-slate-100 pb-4">
                        <h3 className="text-base font-bold text-slate-900">Judul, Slogan & Logo Landing Page</h3>
                        <p className="text-xs text-slate-500 mt-1">Sesuaikan tajuk acara utama serta logo atau inisial branding agar dapat mencerminkan tema konferensi secara internasional.</p>
                      </div>

                      {/* Pengaturan Logo & Branding */}
                      <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 space-y-4">
                        <div className="flex items-center gap-2 border-b border-slate-150 pb-3">
                          <span className="p-2 bg-blue-50 text-blue-600 rounded-lg text-sm">
                            🎨
                          </span>
                          <div>
                            <h4 className="text-xs font-bold text-slate-800">Pengaturan Logo &amp; Branding Portal</h4>
                            <p className="text-[10px] text-slate-500">Atur inisial logo, teks nama, atau tautkan gambar logo khusus sesuai keinginan Anda.</p>
                          </div>
                        </div>

                        {/* Real-time logo preview box */}
                        <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-3.5 rounded-xl border border-slate-150/80 shadow-2xs">
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider shrink-0">Preview Logo Anda:</span>
                          <div className="flex flex-col bg-slate-50 p-2.5 px-3.5 rounded-lg border border-slate-100 w-full max-w-md">
                            <div className="flex items-center space-x-2">
                              {config.logoUrl ? (
                                <img 
                                  src={config.logoUrl} 
                                  alt="Preview" 
                                  className="w-8 h-8 object-contain rounded-lg bg-slate-200/60 p-0.5"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-extrabold text-sm tracking-wider shadow-sm">
                                  {config.logoAbbreviation || 'I'}
                                </div>
                              )}
                              <span className="font-extrabold text-slate-900 text-xs tracking-tight">{config.logoText || 'IBEC 2026'}</span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-sans mt-1 italic block truncate">
                              {config.logoSubtitle || 'Advanced Science, Engineering & Sustainable Tech'}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 font-sans">Inisial Logo (1 Huruf)</label>
                            <input 
                              type="text"
                              maxLength={3}
                              placeholder="I"
                              value={config.logoAbbreviation || ''}
                              onChange={e => setConfig(prev => ({ ...prev, logoAbbreviation: e.target.value }))}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                            />
                            <p className="text-[9px] text-slate-450 mt-1 italic">Digunakan jika URL gambar di bawah kosong.</p>
                          </div>

                          <div>
                            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 font-sans">Nama Singkat Logo (Headline)</label>
                            <input 
                              type="text"
                              placeholder="IBEC 2026"
                              value={config.logoText || ''}
                              onChange={e => setConfig(prev => ({ ...prev, logoText: e.target.value }))}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500 transition-all font-sans"
                            />
                            <p className="text-[9px] text-slate-450 mt-1 italic">Nama utama branding konferensi Anda.</p>
                          </div>

                          <div>
                            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 font-sans">URL Gambar Logo (Opsional)</label>
                            <input 
                              type="text"
                              placeholder="https://example.com/logo.png"
                              value={config.logoUrl || ''}
                              onChange={e => setConfig(prev => ({ ...prev, logoUrl: e.target.value }))}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
                            />
                            <p className="text-[9px] text-slate-450 mt-1 italic">Tautkan ke link gambar logo eksternal (.png / .jpg).</p>
                          </div>
                        </div>

                        <div className="pt-2">
                          <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 font-sans">Tulisan di Bawah Logo (Logo Subtitle)</label>
                          <input 
                            type="text"
                            placeholder="Advanced Science, Engineering & Sustainable Tech"
                            value={config.logoSubtitle || ''}
                            onChange={e => setConfig(prev => ({ ...prev, logoSubtitle: e.target.value }))}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500 transition-all font-sans text-slate-800 font-medium"
                          />
                          <p className="text-[9px] text-slate-450 mt-1.5 italic">Teks atau slogan panjang acara yang tampil langsung di bawah nama logo utama pada navigasi atas.</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Hero Title (English) *</label>
                          <textarea 
                            rows={2}
                            value={config.heroTitleEn}
                            onChange={e => setConfig(prev => ({ ...prev, heroTitleEn: e.target.value }))}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all font-sans"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Hero Title (Bahasa Indonesia) *</label>
                          <textarea 
                            rows={2}
                            value={config.heroTitleId}
                            onChange={e => setConfig(prev => ({ ...prev, heroTitleId: e.target.value }))}
                            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all font-sans"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Hero Subtitle (English) *</label>
                            <textarea 
                              rows={3}
                              value={config.heroSubEn}
                              onChange={e => setConfig(prev => ({ ...prev, heroSubEn: e.target.value }))}
                              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all font-sans"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Hero Subtitle (Bahasa Indonesia) *</label>
                            <textarea 
                              rows={3}
                              value={config.heroSubId}
                              onChange={e => setConfig(prev => ({ ...prev, heroSubId: e.target.value }))}
                              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all font-sans"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Date & Venue String (English) *</label>
                            <input 
                              type="text"
                              value={config.dateVenueEn}
                              onChange={e => setConfig(prev => ({ ...prev, dateVenueEn: e.target.value }))}
                              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Date & Venue String (Bahasa Indonesia) *</label>
                            <input 
                              type="text"
                              value={config.dateVenueId}
                              onChange={e => setConfig(prev => ({ ...prev, dateVenueId: e.target.value }))}
                              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all"
                            />
                          </div>
                        </div>

                        {/* Pengaturan Teks Tombol Hero */}
                        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 space-y-4">
                          <div className="flex items-center gap-2 border-b border-slate-150 pb-3">
                            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm">
                              🖱️
                            </span>
                            <div>
                              <h4 className="text-xs font-bold text-slate-800">Ubah Teks Tombol Hero (Hero Buttons Text Customization)</h4>
                              <p className="text-[10px] text-slate-500">Sesuaikan tulisan link pendaftaran, unggah abstrak, dan laporan database utama.</p>
                            </div>
                          </div>

                          <div className="space-y-4">
                            {/* Tombol 1: Register Now */}
                            <div className="p-4 bg-white border border-slate-150 rounded-xl space-y-3">
                              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider block">Tombol 1: Register Now</span>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Teks (Bahasa Indonesia)</label>
                                  <input 
                                    type="text"
                                    value={config.heroRegisterBtnId || ''}
                                    placeholder="Mendaftar Sekarang"
                                    onChange={e => setConfig(prev => ({ ...prev, heroRegisterBtnId: e.target.value }))}
                                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Text (English)</label>
                                  <input 
                                    type="text"
                                    value={config.heroRegisterBtnEn || ''}
                                    placeholder="Register Now"
                                    onChange={e => setConfig(prev => ({ ...prev, heroRegisterBtnEn: e.target.value }))}
                                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Tombol 2: Submit Scientific Abstract */}
                            <div className="p-4 bg-white border border-slate-150 rounded-xl space-y-3">
                              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider block">Tombol 2: Submit Scientific Abstract</span>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Teks (Bahasa Indonesia)</label>
                                  <input 
                                    type="text"
                                    value={config.heroAbstractBtnId || ''}
                                    placeholder="Kirim Abstrak Ilmiah"
                                    onChange={e => setConfig(prev => ({ ...prev, heroAbstractBtnId: e.target.value }))}
                                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Text (English)</label>
                                  <input 
                                    type="text"
                                    value={config.heroAbstractBtnEn || ''}
                                    placeholder="Submit Scientific Abstract"
                                    onChange={e => setConfig(prev => ({ ...prev, heroAbstractBtnEn: e.target.value }))}
                                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Tombol 3: Live Submissions Logs */}
                            <div className="p-4 bg-white border border-slate-150 rounded-xl space-y-3">
                              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider block">Tombol 3: Live Submissions Logs</span>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Teks (Bahasa Indonesia)</label>
                                  <input 
                                    type="text"
                                    value={config.heroDbBtnId || ''}
                                    placeholder="Log Pengajuan Live"
                                    onChange={e => setConfig(prev => ({ ...prev, heroDbBtnId: e.target.value }))}
                                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Text (English)</label>
                                  <input 
                                    type="text"
                                    value={config.heroDbBtnEn || ''}
                                    placeholder="Live Submissions Logs"
                                    onChange={e => setConfig(prev => ({ ...prev, heroDbBtnEn: e.target.value }))}
                                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                  )}

                  {/* ABOUT CONFIG SUBTAB */}
                  {adminSubTab === 'about' && (
                    <div className="space-y-6 animate-fade-in">
                      <div className="border-b border-slate-100 pb-4">
                        <h3 className="text-base font-bold text-slate-900">Deskripsi Tentang IBEC 2026 (About Section)</h3>
                        <p className="text-xs text-slate-500 mt-1">Ubah judul dan isi paragraf penjelasan umum IBEC 2026 yang ditampilkan di halaman beranda dalam bahasa Indonesia dan Inggris.</p>
                      </div>

                      <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 space-y-4">
                        <div className="flex items-center gap-2 border-b border-slate-150 pb-3">
                          <span className="p-2 bg-blue-50 text-blue-600 rounded-lg text-sm">
                            ❓
                          </span>
                          <div>
                            <h4 className="text-xs font-bold text-slate-800">Judul Bagian Tentang IBEC</h4>
                            <p className="text-[10px] text-slate-500">Judul utama untuk mendeskripsikan konferensi.</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Judul (Bahasa Indonesia) *</label>
                            <input 
                              type="text"
                              value={config.aboutTitleId || ''}
                              onChange={e => setConfig(prev => ({ ...prev, aboutTitleId: e.target.value }))}
                              placeholder="Tentang IBEC 2026"
                              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all font-sans"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Judul (English) *</label>
                            <input 
                              type="text"
                              value={config.aboutTitleEn || ''}
                              onChange={e => setConfig(prev => ({ ...prev, aboutTitleEn: e.target.value }))}
                              placeholder="About IBEC 2026"
                              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all font-sans"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 space-y-4">
                        <div className="flex items-center gap-2 border-b border-slate-150 pb-3">
                          <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg text-sm">
                            📝
                          </span>
                          <div>
                            <h4 className="text-xs font-bold text-slate-800">Teks Deskripsi / Paragraf Utama</h4>
                            <p className="text-[10px] text-slate-500">Paragraf penjelasan rinci mengenai profil dan sistem penilai naskah cerdas AI.</p>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Deskripsi Paragraf (Bahasa Indonesia) *</label>
                            <textarea 
                              rows={5}
                              value={config.aboutTextId || ''}
                              onChange={e => setConfig(prev => ({ ...prev, aboutTextId: e.target.value }))}
                              placeholder="Ketik deskripsi dalam Bahasa Indonesia..."
                              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all resize-none leading-relaxed font-sans"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Deskripsi Paragraf (English) *</label>
                            <textarea 
                              rows={5}
                              value={config.aboutTextEn || ''}
                              onChange={e => setConfig(prev => ({ ...prev, aboutTextEn: e.target.value }))}
                              placeholder="Type description in English..."
                              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all resize-none leading-relaxed font-sans"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* POSTER CONFIG SUBTAB */}
                  {adminSubTab === 'poster' && (
                    <div className="space-y-6 animate-fade-in" id="admin-poster-subtab">
                      <div className="border-b border-slate-100 pb-4">
                        <h3 className="text-base font-bold text-slate-900">Poster Resmi IBEC 2026</h3>
                        <p className="text-xs text-slate-500 mt-1">Kelola publikasi digital & poster konferensi yang akan ditampilkan di halaman depan IBEC Hub.</p>
                      </div>

                      {/* Display Switch Toggle */}
                      <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/85">
                        <div className="flex items-center justify-between">
                          <div className="flex items-start gap-3">
                            <span className="p-2 bg-blue-50 text-blue-600 rounded-lg text-sm">
                              👁️
                            </span>
                            <div>
                              <h4 className="text-xs font-bold text-slate-800">Tampilkan Poster di Halaman Depan</h4>
                              <p className="text-[10px] text-slate-500 mt-0.5">Jika diaktifkan, poster akan ditampilkan secara impresif pada kolom samping/bawah bagian deskripsi 'Tentang Kami'.</p>
                            </div>
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={() => setConfig(prev => ({ ...prev, posterEnabled: !prev.posterEnabled }))}
                              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-205 ease-in-out focus:outline-none ${
                                config.posterEnabled ? 'bg-indigo-650' : 'bg-slate-250'
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-205 ease-in-out ${
                                  config.posterEnabled ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Poster Upload & URL Configuration */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        
                        {/* Form upload/link */}
                        <div className="space-y-5">
                          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 space-y-4">
                            <div className="flex items-center gap-2 border-b border-slate-150 pb-3">
                              <span className="p-2 bg-purple-50 text-purple-600 rounded-lg text-sm">
                                📤
                              </span>
                              <div>
                                <h4 className="text-xs font-bold text-slate-800">Metode 1: Unggah Berkas Poster</h4>
                                <p className="text-[10px] text-slate-500">Unggah berkas foto (.png, .jpg, .jpeg, .webp, .gif) langsung.</p>
                              </div>
                            </div>

                            <div
                              onDragOver={(e) => {
                                e.preventDefault();
                                setPosterDragOver(true);
                              }}
                              onDragLeave={() => setPosterDragOver(false)}
                              onDrop={(e) => {
                                e.preventDefault();
                                setPosterDragOver(false);
                                const file = e.dataTransfer.files?.[0];
                                if (file) {
                                  if (file.size > 8 * 1024 * 1024) {
                                    alert(lang === 'id' ? 'Ukuran file terlalu besar! Maksimal 8MB.' : 'File too large! Maximum 8MB.');
                                    return;
                                  }
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setConfig(prev => ({ ...prev, posterUrl: reader.result as string }));
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                              className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
                                posterDragOver 
                                  ? 'border-indigo-500 bg-indigo-50/50' 
                                  : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
                              }`}
                              onClick={() => document.getElementById('poster-upload-input')?.click()}
                            >
                              <input 
                                type="file" 
                                id="poster-upload-input"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    if (file.size > 8 * 1024 * 1024) {
                                      alert(lang === 'id' ? 'Ukuran file terlalu besar! Maksimal 8MB.' : 'File too large! Maximum 8MB.');
                                      return;
                                    }
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      setConfig(prev => ({ ...prev, posterUrl: reader.result as string }));
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                              <div className="flex flex-col items-center justify-center gap-2">
                                <span className="text-2xl text-slate-400">🖼️</span>
                                <p className="text-xs font-bold text-slate-700">
                                  {lang === 'id' ? 'Tarik & lepas gambar kemari atau klik' : 'Drag & drop image here or click'}
                                </p>
                                <p className="text-[10px] text-slate-400 font-medium">PNG, JPG, JPEG, WEBP (Maksimal 8MB)</p>
                                {config.posterUrl && config.posterUrl.startsWith('data:image') && (
                                  <span className="mt-2 text-[10px] bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-bold inline-flex items-center gap-1 animate-pulse">
                                    ✓ Berhasil Diunggah (Base64)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 space-y-4">
                            <div className="flex items-center gap-2 border-b border-slate-150 pb-3">
                              <span className="p-2 bg-yellow-50 text-yellow-600 rounded-lg text-sm">
                                🔗
                              </span>
                              <div>
                                <h4 className="text-xs font-bold text-slate-800">Metode 2: Tautan URL Gambar Eksternal</h4>
                                <p className="text-[10px] text-slate-500">Gunakan link eksternal jika poster dihosting di tempat lain.</p>
                              </div>
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Alamat URL Gambar Poster *</label>
                              <input 
                                type="url"
                                value={config.posterUrl || ''}
                                onChange={e => setConfig(prev => ({ ...prev, posterUrl: e.target.value }))}
                                placeholder="https://example.com/poster-ibec.png"
                                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-500 transition-all font-sans"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Live Preview Card */}
                        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 flex flex-col h-full min-h-[300px]">
                          <div className="flex items-center justify-between border-b border-slate-150 pb-3 mb-4">
                            <div className="flex items-center gap-2">
                              <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm">
                                📱
                              </span>
                              <div>
                                <h4 className="text-xs font-bold text-slate-800">Pratinjau Poster Terpasang</h4>
                                <p className="text-[10px] text-slate-500">Tampilan sesungguhnya poster Anda.</p>
                              </div>
                            </div>
                            {config.posterUrl && (
                              <button 
                                type="button" 
                                onClick={() => setConfig(prev => ({ ...prev, posterUrl: '' }))}
                                className="text-[10px] font-bold text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-all"
                              >
                                Bersihkan Poster
                              </button>
                            )}
                          </div>

                          <div className="flex-1 bg-slate-100 rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center relative min-h-[200px]">
                            {config.posterUrl ? (
                              <div className="w-full h-full p-2 flex items-center justify-center group relative">
                                <img 
                                  src={config.posterUrl} 
                                  alt="Poster Conference Preview" 
                                  className="max-h-[350px] w-auto object-contain rounded-lg shadow-md"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            ) : (
                              <div className="text-center p-6 space-y-2">
                                <span className="text-3xl text-slate-350 block">🖼️</span>
                                <p className="text-xs text-slate-450 font-bold">Belum Ada Poster Yang Terpasang</p>
                                <p className="text-[10px] text-slate-400">Silakan unggah poster atau masukkan tautan URL di kolom sebelah kiri.</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TRACKS CONFIG SUBTAB */}
                  {adminSubTab === 'tracks' && (
                    <div className="space-y-6">
                      <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
                        <div>
                          <h3 className="text-base font-bold text-slate-900">Kelola Research Tracks (Topik Publikasi)</h3>
                          <p className="text-xs text-slate-500 mt-1">Daftar bidang ilmu yang diterima naskah draf abstraknya.</p>
                        </div>
                        <button 
                          type="button"
                          onClick={() => {
                            const newTrack = {
                              id: String(Date.now()),
                              nameEn: 'New Thematic Track',
                              nameId: 'Topik Penelitian Baru',
                              descriptionEn: 'Details about research contributions on this theme.',
                              descriptionId: 'Rincian kontribusi naskah orisinal yang dibahas dalam kluster topik riset ini.',
                              iconName: 'BookOpen'
                            };
                            setConfig(prev => ({
                              ...prev,
                              conferenceTracks: [...prev.conferenceTracks, newTrack]
                            }));
                          }}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold rounded-lg border border-blue-100 transition-all cursor-pointer"
                        >
                          ➕ Tambah Track Baru
                        </button>
                      </div>

                      <div className="space-y-4">
                        {config.conferenceTracks.map((track, trackIdx) => (
                          <div key={track.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl relative space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-bold rounded">TRACK #{trackIdx + 1}</span>
                              <button 
                                type="button"
                                onClick={() => {
                                  setConfig(prev => ({
                                    ...prev,
                                    conferenceTracks: prev.conferenceTracks.filter(t => t.id !== track.id)
                                  }));
                                }}
                                className="text-red-600 hover:text-red-700 text-[11px] font-bold hover:underline cursor-pointer"
                              >
                                🗑️ Hapus Track
                              </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Track Name (English)</label>
                                <input 
                                  type="text"
                                  value={track.nameEn}
                                  onChange={e => {
                                    const nextTracks = [...config.conferenceTracks];
                                    nextTracks[trackIdx] = { ...track, nameEn: e.target.value };
                                    setConfig(prev => ({ ...prev, conferenceTracks: nextTracks }));
                                  }}
                                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs focus:outline-none"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Track Name (Indonesia)</label>
                                <input 
                                  type="text"
                                  value={track.nameId}
                                  onChange={e => {
                                    const nextTracks = [...config.conferenceTracks];
                                    nextTracks[trackIdx] = { ...track, nameId: e.target.value };
                                    setConfig(prev => ({ ...prev, conferenceTracks: nextTracks }));
                                  }}
                                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs focus:outline-none"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Description (English)</label>
                                <textarea 
                                  rows={2}
                                  value={track.descriptionEn}
                                  onChange={e => {
                                    const nextTracks = [...config.conferenceTracks];
                                    nextTracks[trackIdx] = { ...track, descriptionEn: e.target.value };
                                    setConfig(prev => ({ ...prev, conferenceTracks: nextTracks }));
                                  }}
                                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs focus:outline-none"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Description (Indonesia)</label>
                                <textarea 
                                  rows={2}
                                  value={track.descriptionId}
                                  onChange={e => {
                                    const nextTracks = [...config.conferenceTracks];
                                    nextTracks[trackIdx] = { ...track, descriptionId: e.target.value };
                                    setConfig(prev => ({ ...prev, conferenceTracks: nextTracks }));
                                  }}
                                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs focus:outline-none"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Visual Icon Key</label>
                              <select 
                                value={track.iconName}
                                onChange={e => {
                                  const nextTracks = [...config.conferenceTracks];
                                  nextTracks[trackIdx] = { ...track, iconName: e.target.value };
                                  setConfig(prev => ({ ...prev, conferenceTracks: nextTracks }));
                                }}
                                className="px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs focus:outline-none cursor-pointer"
                              >
                                <option value="Cpu">🖥️ Cpu (Advanced Computing)</option>
                                <option value="Zap">⚡ Zap (Electrical / Energy)</option>
                                <option value="Atom">⚛️ Atom (Applied Physics / Material)</option>
                                <option value="Leaf">🌱 Leaf (Environmental Sciences)</option>
                                <option value="Globe">🌐 Globe (Socio-Tech &amp; Systems)</option>
                              </select>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* DATES CONFIG SUBTAB */}
                  {adminSubTab === 'dates' && (
                    <div className="space-y-6">
                      <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
                        <div>
                          <h3 className="text-base font-bold text-slate-900">Kronologi & Agenda Penting</h3>
                          <p className="text-xs text-slate-500 mt-1">Tenggat pendaftaran, review, dan upload presentasi.</p>
                        </div>
                        <button 
                          type="button"
                          onClick={() => {
                            const newDate = {
                              titleEn: 'New Milestone Date',
                              titleId: 'Tanggal Agenda Baru',
                              date: 'October 15, 2026',
                              badgeEn: 'Open',
                              badgeId: 'Buka',
                              completed: false
                            };
                            setConfig(prev => ({
                              ...prev,
                              importantDates: [...prev.importantDates, newDate]
                            }));
                          }}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold rounded-lg border border-blue-100 transition-all cursor-pointer"
                        >
                          ➕ Tambah Tanggal Agenda
                        </button>
                      </div>

                      <div className="space-y-4">
                        {config.importantDates.map((date, idx) => (
                          <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl relative space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-bold rounded">AGENDA #{idx + 1}</span>
                              <button 
                                type="button"
                                onClick={() => {
                                  setConfig(prev => ({
                                    ...prev,
                                    importantDates: prev.importantDates.filter((_, dIdx) => dIdx !== idx)
                                  }));
                                }}
                                className="text-red-600 hover:text-red-700 text-[11px] font-bold hover:underline cursor-pointer"
                              >
                                🗑️ Hapus Agenda
                              </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Title (English)</label>
                                <input 
                                  type="text"
                                  value={date.titleEn}
                                  onChange={e => {
                                    const nextDates = [...config.importantDates];
                                    nextDates[idx] = { ...date, titleEn: e.target.value };
                                    setConfig(prev => ({ ...prev, importantDates: nextDates }));
                                  }}
                                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs focus:outline-none"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Title (Indonesia)</label>
                                <input 
                                  type="text"
                                  value={date.titleId}
                                  onChange={e => {
                                    const nextDates = [...config.importantDates];
                                    nextDates[idx] = { ...date, titleId: e.target.value };
                                    setConfig(prev => ({ ...prev, importantDates: nextDates }));
                                  }}
                                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs focus:outline-none"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Calendar Info/Date</label>
                                <input 
                                  type="text"
                                  value={date.date}
                                  onChange={e => {
                                    const nextDates = [...config.importantDates];
                                    nextDates[idx] = { ...date, date: e.target.value };
                                    setConfig(prev => ({ ...prev, importantDates: nextDates }));
                                  }}
                                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs focus:outline-none"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Badge (English)</label>
                                <input 
                                  type="text"
                                  value={date.badgeEn}
                                  onChange={e => {
                                    const nextDates = [...config.importantDates];
                                    nextDates[idx] = { ...date, badgeEn: e.target.value };
                                    setConfig(prev => ({ ...prev, importantDates: nextDates }));
                                  }}
                                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs focus:outline-none"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Badge (Indonesia)</label>
                                <input 
                                  type="text"
                                  value={date.badgeId}
                                  onChange={e => {
                                    const nextDates = [...config.importantDates];
                                    nextDates[idx] = { ...date, badgeId: e.target.value };
                                    setConfig(prev => ({ ...prev, importantDates: nextDates }));
                                  }}
                                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs focus:outline-none"
                                />
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 pt-1">
                              <input 
                                type="checkbox"
                                id={`check-${idx}`}
                                checked={date.completed}
                                onChange={e => {
                                  const nextDates = [...config.importantDates];
                                  nextDates[idx] = { ...date, completed: e.target.checked };
                                  setConfig(prev => ({ ...prev, importantDates: nextDates }));
                                }}
                                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                              />
                              <label htmlFor={`check-${idx}`} className="text-xs font-semibold text-slate-600 select-none cursor-pointer">Realisasi (Sudah Terlampaui)</label>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SPEAKERS CONFIG SUBTAB */}
                  {adminSubTab === 'speakers' && (
                    <div className="space-y-6">
                      <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
                        <div>
                          <h3 className="text-base font-bold text-slate-900">Keynote Speakers (Pembicara Utama)</h3>
                          <p className="text-xs text-slate-500 mt-1">Daftar ilmuwan terkemuka pengisi kelas pleno konferensi.</p>
                        </div>
                        <button 
                          type="button"
                          onClick={() => {
                            const newSpeaker = {
                              name: 'Prof. Dr. New Science Scholar',
                              title: 'Distinguished Researcher in Clean Energy Systems',
                              institution: 'Institute of Sustainable Technologies',
                              imageUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=350&q=80',
                              topicEn: 'Technological Paradigms of Tomorrow: Advanced Microscopic Analysis',
                              topicId: 'Paradigma Teknologi Masa Depan: Eksplorasi Mikroskopik Lanjutan'
                            };
                            setConfig(prev => ({
                              ...prev,
                              keynoteSpeakers: [...prev.keynoteSpeakers, newSpeaker]
                            }));
                          }}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold rounded-lg border border-blue-100 transition-all cursor-pointer"
                        >
                          ➕ Tambah Pembicara
                        </button>
                      </div>

                      {/* SPEAKERS HEADINGS CONFIG SECTION */}
                      <div className="bg-slate-50 border border-slate-200 p-4 sm:p-5 rounded-xl space-y-4">
                        <div className="border-b border-slate-200 pb-2">
                          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <span>📝</span> Pengaturan Judul & Subjudul Seksi Pembicara
                          </h4>
                          <p className="text-[10px] text-slate-500 mt-0.5">Ubah judul kategori dan subjudul yang muncul di seksi pembicara pada halaman utama.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Judul Kategori (English)</label>
                              <input 
                                type="text"
                                value={config.speakersSectionTitleEn || ''}
                                placeholder="Distinguished Keynote Speakers"
                                onChange={e => {
                                  const val = e.target.value;
                                  setConfig(prev => ({ ...prev, speakersSectionTitleEn: val }));
                                }}
                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Judul Kategori (Indonesia)</label>
                              <input 
                                type="text"
                                value={config.speakersSectionTitleId || ''}
                                placeholder="Pembicara Utama (Keynote Speakers)"
                                onChange={e => {
                                  const val = e.target.value;
                                  setConfig(prev => ({ ...prev, speakersSectionTitleId: val }));
                                }}
                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs focus:outline-none"
                              />
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Subjudul Utama (English)</label>
                              <input 
                                type="text"
                                value={config.speakersSectionSubEn || ''}
                                placeholder="Leading Scientists & Keynote Presenters"
                                onChange={e => {
                                  const val = e.target.value;
                                  setConfig(prev => ({ ...prev, speakersSectionSubEn: val }));
                                }}
                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Subjudul Utama (Indonesia)</label>
                              <input 
                                type="text"
                                value={config.speakersSectionSubId || ''}
                                placeholder="Ilmuwan Terkemuka & Presenter Utama"
                                onChange={e => {
                                  const val = e.target.value;
                                  setConfig(prev => ({ ...prev, speakersSectionSubId: val }));
                                }}
                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {config.keynoteSpeakers.map((speaker, idx) => (
                          <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-xl relative space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-bold rounded">PEMBICARA #{idx + 1}</span>
                              <button 
                                type="button"
                                onClick={() => {
                                  setConfig(prev => ({
                                    ...prev,
                                    keynoteSpeakers: prev.keynoteSpeakers.filter((_, sIdx) => sIdx !== idx)
                                  }));
                                }}
                                className="text-red-600 hover:text-red-700 text-[11px] font-bold hover:underline cursor-pointer"
                              >
                                🗑️ Hapus Pembicara
                              </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Speaker Name &amp; Accreditations</label>
                                <input 
                                  type="text"
                                  value={speaker.name}
                                  onChange={e => {
                                    const nextSpeakers = [...config.keynoteSpeakers];
                                    nextSpeakers[idx] = { ...speaker, name: e.target.value };
                                    setConfig(prev => ({ ...prev, keynoteSpeakers: nextSpeakers }));
                                  }}
                                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs focus:outline-none"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Academic Title / Tag</label>
                                <input 
                                  type="text"
                                  value={speaker.title}
                                  onChange={e => {
                                    const nextSpeakers = [...config.keynoteSpeakers];
                                    nextSpeakers[idx] = { ...speaker, title: e.target.value };
                                    setConfig(prev => ({ ...prev, keynoteSpeakers: nextSpeakers }));
                                  }}
                                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs focus:outline-none"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Affiliated Institution</label>
                                <input 
                                  type="text"
                                  value={speaker.institution}
                                  onChange={e => {
                                    const nextSpeakers = [...config.keynoteSpeakers];
                                    nextSpeakers[idx] = { ...speaker, institution: e.target.value };
                                    setConfig(prev => ({ ...prev, keynoteSpeakers: nextSpeakers }));
                                  }}
                                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs focus:outline-none"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Photo Image URL</label>
                                <input 
                                  type="text"
                                  value={speaker.imageUrl}
                                  onChange={e => {
                                    const nextSpeakers = [...config.keynoteSpeakers];
                                    nextSpeakers[idx] = { ...speaker, imageUrl: e.target.value };
                                    setConfig(prev => ({ ...prev, keynoteSpeakers: nextSpeakers }));
                                  }}
                                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs focus:outline-none font-mono"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Keynote Topic (English)</label>
                                <input 
                                  type="text"
                                  value={speaker.topicEn}
                                  onChange={e => {
                                    const nextSpeakers = [...config.keynoteSpeakers];
                                    nextSpeakers[idx] = { ...speaker, topicEn: e.target.value };
                                    setConfig(prev => ({ ...prev, keynoteSpeakers: nextSpeakers }));
                                  }}
                                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs focus:outline-none"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Keynote Topic (Indonesia)</label>
                                <input 
                                  type="text"
                                  value={speaker.topicId}
                                  onChange={e => {
                                    const nextSpeakers = [...config.keynoteSpeakers];
                                    nextSpeakers[idx] = { ...speaker, topicId: e.target.value };
                                    setConfig(prev => ({ ...prev, keynoteSpeakers: nextSpeakers }));
                                  }}
                                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs focus:outline-none"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* FEES CONFIG SUBTAB */}
                  {adminSubTab === 'fees' && (
                    <div className="space-y-6 text-left animate-fadeIn">
                      <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <h3 className="text-base font-bold text-slate-900">💵 Konfigurasi Tarif & Biaya Registrasi</h3>
                          <p className="text-xs text-slate-500 mt-1">Mengatur daftar kategori tarif, teks judul, catatan kaki, dan biaya pendaftaran baik untuk kelompok pemakalah maupun pendengar umum secara dinamis.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddFeeForm(!showAddFeeForm);
                            setNewFeeNameEn('');
                            setNewFeeNameId('');
                            setNewFeeDom('IDR 1.000.000');
                            setNewFeeIntl('USD 100');
                          }}
                          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer max-w-max self-start sm:self-auto"
                        >
                          {showAddFeeForm ? '✕ Batal' : '➕ Tambah Tarif Baru'}
                        </button>
                      </div>

                      {/* SECTION 1: HEADER & FOOTNOTE CUSTOMIZATION */}
                      <div className="p-5 bg-white border border-slate-250 rounded-2xl space-y-4 shadow-3xs">
                        <span className="text-xs font-extrabold text-slate-800 uppercase tracking-widest block border-b border-slate-100 pb-2">🌐 Judul & Catatan Kaki Skema Biaya (Halaman Depan)</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Judul Seksi (Bahasa Indonesia)</label>
                            <input 
                              type="text"
                              value={config.feesTitleId || ''}
                              placeholder="Daftar Ketentuan Skema Biaya"
                              onChange={e => setConfig(prev => ({ ...prev, feesTitleId: e.target.value }))}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Judul Seksi (English)</label>
                            <input 
                              type="text"
                              value={config.feesTitleEn || ''}
                              placeholder="Conference Registration Fees"
                              onChange={e => setConfig(prev => ({ ...prev, feesTitleEn: e.target.value }))}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Catatan Kaki (Bahasa Indonesia)</label>
                            <textarea 
                              rows={2}
                              value={config.feesNoteId || ''}
                              placeholder="Biaya pendaftaran pemakalah sudah mencakup publikasi internasional terindeks jika berstatus lolos."
                              onChange={e => setConfig(prev => ({ ...prev, feesNoteId: e.target.value }))}
                              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-500 focus:bg-white text-slate-850"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Catatan Kaki (English)</label>
                            <textarea 
                              rows={2}
                              value={config.feesNoteEn || ''}
                              placeholder="Oral presenters charge rate covers certified publishing on international index portals upon final draft confirmation."
                              onChange={e => setConfig(prev => ({ ...prev, feesNoteEn: e.target.value }))}
                              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-500 focus:bg-white text-slate-850"
                            />
                          </div>
                        </div>
                      </div>

                      {/* ADD NEW FEE FORM (EXPANDABLE) */}
                      {showAddFeeForm && (
                        <div className="p-5 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-4 animate-fade-in text-left">
                          <span className="font-extrabold text-xs text-indigo-700 tracking-wider uppercase block border-b border-indigo-100 pb-1.5 flex items-center gap-1">
                            <span>✨ Form Tambah Kategori Tarif Baru</span>
                          </span>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Peran Utama (Category Role)</label>
                              <select
                                value={newFeeCategory}
                                onChange={e => setNewFeeCategory(e.target.value as any)}
                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer text-slate-700"
                              >
                                <option value="presenter">Presenter / Pemakalah (Oral)</option>
                                <option value="poster">Presenter Poster (Poster)</option>
                                <option value="attendee">Attendee / Pendengar Umum</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">ID Tarif Unik (Auto-Generated)</label>
                              <input 
                                type="text"
                                disabled
                                value={`fee_custom_${Date.now().toString().slice(-6)}`}
                                className="w-full px-3 py-1.5 bg-slate-100/80 border border-slate-200 rounded-lg text-xs font-semibold font-mono text-slate-400 focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nama Tarif - English (misal: Co-Author Rate)</label>
                              <input 
                                type="text"
                                placeholder="Co-Author Presentation"
                                value={newFeeNameEn}
                                onChange={e => setNewFeeNameEn(e.target.value)}
                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none text-slate-800"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nama Tarif - Indonesia (misal: Tarif Anggota Co-Author)</label>
                              <input 
                                type="text"
                                placeholder="Presentasi Rekan Penulis (Co-Author)"
                                value={newFeeNameId}
                                onChange={e => setNewFeeNameId(e.target.value)}
                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none text-slate-800"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Biaya Domestik (IDR / Rupiah)</label>
                              <input 
                                type="text"
                                placeholder="IDR 1.000.000"
                                value={newFeeDom}
                                onChange={e => setNewFeeDom(e.target.value)}
                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none text-slate-800"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Biaya Internasional (USD Dollars)</label>
                              <input 
                                type="text"
                                placeholder="USD 100"
                                value={newFeeIntl}
                                onChange={e => setNewFeeIntl(e.target.value)}
                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none text-slate-800"
                              />
                            </div>
                          </div>

                          <div className="pt-2 flex justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                if (!newFeeNameEn.trim() || !newFeeNameId.trim()) {
                                  alert('Harap isi Nama Tarif dalam bahasa Inggris dan bahasa Indonesia.');
                                  return;
                                }
                                const currentList = config.registrationFeesList || [
                                  { id: 'pres_early', nameEn: 'Oral Presenter - Early Bird', nameId: 'Pemakalah Oral - Early Bird', category: 'presenter', priceDomestic: 'IDR 1.250.000', priceIntl: 'USD 150' },
                                  { id: 'pres_normal', nameEn: 'Oral Presenter - Normal', nameId: 'Pemakalah Oral - Normal', category: 'presenter', priceDomestic: 'IDR 1.500.000', priceIntl: 'USD 200' },
                                  { id: 'poster_early', nameEn: 'Poster Presenter - Early Bird', nameId: 'Presenter Poster - Early Bird', category: 'poster', priceDomestic: 'IDR 750.000', priceIntl: 'USD 80' },
                                  { id: 'poster_normal', nameEn: 'Poster Presenter - Normal', nameId: 'Presenter Poster - Normal', category: 'poster', priceDomestic: 'IDR 900.000', priceIntl: 'USD 100' },
                                  { id: 'attendee', nameEn: 'General Attendee', nameId: 'Peserta Umum (Non-Pemakalah)', category: 'attendee', priceDomestic: 'IDR 350.000', priceIntl: 'USD 35' }
                                ];
                                const newId = `fee_custom_${Math.random().toString(36).substr(2, 6)}`;
                                const newItem = {
                                  id: newId,
                                  nameEn: newFeeNameEn.trim(),
                                  nameId: newFeeNameId.trim(),
                                  category: newFeeCategory,
                                  priceDomestic: newFeeDom || 'IDR 0',
                                  priceIntl: newFeeIntl || 'USD 0'
                                };
                                const newList = [...currentList, newItem];
                                
                                // Traditional object sync
                                let updatedPresenter = { ...config.registrationFees.presenter };
                                let updatedAttendee = { ...config.registrationFees.attendee };
                                let updatedPoster = config.registrationFees.poster ? { ...config.registrationFees.poster } : {
                                  domesticEarly: "IDR 750.000",
                                  domesticNormal: "IDR 900.000",
                                  intlEarly: "USD 80",
                                  intlNormal: "USD 100"
                                };
                                newList.forEach((item) => {
                                  if (item.id === 'pres_normal') {
                                    updatedPresenter.domesticNormal = item.priceDomestic;
                                    updatedPresenter.intlNormal = item.priceIntl;
                                  } else if (item.id === 'pres_early') {
                                    updatedPresenter.domesticEarly = item.priceDomestic;
                                    updatedPresenter.intlEarly = item.priceIntl;
                                  } else if (item.id === 'poster_normal') {
                                    updatedPoster.domesticNormal = item.priceDomestic;
                                    updatedPoster.intlNormal = item.priceIntl;
                                  } else if (item.id === 'poster_early') {
                                    updatedPoster.domesticEarly = item.priceDomestic;
                                    updatedPoster.intlEarly = item.priceIntl;
                                  } else if (item.id === 'attendee') {
                                    updatedAttendee.domestic = item.priceDomestic;
                                    updatedAttendee.intl = item.priceIntl;
                                  }
                                });

                                setConfig(prev => ({
                                  ...prev,
                                  registrationFees: {
                                    presenter: updatedPresenter,
                                    attendee: updatedAttendee,
                                    poster: updatedPoster
                                  },
                                  registrationFeesList: newList
                                }));

                                setNewFeeNameEn('');
                                setNewFeeNameId('');
                                setShowAddFeeForm(false);
                              }}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                            >
                              ✓ Simpan Tarif & Tambahkan Ke Daftar
                            </button>
                          </div>
                        </div>
                      )}

                      {/* EDIT SECTION MATCHING THE LOOK OF FRONT PAGE DESIGN (Dark Cards with Glow Accents) */}
                      {(() => {
                        const currentList = config.registrationFeesList || [
                          { id: 'pres_early', nameEn: 'Oral Presenter - Early Bird', nameId: 'Pemakalah Oral - Early Bird', category: 'presenter', priceDomestic: 'IDR 1.250.000', priceIntl: 'USD 150' },
                          { id: 'pres_normal', nameEn: 'Oral Presenter - Normal', nameId: 'Pemakalah Oral - Normal', category: 'presenter', priceDomestic: 'IDR 1.500.000', priceIntl: 'USD 200' },
                          { id: 'poster_early', nameEn: 'Poster Presenter - Early Bird', nameId: 'Presenter Poster - Early Bird', category: 'poster', priceDomestic: 'IDR 750.000', priceIntl: 'USD 80' },
                          { id: 'poster_normal', nameEn: 'Poster Presenter - Normal', nameId: 'Presenter Poster - Normal', category: 'poster', priceDomestic: 'IDR 900.000', priceIntl: 'USD 100' },
                          { id: 'attendee', nameEn: 'General Attendee', nameId: 'Peserta Umum (Non-Pemakalah)', category: 'attendee', priceDomestic: 'IDR 350.000', priceIntl: 'USD 35' }
                        ];

                        const handleUpdateItem = (index: number, updatedItem: any) => {
                          const newList = [...currentList];
                          newList[index] = updatedItem;

                          let updatedPresenter = { ...config.registrationFees.presenter };
                          let updatedAttendee = { ...config.registrationFees.attendee };
                          let updatedPoster = config.registrationFees.poster ? { ...config.registrationFees.poster } : {
                            domesticEarly: "IDR 750.000",
                            domesticNormal: "IDR 900.000",
                            intlEarly: "USD 80",
                            intlNormal: "USD 100"
                          };
                          newList.forEach((item) => {
                            if (item.id === 'pres_normal') {
                              updatedPresenter.domesticNormal = item.priceDomestic;
                              updatedPresenter.intlNormal = item.priceIntl;
                            } else if (item.id === 'pres_early') {
                              updatedPresenter.domesticEarly = item.priceDomestic;
                              updatedPresenter.intlEarly = item.priceIntl;
                            } else if (item.id === 'poster_normal') {
                              updatedPoster.domesticNormal = item.priceDomestic;
                              updatedPoster.intlNormal = item.priceIntl;
                            } else if (item.id === 'poster_early') {
                              updatedPoster.domesticEarly = item.priceDomestic;
                              updatedPoster.intlEarly = item.priceIntl;
                            } else if (item.id === 'attendee') {
                              updatedAttendee.domestic = item.priceDomestic;
                              updatedAttendee.intl = item.priceIntl;
                            }
                          });

                          setConfig(prev => ({
                            ...prev,
                            registrationFees: {
                              presenter: updatedPresenter,
                              attendee: updatedAttendee,
                              poster: updatedPoster
                            },
                            registrationFeesList: newList
                          }));
                        };

                        const handleDeleteItem = (itemId: string) => {
                          const newList = currentList.filter(f => f.id !== itemId);

                          let updatedPresenter = { ...config.registrationFees.presenter };
                          let updatedAttendee = { ...config.registrationFees.attendee };
                          let updatedPoster = config.registrationFees.poster ? { ...config.registrationFees.poster } : {
                            domesticEarly: "IDR 750.000",
                            domesticNormal: "IDR 900.000",
                            intlEarly: "USD 80",
                            intlNormal: "USD 100"
                          };
                          newList.forEach((item) => {
                            if (item.id === 'pres_normal') {
                              updatedPresenter.domesticNormal = item.priceDomestic;
                              updatedPresenter.intlNormal = item.priceIntl;
                            } else if (item.id === 'pres_early') {
                              updatedPresenter.domesticEarly = item.priceDomestic;
                              updatedPresenter.intlEarly = item.priceIntl;
                            } else if (item.id === 'poster_normal') {
                              updatedPoster.domesticNormal = item.priceDomestic;
                              updatedPoster.intlNormal = item.priceIntl;
                            } else if (item.id === 'poster_early') {
                              updatedPoster.domesticEarly = item.priceDomestic;
                              updatedPoster.intlEarly = item.priceIntl;
                            } else if (item.id === 'attendee') {
                              updatedAttendee.domestic = item.priceDomestic;
                              updatedAttendee.intl = item.priceIntl;
                            }
                          });

                          setConfig(prev => ({
                            ...prev,
                            registrationFees: {
                              presenter: updatedPresenter,
                              attendee: updatedAttendee,
                              poster: updatedPoster
                            },
                            registrationFeesList: newList
                          }));
                        };

                        const presenters = currentList.map((item, index) => ({ item, originalIdx: index })).filter(x => x.item.category === 'presenter');
                        const posters = currentList.map((item, index) => ({ item, originalIdx: index })).filter(x => x.item.category === 'poster');
                        const attendees = currentList.map((item, index) => ({ item, originalIdx: index })).filter(x => x.item.category === 'attendee');

                        return (
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            
                            {/* PRESENTER CATEGORY CARD (MATCHING THE FRONT PAGE DARK/INDIGO LOOK) */}
                            <div className="p-6 bg-slate-950 border border-slate-800 rounded-2xl relative overflow-hidden text-white flex flex-col justify-between shadow-xl">
                              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
                              <div className="space-y-4">
                                <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="p-1.5 bg-indigo-500/15 text-indigo-400 rounded-lg border border-indigo-500/20">
                                      <Award className="w-4 h-4" />
                                    </span>
                                    <div>
                                      <span className="text-xs font-black text-indigo-400 uppercase tracking-widest block font-sans">Kategori Pemakalah / Presenters</span>
                                      <span className="text-[10px] text-slate-400 font-sans">Mengatur biaya penulisan & presentasi naskah di web</span>
                                    </div>
                                  </div>
                                  <span className="text-[10px] bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-black px-2 py-0.5 rounded-full tracking-wider uppercase font-sans">
                                    {presenters.length} Item
                                  </span>
                                </div>

                                {presenters.length === 0 ? (
                                  <p className="text-xs text-slate-500 italic py-8 text-center">Belum ada item tarif pemakalah.</p>
                                ) : (
                                  <div className="space-y-3.5">
                                    {presenters.map(({ item, originalIdx }) => (
                                      <div key={item.id} className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-3 relative group transition hover:border-slate-700">
                                        <div className="flex items-center justify-between font-sans">
                                          <span className="text-[9px] font-mono text-indigo-400 font-extrabold uppercase">ID: {item.id}</span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (confirm(`Apakah Anda yakin ingin menghapus kategori tarif "${item.nameId}"?`)) {
                                                handleDeleteItem(item.id);
                                              }
                                            }}
                                            className="text-red-400 hover:text-red-300 text-[10px] font-bold flex items-center gap-0.5"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            <span>Hapus</span>
                                          </button>
                                        </div>

                                        <div className="space-y-2">
                                          <div>
                                            <label className="block text-[8px] font-black text-slate-400 uppercase mb-1 tracking-widest">NAMA TARIF (BAHASA INDONESIA) *</label>
                                            <input 
                                              type="text"
                                              value={item.nameId}
                                              onChange={e => handleUpdateItem(originalIdx, { ...item, nameId: e.target.value })}
                                              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800/80 rounded-lg text-white text-xs font-semibold focus:outline-none focus:border-indigo-500 font-sans"
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-[8px] font-black text-slate-400 uppercase mb-1 tracking-widest">NAMA TARIF (ENGLISH) *</label>
                                            <input 
                                              type="text"
                                              value={item.nameEn}
                                              onChange={e => handleUpdateItem(originalIdx, { ...item, nameEn: e.target.value })}
                                              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800/80 rounded-lg text-white text-xs font-semibold focus:outline-none focus:border-indigo-500 font-sans"
                                            />
                                          </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 pt-1">
                                          <div>
                                            <label className="block text-[8px] font-black text-slate-400 uppercase mb-1 tracking-widest">Nominal Domestik</label>
                                            <input 
                                              type="text"
                                              value={item.priceDomestic}
                                              onChange={e => handleUpdateItem(originalIdx, { ...item, priceDomestic: e.target.value })}
                                              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800/80 rounded-lg text-yellow-500 text-xs font-extrabold font-mono focus:outline-none focus:border-indigo-500 text-center"
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-[8px] font-black text-slate-400 uppercase mb-1 tracking-widest">Nominal Internasional</label>
                                            <input 
                                              type="text"
                                              value={item.priceIntl}
                                              onChange={e => handleUpdateItem(originalIdx, { ...item, priceIntl: e.target.value })}
                                              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800/80 rounded-lg text-indigo-300 text-xs font-extrabold font-mono focus:outline-none focus:border-indigo-500 text-center"
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* POSTER CATEGORY CARD (MATCHING THE FRONT PAGE DARK/AMBER LOOK) */}
                            <div className="p-6 bg-slate-950 border border-slate-800 rounded-2xl relative overflow-hidden text-white flex flex-col justify-between shadow-xl">
                              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>
                              <div className="space-y-4">
                                <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="p-1.5 bg-amber-500/15 text-amber-400 rounded-lg border border-amber-500/20">
                                      <Image className="w-4 h-4" />
                                    </span>
                                    <div>
                                      <span className="text-xs font-black text-amber-400 uppercase tracking-widest block font-sans">Kategori Poster / Posters</span>
                                      <span className="text-[10px] text-slate-400 font-sans">Mengatur biaya penulisan & presentasi poster di web</span>
                                    </div>
                                  </div>
                                  <span className="text-[10px] bg-amber-500/20 border border-amber-500/30 text-amber-300 font-black px-2 py-0.5 rounded-full tracking-wider uppercase font-sans">
                                    {posters.length} Item
                                  </span>
                                </div>

                                {posters.length === 0 ? (
                                  <p className="text-xs text-slate-500 italic py-8 text-center">Belum ada item tarif poster.</p>
                                ) : (
                                  <div className="space-y-3.5">
                                    {posters.map(({ item, originalIdx }) => (
                                      <div key={item.id} className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-3 relative group transition hover:border-slate-700">
                                        <div className="flex items-center justify-between font-sans">
                                          <span className="text-[9px] font-mono text-amber-400 font-extrabold uppercase">ID: {item.id}</span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (confirm(`Apakah Anda yakin ingin menghapus kategori tarif "${item.nameId}"?`)) {
                                                handleDeleteItem(item.id);
                                              }
                                            }}
                                            className="text-red-400 hover:text-red-300 text-[10px] font-bold flex items-center gap-0.5"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            <span>Hapus</span>
                                          </button>
                                        </div>

                                        <div className="space-y-2">
                                          <div>
                                            <label className="block text-[8px] font-black text-slate-400 uppercase mb-1 tracking-widest">NAMA TARIF (BAHASA INDONESIA) *</label>
                                            <input 
                                              type="text"
                                              value={item.nameId}
                                              onChange={e => handleUpdateItem(originalIdx, { ...item, nameId: e.target.value })}
                                              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800/80 rounded-lg text-white text-xs font-semibold focus:outline-none focus:border-amber-500 font-sans"
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-[8px] font-black text-slate-400 uppercase mb-1 tracking-widest">NAMA TARIF (ENGLISH) *</label>
                                            <input 
                                              type="text"
                                              value={item.nameEn}
                                              onChange={e => handleUpdateItem(originalIdx, { ...item, nameEn: e.target.value })}
                                              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800/80 rounded-lg text-white text-xs font-semibold focus:outline-none focus:border-amber-500 font-sans"
                                            />
                                          </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 pt-1">
                                          <div>
                                            <label className="block text-[8px] font-black text-slate-400 uppercase mb-1 tracking-widest">Nominal Domestik</label>
                                            <input 
                                              type="text"
                                              value={item.priceDomestic}
                                              onChange={e => handleUpdateItem(originalIdx, { ...item, priceDomestic: e.target.value })}
                                              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800/80 rounded-lg text-yellow-500 text-xs font-extrabold font-mono focus:outline-none focus:border-amber-500 text-center"
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-[8px] font-black text-slate-400 uppercase mb-1 tracking-widest">Nominal Internasional</label>
                                            <input 
                                              type="text"
                                              value={item.priceIntl}
                                              onChange={e => handleUpdateItem(originalIdx, { ...item, priceIntl: e.target.value })}
                                              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800/80 rounded-lg text-amber-300 text-xs font-extrabold font-mono focus:outline-none focus:border-amber-500 text-center"
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* ATTENDEE CATEGORY CARD (MATCHING THE FRONT PAGE DARK/EMERALD LOOK) */}
                            <div className="p-6 bg-slate-950 border border-slate-800 rounded-2xl relative overflow-hidden text-white flex flex-col justify-between shadow-xl">
                              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
                              <div className="space-y-4">
                                <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="p-1.5 bg-emerald-500/15 text-emerald-400 rounded-lg border border-emerald-500/20">
                                      <Globe className="w-4 h-4" />
                                    </span>
                                    <div>
                                      <span className="text-xs font-black text-emerald-400 uppercase tracking-widest block font-sans">Kategori Pendengar / Attendees</span>
                                      <span className="text-[10px] text-slate-400 font-sans">Mengatur biaya delegasi umum atau non-presenter di web</span>
                                    </div>
                                  </div>
                                  <span className="text-[10px] bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-black px-2 py-0.5 rounded-full tracking-wider uppercase font-sans">
                                    {attendees.length} Item
                                  </span>
                                </div>

                                {attendees.length === 0 ? (
                                  <p className="text-xs text-slate-500 italic py-8 text-center">Belum ada item tarif pendengar.</p>
                                ) : (
                                  <div className="space-y-3.5">
                                    {attendees.map(({ item, originalIdx }) => (
                                      <div key={item.id} className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-3 relative group transition hover:border-slate-700">
                                        <div className="flex items-center justify-between font-sans">
                                          <span className="text-[9px] font-mono text-emerald-400 font-extrabold uppercase">ID: {item.id}</span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (confirm(`Apakah Anda yakin ingin menghapus kategori tarif "${item.nameId}"?`)) {
                                                handleDeleteItem(item.id);
                                              }
                                            }}
                                            className="text-red-400 hover:text-red-300 text-[10px] font-bold flex items-center gap-0.5"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            <span>Hapus</span>
                                          </button>
                                        </div>

                                        <div className="space-y-2">
                                          <div>
                                            <label className="block text-[8px] font-black text-slate-400 uppercase mb-1 tracking-widest">NAMA TARIF (BAHASA INDONESIA) *</label>
                                            <input 
                                              type="text"
                                              value={item.nameId}
                                              onChange={e => handleUpdateItem(originalIdx, { ...item, nameId: e.target.value })}
                                              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800/80 rounded-lg text-white text-xs font-semibold focus:outline-none focus:border-emerald-500 font-sans"
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-[8px] font-black text-slate-400 uppercase mb-1 tracking-widest">NAMA TARIF (ENGLISH) *</label>
                                            <input 
                                              type="text"
                                              value={item.nameEn}
                                              onChange={e => handleUpdateItem(originalIdx, { ...item, nameEn: e.target.value })}
                                              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800/80 rounded-lg text-white text-xs font-semibold focus:outline-none focus:border-emerald-500 font-sans"
                                            />
                                          </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 pt-1">
                                          <div>
                                            <label className="block text-[8px] font-black text-slate-400 uppercase mb-1 tracking-widest">Nominal Domestik</label>
                                            <input 
                                              type="text"
                                              value={item.priceDomestic}
                                              onChange={e => handleUpdateItem(originalIdx, { ...item, priceDomestic: e.target.value })}
                                              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800/80 rounded-lg text-yellow-500 text-xs font-extrabold font-mono focus:outline-none focus:border-emerald-500 text-center"
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-[8px] font-black text-slate-400 uppercase mb-1 tracking-widest">Nominal Internasional</label>
                                            <input 
                                              type="text"
                                              value={item.priceIntl}
                                              onChange={e => handleUpdateItem(originalIdx, { ...item, priceIntl: e.target.value })}
                                              className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800/80 rounded-lg text-emerald-300 text-xs font-extrabold font-mono focus:outline-none focus:border-emerald-500 text-center"
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                          </div>
                        );
                      })()}

                      {/* ACTION BUTTONS */}
                      <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => handleSaveConfig(config)}
                          disabled={adminSaving}
                          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all border border-blue-700 flex items-center gap-2 cursor-pointer font-sans"
                        >
                          {adminSaving ? 'Menyimpan...' : '💾 Simpan Perubahan Biaya & Tarif'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* COUNTDOWN CONFIG SUBTAB */}
                  {adminSubTab === 'countdown' && (
                    <div className="space-y-6 text-left">
                      <div className="border-b border-slate-100 pb-4">
                        <h3 className="text-base font-bold text-slate-900">Konfigurasi Penghitung Mundur (Countdown Timer)</h3>
                        <p className="text-xs text-slate-500 mt-1">
                          Aktifkan hitung mundur waktu di halaman utama web (landing page) untuk memberikan kesan kesiapan acara yang matang bagi calon peserta dsb.
                        </p>
                      </div>

                      <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                        {/* Enable Option */}
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Status Pengaktifan Hitung Mundur</span>
                            <span className="text-[10px] text-slate-400 font-medium">Bila diaktifkan, modul waktu mundur akan otomatis muncul di bagian Hero / Atas halaman utama.</span>
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={() => {
                                setConfig(prev => ({
                                  ...prev,
                                  countdownEnabled: !prev.countdownEnabled
                                }));
                              }}
                              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                config.countdownEnabled ? 'bg-blue-600' : 'bg-slate-300'
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                  config.countdownEnabled ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>
                        </div>

                        <div className="h-px bg-slate-200/80 my-3"></div>

                        {/* Config elements */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-650 uppercase tracking-wider mb-1">Tanggal &amp; Waktu Target (WIB/Local)</label>
                            <input 
                              type="datetime-local"
                              value={config.countdownTarget ? config.countdownTarget.slice(0, 16) : '2026-08-25T09:00'}
                              onChange={e => {
                                const val = e.target.value; // "YYYY-MM-DDTHH:MM"
                                setConfig(prev => ({
                                  ...prev,
                                  countdownTarget: val
                                }));
                              }}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-500 text-slate-800"
                            />
                            <span className="text-[10px] text-slate-450 mt-1 block">Tentukan tanggal dan waktu mulainya kegiatan atau batas akhir target Anda.</span>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-650 uppercase tracking-wider mb-1">Format Tanggal Mentah (Alternatif / Manual)</label>
                            <input 
                              type="text"
                              placeholder="2026-08-25T09:00:00"
                              value={config.countdownTarget || ''}
                              onChange={e => {
                                const val = e.target.value;
                                setConfig(prev => ({
                                  ...prev,
                                  countdownTarget: val
                                }));
                              }}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-blue-500 text-slate-800"
                            />
                            <span className="text-[10px] text-slate-450 mt-1 block">Gunakan ISO string lengkap jika ingin akurasi timezone, contoh: <code className="bg-slate-100 px-1 rounded font-normal">2026-08-25T09:00:00</code>.</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-650 uppercase tracking-wider mb-1">Label Hitung Mundur - Bahasa Indonesia</label>
                            <input 
                              type="text"
                              value={config.countdownLabelId || ''}
                              onChange={e => {
                                const val = e.target.value;
                                setConfig(prev => ({
                                  ...prev,
                                  countdownLabelId: val
                                }));
                              }}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-500 text-slate-800"
                              placeholder="Hari menjelang IBEC 2026"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-650 uppercase tracking-wider mb-1">Label Hitung Mundur - English</label>
                            <input 
                              type="text"
                              value={config.countdownLabelEn || ''}
                              onChange={e => {
                                const val = e.target.value;
                                setConfig(prev => ({
                                  ...prev,
                                  countdownLabelEn: val
                                }));
                              }}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-500 text-slate-800"
                              placeholder="Days until IBEC 2026 starts"
                            />
                          </div>
                        </div>
                      </div>

                      {/* LIVE PREVIEW BOX */}
                      <div className="p-6 bg-slate-900 text-white rounded-2xl space-y-4 shadow-md">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <span className="text-xs font-bold text-indigo-400 tracking-wider uppercase block">👀 Tampilan Live Preview</span>
                          <span className="font-mono text-[9px] text-slate-500">Status: {config.countdownEnabled ? 'AKTIF (Tampil)' : 'TIDAK AKTIF (Sembunyi)'}</span>
                        </div>

                        {config.countdownEnabled ? (
                          <div className="py-4 flex flex-col items-center">
                            <p className="text-indigo-200 font-semibold tracking-wide text-xs mb-3 font-sans text-center">
                              {lang === 'id' ? config.countdownLabelId : config.countdownLabelEn}
                            </p>
                            
                            <CountdownDisplay targetDate={config.countdownTarget || '2026-08-25T09:00:00'} lang={lang} />
                          </div>
                        ) : (
                          <p className="text-slate-400 text-xs italic text-center py-6">
                            Modul dinonaktifkan. Pengunjung tidak akan melihat hitung mundur di halaman muka.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* RUNNING LOGOS CONFIG SUBTAB */}
                  {adminSubTab === 'running_logos' && (
                    <div className="space-y-6 text-left">
                      <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-left">
                        <div>
                          <h3 className="text-base font-bold text-slate-900">Konfigurasi Logo Berjalan (Partner & Sponsor Ticker)</h3>
                          <p className="text-xs text-slate-500 mt-1">Mengatur daftar logo sponsor, penerbit indeksasi, atau universitas mitra yang tampil secara berjalan di halaman depan.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddLogoForm(!showAddLogoForm);
                            setNewLogoName('');
                            setNewLogoUrl('');
                            setNewLogoLink('');
                          }}
                          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer max-w-max self-start sm:self-auto"
                        >
                          {showAddLogoForm ? '✕ Batal' : '➕ Tambah Logo Baru'}
                        </button>
                      </div>

                      {/* ADD NEW LOGO FORM */}
                      {showAddLogoForm && (
                        <div className="p-5 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-4 animate-fade-in text-left">
                          <span className="font-extrabold text-[11px] text-indigo-700 tracking-wider uppercase block border-b border-indigo-100 pb-1.5 flex items-center gap-1">
                            <span>✨ Form Tambah Logo Berjalan Baru</span>
                          </span>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nama Organisasi / Partner *</label>
                              <input 
                                type="text"
                                placeholder="misal: Universitas Gadjah Mada"
                                value={newLogoName}
                                onChange={e => setNewLogoName(e.target.value)}
                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none text-slate-800"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Website Link Partner (Opsional)</label>
                              <input 
                                type="text"
                                placeholder="https://ugm.ac.id"
                                value={newLogoLink}
                                onChange={e => setNewLogoLink(e.target.value)}
                                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none text-slate-800"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">URL Cover / Gambar Logo *</label>
                            <input 
                              type="text"
                              placeholder="https://example.com/logo.png"
                              value={newLogoUrl}
                              onChange={e => setNewLogoUrl(e.target.value)}
                              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:outline-none text-slate-850"
                            />
                            <p className="text-[10px] text-slate-450 mt-1">Harus berupa tautan gambar atau ikon berlatar belakang transparan (PNG/SVG) demi estetika visual yang baik.</p>
                          </div>

                          {/* PRESETS BUTTONS FOR EASY SELECTION */}
                          <div className="space-y-1.5">
                            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">💡 Presets Logo Cepat (Klik untuk memilih):</span>
                            <div className="flex flex-wrap gap-2">
                              {[
                                { name: "Google Cloud", url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Google_Cloud_logo.svg/512px-Google_Cloud_logo.svg.png", link: "https://cloud.google.com" },
                                { name: "IEEE", url: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/IEEE_logo.svg/512px-IEEE_logo.svg.png", link: "https://www.ieee.org" },
                                { name: "Springer", url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Springer_Nature_logo.svg/512px-Springer_Nature_logo.svg.png", link: "https://www.springer.com" },
                                { name: "Scopus", url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Scopus_logo.svg/2560px-Scopus_logo.svg.png", link: "https://www.scopus.com" },
                                { name: "BRIN", url: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Logo_BRIN.svg/512px-Logo_BRIN.svg.png", link: "https://www.brin.go.id" },
                                { name: "UI (Univ. Indonesia)", url: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Logo_Universitas_Indonesia.svg/512px-Logo_Universitas_Indonesia.svg.png", link: "https://ui.ac.id" },
                                { name: "UGM (Univ. Gadjah Mada)", url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Logo_UGM_dua_warna.svg/512px-Logo_UGM_dua_warna.svg.png", link: "https://ugm.ac.id" },
                                { name: "ITB", url: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Logo_Institut_Teknologi_Bandung.svg/512px-Logo_Institut_Teknologi_Bandung.svg.png", link: "https://itb.ac.id" }
                              ].map((pref, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => {
                                    setNewLogoName(pref.name);
                                    setNewLogoUrl(pref.url);
                                    setNewLogoLink(pref.link);
                                  }}
                                  className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 hover:border-slate-350 text-[10px] text-slate-700 font-bold rounded-lg transition-all cursor-pointer shadow-3xs"
                                >
                                  🎯 {pref.name}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="pt-2 flex justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                if (!newLogoName.trim()) {
                                  alert('Harap isi Nama Organisasi / Partner.');
                                  return;
                                }
                                const currentList = config.runningLogos || [];
                                const newId = `logo_custom_${Math.random().toString(36).substr(2, 6)}`;
                                const newItem = {
                                  id: newId,
                                  name: newLogoName.trim(),
                                  logoUrl: newLogoUrl.trim(),
                                  linkUrl: newLogoLink.trim()
                                };
                                const newList = [...currentList, newItem];

                                setConfig(prev => ({
                                  ...prev,
                                  runningLogos: newList
                                }));

                                setNewLogoName('');
                                setNewLogoUrl('');
                                setNewLogoLink('');
                                setShowAddLogoForm(false);
                              }}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                            >
                              ✓ Simpan Logo & Tambahkan Ke Daftar
                            </button>
                          </div>
                        </div>
                      )}

                      {/* CURRENT LIST OF LOGOS */}
                      <div className="space-y-4">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block text-left">Daftar Logo Berjalan Saat Ini</span>

                        {(() => {
                          const currentList = config.runningLogos || [
                            { id: "logo_google", name: "Google Cloud", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Google_Cloud_logo.svg/512px-Google_Cloud_logo.svg.png", linkUrl: "https://cloud.google.com" },
                            { id: "logo_ieee", name: "IEEE", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/IEEE_logo.svg/512px-IEEE_logo.svg.png", linkUrl: "https://www.ieee.org" },
                            { id: "logo_springer", name: "Springer Nature", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Springer_Nature_logo.svg/512px-Springer_Nature_logo.svg.png", linkUrl: "https://www.springernature.com" },
                            { id: "logo_scopus", name: "Scopus", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Scopus_logo.svg/2560px-Scopus_logo.svg.png", linkUrl: "https://www.scopus.com" },
                            { id: "logo_brin", name: "BRIN", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Logo_BRIN.svg/512px-Logo_BRIN.svg.png", linkUrl: "https://www.brin.go.id" }
                          ];

                          const handleUpdateLogoItem = (index: number, updatedItem: any) => {
                            const newList = [...currentList];
                            newList[index] = updatedItem;
                            setConfig(prev => ({
                              ...prev,
                              runningLogos: newList
                            }));
                          };

                          const handleDeleteLogoItem = (itemId: string) => {
                            const newList = currentList.filter(f => f.id !== itemId);
                            setConfig(prev => ({
                              ...prev,
                              runningLogos: newList
                            }));
                          };

                          if (currentList.length === 0) {
                            return (
                              <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                                <p className="text-slate-400 text-xs italic">Belum ada logo terdaftar. Klik "+ Tambah Logo Baru" untuk menambahkan.</p>
                              </div>
                            );
                          }

                          return (
                            <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-3xs text-left">
                              <table className="w-full text-left border-collapse text-xs min-w-[650px]">
                                <thead>
                                  <tr className="bg-slate-50 text-slate-400 uppercase tracking-widest text-[9px] font-bold border-b border-slate-200">
                                    <th className="p-4 text-slate-500 w-24">Pratinjau</th>
                                    <th className="p-4 text-slate-500">Nama Partner &amp; Tautan</th>
                                    <th className="p-4 text-slate-500">URL Gambar Gambar Logo (PNG/SVG)</th>
                                    <th className="p-4 text-center text-slate-500 w-28">Aksi</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                  {currentList.map((item, index) => {
                                    return (
                                      <tr key={item.id} className="hover:bg-slate-50/50 transition-all">
                                        <td className="p-4">
                                          <div className="w-14 h-12 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center p-1.5 overflow-hidden">
                                            {item.logoUrl ? (
                                              <img 
                                                src={item.logoUrl} 
                                                alt={item.name} 
                                                referrerPolicy="no-referrer"
                                                className="max-h-full max-w-full object-contain"
                                                onError={(e) => {
                                                  (e.target as HTMLElement).style.display = 'none';
                                                }}
                                              />
                                            ) : (
                                              <span className="font-sans text-[8px] text-slate-400 text-center font-bold">No Image</span>
                                            )}
                                          </div>
                                        </td>

                                        <td className="p-4 space-y-2 min-w-[200px]">
                                          <div>
                                            <span className="text-[8px] text-slate-400 block font-bold mb-0.5">NAMA PARTNER / LOGO *</span>
                                            <input 
                                              type="text"
                                              value={item.name}
                                              onChange={e => handleUpdateLogoItem(index, { ...item, name: e.target.value })}
                                              className="px-2 py-1 bg-white border border-slate-200 rounded-md text-slate-800 text-[11px] font-semibold focus:outline-none w-full"
                                            />
                                          </div>
                                          <div>
                                            <span className="text-[8px] text-slate-400 block font-bold mb-0.5">LINK WEBSITE (OPSIONAL)</span>
                                            <input 
                                              type="text"
                                              value={item.linkUrl || ''}
                                              placeholder="https://"
                                              onChange={e => handleUpdateLogoItem(index, { ...item, linkUrl: e.target.value })}
                                              className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-slate-800 text-[10px] font-sans focus:outline-none w-full"
                                            />
                                          </div>
                                        </td>

                                        <td className="p-4">
                                          <span className="text-[8px] text-slate-400 block font-bold mb-1">URL GAMBAR LOGO</span>
                                          <textarea 
                                            rows={2}
                                            value={item.logoUrl}
                                            onChange={e => handleUpdateLogoItem(index, { ...item, logoUrl: e.target.value })}
                                            className="px-2 py-1 bg-white border border-slate-200 rounded-md text-slate-800 font-mono text-[10px] focus:outline-none w-full leading-relaxed resize-none"
                                          />
                                        </td>

                                        <td className="p-4 text-center whitespace-nowrap">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (confirm(`Apakah Anda yakin ingin menghapus logo "${item.name}"?`)) {
                                                handleDeleteLogoItem(item.id);
                                              }
                                            }}
                                            className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 rounded-lg cursor-pointer transition-all inline-flex items-center gap-1 font-bold text-[10px]"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            <span>Hapus</span>
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          );
                        })()}
                      </div>

                      {/* LIVE DEMO OF ROTATING BAND INSIDE ADMIN */}
                      <div className="p-6 bg-slate-900 text-white rounded-2xl space-y-4 shadow-md overflow-hidden relative">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <span className="text-xs font-bold text-indigo-400 tracking-wider uppercase block">👀 Pratinjau Tampilan Berjalan Sekarang</span>
                          <span className="font-mono text-[9px] text-slate-500">Live Simulation</span>
                        </div>

                        <div className="py-2 overflow-hidden relative bg-slate-950/40 rounded-xl max-w-full">
                          <div className="logo-ticker-track gap-8 flex items-center py-2">
                            {((config.runningLogos && config.runningLogos.length > 0) ? [...config.runningLogos, ...config.runningLogos, ...config.runningLogos] : [
                              { id: "1", name: "Google Cloud", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Google_Cloud_logo.svg/512px-Google_Cloud_logo.svg.png" },
                              { id: "2", name: "IEEE", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/IEEE_logo.svg/512px-IEEE_logo.svg.png" },
                              { id: "3", name: "Springer Nature", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Springer_Nature_logo.svg/512px-Springer_Nature_logo.svg.png" }
                            ].flatMap(x => [x, x, x])).map((item, index) => (
                              <div 
                                key={index}
                                className="flex items-center gap-3 px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl min-w-[170px] max-w-max h-12 shrink-0 justify-center"
                              >
                                {item.logoUrl ? (
                                  <img 
                                    src={item.logoUrl} 
                                    alt={item.name} 
                                    referrerPolicy="no-referrer"
                                    className="max-h-6 max-w-[80px] object-contain brightness-110 filter"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                ) : null}
                                <span className="font-sans font-bold text-[10px] text-slate-100 whitespace-nowrap">
                                  {item.name}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                    </div>
                  )}

                  {/* FOOTER CONFIG SUBTAB */}
                  {adminSubTab === 'footer' && (
                    <div className="space-y-6 text-left">
                      <div className="border-b border-slate-100 pb-4">
                        <h3 className="text-base font-bold text-slate-900">Konfigurasi Tata Letak Footer (Halaman Kaki)</h3>
                        <p className="text-xs text-slate-500 mt-1">
                          Edit teks deskripsi, kontak sekretariat, informasi lokasi, alamat surat elektronik, nomor bantuan telepon, dan keterangan hak cipta (copyright) yang akan diperbarui secara instan pada bagian bawah website.
                        </p>
                      </div>

                      {/* SECTION 1: BRANDING & DESKRIPSI */}
                      <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                        <div className="flex items-center gap-1.5 border-b border-slate-200/60 pb-2">
                          <span className="p-1 bg-blue-150 text-blue-700 rounded-lg">
                            <Sparkles className="w-3.5 h-3.5" />
                          </span>
                          <span className="text-xs font-extrabold text-slate-800 uppercase tracking-widest">Deskripsi Slogan Hub &amp; Media</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-650 uppercase tracking-wider mb-1">Deskripsi Singkat (English)</label>
                            <textarea 
                              rows={3}
                              value={config.footerDescriptionEn || ''}
                              onChange={e => setConfig(prev => ({ ...prev, footerDescriptionEn: e.target.value }))}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-500 text-slate-800 leading-relaxed resize-none"
                              placeholder="misal: The 1st International Conference on Advanced Science, Engineering and Sustainable Technology..."
                            />
                            <span className="text-[10px] text-slate-450 mt-1 block">Teks singkat penjelasan acara yang muncul di bawah logo footer dalam Bahasa Inggris.</span>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-650 uppercase tracking-wider mb-1">Deskripsi Singkat (Bahasa Indonesia)</label>
                            <textarea 
                              rows={3}
                              value={config.footerDescriptionId || ''}
                              onChange={e => setConfig(prev => ({ ...prev, footerDescriptionId: e.target.value }))}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-500 text-slate-800 leading-relaxed resize-none"
                              placeholder="misal: Konferensi Internasional pertama mengenai Sains Lanjutan, Rekayasa, dan Teknologi Berkelanjutan..."
                            />
                            <span className="text-[10px] text-slate-450 mt-1 block">Teks singkat penjelasan acara yang muncul di bawah logo footer dalam Bahasa Indonesia.</span>
                          </div>
                        </div>
                      </div>

                      {/* SECTION 2: SECRETARIAT & KONTAK */}
                      <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                        <div className="flex items-center gap-1.5 border-b border-slate-200/60 pb-2">
                          <span className="p-1 bg-indigo-150 text-indigo-700 rounded-lg">
                            <Mail className="w-3.5 h-3.5" />
                          </span>
                          <span className="text-xs font-extrabold text-slate-800 uppercase tracking-widest">Informasi Sekretariat &amp; Kontak Bantuan</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-650 uppercase tracking-wider mb-1">Nama Sekretariat (English)</label>
                            <input 
                              type="text"
                              value={config.footerSecretariatEn || ''}
                              onChange={e => setConfig(prev => ({ ...prev, footerSecretariatEn: e.target.value }))}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-500 text-slate-800"
                              placeholder="Faculty of Engineering & Science Program Committee..."
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-650 uppercase tracking-wider mb-1">Nama Sekretariat (Bahasa Indonesia)</label>
                            <input 
                              type="text"
                              value={config.footerSecretariatId || ''}
                              onChange={e => setConfig(prev => ({ ...prev, footerSecretariatId: e.target.value }))}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-500 text-slate-800"
                              placeholder="Fakultas Teknik & Ilmu Pengetahuan Komite Program..."
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-650 uppercase tracking-wider mb-1">Surat Elektronik (Email)</label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                              <input 
                                type="email"
                                value={config.footerEmail || ''}
                                onChange={e => setConfig(prev => ({ ...prev, footerEmail: e.target.value }))}
                                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-500 text-slate-800"
                                placeholder="ibec2026@eka-prasetya.ac.id"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-650 uppercase tracking-wider mb-1">Nomor Telepon Hotline / WhatsApp</label>
                            <div className="relative">
                              <Phone className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                              <input 
                                type="text"
                                value={config.footerPhone || ''}
                                onChange={e => setConfig(prev => ({ ...prev, footerPhone: e.target.value }))}
                                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-500 text-slate-800"
                                placeholder="+62-821-4928-1192"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-650 uppercase tracking-wider mb-1">Alamat Kantor / Kota</label>
                            <div className="relative">
                              <MapPin className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                              <input 
                                type="text"
                                value={config.footerAddress || ''}
                                onChange={e => setConfig(prev => ({ ...prev, footerAddress: e.target.value }))}
                                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-500 text-slate-800"
                                placeholder="Medan, North Sumatera, Indonesia"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* SECTION 3: COPYRIGHT */}
                      <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                        <div className="flex items-center gap-1.5 border-b border-slate-200/60 pb-2">
                          <span className="p-1 bg-slate-200 text-slate-700 rounded-lg">
                            <span className="text-[10px] font-bold px-0.5">&copy;</span>
                          </span>
                          <span className="text-xs font-extrabold text-slate-800 uppercase tracking-widest">Keterangan Hak Cipta (Copyright)</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-650 uppercase tracking-wider mb-1">Catatan Hak Cipta (English)</label>
                            <input 
                              type="text"
                              value={config.footerCopyrightEn || ''}
                              onChange={e => setConfig(prev => ({ ...prev, footerCopyrightEn: e.target.value }))}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-500 text-slate-800"
                              placeholder="© 2026 IBEC International Scientific Steering Committee. All rights reserved."
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-650 uppercase tracking-wider mb-1">Catatan Hak Cipta (Bahasa Indonesia)</label>
                            <input 
                              type="text"
                              value={config.footerCopyrightId || ''}
                              onChange={e => setConfig(prev => ({ ...prev, footerCopyrightId: e.target.value }))}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-500 text-slate-800"
                              placeholder="© 2026 Komite Pengarah Ilmiah Internasional IBEC. Hak Cipta Dilindungi Undang-Undang."
                            />
                          </div>
                        </div>
                      </div>

                      {/* LIVE PREVIEW OF FOOTER ZONE */}
                      <div className="p-6 bg-slate-900 text-slate-400 rounded-2xl space-y-4 shadow-md overflow-hidden relative border border-slate-800">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <span className="text-xs font-bold text-indigo-400 tracking-wider uppercase block">👀 Tampilan Live Footer Bagian Bawah</span>
                          <span className="font-mono text-[9px] text-slate-500">Pratinjau Bahasa: {lang === 'id' ? '🇮🇩 Indonesia' : '🇬🇧 English'}</span>
                        </div>

                        <div className="py-4 space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                            <div className="space-y-2">
                              <span className="font-extrabold text-white text-md tracking-tight block">{config.logoText || 'IBEC 2026'} Hub</span>
                              <p className="text-[11px] text-slate-400 leading-relaxed max-w-sm">
                                {lang === 'id' ? config.footerDescriptionId : config.footerDescriptionEn}
                              </p>
                            </div>

                            <div className="space-y-2">
                              <span className="font-extrabold text-slate-300 text-xs uppercase tracking-wider block">Secretariat Office</span>
                              <p className="text-[11px] text-slate-400 leading-relaxed">
                                {lang === 'id' ? config.footerSecretariatId : config.footerSecretariatEn}
                              </p>
                              <div className="text-[10px] space-y-1 font-mono">
                                {config.footerEmail && (
                                  <div className="flex items-center gap-1 text-slate-300">
                                    <Mail className="w-3 h-3 text-slate-400" />
                                    <span>{config.footerEmail}</span>
                                  </div>
                                )}
                                {config.footerPhone && (
                                  <div className="flex items-center gap-1 text-slate-300">
                                    <Phone className="w-3 h-3 text-slate-400" />
                                    <span>{config.footerPhone}</span>
                                  </div>
                                )}
                                {config.footerAddress && (
                                  <div className="flex items-center gap-1 text-slate-300">
                                    <MapPin className="w-3 h-3 text-slate-400" />
                                    <span>{config.footerAddress}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="pt-4 border-t border-slate-800 text-[10px] text-slate-500 font-medium text-left">
                            <p>{lang === 'id' ? config.footerCopyrightId : config.footerCopyrightEn}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* LANGUAGE CONFIG SUBTAB */}
                  {adminSubTab === 'language' && (
                    <div className="space-y-6 text-left">
                      <div className="border-b border-slate-100 pb-4">
                        <h3 className="text-base font-bold text-slate-900">🌐 Pengaturan Bahasa (Language Settings)</h3>
                        <p className="text-xs text-slate-500 mt-1">
                          Kelola default bahasa website serta visibilitas tombol penukar bahasa (language switcher) di atas landing page Anda.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* SECTION 1: DEFAULT LANGUAGE */}
                        <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-4 shadow-xs">
                          <div className="flex items-center gap-1.5 border-b border-slate-100 pb-3">
                            <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                              <Languages className="w-4 h-4" />
                            </span>
                            <div>
                              <span className="text-xs font-extrabold text-slate-800 uppercase tracking-widest block">Default Bahasa Website</span>
                              <span className="text-[10px] text-slate-400 font-medium font-sans">Bahasa utama yang dimuat saat pengunjung membuka website</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() => setConfig(prev => ({ ...prev, defaultLanguage: 'id' }))}
                              className={`p-4 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                                (config.defaultLanguage === 'id' || !config.defaultLanguage)
                                  ? 'bg-blue-50/50 border-blue-500 text-blue-700 shadow-xs'
                                  : 'bg-transparent border-slate-200 text-slate-600 hover:border-slate-350'
                              }`}
                            >
                              <span className="text-2xl">🇮🇩</span>
                              <span className="text-xs font-bold block">Bahasa Indonesia</span>
                              <span className="text-[10px] text-slate-400 font-normal">Situs dimuat dalam ID</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setConfig(prev => ({ ...prev, defaultLanguage: 'en' }))}
                              className={`p-4 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                                config.defaultLanguage === 'en'
                                  ? 'bg-blue-50/50 border-blue-500 text-blue-700 shadow-xs'
                                  : 'bg-transparent border-slate-200 text-slate-600 hover:border-slate-350'
                              }`}
                            >
                              <span className="text-2xl">🇬🇧</span>
                              <span className="text-xs font-bold block">English (US)</span>
                              <span className="text-[10px] text-slate-400 font-normal">Situs dimuat dalam EN</span>
                            </button>
                          </div>
                        </div>

                        {/* SECTION 2: LANGUAGE SWITCHER VISIBILITY */}
                        <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-4 shadow-xs">
                          <div className="flex items-center gap-1.5 border-b border-slate-100 pb-3">
                            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                              <Globe className="w-4 h-4" />
                            </span>
                            <div>
                              <span className="text-xs font-extrabold text-slate-800 uppercase tracking-widest block">Tombol Penukar Bahasa</span>
                              <span className="text-[10px] text-slate-400 font-medium font-sans">Tampilkan atau sembunyikan toggle EN/ID di pojok atas website</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={() => setConfig(prev => ({ ...prev, languageSwitcherEnabled: true }))}
                              className={`p-4 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                                config.languageSwitcherEnabled !== false
                                  ? 'bg-emerald-50/50 border-emerald-500 text-emerald-700 shadow-xs'
                                  : 'bg-transparent border-slate-200 text-slate-600 hover:border-slate-350'
                              }`}
                            >
                              <span className="text-lg text-emerald-600 font-bold">✓</span>
                              <span className="text-xs font-bold block">Tampilkan Tombol</span>
                              <span className="text-[10px] text-slate-400 font-normal">Pengunjung bebas menukar</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setConfig(prev => ({ ...prev, languageSwitcherEnabled: false }))}
                              className={`p-4 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                                config.languageSwitcherEnabled === false
                                  ? 'bg-amber-50/50 border-amber-500 text-amber-700 shadow-xs'
                                  : 'bg-transparent border-slate-200 text-slate-600 hover:border-slate-350'
                              }`}
                            >
                              <span className="text-lg text-amber-600 font-bold">✗</span>
                              <span className="text-xs font-bold block">Sembunyikan Tombol</span>
                              <span className="text-[10px] text-slate-400 font-normal font-sans">Situs dikunci ke bahasa default</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* SECTION 3: SYSTEM TRANSLATION EXPLANATION */}
                      <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl">
                        <div className="flex items-start gap-3">
                          <span className="p-2 bg-blue-100 text-blue-700 rounded-xl mt-0.5">
                            <Sparkles className="w-4 h-4" />
                          </span>
                          <div className="space-y-1">
                            <span className="text-xs font-extrabold text-slate-800 uppercase tracking-widest block">ℹ️ Catatan Sistem Lokalisasi</span>
                            <p className="text-xs text-slate-600 leading-relaxed font-sans">
                              Sistem pendaftaran dan evaluasi abstrak AI IBEC 2026 mendukung lokalisasi penuh secara otomatis. Mengubah bahasa default di atas akan memengaruhi tampilan pendaftaran, notifikasi detail pembicara (Speakers), dan struktur biaya awal pendaftar baru yang berkunjung. Anda juga dapat selalu menukar bahasa secara langsung saat melakukan pratinjau landing page di pojok kanan atas.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* ACTION BUTTONS */}
                      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => handleSaveConfig(config)}
                          disabled={adminSaving}
                          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all border border-blue-700 flex items-center gap-2 cursor-pointer"
                        >
                          {adminSaving ? 'Menyimpan...' : 'Simpan Pengaturan Bahasa'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* YOUTUBE VIDEO HEADER CONFIG SUBTAB */}
                  {adminSubTab === 'video_header' && (
                    <div className="space-y-6 text-left animate-fadeIn">
                      <div className="border-b border-slate-100 pb-4">
                        <h3 className="text-base font-bold text-slate-900">🎥 Konfigurasi Latar Belakang Video YouTube</h3>
                        <p className="text-xs text-slate-500 mt-1">
                          Aktifkan latar belakang dinamis menggunakan video looping dari YouTube untuk memperindah dan modernisasi bagian depan website Anda.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* FORM CONTROL PANEL (7 COLS) */}
                        <div className="lg:col-span-7 space-y-6">
                          {/* OPTION 1: CHOOSE BACKGROUND TYPE */}
                          <div className="p-5 bg-white border border-slate-205 rounded-2xl space-y-4 shadow-3xs">
                            <span className="text-xs font-extrabold text-slate-800 uppercase tracking-widest block border-b border-slate-100 pb-2">📂 Pilih Jenis Latar Belakang Hero</span>
                            
                            <div className="grid grid-cols-2 gap-3">
                              <button
                                type="button"
                                onClick={() => setConfig(prev => ({ ...prev, heroBgType: 'gradient' }))}
                                className={`p-4 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                                  (config.heroBgType === 'gradient' || !config.heroBgType)
                                    ? 'bg-blue-50/50 border-blue-500 text-blue-700 shadow-xs'
                                    : 'bg-transparent border-slate-200 text-slate-600 hover:border-slate-350'
                                }`}
                              >
                                <span className="text-2xl">🎨</span>
                                <span className="text-xs font-bold block">Gradient Standar</span>
                                <span className="text-[10px] text-slate-400 font-normal">Warna gradien biru-indigo premium</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setConfig(prev => ({ ...prev, heroBgType: 'youtube' }))}
                                className={`p-4 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                                  config.heroBgType === 'youtube'
                                    ? 'bg-red-50/50 border-red-500 text-red-700 shadow-xs'
                                    : 'bg-transparent border-slate-200 text-slate-600 hover:border-slate-350'
                                }`}
                              >
                                <span className="text-2xl">📺</span>
                                <span className="text-xs font-bold block">Video YouTube Live</span>
                                <span className="text-[10px] text-slate-400 font-normal">Video ambient looping interaktif</span>
                              </button>
                            </div>
                          </div>

                          {/* OPTION 2: FIELD VIDEO INPUT */}
                          {config.heroBgType === 'youtube' && (
                            <div className="p-5 bg-white border border-slate-205 rounded-2xl space-y-5 shadow-3xs animate-fadeIn">
                              <span className="text-xs font-extrabold text-slate-800 uppercase tracking-widest block border-b border-slate-100 pb-2">📝 Detail Media Player YouTube</span>
                              
                              <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Link Video atau ID Video YouTube</label>
                                <div className="relative">
                                  <input 
                                    type="text"
                                    value={config.heroYoutubeId || ''}
                                    placeholder="Contoh: https://www.youtube.com/watch?v=dQw4w9WgXcQ atau dQw4w9WgXcQ"
                                    onChange={e => {
                                      const val = e.target.value;
                                      setConfig(prev => ({ ...prev, heroYoutubeId: val }));
                                    }}
                                    className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-red-500 focus:bg-white text-slate-800"
                                  />
                                  <span className="absolute right-3 top-2.5 text-xs text-red-500 font-bold font-sans">YT</span>
                                </div>
                                <span className="text-[10px] text-slate-400 leading-snug block mt-1.5 font-sans">
                                  💡 Sistem mendukung input tautan langsung dari browser, format berbagi <i>youtu.be/xxx</i>, maupun kode video 11 karakter unik.
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Ulangi Video Secara Otomatis (Loop)</label>
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setConfig(prev => ({ ...prev, heroYoutubeLoop: true }))}
                                      className={`flex-1 py-2 px-3 border rounded-lg text-xs font-bold text-center cursor-pointer transition ${
                                        (config.heroYoutubeLoop !== false)
                                          ? 'bg-red-50 text-red-700 border-red-300'
                                          : 'bg-transparent text-slate-600 border-slate-250'
                                      }`}
                                    >
                                      Looping Aktif
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfig(prev => ({ ...prev, heroYoutubeLoop: false }))}
                                      className={`flex-1 py-2 px-3 border rounded-lg text-xs font-bold text-center cursor-pointer transition ${
                                        config.heroYoutubeLoop === false
                                          ? 'bg-amber-50 text-amber-700 border-amber-300'
                                          : 'bg-transparent text-slate-600 border-slate-250'
                                      }`}
                                    >
                                      Sekali Saja (No Loop)
                                    </button>
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Transparansi Lapisan Gelap (Overlay)</label>
                                  <div className="space-y-1.5">
                                    <div className="flex items-center justify-between text-xs font-bold">
                                      <span className="font-mono text-indigo-600">{(config.heroYoutubeOverlayOpacity !== undefined) ? config.heroYoutubeOverlayOpacity : 60}% Gelap</span>
                                      <span className="text-slate-400">Rekomendasi: 50% - 80%</span>
                                    </div>
                                    <input 
                                      type="range"
                                      min="10"
                                      max="90"
                                      step="5"
                                      value={(config.heroYoutubeOverlayOpacity !== undefined) ? config.heroYoutubeOverlayOpacity : 60}
                                      onChange={e => {
                                        const parsed = parseInt(e.target.value);
                                        setConfig(prev => ({ ...prev, heroYoutubeOverlayOpacity: parsed }));
                                      }}
                                      className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* NOTICE & EXPLANATION */}
                          <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl">
                            <div className="flex items-start gap-3">
                              <span className="p-2 bg-blue-50 text-blue-700 rounded-xl mt-0.5">
                                <Sparkles className="w-4 h-4" />
                              </span>
                              <div className="space-y-1">
                                <span className="text-xs font-extrabold text-slate-800 uppercase tracking-widest block">📝 Informasi Tambahan Penggunaan</span>
                                <p className="text-[11px] text-slate-600 leading-relaxed font-sans">
                                  Menetapkan background bertipe video YouTube membutuhkan koneksi internet stabil dari browser pelanggan untuk memutar video. Video akan dijalankan secara <i>mute (tanpa suara)</i> secara default untuk mematuhi kebijakan Google Chrome / Safari Autoplay Policy. Pastikan video yang dipilih bersifat publik dan memiliki izin untuk ditampilkan secara tersemat (embed).
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* LIVE PREVIEW BOX (5 COLS) */}
                        <div className="lg:col-span-5 space-y-4">
                          <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest block">👁️ Real-time Live Preview</span>
                          
                          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-white relative overflow-hidden flex flex-col justify-between aspect-video lg:aspect-square">
                            {/* Background handler mirroring top */}
                            {config.heroBgType === 'youtube' && config.heroYoutubeId ? (
                              <div className="absolute inset-0 z-0 bg-black">
                                <iframe
                                  className="absolute w-[300%] h-[100%] top-0 left-[-100%] pointer-events-none opacity-80"
                                  src={`https://www.youtube.com/embed/${(() => {
                                    const trimmed = (config.heroYoutubeId || '').trim();
                                    if (trimmed.length === 11) return trimmed;
                                    const match = trimmed.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
                                    return (match && match[2].length === 11) ? match[2] : trimmed;
                                  })()}?autoplay=1&mute=1&controls=0&showinfo=0&rel=0&loop=${config.heroYoutubeLoop !== false ? 1 : 0}&playlist=${(() => {
                                    const trimmed = (config.heroYoutubeId || '').trim();
                                    if (trimmed.length === 11) return trimmed;
                                    const match = trimmed.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
                                    return (match && match[2].length === 11) ? match[2] : trimmed;
                                  })()}`}
                                  allow="autoplay; encrypted-media"
                                  title="Live BG Mockup"
                                ></iframe>
                                {/* Overlay slider mask */}
                                <div 
                                  className="absolute inset-0 bg-blue-950/90 mix-blend-multiply transition-colors"
                                  style={{ opacity: ((config.heroYoutubeOverlayOpacity !== undefined) ? config.heroYoutubeOverlayOpacity : 60) / 100 }}
                                ></div>
                              </div>
                            ) : (
                              <div className="absolute inset-0 z-0 bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900">
                                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:12px_12px] opacity-15"></div>
                              </div>
                            )}

                            {/* Front Overlay content mocking actual header */}
                            <div className="relative z-10 p-4 space-y-2 flex flex-col justify-end h-full">
                              <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block bg-black/40 px-2 py-0.5 rounded max-w-max">
                                {config.heroBgType === 'youtube' ? '🎥 Mode YouTube Background' : '🎨 Mode Gradient Background'}
                              </span>
                              <h4 className="text-sm font-extrabold tracking-tight line-clamp-2">
                                {lang === 'id' ? config.heroTitleId : config.heroTitleEn}
                              </h4>
                              <p className="text-[10px] text-slate-300 line-clamp-2 leading-relaxed">
                                {lang === 'id' ? config.heroSubId : config.heroSubEn}
                              </p>
                              
                              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                                <div className="bg-white/10 backdrop-blur-md rounded p-1.5 text-center">
                                  <span className="text-[8px] text-slate-400 block uppercase font-bold">BG TYPE</span>
                                  <span className="text-[10px] font-bold text-white font-mono uppercase">{config.heroBgType || 'gradient'}</span>
                                </div>
                                <div className="bg-white/10 backdrop-blur-md rounded p-1.5 text-center">
                                  <span className="text-[8px] text-slate-400 block uppercase font-bold">VIDEO ID</span>
                                  <span className="text-[10px] font-bold text-white font-mono truncate block">
                                    {config.heroBgType === 'youtube' ? (() => {
                                      const trimmed = (config.heroYoutubeId || '').trim();
                                      if (trimmed.length === 11) return trimmed;
                                      const match = trimmed.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
                                      return (match && match[2].length === 11) ? match[2] : trimmed;
                                    })() || '(KOSONG)' : '-'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* SAVE FOOTER */}
                      <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => {
                            const trimmed = (config.heroYoutubeId || '').trim();
                            let processedId = trimmed;
                            if (trimmed && trimmed.length !== 11) {
                              const match = trimmed.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
                              if (match && match[2].length === 11) {
                                processedId = match[2];
                              }
                            }
                            const finalConfig = {
                              ...config,
                              heroYoutubeId: processedId
                            };
                            setConfig(finalConfig);
                            handleSaveConfig(finalConfig);
                          }}
                          disabled={adminSaving}
                          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all border border-blue-700 flex items-center gap-2 cursor-pointer font-sans"
                        >
                          {adminSaving ? 'Menyimpan...' : '💾 Simpan Konfigurasi Background'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* MATERIALS CONFIG SUBTAB */}
                  {adminSubTab === 'materials' && (
                    <div className="space-y-6 text-left animate-fadeIn">
                      <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                          <h3 className="text-base font-bold text-slate-900">📂 Manajemen Dokumen & Unduhan Materi</h3>
                          <p className="text-xs text-slate-500 mt-1">
                            Kelola berkas unduhan, berkas template, prosiding, brosur, atau materi presentasi yang dapat diunduh oleh pengunjung di halaman depan.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMaterialId(null);
                            setMaterialForm({
                              id: 'mat_' + Date.now(),
                              titleEn: '',
                              titleId: '',
                              descriptionEn: '',
                              descriptionId: '',
                              fileUrl: 'https://',
                              fileType: 'PDF',
                              fileSize: '1.2 MB',
                              visible: true
                            });
                          }}
                          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer max-w-max border border-indigo-700 font-sans"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Tambah Dokumen Baru
                        </button>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* LIST COLUMN (7 COLS) */}
                        <div className="lg:col-span-7 space-y-4">
                          <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest block">📄 Daftar Dokumen Unggahan ({config.downloadMaterials?.length || 0})</span>
                          
                          {(!config.downloadMaterials || config.downloadMaterials.length === 0) ? (
                            <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-250 rounded-2xl">
                              <span className="text-3xl block mb-2">📁</span>
                              <span className="text-xs font-bold text-slate-600 block">Belum ada dokumen eksternal</span>
                              <span className="text-[10px] text-slate-400 mt-1 block">Silakan tambah dokumen baru melalui form di samping.</span>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {(config.downloadMaterials || []).map((material) => (
                                <div 
                                  key={material.id}
                                  className={`p-4 bg-white border rounded-xl transition-all shadow-3xs flex items-start justify-between gap-4 ${
                                    editingMaterialId === material.id ? 'border-indigo-400 bg-indigo-50/50 ring-1 ring-indigo-305' : 'border-slate-150 hover:border-slate-300'
                                  }`}
                                >
                                  <div className="flex items-start gap-3">
                                    <span className={`p-2.5 rounded-xl block font-bold text-xs shrink-0 ${
                                      material.fileType === 'PDF' ? 'bg-red-50 text-red-650' :
                                      material.fileType === 'DOCX' || material.fileType === 'DOC' ? 'bg-blue-50 text-blue-650' :
                                      material.fileType === 'PPTX' || material.fileType === 'PPT' ? 'bg-amber-50 text-amber-650' :
                                      'bg-slate-100 text-slate-700'
                                    }`}>
                                      {material.fileType || 'FILE'}
                                    </span>
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <h4 className="text-xs font-bold text-slate-800 leading-snug line-clamp-1">{lang === 'id' ? material.titleId : material.titleEn}</h4>
                                        {!material.visible && (
                                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 font-bold text-[8px] rounded uppercase tracking-wider">Sembunyi</span>
                                        )}
                                      </div>
                                      <p className="text-[10px] text-slate-500 leading-normal line-clamp-2">
                                        {lang === 'id' ? material.descriptionId : material.descriptionEn}
                                      </p>
                                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1.5 text-[9px] text-slate-400 font-mono">
                                        <span className="bg-slate-50 border border-slate-100 px-1 rounded text-slate-500 font-bold">{material.fileSize}</span>
                                        <span className="truncate max-w-[150px] font-semibold text-slate-400">{material.fileUrl}</span>
                                        <span>📥 {material.downloadsCount || 0} Unduhan</span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      title={material.visible ? "Sembunyikan dari Publik" : "Tampilkan ke Publik"}
                                      onClick={() => {
                                        const updated = (config.downloadMaterials || []).map(m => 
                                          m.id === material.id ? { ...m, visible: (m.visible === false ? true : false) } : m
                                        );
                                        const newConf = { ...config, downloadMaterials: updated };
                                        setConfig(newConf);
                                        localStorage.setItem('offline_config', JSON.stringify(newConf));
                                      }}
                                      className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg transition cursor-pointer"
                                    >
                                      {material.visible !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingMaterialId(material.id);
                                        setMaterialForm({
                                          id: material.id,
                                          titleEn: material.titleEn,
                                          titleId: material.titleId,
                                          descriptionEn: material.descriptionEn || '',
                                          descriptionId: material.descriptionId || '',
                                          fileUrl: material.fileUrl,
                                          fileType: material.fileType,
                                          fileSize: material.fileSize,
                                          visible: material.visible !== false
                                        });
                                      }}
                                      className="p-1.5 hover:bg-slate-100 text-indigo-600 rounded-lg transition cursor-pointer"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (confirm("Apakah Anda yakin ingin menghapus materi ini?")) {
                                          const filtered = (config.downloadMaterials || []).filter(m => m.id !== material.id);
                                          const newConf = { ...config, downloadMaterials: filtered };
                                          setConfig(newConf);
                                          localStorage.setItem('offline_config', JSON.stringify(newConf));
                                        }
                                      }}
                                      className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* FORM COLUMN (5 COLS) */}
                        <div className="lg:col-span-5 space-y-4">
                          <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest block">
                            {editingMaterialId ? '✏️ Ubah Detil Dokumen' : '📁 Formulir Dokumen Baru'}
                          </span>

                          <div className="p-5 bg-white border border-slate-205 rounded-2xl space-y-4 shadow-3xs">
                            {/* DUAL LANGUAGE TITLES */}
                            <div className="space-y-3">
                              <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Judul Dokumen (Bahasa Indonesia)</label>
                                <input 
                                  type="text"
                                  value={materialForm.titleId}
                                  placeholder="Contoh: Brosur Resmi Konferensi IBEC"
                                  onChange={e => setMaterialForm(prev => ({ ...prev, titleId: e.target.value }))}
                                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:border-indigo-550 focus:bg-white text-slate-800"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Document Title (English)</label>
                                <input 
                                  type="text"
                                  value={materialForm.titleEn}
                                  placeholder="Contoh: Official IBEC Conference Brochure"
                                  onChange={e => setMaterialForm(prev => ({ ...prev, titleEn: e.target.value }))}
                                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:border-indigo-550 focus:bg-white text-slate-800"
                                />
                              </div>
                            </div>

                            {/* DUAL LANGUAGE DESCRIPTIONS */}
                            <div className="space-y-3">
                              <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Deskripsi Singkat (Bahasa Indonesia)</label>
                                <textarea 
                                  rows={2}
                                  value={materialForm.descriptionId}
                                  placeholder="Contoh: Susunan diskusi lisan, pengadaan kamar hotel & rundowns."
                                  onChange={e => setMaterialForm(prev => ({ ...prev, descriptionId: e.target.value }))}
                                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-indigo-550 focus:bg-white text-slate-800 font-sans"
                                />
                              </div>

                              <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Short Description (English)</label>
                                <textarea 
                                  rows={2}
                                  value={materialForm.descriptionEn}
                                  placeholder="Contoh: Agenda updates, technical track info, session time."
                                  onChange={e => setMaterialForm(prev => ({ ...prev, descriptionEn: e.target.value }))}
                                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-indigo-550 focus:bg-white text-slate-800 font-sans"
                                />
                              </div>
                            </div>

                            {/* FILE ATTACHMENT SIMULATION (DRAG AND DROP OR CHOOSE) */}
                            <div className="space-y-3">
                              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">Upload Berkas Pendukung (Downloadable)</label>
                              
                              <div className="p-4 bg-slate-50 border border-dashed border-slate-250 rounded-xl hover:bg-slate-100/50 transition relative group flex flex-col items-center justify-center text-center">
                                <input 
                                  type="file" 
                                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                  onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      let detectedType = 'PDF';
                                      const ext = file.name.split('.').pop()?.toUpperCase() || '';
                                      if (['PDF', 'ZIP', 'DOC', 'DOCX', 'PPT', 'PPTX', 'XLS', 'XLSX'].includes(ext)) {
                                        detectedType = ext;
                                      }
                                      const sizeStr = file.size > 1024 * 1024 
                                        ? (file.size / (1024 * 1024)).toFixed(1) + ' MB'
                                        : (file.size / 1024).toFixed(0) + ' KB';
                                      
                                      setMaterialForm(prev => ({
                                        ...prev,
                                        fileUrl: 'https://storage.ibec2026.org/files/' + file.name,
                                        fileType: detectedType,
                                        fileSize: sizeStr,
                                        titleId: prev.titleId || file.name.replace(/\.[^/.]+$/, ""),
                                        titleEn: prev.titleEn || file.name.replace(/\.[^/.]+$/, "")
                                      }));
                                    }
                                  }}
                                />
                                <Upload className="w-5 h-5 text-indigo-500 mb-2 group-hover:scale-110 transition" />
                                <span className="text-[10px] font-black text-slate-700">Pilih berkas dari komputer Anda</span>
                                <span className="text-[9px] text-slate-400 mt-0.5 font-sans">Sistem auto-ekstrak Nama, Ekstensi & Ukuran Berkas secara lokal</span>
                              </div>

                              {/* DIRECT URL LINK */}
                              <div>
                                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Atau masukkan Link Berkas manual</label>
                                <input 
                                  type="text"
                                  value={materialForm.fileUrl}
                                  placeholder="Contoh: https://drive.google.com/..."
                                  onChange={e => setMaterialForm(prev => ({ ...prev, fileUrl: e.target.value }))}
                                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-indigo-550 focus:bg-white text-slate-700"
                                />
                              </div>
                            </div>

                            {/* TYPE & SIZE DETECTOR */}
                            <div className="grid grid-cols-2 gap-3 pb-2">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tipe Ekstensi</label>
                                <select
                                  value={materialForm.fileType}
                                  onChange={e => setMaterialForm(prev => ({ ...prev, fileType: e.target.value }))}
                                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:border-indigo-550 text-slate-800"
                                >
                                  {['PDF', 'DOCX', 'PPTX', 'ZIP', 'XLSX'].map(t => (
                                    <option key={t} value={t}>{t}</option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Ukuran File</label>
                                <input 
                                  type="text"
                                  value={materialForm.fileSize}
                                  placeholder="Contoh: 1.5 MB"
                                  onChange={e => setMaterialForm(prev => ({ ...prev, fileSize: e.target.value }))}
                                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:border-indigo-550 text-slate-800"
                                />
                              </div>
                            </div>

                            {/* DISPLAY SWITCH */}
                            <div className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded-lg transition">
                              <input 
                                type="checkbox"
                                id="mat-visible-check"
                                checked={materialForm.visible !== false}
                                onChange={e => setMaterialForm(prev => ({ ...prev, visible: e.target.checked }))}
                                className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                              />
                              <label htmlFor="mat-visible-check" className="text-xs font-bold text-slate-700 cursor-pointer select-none">Tampilkan dokumen ini ke publik halaman depan</label>
                            </div>

                            {/* FORM ACTIONS */}
                            <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                              <button
                                type="button"
                                onClick={() => {
                                  if (!materialForm.titleId || !materialForm.titleEn) {
                                    alert("Silakan isi Judul Dokumen dalam Bahasa Indonesia dan Inggris!");
                                    return;
                                  }
                                  
                                  const currentMaterials = config.downloadMaterials ? [...config.downloadMaterials] : [];
                                  let updatedList = [];
                                  
                                  if (editingMaterialId) {
                                    // Update existing
                                    updatedList = currentMaterials.map(m => m.id === editingMaterialId ? {
                                      ...m,
                                      ...materialForm,
                                      id: editingMaterialId
                                    } : m);
                                  } else {
                                    // Add new
                                    const newDoc = {
                                      ...materialForm,
                                      id: 'mat_' + Date.now(),
                                      downloadsCount: 0
                                    };
                                    updatedList = [...currentMaterials, newDoc];
                                  }

                                  const finalConfig = {
                                    ...config,
                                    downloadMaterials: updatedList
                                  };
                                  setConfig(finalConfig);
                                  handleSaveConfig(finalConfig);

                                  // Reset
                                  setEditingMaterialId(null);
                                  setMaterialForm({
                                    id: '',
                                    titleEn: '',
                                    titleId: '',
                                    descriptionEn: '',
                                    descriptionId: '',
                                    fileUrl: 'https://',
                                    fileType: 'PDF',
                                    fileSize: '1.2 MB',
                                    visible: true
                                  });
                                }}
                                className="flex-1 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-xs border border-indigo-700 transition cursor-pointer"
                              >
                                {editingMaterialId ? '💾 Simpan Perubahan Dokumen' : '➕ Tambah ke Daftar Unduhan'}
                              </button>
                              
                              {editingMaterialId && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingMaterialId(null);
                                    setMaterialForm({
                                      id: '',
                                      titleEn: '',
                                      titleId: '',
                                      descriptionEn: '',
                                      descriptionId: '',
                                      fileUrl: 'https://',
                                      fileType: 'PDF',
                                      fileSize: '1.2 MB',
                                      visible: true
                                    });
                                  }}
                                  className="py-2.5 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer border border-slate-200"
                                >
                                  Batal
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* REGISTRATIONS DATA SUBTAB */}
                  {adminSubTab === 'registrations' && (
                    <div className="space-y-6">
                      <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in text-left">
                        <div>
                          <h3 className="text-base font-bold text-slate-900">Database & Manajemen Data Peserta</h3>
                          <p className="text-xs text-slate-500 mt-1">Lihat, saring, cari, dan kelola seluruh berkas pendaftar resmi konferensi IBEC 2026 secara live.</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <button
                            onClick={handleExportRegistrations}
                            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all border border-emerald-700 cursor-pointer"
                          >
                            <FileSpreadsheet className="w-4 h-4" />
                            <span>Export ke Excel</span>
                          </button>
                          <div className="bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 text-left sm:text-right">
                            <span className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider">TOTAL TERDAFTAR</span>
                            <span className="text-sm font-extrabold text-blue-700">{registrations.length} Orang</span>
                          </div>
                        </div>
                      </div>

                      {/* STATS TILES */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
                        <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">PEMAKALAH (PRESENTER)</span>
                          <span className="text-lg font-extrabold text-blue-700 mt-1 block">
                            {registrations.filter(r => r.role === 'presenter').length}
                          </span>
                        </div>
                        <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">PENDENGAR (ATTENDEE)</span>
                          <span className="text-lg font-extrabold text-emerald-700 mt-1 block">
                            {registrations.filter(r => r.role === 'attendee').length}
                          </span>
                        </div>
                        <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">PESERTA LOKAL</span>
                          <span className="text-lg font-extrabold text-indigo-700 mt-1 block">
                            {registrations.filter(r => r.country.toLowerCase() === 'indonesia').length}
                          </span>
                        </div>
                        <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-xl">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">PESERTA INTERNASIONAL</span>
                          <span className="text-lg font-extrabold text-purple-700 mt-1 block">
                            {registrations.filter(r => r.country.toLowerCase() !== 'indonesia').length}
                          </span>
                        </div>
                      </div>

                      {/* FILTERS TOOLBAR */}
                      <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col md:flex-row gap-3 text-left">
                        <div className="flex-1">
                          <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Cari Peserta</label>
                          <input 
                            type="text"
                            placeholder="Cari ID, Nama, Email, Institusi..."
                            value={adminRegSearch}
                            onChange={e => setAdminRegSearch(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 text-slate-800 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-sans"
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-3 shrink-0">
                          <div>
                            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Peran (Role)</label>
                            <select
                              value={adminRegRoleFilter}
                              onChange={e => setAdminRegRoleFilter(e.target.value as any)}
                              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800 font-sans w-full"
                            >
                              <option value="all">Semua Peran</option>
                              <option value="presenter">Presenter (Pemakalah)</option>
                              <option value="attendee">Attendee (Pendengar)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Kategori</label>
                            <select
                              value={adminRegCategoryFilter}
                              onChange={e => setAdminRegCategoryFilter(e.target.value as any)}
                              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800 font-sans w-full"
                            >
                              <option value="all">Semua Kategori</option>
                              <option value="umum">Umum</option>
                              <option value="mitra">Mitra</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Regional</label>
                            <select
                              value={adminRegOriginFilter}
                              onChange={e => setAdminRegOriginFilter(e.target.value as any)}
                              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-800 font-sans w-full"
                            >
                              <option value="all">Semua Region</option>
                              <option value="domestic">Domestik (Indonesia)</option>
                              <option value="intl">Internasional</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* TABLE */}
                      <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-3xs text-left">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 text-slate-450 uppercase tracking-widest text-[9px] font-bold border-b border-slate-200">
                              <th className="p-4 font-bold">ID Registrasi</th>
                              <th className="p-4 font-bold">Detail Peserta</th>
                              <th className="p-4 font-bold">Kontak</th>
                              <th className="p-4 font-bold">Afiliasi & Negara</th>
                              <th className="p-4 font-bold">Biaya</th>
                              <th className="p-4 text-center font-bold">Hasil Upload (Bukti)</th>
                              <th className="p-4 text-center font-bold">Tindakan</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {(() => {
                              const filtered = registrations.filter(reg => {
                                // Search filter
                                const searchLower = adminRegSearch.toLowerCase();
                                const matchesSearch = !adminRegSearch || 
                                  reg.id.toLowerCase().includes(searchLower) ||
                                  reg.name.toLowerCase().includes(searchLower) ||
                                  reg.email.toLowerCase().includes(searchLower) ||
                                  reg.institution.toLowerCase().includes(searchLower) ||
                                  reg.phone.toLowerCase().includes(searchLower);

                                // Role filter
                                const matchesRole = adminRegRoleFilter === 'all' || reg.role === adminRegRoleFilter;

                                // Category filter
                                const matchesCategory = adminRegCategoryFilter === 'all' || 
                                  (adminRegCategoryFilter === 'mitra' && reg.category === 'mitra') ||
                                  (adminRegCategoryFilter === 'umum' && (!reg.category || reg.category === 'umum'));

                                // Origin filter
                                const isDomestic = reg.country.toLowerCase() === 'indonesia';
                                const matchesOrigin = adminRegOriginFilter === 'all' || 
                                  (adminRegOriginFilter === 'domestic' && isDomestic) || 
                                  (adminRegOriginFilter === 'intl' && !isDomestic);

                                return matchesSearch && matchesRole && matchesCategory && matchesOrigin;
                              });

                              if (filtered.length === 0) {
                                return (
                                  <tr>
                                    <td colSpan={7} className="p-10 text-center text-slate-400 italic">
                                      Tidak ada data pendaftar yang cocok dengan hasil saringan & pencarian Anda.
                                    </td>
                                  </tr>
                                );
                              }

                              return filtered.map((reg, rIdx) => {
                                const isDomestic = reg.country.toLowerCase() === 'indonesia';
                                const feeValue = reg.role === 'presenter' ? (
                                  isDomestic ? config.registrationFees.presenter.domesticNormal : config.registrationFees.presenter.intlNormal
                                ) : (
                                  isDomestic ? config.registrationFees.attendee.domestic : config.registrationFees.attendee.intl
                                );

                                return (
                                  <tr key={reg.id || rIdx} className="hover:bg-slate-50/50 transition-all">
                                    <td className="p-4 font-mono">
                                      <span className="font-extrabold text-blue-700 block">{reg.id}</span>
                                      <span className="text-[10px] text-slate-400">{new Date(reg.registeredAt).toLocaleDateString()}</span>
                                    </td>
                                    <td className="p-4">
                                      <div className="font-bold text-slate-950 text-xs">{reg.name}</div>
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                          reg.role === 'presenter' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                        }`}>
                                          {reg.role}
                                        </span>
                                        <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                          reg.category === 'mitra' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-700 border border-slate-200'
                                        }`}>
                                          {reg.category === 'mitra' ? 'MITRA' : 'UMUM'}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="p-4 space-y-0.5">
                                      <div className="text-slate-700 flex items-center gap-1">
                                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                                        <span>{reg.email}</span>
                                      </div>
                                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                        <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                        <span>{reg.phone}</span>
                                      </div>
                                    </td>
                                    <td className="p-4">
                                      <div className="font-bold text-slate-800">{reg.institution}</div>
                                      <div className="text-[10px] text-slate-450 flex items-center gap-1 mt-0.5">
                                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                        <span>{reg.country}</span>
                                      </div>
                                    </td>
                                    <td className="p-4">
                                      <div className="font-extrabold text-slate-900">{feeValue}</div>
                                      <span className="text-[9px] text-slate-400 block">{isDomestic ? 'Domestic IDR Rate' : 'Global USD Rate'}</span>
                                    </td>
                                    <td className="p-4 text-center">
                                      {reg.paymentProof ? (
                                        <button
                                          type="button"
                                          onClick={() => setAdminSelectedPaymentProof(reg)}
                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold text-xs rounded-xl border border-emerald-200 cursor-pointer shadow-3xs transition-all"
                                        >
                                          <span>👁️ Lihat Bukti</span>
                                        </button>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-600 text-[10px] font-bold rounded-lg border border-red-100">
                                          ⚠️ Belum Upload
                                        </span>
                                      )}
                                    </td>
                                    <td className="p-4 text-center">
                                      {adminRegConfirmDeleteId === reg.id ? (
                                        <div className="flex items-center justify-center gap-1 py-1 animate-bounce">
                                          <button 
                                            onClick={() => handleDeleteRegistration(reg.id)}
                                            disabled={adminRegDeleteLoadingId === reg.id}
                                            className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white font-extrabold text-[9px] rounded border border-red-700 cursor-pointer disabled:opacity-50 font-sans"
                                          >
                                            {adminRegDeleteLoadingId === reg.id ? '...' : 'Yakin'}
                                          </button>
                                          <button 
                                            onClick={() => setAdminRegConfirmDeleteId(null)}
                                            className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold text-[9px] rounded border border-slate-300 cursor-pointer font-sans"
                                          >
                                            Batal
                                          </button>
                                        </div>
                                      ) : (
                                        <button 
                                          onClick={() => setAdminRegConfirmDeleteId(reg.id)}
                                          className="px-3 py-1 bg-red-100 hover:bg-red-200 hover:text-red-800 text-red-700 font-bold text-[9px] rounded-lg border border-red-200 transition-all cursor-pointer font-sans"
                                        >
                                          Hapus 🗑️
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              });
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* ABSTRACTS DATA SUBTAB */}
                  {adminSubTab === 'abstracts' && (
                    <div className="space-y-6">
                      <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in text-left">
                        <div>
                          <h3 className="text-base font-bold text-slate-900">Peninjauan &amp; Evaluasi Abstrak AI Otomatis</h3>
                          <p className="text-xs text-slate-500 mt-1">Daftar unggah naskah beserta hasil evaluasi kecerdasan buatan, grammar rating, skor novelty, dan feedback komite secara instan.</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <button
                            onClick={handleExportSubmissions}
                            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all border border-emerald-700 cursor-pointer"
                          >
                            <FileSpreadsheet className="w-4 h-4" />
                            <span>Export ke Excel</span>
                          </button>
                          <div className="bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 text-left sm:text-right">
                            <span className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider">TOTAL ABSTRAK MASUK</span>
                            <span className="text-sm font-extrabold text-blue-700">{submissions.length} Abstrak</span>
                          </div>
                        </div>
                      </div>

                      {/* STATS TILES */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
                        <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">DISETUJUI (ACCEPTED)</span>
                          <span className="text-lg font-extrabold text-emerald-700 mt-1 block">
                            {submissions.filter(s => s.status === 'Accepted').length}
                          </span>
                        </div>
                        <div className="p-4 bg-yellow-50/50 border border-yellow-100 rounded-xl">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider font-sans">REVISI (REVISION)</span>
                          <span className="text-lg font-extrabold text-yellow-700 mt-1 block">
                            {submissions.filter(s => s.status === 'Revision').length}
                          </span>
                        </div>
                        <div className="p-4 bg-red-50/50 border border-red-100 rounded-xl">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider font-sans">DITOLAK (REJECTED)</span>
                          <span className="text-lg font-extrabold text-red-700 mt-1 block font-sans">
                            {submissions.filter(s => s.status === 'Rejected').length}
                          </span>
                        </div>
                        <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">SKOR REKOMENDASI &gt; 80</span>
                          <span className="text-lg font-extrabold text-blue-700 mt-1 block">
                            {submissions.filter(s => s.reviewScore >= 80).length}
                          </span>
                        </div>
                      </div>

                      {/* FILTERS TOOLBAR */}
                      <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col md:flex-row gap-3 text-left">
                        <div className="flex-1 relative">
                          <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider mb-1">Cari Naskah</span>
                          <div className="relative">
                            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                            <input 
                              type="text"
                              placeholder="Cari ID, Judul, Penulis, Lembaga..."
                              value={adminAbsSearch}
                              onChange={e => setAdminAbsSearch(e.target.value)}
                              className="w-full pl-9 pr-3 py-1.5 focus:outline-none bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:border-blue-450 transition-all font-sans text-slate-800"
                            />
                          </div>
                        </div>

                        <div className="w-full md:w-48">
                          <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider mb-1">Kluster Topik (Track)</span>
                          <select
                            value={adminAbsTrackFilter}
                            onChange={e => setAdminAbsTrackFilter(e.target.value)}
                            className="w-full px-2 py-1.5 focus:outline-none bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:border-blue-450 transition-all cursor-pointer font-sans text-slate-800"
                          >
                            <option value="all">Semua kluster topik</option>
                            {config.conferenceTracks.map(track => (
                              <option key={track.id} value={track.id}>{track.nameEn}</option>
                            ))}
                          </select>
                        </div>

                        <div className="w-full md:w-40">
                          <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider mb-1">Status AI</span>
                          <select
                            value={adminAbsStatusFilter}
                            onChange={e => setAdminAbsStatusFilter(e.target.value as any)}
                            className="w-full px-2 py-1.5 focus:outline-none bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:border-blue-450 transition-all cursor-pointer font-sans text-slate-800"
                          >
                            <option value="all">Semua status</option>
                            <option value="Accepted">Accepted (Disetujui)</option>
                            <option value="Revision">Revision (Revisi)</option>
                            <option value="Rejected">Rejected (Ditolak)</option>
                          </select>
                        </div>
                      </div>

                      {/* DATA TABLE */}
                      <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-3xs text-left font-sans">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 text-slate-400 uppercase tracking-widest text-[9px] font-bold border-b border-slate-200">
                              <th className="p-4 text-slate-450">ID / Tanggal</th>
                              <th className="p-4 text-slate-450">Presenter &amp; Lembaga</th>
                              <th className="p-4 text-slate-450">Topik &amp; Judul Paper</th>
                              <th className="p-4 text-center text-slate-450">Score AI</th>
                              <th className="p-4 text-center text-slate-450">Status</th>
                              <th className="p-4 text-center text-slate-450">Tindakan</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {(() => {
                              const filtered = submissions.filter(sub => {
                                const q = adminAbsSearch.toLowerCase().trim();
                                const matchesSearch = q === '' || 
                                  sub.id.toLowerCase().includes(q) ||
                                  sub.presenterName.toLowerCase().includes(q) ||
                                  sub.presenterEmail.toLowerCase().includes(q) ||
                                  sub.institution.toLowerCase().includes(q) ||
                                  sub.title.toLowerCase().includes(q) ||
                                  sub.keywords.toLowerCase().includes(q);

                                const matchesTrack = adminAbsTrackFilter === 'all' || sub.track === adminAbsTrackFilter;
                                const matchesStatus = adminAbsStatusFilter === 'all' || sub.status === adminAbsStatusFilter;

                                return matchesSearch && matchesTrack && matchesStatus;
                              });

                              if (filtered.length === 0) {
                                return (
                                  <tr>
                                    <td colSpan={6} className="p-10 text-center text-slate-450 italic">
                                      Tidak ada data naskah abstrak yang cocok dengan hasil pencarian dan status di atas.
                                    </td>
                                  </tr>
                                );
                              }

                              return filtered.map((sub, sIdx) => {
                                return (
                                  <tr key={sub.id || sIdx} className="hover:bg-slate-50/70 transition-all">
                                    <td className="p-4 font-normal">
                                      <span className="font-mono font-extrabold text-blue-700 block">{sub.id}</span>
                                      <span className="text-[10px] text-slate-400 block mt-0.5">{new Date(sub.submittedAt).toLocaleDateString()}</span>
                                    </td>
                                    <td className="p-4">
                                      <div className="font-bold text-slate-900">{sub.presenterName}</div>
                                      <div className="text-[10px] text-slate-400">{sub.institution}</div>
                                      <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{sub.presenterEmail}</div>
                                    </td>
                                    <td className="p-4 max-w-sm">
                                      <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50/70 px-1.5 py-0.5 rounded border border-indigo-100 inline-block uppercase mb-1.5">
                                        Track: {sub.track}
                                      </span>
                                      <div className="font-bold text-slate-800 italic line-clamp-2">"{sub.title}"</div>
                                    </td>
                                    <td className="p-4 text-center">
                                      <div className="text-sm font-extrabold text-indigo-700">{sub.reviewScore}</div>
                                      <div className="text-[9px] text-slate-400 mt-0.5">Grammar: {sub.grammarRating}/5</div>
                                      <div className="text-[9px] text-slate-400">Novelty: {sub.noveltyRating}/5</div>
                                    </td>
                                    <td className="p-4 text-center whitespace-nowrap">
                                      <span className={`inline-block px-2.5 py-1 rounded text-[10px] font-extrabold uppercase tracking-wide border ${
                                        sub.status === 'Accepted' ? 'bg-emerald-50 text-emerald-700 border border-emerald-150' :
                                        sub.status === 'Revision' ? 'bg-yellow-50 text-yellow-700 border border-yellow-150' : 'bg-red-50 text-red-700 border border-red-150'
                                      }`}>{sub.status}</span>
                                    </td>
                                    <td className="p-4 text-center">
                                      <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5 lg:whitespace-nowrap">
                                        <button 
                                          type="button"
                                          onClick={() => {
                                            setAdminSelectedAbstract(sub);
                                            setIsEditingAbstract(false);
                                            setEditedAbstract(sub);
                                          }}
                                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-750 font-extrabold text-[11px] rounded-lg border border-blue-200 cursor-pointer shadow-3xs transition-all tracking-wide"
                                        >
                                          <span>👁️ Detail &amp; Edit</span>
                                        </button>

                                        {adminAbsConfirmDeleteId === sub.id ? (
                                          <div className="flex items-center gap-1 justify-center shrink-0">
                                            <button 
                                              onClick={() => handleDeleteSubmission(sub.id)}
                                              disabled={adminAbsDeleteLoadingId === sub.id}
                                              className="px-2 py-1 bg-red-650 hover:bg-red-750 text-white font-extrabold text-[10px] rounded border border-red-700 cursor-pointer disabled:opacity-50 font-sans"
                                            >
                                              {adminAbsDeleteLoadingId === sub.id ? '...' : 'Yakin'}
                                            </button>
                                            <button 
                                              onClick={() => setAdminAbsConfirmDeleteId(null)}
                                              className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-705 font-extrabold text-[10px] rounded border border-slate-300 cursor-pointer font-sans"
                                            >
                                              Batal
                                            </button>
                                          </div>
                                        ) : (
                                          <button 
                                            type="button"
                                            onClick={() => setAdminAbsConfirmDeleteId(sub.id)}
                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-655 font-extrabold text-[11px] rounded-lg border border-red-250 cursor-pointer shadow-3xs transition-all tracking-wide"
                                          >
                                            <span>🗑️ Hapus</span>
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              });
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* CREDENTIALS CONFIG SUBTAB */}
                  {adminSubTab === 'credentials' && (
                    <div className="space-y-6 text-left animate-fade-in">
                      <div className="border-b border-slate-100 pb-4">
                        <h3 className="text-base font-bold text-slate-900">Keamanan &amp; Kredensial Masuk Admin</h3>
                        <p className="text-xs text-slate-500 mt-1">
                          Perbarui nama pengguna (username) dan kata sandi (password) Anda untuk menjaga keamanan akses ke seluruh fitur administrasi IBEC Hub secara penuh.
                        </p>
                      </div>

                      {credsSuccessMessage && (
                        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-start gap-2.5 text-xs font-semibold leading-relaxed">
                          <span className="text-sm">✅</span>
                          <div>{credsSuccessMessage}</div>
                        </div>
                      )}

                      {credsErrorMessage && (
                        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-start gap-2.5 text-xs font-semibold leading-relaxed">
                          <span className="text-sm">❌</span>
                          <div>{credsErrorMessage}</div>
                        </div>
                      )}

                      <form onSubmit={handleSaveAdminCredentials} className="space-y-5">
                        <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                          <div className="flex items-center gap-1.5 border-b border-slate-200/60 pb-2.5">
                            <span className="p-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold leading-none">🔑</span>
                            <span className="text-xs font-extrabold text-slate-800 uppercase tracking-widest">Formulir Kredensial Baru</span>
                          </div>

                          <div className="grid grid-cols-1 gap-4">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Nama Pengguna (Username) Baru</label>
                              <input 
                                type="text"
                                value={newAdminUsername}
                                onChange={e => setNewAdminUsername(e.target.value)}
                                className="w-full px-4 py-2.5 bg-white border border-slate-250 rounded-xl text-xs font-bold focus:outline-none focus:border-blue-500 text-slate-800"
                                placeholder="misal: panitia_ibec"
                                disabled={credsLoading}
                              />
                              <span className="text-[10px] text-slate-450 mt-1.5 block leading-relaxed">Gunakan nama pengguna yang unik dan mudah diingat oleh komite inti program.</span>
                            </div>

                            <hr className="border-slate-200/60" />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Kata Sandi (Password) Baru</label>
                                <input 
                                  type="password"
                                  value={newAdminPassword}
                                  onChange={e => setNewAdminPassword(e.target.value)}
                                  className="w-full px-4 py-2.5 bg-white border border-slate-250 rounded-xl text-xs font-bold focus:outline-none focus:border-blue-500 text-slate-800"
                                  placeholder="••••••••"
                                  disabled={credsLoading}
                                />
                                <span className="text-[10px] text-slate-450 mt-1.5 block leading-relaxed">Buat kata sandi minimal 6 karakter dengan kombinasi angka dan huruf.</span>
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Konfirmasi Kata Sandi Baru</label>
                                <input 
                                  type="password"
                                  value={confirmAdminPassword}
                                  onChange={e => setConfirmAdminPassword(e.target.value)}
                                  className="w-full px-4 py-2.5 bg-white border border-slate-250 rounded-xl text-xs font-bold focus:outline-none focus:border-blue-500 text-slate-800"
                                  placeholder="••••••••"
                                  disabled={credsLoading}
                                />
                                <span className="text-[10px] text-slate-450 mt-1.5 block leading-relaxed">Masukkan kembali kata sandi baru untuk memastikan kesesuaian ketikan.</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <button 
                            type="submit"
                            disabled={credsLoading}
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                          >
                            <span>{credsLoading ? 'Menyimpan...' : '🔐 Perbarui Kredensial Akses'}</span>
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Save Bottom Floating Indicator Bar */}
                  <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 italic">⚠️ Pastikan menekan tombol "Simpan Semua" setelah mengubah data di atas.</span>
                    <button 
                      type="button"
                      onClick={() => handleSaveConfig(config)}
                      disabled={adminSaving}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      💾 Simpan & Sinkronkan
                    </button>
                  </div>

                </div>

              </div>
              
              </>
              )}
            </div>
          </section>
        )}

      </main>

      {/* Persistent Beautiful Footer */}
      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 mt-20" id="main-footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            
            {/* Branding Column */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {config.logoUrl ? (
                  <img 
                    src={config.logoUrl} 
                    alt="Logo" 
                    className="w-7 h-7 object-contain rounded-md bg-white p-0.5"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center text-white font-extrabold text-xs tracking-wider">
                    {config.logoAbbreviation || 'I'}
                  </div>
                )}
                <span className="font-extrabold text-white text-lg tracking-tight">{config.logoText || 'IBEC 2026'} Hub</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {lang === 'id' ? config.footerDescriptionId : config.footerDescriptionEn}
              </p>
              <div className="flex space-x-3">
                <span className="p-1 px-2.5 bg-slate-800 text-slate-300 rounded text-[10px] font-bold border border-slate-700 uppercase">
                  V3.5.2 Stable
                </span>
                <span className="p-1 px-2.5 bg-blue-950 text-blue-300 rounded text-[10px] font-bold border border-blue-900/50 uppercase">
                  SSL Secure
                </span>
              </div>
            </div>

            {/* Quick Navigation Pages */}
            <div className="space-y-3">
              <span className="font-extrabold text-slate-300 text-xs uppercase tracking-widest block">Conference Pages</span>
              <ul className="space-y-1.5 text-xs">
                <li><a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('info'); }} className="hover:text-white transition-all">Homepage Profile & Keynotes</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('register'); }} className="hover:text-white transition-all">Attendee Seat Registration</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('abstract'); }} className="hover:text-white transition-all">Autosave Peer-Review Tool</a></li>
                <li><a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('database'); }} className="hover:text-white transition-all">Search Registered Databases</a></li>
              </ul>
            </div>

            {/* Program Track Links */}
            <div className="space-y-3">
              <span className="font-extrabold text-slate-300 text-xs uppercase tracking-widest block">Main Key Research Tracks</span>
              <ul className="space-y-1.5 text-xs text-slate-400">
                {config.conferenceTracks.map((tItem, idx) => (
                  <li key={idx} className="cursor-pointer hover:text-white transition-all" onClick={() => setActiveTab('info')}>
                    {lang === 'id' ? tItem.nameId : tItem.nameEn}
                  </li>
                ))}
              </ul>
            </div>

            {/* Secretariat Information Info */}
            <div className="space-y-3">
              <span className="font-extrabold text-slate-300 text-xs uppercase tracking-widest block">Secretariat Office</span>
              <p className="text-xs text-slate-400 leading-relaxed">
                {lang === 'id' ? config.footerSecretariatId : config.footerSecretariatEn}
              </p>
              <div className="text-[11px] space-y-1 font-mono">
                {config.footerEmail && (
                  <div className="flex items-center gap-1 text-slate-300">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{config.footerEmail}</span>
                  </div>
                )}
                {config.footerPhone && (
                  <div className="flex items-center gap-1 text-slate-300">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{config.footerPhone}</span>
                  </div>
                )}
                {config.footerAddress && (
                  <div className="flex items-center gap-1 text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{config.footerAddress}</span>
                  </div>
                )}
              </div>
            </div>

          </div>

          <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 font-medium">
            <p>{lang === 'id' ? config.footerCopyrightId : config.footerCopyrightEn}</p>
            <div className="flex space-x-6 mt-4 sm:mt-0 font-bold uppercase tracking-wider text-[10px]">
              <span className="hover:text-slate-300 cursor-pointer">Terms of Service</span>
              <span className="hover:text-slate-300 cursor-pointer">Privacy Protocol</span>
              <span className="hover:text-slate-300 cursor-pointer">DPR / GDPR Compliant</span>
            </div>
          </div>

        </div>
      </footer>

      {/* Detail Bukti Pembayaran Modal Overlay */}
      {adminSelectedPaymentProof && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 overflow-hidden shadow-2xl animate-fade-in text-left">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                  {lang === 'id' ? 'Konfirmasi Bukti Pembayaran Resmi' : 'Official Payment Receipt Proof'}
                </h4>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  ID Registrasi: {adminSelectedPaymentProof.id}
                </p>
              </div>
              <button 
                onClick={() => setAdminSelectedPaymentProof(null)}
                className="p-1 px-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-all cursor-pointer font-bold border-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Details */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-150">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Nama Lengkap</span>
                  <span className="font-bold text-slate-900 block mt-0.5">{adminSelectedPaymentProof.name}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Peran (Role) / Kategori</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="inline-block px-2 py-0.5 font-bold uppercase text-[9px] rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                      {adminSelectedPaymentProof.role}
                    </span>
                    <span className={`inline-block px-2 py-0.5 font-bold uppercase text-[9px] rounded-md border ${
                      adminSelectedPaymentProof.category === 'mitra' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {adminSelectedPaymentProof.category === 'mitra' ? 'MITRA' : 'UMUM'}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Email</span>
                  <span className="font-semibold text-slate-700 block mt-0.5">{adminSelectedPaymentProof.email}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Lembaga / Afiliasi / Kontak</span>
                  <span className="font-semibold text-slate-700 block mt-0.5 truncate">{adminSelectedPaymentProof.institution} ({adminSelectedPaymentProof.phone})</span>
                </div>
              </div>

              {/* Image box/Receipt display */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Format Dokumen Pembayaran (JPG/PNG/JPEG):</span>
                <div className="w-full h-80 rounded-xl overflow-hidden bg-slate-100 border border-slate-200/80 flex items-center justify-center relative group p-2">
                  <img 
                    src={adminSelectedPaymentProof.paymentProof} 
                    alt="Uploaded payment proof raw representation"
                    className="max-w-full max-h-full object-contain rounded-lg shadow-sm"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all">
                    <a 
                      href={adminSelectedPaymentProof.paymentProof} 
                      download={`BUKTI-${adminSelectedPaymentProof.id}.png`}
                      className="px-3 py-1.5 bg-slate-900/90 text-white hover:bg-black font-bold text-[10px] rounded-lg border border-slate-800 shadow-lg cursor-pointer"
                    >
                      Unduh Berkas 💾
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer buttons */}
            <div className="px-6 py-4.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setAdminSelectedPaymentProof(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition-all cursor-pointer"
              >
                {lang === 'id' ? 'Tutup Pratinjau' : 'Close Preview'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Detail Hasil Upload & Evaluasi Abstrak Modal Overlay */}
      {adminSelectedAbstract && (
        <div className="fixed inset-0 bg-slate-900/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 overflow-hidden shadow-2xl animate-fade-in text-left flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                  Detail &amp; Laporan Peer-Review AI Abstrak
                </h4>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  ID Abstrak: <span className="font-mono text-blue-700 font-extrabold">{adminSelectedAbstract.id}</span> • Diunggah: {new Date(adminSelectedAbstract.submittedAt).toLocaleDateString()}
                </p>
              </div>
              <button 
                onClick={() => setAdminSelectedAbstract(null)}
                className="p-1 px-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-all cursor-pointer font-bold border-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content */}
            {isEditingAbstract && editedAbstract ? (
              <form onSubmit={async (e) => {
                e.preventDefault();
                const ok = await handleUpdateSubmission(editedAbstract);
                if (ok) {
                  setAdminSelectedAbstract(editedAbstract);
                  setIsEditingAbstract(false);
                }
              }} className="p-6 space-y-5 overflow-y-auto font-sans flex-1">
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-[11px] font-bold leading-relaxed flex items-start gap-2.5">
                  <span>ℹ️</span>
                  <div>
                    Anda berada dalam Mode Edit. Mengubah data pendaftaran draf abstrak atau menyesuaikan nilai akumulasi/ulasan bot untuk memperbarui status penerimaan makalah penulis.
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Penulis Utama</label>
                    <input 
                      type="text"
                      className="w-full px-3 py-1.5 bg-white border border-slate-250 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                      value={editedAbstract.presenterName}
                      onChange={e => setEditedAbstract({ ...editedAbstract, presenterName: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Email Kontak</label>
                    <input 
                      type="email"
                      className="w-full px-3 py-1.5 bg-white border border-slate-250 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                      value={editedAbstract.presenterEmail}
                      onChange={e => setEditedAbstract({ ...editedAbstract, presenterEmail: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Afiliasi / Universitas</label>
                    <input 
                      type="text"
                      className="w-full px-3 py-1.5 bg-white border border-slate-250 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                      value={editedAbstract.institution}
                      onChange={e => setEditedAbstract({ ...editedAbstract, institution: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Topik Konferensi (Track Area)</label>
                    <select
                      className="w-full px-3 py-1.5 bg-white border border-slate-250 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                      value={editedAbstract.track}
                      onChange={e => setEditedAbstract({ ...editedAbstract, track: e.target.value })}
                      required
                    >
                      {config.conferenceTracks.map(track => (
                        <option key={track.id} value={track.id}>{track.nameEn}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <hr className="border-slate-100" />

                <div className="space-y-4 text-left">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Judul Artikel Ilmiah</label>
                    <input 
                      type="text"
                      className="w-full px-3 py-1.5 bg-white border border-slate-250 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                      value={editedAbstract.title}
                      onChange={e => setEditedAbstract({ ...editedAbstract, title: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Isi Teks Abstrak</label>
                    <textarea 
                      className="w-full h-32 px-3 py-1.5 bg-white border border-slate-250 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 leading-relaxed"
                      value={editedAbstract.abstractText}
                      onChange={e => setEditedAbstract({ ...editedAbstract, abstractText: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Kata Kunci (Keywords)</label>
                    <input 
                      type="text"
                      className="w-full px-3 py-1.5 bg-white border border-slate-250 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                      value={editedAbstract.keywords}
                      onChange={e => setEditedAbstract({ ...editedAbstract, keywords: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <hr className="border-slate-100" />

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4 text-left font-sans">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Penilaian &amp; Keputusan Komite</span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Rekomendasi Status</label>
                      <select
                        className="w-full px-3 py-1.5 bg-white border border-slate-250 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                        value={editedAbstract.status}
                        onChange={e => setEditedAbstract({ ...editedAbstract, status: e.target.value as any })}
                        required
                      >
                        <option value="Accepted">Accepted (Disetujui)</option>
                        <option value="Revision">Revision (Butuh Revisi)</option>
                        <option value="Rejected">Rejected (Ditolak)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Skor Akumulasi Peer-Review (0-100)</label>
                      <input 
                        type="number"
                        min="0"
                        max="100"
                        className="w-full px-3 py-1.5 bg-white border border-slate-250 rounded-lg text-xs font-bold text-indigo-700 focus:outline-none focus:border-blue-500"
                        value={editedAbstract.reviewScore}
                        onChange={e => setEditedAbstract({ ...editedAbstract, reviewScore: Number(e.target.value) })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-450 uppercase mb-1">Novelty (1-5)</label>
                      <input 
                        type="number"
                        min="1"
                        max="5"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-center text-slate-800 focus:outline-none focus:border-blue-500"
                        value={editedAbstract.noveltyRating}
                        onChange={e => setEditedAbstract({ ...editedAbstract, noveltyRating: Number(e.target.value) })}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-450 uppercase mb-1">Clarity (1-5)</label>
                      <input 
                        type="number"
                        min="1"
                        max="5"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-center text-slate-800 focus:outline-none focus:border-blue-500"
                        value={editedAbstract.clarityRating}
                        onChange={e => setEditedAbstract({ ...editedAbstract, clarityRating: Number(e.target.value) })}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-450 uppercase mb-1">Grammar (1-5)</label>
                      <input 
                        type="number"
                        min="1"
                        max="5"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-center text-slate-800 focus:outline-none focus:border-blue-500"
                        value={editedAbstract.grammarRating}
                        onChange={e => setEditedAbstract({ ...editedAbstract, grammarRating: Number(e.target.value) })}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nama Reviewer / Peer-Review ID</label>
                    <input 
                      type="text"
                      className="w-full px-3 py-1.5 bg-white border border-slate-250 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                      value={editedAbstract.peerReviewer}
                      onChange={e => setEditedAbstract({ ...editedAbstract, peerReviewer: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Ulasan Komparatif AI</label>
                    <textarea 
                      className="w-full h-20 px-3 py-1.5 bg-white border border-slate-250 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 leading-relaxed italic"
                      value={editedAbstract.feedback}
                      onChange={e => setEditedAbstract({ ...editedAbstract, feedback: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Saran Tindak Lanjut untuk Penulis</label>
                    <textarea 
                      className="w-full h-20 px-3 py-1.5 bg-white border border-slate-250 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 leading-relaxed"
                      value={editedAbstract.suggestions}
                      onChange={e => setEditedAbstract({ ...editedAbstract, suggestions: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Submit and Batal buttons inside the form */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingAbstract(false);
                      setEditedAbstract(adminSelectedAbstract);
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-250 transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer border border-blue-700"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="p-6 space-y-5 overflow-y-auto font-sans flex-1">
                  
                  {/* Writer credentials card */}
                  <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-150 text-left">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Penulis Utama</span>
                      <span className="font-bold text-slate-900 block mt-0.5">{adminSelectedAbstract.presenterName}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Topik Konferensi (Track Area)</span>
                      <span className="font-bold text-indigo-700 block mt-0.5">{adminSelectedAbstract.track}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Email Kontak</span>
                      <span className="font-semibold text-slate-700 block mt-0.5">{adminSelectedAbstract.presenterEmail}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">Afiliasi / Universitas</span>
                      <span className="font-semibold text-slate-700 block mt-0.5 truncate">{adminSelectedAbstract.institution}</span>
                    </div>
                  </div>

                  {/* Title & Essay Content box */}
                  <div className="space-y-2 bg-slate-905 text-slate-100 p-5 rounded-2xl border border-slate-800 shadow-inner relative text-left">
                    <span className="text-[8px] font-extrabold text-slate-500 uppercase tracking-widest absolute top-3.5 right-4 z-10">Abstract Draft</span>
                    <div className="border-b border-slate-800 pb-3">
                      <span className="text-[10px] text-indigo-400 font-bold block uppercase tracking-wide">Judul Artikel Ilmiah:</span>
                      <h5 className="font-extrabold text-sm text-white italic mt-1 font-serif leading-snug">"{adminSelectedAbstract.title}"</h5>
                    </div>
                    <div className="pt-2">
                      <span className="text-[10px] text-indigo-400 font-bold block uppercase tracking-wide mb-1.5">Isi Teks Abstrak:</span>
                      <p className="text-slate-300 text-xs leading-relaxed font-sans max-h-40 overflow-y-auto pr-2 scrollbar-zinc">
                        {adminSelectedAbstract.abstractText}
                      </p>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono pt-3 border-t border-slate-900 flex gap-1">
                      <span className="text-indigo-400/80 font-bold">Kata Kunci (Keywords):</span>
                      <span>{adminSelectedAbstract.keywords}</span>
                    </div>
                  </div>

                  {/* AI Peer review result section */}
                  <div className="border border-slate-200 rounded-2xl p-5 space-y-4 text-left">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Penilaian Robot AI Otomatis</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-405">Rekomendasi Status:</span>
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide border ${
                          adminSelectedAbstract.status === 'Accepted' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                          adminSelectedAbstract.status === 'Revision' ? 'bg-yellow-50 text-yellow-700 border-yellow-105' : 'bg-red-50 text-red-750 border-red-105'
                        }`}>{adminSelectedAbstract.status}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Rating parameters */}
                      <div className="space-y-3">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Metrik Penilaian</span>
                        
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">Kebaruan Ilmiah (Novelty)</span>
                          <div className="flex items-center space-x-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star 
                                key={i} 
                                className={`w-3.5 h-3.5 ${
                                  i < adminSelectedAbstract.noveltyRating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200'
                                }`} 
                              />
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">Kejelasan Masalah (Clarity / Logic)</span>
                          <div className="flex items-center space-x-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star 
                                key={i} 
                                className={`w-3.5 h-3.5 ${
                                  i < adminSelectedAbstract.clarityRating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200'
                                }`} 
                              />
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">Tata Bahasa (Grammar Structure)</span>
                          <div className="flex items-center space-x-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star 
                                key={i} 
                                className={`w-3.5 h-3.5 ${
                                  i < adminSelectedAbstract.grammarRating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200'
                                }`} 
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Overal rating */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 flex flex-col justify-center items-center text-center">
                        <span className="text-[9px] font-bold text-slate-405 block uppercase tracking-widest">SKOR AKUMULASI PEER-REVIEW</span>
                        <div className="flex items-baseline space-x-0.5 mt-2">
                          <span className="text-3xl font-black text-indigo-700 tracking-tight">{adminSelectedAbstract.reviewScore}</span>
                          <span className="text-xs font-semibold text-slate-400">/ 100</span>
                        </div>
                        <span className="text-[9px] text-slate-400 font-mono mt-1 block font-sans">Review ID: {adminSelectedAbstract.peerReviewer}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-3 border-t border-slate-100 text-xs">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Ulasan Komparatif AI:</span>
                      <p className="bg-slate-50 p-3 rounded-lg text-slate-700 leading-relaxed italic border border-slate-200">
                        "{adminSelectedAbstract.feedback}"
                      </p>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <span className="text-[9px] font-bold text-slate-405 uppercase tracking-widest block">Saran Tindak Lanjut untuk Penulis:</span>
                      <p className="bg-indigo-50/50 text-indigo-950 p-3 rounded-lg leading-relaxed border border-indigo-100">
                        {adminSelectedAbstract.suggestions}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4.5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between shrink-0">
                  {adminAbsConfirmDeleteId === adminSelectedAbstract.id ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={async () => {
                          await handleDeleteSubmission(adminSelectedAbstract.id);
                          setAdminSelectedAbstract(null);
                        }}
                        className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl"
                      >
                        {adminAbsDeleteLoadingId === adminSelectedAbstract.id ? 'Hapus...' : 'Ya, Hapus Permanen'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdminAbsConfirmDeleteId(null)}
                        className="px-3 py-1.5 bg-slate-200 text-slate-750 font-bold text-xs rounded-xl"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAdminAbsConfirmDeleteId(adminSelectedAbstract.id)}
                      className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold text-xs rounded-xl transition-all"
                    >
                      🗑️ Hapus Makalah
                    </button>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingAbstract(true);
                        setEditedAbstract({ ...adminSelectedAbstract });
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer border border-blue-700 flex items-center gap-1"
                    >
                      ✏️ Edit Penilaian &amp; Data
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdminSelectedAbstract(null)}
                      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 transition-all cursor-pointer"
                    >
                      Tutup Review
                    </button>
                  </div>
                </div>
              </>
            )}

          </div>
        </div>
      )}

      {/* Poster Zoom Modal Layer */}
      {isPosterZoomed && config.posterUrl && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4 sm:p-6 animate-fade-in cursor-zoom-out"
          onClick={() => setIsPosterZoomed(false)}
        >
          <div className="relative max-w-5xl w-full max-h-[92vh] flex flex-col justify-center items-center">
            {/* Close button top-right */}
            <button
              onClick={() => setIsPosterZoomed(false)}
              className="absolute -top-12 right-0 sm:-right-12 bg-white/10 hover:bg-white/20 text-white rounded-full p-2.5 transition-all outline-none"
              title="Close poster"
            >
              <X className="w-5 h-5" />
            </button>
            <div 
              className="bg-white/5 p-2 rounded-2xl border border-white/10 shadow-2xl overflow-hidden max-h-[85vh] flex justify-center items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img 
                src={config.posterUrl} 
                alt="IBEC 2026 Official Poster Full" 
                className="max-h-[80vh] w-auto object-contain rounded-xl select-none"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
