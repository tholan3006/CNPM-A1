# TASK 7 (VÀ THÀNH VIÊN 5): Màn hình & Luồng "Đăng nhập & Đăng ký (JWT)"

**Người thực hiện:** Nguyễn Hữu Chí Công (Thành viên 4 — Phụ trách Backend Task 7 & Form Đăng nhập/Đăng ký Frontend)  
**Phạm vi:** API Đăng ký (`POST /auth/register`), Đăng nhập (`POST /auth/login`), Hồ sơ cá nhân (`GET /auth/me`), băm mật khẩu một chiều bằng `bcrypt`, cấp phát và xác thực `JWT Token`, `JwtAuthGuard` bảo vệ các route đặt đơn (`POST /orders`) & thanh toán (`POST /payments`), và giao diện `AuthModal.tsx`.

---

## 1. Bộ 5 Sơ đồ UML (Use Case, Activity, Sequence, Class, Deployment)

### 1.1. Use Case Diagram — Đăng ký, Đăng nhập & Quản lý tài khoản

```mermaid
flowchart LR
    Guest(["👤 Khách vãng lai (Chưa đăng nhập)"])
    Member(["🔐 Người dùng đã xác thực (Customer / Barista / Admin)"])

    subgraph BrewLite_Auth_System ["Hệ thống BrewLite — Phân hệ Xác thực & Phân quyền (Auth JWT)"]
        UC1(["UC7.1: Đăng ký tài khoản mới (POST /auth/register)"])
        UC2(["UC7.2: Băm mật khẩu an toàn với Bcrypt (Salt rounds = 10)"])
        UC3(["UC7.3: Đăng nhập hệ thống (POST /auth/login)"])
        UC4(["UC7.4: Cấp phát & Lưu trữ JWT Access Token"])
        UC5(["UC7.5: Xem thông tin tài khoản & Điểm tích lũy (GET /auth/me)"])
        UC6(["UC7.6: Bảo vệ Route Đặt đơn (POST /orders) & Thanh toán (POST /payments) bằng JwtAuthGuard"])
        UC7(["UC7.7: Đăng xuất & Xóa phiên làm việc cục bộ"])
    end

    Guest --> UC1
    Guest --> UC3
    Member --> UC5
    Member --> UC6
    Member --> UC7

    UC1 -.->|"<<include>>"| UC2
    UC1 -.->|"<<include>>"| UC4
    UC3 -.->|"<<include>>"| UC4
```

---

### 1.2. Activity Diagram — Luồng nhập thông tin tài khoản, xác thực mật khẩu & lưu JWT Token

```mermaid
flowchart TD
    Start(["Bắt đầu: Người dùng mở AuthModal trên thanh Navbar"]) --> ChooseTab{"Chọn Tab: Đăng nhập hay Đăng ký?"}

    ChooseTab -- "Đăng ký mới" --> InputReg["Nhập Họ tên, Số điện thoại (đúng 10 chữ số), Email, Mật khẩu (>= 6 ký tự)"]
    InputReg --> ValidatePhone{"SĐT đủ 10 chữ số & Email hợp lệ?"}
    ValidatePhone -- "Không hợp lệ" --> ShowClientErr["Hiển thị cảnh báo lỗi trực tiếp dưới ô nhập liệu"]
    ShowClientErr --> InputReg

    ValidatePhone -- "Hợp lệ" --> CallRegister["Gửi POST /auth/register"]
    CallRegister --> CheckDupEmail{"Email đã tồn tại trong DB?"}
    CheckDupEmail -- "Đã tồn tại" --> Return409["Trả lỗi 409 Conflict ('Email is already registered')"]
    Return409 --> ShowServerErr["Hiển thị thông báo lỗi trên AuthModal"]

    CheckDupEmail -- "Chưa tồn tại" --> HashPass["Băm mật khẩu bằng bcrypt.hash(password, 10)"]
    HashPass --> SaveUser["Lưu User mới vào bảng users (role = CUSTOMER, loyaltyPoints = 0)"]
    SaveUser --> SignJWT["Ký JWT Token (payload: sub, email, role; expiresIn: 7d)"]

    ChooseTab -- "Đăng nhập" --> InputLogin["Nhập Email và Mật khẩu"]
    InputLogin --> CallLogin["Gửi POST /auth/login"]
    CallLogin --> FindUser{"Tìm thấy User theo Email?"}
    FindUser -- "Không tìm thấy" --> Return401["Trả lỗi 401 Unauthorized ('Invalid email or password')"]
    FindUser -- "Tìm thấy" --> CompareHash{"bcrypt.compare(password, passwordHash)?"}
    CompareHash -- "Sai mật khẩu" --> Return401
    Return401 --> ShowServerErr

    CompareHash -- "Đúng mật khẩu" --> SignJWT
    SignJWT --> SaveStore["Frontend lưu user & accessToken vào Zustand Persist (localStorage) qua setAuth()"]
    SaveStore --> CheckRole{"Role của User là BARISTA?"}
    CheckRole -- "Có" --> RedirectOrders["Tự động chuyển hướng sang màn hình Quản lý đơn (/orders)"]
    CheckRole -- "Không (CUSTOMER)" --> CloseModal["Đóng AuthModal, cập nhật Navbar & mở khóa tính năng Giỏ hàng / Đặt đơn"]
    RedirectOrders --> EndFlow(["Kết thúc"])
    CloseModal --> EndFlow
```

