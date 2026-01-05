'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient, RunDetail } from '@/lib/api';
import { generateProfessionalReport } from '@/lib/reportGenerator';
import Link from 'next/link';
import Image from 'next/image';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';

const COLORS = ['#1434CB', '#FCC116', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];

// Helper to format metric values nicely
const formatValue = (key: string, value: any): string => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'number') {
        // Percentages
        if (key.includes('rate') || key.includes('Rate')) {
            return `${(value * 100).toFixed(1)}%`;
        }
        // Hours
        if (key.includes('hours') || key.includes('Hours')) {
            if (value > 24) return `${(value / 24).toFixed(1)} days`;
            return `${value.toFixed(1)} hours`;
        }
        // Counts
        if (key.includes('count') || key.includes('Count')) {
            return value.toLocaleString();
        }
        // Decimal numbers
        if (!Number.isInteger(value)) {
            return value.toFixed(2);
        }
        return value.toLocaleString();
    }
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (Array.isArray(value)) return value.slice(0, 3).join(', ') + (value.length > 3 ? '...' : '');
    if (typeof value === 'object') return Object.keys(value).length + ' items';
    return String(value);
};

// Helper to format metric key names
const formatKey = (key: string): string => {
    return key
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .trim();
};

export default function RunDetailPage() {
    const params = useParams();
    const router = useRouter();
    const runId = params.id as string;
    const [runDetail, setRunDetail] = useState<RunDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'issues' | 'remediation' | 'exports'>('overview');
    const [showCostCalculator, setShowCostCalculator] = useState(false);
    const [transactionVolume, setTransactionVolume] = useState(100000);

    useEffect(() => {
        if (runId) {
            loadRunDetail();
        }
    }, [runId]);

    const loadRunDetail = async () => {
        try {
            const data = await apiClient.getRun(runId);
            setRunDetail(data);
        } catch (error) {
            console.error('Failed to load run detail:', error);
        } finally {
            setLoading(false);
        }
    };

    const downloadFile = (blob: Blob, filename: string) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const handleDownloadDbt = async () => {
        const blob = await apiClient.downloadDbt(runId);
        downloadFile(blob, `dbt_tests_${runId}.yml`);
    };

    const handleDownloadGE = async () => {
        const blob = await apiClient.downloadGE(runId);
        downloadFile(blob, `ge_suite_${runId}.json`);
    };

    const handleDownloadReport = (format: 'json' | 'pdf') => {
        if (!runDetail) return;

        if (format === 'json') {
            const report = {
                run_id: runDetail.run.run_id,
                dataset: runDetail.run.dataset_name,
                timestamp: runDetail.run.timestamp,
                composite_dqs: runDetail.scores.composite_dqs,
                dimension_scores: runDetail.scores.dimension_scores,
                checks: runDetail.checks,
                remediation: runDetail.remediation,
                narrative: runDetail.narrative,
            };
            const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
            downloadFile(blob, `quality_report_${runId}.json`);
        } else {
            // Map dimension_scores array to object format
            const dimensionScoresObj: Record<string, { score: number; weight: number }> = {};
            if (Array.isArray(runDetail.scores?.dimension_scores)) {
                runDetail.scores.dimension_scores.forEach((d: any) => {
                    dimensionScoresObj[d.dimension] = { score: d.score, weight: d.weight };
                });
            }

            // Map runDetail to report data structure
            const reportData = {
                run_id: runDetail.run.run_id,
                dataset_name: runDetail.run.dataset_name,
                row_count: runDetail.run.row_count,
                column_count: runDetail.run.column_count,
                composite_dqs: runDetail.scores?.composite_dqs ?? 0,
                dimension_scores: dimensionScoresObj,
                checks: runDetail.checks ?? [],
                narrative: typeof runDetail.narrative === 'string' ? runDetail.narrative : (runDetail.narrative as any)?.summary ?? '',
                remediation: runDetail.remediation,
            };

            // Generate professional HTML report
            const pdfContent = generateProfessionalReport(reportData);
            const blob = new Blob([pdfContent], { type: 'text/html' });
            downloadFile(blob, `quality_report_${runId}.html`);

            // Open print dialog for PDF
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(pdfContent);
                printWindow.document.close();
                setTimeout(() => printWindow.print(), 500);
            }
        }
    };

    const [showDownloadMenu, setShowDownloadMenu] = useState(false);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-[#1434CB] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <div className="text-gray-600">Loading analysis results...</div>
                </div>
            </div>
        );
    }

    if (!runDetail) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">📊</div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Run Not Found</h2>
                    <p className="text-gray-600 mb-6">The requested analysis could not be found.</p>
                    <Link href="/runs" className="px-6 py-3 bg-[#1434CB] text-white rounded-lg hover:bg-[#0C1F7A]">
                        View All Runs
                    </Link>
                </div>
            </div>
        );
    }

    const dimensionChartData = runDetail.scores.dimension_scores.map((ds) => ({
        name: ds.dimension,
        score: ds.score,
        weight: ds.weight * 100,
        fullMark: 100,
    }));

    const radarData = runDetail.scores.dimension_scores.map((ds) => ({
        dimension: ds.dimension.charAt(0).toUpperCase() + ds.dimension.slice(1),
        score: ds.score,
        fullMark: 100,
    }));

    const failingChecks = runDetail.checks.filter((c) => !c.passed);
    const passingChecks = runDetail.checks.filter((c) => c.passed);
    const criticalIssues = failingChecks.filter((c) => c.severity === 'critical');
    const highIssues = failingChecks.filter((c) => c.severity === 'high');
    const mediumIssues = failingChecks.filter((c) => c.severity === 'medium');
    const lowIssues = failingChecks.filter((c) => c.severity === 'low');

    const severityData = [
        { name: 'Critical', value: criticalIssues.length, color: '#ef4444' },
        { name: 'High', value: highIssues.length, color: '#f97316' },
        { name: 'Medium', value: mediumIssues.length, color: '#eab308' },
        { name: 'Low', value: lowIssues.length, color: '#3b82f6' },
        { name: 'Passed', value: passingChecks.length, color: '#10b981' },
    ].filter(d => d.value > 0);

    // Cost savings calculation
    const estimatedPenaltyRate = 0.0015; // 0.15% penalty rate
    const avgTransactionValue = 150;
    const nonComplianceRate = (100 - runDetail.scores.composite_dqs) / 100;
    const potentialPenalty = transactionVolume * avgTransactionValue * estimatedPenaltyRate * nonComplianceRate;
    const potentialSavings = transactionVolume * avgTransactionValue * estimatedPenaltyRate * 0.9; // 90% of penalties avoided

    const getScoreColor = (score: number) => {
        if (score >= 90) return 'text-green-600';
        if (score >= 70) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getScoreBg = (score: number) => {
        if (score >= 90) return 'bg-green-100 border-green-200';
        if (score >= 70) return 'bg-yellow-100 border-yellow-200';
        return 'bg-red-100 border-red-200';
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                                <div className="w-8 h-8 bg-[#1434CB] rounded-lg flex items-center justify-center">
                                    <span className="text-white font-bold text-sm">PG</span>
                                </div>
                                <span className="text-xl font-semibold text-gray-900">PayGuard DQ</span>
                            </Link>
                            <span className="text-gray-300">|</span>
                            <nav className="flex items-center gap-4">
                                <Link href="/" className="text-sm text-gray-600 hover:text-[#1434CB] transition-colors">Home</Link>
                                <Link href="/runs" className="text-sm text-gray-600 hover:text-[#1434CB] transition-colors">All Runs</Link>
                                <span className="text-sm text-[#1434CB] font-medium">Results</span>
                            </nav>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Export Buttons - Clear and Direct */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleDownloadReport('pdf')}
                                    className="px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2 font-medium"
                                >
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                                    </svg>
                                    PDF Report
                                </button>
                                <button
                                    onClick={() => handleDownloadReport('json')}
                                    className="px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2 font-medium"
                                >
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 6a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zm0 6a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" clipRule="evenodd" />
                                    </svg>
                                    JSON Data
                                </button>
                            </div>
                            <div className="h-6 w-px bg-gray-300"></div>
                            <Link href="/" className="px-4 py-2 bg-[#1434CB] text-white rounded-lg hover:bg-[#0C1F7A] transition-colors font-medium">
                                ← Home
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-6 py-8">
                {/* Score Summary Card */}
                <div className={`rounded-2xl p-8 mb-8 border ${getScoreBg(runDetail.scores.composite_dqs)}`}>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">{runDetail.run.dataset_name}</h1>
                            <p className="text-gray-600 text-sm">
                                Run ID: {runDetail.run.run_id.slice(0, 8)}... •
                                {new Date(runDetail.run.created_at || runDetail.run.timestamp).toLocaleString()}
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-gray-600 mb-1">Composite Data Quality Score</div>
                            <div className={`text-6xl font-bold ${getScoreColor(runDetail.scores.composite_dqs ?? 0)}`}>
                                {(runDetail.scores.composite_dqs ?? 0).toFixed(1)}
                            </div>
                            <div className="text-gray-600 mt-2">
                                {(runDetail.run.row_count ?? 0).toLocaleString()} rows • {runDetail.run.column_count ?? 0} columns
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                        <div className="bg-white rounded-xl p-4 border border-gray-200">
                            <div className="text-sm text-gray-600">Total Checks</div>
                            <div className="text-2xl font-bold text-gray-900">{runDetail.checks.length}</div>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-gray-200">
                            <div className="text-sm text-gray-600">Passed</div>
                            <div className="text-2xl font-bold text-green-600">{passingChecks.length}</div>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-gray-200">
                            <div className="text-sm text-gray-600">Failed</div>
                            <div className="text-2xl font-bold text-red-600">{failingChecks.length}</div>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-gray-200">
                            <div className="text-sm text-gray-600">Dimensions</div>
                            <div className="text-2xl font-bold text-[#1434CB]">{runDetail.scores.dimension_scores.length}</div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 overflow-x-auto">
                    {(['overview', 'analytics', 'issues', 'remediation', 'exports'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-5 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${activeTab === tab
                                ? 'bg-[#1434CB] text-white'
                                : 'bg-white text-gray-600 border border-gray-200 hover:border-[#1434CB]'
                                }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
                    {activeTab === 'overview' && (
                        <div className="p-8">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Radar Chart */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Dimension Overview</h3>
                                    <div className="bg-gray-50 rounded-xl p-4">
                                        <ResponsiveContainer width="100%" height={350}>
                                            <RadarChart data={radarData}>
                                                <PolarGrid stroke="#e5e7eb" />
                                                <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 12, fill: '#4b5563' }} />
                                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                                                <Radar name="Score" dataKey="score" stroke="#1434CB" fill="#1434CB" fillOpacity={0.3} strokeWidth={2} />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Dimension Scores List */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Dimension Scores</h3>
                                    <div className="space-y-3">
                                        {runDetail.scores.dimension_scores.map((ds) => (
                                            <div key={ds.dimension} className="bg-gray-50 rounded-xl p-4">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="font-medium text-gray-900 capitalize">{ds.dimension}</span>
                                                    <span className={`font-bold ${getScoreColor(ds.score)}`}>{ds.score.toFixed(1)}</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                    <div
                                                        className={`h-2 rounded-full ${ds.score >= 90 ? 'bg-green-500' :
                                                            ds.score >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                                                            }`}
                                                        style={{ width: `${ds.score}%` }}
                                                    />
                                                </div>
                                                <div className="flex justify-between mt-2 text-xs text-gray-500">
                                                    <span>Weight: {(ds.weight * 100).toFixed(0)}%</span>
                                                    <span>Contribution: {(ds.score * ds.weight).toFixed(1)} pts</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Executive Summary */}
                            <div className="mt-8">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Executive Summary</h3>
                                <div className="bg-gray-50 rounded-xl p-6 text-gray-700 whitespace-pre-wrap leading-relaxed">
                                    {runDetail.narrative}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'analytics' && (
                        <div className="p-8">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Bar Chart */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Score by Dimension</h3>
                                    <div className="bg-gray-50 rounded-xl p-4">
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={dimensionChartData} layout="vertical">
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                                                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                                                />
                                                <Bar dataKey="score" fill="#1434CB" radius={[0, 4, 4, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Issue Distribution */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Check Results Distribution</h3>
                                    <div className="bg-gray-50 rounded-xl p-4">
                                        <ResponsiveContainer width="100%" height={300}>
                                            <PieChart>
                                                <Pie
                                                    data={severityData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={100}
                                                    paddingAngle={2}
                                                    dataKey="value"
                                                >
                                                    {severityData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            {/* Cost Savings Calculator */}
                            <div className="mt-8">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Impact Calculator</h3>
                                <div className="bg-gradient-to-r from-[#1434CB]/5 to-[#FCC116]/5 rounded-xl p-6 border border-[#1434CB]/20">
                                    <div className="grid md:grid-cols-3 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Transaction Volume</label>
                                            <input
                                                type="number"
                                                value={transactionVolume}
                                                onChange={(e) => setTransactionVolume(Number(e.target.value))}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1434CB]/20 focus:border-[#1434CB]"
                                            />
                                        </div>
                                        <div className="bg-white rounded-xl p-4 border border-red-200">
                                            <div className="text-sm text-gray-600">Potential Penalty Exposure</div>
                                            <div className="text-3xl font-bold text-red-600">${potentialPenalty.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                                            <div className="text-xs text-gray-500 mt-1">Based on current quality score</div>
                                        </div>
                                        <div className="bg-white rounded-xl p-4 border border-green-200">
                                            <div className="text-sm text-gray-600">Potential Savings</div>
                                            <div className="text-3xl font-bold text-green-600">${potentialSavings.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                                            <div className="text-xs text-gray-500 mt-1">With 95%+ quality score</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'issues' && (
                        <div className="p-8">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-semibold text-gray-900">Issues & Evidence</h3>
                                <div className="flex gap-2">
                                    <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                                        {criticalIssues.length} Critical
                                    </span>
                                    <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                                        {highIssues.length} High
                                    </span>
                                    <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                                        {mediumIssues.length} Medium
                                    </span>
                                </div>
                            </div>

                            {failingChecks.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="text-5xl mb-4">✅</div>
                                    <div className="text-xl text-green-600 font-semibold">All Checks Passed</div>
                                    <p className="text-gray-500 mt-2">No data quality issues detected.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {failingChecks.map((check, idx) => (
                                        <div key={idx} className={`rounded-xl p-6 border-l-4 ${check.severity === 'critical' ? 'bg-red-50 border-red-500' :
                                            check.severity === 'high' ? 'bg-orange-50 border-orange-500' :
                                                check.severity === 'medium' ? 'bg-yellow-50 border-yellow-500' :
                                                    'bg-blue-50 border-blue-500'
                                            }`}>
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <h4 className="font-semibold text-gray-900">{check.check_id}</h4>
                                                    <div className="flex gap-3 mt-1">
                                                        <span className="text-sm text-gray-600 capitalize">Dimension: {check.dimension}</span>
                                                        <span className={`text-sm font-medium uppercase ${check.severity === 'critical' ? 'text-red-600' :
                                                            check.severity === 'high' ? 'text-orange-600' :
                                                                check.severity === 'medium' ? 'text-yellow-600' : 'text-blue-600'
                                                            }`}>
                                                            {check.severity}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="bg-white rounded-lg p-4 mt-3">
                                                <div className="text-sm text-gray-600 font-medium mb-3">Key Metrics</div>
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                    {Object.entries(check.metrics || {}).filter(([key]) =>
                                                        !key.includes('info') && !key.includes('columns') && typeof check.metrics[key] !== 'object'
                                                    ).slice(0, 6).map(([key, value]) => (
                                                        <div key={key} className="bg-gray-50 rounded-lg p-3">
                                                            <div className="text-xs text-gray-500 capitalize">{formatKey(key)}</div>
                                                            <div className="text-sm font-semibold text-gray-900 mt-1">{formatValue(key, value)}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'remediation' && (
                        <div className="p-8">
                            <h3 className="text-lg font-semibold text-gray-900 mb-6">Remediation Plan</h3>

                            {runDetail.remediation?.remediation_plan && (
                                <div className="grid md:grid-cols-3 gap-6 mb-8">
                                    {Object.entries(runDetail.remediation.remediation_plan).map(([phase, data]: [string, any]) => (
                                        <div key={phase} className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                                            <div className="font-semibold text-gray-900 mb-3 capitalize">
                                                {phase.replace('_', ' ')}
                                            </div>
                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Issues</span>
                                                    <span className="font-medium">{data.count}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Expected Gain</span>
                                                    <span className="font-medium text-green-600">+{data.expected_total_gain?.toFixed(1)} pts</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Timeline</span>
                                                    <span className="font-medium">{data.timeline}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {runDetail.remediation?.top_issues && (
                                <div>
                                    <h4 className="font-semibold text-gray-900 mb-4">Priority Fixes</h4>
                                    <div className="space-y-4">
                                        {runDetail.remediation.top_issues.map((issue: any, idx: number) => (
                                            <div key={idx} className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <span className="text-sm font-medium text-[#1434CB]">Priority {idx + 1}</span>
                                                        <h5 className="font-semibold text-gray-900">{issue.check_id}</h5>
                                                    </div>
                                                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                                                        +{issue.score_gain?.toFixed(1)} pts
                                                    </span>
                                                </div>
                                                {issue.fix_steps && (
                                                    <div className="mt-3">
                                                        <div className="text-sm font-medium text-gray-700 mb-2">Fix Steps:</div>
                                                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                                            {issue.fix_steps.map((step: string, i: number) => (
                                                                <li key={i}>{step}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'exports' && (
                        <div className="p-8">
                            <h3 className="text-lg font-semibold text-gray-900 mb-6">Export & Integrations</h3>

                            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <button
                                    onClick={() => handleDownloadReport('json')}
                                    className="bg-gray-50 hover:bg-gray-100 rounded-xl p-6 border border-gray-200 text-left transition-colors group"
                                >
                                    <div className="w-12 h-12 bg-[#1434CB]/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-[#1434CB]/20 transition-colors">
                                        <span className="text-2xl">📊</span>
                                    </div>
                                    <h4 className="font-semibold text-gray-900 mb-1">Full Report (JSON)</h4>
                                    <p className="text-sm text-gray-600">Structured data with all scores</p>
                                </button>

                                <button
                                    onClick={handleDownloadDbt}
                                    className="bg-gray-50 hover:bg-gray-100 rounded-xl p-6 border border-gray-200 text-left transition-colors group"
                                >
                                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-green-200 transition-colors">
                                        <span className="text-2xl">🧪</span>
                                    </div>
                                    <h4 className="font-semibold text-gray-900 mb-1">dbt Tests</h4>
                                    <p className="text-sm text-gray-600">YAML schema tests for dbt</p>
                                </button>

                                <button
                                    onClick={handleDownloadGE}
                                    className="bg-gray-50 hover:bg-gray-100 rounded-xl p-6 border border-gray-200 text-left transition-colors group"
                                >
                                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-200 transition-colors">
                                        <span className="text-2xl">✅</span>
                                    </div>
                                    <h4 className="font-semibold text-gray-900 mb-1">Great Expectations</h4>
                                    <p className="text-sm text-gray-600">JSON suite for GE</p>
                                </button>

                                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                                    <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mb-4">
                                        <span className="text-2xl">📋</span>
                                    </div>
                                    <h4 className="font-semibold text-gray-900 mb-1">Governance Report</h4>
                                    <p className="text-sm text-gray-600">Compliance documentation</p>
                                </div>
                            </div>

                            {/* Agent Logs */}
                            <div className="mt-8">
                                <h4 className="font-semibold text-gray-900 mb-4">Agent Execution Log</h4>
                                <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                                    <table className="w-full">
                                        <thead className="bg-gray-100">
                                            <tr>
                                                <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Step</th>
                                                <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Agent</th>
                                                <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Duration</th>
                                                <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Timestamp</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {runDetail.agent_logs.map((log, idx) => (
                                                <tr key={idx} className="border-t border-gray-200">
                                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{log.step_order}</td>
                                                    <td className="px-6 py-4 text-sm text-gray-700">{log.agent_name}</td>
                                                    <td className="px-6 py-4 text-sm text-gray-600">{log.duration_ms}ms</td>
                                                    <td className="px-6 py-4 text-sm text-gray-600">{new Date(log.timestamp).toLocaleTimeString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
