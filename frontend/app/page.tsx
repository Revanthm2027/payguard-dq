'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';

export default function Home() {
    const router = useRouter();
    const [showUpload, setShowUpload] = useState(false);
    const [datasetFile, setDatasetFile] = useState<File | null>(null);
    const [datasetName, setDatasetName] = useState('');
    const [referenceFiles, setReferenceFiles] = useState<{
        bin_map?: File;
        currency_rules?: File;
        mcc_codes?: File;
        settlement_ledger?: File;
    }>({});
    const [uploading, setUploading] = useState(false);
    const [currentAgent, setCurrentAgent] = useState(0);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const agents = [
        { name: 'Profiler Agent', desc: 'Analyzing schema and statistics' },
        { name: 'Dimension Selector', desc: 'Identifying quality dimensions' },
        { name: 'Check Executor', desc: 'Running validation checks' },
        { name: 'Scoring Agent', desc: 'Computing dimension scores' },
        { name: 'Explainer Agent', desc: 'Generating explanations' },
        { name: 'Remediation Agent', desc: 'Creating fix recommendations' },
        { name: 'Test Export Agent', desc: 'Generating test artifacts' },
    ];

    const handleDatasetUpload = async () => {
        if (!datasetFile) {
            setError('Please select a dataset file');
            return;
        }

        setUploading(true);
        setError('');
        setSuccess('');
        setCurrentAgent(0);

        // Simulate agent progress
        const progressInterval = setInterval(() => {
            setCurrentAgent(prev => Math.min(prev + 1, 6));
        }, 800);

        try {
            for (const [type, file] of Object.entries(referenceFiles)) {
                if (file) {
                    await apiClient.ingestReference(file, type);
                }
            }
            const result = await apiClient.ingestDataset(datasetFile, datasetName);
            clearInterval(progressInterval);
            setCurrentAgent(7);
            setSuccess(`Analysis complete. Redirecting to results...`);
            setTimeout(() => {
                router.push(`/runs/${result.run_id}`);
            }, 1500);
        } catch (err: any) {
            clearInterval(progressInterval);
            setError(err.response?.data?.detail || 'Analysis failed. Please check your file format and try again.');
        } finally {
            setUploading(false);
        }
    };

    const sampleDataFiles = [
        { name: 'transactions_batch1.csv', desc: 'Good quality sample (1,000 transactions)' },
        { name: 'transactions_batch2.csv', desc: 'Poor quality sample with issues' },
        { name: 'bin_reference.csv', desc: 'Card BIN reference data' },
        { name: 'currency_rules.csv', desc: 'Currency decimal rules' },
        { name: 'mcc_codes.csv', desc: 'Merchant category codes' },
    ];

    const handleDownloadSample = async (filename: string) => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/sample-data/${filename}`);
            if (!response.ok) throw new Error('Download failed');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download failed:', error);
            alert('Failed to download file. Please try again.');
        }
    };

    const dimensions = [
        { name: 'Completeness', desc: 'Missing values and null rates', icon: '📋' },
        { name: 'Uniqueness', desc: 'Duplicate detection', icon: '🔑' },
        { name: 'Validity', desc: 'ISO codes and format validation', icon: '✓' },
        { name: 'Consistency', desc: 'Cross-field rule validation', icon: '🔗' },
        { name: 'Timeliness', desc: 'SLA and processing delays', icon: '⏱' },
        { name: 'Integrity', desc: 'Referential data matching', icon: '🔒' },
        { name: 'Reconciliation', desc: 'BIN and settlement matching', icon: '💳' },
    ];

    return (
        <div className="min-h-screen bg-white text-gray-900">
            {/* Navigation */}
            <nav className="fixed top-0 w-full bg-white border-b border-gray-200 z-50 shadow-sm">
                <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                    <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                        <img src="/logo.png" alt="PayGuard DQ" className="w-10 h-10 rounded-lg" />
                        <span className="text-xl font-semibold text-gray-900">PayGuard DQ</span>
                    </a>
                    <div className="flex items-center gap-6">
                        <a href="/" className="text-sm text-gray-600 hover:text-[#1434CB] transition-colors">
                            Home
                        </a>
                        <a href="#features" className="text-sm text-gray-600 hover:text-[#1434CB] transition-colors">
                            Features
                        </a>
                        <a href="#architecture" className="text-sm text-gray-600 hover:text-[#1434CB] transition-colors">
                            Architecture
                        </a>
                        <a href="/runs" className="text-sm text-gray-600 hover:text-[#1434CB] transition-colors">
                            Dashboard
                        </a>
                        <button
                            onClick={() => setShowUpload(true)}
                            className="px-5 py-2.5 bg-[#1434CB] hover:bg-[#0C1F7A] text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            Start Analysis
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-6 bg-gradient-to-b from-gray-50 to-white">
                <div className="container mx-auto max-w-5xl">
                    <div className="text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#1434CB]/5 border border-[#1434CB]/20 rounded-full text-[#1434CB] text-sm font-medium mb-8">
                            <span className="w-2 h-2 bg-[#FCC116] rounded-full"></span>
                            Enterprise Data Quality Platform
                        </div>

                        <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight text-gray-900">
                            AI-Powered Data Quality
                            <br />
                            <span className="text-[#1434CB]">for Payment Transactions</span>
                        </h1>

                        <p className="text-xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
                            Validate card transaction data across 7 quality dimensions using 7 specialized AI agents.
                            Catch compliance issues before they cost you. Zero raw data storage.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <button
                                onClick={() => setShowUpload(true)}
                                className="px-8 py-4 bg-[#1434CB] hover:bg-[#0C1F7A] text-white rounded-xl text-lg font-semibold transition-all shadow-lg shadow-[#1434CB]/20"
                            >
                                Analyze Your Data
                            </button>
                            <a
                                href="#sample-data"
                                className="px-8 py-4 bg-white hover:bg-gray-50 border-2 border-[#FCC116] text-gray-900 rounded-xl text-lg font-semibold transition-all"
                            >
                                Download Sample Data
                            </a>
                        </div>
                    </div>

                    {/* Stats Bar */}
                    <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm text-center">
                            <div className="text-4xl font-bold text-[#1434CB] mb-2">7</div>
                            <div className="text-sm text-gray-600">AI Agents</div>
                        </div>
                        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm text-center">
                            <div className="text-4xl font-bold text-[#1434CB] mb-2">7</div>
                            <div className="text-sm text-gray-600">Quality Dimensions</div>
                        </div>
                        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm text-center">
                            <div className="text-4xl font-bold text-[#1434CB] mb-2">20+</div>
                            <div className="text-sm text-gray-600">Validation Checks</div>
                        </div>
                        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm text-center">
                            <div className="text-4xl font-bold text-[#1434CB] mb-2">&lt;30s</div>
                            <div className="text-sm text-gray-600">Processing Time</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Sample Data Download Section */}
            <section id="sample-data" className="py-20 px-6 bg-white">
                <div className="container mx-auto max-w-5xl">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">Sample Data</h2>
                        <p className="text-gray-600 max-w-2xl mx-auto">
                            Download sample transaction files to test the platform
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {sampleDataFiles.map((file) => (
                            <div key={file.name} className="bg-gray-50 rounded-xl p-6 border border-gray-200 hover:border-[#1434CB]/50 transition-colors">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 bg-[#1434CB]/10 rounded-lg flex items-center justify-center">
                                        <span className="text-[#1434CB]">📄</span>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">{file.name}</h3>
                                        <p className="text-sm text-gray-500">{file.desc}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDownloadSample(file.name)}
                                    className="w-full mt-4 px-4 py-2 bg-white border border-gray-300 hover:border-[#1434CB] text-gray-700 hover:text-[#1434CB] rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Download
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 7 Dimensions Section */}
            <section id="features" className="py-20 px-6 bg-gray-50">
                <div className="container mx-auto max-w-5xl">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">7 Quality Dimensions</h2>
                        <p className="text-gray-600 max-w-2xl mx-auto">
                            Comprehensive validation coverage for payment transaction data
                        </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                        {dimensions.map((dim, i) => (
                            <div
                                key={dim.name}
                                className="bg-white rounded-xl p-4 border border-gray-200 hover:border-[#1434CB]/50 hover:shadow-md transition-all text-center group"
                            >
                                <div className="text-2xl mb-2">{dim.icon}</div>
                                <h3 className="text-sm font-semibold text-gray-900 mb-1">{dim.name}</h3>
                                <p className="text-xs text-gray-500">{dim.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Architecture Section */}
            <section id="architecture" className="py-20 px-6 bg-white">
                <div className="container mx-auto max-w-5xl">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">Multi-Agent Architecture</h2>
                        <p className="text-gray-600 max-w-2xl mx-auto">
                            7 specialized AI agents work in sequence to analyze your data
                        </p>
                    </div>

                    {/* Agent Pipeline Visualization */}
                    <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                            {agents.map((agent, i) => (
                                <div key={agent.name} className="flex items-center gap-2">
                                    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm text-center min-w-[120px]">
                                        <div className="w-10 h-10 bg-[#1434CB] rounded-full flex items-center justify-center text-white font-bold mx-auto mb-2">
                                            {i + 1}
                                        </div>
                                        <h4 className="text-xs font-semibold text-gray-900">{agent.name}</h4>
                                    </div>
                                    {i < agents.length - 1 && (
                                        <div className="hidden md:block text-[#1434CB] text-2xl">→</div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 grid md:grid-cols-3 gap-6">
                            <div className="bg-white rounded-xl p-5 border border-gray-200">
                                <div className="text-[#1434CB] font-semibold mb-2">Input</div>
                                <p className="text-sm text-gray-600">CSV transaction file + optional reference data</p>
                            </div>
                            <div className="bg-white rounded-xl p-5 border border-gray-200">
                                <div className="text-[#1434CB] font-semibold mb-2">Processing</div>
                                <p className="text-sm text-gray-600">In-memory analysis, zero raw data storage</p>
                            </div>
                            <div className="bg-white rounded-xl p-5 border border-gray-200">
                                <div className="text-[#1434CB] font-semibold mb-2">Output</div>
                                <p className="text-sm text-gray-600">Scores, remediation, dbt/GE exports</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Key Features Section */}
            <section className="py-20 px-6 bg-gray-50">
                <div className="container mx-auto max-w-5xl">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">Enterprise Features</h2>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                                <span className="text-2xl">🔒</span>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Zero Data Storage</h3>
                            <p className="text-gray-600 text-sm">Transaction data processed in-memory only. Never stored. PCI-DSS compliant by design.</p>
                        </div>

                        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                                <span className="text-2xl">📊</span>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Full Explainability</h3>
                            <p className="text-gray-600 text-sm">Every score includes metrics, error rates, and root cause analysis. No black boxes.</p>
                        </div>

                        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mb-4">
                                <span className="text-2xl">💳</span>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment-Specific</h3>
                            <p className="text-gray-600 text-sm">BIN validation, settlement matching, currency compliance. Built for card transactions.</p>
                        </div>

                        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                                <span className="text-2xl">📦</span>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">CI/CD Exports</h3>
                            <p className="text-gray-600 text-sm">Export to dbt tests and Great Expectations. Integrate with your existing pipeline.</p>
                        </div>

                        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                                <span className="text-2xl">🔧</span>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Remediation</h3>
                            <p className="text-gray-600 text-sm">Prioritized fix recommendations with expected score impact and effort estimates.</p>
                        </div>

                        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                            <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center mb-4">
                                <span className="text-2xl">📋</span>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Governance Reports</h3>
                            <p className="text-gray-600 text-sm">Audit-ready reports proving no raw data retention. Full compliance documentation.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-6 bg-[#1434CB]">
                <div className="container mx-auto max-w-3xl text-center">
                    <h2 className="text-4xl font-bold text-white mb-6">Ready to Validate Your Data?</h2>
                    <p className="text-xl text-blue-100 mb-8">
                        Upload your transaction file and get a comprehensive quality assessment in seconds
                    </p>
                    <button
                        onClick={() => setShowUpload(true)}
                        className="px-10 py-5 bg-[#FCC116] hover:bg-[#D9A312] text-gray-900 rounded-xl text-xl font-semibold transition-all shadow-xl"
                    >
                        Start Analysis
                    </button>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 px-6 bg-gray-900 text-gray-400">
                <div className="container mx-auto max-w-5xl flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#1434CB] rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-sm">PG</span>
                        </div>
                        <span className="text-white font-semibold">PayGuard DQ</span>
                    </div>
                    <div className="text-sm">
                        Enterprise Data Quality Platform for Payment Transactions
                    </div>
                </div>
            </footer>

            {/* Upload Modal with Agent Progress */}
            {showUpload && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900">Analyze Transaction Data</h2>
                            <button onClick={() => setShowUpload(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Agent Progress (when uploading) */}
                            {uploading && (
                                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                                    <h3 className="font-semibold text-gray-900 mb-4">Processing Pipeline</h3>
                                    <div className="space-y-3">
                                        {agents.map((agent, i) => (
                                            <div key={agent.name} className="flex items-center gap-3">
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i < currentAgent ? 'bg-green-500 text-white' :
                                                    i === currentAgent ? 'bg-[#1434CB] text-white animate-pulse' :
                                                        'bg-gray-200 text-gray-500'
                                                    }`}>
                                                    {i < currentAgent ? '✓' : i + 1}
                                                </div>
                                                <div className="flex-1">
                                                    <div className={`text-sm font-medium ${i <= currentAgent ? 'text-gray-900' : 'text-gray-400'
                                                        }`}>{agent.name}</div>
                                                    {i === currentAgent && (
                                                        <div className="text-xs text-[#1434CB]">{agent.desc}</div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {!uploading && (
                                <>
                                    {/* Dataset Upload */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Transaction Dataset (CSV) <span className="text-red-500">*</span>
                                        </label>
                                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-[#1434CB]/50 transition-colors cursor-pointer">
                                            <input
                                                type="file"
                                                accept=".csv"
                                                onChange={(e) => setDatasetFile(e.target.files?.[0] || null)}
                                                className="hidden"
                                                id="dataset-upload"
                                            />
                                            <label htmlFor="dataset-upload" className="cursor-pointer">
                                                <div className="text-4xl mb-2">📄</div>
                                                <div className="text-gray-600">Click to upload or drag and drop</div>
                                                <div className="text-sm text-gray-400 mt-1">CSV files only</div>
                                            </label>
                                        </div>
                                        {datasetFile && (
                                            <div className="mt-3 flex items-center gap-2 text-green-600">
                                                <span>✓</span>
                                                <span className="text-sm font-medium">{datasetFile.name}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Dataset Name */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Dataset Name (optional)</label>
                                        <input
                                            type="text"
                                            value={datasetName}
                                            onChange={(e) => setDatasetName(e.target.value)}
                                            placeholder="e.g., Q4_2024_Transactions"
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1434CB]/20 focus:border-[#1434CB] outline-none transition-all"
                                        />
                                    </div>

                                    {/* Reference Files */}
                                    <details className="group">
                                        <summary className="cursor-pointer p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 list-none">
                                            <div className="flex justify-between items-center">
                                                <span className="font-medium text-gray-700">Reference Data (Optional)</span>
                                                <span className="text-sm text-gray-400 group-open:hidden">Expand</span>
                                            </div>
                                        </summary>
                                        <div className="mt-4 grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                            {[
                                                { key: 'bin_map', label: 'BIN Map', desc: 'Card BIN to issuer mapping' },
                                                { key: 'currency_rules', label: 'Currency Rules', desc: 'Decimal place rules' },
                                                { key: 'mcc_codes', label: 'MCC Codes', desc: 'Valid merchant codes' },
                                                { key: 'settlement_ledger', label: 'Settlement Ledger', desc: 'For reconciliation' },
                                            ].map((ref) => (
                                                <div key={ref.key}>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">{ref.label}</label>
                                                    <input
                                                        type="file"
                                                        accept=".csv"
                                                        onChange={(e) => setReferenceFiles({ ...referenceFiles, [ref.key]: e.target.files?.[0] })}
                                                        className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#1434CB]/10 file:text-[#1434CB] file:font-medium hover:file:bg-[#1434CB]/20"
                                                    />
                                                    <p className="text-xs text-gray-400 mt-1">{ref.desc}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </details>
                                </>
                            )}

                            {/* Error/Success */}
                            {error && (
                                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-3">
                                    <span className="text-red-500 text-xl">⚠</span>
                                    <div>
                                        <div className="font-medium">Analysis Failed</div>
                                        <div className="text-sm text-red-600">{error}</div>
                                    </div>
                                </div>
                            )}
                            {success && (
                                <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center gap-3">
                                    <span className="text-green-500 text-xl">✓</span>
                                    <div className="font-medium">{success}</div>
                                </div>
                            )}

                            {/* Submit Button */}
                            {!uploading && (
                                <button
                                    onClick={handleDatasetUpload}
                                    disabled={!datasetFile}
                                    className="w-full py-4 bg-[#1434CB] hover:bg-[#0C1F7A] text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    Start Analysis
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