---

### 1.3. Sequence Diagram — Luồng gọi API xác thực (`POST /auth/register`, `POST /auth/login`) và Guard bảo vệ `POST /orders`

```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng
    participant Modal as Next.js AuthModal & cartStore
    participant AuthCtrl as AuthController
    participant AuthSvc as AuthService
    participant Guard as JwtAuthGuard / JwtStrategy
    participant OrderCtrl as OrdersController
    participant DB as PostgreSQL (Prisma ORM)

    Note over User,DB: Luồng 1: Đăng ký tài khoản mới (POST /auth/register)
    User->>Modal: Nhập Họ tên, SĐT (10 số), Email, Mật khẩu & Bấm "Tạo tài khoản"
    Modal->>AuthCtrl: POST /auth/register { email, password, fullName, phone }
    AuthCtrl->>AuthSvc: register(dto)
    AuthSvc->>DB: prisma.user.findUnique({ where: { email } })
    alt Email đã tồn tại
        DB-->>AuthSvc: existingUser
        AuthSvc-->>Modal: 409 ConflictException
    else Email hợp lệ
        AuthSvc->>AuthSvc: passwordHash = await bcrypt.hash(dto.password, 10)
        AuthSvc->>DB: prisma.user.create({ email, passwordHash, fullName, phone })
        DB-->>AuthSvc: user
        AuthSvc->>AuthSvc: jwtService.signAsync({ sub: user.id, email, role })
        AuthSvc-->>AuthCtrl: { access_token, user (đã ẩn passwordHash) }
        AuthCtrl-->>Modal: 201 Created
        Modal->>Modal: setAuth(user, access_token)
    end

    Note over User,DB: Luồng 2: Đăng nhập (POST /auth/login)
    User->>Modal: Nhập Email, Mật khẩu & Bấm "Đăng nhập"
    Modal->>AuthCtrl: POST /auth/login { email, password }
    AuthCtrl->>AuthSvc: login(dto)
    AuthSvc->>DB: prisma.user.findUnique({ where: { email } })
    DB-->>AuthSvc: user
    AuthSvc->>AuthSvc: bcrypt.compare(dto.password, user.passwordHash)
    alt Mật khẩu không khớp
        AuthSvc-->>Modal: 401 UnauthorizedException
    else Mật khẩu hợp lệ
        AuthSvc->>AuthSvc: jwtService.signAsync({ sub: user.id, email, role })
        AuthSvc-->>Modal: 200 OK { access_token, user }
        Modal->>Modal: setAuth(user, access_token)
    end

    Note over User,DB: Luồng 3: JwtAuthGuard bảo vệ Route Đặt đơn (POST /orders)
    User->>Modal: Bấm Đặt đơn hàng từ Giỏ hàng
    Modal->>Guard: POST /orders (Header: Authorization: Bearer <access_token>)
    Guard->>Guard: Xác thực chữ ký JWT bằng JWT_SECRET & giải mã payload
    alt Thiếu Token hoặc Token hết hạn/giả mạo
        Guard-->>Modal: 401 Unauthorized
    else Token hợp lệ
        Guard->>OrderCtrl: Gắn req.user = { id, sub, email, role } -> create(req, dto)
        OrderCtrl->>DB: Tạo đơn hàng gắn với userId từ JWT
        DB-->>OrderCtrl: Order (PENDING)
        OrderCtrl-->>Modal: 201 Created
    end
```

---

### 1.4. Class Diagram — Lớp `User`, `Role`, `AuthTokenPayload`, `AuthService`, `JwtStrategy` và `JwtAuthGuard`

```mermaid
classDiagram
    class Role {
        <<enumeration>>
        CUSTOMER
        BARISTA
        ADMIN
    }

    class User {
        +String id
        +String email
        +String passwordHash
        +String? fullName
        +String? phone
        +Role role
        +Int loyaltyPoints
        +DateTime createdAt
        +DateTime updatedAt
    }

    class AuthTokenPayload {
        +String sub
        +String email
        +Role role
        +Int iat
        +Int exp
    }

    class RegisterDto {
        +String email
        +String password
        +String? fullName
        +String? phone
    }

    class LoginDto {
        +String email
        +String password
    }

    class AuthController {
        -AuthService authService
        +register(dto: RegisterDto)
        +login(dto: LoginDto)
        +getProfile(user: AuthTokenPayload)
    }

    class AuthService {
        -PrismaService prisma
        -JwtService jwtService
        +register(dto: RegisterDto)
        +login(dto: LoginDto)
        +getProfile(userId: String)
    }

    class JwtStrategy {
        +validate(payload: AuthTokenPayload)
    }

    class JwtAuthGuard {
        +canActivate(context: ExecutionContext)
    }

    User --> Role : has role
    AuthController --> AuthService : calls
    AuthController ..> RegisterDto : validates
    AuthController ..> LoginDto : validates
    AuthService --> User : manages via Prisma
    AuthService ..> AuthTokenPayload : signs JWT
    JwtStrategy ..> AuthTokenPayload : verifies & extracts
    JwtAuthGuard --> JwtStrategy : invokes Passport-JWT
```

