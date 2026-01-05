'use client';

import { useEffect, useState } from 'react';
import { apiClient, RunSummary } from '@/lib/api';
import Link from 'next/link';

export default function RunsPage() {
    const [runs, setRuns] = useState<RunSummary[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadRuns();
    }, []);

    const loadRuns = async () => {
        try {
            const data = await apiClient.listRuns();
            setRuns(data);
        } catch (error) {
            console.error('Failed to load runs:', error);
        } finally {
            setLoading(false);
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 90) return 'text-green-600 bg-green-50 border-green-200';
        if (score >= 70) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
        return 'text-red-600 bg-red-50 border-red-200';
    };

    const getScoreBadge = (score: number) => {
        if (score >= 90) return 'Excellent';
        if (score >= 70) return 'Good';
        if (score >= 50) return 'Fair';
        return 'Poor';
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200">
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
                                <span className="text-sm text-[#1434CB] font-medium">All Runs</span>
                            </nav>
                        </div>
                        <div className="flex items-center gap-3">
                            <Link
                                href="/"
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                ← Home
                            </Link>
                            <Link
                                href="/"
                                className="px-5 py-2.5 bg-[#1434CB] hover:bg-[#0C1F7A] text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                New Analysis
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-6 py-8">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Analysis History</h1>
                    <p className="text-gray-600">View and compare past data quality assessments</p>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="text-center">
                            <div className="w-12 h-12 border-4 border-[#1434CB] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <div className="text-gray-600">Loading analysis history...</div>
                        </div>
                    </div>
                ) : runs.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                        <div className="text-5xl mb-4">📊</div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">No Analyses Yet</h2>
                        <p className="text-gray-600 mb-6">Upload a transaction file to get started with your first quality assessment.</p>
                        <Link
                            href="/"
                            className="inline-flex px-6 py-3 bg-[#1434CB] text-white rounded-lg font-medium hover:bg-[#0C1F7A] transition-colors"
                        >
                            Start Your First Analysis
                        </Link>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Dataset</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Quality Score</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Rows</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Columns</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Date</th>
                                    <th className="text-right px-6 py-4 text-sm font-semibold text-gray-700">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {runs.map((run) => (
                                    <tr key={run.run_id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{run.dataset_name}</div>
                                            <div className="text-sm text-gray-500">{run.run_id.slice(0, 8)}...</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${getScoreColor(run.composite_dqs ?? 0)}`}>
                                                <span className="font-bold">{(run.composite_dqs ?? 0).toFixed(1)}</span>
                                                <span className="text-sm">{getScoreBadge(run.composite_dqs ?? 0)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-700">{run.row_count.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-gray-700">{run.column_count}</td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {new Date(run.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link
                                                href={`/runs/${run.run_id}`}
                                                className="px-4 py-2 bg-[#1434CB]/10 text-[#1434CB] rounded-lg text-sm font-medium hover:bg-[#1434CB]/20 transition-colors"
                                            >
                                                View Details
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Summary Stats */}
                {runs.length > 0 && (
                    <div className="mt-8 grid md:grid-cols-3 gap-6">
                        <div className="bg-white rounded-xl p-6 border border-gray-200">
                            <div className="text-sm text-gray-600 mb-1">Total Analyses</div>
                            <div className="text-3xl font-bold text-[#1434CB]">{runs.length}</div>
                        </div>
                        <div className="bg-white rounded-xl p-6 border border-gray-200">
                            <div className="text-sm text-gray-600 mb-1">Average Score</div>
                            <div className="text-3xl font-bold text-[#1434CB]">
                                {(runs.reduce((acc, r) => acc + (r.composite_dqs ?? 0), 0) / runs.length).toFixed(1)}
                            </div>
                        </div>
                        <div className="bg-white rounded-xl p-6 border border-gray-200">
                            <div className="text-sm text-gray-600 mb-1">Total Rows Analyzed</div>
                            <div className="text-3xl font-bold text-[#1434CB]">
                                {runs.reduce((acc, r) => acc + r.row_count, 0).toLocaleString()}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
