'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/cartStore';
import { AuthModal } from './AuthModal';

interface NavbarProps {
  onOpenCart?: () => void;
  onOpenHistory?: () => void;
  onAuthSuccess?: (message: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenCart,
  onAuthSuccess,
}) => {
  const { user, isLoggedIn, logout, getTotalItems } = useAppStore();
  const [mounted, setMounted] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const totalItems = mounted ? getTotalItems() : 0;
  const isBarista = mounted && isLoggedIn && user?.role === 'BARISTA';

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-stone-200/80 bg-white/95 backdrop-blur-md shadow-2xs">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          {/* LOGO & BRAND */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5D3A1A] text-white shadow-xs group-hover:scale-105 transition-transform">
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
                <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
                <line x1="6" y1="2" x2="6" y2="4" />
                <line x1="10" y1="2" x2="10" y2="4" />
                <line x1="14" y1="2" x2="14" y2="4" />
              </svg>
            </div>
            <div>
              <div className="text-lg font-bold tracking-tight text-[#3D2314] leading-none">
                BrewLite
              </div>
              <div className="text-[10px] font-semibold tracking-wider text-[#8A5833] uppercase mt-0.5">
                COFFEE & PAYMENT
              </div>
            </div>
          </Link>

          {/* NAVIGATION & USER ACTIONS (Desktop) */}
          <div className="hidden md:flex items-center gap-6">
            {isBarista ? (
              <Link
                href="/orders"
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-300 text-xs font-bold hover:bg-amber-100 transition shadow-2xs"
              >
                <span>Bảng đơn pha chế quầy</span>
              </Link>
            ) : (
              <>
                <Link href="/" className="text-sm font-semibold text-[#3D2314] hover:text-[#5D3A1A] transition-colors">
                  Menu
                </Link>

                <Link
                  href="/orders"
                  className="flex items-center gap-1.5 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors"
                >
                  <svg
                    className="h-4 w-4 text-stone-500"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span>Lịch sử đơn</span>
                </Link>

                {/* Giỏ hàng với Badge số lượng cam (Task 5) */}
                <button
                  type="button"
                  onClick={onOpenCart}
                  className="relative flex h-9 w-9 items-center justify-center rounded-lg text-stone-700 hover:bg-stone-100 transition-colors"
                  title="Giỏ hàng"
                >
                  <svg
                    className="h-5 w-5 text-stone-800"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                    <path d="M3 6h18" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                  </svg>
                  {totalItems > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex min-w-[18px] h-[18px] px-1 items-center justify-center rounded-full bg-[#E06D14] text-[10px] font-bold text-white shadow-xs">
                      {totalItems}
                    </span>
                  )}
                </button>
              </>
            )}

            <div className="h-6 w-[1.5px] bg-stone-200" />

            {/* Thông tin khách hàng & Điểm tích lũy Loyalty (Task 10.4) */}
            {mounted && isLoggedIn && user ? (
              <div className="flex items-center gap-2.5">
                <div className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="text-xs font-semibold text-stone-900 leading-tight">
                      {user.fullName}
                    </span>
                    {user.role === 'BARISTA' && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                        Barista
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-medium text-[#B36829]">
                    {user.role === 'BARISTA' ? 'Nhân viên Barista' : `${user.loyaltyPoints} điểm tích lũy`}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={logout}
                  className="flex h-7 w-7 items-center justify-center rounded text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors"
                  title="Đăng xuất"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="rounded-lg bg-[#5D3A1A] hover:bg-[#472C14] px-3.5 py-1.5 text-xs font-medium text-white shadow-xs transition-colors"
              >
                Đăng nhập
              </button>
            )}
          </div>

          {/* MOBILE VIEW */}
          <div className="flex md:hidden items-center gap-1.5">
            {!isBarista && (
              <button
                type="button"
                onClick={onOpenCart}
                className="relative flex h-9 w-9 items-center justify-center rounded text-stone-700"
              >
                <svg
                  className="h-5 w-5 text-stone-800"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                  <path d="M3 6h18" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
                {totalItems > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex min-w-[18px] h-[18px] px-1 items-center justify-center rounded-full bg-[#E06D14] text-[10px] font-bold text-white shadow-xs">
                    {totalItems}
                  </span>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 text-stone-700 text-lg font-bold"
            >
              {mobileMenuOpen ? '✕' : '≡'}
            </button>
          </div>
        </div>

        {/* MOBILE DRAWER */}
        {mobileMenuOpen && (
          <div className="border-t border-stone-100 bg-white px-5 py-3 md:hidden space-y-2.5 shadow-md">
            {mounted && isLoggedIn && user ? (
              <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-stone-900">{user.fullName}</p>
                    {user.role === 'BARISTA' && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                        Barista
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#B36829] font-medium">
                    {user.role === 'BARISTA' ? 'Nhân viên Barista' : `${user.loyaltyPoints} điểm tích lũy`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="text-xs text-rose-600 font-medium"
                >
                  Đăng xuất
                </button>
              </div>
            ) : (
              <div className="pb-2 border-b border-stone-100">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setAuthModalOpen(true);
                  }}
                  className="w-full rounded-lg bg-[#5D3A1A] py-2 text-xs font-semibold text-white"
                >
                  Đăng nhập / Đăng ký
                </button>
              </div>
            )}
            {!isBarista && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (onOpenCart) onOpenCart();
                }}
                className="flex w-full items-center justify-between py-1.5 text-xs font-medium text-stone-800"
              >
                <span>🛒 Xem giỏ hàng ({totalItems} món)</span>
                <span className="text-stone-400">→</span>
              </button>
            )}
            <Link
              href="/orders"
              onClick={() => setMobileMenuOpen(false)}
              className="flex w-full items-center justify-between py-1.5 text-xs font-medium text-stone-800"
            >
              <span>{isBarista ? 'Bảng đơn pha chế quầy' : '🕒 Lịch sử đơn hàng'}</span>
              <span className="text-stone-400">→</span>
            </Link>
          </div>
        )}
      </header>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={onAuthSuccess}
      />
    </>
  );
};
export default Navbar;
