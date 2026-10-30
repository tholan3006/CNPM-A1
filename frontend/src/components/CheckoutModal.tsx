'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore, executeCheckoutPayment } from '@/cartStore';
import { PaymentMethodType, OrderConfirmation } from '@/types';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (order: OrderConfirmation) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { items, getTotalAmount, getTotalItems, isLoggedIn, user, accessToken, setAuth } =
    useAppStore();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('E_WALLET');
  const [selectedWallet, setSelectedWallet] = useState<'MOMO' | 'VNPAY' | 'ZALOPAY'>('MOMO');
  const [selectedCardType, setSelectedCardType] = useState<'VISA' | 'NAPAS'>('VISA');

  // Thông tin thẻ do khách hàng tự điền
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardHolder, setCardHolder] = useState<string>('');
  const [cardExpiry, setCardExpiry] = useState<string>('');
  const [cardCvv, setCardCvv] = useState<string>('');

  // Ghi chú đơn hàng & thông tin nhận hàng
  const [notes, setNotes] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>(user?.phone || '');
  const [diningOption, setDiningOption] = useState<'DINE_IN' | 'TAKEAWAY'>('DINE_IN');

  // Trạng thái thanh toán & giữ orderId để hỗ trợ Retry khi PAYMENT_FAILED
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [simulateFailure, setSimulateFailure] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      if (user?.phone) {
        setCustomerPhone((prev) => prev || user.phone || '');
      } else if (isLoggedIn && accessToken && user) {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        fetch(`${apiBase}/auth/me`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((me) => {
            if (me?.phone) {
              setAuth({ ...user, phone: me.phone }, accessToken);
              setCustomerPhone((prev) => prev || me.phone);
            }
          })
          .catch(() => null);
      }
    }
  }, [isOpen, user, isLoggedIn, accessToken, setAuth]);

  if (!isOpen) return null;

  const totalAmount = getTotalAmount();
  const totalItems = getTotalItems();

  const handleProcessPayment = async () => {
    setErrorMessage(null);

    if (!isLoggedIn) {
      setErrorMessage('Vui lòng đăng nhập tài khoản trước khi thực hiện thanh toán!');
      return;
    }

    if (!customerPhone.trim()) {
      setErrorMessage('Vui lòng nhập số điện thoại nhận hàng để quán tiện liên hệ!');
      return;
    }

    if (
      paymentMethod === 'BANK_CARD' &&
      (!cardNumber.trim() || !cardExpiry.trim() || !cardCvv.trim() || !cardHolder.trim())
    ) {
      setErrorMessage('Vui lòng điền đầy đủ thông tin thẻ thanh toán!');
      return;
    }

    setIsProcessing(true);

    // Chuẩn bị payload thanh toán
    const providerName =
      paymentMethod === 'E_WALLET'
        ? selectedWallet === 'MOMO'
          ? 'Ví điện tử MoMo'
          : selectedWallet === 'VNPAY'
          ? 'Cổng thanh toán VNPAY-QR'
          : 'Ví điện tử ZaloPay'
        : selectedCardType === 'VISA'
        ? 'Thẻ quốc tế Visa / Mastercard'
        : 'Thẻ ATM nội địa (NAPAS)';

    const orderId = pendingOrderId || `order-${Date.now()}`;
    if (!pendingOrderId) {
      setPendingOrderId(orderId);
    }

    const serviceLabel = diningOption === 'DINE_IN' ? 'Uống tại quán' : 'Mang đi';
    const combinedNotes = [
      `[${serviceLabel}]`,
      `SĐT: ${customerPhone.trim()}`,
      notes.trim(),
    ]
      .filter(Boolean)
      .join(' • ');

    try {
      const completedOrder = await executeCheckoutPayment({
        orderId,
        paymentMethod,
        providerName,
        simulateFailure,
        notes: combinedNotes,
      });

      setPendingOrderId(null);
      setIsProcessing(false);
      setCustomerPhone(user?.phone || '');
      setNotes('');
      setCardNumber('');
      setCardHolder('');
      setCardExpiry('');
      setCardCvv('');
      onSuccess(completedOrder);
    } catch (err: unknown) {
      setIsProcessing(false);
      const msg =
        err instanceof Error
          ? err.message
          : 'Đã có lỗi xảy ra trong quá trình xử lý thanh toán!';
      setErrorMessage(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="flex min-h-full items-center justify-center p-3 sm:p-4 text-center">
        <div className="w-full max-w-xl transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-2xl transition-all">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50/80 px-6 py-4">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-stone-900">
                Phương thức thanh toán
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Vui lòng chọn cổng thanh toán tiện lợi cho bạn
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-200/60 hover:text-stone-700 transition-colors"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            {/* Báo lỗi nếu thanh toán thất bại */}
            {errorMessage && (
              <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 animate-in fade-in">
                <svg className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <div>
                  <span className="font-bold">Thanh toán không thành công:</span> {errorMessage}
                </div>
              </div>
            )}

            {/* Tóm tắt đơn hàng ngắn gọn */}
            <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-3.5">
              <div className="flex items-center justify-between text-xs text-stone-600 mb-2">
                <span className="font-semibold text-stone-800">Đơn hàng của bạn ({totalItems} món)</span>
                <span className="text-[#5D3A1A] font-bold text-sm">
                  {totalAmount.toLocaleString('vi-VN')}₫
                </span>
              </div>
              <div className="max-h-24 overflow-y-auto space-y-1 pr-1 text-[11px] text-stone-500 divide-y divide-stone-100">
                {items.map((i) => (
                  <div key={i.cartItemId} className="flex justify-between py-1">
                    <span className="truncate max-w-[260px]">
                      {i.quantity}x {i.name} (Size {i.size})
                    </span>
                    <span className="font-medium text-stone-700">
                      {i.totalPrice.toLocaleString('vi-VN')}₫
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Thông tin nhận đồ uống */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-stone-600 font-semibold mb-1">
                  Hình thức phục vụ
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer select-none transition-all ${
                      diningOption === 'DINE_IN'
                        ? 'border-[#5D3A1A] bg-amber-50/50 text-[#5D3A1A] font-semibold'
                        : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={diningOption === 'DINE_IN'}
                      onChange={() => setDiningOption('DINE_IN')}
                      className="h-4 w-4 rounded border-stone-300 text-[#5D3A1A] focus:ring-[#5D3A1A]"
                    />
                    <span>Uống tại quán</span>
                  </label>
                  <label
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer select-none transition-all ${
                      diningOption === 'TAKEAWAY'
                        ? 'border-[#5D3A1A] bg-amber-50/50 text-[#5D3A1A] font-semibold'
                        : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={diningOption === 'TAKEAWAY'}
                      onChange={() => setDiningOption('TAKEAWAY')}
                      className="h-4 w-4 rounded border-stone-300 text-[#5D3A1A] focus:ring-[#5D3A1A]"
                    />
                    <span>Mang đi</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-stone-600 font-semibold mb-1">
                  Số điện thoại nhận hàng <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Nhập số điện thoại nhận hàng..."
                  className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-stone-800 focus:border-[#5D3A1A] focus:outline-none"
                />
              </div>
            </div>

            {/* PHẦN CHÍNH: CHỌN PHƯƠNG THỨC THANH TOÁN */}
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                Chọn phương thức thanh toán
              </label>

              {/* Tab Selector: Ví điện tử vs Thẻ ngân hàng */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* 1. Ví điện tử */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('E_WALLET')}
                  className={`flex flex-col items-start gap-1.5 rounded-xl border p-3.5 text-left transition-all ${
                    paymentMethod === 'E_WALLET'
                      ? 'border-[#5D3A1A] bg-amber-50/40 shadow-xs'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#A50064] text-white text-xs font-bold">
                      📱
                    </span>
                    <span
                      className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                        paymentMethod === 'E_WALLET'
                          ? 'border-[#5D3A1A] bg-[#5D3A1A]'
                          : 'border-stone-300'
                      }`}
                    >
                      {paymentMethod === 'E_WALLET' && (
                        <span className="h-1.5 w-1.5 rounded-full bg-white" />
                      )}
                    </span>
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-stone-900">Ví điện tử</div>
                    <div className="text-[11px] text-stone-500">MoMo, VNPay, ZaloPay</div>
                  </div>
                </button>

                {/* 2. Thẻ ngân hàng */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('BANK_CARD')}
                  className={`flex flex-col items-start gap-1.5 rounded-xl border p-3.5 text-left transition-all ${
                    paymentMethod === 'BANK_CARD'
                      ? 'border-[#5D3A1A] bg-amber-50/40 shadow-xs'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#005BAA] text-white text-xs font-bold">
                      💳
                    </span>
                    <span
                      className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                        paymentMethod === 'BANK_CARD'
                          ? 'border-[#5D3A1A] bg-[#5D3A1A]'
                          : 'border-stone-300'
                      }`}
                    >
                      {paymentMethod === 'BANK_CARD' && (
                        <span className="h-1.5 w-1.5 rounded-full bg-white" />
                      )}
                    </span>
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-stone-900">Thẻ thanh toán</div>
                    <div className="text-[11px] text-stone-500">Visa, Mastercard, Napas</div>
                  </div>
                </button>
              </div>

              {/* Chi tiết cho Phương thức đã chọn */}
              {paymentMethod === 'E_WALLET' ? (
                /* Chi tiết Ví điện tử */
                <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 space-y-3">
                  <div className="text-xs font-semibold text-stone-700">
                    Chọn nhà cung cấp ví:
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {/* MoMo */}
                    <button
                      type="button"
                      onClick={() => setSelectedWallet('MOMO')}
                      className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border py-2.5 px-2 transition-all ${
                        selectedWallet === 'MOMO'
                          ? 'border-[#A50064] bg-white ring-2 ring-[#A50064]/20 font-bold text-[#A50064]'
                          : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                      }`}
                    >
                      <span className="h-6 w-6 rounded bg-[#A50064] text-white text-[10px] font-black flex items-center justify-center">
                        M
                      </span>
                      <span className="text-xs font-medium">MoMo</span>
                    </button>

                    {/* VNPay */}
                    <button
                      type="button"
                      onClick={() => setSelectedWallet('VNPAY')}
                      className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border py-2.5 px-2 transition-all ${
                        selectedWallet === 'VNPAY'
                          ? 'border-[#005BAA] bg-white ring-2 ring-[#005BAA]/20 font-bold text-[#005BAA]'
                          : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                      }`}
                    >
                      <span className="h-6 w-6 rounded bg-[#005BAA] text-white text-[10px] font-black flex items-center justify-center">
                        V
                      </span>
                      <span className="text-xs font-medium">VNPay QR</span>
                    </button>

                    {/* ZaloPay */}
                    <button
                      type="button"
                      onClick={() => setSelectedWallet('ZALOPAY')}
                      className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border py-2.5 px-2 transition-all ${
                        selectedWallet === 'ZALOPAY'
                          ? 'border-[#0068FF] bg-white ring-2 ring-[#0068FF]/20 font-bold text-[#0068FF]'
                          : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                      }`}
                    >
                      <span className="h-6 w-6 rounded bg-[#0068FF] text-white text-[10px] font-black flex items-center justify-center">
                        Z
                      </span>
                      <span className="text-xs font-medium">ZaloPay</span>
                    </button>
                  </div>

                  {/* QR Code Demo Preview */}
                  <div className="flex items-center gap-3.5 rounded-lg border border-stone-200 bg-white p-3">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-stone-900 text-white font-mono text-[9px] text-center p-1">
                      [QR CODE BREWLITE]
                    </div>
                    <div className="text-xs text-stone-600">
                      <div className="font-semibold text-stone-800">
                        {selectedWallet === 'MOMO'
                          ? 'Thanh toán qua Ví MoMo'
                          : selectedWallet === 'VNPAY'
                          ? 'Thanh toán qua VNPay-QR'
                          : 'Thanh toán qua ZaloPay'}
                      </div>
                      <div className="text-[11px] text-stone-500 mt-0.5">
                        Hệ thống sẽ tạo giao dịch và tự động xác nhận ngay sau khi bạn bấm Thanh toán.
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Chi tiết Thẻ thanh toán */
                <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-stone-700">Loại thẻ:</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedCardType('VISA')}
                        className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                          selectedCardType === 'VISA'
                            ? 'bg-[#5D3A1A] text-white'
                            : 'bg-stone-200 text-stone-700'
                        }`}
                      >
                        Visa / Mastercard
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedCardType('NAPAS')}
                        className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                          selectedCardType === 'NAPAS'
                            ? 'bg-[#5D3A1A] text-white'
                            : 'bg-stone-200 text-stone-700'
                        }`}
                      >
                        ATM Nội địa (Napas)
                      </button>
                    </div>
                  </div>

                  {/* Form thẻ */}
                  <div className="space-y-2.5 text-xs">
                    <div>
                      <label className="block text-stone-500 mb-1">Số thẻ</label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        placeholder="Nhập số thẻ ngân hàng..."
                        className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 font-mono text-stone-800 focus:border-[#5D3A1A] focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-stone-500 mb-1">Hạn dùng (MM/YY)</label>
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          placeholder="MM/YY"
                          className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 font-mono text-stone-800 focus:border-[#5D3A1A] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-stone-500 mb-1">CVV/CVC</label>
                        <input
                          type="password"
                          maxLength={4}
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          placeholder="CVV"
                          className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 font-mono text-stone-800 focus:border-[#5D3A1A] focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-stone-500 mb-1">Tên chủ thẻ</label>
                      <input
                        type="text"
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                        placeholder="NGUYEN VAN A"
                        className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 uppercase font-medium text-stone-800 focus:border-[#5D3A1A] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Ghi chú thêm cho quán */}
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">
                Ghi chú cho quầy pha chế (Tùy chọn)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ví dụ: Ít đá, làm ấm, mang thêm ống hút..."
                className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-800 focus:border-[#5D3A1A] focus:outline-none"
              />
            </div>

            {/* KỊCH BẢN KIỂM THỬ SPRINT 3 (Task 8 DoD) */}
            <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/50 p-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={simulateFailure}
                  onChange={(e) => setSimulateFailure(e.target.checked)}
                  className="h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-xs font-medium text-amber-900">
                  Mô phỏng thanh toán thất bại (Task 8: Báo lỗi &amp; bảo lưu giỏ hàng)
                </span>
              </label>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="border-t border-stone-100 bg-stone-50/80 px-6 py-4 flex items-center justify-between gap-3">
            <div>
              <span className="text-[11px] text-stone-400 block">Tổng thanh toán</span>
              <span className="text-base sm:text-lg font-bold text-[#5D3A1A]">
                {totalAmount.toLocaleString('vi-VN')}₫
              </span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isProcessing}
                className="rounded-xl border border-stone-300 px-4 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition-colors"
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                onClick={handleProcessPayment}
                disabled={isProcessing || totalAmount <= 0}
                className="flex items-center gap-2 rounded-xl bg-[#5D3A1A] hover:bg-[#472C14] px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all disabled:opacity-60"
              >
                {isProcessing ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Đang xử lý giao dịch...</span>
                  </>
                ) : (
                  <>
                    <span>Xác nhận thanh toán</span>
                    <span>→</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
