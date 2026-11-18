import { useState } from 'react';
import { useAuth } from './context/AuthContext';
import AuthScreen from './pages/AuthScreen';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Overview from './pages/Overview';
import Ledger from './pages/Ledger';
import Clients from './pages/Clients';
import Sectors from './pages/Sectors';
import Services from './pages/Services';
import ActivityLog from './pages/ActivityLog';
import Opportunities from './pages/Opportunities';
import AIInsights from './pages/AIInsights';
import Performance from './pages/Performance';
import Reports from './pages/Reports';
import CalendarPage from './pages/Calendar';

function App() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [prefillMeeting, setPrefillMeeting] = useState(null);

  if (loading) return null;
  if (!user) return <AuthScreen />;

  const knownTabs = [
    'overview', 'ledger', 'clients', 'sectors', 'services', 'activity', 'calendar',
    'opportunities', 'ai', 'performance', 'reports',
  ];

  function scheduleMeetingFor(clientName, clientId) {
    setPrefillMeeting({ client_id: clientId, title: `Check-in with ${clientName}` });
    setActiveTab('calendar');
  }

  return (
    <div className="flex min-h-screen bg-[var(--bg)]">
      <Sidebar activeTab={activeTab} onChange={setActiveTab} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="p-6 flex-1">
          {activeTab === 'overview' && <Overview />}
          {activeTab === 'ledger' && <Ledger />}
          {activeTab === 'clients' && <Clients />}
          {activeTab === 'sectors' && <Sectors />}
          {activeTab === 'services' && <Services />}
          {activeTab === 'activity' && <ActivityLog />}
          {activeTab === 'calendar' && (
            <CalendarPage prefill={prefillMeeting} clearPrefill={() => setPrefillMeeting(null)} />
          )}
          {activeTab === 'opportunities' && <Opportunities onSchedule={scheduleMeetingFor} />}
          {activeTab === 'ai' && <AIInsights />}
          {activeTab === 'performance' && <Performance />}
          {activeTab === 'reports' && <Reports />}
          {!knownTabs.includes(activeTab) && (
            <div className="text-[var(--text-muted)]">Coming soon — {activeTab}</div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;