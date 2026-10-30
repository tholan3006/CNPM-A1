// Định nghĩa kiểu dữ liệu dùng chung toàn bộ Frontend BrewLite

export type ProductSize = 'S' | 'M' | 'L';

export interface Topping {
  id: string;
  name: string;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  category?: string;
  price: number; // Giá cơ bản cho Size S
  imageUrl: string;
  stock: number;
  isActive?: boolean;
}

export interface SelectedProductPayload {
  productId: string;
  name: string;
  imageUrl: string;
  size: ProductSize;
  sizePriceOffset: number;
  selectedToppings: Topping[];
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface CartItem extends SelectedProductPayload {
  cartItemId: string;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: 'CUSTOMER' | 'BARISTA' | 'ADMIN';
  loyaltyPoints: number;
}

// Kiểu dữ liệu Thanh toán & Đặt hàng (Task 8)
export type PaymentMethodType = 'E_WALLET' | 'BANK_CARD';
export type EWalletProvider = 'MOMO' | 'ZALOPAY' | 'VNPAY' | 'SHOPEEPAY';
export type CardType = 'VISA' | 'MASTERCARD' | 'NAPAS';

export interface OrderConfirmation {
  orderId: string;
  orderNumber: string; // Mã hiển thị: #ORD-...
  items: CartItem[];
  subtotal: number;
  discount: number;
  totalAmount: number;
  paymentMethod: PaymentMethodType;
  paymentProviderName: string; // "Ví MoMo", "Thẻ Visa/Mastercard", ...
  status: 'PAID' | 'PAYMENT_FAILED' | 'PENDING';
  transactionId: string;
  createdAt: string;
  customerName: string;
  customerEmail: string;
  notes?: string;
}
