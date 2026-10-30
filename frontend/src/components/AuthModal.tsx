'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/cartStore';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const router = useRouter();
  const { setAuth } = useAppStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setPhone('');
    setPhoneError(null);
    setError(null);
  };

  useEffect(() => {
    resetForm();
  }, [isOpen, mode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePhoneKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Cho phép các phím chức năng & phím điều hướng
    if (
      [
        'Backspace',
        'Delete',
        'Tab',
        'Escape',
        'Enter',
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'ArrowDown',
        'Home',
        'End',
      ].includes(e.key) ||
      e.ctrlKey ||
      e.metaKey
    ) {
      return;
    }

    // Nếu người dùng nhập bất kỳ ký tự nào khác số
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      setPhoneError('Vui lòng nhập đúng kí tự');
      return;
    }

    // Nếu đã đủ 10 chữ số và người dùng cố gõ thêm
    const target = e.currentTarget;
    const hasSelection = target.selectionStart !== target.selectionEnd;
    if (phone.length >= 10 && !hasSelection) {
      e.preventDefault();
      setPhoneError('Số điện thoại không được nhiều hơn 10 chữ số');
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;

    // Kiểm tra nếu có ký tự không phải số
    if (/[^0-9]/.test(val)) {
      setPhoneError('Vui lòng nhập đúng kí tự');
      const digitsOnly = val.replace(/[^0-9]/g, '');
      if (digitsOnly.length > 10) {
        setPhone(digitsOnly.slice(0, 10));
      } else {
        setPhone(digitsOnly);
      }
      return;
    }

    if (val.length > 10) {
      setPhoneError('Số điện thoại không được nhiều hơn 10 chữ số');
      setPhone(val.slice(0, 10));
      return;
    }

    if (val.length > 0 && val.length < 10) {
      setPhoneError('Số điện thoại không được ít hơn 10 chữ số');
    } else {
      setPhoneError(null);
    }

    setPhone(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'register') {
      if (!phone.trim()) {
        setPhoneError('Vui lòng nhập số điện thoại');
        return;
      }
      if (/[^0-9]/.test(phone)) {
        setPhoneError('Vui lòng nhập đúng kí tự');
        return;
      }
      if (phone.length < 10) {
        setPhoneError('Số điện thoại không được ít hơn 10 chữ số');
        return;
      }
      if (phone.length > 10) {
        setPhoneError('Số điện thoại không được nhiều hơn 10 chữ số');
        return;
      }
    }

    setIsSubmitting(true);

    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
    const payload =
      mode === 'login'
        ? { email, password }
        : {
            email,
            password,
            fullName: fullName.trim() || undefined,
            phone: phone.trim() || undefined,
          };

    try {
      const res = await fetch(`${apiBase}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = Array.isArray(data?.message)
          ? data.message.join(', ')
          : data?.message || 'Đăng nhập / đăng ký thất bại';
        setError(msg);
        return;
      }

      const token = data.access_token || data.accessToken;
      setAuth(
        {
          id: data.user.id,
          email: data.user.email,
          fullName: data.user.fullName || data.user.email.split('@')[0],
          phone: data.user.phone || phone.trim() || '',
          role: data.user.role || 'CUSTOMER',
          loyaltyPoints: data.user.loyaltyPoints ?? 0,
        },
        token
      );

      if (onSuccess) {
        onSuccess(
          mode === 'login'
            ? `Đăng nhập thành công: ${data.user.fullName || data.user.email}`
            : `Đăng ký thành công: ${data.user.fullName || data.user.email}`
        );
      }

      if (data.user.role === 'BARISTA') {
        router.push('/orders');
      }

      resetForm();
      onClose();
    } catch {
      setError('Không thể kết nối tới Backend (http://localhost:4000).');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/50 backdrop-blur-2xs p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-2xl sm:rounded-xl bg-white shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-3.5">
          <div>
            <h2 className="text-base font-bold text-stone-900">
              {mode === 'login' ? 'Đăng nhập BrewLite' : 'Đăng ký tài khoản'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100"
          >
            ✕
          </button>
        </div>

        {/* Chuyển đổi tab Đăng nhập / Đăng ký */}
        <div className="grid grid-cols-2 border-b border-stone-200 bg-stone-50 p-1 mx-5 mt-4 rounded-lg">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`py-1.5 text-xs font-semibold rounded-md transition-all ${
              mode === 'login'
                ? 'bg-white text-[#5D3A1A] shadow-2xs'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`py-1.5 text-xs font-semibold rounded-md transition-all ${
              mode === 'register'
                ? 'bg-white text-[#5D3A1A] shadow-2xs'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            Đăng ký mới
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} autoComplete="off" className="p-5 space-y-3.5">
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 font-medium">
              ⚠️ {error}
            </div>
          )}

          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Họ và tên
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-xs sm:text-sm text-stone-900 focus:border-[#5D3A1A] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Số điện thoại <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  autoComplete="off"
                  value={phone}
                  onChange={handlePhoneChange}
                  onKeyDown={handlePhoneKeyDown}
                  placeholder="Nhập 10 chữ số (vd: 0901234567)"
                  maxLength={10}
                  className={`w-full rounded-lg border px-3 py-2 text-xs sm:text-sm text-stone-900 focus:outline-none transition-colors ${
                    phoneError
                      ? 'border-rose-400 focus:border-rose-600 bg-rose-50/20'
                      : 'border-stone-200 focus:border-[#5D3A1A]'
                  }`}
                />
                {phoneError && (
                  <p className="mt-1 text-xs text-rose-600 font-medium flex items-center gap-1">
                    <span>⚠️</span>
                    <span>{phoneError}</span>
                  </p>
                )}
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Email <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              required
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Nhập địa chỉ email"
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-xs sm:text-sm text-stone-900 focus:border-[#5D3A1A] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Mật khẩu <span className="text-rose-500">*</span>
            </label>
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tối thiểu 6 ký tự"
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-xs sm:text-sm text-stone-900 focus:border-[#5D3A1A] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-[#5D3A1A] hover:bg-[#472C14] disabled:opacity-60 py-2.5 text-xs sm:text-sm font-semibold text-white transition-colors"
          >
            {isSubmitting
              ? 'Đang xử lý...'
              : mode === 'login'
              ? 'Đăng nhập'
              : 'Tạo tài khoản'}
          </button>
        </form>
      </div>
    </div>
  );
};
