export default function ToastNotification({ toast }) {
  if (!toast || !toast.message) return null;

  const isError = toast.type === 'error';

  return (
    <div
      className={`fixed right-5 bottom-5 z-50 px-4 py-2.5 rounded-lg text-xs font-semibold text-white shadow-lg ${
        isError ? 'bg-rose-600' : 'bg-emerald-600'
      }`}
    >
      {toast.message}
    </div>
  );
}
