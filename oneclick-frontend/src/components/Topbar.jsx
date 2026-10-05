import { useState, useRef, useEffect } from 'react';
import { Sun, Moon, LogOut, Pencil, ChevronDown, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { updateSetting } from '../api/settings';
import { addViewer } from '../api/auth';

export default function Topbar() {
  const { user, logoutUser, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { settings, updateLocalSetting } = useSettings();

  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameInput, setNameInput] = useState(settings.company_name);

  const [addingViewer, setAddingViewer] = useState(false);
  const [viewerName, setViewerName] = useState('');
  const [viewerPin, setViewerPin] = useState('');
  const [viewerError, setViewerError] = useState('');
  const [viewerSuccess, setViewerSuccess] = useState('');

  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
        setRenaming(false);
        setAddingViewer(false);
        setViewerError('');
        setViewerSuccess('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleSaveName() {
    if (!nameInput.trim()) return;
    try {
      await updateSetting('company_name', nameInput.trim());
      updateLocalSetting('company_name', nameInput.trim());
      setRenaming(false);
      setMenuOpen(false);
    } catch {
      alert('Failed to update company name');
    }
  }

  async function handleAddViewer(e) {
    e.preventDefault();
    setViewerError('');
    setViewerSuccess('');
    if (!viewerName.trim()) return setViewerError('Enter a name.');
    if (viewerPin.length < 4) return setViewerError('PIN must be at least 4 characters.');

    try {
      await addViewer(viewerName.trim(), viewerPin);
      setViewerSuccess(`${viewerName.trim()} can now log in with that PIN.`);
      setViewerName('');
      setViewerPin('');
    } catch (err) {
      setViewerError(err.response?.data?.error || 'Failed to add viewer.');
    }
  }

  return (
    <div className="flex justify-between items-center gap-3 px-6 py-4 border-b border-[var(--border)] bg-[var(--bg)]">
      <div />
      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)] transition-colors"
          title="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {user && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 text-sm bg-[var(--surface)] border border-[var(--border)] px-3 py-1.5 rounded-full"
            >
              <span className="text-[var(--text)]">{user.name}</span>
              <span className="text-[var(--text-muted)] text-xs">{user.role === 'admin' ? 'Admin' : 'Viewer'}</span>
              <ChevronDown size={14} className="text-[var(--text-muted)]" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg overflow-hidden z-50">
                {isAdmin && (
                  <div className="p-3 border-b border-[var(--border)]">
                    {renaming ? (
                      <div className="flex flex-col gap-2">
                        <input
                          value={nameInput}
                          onChange={(e) => setNameInput(e.target.value)}
                          className="bg-[var(--bg)] border border-[var(--border)] rounded-lg px-2 py-1 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button onClick={handleSaveName} className="text-xs text-[var(--accent)] font-semibold">Save</button>
                          <button onClick={() => { setRenaming(false); setNameInput(settings.company_name); }} className="text-xs text-[var(--text-muted)]">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setRenaming(true)}
                        className="flex items-center gap-2 text-sm text-[var(--text)] hover:text-[var(--accent)] w-full"
                      >
                        <Pencil size={14} /> Rename company
                      </button>
                    )}
                  </div>
                )}

                {isAdmin && (
                  <div className="p-3 border-b border-[var(--border)]">
                    {addingViewer ? (
                      <form onSubmit={handleAddViewer} className="flex flex-col gap-2">
                        <div className="text-xs text-[var(--text-muted)] font-semibold mb-1">Add a viewer (read-only)</div>
                        <input
                          placeholder="Name"
                          value={viewerName}
                          onChange={(e) => setViewerName(e.target.value)}
                          className="bg-[var(--bg)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
                          autoFocus
                        />
                        <input
                          type="password"
                          placeholder="PIN (4+ characters)"
                          value={viewerPin}
                          onChange={(e) => setViewerPin(e.target.value)}
                          className="bg-[var(--bg)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
                        />
                        {viewerError && <div className="text-xs text-[var(--danger)]">{viewerError}</div>}
                        {viewerSuccess && <div className="text-xs text-[var(--success)]">{viewerSuccess}</div>}
                        <div className="flex gap-2 mt-1">
                          <button type="submit" className="text-xs text-[var(--accent)] font-semibold">Create login</button>
                          <button type="button" onClick={() => { setAddingViewer(false); setViewerError(''); setViewerSuccess(''); }} className="text-xs text-[var(--text-muted)]">Close</button>
                        </div>
                      </form>
                    ) : (
                      <button
                        onClick={() => setAddingViewer(true)}
                        className="flex items-center gap-2 text-sm text-[var(--text)] hover:text-[var(--accent)] w-full"
                      >
                        <UserPlus size={14} /> Add team member (viewer)
                      </button>
                    )}
                  </div>
                )}

                <button
                  onClick={logoutUser}
                  className="flex items-center gap-2 text-sm text-[var(--danger)] px-3 py-2.5 w-full hover:bg-[var(--danger-soft)]"
                >
                  <LogOut size={14} /> Log out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}