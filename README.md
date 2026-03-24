# 🛢️ Lubempire ERP & Inventory Management System

A modern, full-stack Enterprise Resource Planning (ERP) and Inventory Management web application built specifically for **Lubempire**. This system streamlines the manufacturing and sales workflow by tracking raw materials, packaging components, finished products, and automated order processing.

---

## ✨ Key Features

- **🔐 Secure Authentication:** Supabase-powered login system with protected routes and middleware.
- **📦 Raw Material Tracking:** Manage bulk liquids/oils in Liters (Ltr) or Kilograms (KG).
- **🧴 Packaging Inventory:** Track dynamic stock for Containers (Bottles & Buckets), Caps, Boxes, and Stickers.
- **⚙️ Finished Products:** Define product recipes/grades and associate them with specific packaging configurations.
- **🛒 Automated Sales Orders:** Processing an order automatically calculates and deducts the exact amount of bulk oil, empty containers, caps, stickers, and master boxes from inventory.
- **📝 Manual Adjustments & Auditing:** Add or remove stock manually with required reason logs. Every stock movement (Purchases, Adjustments, Order Use) is tracked in transaction tables.
- **💼 Accounting Integration:** Automatically logs financial entries (Income/Receivables) upon order creation.
- **🎨 Modern UI/UX:** Features a beautiful, responsive glassmorphism design with real-time loading states and smooth transitions.

---

## 🛠️ Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) (App Router & Server Actions)
- **Language:** TypeScript
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Database & Auth:** [Supabase](https://supabase.com/) (PostgreSQL)
- **Deployment:** [Vercel](https://vercel.com)

---

## 📂 Project Structure

```text
├── app/
│   ├── (dashboard)/        # Protected routes (Materials, Orders, etc.)
│   ├── actions/            # Next.js Server Actions (Database mutations)
│   ├── login/              # Authentication page
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Entry point
├── components/
│   ├── materials/          # Material & Container specific components
│   ├── ui/                 # Reusable UI components (LoadingButton, Modals)
│   └── ...
├── lib/
│   └── supabase/           # Supabase client configurations (Server & Browser)
├── public/                 # Static assets (Logos, SVGs)
└── middleware.ts           # Route protection and session management

🚀 Getting Started
Prerequisites
Ensure you have the following installed:

Node.js (v18 or higher)

npm, yarn, or pnpm

A Supabase account and project.

1. Clone the repository
Bash
git clone [https://github.com/sarikascc/LubEmpireERP.git](https://github.com/sarikascc/LubEmpireERP.git)
cd LubEmpireERP

2. Install Dependencies
Bash
npm install

3. Environment Variables
Create a .env.local file in the root of your project and add your Supabase credentials:

Code snippet
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

4. Run the Development Server
Bash
npm run dev
Open http://localhost:3000 in your browser to see the application.

🗄️ Database Schema Overview
The application relies on a relational PostgreSQL database hosted on Supabase. Core tables include:

materials: Tracks raw materials, caps, boxes, and stickers.

containers: Tracks bottles and buckets, and links them to required caps, boxes, and stickers via foreign keys.

finished_products: Tracks bulk manufactured products.

orders: Logs customer sales orders.

accounting_entries: Tracks financial movements.

*_transactions: Multiple tables (material_transactions, container_transactions) that log every historical change to stock quantities.

🌐 Deployment
This project is optimized for deployment on Vercel.

Push your code to a GitHub repository.

Import the project into Vercel.

Add the NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to the Vercel Environment Variables.

Deploy!
```
