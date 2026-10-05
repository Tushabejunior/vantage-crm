import { useState, useEffect } from 'react';
import { getSetupStatus, createAdmin, login, listUsers } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import VantageLogo from '../components/VantageLogo';

export default function AuthScreen() {
  const { loginUser } = useAuth();
  const [checking, setChecking] = useState(true);
  const [adminExists, setAdminExists] = useState(false);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [setupName, setSetupName] = useState('');
  const [setupPin, setSetupPin] = useState('');
  const [setupConfirm, setSetupConfirm] = useState('');

  const [selectedUserId, setSelectedUserId] = useState('');
  const [loginPin, setLoginPin] = useState('');

  useEffect(() => {
    async function init() {
      try {
        const statusRes = await getSetupStatus();
        setAdminExists(statusRes.data.adminExists);
        if (statusRes.data.adminExists) {
          const usersRes = await listUsers();
          setUsers(usersRes.data);
          if (usersRes.data.length) setSelectedUserId(usersRes.data[0].id);
        }
      } catch (err) {
        setError('Could not reach the server. Is the backend running?');
      } finally {
        setChecking(false);
      }
    }
    init();
  }, []);

  async function handleCreateAdmin(e) {
    e.preventDefault();
    setError('');
    if (!setupName.trim()) return setError('Enter your name.');
    if (setupPin.length < 4) return setError('PIN must be at least 4 characters.');
    if (setupPin !== setupConfirm) return setError("PINs don't match.");

    setSubmitting(true);
    try {
      const res = await createAdmin(setupName.trim(), setupPin);
      loginUser(res.data.token, res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    if (!selectedUserId || !loginPin) return setError('Select a profile and enter your PIN.');

    setSubmitting(true);
    try {
      const res = await login(selectedUserId, loginPin);
      loginUser(res.data.token, res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls = "bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]";

  if (checking) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center text-[var(--text-muted)]">
        Checking access…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-5">
      <div className="w-full max-w-sm bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-5">
          <VantageLogo size={36} />
          <span className="font-semibold text-[var(--text)] text-lg">Vantage</span>
        </div>

        {!adminExists ? (
          <>
            <h1 className="text-xl font-semibold text-[var(--text)] mb-1">Set up admin access</h1>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              You're opening this for the first time, so this becomes your admin login.
            </p>
            <form onSubmit={handleCreateAdmin} className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-xs text-[var(--text-muted)]">
                Your name
                <input type="text" value={setupName} onChange={(e) => setSetupName(e.target.value)} className={inputCls} autoFocus />
              </label>
              <label className="flex flex-col gap-1 text-xs text-[var(--text-muted)]">
                Create a PIN (4+ characters)
                <input type="password" value={setupPin} onChange={(e) => setSetupPin(e.target.value)} className={inputCls} />
              </label>
              <label className="flex flex-col gap-1 text-xs text-[var(--text-muted)]">
                Confirm PIN
                <input type="password" value={setupConfirm} onChange={(e) => setSetupConfirm(e.target.value)} className={inputCls} />
              </label>
              {error && <p className="text-sm text-[var(--danger)] bg-[var(--danger-soft)] px-3 py-2 rounded-lg">{error}</p>}
              <button type="submit" disabled={submitting} className="bg-[var(--accent)] text-white font-bold text-sm rounded-lg py-2 mt-1 disabled:opacity-50 hover:opacity-90 transition-opacity">
                {submitting ? 'Setting up…' : 'Create admin access'}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-[var(--text)] mb-1">Who's viewing?</h1>
            <p className="text-sm text-[var(--text-muted)] mb-4">Select your name and enter your PIN.</p>
            <form onSubmit={handleLogin} className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-xs text-[var(--text-muted)]">
                Profile
                <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} style={{ colorScheme: 'dark' }} className={inputCls}>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}{u.role === 'admin' ? ' (admin)' : ''}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-[var(--text-muted)]">
                PIN
                <input type="password" value={loginPin} onChange={(e) => setLoginPin(e.target.value)} className={inputCls} autoFocus />
              </label>
              {error && <p className="text-sm text-[var(--danger)] bg-[var(--danger-soft)] px-3 py-2 rounded-lg">{error}</p>}
              <button type="submit" disabled={submitting} className="bg-[var(--accent)] text-white font-bold text-sm rounded-lg py-2 mt-1 disabled:opacity-50 hover:opacity-90 transition-opacity">
                {submitting ? 'Checking…' : 'Log in'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}