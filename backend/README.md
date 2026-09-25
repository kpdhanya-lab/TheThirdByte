# Patient Portal Backend API

Built with **Node.js**, **Express**, and **Supabase**.

## 📌 Features
- **Hospital ID Enforcement**: Validates hospital credentials strictly against the `hospitals` table (`NH-560017`, `WV-560076`, `SH-560034` by default).
- **Dynamic Hospital Access**: Add, deactivate, or delete hospital IDs at any time to instantly govern which portals patients can access.
- **Patient Registration**: Enforces all required patient demographic data and prevents duplicate phone numbers.
- **Strict Login Gatekeeping**: Restricts portal login strictly to registered phone numbers and active hospital IDs.
- **SMS & OTP Verification**: Integrated OTP issuance and verification for patient authentication sessions.

---

## 🚀 Setup & Execution

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (`.env`)
```ini
PORT=5000
SUPABASE_URL=https://rjpigsvmxyvpjcbkxidt.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
# Optional: To allow the API to dynamically INSERT/DELETE hospitals directly:
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
NODE_ENV=development
```

### 3. Run Backend Server
```bash
npm start
```
Server runs at `http://localhost:5000`.

### 4. Run Automated Test Suite
```bash
npm test
```

---

## 📡 API Reference

### Hospital Endpoints
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/hospitals` | List all active hospitals for registration/login selectors. |
| `POST` | `/api/auth/validate-hospital` | Validate an entered Hospital ID (`{ hospitalCode }`). |
| `POST` | `/api/hospitals` | Add a new Hospital ID (`{ hospitalCode, name, isActive }`). |
| `DELETE` | `/api/hospitals/:code` | Delete a Hospital ID. |
| `PUT` | `/api/hospitals/:code` | Toggle active status or update name. |

### Patient Auth Endpoints
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a new patient with all demographics + Hospital ID. |
| `GET` | `/api/auth/check-phone?phoneNumber=+91...` | Check if phone number is registered. |
| `POST` | `/api/auth/login-request-otp` | Validate Hospital ID & Phone Number, then issue OTP. |
| `POST` | `/api/auth/login-verify-otp` | Verify OTP and return authenticated patient profile. |
| `GET` | `/api/auth/profile?phoneNumber=+91...` | Retrieve patient record. |
