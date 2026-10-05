import { useState, useEffect } from 'react';
import { getReport } from '../api/reports';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function fmtRWF(n) {
  return 'RWF ' + Math.round(Number(n) || 0).toLocaleString('en-US');
}

const PERIODS = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'annual', label: 'Annual' },
  { key: 'all-time', label: 'All time' },
];

export default function Reports() {
  const [period, setPeriod] = useState('monthly');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    getReport(period)
      .then((res) => setReport(res.data))
      .catch(() => setError('Failed to generate report'))
      .finally(() => setLoading(false));
  }, [period]);
//CSV codes
  function downloadCSV() {
  if (!report || !report.entries.length) return;

  const headers = ['Date Paid', 'Status', 'Client', 'Service', 'Amount Excl VAT', 'Amount Incl VAT', 'Commission Rate', 'Commission', 'Invoice #', 'Month', 'Notes'];
  const rows = report.entries.map((e) => [
    e.date_paid ? e.date_paid.slice(0, 10) : '',
    e.date_paid ? 'Paid' : 'Pending',
    e.client_name,
    e.service_name,
    e.amount_excl_vat,
    e.amount_incl_vat,
    e.commission_rate,
    e.commission,
    e.invoice_number || '',
    e.sale_month,
    (e.notes || '').replace(/\n/g, ' '),
  ]);

  const csv = [headers, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vantage-report-${report.period}-${report.startDate}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
//PDF codes
function downloadPDF() {
  if (!report) return;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header band
  doc.setFillColor(99, 102, 241); // indigo
  doc.rect(0, 0, pageWidth, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text('Vantage', 14, 15);
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`${report.label} — Sales Report`, 14, 23);

  doc.setTextColor(30, 30, 30);
  let y = 42;

  // Period info
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(report.period === 'all-time' ? 'Period: Covers every recorded entry' : `Period: ${report.startDate} to ${report.endDate}`, 14, y);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 14, y, { align: 'right' });
  y += 10;

  // Summary cards row
  const cardW = (pageWidth - 28 - 15) / 4;
  const cards = [
    { label: 'Total Deals', value: String(report.totalDeals) },
    { label: 'Confirmed Revenue', value: fmtRWF(report.totalRevenue) },
    { label: 'Pending Revenue', value: fmtRWF(report.totalPending) },
    { label: 'Paid / Pending', value: `${report.paidDeals} / ${report.pendingDeals}` },
  ];
  cards.forEach((c, i) => {
    const x = 14 + i * (cardW + 5);
    doc.setDrawColor(230, 230, 230);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, y, cardW, 22, 2, 2, 'FD');
    doc.setFontSize(7.5);
    doc.setTextColor(140, 140, 140);
    doc.text(c.label.toUpperCase(), x + 4, y + 8);
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.setFont(undefined, 'bold');
    doc.text(c.value, x + 4, y + 17);
    doc.setFont(undefined, 'normal');
  });
  y += 32;

  // Top clients / services side by side (text lists)
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.setFont(undefined, 'bold');
  doc.text('Top Clients', 14, y);
  doc.text('Top Services', pageWidth / 2 + 4, y);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  y += 6;
  const maxRows = Math.max(report.topClients.length, report.topServices.length);
  for (let i = 0; i < maxRows; i++) {
    if (report.topClients[i]) {
      doc.setTextColor(60, 60, 60);
      doc.text(report.topClients[i].name, 14, y);
      doc.text(fmtRWF(report.topClients[i].value), 14 + (pageWidth / 2) - 22, y, { align: 'right' });
    }
    if (report.topServices[i]) {
      doc.text(report.topServices[i].name, pageWidth / 2 + 4, y);
      doc.text(fmtRWF(report.topServices[i].value), pageWidth - 14, y, { align: 'right' });
    }
    y += 5.5;
  }
  y += 8;

  // Entries table
  if (report.entries.length) {
    autoTable(doc, {
      startY: y,
      head: [['Date', 'Status', 'Client', 'Service', 'Commission', 'Invoice #']],
      body: report.entries.map((e) => [
        e.date_paid ? e.date_paid.slice(0, 10) : '—',
        e.date_paid ? 'Paid' : 'Pending',
        e.client_name,
        e.service_name,
        fmtRWF(e.commission),
        e.invoice_number || '—',
      ]),
      headStyles: { fillColor: [99, 102, 241], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
    });
  }

  doc.save(`vantage-report-${report.period}-${report.startDate}.pdf`);
}
  return (
    <div className="flex flex-col gap-5">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                ${period === p.key
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--bg)] text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--text)]'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="text-[var(--text-muted)]">Generating report…</div>}
      {error && <div className="text-[var(--danger)]">{error}</div>}

      {report && !loading && (
        <>
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
        <div className="flex justify-between items-start flex-wrap gap-3 mb-1">
            <div>
            <h4 className="text-[var(--text)] font-semibold">{report.label}</h4>
           <p className="text-xs text-[var(--text-muted)]">
              {report.period === 'all-time' ? 'Covers every recorded entry' : `${report.startDate} to ${report.endDate}`}
           </p>
            </div>
        {report.totalDeals > 0 && (
  <div className="flex gap-2">
    <button
      onClick={downloadPDF}
      className="bg-[var(--accent)] text-white font-semibold text-sm rounded-lg px-4 py-2 hover:opacity-90 transition-opacity"
    >
      Download PDF
    </button>
    <button
      onClick={downloadCSV}
      className="border border-[var(--border)] text-[var(--text)] font-semibold text-sm rounded-lg px-4 py-2 hover:bg-[var(--surface-hover)] transition-colors"
    >
      Download CSV
    </button>
  </div>
)}
        </div>
    <div className="mb-5"></div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-[var(--bg)] rounded-xl p-4">
                <div className="text-xs text-[var(--text-muted)] uppercase">Total deals</div>
                <div className="text-2xl font-bold text-[var(--text)] mt-1">{report.totalDeals}</div>
              </div>
              <div className="bg-[var(--bg)] rounded-xl p-4">
                <div className="text-xs text-[var(--text-muted)] uppercase">Confirmed revenue</div>
                <div className="text-2xl font-bold text-[var(--success)] mt-1">{fmtRWF(report.totalRevenue)}</div>
              </div>
              <div className="bg-[var(--bg)] rounded-xl p-4">
                <div className="text-xs text-[var(--text-muted)] uppercase">Pending revenue</div>
                <div className="text-2xl font-bold text-[var(--warning)] mt-1">{fmtRWF(report.totalPending)}</div>
              </div>
              <div className="bg-[var(--bg)] rounded-xl p-4">
                <div className="text-xs text-[var(--text-muted)] uppercase">Paid / Pending</div>
                <div className="text-2xl font-bold text-[var(--text)] mt-1">{report.paidDeals} / {report.pendingDeals}</div>
              </div>
            </div>
          </div>

          {report.totalDeals === 0 ? (
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 text-center text-[var(--text-muted)]">
              No entries found for this period.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
                <h4 className="text-[var(--text)] font-semibold mb-4">Top clients</h4>
                <div className="flex flex-col gap-2">
                  {report.topClients.map((c) => (
                    <div key={c.name} className="flex justify-between items-center bg-[var(--bg)] rounded-lg px-3 py-2">
                      <span className="text-sm text-[var(--text)]">{c.name}</span>
                      <span className="text-sm font-mono text-[var(--text-muted)]">{fmtRWF(c.value)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
                <h4 className="text-[var(--text)] font-semibold mb-4">Top services</h4>
                <div className="flex flex-col gap-2">
                  {report.topServices.map((s) => (
                    <div key={s.name} className="flex justify-between items-center bg-[var(--bg)] rounded-lg px-3 py-2">
                      <span className="text-sm text-[var(--text)]">{s.name}</span>
                      <span className="text-sm font-mono text-[var(--text-muted)]">{fmtRWF(s.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}