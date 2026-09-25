import { AttachedDoc, PatientProfile, PrescriptionOrder } from './types';

export const initialPatient: PatientProfile = {
  name: 'Eleanor Vance',
  phone: '+91 98765 43210',
  age: 34,
  gender: 'Female',
  address: '42 Kensington Mews, Flat B, New Delhi',
  language: 'English',
  email: 'eleanor@apothecary.com',
  emergencyContact: 'Marcus Vance (+91 98765 43211)',
  hospitalCode: '',
  hospitalName: '',
  hospitalArea: '',
  hospitalPin: '',
  tokenNumber: '#A024',
  queuePosition: 4,
  counterNumber: 'Counter 03',
  verified: true,
};

export const DEFAULT_PATIENT = initialPatient;

export const initialOrder: PrescriptionOrder = {
  orderId: 'RX-10245',
  doctorName: 'Dr. Aris Thorne, MD',
  doctorClinic: 'Metro Heart Clinic & Cardiology',
  doctorSpecialty: 'Internal Medicine & Cardiology',
  refillInfo: 'Refill 2 of 4',
  orderDate: 'Tuesday, Oct 24',
  status: 'Preparing',
  progressPercent: 75,
  currentStage: 3,
  medications: [
    {
      id: 'med-1',
      name: 'Amoxicillin Clavulanate 625mg',
      dosage: '625 mg',
      form: '14 film-coated tablets • Amber UV apothecary container sealed',
      instructions: 'Take 1 tablet every 12 hours with meals',
      batchNumber: '#AC-8891',
      status: 'Compounding & Sealed',
      matchPercent: 100,
      category: 'Prescription',
    },
    {
      id: 'med-2',
      name: 'Paracetamol (Acetaminophen) 500mg IP',
      dosage: '500 mg',
      form: '10 compressed blister tablets • Fast absorption formulation',
      instructions: '1 tablet as needed for headache (Max 4/day)',
      batchNumber: '#PT-3042',
      status: 'Safety Inspected',
      matchPercent: 100,
      category: 'Mild Analgesic',
    },
    {
      id: 'med-3',
      name: 'Cetirizine Hydrochloride 10mg',
      dosage: '10 mg',
      form: '5 sublingual disintegrating tablets • Seasonal relief',
      instructions: '1 tablet at bedtime if allergy flare-up occurs',
      batchNumber: '#CT-1109',
      status: 'Label Printing',
      matchPercent: 100,
      category: 'Antihistamine',
    },
  ],
  pharmacist: {
    name: 'Dr. Sarah Jenkins, RPh',
    title: 'Lead Clinical Compounding Pharmacist',
    license: 'License #PH-49821',
    counter: 'Counter 03 Dispensary',
    avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD3Qf1fWmkNJ_Z7y2XCOPn97LSF57bzUB7kD01O0hY38M4vd6ninOiPIL8cKRB3DVzILCfHzaR0ykEZvcv_-MrQW9TMbwuIv8FxPfMpwycoh2c415XeY2LyISKIGg14VZQYoamfocHyzI8KFEtkSNKm0pEI8FLDLJ_QRsq4DH7RbYb9_OYZb1I2LSi5olJqO8rqqzpuTon9y_i_8RdUoSJ47aHrLbmylPDDOb-bnrl4',
    statusNote: 'Safety check complete: No drug interactions detected. Review in progress.',
  },
};

export const SAMPLE_ORDER = initialOrder;

export const defaultDocument: AttachedDoc = {
  fileName: 'Metro_Heart_Clinic_Prescription_Thorne.pdf',
  fileSize: '3.8 MB',
  fileType: 'High Resolution Scan',
  uploadTime: '10:25 AM',
};

export const LOGO_URL = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDzqx8tJ_zpTn9Dl6FPszv5xcA331DWZu6EmYh4mXk_m5W8Qh69ZOm5M_01zBy0LhIk1cymE3ztZZIjVwECgvGCtXeN-KIurbKraPLgyLM4V4ldMXZqbQhFIuPoz0VHss2y99puCQQZUsz6dNHmUiVtpQOTE-8L0Ckom_A26KQYArlEv91p1_PE2PZtUeEedjYiDZoA0qzg73Uw0yZmMaW8Y_A91F92StrW4DpiyYz2elHj1dMdr_0DtMU-vm8d22QPBu8';

export const CAPSULE_IMG_URL = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBERcju7akUmu8DHU1ouhyZVe4rHFdCWKIXFdO2VAiEmKObtMpM8f130Abn2L5qDujuQ5bQ7-qcxWQofxDhbnZOedtiE3xxgWjmWdry9zA8uQ2Zwvln4snP2LH3hRK_l3joivq4bBOArx2XoOq9mjLF2sqFmDZpbhrJul3VK-LNIeYLLNjRvbHZelU0pT5qFFHyVpbIeJFrgdKsXESv6xXanMmFEinGbt7cGw7vMS0yr_GB5G7SyXUpk_njocC_asnomIk';
