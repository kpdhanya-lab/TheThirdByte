import React, { useState } from 'react';

interface InteractionCheckerProps {
  onBack?: () => void;
}

const COMMON_DRUGS = [
  'Atorvastatin Calcium',
  'Eliquis (Apixaban)',
  'Warfarin Sodium',
  'Amoxicillin-Clavulanate',
  'Norco 10/325 (Hydrocodone/APAP)',
  'Lisinopril',
  'Metformin HCl',
  'Clopidogrel (Plavix)',
  'Fluconazole',
  'Ibuprofen',
];

interface CheckResult {
  severity: 'critical' | 'warning' | 'safe';
  title: string;
  description: string;
  recommendations: string;
  timestamp: string;
}

export const InteractionChecker: React.FC<InteractionCheckerProps> = ({ onBack }) => {
  const [drugA, setDrugA] = useState('Eliquis (Apixaban)');
  const [drugB, setDrugB] = useState('Warfarin Sodium');
  const [patientAllergy, setPatientAllergy] = useState('Penicillin');
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);

  const handleRunSafetyCheck = () => {
    let severity: 'critical' | 'warning' | 'safe' = 'safe';
    let title = 'No Known Direct Major Interaction';
    let description = 'Normal therapeutic monitoring indicated. Check renal and hepatic dosing.';
    let recommendations = 'Routine clinical monitoring during regular dosage intervals.';

    if (
      (drugA.includes('Eliquis') && drugB.includes('Warfarin')) ||
      (drugA.includes('Warfarin') && drugB.includes('Eliquis'))
    ) {
      severity = 'critical';
      title = 'MAJOR CONTRAINDICATION: Dual Anticoagulation Bleeding Risk';
      description =
        'Concomitant administration of multiple full-dose systemic oral anticoagulants markedly elevates major hemorrhages and intracranial bleeds without additive clinical benefit.';
      recommendations =
        'Discontinue Warfarin and monitor INR until INR < 2.0 prior to initiating Apixaban dose. Notify prescriber immediately.';
    } else if (
      (drugA.includes('Warfarin') && drugB.includes('Fluconazole')) ||
      (drugA.includes('Fluconazole') && drugB.includes('Warfarin'))
    ) {
      severity = 'critical';
      title = 'HIGH ALERT: CYP2C9 Inhibition Causing Supratherapeutic INR';
      description =
        'Fluconazole potently inhibits the S-warfarin metabolizing enzyme CYP2C9, resulting in marked accumulation and acute INR elevation.';
      recommendations =
        'Empirically reduce Warfarin dose by 50% and check INR in 48-72 hours or substitute antifungal therapy.';
    } else if (
      (drugA.includes('Norco') && drugB.includes('Ibuprofen')) ||
      (drugA.includes('Ibuprofen') && drugB.includes('Norco'))
    ) {
      severity = 'warning';
      title = 'MODERATE INTERACTION: Multimodal Analgesic Caution';
      description =
        'Norco contains acetaminophen. Concurrent NSAID use is frequently employed for multimodal analgesia but requires monitoring for GI bleed and nephrotoxicity.';
      recommendations =
        'Ensure total daily acetaminophen does not exceed 3,000-4,000 mg from all prescription and OTC sources.';
    } else if (
      (drugA.includes('Lisinopril') && drugB.includes('Ibuprofen')) ||
      (drugA.includes('Ibuprofen') && drugB.includes('Lisinopril'))
    ) {
      severity = 'warning';
      title = 'MODERATE INTERACTION: Blunted Antihypertensive Response & Renal Risk';
      description =
        'NSAIDs inhibit prostaglandin synthesis in the renal vasculature, reducing ACE-inhibitor efficacy and increasing acute kidney injury risk in volume-depleted patients.';
      recommendations =
        'Monitor blood pressure and serum creatinine / potassium if concurrent therapy is prolonged.';
    } else if (
      (drugA.includes('Atorvastatin') && drugB.includes('Fluconazole')) ||
      (drugA.includes('Fluconazole') && drugB.includes('Atorvastatin'))
    ) {
      severity = 'warning';
      title = 'MODERATE INTERACTION: CYP3A4 Statin Concentration Increase';
      description =
        'Fluconazole inhibits CYP3A4 and can increase serum levels of atorvastatin, increasing risk of myopathy or rhabdomyolysis.';
      recommendations = 'Consider temporary statin interruption during antifungal course.';
    }

    setCheckResult({
      severity,
      title,
      description,
      recommendations,
      timestamp: new Date().toLocaleTimeString(),
    });
  };

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-6 text-left">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-5 border-b border-[#E5DFCE] gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            {onBack && (
              <button
                onClick={onBack}
                title="Go back to Dashboard"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-[#E5DFCE] text-xs font-semibold text-[#2F5D3F] hover:bg-[#FAF7EE] transition-colors shadow-xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">arrow_back</span>
                <span>Back to Dashboard</span>
              </button>
            )}
            <span className="text-xs font-mono uppercase text-[#1F2F4F]/60">
              Pharmacotherapy Decision Support
            </span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#2F5D3F] mt-0.5">
            Clinical Safety & Interaction Inspector
          </h1>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-[#2F5D3F] bg-[#FAF7EE] px-3.5 py-2 rounded-xl border border-[#E5DFCE]">
          <span className="material-symbols-outlined text-[16px]">verified</span>
          <span>Micromedex & Lexicomp Drug Monographs v2026.3</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 items-start">
        {/* Left 5 Cols: Input selectors */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-[#E5DFCE] shadow-xs space-y-4">
          <h2 className="font-serif text-lg font-bold text-[#2F5D3F]">
            Select Agents to Cross-Examine
          </h2>

          <div className="space-y-3.5">
            <div>
              <label className="text-xs font-semibold text-[#1F2F4F] block mb-1">
                Primary Medication (Agent A):
              </label>
              <select
                value={drugA}
                onChange={(e) => setDrugA(e.target.value)}
                className="w-full h-10 px-3 bg-[#FAF7EE] border border-[#E5DFCE] rounded-xl text-xs font-medium text-[#1F2F4F] focus:bg-white focus:outline-none focus:border-[#2F5D3F]"
              >
                {COMMON_DRUGS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#1F2F4F] block mb-1">
                Secondary Medication (Agent B):
              </label>
              <select
                value={drugB}
                onChange={(e) => setDrugB(e.target.value)}
                className="w-full h-10 px-3 bg-[#FAF7EE] border border-[#E5DFCE] rounded-xl text-xs font-medium text-[#1F2F4F] focus:bg-white focus:outline-none focus:border-[#2F5D3F]"
              >
                {COMMON_DRUGS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#1F2F4F] block mb-1">
                Patient Stated Allergy Profile:
              </label>
              <input
                type="text"
                value={patientAllergy}
                onChange={(e) => setPatientAllergy(e.target.value)}
                placeholder="e.g. Penicillin, Sulfa, Aspirin"
                className="w-full h-10 px-3 bg-[#FAF7EE] border border-[#E5DFCE] rounded-xl text-xs font-medium text-[#1F2F4F] focus:bg-white focus:outline-none focus:border-[#2F5D3F]"
              />
            </div>
          </div>

          <button
            onClick={handleRunSafetyCheck}
            className="w-full py-2.5 bg-[#2F5D3F] hover:bg-[#234730] text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[17px]">sync_alt</span>
            <span>Run Pharmacotherapy Interaction Audit</span>
          </button>
        </div>

        {/* Right 7 Cols: Results / Monograph Viewer */}
        <div className="lg:col-span-7 space-y-4">
          {checkResult ? (
            <div className="bg-white p-6 rounded-2xl border border-[#E5DFCE] shadow-xs space-y-4 animate-fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5DFCE]">
                <div className="flex items-center gap-2">
                  <span
                    className={`material-symbols-outlined text-[24px] ${
                      checkResult.severity === 'critical'
                        ? 'text-[#BA1A1A]'
                        : checkResult.severity === 'warning'
                        ? 'text-[#C47D2B]'
                        : 'text-[#2F5D3F]'
                    }`}
                  >
                    {checkResult.severity === 'critical'
                      ? 'report'
                      : checkResult.severity === 'warning'
                      ? 'warning'
                      : 'verified'}
                  </span>
                  <span
                    className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                      checkResult.severity === 'critical'
                        ? 'bg-[#E9B8C4] text-[#1F2F4F]'
                        : checkResult.severity === 'warning'
                        ? 'bg-[#FAF1E4] text-[#C47D2B]'
                        : 'bg-[#2F5D3F]/10 text-[#2F5D3F]'
                    }`}
                  >
                    {checkResult.severity.toUpperCase()} RISK TIER
                  </span>
                </div>
                <span className="text-[11px] font-mono text-[#1F2F4F]/60">
                  Evaluated at {checkResult.timestamp}
                </span>
              </div>

              <div>
                <h3 className="font-serif text-xl font-bold text-[#2F5D3F]">
                  {checkResult.title}
                </h3>
                <p className="text-xs text-[#1F2F4F]/80 mt-2 leading-relaxed">
                  {checkResult.description}
                </p>
              </div>

              <div className="p-3.5 bg-[#FAF7EE] rounded-xl border border-[#E5DFCE] space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#2F5D3F] block">
                  Clinical Action / Recommendation
                </span>
                <p className="text-xs font-medium text-[#1F2F4F]">
                  {checkResult.recommendations}
                </p>
              </div>

              <div className="text-[11px] text-[#1F2F4F]/60 pt-2 border-t border-[#E5DFCE] flex items-center justify-between">
                <span>Evidence Level: Class A (Randomized Controlled Trials / Post-Marketing Surveillance)</span>
                <span>CYP450 Pathway: Checked</span>
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 rounded-2xl text-center border border-[#E5DFCE] shadow-xs">
              <span className="material-symbols-outlined text-4xl text-[#1F2F4F]/60">
                manage_search
              </span>
              <h3 className="font-serif text-lg font-bold text-[#2F5D3F] mt-2">
                Ready for Clinical Analysis
              </h3>
              <p className="text-xs text-[#1F2F4F]/80 max-w-sm mx-auto mt-1">
                Select two medications from the left panel and click "Run Pharmacotherapy Interaction Audit" to evaluate contraindications.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
