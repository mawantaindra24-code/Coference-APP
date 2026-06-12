export interface Registration {
  id: string;
  name: string;
  email: string;
  institution: string;
  country: string;
  phone: string;
  role: 'presenter' | 'attendee';
  category?: 'umum' | 'mitra';
  paymentProof?: string;
  registeredAt: string;
}

export interface AbstractSubmission {
  id: string;
  title: string;
  presenterName: string;
  presenterEmail: string;
  institution: string;
  track: string;
  abstractText: string;
  keywords: string;
  status: 'Accepted' | 'Revision' | 'Rejected';
  reviewScore: number;
  grammarRating: number;
  noveltyRating: number;
  clarityRating: number;
  peerReviewer: string;
  feedback: string;
  suggestions: string;
  submittedAt: string;
}

export interface ConferenceStats {
  totalRegistrations: number;
  presenters: number;
  attendees: number;
  totalAbstracts: number;
  acceptedAbstracts: number;
  umumCount?: number;
  mitraCount?: number;
}

export interface ConferenceTrack {
  id: string;
  nameEn: string;
  nameId: string;
  descriptionEn: string;
  descriptionId: string;
  iconName: string;
}

export interface ImportantDate {
  titleEn: string;
  titleId: string;
  date: string;
  badgeEn: string;
  badgeId: string;
  completed: boolean;
}

export interface KeynoteSpeaker {
  name: string;
  title: string;
  institution: string;
  imageUrl: string;
  topicEn: string;
  topicId: string;
}

export interface FrontPageConfig {
  logoText: string;
  logoAbbreviation: string;
  logoUrl: string;
  logoSubtitle?: string;
  heroTitleEn: string;
  heroTitleId: string;
  heroSubEn: string;
  heroSubId: string;
  dateVenueEn: string;
  dateVenueId: string;
  conferenceTracks: ConferenceTrack[];
  importantDates: ImportantDate[];
  keynoteSpeakers: KeynoteSpeaker[];
  registrationFees: {
    presenter: {
      domesticEarly: string;
      domesticNormal: string;
      intlEarly: string;
      intlNormal: string;
    };
    attendee: {
      domestic: string;
      intl: string;
    };
    poster?: {
      domesticEarly: string;
      domesticNormal: string;
      intlEarly: string;
      intlNormal: string;
    };
  };
  registrationFeesList?: RegistrationFeeItem[];
  countdownTarget?: string;
  countdownLabelEn?: string;
  countdownLabelId?: string;
  countdownEnabled?: boolean;
  runningLogos?: RunningLogoItem[];
  footerDescriptionEn?: string;
  footerDescriptionId?: string;
  footerSecretariatEn?: string;
  footerSecretariatId?: string;
  footerEmail?: string;
  footerPhone?: string;
  footerAddress?: string;
  footerCopyrightEn?: string;
  footerCopyrightId?: string;
  aboutTitleId?: string;
  aboutTitleEn?: string;
  aboutTextId?: string;
  aboutTextEn?: string;
  speakersSectionTitleEn?: string;
  speakersSectionTitleId?: string;
  speakersSectionSubEn?: string;
  speakersSectionSubId?: string;
  posterUrl?: string;
  posterEnabled?: boolean;
  defaultLanguage?: 'id' | 'en';
  languageSwitcherEnabled?: boolean;
  feesTitleEn?: string;
  feesTitleId?: string;
  feesNoteEn?: string;
  feesNoteId?: string;
  heroBgType?: 'gradient' | 'youtube';
  heroYoutubeId?: string;
  heroYoutubeLoop?: boolean;
  heroYoutubeOverlayOpacity?: number;
  heroRegisterBtnEn?: string;
  heroRegisterBtnId?: string;
  heroAbstractBtnEn?: string;
  heroAbstractBtnId?: string;
  heroDbBtnEn?: string;
  heroDbBtnId?: string;
  downloadMaterials?: DownloadMaterialItem[];
}

export interface DownloadMaterialItem {
  id: string;
  titleEn: string;
  titleId: string;
  descriptionEn?: string;
  descriptionId?: string;
  fileUrl: string;
  fileType: string; // e.g. PDF, DOCX, PPTX, ZIP
  fileSize: string; // e.g. 1.2 MB
  downloadsCount?: number;
  visible?: boolean;
}

export interface RunningLogoItem {
  id: string;
  name: string;
  logoUrl: string;
  linkUrl?: string;
}

export interface RegistrationFeeItem {
  id: string;
  nameEn: string;
  nameId: string;
  category: 'presenter' | 'attendee' | 'poster';
  priceDomestic: string;
  priceIntl: string;
}

