const pool = require('../config/db');
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function fmtRWF(n) {
  return "RWF " + Math.round(Number(n) || 0).toLocaleString("en-US");
}

async function generateInsights(req, res) {
  try {
    const [sales] = await pool.query(`
      SELECT s.*, c.display_name AS client_name, sv.display_name AS service_name
      FROM sales s
      JOIN clients c ON s.client_id = c.id
      JOIN services sv ON s.service_id = sv.id
    `);
    const [targetRows] = await pool.query('SELECT target_key, target_value FROM targets');
    const targets = {};
    targetRows.forEach(r => { targets[r.target_key] = parseFloat(r.target_value); });

    if (!sales.length) {
      return res.status(400).json({ error: 'No sales data to analyze yet' });
    }

    // --- Build summary stats (same shape as the artifact's buildDataSummaryForAI) ---
    const totalAll = sales.reduce((a, s) => a + Number(s.commission), 0);
    const totalPaid = sales.filter(s => s.date_paid).reduce((a, s) => a + Number(s.commission), 0);
    const totalPending = totalAll - totalPaid;

    const clientMap = new Map();
    sales.forEach(s => {
      if (!clientMap.has(s.client_id)) {
        clientMap.set(s.client_id, { name: s.client_name, total: 0, deals: 0, services: new Set(), lastDate: null });
      }
      const c = clientMap.get(s.client_id);
      c.total += Number(s.commission);
      c.deals += 1;
      c.services.add(s.service_name);
      if (s.date_paid) {
        const d = s.date_paid.toISOString ? s.date_paid.toISOString().slice(0,10) : s.date_paid;
        if (!c.lastDate || d > c.lastDate) c.lastDate = d;
      }
    });
    const topClients = Array.from(clientMap.values())
      .sort((a, b) => b.total - a.total).slice(0, 8)
      .map(c => `${c.name} (${fmtRWF(c.total)}, ${c.deals} deal(s), services: ${Array.from(c.services).join("/")}, last paid: ${c.lastDate || "never"})`)
      .join("; ");

    const serviceMap = new Map();
    sales.forEach(s => {
      if (!serviceMap.has(s.service_id)) serviceMap.set(s.service_id, { name: s.service_name, total: 0, deals: 0, clients: new Set() });
      const sv = serviceMap.get(s.service_id);
      sv.total += Number(s.commission);
      sv.deals += 1;
      sv.clients.add(s.client_name);
    });
    const servicesLine = Array.from(serviceMap.values())
      .map(sv => `${sv.name} (${fmtRWF(sv.total)}, ${sv.deals} deal(s), ${sv.clients.size} client(s))`)
      .join("; ");

    const dataSummary = [
      `Total commission recorded: ${fmtRWF(totalAll)} (Paid: ${fmtRWF(totalPaid)}, Pending: ${fmtRWF(totalPending)})`,
      `Top clients: ${topClients}`,
      `Services: ${servicesLine}`,
      `Current KPI targets: monthly revenue ${fmtRWF(targets.monthlyRevenue)}, avg deal size ${fmtRWF(targets.avgDealSize)}, new clients/month ${targets.newClientsPerMonth}, repeat rate ${targets.repeatRatePct}%, cross-sell depth ${targets.crossSellDepth}`,
    ].join("\n");

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: `You are a senior sales and marketing analyst reviewing a marketing/communications agency's commission ledger (amounts in RWF). Respond ONLY with valid JSON, no markdown, no code fences. Schema:
{"summary": "1-2 sentence executive summary", "strengths": ["...","...","..."], "risks": ["...","...","..."], "recommendations": [{"title":"...","detail":"..."},{"title":"...","detail":"..."},{"title":"...","detail":"..."}]}
Base everything strictly on this data:
${dataSummary}`,
      }],
    });

    const textBlock = message.content.find(b => b.type === 'text');
    let parsed;
    try {
      parsed = JSON.parse(textBlock.text);
    } catch (e) {
      const start = textBlock.text.indexOf('{');
      const end = textBlock.text.lastIndexOf('}');
      parsed = JSON.parse(textBlock.text.slice(start, end + 1));
    }

    res.json({ ...parsed, generatedAt: new Date().toISOString() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
}

module.exports = { generateInsights };