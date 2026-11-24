import { useCallback, useEffect, useMemo, useState } from 'react';

const makeDraftCode = () => `DRAFT-${Date.now().toString().slice(-6)}`;

export default function usePosCart() {
  const [draftCode, setDraftCode] = useState(makeDraftCode);
  const [cartItems, setCartItems] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [paidAmount, setPaidAmount] = useState('');
  const [stockWarning, setStockWarning] = useState('');

  useEffect(() => {
    if (!stockWarning) return;
    const t = setTimeout(() => setStockWarning(''), 3200);
    return () => clearTimeout(t);
  }, [stockWarning]);

  // Peta kuantitas item di keranjang
  const cartQtyMap = useMemo(
    () => new Map(cartItems.map((c) => [c.id, c.quantity])),
    [cartItems]
  );

  // Tambah produk saat kartu diklik
  const addToCart = useCallback((product) => {
    if (product.current_stock <= 0) return;
    setStockWarning('');

    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        if (existing.quantity + 1 > product.current_stock) {
          setStockWarning(
            `Stok ${product.name} tersisa ${product.current_stock} unit (batas maksimum tercapai).`
          );
          return prev;
        }
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  }, []);

  // Ubah kuantitas item di keranjang
  const updateQuantity = useCallback((productId, nextQty) => {
    setStockWarning('');
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.id !== productId) return item;
          if (nextQty <= 0) return null;
          if (nextQty > item.current_stock) {
            setStockWarning(
              `Kuantitas ${item.name} melebihi stok fisik (${item.current_stock} unit).`
            );
            return { ...item, quantity: item.current_stock };
          }
          return { ...item, quantity: nextQty };
        })
        .filter(Boolean)
    );
  }, []);

  const removeFromCart = useCallback((productId) => {
    setCartItems((prev) => prev.filter((item) => item.id !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
    setDiscount(0);
    setPaidAmount('');
    setStockWarning('');
    setDraftCode(makeDraftCode());
  }, []);

  // Kalkulasi ringkasan keranjang
  const subtotal = useMemo(
    () =>
      cartItems.reduce(
        (sum, item) => sum + item.quantity * Number(item.selling_price),
        0
      ),
    [cartItems]
  );
  const discountNum = Math.max(0, Number(discount || 0));
  const grandTotal = Math.max(0, subtotal - discountNum);
  const totalItems = cartItems.length;
  const totalUnits = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );
  const hasOverStock = useMemo(
    () => cartItems.some((item) => item.quantity > item.current_stock),
    [cartItems]
  );

  return {
    draftCode,
    cartItems,
    cartQtyMap,
    discount,
    setDiscount,
    discountNum,
    paidAmount,
    setPaidAmount,
    stockWarning,
    setStockWarning,
    addToCart,
    updateQuantity,
    updateCartQty: updateQuantity,
    removeFromCart,
    clearCart,
    subtotal,
    grandTotal,
    totalItems,
    totalUnits,
    hasOverStock,
  };
}
