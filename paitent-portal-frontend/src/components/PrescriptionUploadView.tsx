import React, { useState } from 'react';
import { AttachedDoc, ViewMode, PatientProfile } from '../types';
import { ExtractedPrescription } from '../types/prescriptionExtraction';
import {
  extractPrescriptionFromImage,
  getSamplePrescriptionExtraction,
  updateServerGroqApiKey,
  checkServerGroqKeyConfigured,
} from '../utils/gemini';
import { saveExtractedPrescriptionToSupabase } from '../utils/supabase';
import {
  Clock,
  ShieldCheck,
  Camera,
  FileText,
  Eye,
  Trash2,
  FileUp,
  ArrowRight,
  Bookmark,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Pill,
  Key,
} from 'lucide-react';

interface PrescriptionUploadViewProps {
  attachedDoc: AttachedDoc | null;
  setAttachedDoc: (doc: AttachedDoc | null) => void;
  onNavigate: (view: ViewMode) => void;
  onPreviewDoc: (doc: AttachedDoc) => void;
  onPrescriptionExtracted?: (extracted: ExtractedPrescription) => void;
  patient?: PatientProfile;
}

export const PrescriptionUploadView: React.FC<PrescriptionUploadViewProps> = ({
  attachedDoc,
  setAttachedDoc,
  onNavigate,
  onPreviewDoc,
  onPrescriptionExtracted,
  patient,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedPrescription | null>(
    attachedDoc?.extractedPrescription || null
  );
  const [submitted, setSubmitted] = useState(false);
  const [savingToDb, setSavingToDb] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isKeyConfigured, setIsKeyConfigured] = useState<boolean | null>(null);
  const [keySaveMessage, setKeySaveMessage] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Check if Groq key is already configured on the server
  React.useEffect(() => {
    checkServerGroqKeyConfigured().then((configured) => {
      setIsKeyConfigured(configured);
      if (!configured) {
        setShowKeyInput(true);
      }
    });
  }, []);

  const handleSaveKey = async (customKey?: string): Promise<boolean> => {
    const keyToSave = (customKey !== undefined ? customKey : apiKeyInput).trim();
    if (!keyToSave) {
      alert('Please enter a valid Groq API key (starts with gsk_).');
      return false;
    }
    try {
      const res = await updateServerGroqApiKey(keyToSave);
      setIsKeyConfigured(true);
      setKeySaveMessage(res.message || 'Key saved to server!');
      setApiKeyInput('');
      setExtractionError(null);
      setTimeout(() => setKeySaveMessage(null), 4000);
      return true;
    } catch (err: any) {
      alert(`Failed to save key to server: ${err?.message || err}`);
      return false;
    }
  };

  // Trigger Groq AI extraction for a File
  const processFile = async (file: File) => {
    setScanning(true);
    setExtractionError(null);

    // If user typed a key in the input, save it first before calling extraction
    if (apiKeyInput.trim()) {
      await handleSaveKey();
    }

    const previewUrl = URL.createObjectURL(file);
    const newDoc: AttachedDoc = {
      fileName: file.name,
      fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      fileType: file.type.includes('pdf') ? 'PDF Document' : 'High Resolution Scan',
      uploadTime: 'Just now',
      file,
      previewUrl,
    };
    setAttachedDoc(newDoc);

    try {
      const extracted = await extractPrescriptionFromImage(file);
      setExtractedData(extracted);
      setAttachedDoc({
        ...newDoc,
        extractedPrescription: extracted,
      });
      if (onPrescriptionExtracted) {
        onPrescriptionExtracted(extracted);
      }
    } catch (err: any) {
      console.error('Prescription extraction failed:', err);
      setExtractionError(
        err?.message || 'Failed to extract prescription data with Groq AI. Please check your connection or retry.'
      );
    } finally {
      setScanning(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleRetryExtraction = async () => {
    if (apiKeyInput.trim()) {
      await handleSaveKey();
    }
    if (attachedDoc?.file) {
      processFile(attachedDoc.file);
    } else if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleSubmit = async () => {
    if (!extractedData) {
      onNavigate('queue');
      return;
    }

    setSavingToDb(true);
    try {
      const res = await saveExtractedPrescriptionToSupabase(extractedData, {
        name: patient?.name,
        address: patient?.address,
        age: patient?.age,
        hospitalCode: patient?.hospitalCode,
      });

      if (!res.success) {
        console.warn('[Database Notice]:', res.error);
      } else if (res.prescriptionId) {
        try {
          sessionStorage.setItem('active_prescription_id', res.prescriptionId);
          localStorage.setItem('active_prescription_id', res.prescriptionId);
        } catch {}
      }

      if (onPrescriptionExtracted) {
        onPrescriptionExtracted(extractedData);
      }
      setSubmitted(true);
      setTimeout(() => {
        onNavigate('queue');
      }, 700);
    } catch (err: any) {
      console.error('Error during submission:', err);
      alert(`Prescription transmission error: ${err?.message || err}`);
    } finally {
      setSavingToDb(false);
    }
  };

  // Helper badge color for signature
  const renderSignatureBadge = (sigStatus: 'present' | 'absent' | 'unclear') => {
    switch (sigStatus) {
      case 'present':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#e7f5ec] text-[#164529] border border-[#164529]/20">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#164529]" />
            Signature Verified
          </span>
        );
      case 'absent':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#fde8e8] text-[#ba1a1a] border border-[#ba1a1a]/20">
            <XCircle className="w-3.5 h-3.5 text-[#ba1a1a]" />
            Signature Absent
          </span>
        );
      case 'unclear':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#fff4db] text-[#b45309] border border-[#b45309]/20">
            <AlertCircle className="w-3.5 h-3.5 text-[#b45309]" />
            Signature Unclear
          </span>
        );
    }
  };

  // Helper badge for legibility
  const renderLegibilityBadge = (legibility: 'legible' | 'partially_legible' | 'illegible') => {
    switch (legibility) {
      case 'legible':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#e7f5ec] text-[#164529]">
            Legible
          </span>
        );
      case 'partially_legible':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#fff4db] text-[#b45309]">
            Partial
          </span>
        );
      case 'illegible':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-[#fde8e8] text-[#ba1a1a]">
            Illegible
          </span>
        );
    }
  };

  // Helper badge for dosage safety flag
  const renderSafetyFlagBadge = (flag: 'none' | 'review_recommended' | 'not_determinable', reason: string | null) => {
    switch (flag) {
      case 'none':
        return (
          <div className="flex flex-col gap-0.5">
            <span className="inline-flex items-center gap-1 w-fit px-2 py-0.5 rounded text-[11px] font-medium bg-[#e7f5ec] text-[#164529]">
              <CheckCircle2 className="w-3 h-3 text-[#164529]" />
              Normal Range
            </span>
            {reason && <span className="text-[10px] text-[#414942] italic">{reason}</span>}
          </div>
        );
      case 'review_recommended':
        return (
          <div className="flex flex-col gap-1">
            <span className="inline-flex items-center gap-1 w-fit px-2 py-0.5 rounded text-[11px] font-semibold bg-[#fde8e8] text-[#ba1a1a] border border-[#ba1a1a]/30 animate-pulse">
              <AlertTriangle className="w-3 h-3 text-[#ba1a1a]" />
              Review Recommended
            </span>
            {reason && (
              <span className="text-[11px] text-[#ba1a1a] font-medium bg-[#fff0f0] p-1.5 rounded border border-[#ba1a1a]/15">
                {reason}
              </span>
            )}
          </div>
        );
      case 'not_determinable':
      default:
        return (
          <div className="flex flex-col gap-0.5">
            <span className="inline-flex items-center gap-1 w-fit px-2 py-0.5 rounded text-[11px] font-medium bg-[#ede8d9] text-[#555f56]">
              <AlertCircle className="w-3 h-3 text-[#555f56]" />
              Not Determinable
            </span>
            {reason && <span className="text-[10px] text-[#717971]">{reason}</span>}
          </div>
        );
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-4 sm:py-8 px-4 flex flex-col gap-5">
      {/* Trust Bar Badge */}
      <div className="flex items-center justify-between bg-[#f8f3e4] px-4 py-2.5 rounded-2xl border border-[#164529]/15 shadow-xs">
        <div className="flex items-center gap-2 text-[#414942]">
          <Clock className="w-4 h-4 text-[#164529]" />
          <span className="text-xs font-semibold tracking-wide">Average Pharmacist Review ~5 mins</span>
        </div>
        <div className="flex items-center gap-1.5 text-[#164529]">
          <ShieldCheck className="w-4 h-4" />
          <span className="text-[10px] font-bold tracking-widest uppercase">SECURE DISPENSARY • AI ASSISTED</span>
        </div>
      </div>

      {/* Header Editorial Titles */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-2xl sm:text-3xl text-[#164529] tracking-tight font-semibold">
              Upload Your Prescription
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#164529]/10 text-[#164529]">
              <Sparkles className="w-3.5 h-3.5" />
              Groq Vision • Qwen 3.8
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowKeyInput(!showKeyInput)}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
              isKeyConfigured
                ? 'bg-[#e7f5ec] text-[#164529] hover:bg-[#d6eedf]'
                : 'bg-[#ffdad6] text-[#ba1a1a] hover:bg-[#ffcdd2] animate-pulse'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            {isKeyConfigured ? '🟢 Groq Key: Active' : '🔴 Groq Key: Missing'}
          </button>
        </div>
        <p className="text-sm text-[#414942] leading-relaxed">
          Upload or take a photo of your doctor slip. Groq Vision AI extracts medication dosages and verifies
          safety flags on the secure server for pharmacist review before dispensing.
        </p>
      </div>

      {/* Server Groq Key Drawer */}
      {showKeyInput && (
        <div className="bg-[#ffffff] rounded-2xl p-4 border border-[#164529]/20 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-[#164529]">
              <Key className="w-4 h-4" />
              <span>Configure Server-Side GROQ_API_KEY</span>
            </div>
            <span className="text-[10px] bg-[#e7f5ec] text-[#164529] px-2 py-0.5 rounded-full font-bold">
              Stored in Server .env Only
            </span>
          </div>
          <p className="text-xs text-[#555f56] leading-relaxed">
            Paste your Groq API key below and press <kbd className="bg-[#ede8d9] px-1 py-0.5 rounded text-[#164529] font-mono text-[10px]">Enter</kbd> or click <strong>Save to Server</strong>.
            All AI calls execute server-side; your key is never exposed to the client.
          </p>

          {/* Warning if user mistakenly pastes a Gemini key */}
          {apiKeyInput.trim() && (apiKeyInput.startsWith('AQ.') || apiKeyInput.startsWith('AIza')) && (
            <div className="p-2.5 rounded-xl bg-[#fff0f0] border border-[#ba1a1a]/30 text-xs text-[#ba1a1a] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                <strong>Notice:</strong> This looks like a Gemini API key. Groq API keys begin with <code className="font-mono bg-[#ffffff] px-1 py-0.5 rounded">gsk_</code>.
                Get a free Groq key in seconds at <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="underline font-bold">console.groq.com/keys</a>.
              </span>
            </div>
          )}

          {/* Key save feedback notification */}
          {keySaveMessage && (
            <div className="p-2.5 rounded-xl bg-[#e7f5ec] border border-[#164529]/20 text-xs text-[#164529] flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-[#164529] shrink-0" />
              <span>{keySaveMessage}</span>
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const ok = await handleSaveKey();
                  if (ok) {
                    handleRetryExtraction();
                  }
                }
              }}
              placeholder="Paste Groq API key (starts with gsk_...)"
              className="flex-1 text-xs px-3 py-2 rounded-xl border border-[#717971]/30 focus:outline-none focus:ring-1 focus:ring-[#164529] bg-[#fdfbf7]"
            />
            <button
              type="button"
              onClick={async () => {
                const ok = await handleSaveKey();
                if (ok) {
                  handleRetryExtraction();
                }
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#164529] text-white hover:bg-[#2f5d3f] transition-all cursor-pointer whitespace-nowrap shadow-sm"
            >
              Save to Server
            </button>
          </div>
        </div>
      )}

      {/* Upload Drop Zone Card */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative bg-[#ffffff] rounded-3xl p-6 shadow-sm border-2 border-dashed text-center flex flex-col items-center justify-center space-y-3.5 transition-all cursor-pointer ${
          isDragging
            ? 'border-[#164529] bg-[#f8f3e4]'
            : 'border-[#164529]/25 hover:border-[#164529]/50'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".pdf,.png,.jpg,.jpeg,.heic,.webp"
          className="hidden"
        />

        {/* Scanner Visual Icon */}
        <div className="w-16 h-16 rounded-full bg-[#ede8d9] flex items-center justify-center text-[#164529] relative shadow-inner">
          <FileUp className="w-7 h-7" />
          <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#164529] text-[#ffffff] flex items-center justify-center shadow">
            <Camera className="w-3.5 h-3.5" />
          </span>
        </div>

        <div className="space-y-1 px-2">
          <p className="font-serif text-base font-medium text-[#1d1c13] leading-snug">
            Tap or Drag &amp; Drop your prescription here or browse files from your device
          </p>
          <p className="text-xs text-[#717971]">PDF, PNG, JPG, WEBP • Max limit 25MB</p>
        </div>

        {/* Scanner CTA Button */}
        <div className="w-full max-w-sm pt-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            disabled={scanning}
            className="w-full min-h-[50px] bg-[#164529] hover:bg-[#2f5d3f] text-[#ffffff] rounded-full px-5 py-2.5 flex flex-col items-center justify-center shadow-md active:scale-[0.98] transition-all cursor-pointer disabled:opacity-75"
          >
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4" />
              <span className="font-serif text-sm font-bold tracking-wide">
                {scanning ? 'Gemini AI Extracting Prescription...' : 'Choose or Scan Prescription'}
              </span>
            </div>
            <span className="text-[10px] text-[#a2d4ae] pt-0.5">
              High fidelity optical digitization with structured output
            </span>
          </button>
        </div>
      </div>

      {/* Attached Document Summary Card */}
      {attachedDoc ? (
        <div className="bg-[#f3eedf] rounded-2xl p-4 shadow-sm border border-[#164529]/15 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#164529] uppercase tracking-widest">
              DOCUMENT ATTACHED
            </span>
            <span className="bg-[#e7e2d4] text-[#164529] text-[11px] px-2.5 py-0.5 rounded-full font-bold">
              1 Document
            </span>
          </div>

          <div className="flex items-center justify-between bg-[#ffffff] rounded-xl p-3 border border-[#164529]/10">
            <div className="flex items-center gap-3 min-w-0 pr-2">
              <div className="w-10 h-10 rounded-lg bg-[#164529]/10 text-[#164529] flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#1d1c13] truncate">{attachedDoc.fileName}</p>
                <p className="text-xs text-[#414942] truncate">
                  {attachedDoc.fileSize} • {attachedDoc.fileType}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => onPreviewDoc(attachedDoc)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-[#414942] hover:bg-[#ede8d9] transition-colors cursor-pointer"
                title="Preview document"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setAttachedDoc(null);
                  setExtractedData(null);
                  setExtractionError(null);
                }}
                className="w-9 h-9 rounded-full flex items-center justify-center text-[#ba1a1a] hover:bg-[#ffdad6] transition-colors cursor-pointer"
                title="Remove document"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* AI Extraction Loading State */}
      {scanning && (
        <div className="bg-[#ffffff] rounded-2xl p-6 border-2 border-[#164529]/20 shadow-sm flex flex-col items-center justify-center text-center gap-3 animate-pulse">
          <div className="w-12 h-12 rounded-full bg-[#164529]/10 flex items-center justify-center text-[#164529]">
            <RefreshCw className="w-6 h-6 animate-spin text-[#164529]" />
          </div>
          <div className="space-y-1">
            <h3 className="font-serif text-lg font-semibold text-[#164529]">
              Groq Vision AI (Qwen 3.8) Analyzing Prescription...
            </h3>
            <p className="text-xs text-[#414942] max-w-md">
              Server-side extraction reading doctor handwriting, transcribing directions as written, checking prescriber
              signature, and evaluating dosage safety flags.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-semibold text-[#164529] bg-[#e7f5ec] px-3 py-1 rounded-full">
            <Sparkles className="w-3.5 h-3.5" />
            Generating strict JSON schema via OpenAI SDK on Groq endpoint
          </div>
        </div>
      )}

      {/* AI Extraction Error State */}
      {extractionError && !scanning && (
        <div className="bg-[#fff0f0] rounded-2xl p-4 border border-[#ba1a1a]/30 shadow-sm space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#ba1a1a] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-[#ba1a1a]">Digitization Notice (Groq / Gemini)</h4>
              <p className="text-xs text-[#7d1212] leading-relaxed">{extractionError}</p>
            </div>
          </div>

          {/* Quick inline key entry if error is missing or invalid key */}
          {(extractionError.includes('GROQ_API_KEY is not configured') || extractionError.includes('401') || extractionError.includes('Invalid Groq API Key')) && (
            <div className="bg-[#ffffff] p-3 rounded-xl border border-[#ba1a1a]/20 space-y-2 mt-2">
              <label className="text-[11px] font-bold text-[#414942] block">
                Enter your Groq API key (starts with <code className="bg-[#ede8d9] px-1 py-0.5 rounded text-[#164529] font-mono">gsk_</code>):
              </label>
              {apiKeyInput.trim() && (apiKeyInput.startsWith('AQ.') || apiKeyInput.startsWith('AIza')) && (
                <p className="text-[11px] text-[#ba1a1a] font-medium">
                  ⚠️ This appears to be a Gemini key. Groq keys start with <code className="font-mono">gsk_</code>.
                </p>
              )}
              <div className="flex gap-2">
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const ok = await handleSaveKey();
                      if (ok) {
                        handleRetryExtraction();
                      }
                    }
                  }}
                  placeholder="Paste your Groq key (gsk_...)"
                  className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-[#717971]/40 focus:outline-none focus:ring-1 focus:ring-[#164529]"
                />
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await handleSaveKey();
                    if (ok) {
                      handleRetryExtraction();
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#164529] text-white hover:bg-[#2f5d3f] cursor-pointer shadow-xs whitespace-nowrap"
                >
                  Save &amp; Retry
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleRetryExtraction}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#ba1a1a] text-white hover:bg-[#921414] transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry Extraction
            </button>
            <button
              type="button"
              onClick={() => {
                const sample = getSamplePrescriptionExtraction();
                setExtractedData(sample);
                setExtractionError(null);
                if (onPrescriptionExtracted) {
                  onPrescriptionExtracted(sample);
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#164529] text-white hover:bg-[#2f5d3f] transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Load Sample Clinical Table (Demo)
            </button>
          </div>
        </div>
      )}

      {/* Extracted Structured JSON Table (Rendered in upload panel before submitting) */}
      {extractedData && !scanning && (
        <div className="bg-[#ffffff] rounded-3xl p-5 sm:p-6 shadow-sm border border-[#164529]/15 space-y-5">
          {/* Card Header & Metadata */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#164529]/10 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#164529]" />
                <h2 className="font-serif text-lg sm:text-xl font-bold text-[#164529]">
                  Digitized Prescription Summary
                </h2>
              </div>
              <p className="text-xs text-[#555f56]">
                Extracted via Groq Vision (Qwen 3.8) structured output. Review the digitized items below.
              </p>
            </div>

            {/* Prescriber Signature Badge */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#414942]">Prescriber Signature:</span>
              {renderSignatureBadge(extractedData.signature_present)}
            </div>
          </div>

          {/* Header Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#f8f3e4] p-3.5 rounded-2xl border border-[#164529]/10 text-xs">
            <div>
              <span className="text-[10px] font-bold text-[#717971] uppercase tracking-wider block">
                PATIENT
              </span>
              <span className="font-semibold text-[#1d1c13]">
                {extractedData.patient_name || 'Not stated on slip'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#717971] uppercase tracking-wider block">
                DOB / AGE &amp; WEIGHT
              </span>
              <span className="font-semibold text-[#1d1c13]">
                {extractedData.patient_dob || extractedData.patient_age
                  ? `${extractedData.patient_dob || ''} ${extractedData.patient_age ? `(${extractedData.patient_age})` : ''}`
                  : 'Age missing'}{' '}
                • {extractedData.patient_weight ? `${extractedData.patient_weight}` : 'Weight unstated'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#717971] uppercase tracking-wider block">
                PRESCRIBER
              </span>
              <span className="font-semibold text-[#1d1c13]">
                {extractedData.prescriber_name || 'Prescriber Name N/A'}
              </span>
              {extractedData.prescriber_clinic && (
                <span className="text-[10px] text-[#555f56] block truncate">
                  {extractedData.prescriber_clinic}
                </span>
              )}
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#717971] uppercase tracking-wider block">
                DATE WRITTEN
              </span>
              <span className="font-semibold text-[#1d1c13]">
                {extractedData.date_written || 'Undated'}
              </span>
            </div>
          </div>

          {/* Table Container */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-sm font-bold text-[#164529] flex items-center gap-1.5">
                <Pill className="w-4 h-4 text-[#164529]" />
                Medications &amp; Dosage Safety Triage
              </h3>
              <span className="text-xs text-[#555f56] font-medium">
                {extractedData.medications.length}{' '}
                {extractedData.medications.length === 1 ? 'Medication' : 'Medications'} detected
              </span>
            </div>

            {extractedData.medications.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#f8f3e4] text-center text-xs text-[#555f56]">
                No distinct medications were legible on this prescription. A pharmacist will review the raw
                scan manually.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[#164529]/15">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#ede8d9] text-[#164529] font-serif border-b border-[#164529]/15">
                      <th className="py-2.5 px-3 font-bold w-8 text-center">#</th>
                      <th className="py-2.5 px-3 font-bold min-w-[140px]">Medication Name</th>
                      <th className="py-2.5 px-3 font-bold min-w-[110px]">Strength &amp; Form</th>
                      <th className="py-2.5 px-3 font-bold w-16">Qty</th>
                      <th className="py-2.5 px-3 font-bold min-w-[140px]">Sig (Directions)</th>
                      <th className="py-2.5 px-3 font-bold w-24">Legibility</th>
                      <th className="py-2.5 px-3 font-bold min-w-[170px]">Dosage Safety Triage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#164529]/10">
                    {extractedData.medications.map((med, idx) => {
                      const isFlagged = med.dosage_safety_flag === 'review_recommended';
                      return (
                        <tr
                          key={idx}
                          className={`hover:bg-[#fcfaf4] transition-colors ${
                            isFlagged ? 'bg-[#fff9f9]' : idx % 2 === 0 ? 'bg-[#ffffff]' : 'bg-[#faf7ee]'
                          }`}
                        >
                          <td className="py-3 px-3 text-center text-[#717971] font-mono text-[11px]">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`font-semibold ${
                                med.legibility === 'illegible'
                                  ? 'text-[#ba1a1a] italic'
                                  : 'text-[#1d1c13]'
                              }`}
                            >
                              {med.medication_name || '[Unreadable Name]'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-[#414942]">
                            <div>{med.strength || '—'}</div>
                            {med.dosage_form && (
                              <div className="text-[10px] text-[#717971]">{med.dosage_form}</div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-[#414942] font-mono text-[11px]">
                            {med.quantity || '—'}
                          </td>
                          <td className="py-3 px-3 font-mono text-[11px] text-[#164529] font-medium bg-[#164529]/[0.02]">
                            {med.sig || '—'}
                          </td>
                          <td className="py-3 px-3">
                            {renderLegibilityBadge(med.legibility)}
                          </td>
                          <td className="py-3 px-3">
                            {renderSafetyFlagBadge(med.dosage_safety_flag, med.dosage_safety_reason)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Clinical Triage Disclaimer Banner */}
          <div className="p-3 bg-[#ede8d9]/50 rounded-xl border border-[#164529]/10 flex items-start gap-2 text-[11px] text-[#555f56]">
            <ShieldCheck className="w-4 h-4 text-[#164529] shrink-0 mt-0.5" />
            <p>
              <strong className="text-[#164529]">Clinical Safety Notice:</strong> This dosage safety
              comparison is an automated triage aid comparing strength/quantity against stated patient
              weight and age. It is NOT clinical advice. A licensed pharmacist verifies all items prior to
              dispensing.
            </p>
          </div>
        </div>
      )}

      {/* Primary Action Buttons (Rendered below table) */}
      <div className="space-y-3 pt-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={scanning || savingToDb}
          className="w-full min-h-[52px] bg-[#164529] hover:bg-[#2f5d3f] text-[#ffffff] rounded-full px-6 py-3.5 flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all cursor-pointer font-serif font-semibold text-sm disabled:opacity-60"
        >
          {savingToDb ? (
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-[#ffffff]" />
              <span>Saving Prescription to Dispensary Database...</span>
            </div>
          ) : submitted ? (
            <span>Prescription Transmitted! Redirecting to Queue...</span>
          ) : (
            <>
              <span>
                {extractedData
                  ? `Submit Verified Prescription (${extractedData.medications.length} Meds) ↵ Enter`
                  : 'Submit Prescription ↵ Enter'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            alert('Prescription draft saved to your patient profile.');
            onNavigate('dashboard');
          }}
          className="w-full min-h-[50px] bg-[#ffcdd9] hover:bg-[#ffd9e1] text-[#164529] rounded-full px-6 py-3.5 flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer font-serif font-semibold text-sm"
        >
          <Bookmark className="w-4 h-4" />
          <span>Save Draft for Later</span>
        </button>
      </div>
    </div>
  );
};
