# THÀNH VIÊN 4: Màn hình & Luồng "Thanh toán & Xác nhận đơn" (Task 8)

**Người thực hiện:** Nguyễn Hữu Chí Công (Thành viên 4)  
**Phạm vi:** Cổng thanh toán giả lập không tiền mặt (`POST /payments`), cơ chế chống trừ tiền trùng lặp (`Idempotency-Key`), chuyển trạng thái đơn hàng (`PAID` / `PAYMENT_FAILED`), tích điểm thành viên (`loyaltyPoints`) và màn hình xác nhận đơn hàng.

---

## 1. Bộ 5 Sơ đồ UML (Use Case, Activity, Sequence, Class, Deployment)

### 1.1. Use Case Diagram — Thanh toán không tiền mặt & Xem màn hình xác nhận

```mermaid
flowchart LR
    Customer(["👤 Khách hàng ( Đã đăng nhập )"])
    Gateway(["🏦 Cổng thanh toán giả lập (Mock Payment Gateway)"])

    subgraph BrewLite_Payment_System ["Hệ thống BrewLite — Phân hệ Thanh toán & Xác nhận đơn"]
        UC1(["UC4.1: Chọn phương thức thanh toán (Ví điện tử / Thẻ ngân hàng)"])
        UC2(["UC4.2: Thực hiện thanh toán không tiền mặt (POST /payments)"])
        UC3(["UC4.3: Kiểm tra chống thanh toán trùng (Idempotency Check)"])
        UC4(["UC4.4: Xử lý lỗi & Thử lại thanh toán (Retry on PAYMENT_FAILED)"])
        UC5(["UC4.5: Xem màn hình xác nhận đơn & Mã đơn hàng (#BL-xxxx)"])
        UC6(["UC4.6: Tích điểm thưởng thành viên (Loyalty Points)"])
    end

    Customer --> UC1
    Customer --> UC2
    Customer --> UC4
    Customer --> UC5

    UC2 -.->|"<<include>>"| UC1
    UC2 -.->|"<<include>>"| UC3
    UC2 -.->|"<<include>>"| UC6
    UC4 -.->|"<<extend>> (Khi giao dịch lỗi)"| UC2
    UC5 -.->|"<<include>> (Khi trạng thái = PAID)"| UC2

    UC2 --> Gateway
```

---

### 1.2. Activity Diagram — Luồng chọn phương thức (Ví/Thẻ), xác nhận thanh toán & hiển thị trạng thái đơn (`PAID` / `PAYMENT_FAILED`)

