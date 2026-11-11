# TASK 2: Khởi tạo Prisma PostgreSQL, Seed Dữ liệu & API Menu Sản phẩm (`GET /products`)

**Người thực hiện:** Nguyễn Hữu Chí Công (Thành viên 4 — Phụ trách Backend Task 2)  
**Phạm vi:** Thiết kế `schema.prisma` kết nối PostgreSQL, xây dựng kịch bản nạp dữ liệu mẫu `prisma/seed.ts` (6 món đồ uống, 15 loại topping, 3 tài khoản RBAC, mã giảm giá), và triển khai các API `GET /products`, `GET /products/toppings`, `GET /products/:id`.

---

## 1. Bộ 5 Sơ đồ UML (Use Case, Activity, Sequence, Class, Deployment)

### 1.1. Use Case Diagram — Xem danh sách sản phẩm, Tìm kiếm & Xem chi tiết món kèm Topping

```mermaid
flowchart LR
    Visitor(["👤 Khách hàng / Khách vãng lai"])
    AdminSeed(["⚙️ Hệ thống Khởi tạo (Prisma Seed)"])

    subgraph BrewLite_Catalog_System ["Hệ thống BrewLite — Phân hệ Danh mục Sản phẩm & Menu (Task 2)"]
        UC1(["UC2.1: Xem danh sách thực đơn đồ uống đang bán (GET /products)"])
        UC2(["UC2.2: Tìm kiếm sản phẩm theo từ khóa tên/mô tả (?search=...)"])
        UC3(["UC2.3: Lọc sản phẩm theo nhóm danh mục (Cà phê / Trà / Cold Brew / Matcha)"])
        UC4(["UC2.4: Xem chi tiết 1 sản phẩm & Danh sách Topping khả dụng (GET /products/:id)"])
        UC5(["UC2.5: Chuẩn hóa giá tiền Decimal sang Number cho Frontend"])
        UC6(["UC2.6: Đồng bộ Schema & Nạp dữ liệu mẫu ban đầu (prisma db push & seed)"])
    end

    Visitor --> UC1
    Visitor --> UC2
    Visitor --> UC3
    Visitor --> UC4
    AdminSeed --> UC6

    UC1 -.->|"<<include>>"| UC5
    UC2 -.->|"<<extend>>"| UC1
    UC3 -.->|"<<extend>>"| UC1
    UC4 -.->|"<<include>>"| UC5
```

---

### 1.2. Activity Diagram — Luồng truy vấn Menu sản phẩm, lọc danh mục và xem chi tiết món

```mermaid
flowchart TD
    Start(["Bắt đầu: Người dùng truy cập Trang chủ BrewLite"]) --> RequestMenu["Frontend gọi API GET /products (kèm query ?search nếu có)"]
    RequestMenu --> QueryDB["ProductsService truy vấn Prisma: prisma.product.findMany({ where: { isActive: true } })"]
    QueryDB --> HasSearch{"Có tham số ?search?"}
    HasSearch -- "Có" --> FilterKeyword["Lọc không phân biệt hoa thường (mode: 'insensitive') trên cột name và description"]
    HasSearch -- "Không" --> OrderAsc["Sắp xếp theo thời gian tạo tăng dần (orderBy: { createdAt: 'asc' })"]
    FilterKeyword --> OrderAsc

    OrderAsc --> NormalizePrice["Chuẩn hóa dữ liệu: Ép kiểu Number(product.price) và suy luận nhóm danh mục (inferCategory)"]
    NormalizePrice --> RenderGrid["Frontend hiển thị lưới 6 món đồ uống & Thanh lọc danh mục"]

    RenderGrid --> ClickItem["Người dùng bấm chọn 1 món đồ uống"]
    ClickItem --> RequestDetail["Gọi API GET /products/:id"]
    RequestDetail --> CheckExist{"Tìm thấy Product và isActive == true?"}
    CheckExist -- "Không tìm thấy hoặc ngừng bán" --> Return404["Trả lỗi 404 NotFoundException"]
    CheckExist -- "Hợp lệ" --> FetchToppings["Truy vấn danh sách Topping đang mở bán (isAvailable: true, sắp xếp theo giá tăng dần)"]
    FetchToppings --> ReturnDetail["Trả về JSON chi tiết sản phẩm + danh sách Toppings (giá dạng Number)"]
    ReturnDetail --> OpenModal["Mở ProductModal: Chọn Size (S/M/L), chọn Topping & tự động cộng giá theo thời gian thực"]
    Return404 --> EndFlow(["Kết thúc"])
    OpenModal --> EndFlow
```

