# WorkerFlow Suite

Create a fast, responsive, Excel-like Data Grid System (Data Table / Sheet UI) for a Recruitment Agency (شركة استقدام) to manage Workers, Sponsors, and Sponsorship Transfers.

### 1. Key System Architecture & Behavior (نظام الصلاحيات وشكل الجداول)

- **UI Style:** Excel-like interactive data table (Grid layout with direct cell editing / quick modal edit, sticky headers, quick search, and filtering).

- **Audit Tracking (تسجيل المستخدمين):**

  - Every row must automatically store and display `Created By` (المستخدم الذي أضاف) and `Last Modified By` (آخر من عدّل).

  - System automatically captures current user context upon insert/update.

- **Permissions & Field-Level Controls:**

  - **Regular User (الموظف):**

    - Can ADD new rows/records.

    - CANNOT DELETE any row (Delete button hidden/disabled).

    - Can EDIT ONLY specific allowed columns (e.g., Status, Payment Amounts, Notes, Transfer Details). Core fields (e.g., Passport Number, National ID) are read-only for regular users after creation.

  - **Admin (المدير):**

    - Full access: Can add, edit ALL columns, and DELETE rows with confirmation.

---

### 2. Simplified Data Schema (الجداول والبيانات)

#### A. Workers Grid (جدول العمالة)

Columns/Fields to display and manage:

- Worker Name (اسم العامل/العاملة)

- Passport Number (رقم الجواز - Unique)

- Nationality (الجنسية)

- Monthly Salary (الراتب الشهري)

- Arrival Date (تاريخ الوصول)

- Days Remaining to Arrival (الوقت المتبقي للوصول - Calculated field)

- Current Sponsor Name (اسم الكفيل الحالي)

- Current Sponsor Phone (رقم هاتف الكفيل الحالي)

- Transfer Status (حالة نقل الكفالة: "بدون نقل" / "قيد النقل" / "تم النقل")

- Created By (تم الإضافة بواسطة)

- Last Modified By (آخر تعديل بواسطة)

#### B. Transfer of Sponsorship / Transfer Operations Grid (جدول نقل الكفالة)

Triggered via a "Transfer Sponsorship" button or viewed in a dedicated Transfer Grid:

- Worker Name (اسم العاملة)

- Old Sponsor Name & Phone (الكفيل القديم - Auto-populated from Worker)

- New Sponsor Name (اسم الكفيل الجديد)

- New Sponsor Phone (رقم هاتف الكفيل الجديد)

- Visa Type (نوع التأشيرة)

- Transfer Date (تاريخ النقل)

- Old Sponsor Dues (مستحقات الكفيل القديم)

- Down Payment / Deposit (العربون)

- Remaining Amount (المتبقي - Auto-calculated)

- Payment Status (حالة الدفع: "تم الدفع بالكامل" / "متبقي مبلغ")

- Medical Examination (الفحص الطبي: "يوجد" / "لا يوجد")

- Residency Status (الإقامة: "توجد" / "لا توجد")

- Worker Salary Dues Status (مستحقات رواتب العاملة: "توجد" / "لا توجد")

- Transfer Notes (ملاحظات)

- Created By (تم الإضافة بواسطة)

- Last Modified By (آخر تعديل بواسطة)

---

### 3. Click-to-View Profiles (العرض التفصيلي عند الضغط)

1. **Clicking Worker Name (عند الضغط على اسم العاملة):**

   - Opens a modal showing all worker details, passport info, full history of Old vs New Sponsor, current transfer progress, payment status, and audit log (who added/edited).

2. **Clicking Sponsor Name (عند الضغط على اسم الكفيل):**

   - Opens a modal showing sponsor details (Name, Phone) and a list/table of all workers associated with this sponsor (past and present).

---

### 4. Excluded Features (تأكيد الاستبعادات)

Do NOT include:

- Returnee status (الرجيع)

- Warranty status (الضمان)

- Tasks & Follow-ups (المهام والمتابعات)

- Document Uploads/Attachments (المستندات)

---

### 5. Tech & UI Guidelines

- Clean Arabic RTL interface with clear table columns and quick search bar.

- Built with Tailwind CSS, Shadcn Data Tables / TanStack Table.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://manarat-sys.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/bef9364e-4b2d-42d2-8b7e-93b2f480a699).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
