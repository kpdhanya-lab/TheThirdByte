-- ==============================================================================
-- Migration: Create Prescriptions and Medications Tables
-- Target: Supabase (PostgreSQL)
-- Purpose: Store digitized prescription extraction data from Groq Vision AI
-- Matches both requested schema and Groq's extraction JSON fields exactly
-- ==============================================================================

-- 1. Enable pgcrypto for UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- Table: prescriptions
-- Stores prescription header metadata, patient details, prescriber details,
-- and triage verification status.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

    -- Patient Information
    patient_name TEXT,
    patient_address TEXT,
    patient_dob TEXT,
    patient_age TEXT,                                -- Extracted patient age (e.g. "68 years old")
    patient_weight TEXT,                             -- Extracted patient weight (e.g. "58 kg")
    allergies JSONB DEFAULT '[]'::jsonb,             -- Patient allergies array or notes

    -- Prescriber / Doctor Information
    doctor_name TEXT,                                -- Primary doctor name column
    prescriber_name TEXT,                            -- Groq JSON field alias (auto-synced)
    doctor_address TEXT,                             -- Doctor clinic/address
    prescriber_clinic TEXT,                          -- Groq JSON field alias (auto-synced)
    npi_number TEXT,                                 -- National Provider Identifier
    dea_number TEXT,                                 -- DEA registration number

    -- Prescription Verification & Dates
    signature_present TEXT CHECK (
        signature_present IS NULL OR 
        signature_present IN ('present', 'absent', 'unclear')
    ),
    date_of_issue TEXT,                              -- Primary issue date column
    date_written TEXT,                               -- Groq JSON field alias (auto-synced)

    -- Workflow Status & Raw Payload Backup
    status TEXT DEFAULT 'pending_review' CHECK (
        status IN ('pending_review', 'verified', 'flagged', 'dispensed', 'rejected')
    ),
    raw_extracted_json JSONB                         -- Full raw AI JSON payload for audit trail
);

-- ==============================================================================
-- Table: medications
-- Stores individual medication line items, directions, forms, and dosage safety triage
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.medications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,

    -- Medication Details (matches Image 1: Medication Name, Strength & Form, Qty)
    medication_name TEXT,
    strength TEXT,
    dosage_form TEXT,
    quantity_to_dispense TEXT,                       -- Primary dispense quantity column
    quantity TEXT,                                   -- Groq JSON field alias (auto-synced)

    -- Instructions & Prescriber Notes (matches Image 1: Sig / Directions)
    sig TEXT,
    refill_info TEXT,

    -- Clinical Quality & Dosage Safety Triage (matches Image 1: Legibility & Safety)
    legibility TEXT CHECK (
        legibility IS NULL OR 
        legibility IN ('legible', 'partially_legible', 'illegible')
    ),
    dosage_safety_flag TEXT CHECK (
        dosage_safety_flag IS NULL OR 
        dosage_safety_flag IN ('none', 'review_recommended', 'not_determinable')
    ),
    dosage_safety_reason TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- Synchronization Triggers: Seamless Compatibility with Groq JSON Field Names
-- Ensures that inserting either doctor_name or prescriber_name, date_of_issue
-- or date_written, quantity_to_dispense or quantity automatically populates both.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.sync_prescription_aliases()
RETURNS TRIGGER AS $$
BEGIN
    -- Sync Doctor / Prescriber Name
    IF NEW.doctor_name IS NULL AND NEW.prescriber_name IS NOT NULL THEN
        NEW.doctor_name := NEW.prescriber_name;
    ELSIF NEW.prescriber_name IS NULL AND NEW.doctor_name IS NOT NULL THEN
        NEW.prescriber_name := NEW.doctor_name;
    END IF;

    -- Sync Clinic / Doctor Address
    IF NEW.doctor_address IS NULL AND NEW.prescriber_clinic IS NOT NULL THEN
        NEW.doctor_address := NEW.prescriber_clinic;
    ELSIF NEW.prescriber_clinic IS NULL AND NEW.doctor_address IS NOT NULL THEN
        NEW.prescriber_clinic := NEW.doctor_address;
    END IF;

    -- Sync Date of Issue / Date Written
    IF NEW.date_of_issue IS NULL AND NEW.date_written IS NOT NULL THEN
        NEW.date_of_issue := NEW.date_written;
    ELSIF NEW.date_written IS NULL AND NEW.date_of_issue IS NOT NULL THEN
        NEW.date_written := NEW.date_of_issue;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_prescription_aliases ON public.prescriptions;
CREATE TRIGGER trg_sync_prescription_aliases
BEFORE INSERT OR UPDATE ON public.prescriptions
FOR EACH ROW EXECUTE FUNCTION public.sync_prescription_aliases();

CREATE OR REPLACE FUNCTION public.sync_medication_aliases()
RETURNS TRIGGER AS $$
BEGIN
    -- Sync Quantity to Dispense / Quantity
    IF NEW.quantity_to_dispense IS NULL AND NEW.quantity IS NOT NULL THEN
        NEW.quantity_to_dispense := NEW.quantity;
    ELSIF NEW.quantity IS NULL AND NEW.quantity_to_dispense IS NOT NULL THEN
        NEW.quantity := NEW.quantity_to_dispense;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_medication_aliases ON public.medications;
CREATE TRIGGER trg_sync_medication_aliases
BEFORE INSERT OR UPDATE ON public.medications
FOR EACH ROW EXECUTE FUNCTION public.sync_medication_aliases();

-- ==============================================================================
-- Performance Indexes
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_prescriptions_created_at ON public.prescriptions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_name ON public.prescriptions(patient_name);
CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON public.prescriptions(status);

CREATE INDEX IF NOT EXISTS idx_medications_prescription_id ON public.medications(prescription_id);
CREATE INDEX IF NOT EXISTS idx_medications_dosage_safety_flag ON public.medications(dosage_safety_flag);
CREATE INDEX IF NOT EXISTS idx_medications_legibility ON public.medications(legibility);

-- ==============================================================================
-- Row Level Security (RLS) Policies
-- Enables secure reads and inserts for the dispensary portal workflow
-- ==============================================================================
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;

-- Allow anon and authenticated users to read and insert prescriptions & medications
CREATE POLICY "Allow anon read prescriptions" 
    ON public.prescriptions FOR SELECT 
    TO anon, authenticated 
    USING (true);

CREATE POLICY "Allow anon insert prescriptions" 
    ON public.prescriptions FOR INSERT 
    TO anon, authenticated 
    WITH CHECK (true);

CREATE POLICY "Allow anon update prescriptions" 
    ON public.prescriptions FOR UPDATE 
    TO anon, authenticated 
    USING (true);

CREATE POLICY "Allow anon read medications" 
    ON public.medications FOR SELECT 
    TO anon, authenticated 
    USING (true);

CREATE POLICY "Allow anon insert medications" 
    ON public.medications FOR INSERT 
    TO anon, authenticated 
    WITH CHECK (true);

CREATE POLICY "Allow anon update medications" 
    ON public.medications FOR UPDATE 
    TO anon, authenticated 
    USING (true);
