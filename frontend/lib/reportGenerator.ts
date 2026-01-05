/**
 * Professional Report Generator for PayGuard DQ
 * Generates HTML reports for PDF export
 */

interface DimensionScore {
    score: number;
    weight: number;
}

interface CheckResult {
    check_id: string;
    passed: boolean;
    severity: string;
    dimension: string;
    metrics?: Record<string, any>;
}

interface ReportData {
    run_id: string;
    dataset_name: string;
    row_count: number;
    column_count: number;
    composite_dqs: number;
    dimension_scores: Record<string, DimensionScore>;
    checks: CheckResult[];
    narrative?: string;
    remediation?: {
        top_issues?: Array<{
            check_id: string;
            severity: string;
            score_gain: number;
            fix_steps?: string[];
        }>;
    };
}

export function generateProfessionalReport(data: ReportData): string {
    const {
        run_id,
        dataset_name,
        row_count,
        column_count,
        composite_dqs,
        dimension_scores,
        checks,
        narrative,
        remediation
    } = data;

    const now = new Date().toLocaleString();
    const scoreColor = composite_dqs >= 80 ? '#10b981' : composite_dqs >= 60 ? '#f59e0b' : '#ef4444';
    const scoreLabel = composite_dqs >= 80 ? 'Good' : composite_dqs >= 60 ? 'Fair' : 'Poor';

    const failingChecks = checks.filter(c => !c.passed);
    const criticalCount = failingChecks.filter(c => c.severity === 'critical').length;
    const highCount = failingChecks.filter(c => c.severity === 'high').length;
    const passedCount = checks.length - failingChecks.length;

    // Generate dimension rows
    const dimensionRows = Object.entries(dimension_scores).map(([dim, data]) => {
        const score = data.score ?? 0;
        const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
        const width = Math.min(100, Math.max(0, score));
        return `
      <tr>
        <td style="padding: 12px; text-transform: capitalize; font-weight: 500;">${dim}</td>
        <td style="padding: 12px;">
          <div style="background: #e5e7eb; border-radius: 4px; height: 20px; position: relative;">
            <div style="background: ${color}; border-radius: 4px; height: 100%; width: ${width}%;"></div>
          </div>
        </td>
        <td style="padding: 12px; text-align: right; font-weight: 600; color: ${color};">${score.toFixed(1)}</td>
        <td style="padding: 12px; text-align: center;">${score >= 80 ? '✅' : score >= 60 ? '⚠️' : '❌'}</td>
      </tr>
    `;
    }).join('');

    // Generate issues list
    const issuesList = failingChecks.slice(0, 10).map(check => {
        const severityColor = check.severity === 'critical' ? '#ef4444' : check.severity === 'high' ? '#f97316' : '#eab308';
        return `
      <tr>
        <td style="padding: 10px;">
          <span style="background: ${severityColor}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: uppercase;">
            ${check.severity}
          </span>
        </td>
        <td style="padding: 10px; font-weight: 500;">${check.check_id}</td>
        <td style="padding: 10px; text-transform: capitalize;">${check.dimension}</td>
      </tr>
    `;
    }).join('');

    // Generate recommendations
    const recommendations = remediation?.top_issues?.slice(0, 5).map((issue, idx) => `
    <div style="margin-bottom: 16px; padding: 16px; background: #f9fafb; border-radius: 8px; border-left: 4px solid #1434CB;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span style="font-weight: 600; color: #1434CB;">Priority ${idx + 1}: ${issue.check_id}</span>
        <span style="color: #10b981; font-weight: 600;">+${(issue.score_gain ?? 0).toFixed(1)} pts potential</span>
      </div>
      ${issue.fix_steps ? `
        <ul style="margin: 8px 0 0 0; padding-left: 20px; color: #4b5563;">
          ${issue.fix_steps.map(step => `<li style="margin: 4px 0;">${step}</li>`).join('')}
        </ul>
      ` : ''}
    </div>
  `).join('') || '<p style="color: #6b7280;">No specific recommendations at this time.</p>';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>PayGuard DQ Report - ${dataset_name}</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      max-width: 900px;
      margin: 0 auto;
      padding: 40px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      border-bottom: 1px solid #e5e7eb;
    }
    th {
      background: #f9fafb;
      text-align: left;
      padding: 12px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #1434CB;">
    <div>
      <h1 style="margin: 0; color: #1434CB; font-size: 28px;">PayGuard DQ</h1>
      <p style="margin: 5px 0 0 0; color: #6b7280;">Data Quality Assessment Report</p>
    </div>
    <div style="text-align: right;">
      <p style="margin: 0; font-size: 14px; color: #6b7280;">Run ID: ${run_id}</p>
      <p style="margin: 0; font-size: 14px; color: #6b7280;">Generated: ${now}</p>
    </div>
  </div>

  <!-- Executive Summary -->
  <div style="background: linear-gradient(135deg, #1434CB 0%, #0f2a9e 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
    <h2 style="margin: 0 0 20px 0; font-size: 20px;">Executive Summary</h2>
    <div style="display: flex; gap: 40px;">
      <div style="text-align: center;">
        <div style="font-size: 56px; font-weight: 700;">${(composite_dqs ?? 0).toFixed(0)}</div>
        <div style="font-size: 14px; opacity: 0.9;">Quality Score</div>
        <div style="margin-top: 8px; padding: 4px 12px; background: ${scoreColor}; border-radius: 20px; display: inline-block;">
          ${scoreLabel}
        </div>
      </div>
      <div style="flex: 1;">
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
          <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 8px;">
            <div style="font-size: 24px; font-weight: 600;">${row_count.toLocaleString()}</div>
            <div style="font-size: 12px; opacity: 0.8;">Rows Analyzed</div>
          </div>
          <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 8px;">
            <div style="font-size: 24px; font-weight: 600;">${column_count}</div>
            <div style="font-size: 12px; opacity: 0.8;">Columns</div>
          </div>
          <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 8px;">
            <div style="font-size: 24px; font-weight: 600;">${passedCount}/${checks.length}</div>
            <div style="font-size: 12px; opacity: 0.8;">Checks Passed</div>
          </div>
          <div style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 8px;">
            <div style="font-size: 24px; font-weight: 600; color: ${criticalCount > 0 ? '#fca5a5' : '#86efac'};">${criticalCount + highCount}</div>
            <div style="font-size: 12px; opacity: 0.8;">Critical/High Issues</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Dimension Scores -->
  <div style="margin-bottom: 30px;">
    <h2 style="color: #1f2937; font-size: 18px; margin-bottom: 15px;">Dimension Scores</h2>
    <table>
      <thead>
        <tr>
          <th style="width: 150px;">Dimension</th>
          <th>Score Bar</th>
          <th style="width: 80px; text-align: right;">Score</th>
          <th style="width: 60px; text-align: center;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${dimensionRows}
      </tbody>
    </table>
  </div>

  ${failingChecks.length > 0 ? `
  <!-- Issues Identified -->
  <div style="margin-bottom: 30px;">
    <h2 style="color: #1f2937; font-size: 18px; margin-bottom: 15px;">Issues Identified (${failingChecks.length})</h2>
    <table>
      <thead>
        <tr>
          <th style="width: 100px;">Severity</th>
          <th>Check</th>
          <th style="width: 120px;">Dimension</th>
        </tr>
      </thead>
      <tbody>
        ${issuesList}
      </tbody>
    </table>
  </div>
  ` : ''}

  <!-- Recommendations -->
  <div style="margin-bottom: 30px;">
    <h2 style="color: #1f2937; font-size: 18px; margin-bottom: 15px;">Recommended Actions</h2>
    ${recommendations}
  </div>

  ${narrative ? `
  <!-- Analysis Summary -->
  <div style="margin-bottom: 30px;">
    <h2 style="color: #1f2937; font-size: 18px; margin-bottom: 15px;">Analysis Summary</h2>
    <div style="background: #f9fafb; padding: 20px; border-radius: 8px; color: #4b5563;">
      ${narrative.replace(/\n/g, '<br>')}
    </div>
  </div>
  ` : ''}

  <!-- Footer -->
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px;">
    <p>Generated by PayGuard DQ - Enterprise Data Quality Scoring Platform</p>
    <p>© 2026 PayGuard DQ. All rights reserved.</p>
  </div>
</body>
</html>
  `;
}