```mermaid
flowchart TD
    Start(["Bắt đầu: Khách hàng mở màn hình Thanh toán"]) --> CheckAuth{"Đã đăng nhập JWT?"}
    CheckAuth -- "Chưa đăng nhập" --> RequireLogin["Hiển thị thông báo yêu cầu Đăng nhập & Bảo lưu giỏ hàng"]
    RequireLogin --> EndAuth(["Kết thúc / Mở AuthModal"])

    CheckAuth -- "Đã đăng nhập" --> SelectMethod["Chọn phương thức thanh toán: Ví điện tử (E_WALLET) hoặc Thẻ (BANK_CARD)"]
    SelectMethod --> InputDetails{"Phương thức là BANK_CARD?"}
    InputDetails -- "Có" --> FillCard["Nhập Số thẻ, Hạn dùng (MM/YY), CVV, Tên chủ thẻ & SĐT nhận hàng"]
    InputDetails -- "Không (E_WALLET)" --> SelectWallet["Chọn Ví MoMo / VNPay-QR / ZaloPay & SĐT nhận hàng"]

    FillCard --> ClickPay["Bấm nút 'Xác nhận thanh toán' (Sinh Idempotency-Key)"]
    SelectWallet --> ClickPay

    ClickPay --> EnsureOrder["Khởi tạo đơn hàng trạng thái PENDING (POST /orders) nếu chưa có"]
    EnsureOrder --> CallPaymentAPI["Gửi request POST /payments kèm Header 'Idempotency-Key' & Bearer Token"]

    CallPaymentAPI --> CheckIdem{"Idempotency-Key đã tồn tại?"}
    CheckIdem -- "Đã tồn tại (Cùng Order)" --> ReturnCached["Trả về kết quả giao dịch đã lưu (idempotentReplay = true, không trừ tiền lại)"]
    CheckIdem -- "Đã tồn tại (Khác Order)" --> ConflictError["Trả lỗi 409 Conflict"]

    CheckIdem -- "Key mới" --> CheckState{"Trạng thái đơn hiện tại thuộc [PENDING, PAYMENT_FAILED]?"}
    CheckState -- "Không (Đã PAID hoặc CANCELLED)" --> StateError["Trả lỗi 400 Bad Request (Chặn thanh toán đơn đã hoàn tất/hủy)"]

    CheckState -- "Hợp lệ" --> RunGateway{"Kết quả xử lý tại Mock Payment Gateway?"}

    RunGateway -- "Thất bại (simulateFailure = true)" --> TxFail["Transaction DB: Lưu Payment (FAILED) & Cập nhật Order -> PAYMENT_FAILED"]
    TxFail --> ShowFailUI["Hiển thị thông báo lỗi trên CheckoutModal, giữ nguyên giỏ hàng & orderId để khách thử lại"]
    ShowFailUI --> RetryChoice{"Khách hàng bấm Thử lại?"}
    RetryChoice -- "Có (Sinh Idempotency-Key mới)" --> SelectMethod
    RetryChoice -- "Không" --> EndFail(["Kết thúc (Đơn ở trạng thái PAYMENT_FAILED)"])

    RunGateway -- "Thành công (simulateFailure = false)" --> TxSuccess["Transaction DB: Lưu Payment (SUCCESS, mã MOCK-xxx), Cập nhật Order -> PAID & Cộng điểm Loyalty (1 điểm / 10.000đ)"]
    TxSuccess --> ClearCart["Xóa giỏ hàng & Lưu thông tin xác nhận đơn (lastOrder)"]
    ReturnCached --> ClearCart
    ClearCart --> ShowSuccessUI["Hiển thị màn hình Xác nhận đơn (OrderSuccessModal / order-confirmation): Trạng thái PAID, Mã đơn #BL-xxxx, Mã giao dịch"]
    ShowSuccessUI --> EndSuccess(["Hoàn tất: Khách hàng đến quầy nhận đồ uống"])
```

---

