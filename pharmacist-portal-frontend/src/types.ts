export interface Pharmacist {
  id: string;
  name: string;
  licenseNumber: string;
  role: string;
  badgeCode: string;
  avatarInitials: string;
  station: string;
  securityLevel: number;
  hospitalCode?: string;
  hospitalName?: string;
  hospitalArea?: string;
}

export type PriorityLevel = 'STAT' | 'Urgent' | 'Routine' | 'Discharge';

export type PrescriptionStatus = 
  | 'Pending'
  | 'Pending Review' 
  | 'Verifying' 
  | 'Ready for Dispense' 
  | 'Dispensed' 
  | 'Flagged / Contraindication'
  | 'On Hold';

export interface Patient {
  id: string;
  name: string;
  dob: string;
  age: number;
  gender: 'M' | 'F' | 'Other';
  weightKg: number;
  allergies: string[];
  currentMedications: string[];
  conditions: string[];
  insuranceProvider: string;
  policyNumber: string;
  copayAmount: number;
}

export interface Prescription {
  rxNumber: string;
  patient: Patient;
  prescriber: {
    name: string;
    npi: string;
    clinic: string;
    phone: string;
  };
  medication: {
    name: string;
    genericName: string;
    ndc: string;
    strength: string;
    dosageForm: string;
    packageSize: number;
    schedule: 'None' | 'C-II' | 'C-III' | 'C-IV' | 'C-V';
    manufacturer: string;
    lotNumber: string;
    expirationDate: string;
  };
  sig: string; // Directions
  quantity: number;
  daysSupply: number;
  refillsRemaining: number;
  totalRefills: number;
  dateWritten: string;
  time?: string;
  dosageText?: string;
  priority: PriorityLevel;
  status: PrescriptionStatus;
  auxiliaryWarnings: string[];
  safetyAlerts?: {
    severity: 'critical' | 'warning' | 'info';
    message: string;
    details: string;
  }[];
  verifiedBy?: string;
  verifiedAt?: string;
}

export interface DispensaryTransaction {
  id: string; // e.g. TXN-2026-001
  timestamp: string;
  time: string;
  rxNumber: string;
  patientId: string;
  patientName: string;
  medicineName: string;
  dosage: string;
  quantity: string | number;
  prescriberName: string;
  pharmacistName: string;
  station: string;
  status: 'Dispensed' | 'Completed' | 'Pending';
  securityHash: string;
  details?: string;
}

export interface InventoryItem {
  id: string;
  medicationName: string;
  genericName: string;
  ndc: string;
  strength: string;
  dosageForm: string;
  schedule: string;
  stockPills: number;
  bottlesCount: number;
  parLevel: number;
  reorderPoint: number;
  locationBin: string;
  lotNumber: string;
  expiration: string;
  storageCondition: 'Room Temp (20-25°C)' | 'Refrigerated (2-8°C)' | 'Controlled Substance Vault';
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  pharmacistId: string;
  action: string;
  terminalId: string;
  details: string;
  securityHash: string;
  status: 'SUCCESS' | 'ALERT' | 'REVIEW';
}
