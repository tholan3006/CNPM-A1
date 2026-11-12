'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Product, SelectedProductPayload, OrderConfirmation } from '@/types';
import { Navbar } from '@/components/Navbar';
import { ProductModal } from '@/components/ProductModal';
import { CartDrawer } from '@/components/CartDrawer';
import { CheckoutModal } from '@/components/CheckoutModal';
import { OrderSuccessModal } from '@/components/OrderSuccessModal';
import { AuthModal } from '@/components/AuthModal';
import { useAppStore } from '@/cartStore';

// Dữ liệu mẫu fallback theo đề bài (khớp chuẩn UUID PostgreSQL)
const FALLBACK_PRODUCTS: Product[] = [
  {
    id: '79547677-67f7-4d76-a1d7-672c4ffe01b6',
    name: 'Cà phê sữa',
    category: 'Cà phê truyền thống',
    description: 'Cà phê Robusta truyền thống kết hợp sữa đặc ngọt béo đậm đà chuẩn vị.',
    price: 35000,
    imageUrl: '/images/ca-phe-sua.jpg',
    stock: 50,
  },
  {
    id: '1a271418-ba4f-4eb4-b5c3-47cb9960978a',
    name: 'Americano',
    category: 'Cà phê Espresso',
    description: 'Espresso đậm vị pha loãng cùng nước tinh khiết thanh nhẹ.',
    price: 40000,
    imageUrl: '/images/americano.jpg',
    stock: 40,
  },
  {
    id: '6e43857f-76ae-49a8-ac91-63a9f7385584',
    name: 'Cappuccino',
    category: 'Cà phê Espresso',
    description: 'Espresso Ý hòa quyện cùng lớp bọt sữa mịn màng bồng bềnh.',
    price: 45000,
    imageUrl: '/images/cappuccino.jpg',
    stock: 35,
  },
  {
    id: 'eef59179-2894-444f-b918-3914f1c6feb1',
    name: 'Trà đào',
    category: 'Trà hoa quả',
    description: 'Trà đào thanh mát kết hợp miếng đào tươi giòn ngọt ngào sảng khoái.',
    price: 39000,
    imageUrl: '/images/tra-dao.jpg',
    stock: 60,
  },
  {
    id: 'b8178129-923f-4e0a-bf47-9755b76cfca1',
    name: 'Cold Brew',
    category: 'Cold Brew',
    description: 'Cà phê ủ lạnh 16 tiếng hương vị êm dịu, mượt mà thanh mát tự nhiên.',
    price: 45000,
    imageUrl: '/images/cold-brew.jpg',
    stock: 50,
  },
  {
    id: '9c03792f-b472-4638-a28a-773df4559eb2',
    name: 'Matcha Latte',
    category: 'Trà & Matcha',
    description: 'Trà xanh Uji Nhật Bản thượng hạng hòa quyện sữa tươi béo ngậy thơm lừng.',
    price: 48000,
    imageUrl: '/images/matcha-latte.jpg',
    stock: 45,
  },
];