---

### 1.3. Sequence Diagram — Luồng gọi API lấy danh sách Menu (`GET /products`) và Chi tiết sản phẩm (`GET /products/:id`)

```mermaid
sequenceDiagram
    autonumber
    actor User as Khách hàng
    participant FE as Next.js Frontend<br/>(page.tsx / ProductModal.tsx)
    participant Ctrl as ProductsController
    participant Svc as ProductsService
    participant Prisma as PrismaService
    participant DB as PostgreSQL Database

    Note over User,DB: Luồng 1: Lấy danh sách thực đơn (GET /products)
    User->>FE: Mở trang chủ thực đơn (hoặc nhập từ khóa tìm kiếm)
    FE->>Ctrl: GET /products?search=...
    Ctrl->>Svc: findAll(search)
    Svc->>Prisma: product.findMany({ where: { isActive: true, OR: [...] }, orderBy: { createdAt: 'asc' } })
    Prisma->>DB: SELECT * FROM products WHERE is_active = true ORDER BY created_at ASC
    DB-->>Prisma: Danh sách bản ghi Product (price kiểu Decimal)
    Prisma-->>Svc: Product[]
    Svc->>Svc: Map từng món: price = Number(product.price), gán category
    Svc-->>Ctrl: Danh sách Product đã chuẩn hóa JSON
    Ctrl-->>FE: 200 OK (Product[])
    FE-->>User: Hiển thị lưới sản phẩm & hình ảnh offline

    Note over User,DB: Luồng 2: Xem chi tiết 1 sản phẩm kèm Topping (GET /products/:id)
    User->>FE: Bấm vào thẻ sản phẩm để chọn Size & Topping
    FE->>Ctrl: GET /products/:id
    Ctrl->>Svc: findOne(id)
    Svc->>Prisma: product.findUnique({ where: { id } })
    Prisma->>DB: SELECT * FROM products WHERE id = $1
    DB-->>Prisma: Product | null
    alt Không tìm thấy hoặc product.isActive == false
        Svc-->>Ctrl: 404 NotFoundException
        Ctrl-->>FE: 404 Not Found
    else Sản phẩm hợp lệ
        Svc->>Prisma: topping.findMany({ where: { isAvailable: true }, orderBy: { price: 'asc' } })
        Prisma->>DB: SELECT * FROM toppings WHERE is_available = true ORDER BY price ASC
        DB-->>Prisma: Topping[]
        Svc->>Svc: Chuẩn hóa Number(product.price) & Number(topping.price)
        Svc-->>Ctrl: { ...product, price, category, toppings }
        Ctrl-->>FE: 200 OK
        FE-->>User: Hiển thị ProductModal với tùy chọn Size S/M/L & Topping
    end
```

---

### 1.4. Class Diagram — Lớp `Product`, `Topping`, `ProductSize`, `PrismaService` và `ProductsService`

```mermaid
classDiagram
    class ProductSize {
        <<enumeration>>
        S
        M
        L
    }

    class Product {
        +String id
        +String name
        +String? description
        +Decimal price
        +String imageUrl
        +Int stock
        +Int version
        +Boolean isActive
        +DateTime createdAt
        +DateTime updatedAt
    }

    class Topping {
        +String id
        +String name
        +Decimal price
        +Boolean isAvailable
    }

    class PrismaService {
        +$connect()
        +$disconnect()
        +onModuleInit()
        +onModuleDestroy()
    }

    class ProductsController {
        -ProductsService productsService
        +findAll(search?: String)
        +findAllToppings()
        +findOne(id: String)
    }

    class ProductsService {
        -PrismaService prisma
        +findAll(search?: String)
        +findAllToppings()
        +findOne(id: String)
        -inferCategory(name: String, description?: String) String
    }

    ProductsController --> ProductsService : delegates
    ProductsService --> PrismaService : queries
    PrismaService --> Product : maps table "products"
    PrismaService --> Topping : maps table "toppings"
    Product ..> ProductSize : configured with S/M/L
```

---

### 1.5. Deployment Diagram — Cấu trúc lưu trữ dữ liệu sản phẩm trong PostgreSQL, Prisma ORM & Next.js/NestJS

