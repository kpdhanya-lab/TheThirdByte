import React, { useState } from 'react';
import { AttachedDoc, ViewMode } from '../types';
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
} from 'lucide-react';

interface PrescriptionUploadViewProps {
  attachedDoc: AttachedDoc | null;
  setAttachedDoc: (doc: AttachedDoc | null) => void;
  onNavigate: (view: ViewMode) => void;
  onPreviewDoc: (doc: AttachedDoc) => void;
}

export const PrescriptionUploadView: React.FC<PrescriptionUploadViewProps> = ({
  attachedDoc,
  setAttachedDoc,
  onNavigate,
  onPreviewDoc,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setScanning(true);
      setTimeout(() => {
        setAttachedDoc({
          fileName: file.name,
          fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          fileType: file.type.includes('pdf') ? 'PDF Document' : 'High Resolution Scan',
          uploadTime: 'Just now',
        });
        setScanning(false);
      }, 900);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setScanning(true);
      setTimeout(() => {
        setAttachedDoc({
          fileName: file.name,
          fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          fileType: 'High Resolution Scan',
          uploadTime: 'Just now',
        });
        setScanning(false);
      }, 900);
    }
  };

  const handleSubmit = () => {
    setSubmitted(true);
    setTimeout(() => {
      onNavigate('queue');
    }, 700);
  };

  return (
    <div className="w-full max-w-xl mx-auto py-4 sm:py-8 px-4 flex flex-col gap-4">
      {/* Trust Bar Badge */}
      <div className="flex items-center justify-between bg-[#f8f3e4] px-4 py-2.5 rounded-2xl border border-[#164529]/15 shadow-xs">
        <div className="flex items-center gap-2 text-[#414942]">
          <Clock className="w-4 h-4 text-[#164529]" />
          <span className="text-xs font-semibold tracking-wide">Average Review ~5 mins</span>
        </div>
        <div className="flex items-center gap-1.5 text-[#164529]">
          <ShieldCheck className="w-4 h-4" />
          <span className="text-[10px] font-bold tracking-widest uppercase">SECURE DISPENSARY</span>
        </div>
      </div>

      {/* Header Editorial Titles */}
      <div className="space-y-1.5 pt-1">
        <h1 className="font-serif text-2xl sm:text-3xl text-[#164529] tracking-tight font-semibold">
          Upload Your Prescription
        </h1>
        <p className="text-sm text-[#414942] leading-relaxed">
          Our AI helps read your prescription details before our pharmacist verifies every
          medication.
        </p>
      </div>

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
          accept=".pdf,.png,.jpg,.jpeg,.heic"
          className="hidden"
        />

        {/* Capsule / Scanner Icon Visual */}
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
          <p className="text-xs text-[#717971]">PDF, PNG, JPG, HEIC • Max limit 25MB</p>
        </div>

        {/* Mobile Scanner Primary Action CTA */}
        <div className="w-full pt-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="w-full min-h-[52px] bg-[#164529] hover:bg-[#2f5d3f] text-[#ffffff] rounded-full px-5 py-3 flex flex-col items-center justify-center shadow-md active:scale-[0.98] transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4" />
              <span className="font-serif text-sm font-bold tracking-wide">
                {scanning ? 'Analyzing Slip with AI...' : 'Use Mobile Scanner'}
              </span>
            </div>
            <span className="text-[10px] text-[#a2d4ae] pt-0.5">
              Captures handwritten doctor slips with high optical fidelity
            </span>
          </button>
        </div>
      </div>

      {/* Attached Document Card */}
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
                onClick={() => setAttachedDoc(null)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-[#ba1a1a] hover:bg-[#ffdad6] transition-colors cursor-pointer"
                title="Remove document"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-[#ede8d9]/50 border border-dashed border-[#164529]/20 text-center text-xs text-[#414942]">
          No document attached yet. Upload or scan your prescription to run AI extraction.
        </div>
      )}

      {/* Primary Action Buttons */}
      <div className="space-y-3 pt-2">
        <button
          type="button"
          onClick={handleSubmit}
          className="w-full min-h-[50px] bg-[#164529] hover:bg-[#2f5d3f] text-[#ffffff] rounded-full px-6 py-3.5 flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all cursor-pointer font-serif font-semibold text-sm"
        >
          {submitted ? (
            <span>Prescription Transmitted! Redirecting...</span>
          ) : (
            <>
              <span>Submit Prescription ↵ Enter</span>
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
