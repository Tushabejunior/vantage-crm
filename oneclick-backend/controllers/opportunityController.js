const pool = require('../config/db');

function daysSince(isoDate) {
  if (!isoDate) return null;
  const ms = Date.now() - new Date(isoDate).getTime();
  return Math.round(ms / 86400000);
}

function fmtRWF(n) {
  return "RWF " + Math.round(Number(n) || 0).toLocaleString("en-US");
}

async function getOpportunities(req, res) {
  try {
    // Pull all sales with client/service names joined in
    const [sales] = await pool.query(`
      SELECT s.*, c.display_name AS client_name, sv.display_name AS service_name
      FROM sales s
      JOIN clients c ON s.client_id = c.id
      JOIN services sv ON s.service_id = sv.id
    `);

    if (!sales.length) return res.json([]);

    // --- Build client stats ---
    const clientMap = new Map();
    sales.forEach(s => {
      if (!clientMap.has(s.client_id)) {
        clientMap.set(s.client_id, {
          id: s.client_id, name: s.client_name,
          totalCommission: 0, dealCount: 0,
          servicesSet: new Set(), lastDate: null,
        });
      }
      const c = clientMap.get(s.client_id);
      c.totalCommission += Number(s.commission);
      c.dealCount += 1;
      c.servicesSet.add(s.service_name);
      if (s.date_paid) {
        const d = s.date_paid.toISOString ? s.date_paid.toISOString().slice(0,10) : s.date_paid;
        if (!c.lastDate || d > c.lastDate) c.lastDate = d;
      }
    });
    const clientStats = Array.from(clientMap.values()).map(c => ({ ...c, services: Array.from(c.servicesSet) }));

    // --- Build service stats ---
    const serviceMap = new Map();
    sales.forEach(s => {
      if (!serviceMap.has(s.service_id)) {
        serviceMap.set(s.service_id, { id: s.service_id, name: s.service_name, totalCommission: 0, dealCount: 0, clientsSet: new Set() });
      }
      const sv = serviceMap.get(s.service_id);
      sv.totalCommission += Number(s.commission);
      sv.dealCount += 1;
      sv.clientsSet.add(s.client_name);
    });
    const serviceStats = Array.from(serviceMap.values()).map(sv => ({
      ...sv, clients: Array.from(sv.clientsSet), avgDeal: sv.totalCommission / sv.dealCount
    }));

    const overallAvgDeal = sales.reduce((a, s) => a + Number(s.commission), 0) / sales.length;
    const topServices = serviceStats.slice().sort((a, b) => b.dealCount - a.dealCount).slice(0, 3).map(s => s.name);

    const opportunities = [];

    // 1. Cross-sell: clients using only 1 service
    clientStats.filter(c => c.services.length === 1)
      .sort((a, b) => b.totalCommission - a.totalCommission)
      .slice(0, 5)
      .forEach(c => {
        const missing = topServices.filter(s => !c.services.includes(s));
        if (missing.length) {
          opportunities.push({
            category: "growth", priority: 2,
            title: `Cross-sell ${missing[0]} to ${c.name}`,
            detail: `${c.name} has only ever paid for ${c.services[0]} (${fmtRWF(c.totalCommission)} total). They haven't bought ${missing.slice(0, 2).join(" or ")} yet.`,
          });
        }
      });

    // 2. High-value one-off clients
    clientStats.filter(c => c.dealCount === 1 && c.totalCommission > overallAvgDeal * 1.5)
      .forEach(c => {
        opportunities.push({
          category: "growth", priority: 2,
          title: `Lock in repeat business from ${c.name}`,
          detail: `Their one deal (${fmtRWF(c.totalCommission)}) is well above your average deal size. Follow up before it goes cold.`,
        });
      });

    // 3. Dormant clients (60+ days since last payment)
    clientStats.filter(c => c.lastDate && daysSince(c.lastDate) > 60)
      .forEach(c => {
        opportunities.push({
          category: "risk", priority: 1,
          title: `Re-engage ${c.name}`,
          detail: `No payment recorded in ${daysSince(c.lastDate)} days (last: ${c.lastDate}). Worth a check-in call.`,
        });
      });

    // 4. Pending/unpaid invoices
    const pending = sales.filter(s => !s.date_paid);
    if (pending.length) {
      const total = pending.reduce((a, s) => a + Number(s.commission), 0);
      opportunities.push({
        category: "collections", priority: 1,
        title: `Chase ${pending.length} unconfirmed invoice${pending.length > 1 ? "s" : ""}`,
        detail: `${fmtRWF(total)} in commission has no confirmed payment date yet.`,
      });
    }

    // 5. Under-sold high-value services
    serviceStats.filter(s => s.dealCount <= 2 && s.avgDeal > overallAvgDeal)
      .forEach(s => {
        const candidates = clientStats.filter(c => !s.clients.includes(c.name))
          .sort((a, b) => b.totalCommission - a.totalCommission).slice(0, 3).map(c => c.name);
        if (candidates.length) {
          opportunities.push({
            category: "growth", priority: 2,
            title: `Scale up ${s.name}`,
            detail: `Only ${s.dealCount} client(s) buy this, but it averages ${fmtRWF(s.avgDeal)} per deal. Worth pitching to ${candidates.join(", ")}.`,
          });
        }
      });

    // 6. Retainer candidates
    clientStats.filter(c => c.dealCount >= 3 && !c.services.some(s => s.toLowerCase().includes("retainer")))
      .forEach(c => {
        opportunities.push({
          category: "growth", priority: 2,
          title: `Propose a retainer to ${c.name}`,
          detail: `${c.name} has paid you ${c.dealCount} separate times for ${c.services.join(", ")}. A retainer turns that into predictable recurring revenue.`,
        });
      });

    opportunities.sort((a, b) => a.priority - b.priority);
    res.json(opportunities);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate opportunities' });
  }
}

module.exports = { getOpportunities };