```mermaid
flowchart LR
    subgraph Client_Device ["Thiết bị Người dùng"]
        Browser["🌐 Web Browser<br/>Hiển thị Menu & Hình ảnh cục bộ (/images/*.jpg)"]
    end

    subgraph Frontend_Node ["Nút Web Frontend (Next.js 14)"]
        NextApp["📦 Next.js Server / Static Assets<br/>- /public/images/ (6 ảnh đồ uống offline)<br/>- Trang chủ Menu & ProductModal"]
    end

    subgraph Backend_Node ["Nút API Server (NestJS)"]
        NestApp["⚙️ NestJS Container (Port 4000)<br/>- ProductsController (/products, /products/:id)<br/>- ProductsService (Decimal -> Number)<br/>- PrismaService (@Global)"]
    end

    subgraph Database_Node ["Nút Database Server (PostgreSQL 16)"]
        PG[("🗄️ PostgreSQL Database (brewlite)<br/>- Bảng products (UUID, price Decimal(10,2), stock, version)<br/>- Bảng toppings (UUID, price Decimal(10,2), isAvailable)<br/>- Seed script: prisma/seed.ts")]
    end

    Browser -- "HTTP GET / (Trang Menu & Ảnh)" --> NextApp
    Browser -- "HTTP GET /products & /products/:id" --> NestApp
    NextApp -- "Fetch REST API" --> NestApp
    NestApp -- "Prisma Client Connection Pool (Port 5432)" --> PG
```

---

## 2. Đặc tả Kỹ thuật SRS — Khởi tạo Prisma, Seed Data & API Sản phẩm

### 2.1. Thiết kế Cơ sở dữ liệu (`backend/prisma/schema.prisma`)
- **Bảng `products` (`model Product`):**
  - `id` (`String @id @default(uuid())`): Khóa chính UUID chống đoán nhận dạng tuần tự.
  - `name` (`String`), `description` (`String?`), `imageUrl` (`String`).
  - `price` (`Decimal @db.Decimal(10, 2)`): Lưu trữ chính xác đơn giá tiền tệ, tránh sai số dấu phẩy động.
  - `stock` (`Int @default(0)`) & `version` (`Int @default(0)`): Hỗ trợ kiểm soát tồn kho và khóa lạc quan (*Optimistic Locking*).
  - `isActive` (`Boolean @default(true)`): Cho phép ẩn món tạm ngưng phục vụ mà không làm mất lịch sử đơn hàng cũ (`OrderItem`).
- **Bảng `toppings` (`model Topping`):**
  - `id` (`UUID`), `name` (`String`), `price` (`Decimal(10,2)`), `isAvailable` (`Boolean @default(true)`).

### 2.2. Kịch bản Nạp dữ liệu mẫu (`backend/prisma/seed.ts`)
- Sử dụng cơ chế `upsert` theo UUID cố định để có thể chạy lại nhiều lần (*idempotent seeding*) mà không gây trùng lặp dữ liệu:
  1. **6 đồ uống chuẩn:** *Cà phê sữa đá* (29.000đ), *Americano* (35.000đ), *Cappuccino* (45.000đ), *Trà đào cam sả* (42.000đ), *Cold Brew* (45.000đ), *Matcha Latte* (49.000đ).
  2. **15 loại topping** phân theo nhóm Cà phê, Trà trái cây và Matcha (giá từ 5.000đ – 10.000đ).
  3. **3 tài khoản kiểm thử RBAC** (`customer@brewlite.com`, `barista@brewlite.com`, `admin@brewlite.com` với mật khẩu `123456` đã băm bằng `bcrypt`).
  4. **2 mã khuyến mãi mẫu** (`CHAOBANMOI` giảm 10%, `GIAM15K` giảm 15.000đ) và **3 đơn hàng lịch sử mẫu** (`#BL-1042`, `#BL-1038`, `#BL-1025`).

### 2.3. Đặc tả Endpoint API Sản phẩm
| Phương thức | Endpoint | Tham số | Phản hồi thành công | Xử lý ngoại lệ |
| :-: | :--- | :--- | :--- | :--- |
| `GET` | `/products` (hoặc `/api/products`) | `?search=<keyword>` (tùy chọn) | `200 OK`: Mảng JSON các sản phẩm có `isActive = true`, `price` kiểu `number`, kèm trường `category`. | Trả mảng rỗng `[]` nếu không có món khớp từ khóa. |
| `GET` | `/products/toppings` | Không có | `200 OK`: Mảng JSON các topping có `isAvailable = true`, sắp xếp theo giá tăng dần. | — |
| `GET` | `/products/:id` | `:id` (UUID sản phẩm) | `200 OK`: Chi tiết sản phẩm kèm mảng `toppings` khả dụng. | `404 Not Found` nếu `id` không tồn tại hoặc `isActive = false`. |
