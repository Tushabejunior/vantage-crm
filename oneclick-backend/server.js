const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// Quick health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'OneClick backend is running' });
});

// Client Routes API
const clientRoutes = require('./routes/clientRoutes');
app.use('/api/clients', clientRoutes);

//Sales Routes API
const salesRoutes = require('./routes/salesRoutes');
app.use('/api/sales', salesRoutes);

//Auth API
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

// Services API
const serviceRoutes = require('./routes/serviceRoutes');
app.use('/api/services', serviceRoutes);

// Target API
const targetRoutes = require('./routes/targetRoutes');
app.use('/api/targets', targetRoutes);

// Appraisal API
const appraisalRoutes = require('./routes/appraisalRoutes');
app.use('/api/appraisals', appraisalRoutes);

//Opportunity API
const opportunityRoutes = require('./routes/opportunityRoutes');
app.use('/api/opportunities', opportunityRoutes);

//AI Insights API
const insightRoutes = require('./routes/insightRoutes');
app.use('/api/insights', insightRoutes);

// Settings API
const settingsRoutes = require('./routes/settingsRoutes');
app.use('/api/settings', settingsRoutes);

//Reports API
const reportRoutes = require('./routes/reportRoutes');
app.use('/api/reports', reportRoutes);

//Meetings/Calendar API
const meetingRoutes = require('./routes/meetingRoutes');
app.use('/api/meetings', meetingRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});