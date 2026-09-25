export type ViewMode =
  | 'home'
  | 'login'
  | 'otp'
  | 'register'
  | 'dashboard'
  | 'upload'
  | 'queue';

export interface PatientProfile {
  name: string;
  phone: string;
  age: number;
  gender: string;
  address: string;
  language: string;
  email?: string;
  emergencyContact?: string;
  hospitalCode?: string;
  hospitalName?: string;
  hospitalPin?: string;
  hospitalArea?: string;
  tokenNumber: string;
  queuePosition: number;
  counterNumber: string;
  verified: boolean;
}

export interface MedicationItem {
  id: string;
  name: string;
  dosage: string;
  form: string;
  instructions: string;
  batchNumber: string;
  status: 'Bottled' | 'Ready' | 'Weighing' | 'Compounding & Sealed' | 'Safety Inspected' | 'Label Printing' | 'Completed';
  matchPercent?: number;
  category?: string;
}

export interface PrescriptionOrder {
  orderId: string;
  doctorName: string;
  doctorClinic: string;
  doctorSpecialty: string;
  refillInfo: string;
  orderDate: string;
  status: 'Preparing' | 'Ready' | 'Compounding' | 'Dispensed';
  progressPercent: number;
  currentStage: number; // 1 to 4
  medications: MedicationItem[];
  pharmacist: {
    name: string;
    title: string;
    license: string;
    counter: string;
    avatarUrl: string;
    statusNote: string;
  };
}

export interface AttachedDoc {
  fileName: string;
  fileSize: string;
  fileType: string;
  uploadTime: string;
  previewUrl?: string;
}
