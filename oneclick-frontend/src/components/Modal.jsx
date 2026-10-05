export default function Modal({ children, onClose }) {
  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-5 z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-xl max-h-[90vh] flex flex-col bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
        {children}
      </div>
    </div>
  );
}