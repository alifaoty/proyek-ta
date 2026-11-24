import { useCallback, useEffect, useState } from 'react';

export default function useToast(duration = 3800) {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    if (!message) {
      setToast(null);
      return;
    }
    setToast({ message, type });
  }, []);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, duration);
    return () => clearTimeout(timer);
  }, [toast, duration]);

  return {
    toast,
    showToast,
    dismissToast,
  };
}