---

### 1.5. Deployment Diagram — Nút CI/CD Pipeline, Cấu hình SSL/HTTPS và Lưu trữ Environment Secrets / JWT Keys

```mermaid
flowchart LR
    subgraph Dev_CICD ["CI/CD Pipeline (GitHub Actions)"]
        GitRepo["🐙 GitHub Repository<br/>(Branch: main & Pull Requests)"]
        GHA["⚙️ GitHub Actions Runner<br/>(.github/workflows/ci.yml)<br/>Prisma Generate + Build + Jest Test"]
        Secrets[("🔑 Environment Secrets Vault<br/>- DATABASE_URL<br/>- JWT_SECRET<br/>- NODE_ENV=production")]
    end

    subgraph Cloud_Runtime ["Môi trường Triển khai (Docker / Cloud Runtime)"]
        Ingress["🔒 Reverse Proxy / SSL Termination<br/>(HTTPS / TLS 1.3)"]
        WebContainer["📦 Next.js Frontend Container<br/>(AuthModal + Zustand Storage)"]
        ApiContainer["🛡️ NestJS Backend Container<br/>(AuthModule + Passport JWT + Bcrypt)"]
        DBContainer[("🗄️ PostgreSQL Container (Private Network)<br/>Bảng users (email UNIQUE, passwordHash)")]
    end

    GitRepo -- "Push / Pull Request" --> GHA
    Secrets -. "Inject biến môi trường an toàn" .-> ApiContainer
    GHA -- "Triển khai sau khi vượt qua CI" --> Cloud_Runtime

    Ingress -- "HTTPS :3000" --> WebContainer
    Ingress -- "HTTPS :4000 (Bearer JWT)" --> ApiContainer
    ApiContainer -- "Internal TCP :5432" --> DBContainer
```

---

## 2. Đặc tả Yêu cầu Phi chức năng (Non-Functional Requirements — Bảo mật & Xác thực)

### 2.1. Mã hóa mật khẩu một chiều với `bcrypt` (NFR-SEC-01)
- **Yêu cầu:** Hệ thống tuyệt đối không lưu mật khẩu dạng văn bản thuần (plaintext) trong cơ sở dữ liệu hoặc tập tin log.
- **Thiết kế kỹ thuật:**
  - Sử dụng thuật toán `bcrypt` (`bcrypt.hash(dto.password, 10)`) với hệ số chi phí **Salt Rounds = 10** trước khi lưu vào cột `passwordHash` của bảng `users`.
  - Khi đăng nhập, sử dụng hàm so sánh chống tấn công thời gian `bcrypt.compare(dto.password, user.passwordHash)`.
  - Mọi phản hồi JSON từ `POST /auth/register`, `POST /auth/login` và `GET /auth/me` đều loại bỏ hoàn toàn trường `passwordHash`.

### 2.2. Xác thực phi trạng thái bằng JSON Web Token — JWT (NFR-SEC-02)
- **Yêu cầu:** Đảm bảo cơ chế xác thực không trạng thái (stateless), an toàn và hỗ trợ phân quyền theo vai trò (`CUSTOMER`, `BARISTA`, `ADMIN`).
- **Thiết kế kỹ thuật:**
  - Token được ký bằng thuật toán `HS256` thông qua `@nestjs/jwt` với khóa bí mật nạp từ biến môi trường `JWT_SECRET`, thời hạn hiệu lực `7d`.
  - Payload chuẩn của JWT gồm: `{ sub: user.id, email: user.email, role: user.role }`.
  - `JwtAuthGuard` (kế thừa `AuthGuard('jwt')`) được gắn trực tiếp lên các route nhạy cảm:
    - `GET /auth/me` (Xem thông tin tài khoản hiện tại).
    - `POST /orders` (Khởi tạo đơn hàng — chặn khách chưa đăng nhập đặt đơn).
    - `POST /payments` & `GET /payments/order/:orderId` (Thanh toán và tra cứu giao dịch).

### 2.3. Kiểm tra dữ liệu đầu vào ở cả hai phía (NFR-VAL-03)
- **Backend Validation (`class-validator`):**
  - `RegisterDto` & `LoginDto` kiểm tra `@IsEmail()`, `@MinLength(6)` cho mật khẩu; chuẩn hóa `email.trim().toLowerCase()` trước khi truy vấn DB.
- **Frontend Validation (`AuthModal.tsx`):**
  - Kiểm tra định dạng số điện thoại trực tiếp theo thời gian thực (`handlePhoneKeyDown`, `handlePhoneChange`): chặn nhập ký tự chữ, giới hạn đúng 10 chữ số và hiển thị thông báo tiếng Việt rõ ràng.
