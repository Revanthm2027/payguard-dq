'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';

export default function Home() {
    const router = useRouter();
    const [datasetFile, setDatasetFile] = useState<File | null>(null);
    const [datasetName, setDatasetName] = useState('');
    const [referenceFiles, setReferenceFiles] = useState<{
        bin_map?: File;
        currency_rules?: File;
        mcc_codes?: File;
        settlement_ledger?: File;
    }>({});
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleDatasetUpload = async () => {
        if (!datasetFile) {
            setError('Please select a dataset file');
            return;
        }

        setUploading(true);
        setError('');
        setSuccess('');

        try {
            // Upload reference files first
            for (const [type, file] of Object.entries(referenceFiles)) {
                if (file) {
                    await apiClient.ingestReference(file, type);
                }
            }

            // Upload dataset
            const result = await apiClient.ingestDataset(datasetFile, datasetName);
            setSuccess(`Dataset processed successfully! Run ID: ${result.run_id}`);

            // Navigate to run detail after 2 seconds
            setTimeout(() => {
                router.push(`/runs/${result.run_id}`);
            }, 2000);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Upload failed. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
            {/* Hero Section */}
            <div className="container mx-auto px-4 py-16">
                <div className="text-center mb-16">
                    <div className="inline-block px-4 py-2 bg-blue-500/20 border border-blue-400/30 rounded-full text-blue-300 text-sm mb-6">
                        🚀 GenAI-Powered Data Quality for Payments
                    </div>
                    <h1 className="text-6xl font-bold text-white mb-6 leading-tight">
                        PayGuard <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">DQ</span>
                    </h1>
                    <p className="text-xl text-blue-200 max-w-3xl mx-auto leading-relaxed">
                        Universal, Dimension-Based Data Quality Scoring for Payment Transactions.
                        <br />
                        <span className="text-white font-semibold">7 Dimensions. 7 Agents. Zero Raw Data Storage.</span>
                    </p>
                </div>

                {/* How It Works */}
                <div className="max-w-5xl mx-auto mb-16">
                    <h2 className="text-2xl font-bold text-white text-center mb-8">How It Works</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10 text-center relative">
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">1</div>
                            <div className="text-4xl mb-3 mt-2">📤</div>
                            <h3 className="text-lg font-semibold text-white mb-2">Upload</h3>
                            <p className="text-sm text-blue-200">Upload your payment transaction CSV file</p>
                        </div>
                        <div className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10 text-center relative">
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">2</div>
                            <div className="text-4xl mb-3 mt-2">🤖</div>
                            <h3 className="text-lg font-semibold text-white mb-2">Analyze</h3>
                            <p className="text-sm text-blue-200">7 AI agents profile and validate your data</p>
                        </div>
                        <div className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10 text-center relative">
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">3</div>
                            <div className="text-4xl mb-3 mt-2">📊</div>
                            <h3 className="text-lg font-semibold text-white mb-2">Score</h3>
                            <p className="text-sm text-blue-200">Get per-dimension scores (0-100) with explainability</p>
                        </div>
                        <div className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10 text-center relative">
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">4</div>
                            <div className="text-4xl mb-3 mt-2">✅</div>
                            <h3 className="text-lg font-semibold text-white mb-2">Act</h3>
                            <p className="text-sm text-blue-200">Get prioritized remediation & export to dbt/GE</p>
                        </div>
                    </div>
                </div>

                {/* Main Upload Card */}
                <div className="max-w-4xl mx-auto bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20 mb-16">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                            <span className="text-xl">📊</span>
                        </div>
                        <h2 className="text-2xl font-semibold text-white">Analyze Your Dataset</h2>
                    </div>

                    {/* Dataset Upload */}
                    <div className="mb-6">
                        <label className="block text-white text-sm font-medium mb-2">
                            Transaction Dataset (CSV) <span className="text-red-400">*</span>
                        </label>
                        <div className="relative">
                            <input
                                type="file"
                                accept=".csv"
                                onChange={(e) => setDatasetFile(e.target.files?.[0] || null)}
                                className="w-full px-4 py-4 bg-white/10 border-2 border-dashed border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-500 cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:cursor-pointer hover:bg-white/15 transition-colors"
                            />
                        </div>
                        {datasetFile && (
                            <p className="text-green-400 text-sm mt-2">✓ {datasetFile.name} selected</p>
                        )}
                    </div>

                    {/* Dataset Name */}
                    <div className="mb-6">
                        <label className="block text-white text-sm font-medium mb-2">
                            Dataset Name (optional)
                        </label>
                        <input
                            type="text"
                            value={datasetName}
                            onChange={(e) => setDatasetName(e.target.value)}
                            placeholder="e.g., Q4_2024_Transactions"
                            className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Reference Files Accordion */}
                    <details className="mb-6 group">
                        <summary className="list-none cursor-pointer">
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/20 hover:bg-white/10 transition-colors">
                                <div className="flex items-center gap-2">
                                    <span className="text-xl">📚</span>
                                    <span className="text-white font-medium">Reference Data (Optional)</span>
                                </div>
                                <span className="text-blue-300 text-sm group-open:hidden">Click to expand</span>
                                <span className="text-blue-300 text-sm hidden group-open:inline">Click to collapse</span>
                            </div>
                        </summary>
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-white/5 rounded-lg">
                            <div>
                                <label className="block text-white text-sm font-medium mb-2">BIN Map</label>
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={(e) => setReferenceFiles({ ...referenceFiles, bin_map: e.target.files?.[0] })}
                                    className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <p className="text-xs text-blue-200 mt-1">Card BIN to issuer/network mapping</p>
                            </div>
                            <div>
                                <label className="block text-white text-sm font-medium mb-2">Currency Rules</label>
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={(e) => setReferenceFiles({ ...referenceFiles, currency_rules: e.target.files?.[0] })}
                                    className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <p className="text-xs text-blue-200 mt-1">Currency decimal place rules</p>
                            </div>
                            <div>
                                <label className="block text-white text-sm font-medium mb-2">MCC Codes</label>
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={(e) => setReferenceFiles({ ...referenceFiles, mcc_codes: e.target.files?.[0] })}
                                    className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <p className="text-xs text-blue-200 mt-1">Valid merchant category codes</p>
                            </div>
                            <div>
                                <label className="block text-white text-sm font-medium mb-2">Settlement Ledger</label>
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={(e) => setReferenceFiles({ ...referenceFiles, settlement_ledger: e.target.files?.[0] })}
                                    className="w-full px-3 py-2 bg-white/10 border border-white/30 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <p className="text-xs text-blue-200 mt-1">For reconciliation checks</p>
                            </div>
                        </div>
                    </details>

                    {/* Error/Success Messages */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 flex items-center gap-2">
                            <span>⚠️</span> {error}
                        </div>
                    )}
                    {success && (
                        <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg text-green-200 flex items-center gap-2">
                            <span>✅</span> {success}
                        </div>
                    )}

                    {/* Upload Button */}
                    <button
                        onClick={handleDatasetUpload}
                        disabled={uploading || !datasetFile}
                        className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg shadow-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] flex items-center justify-center gap-2"
                    >
                        {uploading ? (
                            <>
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Processing... (7 agents analyzing your data)
                            </>
                        ) : (
                            <>🚀 Analyze Dataset</>
                        )}
                    </button>

                    {/* View Runs Link */}
                    <div className="mt-6 text-center">
                        <a
                            href="/runs"
                            className="text-blue-300 hover:text-blue-200 underline inline-flex items-center gap-1"
                        >
                            View All Previous Runs →
                        </a>
                    </div>
                </div>

                {/* 7 Dimensions Section */}
                <div className="max-w-6xl mx-auto mb-16">
                    <h2 className="text-2xl font-bold text-white text-center mb-8">7 Quality Dimensions</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                        {[
                            { icon: '📝', name: 'Completeness', desc: 'Missing values' },
                            { icon: '🔑', name: 'Uniqueness', desc: 'Duplicates' },
                            { icon: '✅', name: 'Validity', desc: 'Format & codes' },
                            { icon: '🔗', name: 'Consistency', desc: 'Cross-field rules' },
                            { icon: '⏱️', name: 'Timeliness', desc: 'SLA compliance' },
                            { icon: '🔒', name: 'Integrity', desc: 'References' },
                            { icon: '💰', name: 'Reconciliation', desc: 'Settlement' },
                        ].map((dim) => (
                            <div key={dim.name} className="bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-lg rounded-xl p-4 border border-white/10 text-center hover:from-white/15 hover:to-white/10 transition-all">
                                <div className="text-3xl mb-2">{dim.icon}</div>
                                <h3 className="text-sm font-semibold text-white mb-1">{dim.name}</h3>
                                <p className="text-xs text-blue-200">{dim.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Key Benefits */}
                <div className="max-w-5xl mx-auto mb-16">
                    <h2 className="text-2xl font-bold text-white text-center mb-8">Why PayGuard DQ?</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 backdrop-blur-lg rounded-xl p-6 border border-green-500/30">
                            <div className="text-4xl mb-4">🔒</div>
                            <h3 className="text-xl font-semibold text-white mb-2">Zero Raw Data Storage</h3>
                            <p className="text-green-200 text-sm">Your transaction data is processed in-memory only. We store only metadata, scores, and aggregates. Never raw data.</p>
                        </div>
                        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 backdrop-blur-lg rounded-xl p-6 border border-blue-500/30">
                            <div className="text-4xl mb-4">🧠</div>
                            <h3 className="text-xl font-semibold text-white mb-2">Full Explainability</h3>
                            <p className="text-blue-200 text-sm">Every score includes detailed metrics, error rates, failing checks, and impacted columns. No black boxes.</p>
                        </div>
                        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 backdrop-blur-lg rounded-xl p-6 border border-purple-500/30">
                            <div className="text-4xl mb-4">🎯</div>
                            <h3 className="text-xl font-semibold text-white mb-2">Payments-Specific</h3>
                            <p className="text-purple-200 text-sm">Specialized reconciliation dimension for BIN validation and settlement ledger matching. Built for payments.</p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center text-blue-300 text-sm border-t border-white/10 pt-8">
                    <p>Built with ❤️ for Hackathon 2024</p>
                    <p className="mt-2">FastAPI • Next.js • 7 Agents • 10,500+ lines of code</p>
                </div>
            </div>
        </div>
    );
}