export default function MenuPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Tìm kiếm & Danh mục
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');

  // Modal chi tiết món (Task 4)
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'warning' } | null>(null);

  // Giỏ hàng, Thanh toán & Xác nhận đơn (Task 5 & Task 8)
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [directCheckoutItem, setDirectCheckoutItem] = useState<SelectedProductPayload | null>(null);
  const [isOrderSuccessOpen, setIsOrderSuccessOpen] = useState<boolean>(false);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [completedOrder, setCompletedOrder] = useState<OrderConfirmation | null>(null);

  const { addItem, getTotalItems, getTotalAmount, setLastOrder, isLoggedIn, user } = useAppStore();
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    loadProducts();
  }, []);

  // Gọi API backend GET /products (Task 3)
  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/products`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`Lỗi server: ${res.status}`);
      const data = await res.json();
      setProducts(data);
    } catch {
      // Dùng dữ liệu mẫu nếu backend chưa bật
      setProducts(FALLBACK_PRODUCTS);
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSelectProduct = (p: Product) => {
    if (p.stock <= 0) return;
    if (user?.role === 'BARISTA') {
      showToast('Tài khoản nhân viên chỉ dùng để quản lý đơn hàng quầy, không thể đặt món!', 'warning');
      return;
    }
    if (!isLoggedIn) {
      showToast('Vui lòng đăng nhập tài khoản trước khi thêm món!', 'warning');
      setAuthModalOpen(true);
      return;
    }
    setActiveProduct(p);
  };

  const handleAddToCart = (payload: SelectedProductPayload) => {
    if (user?.role === 'BARISTA') {
      showToast('Tài khoản nhân viên chỉ dùng để quản lý đơn hàng quầy, không thể đặt món!', 'warning');
      return;
    }
    if (!isLoggedIn) {
      showToast('Vui lòng đăng nhập tài khoản trước khi thêm món!', 'warning');
      setAuthModalOpen(true);
      return;
    }
    addItem(payload);
    showToast(`Đã thêm ${payload.quantity}x ${payload.name} (${payload.size}) vào giỏ hàng`, 'success');
  };

  const handleBuyNow = (payload: SelectedProductPayload) => {
    if (user?.role === 'BARISTA') {
      showToast('Tài khoản nhân viên chỉ dùng để quản lý đơn hàng quầy, không thể đặt món!', 'warning');
      return;
    }
    if (!isLoggedIn) {
      showToast('Vui lòng đăng nhập tài khoản trước khi mua hàng!', 'warning');
      setAuthModalOpen(true);
      return;
    }
    // Chỉ thanh toán riêng món này lúc bấm Mua ngay, không thêm vào giỏ hàng
    setDirectCheckoutItem(payload);
    setActiveProduct(null);
    setIsCheckoutOpen(true);
  };

  const handlePaymentSuccess = (order: OrderConfirmation) => {
    setCompletedOrder(order);
    setLastOrder(order);
    setIsCheckoutOpen(false);
    setIsOrderSuccessOpen(true);
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ['Tất cả', ...Array.from(set)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === 'Tất cả' || p.category === selectedCategory;
      const matchSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  const totalItems = mounted ? getTotalItems() : 0;
  const totalAmount = mounted ? getTotalAmount() : 0;

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-stone-900 pb-16">
      {/* Toast thông báo */}
      {toast && (
        <div
          className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xl animate-in fade-in flex items-center gap-2 ${
            toast.type === 'warning'
              ? 'bg-amber-800 border border-amber-600'
              : 'bg-stone-900 border border-stone-800'
          }`}
        >
          <span>{toast.type === 'warning' ? '⚠️' : '✓'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* 1. Header Navbar với Badge giỏ hàng (Task 5) & Điều hướng Lịch sử đơn (Task 9) */}
      <Navbar
        onOpenCart={() => setIsCartOpen(true)}
        onOpenHistory={() => router.push('/orders')}
        onAuthSuccess={(msg) => showToast(msg, 'success')}
      />

      {/* Banner thông báo dành riêng cho tài khoản Nhân viên Barista */}
      {mounted && isLoggedIn && user?.role === 'BARISTA' && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
          <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-amber-950 font-medium">
              <span className="text-base">☕</span>
              <span>
                Bạn đang đăng nhập tài khoản <strong>Nhân viên Barista ({user.fullName})</strong>. Chế độ quản lý quầy: chỉ xem menu, không thể đặt món.
              </span>
            </div>
            <button
              onClick={() => router.push('/orders')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#5D3A1A] hover:bg-[#472C14] text-white font-semibold transition-colors text-xs whitespace-nowrap shadow-xs"
            >
              <span>Đến Bảng Pha Chế Quầy</span>
              <span>→</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. Nội dung Menu chính */}
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-6 space-y-5">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
                Menu đồ uống
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Chọn món yêu thích và thanh toán nhanh chóng tại quầy.
              </p>
            </div>
            {!isLoading && (
              <span className="text-xs text-stone-500 bg-stone-100 px-2 py-1 rounded">
                {filteredProducts.length} món
              </span>
            )}
          </div>

          {/* Ô tìm kiếm */}
          <div className="relative">
            <span className="absolute inset-y-0 left-3 flex items-center text-stone-400">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm cà phê, trà..."
              className="w-full rounded-lg border border-stone-200 bg-white py-2 pl-9 pr-9 text-xs sm:text-sm text-stone-900 focus:border-[#5D3A1A] focus:outline-none"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-3 flex items-center text-stone-400 text-xs">✕</button>
            )}
          </div>

          {/* Bộ lọc danh mục */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-full px-3.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-[#5D3A1A] text-white'
                    : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Trạng thái Loading Skeleton */}
        {isLoading && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-xl border border-stone-200 bg-white p-3 space-y-2">
                <div className="aspect-square w-full rounded-lg bg-stone-100" />
                <div className="h-4 w-3/4 rounded bg-stone-200" />
                <div className="h-3 w-1/2 rounded bg-stone-100" />
              </div>
            ))}
          </div>
        )}

        {/* Trạng thái Empty */}
        {!isLoading && filteredProducts.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-stone-300 bg-white py-14 px-4 text-center">
            <p className="text-sm font-semibold text-stone-700">Không tìm thấy món phù hợp</p>
            <button onClick={loadProducts} className="mt-3 rounded-lg bg-[#5D3A1A] px-3.5 py-1.5 text-xs text-white">Tải lại</button>
          </div>
        )}

        {/* Lưới sản phẩm */}
        {!isLoading && filteredProducts.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filteredProducts.map((p) => {
              const isOutOfStock = p.stock <= 0;
              return (
                <div
                  key={p.id}
                  onClick={() => handleSelectProduct(p)}
                  className={`group relative flex flex-col justify-between rounded-xl border border-stone-200 bg-white p-3 shadow-2xs transition-all ${
                    isOutOfStock ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:border-stone-300'
                  }`}
                >
                  <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-stone-100">
                    <Image src={p.imageUrl} alt={p.name} fill unoptimized className="object-cover group-hover:scale-102 transition-transform" />
                    {isOutOfStock ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-stone-900/60 text-white text-xs font-semibold">Hết hàng</div>
                    ) : (
                      <span className="absolute top-2 right-2 rounded bg-stone-900/60 px-1.5 py-0.5 text-[10px] text-white">Còn {p.stock}</span>
                    )}
                  </div>
                  <div className="mt-2.5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="line-clamp-1 text-sm font-semibold text-stone-900">{p.name}</h3>
                      <p className="mt-0.5 line-clamp-1 text-xs text-stone-500">{p.description}</p>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-2">
                      <div>
                        <span className="block text-[10px] text-stone-400">Giá từ</span>
                        <span className="text-sm font-bold text-stone-900">{Number(p.price).toLocaleString('vi-VN')}₫</span>
                      </div>
                      <button
                        type="button"
                        disabled={isOutOfStock}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectProduct(p);
                        }}
                        className="rounded-lg bg-[#5D3A1A] hover:bg-[#472C14] px-2.5 py-1 text-xs text-white font-medium"
                      >
                        Chọn +
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Bar: Chỉ hiện trên Mobile khi giỏ hàng có món (và không phải Barista) */}
      {totalItems > 0 && user?.role !== 'BARISTA' && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-stone-200 bg-white/95 p-3 md:hidden shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] text-stone-400 block">Tạm tính ({totalItems} món)</span>
              <span className="text-sm font-bold text-stone-900">{totalAmount.toLocaleString('vi-VN')}₫</span>
            </div>
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="rounded-lg bg-[#5D3A1A] px-4 py-2 text-xs font-semibold text-white shadow-xs"
            >
              Xem giỏ hàng ({totalItems}) →
            </button>
          </div>
        </div>
      )}

      {/* 3. Modal Chi tiết món & Tùy chọn Size/Topping (Task 4) */}
      <ProductModal
        product={activeProduct}
        onClose={() => setActiveProduct(null)}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
        isLoggedIn={isLoggedIn}
        onRequireLogin={() => {
          setActiveProduct(null);
          showToast('Vui lòng đăng nhập tài khoản trước khi thêm món!', 'warning');
          setAuthModalOpen(true);
        }}
      />

      {/* 4. Giỏ hàng Drawer bằng Zustand (Task 5) */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onProceedToCheckout={() => {
          setIsCartOpen(false);
          setDirectCheckoutItem(null); // Thanh toán toàn bộ giỏ hàng
          setIsCheckoutOpen(true);
        }}
        onRequireLogin={() => {
          setIsCartOpen(false);
          setAuthModalOpen(true);
        }}
      />

      {/* 5. Màn hình Chọn phương thức thanh toán (Task 8 - Ví điện tử / Thẻ) */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        directItem={directCheckoutItem}
        onClose={() => {
          setIsCheckoutOpen(false);
          setDirectCheckoutItem(null);
        }}
        onSuccess={(order) => {
          setDirectCheckoutItem(null);
          handlePaymentSuccess(order);
        }}
      />

      {/* 6. Màn hình Xác nhận đặt hàng thành công (Task 8 & 9 - Trạng thái PAID & Mã đơn) */}
      <OrderSuccessModal
        isOpen={isOrderSuccessOpen}
        order={completedOrder}
        onClose={() => setIsOrderSuccessOpen(false)}
      />

      {/* 7. Modal Đăng nhập / Đăng ký */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(msg) => showToast(msg, 'success')}
      />
    </div>
  );
}
