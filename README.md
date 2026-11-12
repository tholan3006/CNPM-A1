# BrewLite - Ứng dụng đặt cà phê và thanh toán không tiền mặt

**Trường Đại học Sài Gòn - Khoa Công nghệ Thông tin**  
**Môn học:** Công nghệ Phần mềm | **Học kỳ:** I – Năm học 2026–2027  
**Bài tập lớn:** BrewLite (Phiên bản 1.0)  
**Quy trình:** Agile Scrum (3 Sprints, 10 Tasks)  
**Công nghệ:** NestJS (Backend), Next.js 14 (Frontend), PostgreSQL, Prisma ORM, Docker  

---

## Mục lục

1. [Tổng quan đồ án](#1-tổng-quan-đồ-án)
2. [Kiến trúc hệ thống và cấu trúc thư mục](#2-kiến-trúc-hệ-thống-và-cấu-trúc-thư-mục)
3. [Danh mục sản phẩm và topping](#3-danh-mục-sản-phẩm-và-topping)
4. [Product Backlog (10 Task Scrum)](#4-product-backlog-10-task-scrum)
5. [Luồng nghiệp vụ và Wireframe](#5-luồng-nghiệp-vụ-và-wireframe)
6. [Nghiệp vụ backend nâng cao (Task 10)](#6-nghiệp-vụ-backend-nâng-cao-task-10)
7. [Hướng dẫn cài đặt và vận hành](#7-hướng-dẫn-cài-đặt-và-vận-hành)
8. [Danh sách API và Swagger Documentation](#8-danh-sách-api-và-swagger-documentation)
9. [Kiểm thử hệ thống (Unit & Integration Tests)](#9-kiểm-thử-hệ-thống-unit--integration-tests)
10. [Kịch bản demo nghiệm thu](#10-kịch-bản-demo-nghiệm-thu)
11. [Kế hoạch Sprint và phân công công việc](#11-kế-hoạch-sprint-và-phân-công-công-việc)
12. [Tiêu chí hoàn thành (Definition of Done)](#12-tiêu-chí-hoàn-thành-definition-of-done)

---

## 1. Tổng quan đồ án

BrewLite là ứng dụng hỗ trợ khách hàng đặt đồ uống và thanh toán trực tuyến tại quầy cà phê. Mục tiêu chính là giảm bớt thời gian chờ đợi xếp hàng của khách hàng trong giờ cao điểm và tự động hóa luồng tiếp nhận đơn hàng.

### 1.1. Tầm nhìn sản phẩm (Product Vision)
"BrewLite giúp khách hàng đặt và thanh toán đồ uống không dùng tiền mặt chỉ trong vài chạm, giảm thời gian xếp hàng và nhận đơn nhanh tại quầy."

### 1.2. Các bên liên quan (Stakeholders)
- **Khách hàng:** Người dùng chính của hệ thống MVP. Xem menu, chọn món (size, topping), quản lý giỏ hàng, thanh toán trực tuyến và tra cứu lịch sử đơn hàng.
- **Nhân viên quầy (Barista):** Tiếp nhận đơn hàng và cập nhật tiến độ pha chế (tính năng mở rộng quản lý theo trạng thái đơn).
- **Quản lý / Product Owner:** Định nghĩa yêu cầu, quản lý backlog và đánh giá sản phẩm sau mỗi sprint.
- **Giảng viên hướng dẫn & nghiệm thu:** Đánh giá việc áp dụng quy trình Scrum, chất lượng code, độ hoàn thiện của các chức năng và tài liệu bàn giao.
- **Nhóm phát triển:** Phân tích, thiết kế cơ sở dữ liệu, xây dựng API, giao diện người dùng và kiểm thử.

---

## 2. Kiến trúc hệ thống và cấu trúc thư mục

### 2.1. Kiến trúc tổng thể
Hệ thống được thiết kế theo mô hình client-server phân tách:
- **Frontend (Next.js 14 App Router):** Giao diện người dùng viết bằng React và TypeScript, sử dụng TailwindCSS để dàn trang, Zustand để quản lý state giỏ hàng.
- **Backend (NestJS):** Cung cấp RESTful API, xác thực người dùng bằng JWT, kiểm tra tính hợp lệ của dữ liệu đầu vào bằng `class-validator`, quản lý luồng trạng thái đơn hàng và xử lý thanh toán.
- **Database (PostgreSQL + Prisma ORM):** Lưu trữ dữ liệu quan hệ gồm 8 bảng, quản lý schema và seed dữ liệu tự động bằng Prisma.
- **Mock Payment Gateway:** Module mô phỏng thanh toán trực tuyến qua thẻ và ví điện tử, hỗ trợ cơ chế Idempotency.

### 2.2. Cấu trúc thư mục Monorepo

```text
CNPM-A1/
├── backend/                       # Source code Backend (NestJS)
│   ├── prisma/
│   │   ├── schema.prisma          # Định nghĩa 8 bảng dữ liệu
│   │   └── seed.ts                # Dữ liệu khởi tạo (menu, topping, coupon, user mẫu)
│   ├── src/
│   │   ├── auth/                  # Đăng ký, đăng nhập, mã hóa bcrypt, JWT Strategy/Guard
│   │   ├── products/              # API lấy danh sách và chi tiết món
│   │   ├── orders/                # API đơn hàng, State Machine, xử lý Idempotency, khóa tồn kho
│   │   ├── payments/              # Mock thanh toán ví MoMo và thẻ ngân hàng
│   │   ├── prisma/                # Prisma Module và Prisma Service
│   │   ├── app.controller.ts      # Endpoint kiểm tra sức khỏe hệ thống (/api)
│   │   └── main.ts                # Cấu hình CORS, ValidationPipe, Swagger UI
│   ├── Dockerfile
│   └── package.json
│
├── frontend/                      # Source code Frontend (Next.js 14)
│   ├── public/
│   │   └── images/                # Ảnh sản phẩm lưu cục bộ (offline)
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx           # Trang chủ thực đơn, lọc theo nhóm món
│   │   │   ├── orders/            # Màn hình lịch sử đơn hàng
│   │   │   ├── order-confirmation/# Màn hình biên lai xác nhận đơn hàng
│   │   │   └── layout.tsx         # Layout chính bao bọc giỏ hàng và modal
│   │   ├── components/
│   │   │   ├── Navbar.tsx         # Thanh điều hướng, thông tin tài khoản, giỏ hàng
│   │   │   ├── ProductModal.tsx   # Modal tùy chọn size và topping theo từng món
│   │   │   ├── CartDrawer.tsx     # Giỏ hàng, cập nhật số lượng, xóa món
│   │   │   ├── AuthModal.tsx      # Đăng nhập và đăng ký tài khoản
│   │   │   ├── CheckoutModal.tsx  # Thanh toán, chọn hình thức trả tiền, áp mã giảm giá
│   │   │   └── OrderSuccessModal.tsx # Thông báo hoàn tất đơn hàng
│   │   ├── cartStore.ts           # State giỏ hàng (Zustand)
│   │   └── types.ts               # Định nghĩa interface TypeScript
│   ├── Dockerfile
│   └── package.json
│
├── docker-compose.yml             # File cấu hình chạy đồng thời PostgreSQL, Backend và Frontend
├── .env.example                   # Khung cấu hình biến môi trường
├── .vscode/                       # Cấu hình phím tắt F5 và Ctrl+Shift+B
├── package.json                   # Script chạy song song từ thư mục gốc
└── README.md                      # Tài liệu bàn giao đồ án
```

---

## 3. Danh mục sản phẩm và topping

Dữ liệu hình ảnh được lưu trữ trực tiếp trong thư mục `frontend/public/images/`, không phụ thuộc vào liên kết ngoài để đảm bảo khả năng chạy ổn định khi không có mạng.

### 3.1. Danh sách đồ uống mẫu
| STT | Tên sản phẩm | Nhóm | Giá gốc | Đường dẫn file ảnh |
| :-: | :--- | :---: | :-: | :--- |
| 1 | Cà phê sữa đá | Cà phê | 29.000 đ | `/images/ca-phe-sua.jpg` |
| 2 | Americano | Cà phê | 35.000 đ | `/images/americano.jpg` |
| 3 | Cappuccino | Cà phê | 45.000 đ | `/images/cappuccino.jpg` |
| 4 | Trà đào cam sả | Trà trái cây | 42.000 đ | `/images/tra-dao.jpg` |
| 5 | Cold Brew | Cà phê | 45.000 đ | `/images/cold-brew.jpg` |
| 6 | Matcha Latte | Trà & Đá xay | 49.000 đ | `/images/matcha-latte.jpg` |

### 3.2. Danh sách topping theo từng nhóm đồ uống
- **Cà phê (Cà phê sữa, Americano, Cappuccino, Cold Brew):** Thạch cà phê (8.000 đ), Sốt Caramel (8.000 đ), Bột Cacao (5.000 đ), Shot Espresso (10.000 đ), Kem Cheese (10.000 đ), Trân châu đen (8.000 đ).
- **Trà đào cam sả:** Đào miếng ngâm (10.000 đ), Thạch đào giòn (8.000 đ), Trân châu trắng (8.000 đ), Nha đam (8.000 đ), Hạt chia (5.000 đ).
- **Matcha Latte:** Thạch matcha (8.000 đ), Đậu đỏ (8.000 đ), Kem Cheese Macchiato (10.000 đ), Trân châu hoàng kim (10.000 đ).

---

## 4. Product Backlog (10 Task Scrum)

Danh sách 10 hạng mục công việc (Product Backlog Items) được triển khai trong đồ án:

| STT | Hạng mục công việc | Tiêu chí chấp nhận (Acceptance Criteria) |
| :-: | :--- | :--- |
| 1 | Khởi tạo cấu trúc monorepo | Tạo monorepo gồm 2 thư mục `frontend` và `backend`, chạy được Hello World, có file README, git repository và file cấu hình `.env.example`. |
| 2 | API danh sách sản phẩm | NestJS cung cấp `GET /products` và `GET /products/:id` trả về JSON danh sách món, đơn giá, hình ảnh từ cơ sở dữ liệu PostgreSQL qua Prisma ORM. |
| 3 | Trang Menu (Frontend) | Next.js gọi API `/products`, hiển thị lưới sản phẩm, hỗ trợ lọc theo nhóm đồ uống, có trạng thái loading và empty state. |
| 4 | Chi tiết và tùy chọn món | Modal chi tiết sản phẩm cho phép chọn size (S/M/L) và danh sách topping riêng cho từng món; tự động cập nhật tổng giá theo thời gian thực. |
| 5 | Giỏ hàng (Cart) | Thêm, sửa số lượng, xóa món trong giỏ hàng; lưu trữ state tập trung với Zustand; tự động tính tổng tiền; hiển thị badge số lượng trên thanh điều hướng. |
| 6 | API tạo đơn hàng | NestJS `POST /orders` tiếp nhận dữ liệu giỏ hàng, validate DTO bằng `class-validator`, lưu đơn ở trạng thái PENDING ban đầu và trả về mã đơn hàng. |
| 7 | Đăng ký / Đăng nhập (JWT) | Cung cấp `POST /auth/register`, `POST /auth/login`; mã hóa mật khẩu bằng bcrypt; cấp phát token JWT; áp dụng Guard bảo vệ các route cần đăng nhập. |
| 8 | Thanh toán không tiền mặt | Mock Payment Gateway hỗ trợ chọn ví điện tử hoặc thẻ ngân hàng qua `POST /payments`; chuyển đơn thành PAID khi thanh toán thành công, PAYMENT_FAILED khi lỗi. |
| 9 | Xác nhận, lịch sử đơn & bàn giao | Màn hình xác nhận đơn, `GET /orders/me` tra cứu lịch sử đơn hàng; file `docker-compose.yml` triển khai fullstack; tài liệu hướng dẫn và kịch bản demo end-to-end. |
| 10 | Nghiệp vụ backend nâng cao | Quản lý trạng thái đơn hàng bằng State Machine; cơ chế Idempotency chống trừ tiền trùng lặp; Transaction và Optimistic Locking kiểm soát tranh chấp kho; tính điểm thưởng và áp dụng voucher. |

---

## 5. Luồng nghiệp vụ và Wireframe

### 5.1. Luồng nghiệp vụ chính (Happy Path)

```text
[Mở ứng dụng]
      │
      ▼
[Xem Menu món] ──► [Chọn size & topping] ──► [Thêm vào giỏ hàng]
                                                      │
                                                      ▼
[Xác nhận đơn & Mã đơn] ◄── [Thanh toán thẻ/ví] ◄── [Xem giỏ & Tổng tiền]
      │
      ▼
[Nhận đồ uống tại quầy]
```

### 5.2. Wireframe 5 màn hình cơ bản

```text
+-------------------+   +-------------------+   +-------------------+   +-------------------+   +-------------------+
| BrewLite Menu     |   | Chi tiết món      |   | Giỏ hàng          |   | Thanh toán        |   | Xác nhận đơn hàng |
+-------------------+   +-------------------+   +-------------------+   +-------------------+   +-------------------+
| Cà phê sữa    29k |   | Cà phê sữa đá     |   | Cà phê sữa (M) x1 |   | Tổng: 37.000 đ    |   | Đặt hàng thành công!
| Americano     35k |   | Size: [S] (M) [L] |   | + Thạch cà phê    |   | Phương thức:      |   | Mã đơn: #BL-1042  |
| Cappuccino    45k |   | Topping:          |   | ----------------- |   | (o) Ví MoMo       |   | Trạng thái: PAID  |
| Trà đào       42k |   | [x] Thạch cà phê  |   | Tổng: 37.000 đ    |   | ( ) Thẻ ngân hàng |   |                   |
| Cold Brew     45k |   | [ ] Sốt Caramel   |   |                   |   | Mã: [CHAOBANMOI]  |   | Mời bạn đến quầy  |
| Matcha Latte  49k |   |                   |   |                   |   |                   |   | nhận đồ uống!     |
+-------------------+   +-------------------+   +-------------------+   +-------------------+   +-------------------+
| [Xem giỏ hàng (1)]|   | [Thêm vào giỏ]    |   | [Tiến hành trả]   |   | [Xác nhận trả]    |   | [Lịch sử đơn hàng]|
+-------------------+   +-------------------+   +-------------------+   +-------------------+   +-------------------+
       (1)                     (2)                     (3)                     (4)                     (5)
```

---

## 6. Nghiệp vụ backend nâng cao (Task 10)

### 6.1. Order State Machine
Đơn hàng được kiểm soát chuyển trạng thái thông qua hàm `assertTransition()`. Bất kỳ hành động chuyển trạng thái trái phép nào sẽ bị chặn và trả về lỗi HTTP 409 Conflict.

```text
               thanh toán lỗi
           +--------------------+
           |                    |
           v                    |
       [PENDING] --------> [PAYMENT_FAILED]
           |      thử lại       |
           | thanh toán OK      | hủy đơn
           v                    v
        [PAID]            [CANCELLED]
           |
           v
      [PREPARING]
           |
           v
        [READY]
           |
           v
      [COMPLETED]
```

- Luồng thành công: `PENDING` -> `PAID` -> `PREPARING` -> `READY` -> `COMPLETED`.
- Luồng ngoại lệ: Khi cổng thanh toán báo lỗi, đơn chuyển thành `PAYMENT_FAILED` và có thể thử lại. Khách hàng hoặc hệ thống có thể hủy đơn thành `CANCELLED`.

### 6.2. Thanh toán Idempotent (Tránh trừ tiền trùng lặp)
- Khi gọi `POST /api/payments`, frontend gửi kèm chuỗi `idempotencyKey` ngẫu nhiên đại diện cho một lần bấm thanh toán.
- Trường `idempotencyKey` được đánh chỉ mục `@unique` trong bảng thanh toán.
- Trường hợp người dùng click liên tục nhiều lần hoặc mạng chập chờn gửi lại request, hệ thống chỉ trừ tiền và ghi nhận đúng 1 lần, các request tiếp theo chỉ đọc lại kết quả giao dịch đã có (`replayed: true`).

### 6.3. Kiểm soát tồn kho khi có tranh chấp (Concurrency Control)
- Áp dụng kỹ thuật Optimistic Locking kết hợp Database Transaction.
- Trong trường hợp sản phẩm chỉ còn 5 phần nhưng có 10 khách hàng gửi request đặt mua đồng thời, hệ thống đảm bảo xử lý thành công đúng 5 đơn và từ chối 5 đơn còn lại với thông báo hết hàng, không xảy ra hiện tượng âm kho.
- Nếu đơn hàng bị hủy, số lượng tồn kho sẽ được hoàn trả tự động vào cơ sở dữ liệu.

### 6.4. Áp dụng mã giảm giá và tích điểm thành viên
- Mã khuyến mãi mẫu: `CHAOBANMOI` (giảm 10% giá trị đơn hàng, áp dụng cho đơn từ 40.000 đ trở lên).
- Hệ thống kiểm tra điều kiện áp dụng, hạn sử dụng, số lượt dùng tối đa và tự động hoàn trả lượt dùng nếu đơn bị hủy.
- Tích điểm thành viên: Cứ mỗi 10.000 đ thanh toán thành công, người dùng được tích lũy 1 điểm vào tài khoản (`loyaltyPoints`).

---

## 7. Hướng dẫn cài đặt và vận hành

### 7.1. Cách 1: Chạy toàn bộ hệ thống bằng Docker 
Hỗ trợ tương thích 100% trên cả **Windows, macOS và Linux**. Chỉ cần máy đã cài **Docker Desktop**:

> 💡 **Khởi chạy bằng 1 lệnh duy nhất cho mọi hệ điều hành:**
> Mở terminal / CMD tại thư mục đồ án và chạy:
> ```bash
> npm run docker:up
> ```
> *Script thông minh sẽ tự động kiểm tra Docker daemon, tự mở Docker Desktop nếu chưa bật, giải phóng container cũ và khởi động đầy đủ PostgreSQL, Backend và Frontend.*

**Các lệnh Docker hữu ích:**
```bash
# Xem log hoạt động của các container theo thời gian thực
npm run docker:logs

# Kiểm tra trạng thái các container
npm run docker:ps

# Dừng toàn bộ hệ thống
npm run docker:down
```

**Hoặc dùng lệnh Docker Compose gốc:**
```bash
docker compose up -d --build
```

Các địa chỉ truy cập:
- Frontend (Giao diện đặt món): `http://localhost:3000`
- Backend REST API: `http://localhost:4000`
- Swagger API Docs: `http://localhost:4000/api/docs`

---

### 7.2. Cách 2: Chạy trực tiếp trong VS Code (Dành cho phát triển & debug)

Hệ thống đã tích hợp script tự động hóa chuẩn bị môi trường:
1. Mở thư mục đồ án trong **VS Code**.
2. Nhấn tổ hợp phím **`Ctrl + Shift + B`** (hoặc chọn menu *Terminal -> Run Build Task... -> Chạy Fullstack*).
3. Hệ thống sẽ tự động:
   - Tạo file cấu hình `.env` cho backend và `.env.local` cho frontend.
   - Kiểm tra và cài đặt dependencies cần thiết (tinh gọn, không spam log cảnh báo).
   - Tự động bật Docker Desktop và khởi động PostgreSQL container.
   - Đồng bộ Prisma Schema và nạp dữ liệu mẫu (Seed 6 món nước, topping, 3 user mẫu, voucher).
   - Khởi chạy song song Backend (NestJS :4000) và Frontend (Next.js :3000).

- **Hoặc khởi chạy từ terminal:**
  ```bash
  # Tự động chuẩn bị môi trường và DB
  npm run setup

  # Chạy đồng thời cả frontend và backend
  npm run dev
  ```

---

### 7.3. Cách 3: Chạy thủ công từng service

#### Bước 1: Khởi động cơ sở dữ liệu PostgreSQL
```bash
docker compose up -d postgres
```

#### Bước 2: Thiết lập và chạy Backend
```bash
cd backend

# Cài đặt thư viện
npm install

# Tạo file .env nếu chưa có
cp .env.example .env

# Đẩy schema vào cơ sở dữ liệu
npx prisma db push

# Nạp dữ liệu mẫu ban đầu
npx prisma db seed

# Chạy server ở chế độ development
npm run start:dev
```

#### Bước 3: Thiết lập và chạy Frontend
Mở một cửa sổ terminal mới:
```bash
cd frontend

# Cài đặt thư viện
npm install

# Khởi chạy Next.js
npm run dev
```

#### Bước 4: Xem dữ liệu qua Prisma Studio
Tại thư mục `backend`, chạy:
```bash
npx prisma studio
```
Truy cập `http://localhost:5555` để duyệt và chỉnh sửa trực tiếp các bảng dữ liệu trên giao diện web.

---

### 7.4. Ma trận phân quyền và Tài khoản kiểm thử (RBAC & Test Accounts)

Hệ thống áp dụng mô hình phân quyền dựa trên vai trò (**Role-Based Access Control - RBAC**) với 3 nhóm người dùng chính theo yêu cầu môn học:

1. **Khách hàng (`CUSTOMER`):** Người dùng dịch vụ đặt món. Có thể duyệt menu, tùy chọn sản phẩm (size, topping), tạo đơn hàng, áp dụng voucher khuyến mãi, thực hiện thanh toán trực tuyến, tra cứu lịch sử đơn hàng cá nhân và tích lũy điểm thưởng thành viên.
2. **Nhân viên pha chế (`BARISTA`):** Tiếp nhận danh sách đơn hàng đã thanh toán (`PAID`), thực hiện cập nhật tiến độ pha chế theo quy trình trạng thái (`PREPARING` -> `READY`).
3. **Quản trị viên (`ADMIN`):** Quản trị danh mục sản phẩm, theo dõi toàn bộ hệ thống đơn hàng và cấu hình tham số khuyến mãi.

Để phục vụ công tác chấm điểm và thực nghiệm hệ thống của Giảng viên:
- **Tùy chọn 1:** Giảng viên có thể đăng ký một tài khoản Khách hàng mới trực tiếp trên giao diện ứng dụng (nút *Đăng ký mới* tại modal Đăng nhập).
- **Tùy chọn 2:** Sử dụng các tài khoản kiểm thử đã được nạp sẵn dữ liệu mẫu (Seed Data) chuẩn hóa theo đồ án:

| Vai trò (Role) | Email kiểm thử | Mật khẩu mặc định | Dữ liệu mẫu phục vụ nghiệm thu |
| :--- | :--- | :---: | :--- |
| **Khách hàng (Customer)** | `customer@brewlite.com` | `123456` | Đã nạp sẵn 3 đơn hàng lịch sử (BL-1042, BL-1038, BL-1025) và 120 điểm loyalty để phục vụ kiểm thử ngay màn hình Lịch sử đơn hàng (Task 9). |
| **Nhân viên quầy (Barista)** | `barista@brewlite.com` | `123456` | Tài khoản nhân viên phục vụ kiểm thử luồng cập nhật trạng thái chế biến tại quầy. |
| **Quản trị viên (Admin)** | `admin@brewlite.com` | `123456` | Quyền Quản trị viên hệ thống. |

---

## 8. Danh sách API và Swagger Documentation

Trang tài liệu Swagger UI được tích hợp sẵn tại địa chỉ: `http://localhost:4000/api/docs`

| Phương thức | Đường dẫn API | Chức năng | Phân quyền |
| :-: | :--- | :--- | :-: |
| `GET` | `/api` | Kiểm tra kết nối dịch vụ (Task 1) | Công khai |
| `GET` | `/api/products` | Lấy danh sách sản phẩm và topping (Task 2) | Công khai |
| `GET` | `/api/products/:id` | Xem thông tin chi tiết một sản phẩm (Task 2) | Công khai |
| `POST` | `/api/auth/register` | Đăng ký tài khoản người dùng mới (Task 7) | Công khai |
| `POST` | `/api/auth/login` | Đăng nhập tài khoản, nhận JWT token (Task 7) | Công khai |
| `POST` | `/api/orders` | Khởi tạo đơn hàng từ giỏ hàng (Task 6) | Cần JWT |
| `POST` | `/api/payments` | Xử lý thanh toán không tiền mặt (Task 8, 10) | Cần JWT |
| `GET` | `/api/orders/me` | Lấy danh sách lịch sử đơn hàng của người dùng (Task 9) | Cần JWT |

---

## 9. Kiểm thử hệ thống (Unit & Integration Tests)

Hệ thống cung cấp bộ kiểm thử tự động cho các nghiệp vụ chính của Task 10:
- Kiểm tra tính đúng đắn của máy trạng thái đơn hàng (chặn chuyển trạng thái sai).
- Kiểm tra thanh toán lặp với Idempotency Key (chỉ trừ tiền 1 lần).
- Kiểm tra xử lý tranh chấp tồn kho khi có nhiều request đồng thời.
- Kiểm tra áp dụng mã voucher và cộng điểm tích lũy.

Chạy lệnh kiểm thử:
```bash
cd backend
npm run test
```

---

## 10. Kịch bản demo nghiệm thu

Thứ tự 5 bước thực hiện khi demo sản phẩm cho Giảng viên:

1. **Xem menu đồ uống:** Mở trình duyệt tại `http://localhost:3000`. Duyệt danh sách các món cà phê và trà trái cây, kiểm tra hình ảnh offline hiển thị đầy đủ, không bị lỗi ảnh.
2. **Chọn món và tùy chỉnh:** Bấm vào một món (ví dụ: Trà đào cam sả). Chọn size L, chọn topping (Đào miếng, Thạch đào). Quan sát giá tiền tăng tương ứng theo lựa chọn. Bấm "Thêm vào giỏ hàng" và thấy badge giỏ hàng trên thanh điều hướng cập nhật số lượng.
3. **Kiểm tra giỏ hàng và áp mã giảm giá:** Mở giỏ hàng, thử tăng giảm số lượng sản phẩm. Nhập mã giảm giá `CHAOBANMOI`, kiểm tra hệ thống giảm 10% trên tổng tiền đơn hàng.
4. **Thực hiện thanh toán:** Bấm nút thanh toán, chọn hình thức "Ví điện tử MoMo" hoặc "Thẻ ngân hàng", xác nhận thanh toán. Giao diện hiển thị modal biên lai thành công với mã đơn hàng và trạng thái `PAID`.
5. **Xem lịch sử đơn:** Điều hướng vào trang `/orders`, kiểm tra đơn hàng vừa đặt xuất hiện trong danh sách với đầy đủ chi tiết sản phẩm, topping đã chọn, tổng tiền và mã giao dịch.

---

## 11. Kế hoạch Sprint và phân công công việc

### 11.1. Phân bổ 3 Sprint
- **Sprint 1 (Nền tảng & Menu):** Task 1, 2, 3, 4 (Khởi tạo hệ thống, xây dựng API sản phẩm, dựng giao diện menu và modal chọn size/topping).
- **Sprint 2 (Giỏ hàng & Đặt hàng):** Task 5, 6, 7 (Quản lý giỏ hàng Zustand, API tạo đơn hàng, đăng ký đăng nhập JWT).
- **Sprint 3 (Thanh toán & Nghiệp vụ nâng cao):** Task 8, 9, 10 (Tích hợp cổng thanh toán giả lập, màn hình lịch sử đơn hàng, docker-compose, xử lý tranh chấp và idempotency).

### 11.2. Phân công 5 thành viên nhóm
| Thành&nbsp;viên | MSSV | Nhiệm vụ phụ trách |
| :--- | :---: | :--- |
| **Phan&nbsp;Vũ&nbsp;Việt&nbsp;Quang** | 3124560072 | Task 1 (Khởi tạo monorepo, cấu hình docker) và Task 9 (Trang lịch sử đơn hàng, docker-compose full, tài liệu demo). |
| **Trần&nbsp;Vĩnh&nbsp;Thọ&nbsp;Lân** | 3124560049 | Task 3 (Giao diện trang chủ menu, bộ lọc danh mục) và Task 4 (Modal tùy chọn size và topping theo món). |
| **Nguyễn&nbsp;Tuấn&nbsp;Khôi** | 3124560043 | Task 5 (Quản lý giỏ hàng với Zustand) và Task 8 (Giao diện chọn thanh toán và popup thông báo). |
| **Nguyễn&nbsp;Hữu&nbsp;Chí&nbsp;Công** | 3124720010 | Task 2 (Prisma schema, API lấy danh sách món) và Task 7 (Xác thực người dùng, băm mật khẩu, JWT Guard). |
| **Thành&nbsp;viên&nbsp;5** | *(Cập nhật sau)* | Task 6 (API tạo đơn hàng, validate dữ liệu) và Task 10 (State Machine, Idempotent, khóa tồn kho, tích điểm). |

### 11.3. Biểu đồ Burndown Chart mẫu (20 Story Points - 10 ngày)

```text
Story Points
20 | * [Mục tiêu lý tưởng]  . [Thực tế nhóm]
18 |   \   .
16 |     \   \
14 |       \   .
12 |         \   \
10 |           \   .
 8 |             \   \
 6 |               \   .
 4 |                 \   \
 2 |                   \   .
 0 +-------------------------*---> Ngày
   0   1   2   3   4   5   6   7   8   9  10
```

---

## 12. Tiêu chí hoàn thành (Definition of Done)

Một tính năng được nghiệm thu khi đáp ứng các điều kiện sau:
- Mã nguồn chạy ổn định, không phát sinh lỗi biên dịch ở cả Frontend và Backend.
- Đáp ứng đúng tiêu chí chấp nhận đã quy định trong đề bài môn học.
- Mã nguồn được commit rõ ràng trên Git theo từng nhánh tính năng.
- API có kiểm tra tính hợp lệ của dữ liệu đầu vào; giao diện xử lý tốt các trạng thái chờ và lỗi.
- Đầy đủ tài liệu hướng dẫn và có thể triển khai nhanh thông qua Docker Compose.
