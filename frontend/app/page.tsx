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
            for (const [type, file] of Object.entries(referenceFiles)) {
                if (file) {
                    await apiClient.ingestReference(file, type);
                }
            }
            const result = await apiClient.ingestDataset(datasetFile, datasetName);
            setSuccess(`Success! Redirecting to results...`);
            setTimeout(() => {
                router.push(`/runs/${result.run_id}`);
            }, 1500);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Upload failed. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            {/* Navigation */}
            <nav className="fixed top-0 w-full bg-slate-950/80 backdrop-blur-lg border-b border-white/10 z-50">
                <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                    <a href="/" className="flex items-center gap-3 hover:opacity-90 transition-all hover:scale-105">
                        <img src="/logo.png" alt="PayGuard DQ" className="w-12 h-12 rounded-xl shadow-lg" />
                        <span className="text-2xl font-bold">
                            <span className="text-blue-400">PayGuard</span> DQ
                        </span>
                    </a>
                    <div className="flex items-center gap-6">
                        <a href="/runs" className="text-sm text-gray-400 hover:text-white transition-colors">
                            Dashboard
                        </a>
                        <button
                            onClick={() => setShowUpload(true)}
                            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-all btn-glow hover:scale-105"
                        >
                            Start Analysis
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-6">
                <div className="container mx-auto max-w-4xl text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded-full text-blue-400 text-sm mb-8 animate-fade-in-up">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        GenAI-Powered Quality Scoring
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                        Data Quality Scoring
                        <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
                            for Payments
                        </span>
                    </h1>

                    <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                        Upload your payment transaction data and get an instant quality score across 7 dimensions.
                        No raw data stored. Full explainability. Actionable remediation.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                        <button
                            onClick={() => setShowUpload(true)}
                            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl text-lg font-semibold transition-all transform hover:scale-105 shadow-lg shadow-blue-500/25 btn-glow"
                        >
                            🚀 Analyze Your Data
                        </button>
                        <a
                            href="#how-it-works"
                            className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/20 rounded-xl text-lg font-semibold transition-all hover:scale-105"
                        >
                            Learn More ↓
                        </a>
                    </div>
                </div>
            </section>

            {/* The Problem Section */}
            <section className="py-20 px-6 bg-gradient-to-b from-slate-950 to-slate-900">
                <div className="container mx-auto max-w-5xl">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold mb-4">The Problem</h2>
                        <p className="text-gray-400 max-w-2xl mx-auto">
                            Payment data quality issues cost financial institutions billions annually
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
                            <div className="text-4xl mb-4">❌</div>
                            <h3 className="text-lg font-semibold mb-2">Manual Reviews</h3>
                            <p className="text-sm text-gray-400">
                                Data quality checks are done manually, taking days to complete and missing critical issues
                            </p>
                        </div>
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
                            <div className="text-4xl mb-4">❌</div>
                            <h3 className="text-lg font-semibold mb-2">Inconsistent Scoring</h3>
                            <p className="text-sm text-gray-400">
                                Different teams use different criteria, making it impossible to benchmark quality
                            </p>
                        </div>
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
                            <div className="text-4xl mb-4">❌</div>
                            <h3 className="text-lg font-semibold mb-2">No Explainability</h3>
                            <p className="text-sm text-gray-400">
                                When issues are found, there's no clear explanation of what failed and why
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* The Solution Section */}
            <section className="py-20 px-6 bg-slate-900">
                <div className="container mx-auto max-w-5xl">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold mb-4">The Solution: PayGuard DQ</h2>
                        <p className="text-gray-400 max-w-2xl mx-auto">
                            An AI-powered multi-agent system that scores payment data quality in seconds
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6">
                            <div className="text-4xl mb-4">✅</div>
                            <h3 className="text-lg font-semibold mb-2">Automated Analysis</h3>
                            <p className="text-sm text-gray-400">
                                7 specialized AI agents analyze your data in seconds, not days
                            </p>
                        </div>
                        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6">
                            <div className="text-4xl mb-4">✅</div>
                            <h3 className="text-lg font-semibold mb-2">Universal Scoring</h3>
                            <p className="text-sm text-gray-400">
                                Consistent 0-100 scores across 7 dimensions for any payment dataset
                            </p>
                        </div>
                        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6">
                            <div className="text-4xl mb-4">✅</div>
                            <h3 className="text-lg font-semibold mb-2">Full Explainability</h3>
                            <p className="text-sm text-gray-400">
                                Every score includes metrics, error rates, and actionable remediation steps
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section id="how-it-works" className="py-20 px-6 bg-gradient-to-b from-slate-900 to-slate-950">
                <div className="container mx-auto max-w-5xl">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold mb-4">How It Works</h2>
                        <p className="text-gray-400">Four simple steps to quality insights</p>
                    </div>

                    <div className="grid md:grid-cols-4 gap-8">
                        {[
                            { step: 1, icon: '📤', title: 'Upload', desc: 'Upload your payment CSV file (processed in-memory, never stored)' },
                            { step: 2, icon: '🤖', title: 'Analyze', desc: '7 AI agents profile schema, run 20+ checks across all dimensions' },
                            { step: 3, icon: '📊', title: 'Score', desc: 'Get per-dimension scores (0-100) with risk-weighted composite DQS' },
                            { step: 4, icon: '🔧', title: 'Remediate', desc: 'View prioritized issues with fix steps & export to dbt/GE' },
                        ].map((item) => (
                            <div key={item.step} className="text-center">
                                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg shadow-blue-500/25">
                                    {item.icon}
                                </div>
                                <div className="text-sm text-blue-400 font-medium mb-2">Step {item.step}</div>
                                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                                <p className="text-sm text-gray-400">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 7 Dimensions Section */}
            <section className="py-20 px-6 bg-slate-950">
                <div className="container mx-auto max-w-5xl">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold mb-4">7 Quality Dimensions</h2>
                        <p className="text-gray-400">Comprehensive coverage for payment data</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { icon: '📝', name: 'Completeness', desc: 'Missing & null values', color: 'from-blue-500/20 to-blue-600/10 border-blue-500/30' },
                            { icon: '🔑', name: 'Uniqueness', desc: 'Duplicate detection', color: 'from-purple-500/20 to-purple-600/10 border-purple-500/30' },
                            { icon: '✅', name: 'Validity', desc: 'ISO codes & formats', color: 'from-green-500/20 to-green-600/10 border-green-500/30' },
                            { icon: '🔗', name: 'Consistency', desc: 'Cross-field rules', color: 'from-yellow-500/20 to-yellow-600/10 border-yellow-500/30' },
                            { icon: '⏱️', name: 'Timeliness', desc: 'SLA compliance', color: 'from-orange-500/20 to-orange-600/10 border-orange-500/30' },
                            { icon: '🔒', name: 'Integrity', desc: 'Reference matches', color: 'from-pink-500/20 to-pink-600/10 border-pink-500/30' },
                            { icon: '💰', name: 'Reconciliation', desc: 'Settlement matching', color: 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/30', badge: 'Payments' },
                            { icon: '🎯', name: 'Composite DQS', desc: 'Risk-weighted score', color: 'from-indigo-500/20 to-indigo-600/10 border-indigo-500/30' },
                        ].map((dim) => (
                            <div key={dim.name} className={`bg-gradient-to-br ${dim.color} rounded-xl p-5 border relative`}>
                                {dim.badge && (
                                    <span className="absolute top-2 right-2 text-[10px] bg-cyan-500 text-white px-2 py-0.5 rounded-full">
                                        {dim.badge}
                                    </span>
                                )}
                                <div className="text-3xl mb-3">{dim.icon}</div>
                                <h3 className="text-sm font-semibold mb-1">{dim.name}</h3>
                                <p className="text-xs text-gray-400">{dim.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 7 Agents Section */}
            <section className="py-20 px-6 bg-gradient-to-b from-slate-950 to-slate-900">
                <div className="container mx-auto max-w-5xl">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold mb-4">7 Specialized AI Agents</h2>
                        <p className="text-gray-400">Each agent has a single responsibility</p>
                    </div>

                    <div className="relative">
                        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 to-purple-500 hidden md:block"></div>

                        <div className="space-y-6">
                            {[
                                { name: 'Profiler Agent', desc: 'Analyzes schema and computes aggregate statistics (null rates, cardinality, types)', icon: '🔍' },
                                { name: 'Dimension Selector', desc: 'Automatically identifies which quality dimensions apply to your dataset', icon: '🎯' },
                                { name: 'Check Executor', desc: 'Runs 20+ checks across all selected dimensions with severity levels', icon: '⚙️' },
                                { name: 'Scoring Agent', desc: 'Computes per-dimension scores (0-100) and risk-weighted composite DQS', icon: '📊' },
                                { name: 'Explainer Agent', desc: 'Generates human-readable narratives explaining scores and issues', icon: '📝' },
                                { name: 'Remediation Agent', desc: 'Creates prioritized fix recommendations with expected score gains', icon: '🔧' },
                                { name: 'Test Export Agent', desc: 'Generates dbt tests and Great Expectations suites for CI/CD', icon: '📦' },
                            ].map((agent, i) => (
                                <div key={agent.name} className={`flex items-center gap-6 ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                                    <div className={`flex-1 bg-white/5 rounded-xl p-6 border border-white/10 ${i % 2 === 0 ? 'md:text-right' : 'md:text-left'}`}>
                                        <h3 className="text-lg font-semibold mb-2">{agent.name}</h3>
                                        <p className="text-sm text-gray-400">{agent.desc}</p>
                                    </div>
                                    <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-2xl shadow-lg shrink-0 z-10">
                                        {agent.icon}
                                    </div>
                                    <div className="flex-1 hidden md:block"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Key Features Section */}
            <section className="py-20 px-6 bg-slate-900">
                <div className="container mx-auto max-w-5xl">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold mb-4">Key Features</h2>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/30 rounded-xl p-8">
                            <div className="text-5xl mb-4">🔒</div>
                            <h3 className="text-xl font-bold mb-3">Zero Raw Data Storage</h3>
                            <p className="text-gray-400 mb-4">Your transaction data is processed in-memory only. We store only metadata, scores, and aggregates. Never raw data. Never PII.</p>
                            <ul className="text-sm text-emerald-400 space-y-1">
                                <li>✓ GDPR compliant</li>
                                <li>✓ No data retention</li>
                                <li>✓ Governance reports included</li>
                            </ul>
                        </div>

                        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/30 rounded-xl p-8">
                            <div className="text-5xl mb-4">🧠</div>
                            <h3 className="text-xl font-bold mb-3">Full Explainability</h3>
                            <p className="text-gray-400 mb-4">Every score comes with detailed breakdowns. Know exactly what failed, where, and why.</p>
                            <ul className="text-sm text-blue-400 space-y-1">
                                <li>✓ Metrics & error rates</li>
                                <li>✓ Failing check details</li>
                                <li>✓ Impacted columns</li>
                            </ul>
                        </div>

                        <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/30 rounded-xl p-8">
                            <div className="text-5xl mb-4">💰</div>
                            <h3 className="text-xl font-bold mb-3">Payments-Specific</h3>
                            <p className="text-gray-400 mb-4">Built specifically for payment transaction data with specialized reconciliation checks.</p>
                            <ul className="text-sm text-purple-400 space-y-1">
                                <li>✓ BIN map validation</li>
                                <li>✓ Settlement ledger matching</li>
                                <li>✓ Currency decimal rules</li>
                            </ul>
                        </div>

                        <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/30 rounded-xl p-8">
                            <div className="text-5xl mb-4">📦</div>
                            <h3 className="text-xl font-bold mb-3">Export to CI/CD</h3>
                            <p className="text-gray-400 mb-4">Generate test artifacts for your existing data quality infrastructure.</p>
                            <ul className="text-sm text-orange-400 space-y-1">
                                <li>✓ dbt schema tests YAML</li>
                                <li>✓ Great Expectations JSON</li>
                                <li>✓ Jira ticket payloads</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-6 bg-gradient-to-b from-slate-900 to-slate-950">
                <div className="container mx-auto max-w-3xl text-center">
                    <h2 className="text-4xl font-bold mb-6">Ready to Score Your Data?</h2>
                    <p className="text-xl text-gray-400 mb-8">
                        Upload your payment transaction CSV and get instant quality insights
                    </p>
                    <button
                        onClick={() => setShowUpload(true)}
                        className="px-10 py-5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl text-xl font-semibold transition-all transform hover:scale-105 shadow-xl shadow-blue-500/25"
                    >
                        🚀 Start Free Analysis
                    </button>
                    <p className="text-sm text-gray-500 mt-4">No signup required • No data stored</p>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 px-6 border-t border-white/10">
                <div className="container mx-auto max-w-5xl text-center text-gray-500 text-sm">
                    <p>Built with ❤️ for Hackathon 2024</p>
                    <p className="mt-2">Python FastAPI • Next.js • 7 Agents • 7 Dimensions • 10,500+ LOC</p>
                </div>
            </footer>

            {/* Upload Modal */}
            {showUpload && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-white/20 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center">
                            <h2 className="text-xl font-bold">Analyze Dataset</h2>
                            <button onClick={() => setShowUpload(false)} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Dataset Upload */}
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Transaction Dataset (CSV) <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={(e) => setDatasetFile(e.target.files?.[0] || null)}
                                    className="w-full px-4 py-4 bg-white/5 border-2 border-dashed border-white/30 rounded-lg focus:border-blue-500 cursor-pointer"
                                />
                                {datasetFile && <p className="text-green-400 text-sm mt-2">✓ {datasetFile.name}</p>}
                            </div>

                            {/* Dataset Name */}
                            <div>
                                <label className="block text-sm font-medium mb-2">Dataset Name (optional)</label>
                                <input
                                    type="text"
                                    value={datasetName}
                                    onChange={(e) => setDatasetName(e.target.value)}
                                    placeholder="e.g., Q4_2024_Transactions"
                                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg focus:border-blue-500 focus:outline-none"
                                />
                            </div>

                            {/* Reference Files */}
                            <details className="group">
                                <summary className="cursor-pointer p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 list-none">
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium">📚 Reference Data (Optional)</span>
                                        <span className="text-sm text-gray-400 group-open:hidden">Click to expand</span>
                                    </div>
                                </summary>
                                <div className="mt-4 grid grid-cols-2 gap-4 p-4 bg-white/5 rounded-lg">
                                    {[
                                        { key: 'bin_map', label: 'BIN Map', desc: 'Card BIN to issuer' },
                                        { key: 'currency_rules', label: 'Currency Rules', desc: 'Decimal places' },
                                        { key: 'mcc_codes', label: 'MCC Codes', desc: 'Valid codes' },
                                        { key: 'settlement_ledger', label: 'Settlement', desc: 'For reconciliation' },
                                    ].map((ref) => (
                                        <div key={ref.key}>
                                            <label className="block text-sm font-medium mb-1">{ref.label}</label>
                                            <input
                                                type="file"
                                                accept=".csv"
                                                onChange={(e) => setReferenceFiles({ ...referenceFiles, [ref.key]: e.target.files?.[0] })}
                                                className="w-full text-xs bg-white/5 border border-white/20 rounded p-2"
                                            />
                                            <p className="text-[10px] text-gray-500 mt-1">{ref.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </details>

                            {/* Error/Success */}
                            {error && <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200">⚠️ {error}</div>}
                            {success && <div className="p-4 bg-green-500/20 border border-green-500/50 rounded-lg text-green-200">✅ {success}</div>}

                            {/* Submit Button */}
                            <button
                                onClick={handleDatasetUpload}
                                disabled={uploading || !datasetFile}
                                className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                            >
                                {uploading ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Analyzing with 7 agents...
                                    </>
                                ) : (
                                    '🚀 Analyze Dataset'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer */}
            <footer className="bg-slate-900 border-t border-white/10 py-12 px-6">
                <div className="container mx-auto max-w-5xl">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-4">
                            <img src="/logo.png" alt="PayGuard DQ" className="w-12 h-12 rounded-xl" />
                            <div>
                                <span className="text-xl font-bold">
                                    <span className="text-blue-400">PayGuard</span> DQ
                                </span>
                                <p className="text-gray-500 text-sm">AI-Powered Data Quality for Payments</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-6 text-sm text-gray-400">
                            <span>🤖 Gemini AI</span>
                            <span>🧠 ML Anomaly Detection</span>
                            <span className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                Zero Data Storage
                            </span>
                        </div>
                    </div>
                    <div className="border-t border-white/10 mt-8 pt-8 text-center text-gray-500 text-sm">
                        © 2026 PayGuard DQ • Built for VISA Hackathon Finals
                    </div>
                </div>
            </footer>
        </div>
    );
}