### 1.3. Sequence Diagram — Luồng gọi API thanh toán Idempotent (`POST /payments`)

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Khách hàng
    participant FE as Next.js Frontend<br/>(CheckoutModal / cartStore)
    participant Guard as NestJS JwtAuthGuard
    participant Ctrl as PaymentsController
    participant Svc as PaymentsService
    participant DB as PostgreSQL (Prisma ORM)

    Customer->>FE: Chọn Ví MoMo / Thẻ Ngân hàng & Bấm "Xác nhận thanh toán"
    FE->>FE: Sinh khóa chống trùng: Idempotency-Key = "brewlite-idem-<timestamp>"
    FE->>Guard: POST /payments (Headers: Authorization Bearer <JWT>, Idempotency-Key)
    Guard->>Guard: Xác thực chữ ký JWT & trích xuất user { id, email, role }

    alt Token không hợp lệ hoặc thiếu Token
        Guard-->>FE: 401 Unauthorized
        FE-->>Customer: Thông báo yêu cầu đăng nhập
    else Token hợp lệ
        Guard->>Ctrl: createPayment(dto, headerIdempotencyKey, currentUser)
        Ctrl->>Svc: processPayment(dto, headerIdempotencyKey, userId)

        Svc->>DB: prisma.payment.findUnique({ where: { idempotencyKey } })
        alt Idempotency-Key đã tồn tại trong bảng payments
            DB-->>Svc: existingPayment (kèm order)
            alt existingPayment.orderId !== dto.orderId
                Svc-->>Ctrl: 409 ConflictException ("Idempotency key used for different order")
                Ctrl-->>FE: 409 Conflict
            else Cùng orderId (Request gửi lặp do mạng/double-click)
                Svc-->>Ctrl: 201 Created (existingPayment, idempotentReplay: true)
                Ctrl-->>FE: Kết quả giao dịch gốc (Không trừ tiền lần 2)
            end
        else Idempotency-Key mới (Lần gọi đầu tiên)
            Svc->>DB: prisma.order.findUnique({ where: { id: dto.orderId } })
            DB-->>Svc: order (status: PENDING hoặc PAYMENT_FAILED)

            alt order.status không thuộc [PENDING, PAYMENT_FAILED]
                Svc-->>Ctrl: 400 BadRequestException ("Invalid order state transition")
                Ctrl-->>FE: 400 Bad Request
            else Trạng thái hợp lệ — Thực thi Database Transaction ($transaction)
                Svc->>DB: BEGIN TRANSACTION
                Svc->>DB: tx.order.updateMany({ where: { id, status: in [PENDING, PAYMENT_FAILED] }, data: { status: PAID / PAYMENT_FAILED } })
                Svc->>DB: tx.payment.create({ orderId, idempotencyKey, amount, method, status, transactionRef })
                opt Khi thanh toán thành công (status == SUCCESS)
                    Svc->>DB: tx.user.update({ loyaltyPoints: { increment: floor(total / 10000) } })
                end
                Svc->>DB: COMMIT TRANSACTION
                DB-->>Svc: { payment, updatedOrder, updatedLoyaltyPoints }
                Svc-->>Ctrl: 201 Created { status, transactionRef, order, idempotentReplay: false }
                Ctrl-->>FE: JSON Response (PAID / PAYMENT_FAILED)
            end
        end

        alt status === "SUCCESS" (Đơn hàng chuyển sang PAID)
            FE->>FE: clearCart(), setLastOrder(completedOrder), updateLoyaltyPoints()
            FE-->>Customer: Hiển thị màn hình Xác nhận đơn (Mã đơn #BL-xxxx, Trạng thái PAID)
        else status === "FAILED" (Đơn hàng chuyển sang PAYMENT_FAILED)
            FE-->>Customer: Báo lỗi giao dịch thất bại, giữ nguyên giỏ hàng để thử lại
        end
    end
```

---

### 1.4. Class Diagram — Lớp `Payment`, `PaymentMethod`, `PaymentStatus`, `OrderStatus` và các lớp liên quan

```mermaid
classDiagram
    class OrderStatus {
        <<enumeration>>
        PENDING
        PAID
        PREPARING
        READY
        COMPLETED
        CANCELLED
        PAYMENT_FAILED
    }

    class PaymentMethod {
        <<enumeration>>
        E_WALLET
        BANK_CARD
    }

    class PaymentStatus {
        <<enumeration>>
        PENDING
        SUCCESS
        FAILED
    }

    class Order {
        +String id
        +String orderNumber
        +String userId
        +OrderStatus status
        +Decimal subtotal
        +Decimal discountAmount
        +Decimal total
        +String? notes
        +DateTime createdAt
        +DateTime updatedAt
    }

    class Payment {
        +String id
        +String orderId
        +String idempotencyKey
        +Decimal amount
        +PaymentMethod method
        +PaymentStatus status
        +String? transactionRef
        +DateTime createdAt
    }

    class CreatePaymentDto {
        +String orderId
        +PaymentMethod method
        +String? idempotencyKey
        +Number? amount
        +Boolean? simulateFailure
        +String? notes
    }

    class PaymentsController {
        -PaymentsService paymentsService
        +createPayment(dto: CreatePaymentDto, headerKey?: String, user?: UserPayload)
        +findByOrder(orderId: String, user?: UserPayload)
    }

    class PaymentsService {
        -PrismaService prisma
        +processPayment(dto: CreatePaymentDto, headerKey?: String, userId?: String)
        +findByOrder(orderId: String, userId?: String, role?: String)
        -formatPaymentResponse(payment: Payment, order: Order, isReplay: Boolean, loyaltyPoints?: Number)
    }

    Order "1" --> "0..*" Payment : has payments
    Order --> OrderStatus : uses
    Payment --> PaymentMethod : uses
    Payment --> PaymentStatus : uses
    PaymentsController --> PaymentsService : delegates
    PaymentsController ..> CreatePaymentDto : validates
    PaymentsService --> Payment : persists via Prisma
    PaymentsService --> Order : transitions state
```

---

### 1.5. Deployment Diagram — Nút tích hợp Cổng thanh toán giả lập (Mock Payment Gateway) qua HTTPS

```mermaid
flowchart TB
    subgraph Client_Tier ["Thiết bị Khách hàng (Client Tier)"]
        Browser["🌐 Trình duyệt Web / Mobile PWA<br/>(CheckoutModal & OrderConfirmation)"]
    end

    subgraph Application_Tier ["Docker Host / Cloud Application Tier"]
        FE_Node["📦 Container: brewlite-frontend<br/>(Next.js 14 App Router - Port 3000)"]
        BE_Node["⚙️ Container: brewlite-backend<br/>(NestJS API Server - Port 4000)<br/>PaymentsModule + JwtAuthGuard"]
    end

    subgraph External_Payment_Tier ["Nút Cổng thanh toán giả lập (Payment Gateway Node)"]
        MockGateway["🏦 Mock Payment Gateway Processor<br/>(E_WALLET: MoMo/VNPay/ZaloPay | BANK_CARD: Visa/NAPAS)<br/>Sinh mã chuẩn chiếu MOCK-xxxx & Mô phỏng kết quả"]
    end

    subgraph Data_Tier ["Private Database Network (Data Tier)"]
        Postgres[("🗄️ Container: brewlite-postgres<br/>(PostgreSQL 16 - Port 5432)<br/>Bảng: orders, payments (UNIQUE idempotencyKey), users")]
    end

    Browser -- "HTTPS (JSON + Bearer JWT)" --> FE_Node
    Browser -- "HTTPS POST /api/payments<br/>(Header: Idempotency-Key + Bearer JWT)" --> BE_Node
    FE_Node -- "Internal REST API" --> BE_Node
    BE_Node -- "HTTPS / TLS 1.3<br/>(Xử lý giao dịch & đối soát mã tham chiếu)" --> MockGateway
    BE_Node -- "TCP/IP (Prisma Transaction ACID)<br/>Row-level Conditional Update" --> Postgres
```

---

## 2. Đặc tả Use-Case Trọng tâm: Đặt & Thanh toán Đơn hàng

### 2.1. Thông tin chung
- **Mã Use-case:** `UC-04`
- **Tên Use-case:** Đặt và Thanh toán đơn hàng không tiền mặt (*Order & Cashless Payment*)
- **Tác nhân chính (Primary Actor):** Khách hàng đã đăng nhập (`CUSTOMER`).
- **Tác nhân phụ (Secondary Actor):** Cổng thanh toán giả lập (`Mock Payment Gateway`).
- **Mô tả ngắn gọn:** Khách hàng xác nhận giỏ hàng, chọn phương thức thanh toán không tiền mặt (Ví điện tử `E_WALLET` hoặc Thẻ ngân hàng `BANK_CARD`), thực hiện thanh toán an toàn với cơ chế chống trừ tiền trùng lặp (`Idempotency-Key`) và nhận biên lai xác nhận đơn hàng kèm mã đơn (`#BL-xxxx`).

### 2.2. Tiền điều kiện (Pre-conditions)
1. Khách hàng đã đăng nhập thành công và có `access_token` (JWT) hợp lệ.
2. Giỏ hàng có ít nhất 01 sản phẩm đang hoạt động (`isActive = true`) và còn tồn kho (`stock > 0`), hoặc đơn hàng đang ở trạng thái `PENDING` / `PAYMENT_FAILED` (chờ thanh toán lại).

### 2.3. Hậu điều kiện (Post-conditions)
- **Khi thành công:**
  1. Một bản ghi `Payment` mới được lưu với `status = SUCCESS`, `transactionRef = "MOCK-..."` và khóa `idempotencyKey` duy nhất (`@unique`).
  2. Trạng thái đơn hàng (`Order.status`) chuyển nguyên tử (atomic) sang `PAID`.
  3. Điểm thưởng của khách hàng (`User.loyaltyPoints`) được cộng thêm $\lfloor \text{total} / 10.000 \rfloor$ điểm.
  4. Giỏ hàng trên Frontend được làm trống và hiển thị màn hình xác nhận đơn hàng cùng mã đơn `#BL-xxxx`.
- **Khi thất bại:**
  1. Bản ghi `Payment` được ghi nhận với `status = FAILED`, `transactionRef = null`.
  2. Trạng thái đơn hàng chuyển sang `PAYMENT_FAILED`.
  3. Giỏ hàng và mã `orderId` được bảo lưu nguyên vẹn trên giao diện để khách hàng có thể bấm **"Thử lại"** với `Idempotency-Key` mới.

### 2.4. Luồng sự kiện chính (Basic Flow — Happy Path)
1. Tại màn hình Giỏ hàng hoặc Chi tiết món, Khách hàng bấm **"Thanh toán"** để mở `CheckoutModal`.
2. Hệ thống hiển thị danh sách món, tổng tiền tạm tính, hình thức phục vụ (*Uống tại quán* / *Mang đi*), ô nhập Số điện thoại nhận hàng và 2 nhóm phương thức thanh toán: **Ví điện tử (`E_WALLET`)** và **Thẻ thanh toán (`BANK_CARD`)**.
3. Khách hàng chọn phương thức thanh toán mong muốn và bấm **"Xác nhận thanh toán"**.
4. Frontend gọi `POST /orders` (kèm `Authorization: Bearer <token>`) để khởi tạo đơn hàng ở trạng thái `PENDING` (nếu đơn chưa được tạo).
5. Frontend sinh khóa `Idempotency-Key` duy nhất và gửi yêu cầu `POST /payments` kèm thông tin `orderId`, `method`, `amount`.
6. Backend (`PaymentsService`) kiểm tra tính hợp lệ của `Idempotency-Key`, xác minh quyền sở hữu đơn hàng và kiểm tra trạng thái đơn nằm trong `[PENDING, PAYMENT_FAILED]`.
7. Trong một giao dịch cơ sở dữ liệu (`prisma.$transaction`), Backend cập nhật trạng thái đơn sang `PAID`, tạo bản ghi `Payment` (`SUCCESS`) và cộng điểm `loyaltyPoints` cho người dùng.
8. Frontend nhận phản hồi `201 Created`, xóa giỏ hàng và mở màn hình **Xác nhận đơn hàng** (`OrderSuccessModal` / `/order-confirmation`) hiển thị mã đơn hàng (`#BL-xxxx`), mã giao dịch (`MOCK-...`) và trạng thái `PAID`.

### 2.5. Luồng rẽ nhánh & Ngoại lệ (Alternative & Exception Flows)
- **E1 — Người dùng bấm nút Thanh toán liên tiếp nhiều lần hoặc mạng gửi lặp request (Idempotent Replay):**
  - Tại bước 6, `PaymentsService` phát hiện `idempotencyKey` đã tồn tại trong bảng `payments` và trùng `orderId`.
  - Hệ thống **không thực hiện trừ tiền lần 2**, không cộng điểm thưởng lần 2, mà trả về ngay bản ghi giao dịch ban đầu kèm cờ `idempotentReplay: true`.
- **E2 — Cổng thanh toán từ chối giao dịch (`simulateFailure = true`):**
  - Tại bước 7, cổng thanh toán trả về kết quả lỗi.
  - Hệ thống cập nhật `Order.status = PAYMENT_FAILED`, lưu `Payment.status = FAILED` và trả về thông báo lỗi.
  - Frontend hiển thị cảnh báo lỗi trên `CheckoutModal`, giữ nguyên giỏ hàng và `pendingOrderId` để khách hàng chọn lại phương thức khác và thanh toán lại.
- **E3 — Đơn hàng đã thanh toán (`PAID`) hoặc đã hủy (`CANCELLED`):**
  - Tại bước 6, nếu đơn hàng không ở trạng thái `PENDING` hoặc `PAYMENT_FAILED`, hệ thống chặn chuyển trạng thái và trả về lỗi `400 Bad Request ("Invalid order state transition")`.
