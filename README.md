# Smart Money Student

Smart Money Student | AI Student Expense Tracker เป็นเว็บแอปบันทึกรายรับรายจ่ายสำหรับนักเรียน ใช้ HTML5, CSS3 และ Vanilla JavaScript เท่านั้น ไม่มี Backend และพร้อม Deploy บน GitHub Pages

## Features

- AI Keyword Classification ภาษาไทยและอังกฤษ
- บันทึกรายรับรายจ่ายจากข้อความธรรมชาติ เช่น `กินข้าวกับเพื่อน 80`
- Dashboard รายรับ รายจ่าย ยอดคงเหลือ และจำนวนรายการ
- Search, Sort, Filter และ Edit แบบ Real-time
- Chart.js: Pie, Bar และ Line Chart
- Local Storage ข้อมูลไม่หายเมื่อ Refresh
- Export CSV, Excel, PDF และ Import CSV
- Dark Mode / Light Mode
- ตั้งงบประมาณรายเดือนและแจ้งเตือนเมื่อเกินงบ
- Responsive Design สำหรับ Desktop, Tablet และ Mobile
- PWA พร้อม Offline Mode และติดตั้งบน Android / iPhone

## วิธีใช้งาน

เปิดไฟล์ `index.html` ใน Browser ได้ทันที หรืออัปโหลดทั้งโฟลเดอร์ขึ้น GitHub Pages

## โครงสร้าง

```text
Smart-Money-Student/
├── index.html
├── style.css
├── script.js
├── manifest.json
├── service-worker.js
├── assets/
│   ├── icons/
│   │   ├── favicon.ico
│   │   ├── icon-192.png
│   │   └── icon-512.png
│   └── images/
└── README.md
```

## PWA

เมื่อ Deploy ผ่าน HTTPS เช่น GitHub Pages ผู้ใช้สามารถ Add to Home Screen ได้ และระบบจะใช้ไอคอนใน `assets/icons/` เป็นไอคอนหลักของแอป
