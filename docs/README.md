# Tài liệu Thiết kế, Đặc tả SRS & Bộ Sơ đồ UML — Thành viên 4 (Nguyễn Hữu Chí Công)

**Dự án:** BrewLite — Ứng dụng đặt cà phê và thanh toán không tiền mặt  
**Học phần:** Công nghệ Phần mềm — Trường Đại học Sài Gòn (SGU)  
**Thành viên thực hiện:** Nguyễn Hữu Chí Công (**Thành viên 4**)  

---

## 1. Ma trận Ánh xạ Công việc (Traceability Matrix)

Để đáp ứng đầy đủ cả **bảng phân công theo Task kỹ thuật (Task 2, Task 7, Task 8)** lẫn **bảng phân công theo Luồng màn hình dọc (Vertical Slice: 5 sơ đồ UML + Đặc tả SRS + Code FE/BE)** của nhóm, bộ tài liệu trong thư mục `docs/` được tổ chức thành 3 chuyên đề hoàn chỉnh (tổng cộng **15 sơ đồ UML** và **3 tài liệu đặc tả SRS/NFR**):

| STT | Chuyên đề / Luồng chức năng | Tài liệu Đặc tả & Bộ 5 Sơ đồ UML | Mã nguồn Backend (NestJS + Prisma) | Mã nguồn Frontend (Next.js 14) | Kiểm thử tự động (Jest / Supertest) |
| :-: | :--- | :--- | :--- | :--- | :--- |
| **1** | **Task 8 (Thành viên 4):**<br>Màn hình & Luồng **"Thanh toán & Xác nhận đơn"** | [thanh-vien-4-thanh-toan-xac-nhan.md](./thanh-vien-4-thanh-toan-xac-nhan.md)<br>*(5 sơ đồ UML + Đặc tả Use-case Đặt & Thanh toán)* | - `backend/src/payments/payments.controller.ts`<br>- `backend/src/payments/payments.service.ts`<br>- `backend/src/payments/dto/create-payment.dto.ts`<br>- `backend/src/orders/payment-processor.service.ts` | - `frontend/src/components/CheckoutModal.tsx`<br>- `frontend/src/components/OrderSuccessModal.tsx`<br>- `frontend/src/app/checkout/page.tsx`<br>- `frontend/src/app/order-confirmation/page.tsx` | `backend/src/app.spec.ts`<br>*(Task 8 & Full E2E Flow)* |
| **2** | **Task 7 (Hệ thống Auth & Guard):**<br>Màn hình & Luồng **"Đăng nhập & Đăng ký (JWT)"** | [task-7-dang-nhap-dang-ky-jwt.md](./task-7-dang-nhap-dang-ky-jwt.md)<br>*(5 sơ đồ UML + Yêu cầu phi chức năng JWT/Bcrypt/Guard)* | - `backend/src/auth/auth.controller.ts`<br>- `backend/src/auth/auth.service.ts`<br>- `backend/src/auth/strategies/jwt.strategy.ts`<br>- `backend/src/auth/guards/jwt-auth.guard.ts`<br>- `backend/src/orders/orders.controller.ts` (`@UseGuards(JwtAuthGuard)`) | - `frontend/src/components/AuthModal.tsx`<br>- `frontend/src/components/Navbar.tsx`<br>- `frontend/src/cartStore.ts` | `backend/src/app.spec.ts`<br>*(Task 7 & Guard `POST /orders`)* |
| **3** | **Task 2 (Prisma & Menu API):**<br>Khởi tạo Prisma PostgreSQL, Seed Data & **"Menu sản phẩm"** | [task-2-menu-san-pham-prisma.md](./task-2-menu-san-pham-prisma.md)<br>*(5 sơ đồ UML + Đặc tả CSDL Prisma & API Menu)* | - `backend/prisma/schema.prisma`<br>- `backend/prisma/seed.ts`<br>- `backend/src/prisma/prisma.service.ts`<br>- `backend/src/products/products.controller.ts`<br>- `backend/src/products/products.service.ts` | - `frontend/src/app/page.tsx`<br>- `frontend/src/components/ProductModal.tsx` | `backend/src/app.spec.ts`<br>*(Task 2 Products & Toppings)* |

---

## 2. Danh mục 15 Sơ đồ UML trong Bộ Tài liệu

Mỗi chuyên đề bao gồm đúng **5 loại sơ đồ chuẩn UML** (vẽ bằng Mermaid tương thích trực tiếp với GitHub Markdown):
1. **Use Case Diagram:** Biểu diễn tác nhân (Actors) và các ca sử dụng trong phạm vi luồng nghiệp vụ.
2. **Activity Diagram:** Biểu diễn luồng hoạt động (Activity flow), các nút quyết định (Decision nodes) và nhánh rẽ ngoại lệ.
3. **Sequence Diagram:** Biểu diễn trình tự thông điệp tuần tự giữa `Khách hàng -> Next.js Frontend -> NestJS Controller/Guard/Service -> Prisma ORM -> PostgreSQL / Mock Gateway`.
4. **Class Diagram:** Biểu diễn cấu trúc lớp thực thể, DTO, Service và các kiểu liệt kê (`enum`) khớp 100% với `schema.prisma`.
5. **Deployment Diagram:** Biểu diễn kiến trúc triển khai vật lý (Docker Containers, PostgreSQL, HTTPS Mock Payment Gateway, CI/CD Pipeline & Secrets).

---

## 3. Hướng dẫn Kiểm thử Nhanh (Task 5.2)

Chạy toàn bộ Unit Test, Integration Test, kiểm tra `GET /health`, Guard `POST /orders` và bài kiểm thử End-to-End (E2E) từ lúc xem Menu đến khi Xác nhận đơn hàng:

```bash
cd backend
npx jest src/app.spec.ts src/orders/order-state-machine.spec.ts --runInBand
```
