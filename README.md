<div align="center">
  <h1>🦎 Gecko RMS</h1>
  <p><b>The Next-Generation Restaurant Management OS</b></p>
  <p>Speed is a superpower. Streamline your entire restaurant operation from table-side KOT to executive analytics with our 120fps hardware-accelerated web app.</p>

  <p>
    <a href="https://rms.geckoworksnepal.com.np/"><img src="https://img.shields.io/badge/Live_Demo-Geckorms.com-10B981?style=for-the-badge" alt="Live View" /></a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/Next.js_14-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
    <img src="https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind" />
    <img src="https://img.shields.io/badge/Framer_Motion-0055FF?style=for-the-badge&logo=framer&logoColor=white" alt="Framer Motion" />
    <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  </p>
</div>

---

## 📑 Table of Contents
- [About The Project](#-about-the-project)
- [The Quad-OS Ecosystem](#-the-quad-os-ecosystem)
- [Key Features](#-key-features)
- [System Architecture](#️-system-architecture)
- [Getting Started](#-getting-started)
- [Deployment](#-deployment)

---

## 📖 About The Project

Managing a high-volume restaurant requires a system that refuses to lag. **Gecko RMS** is a comprehensive, real-time operating system built to handle the chaos of the hospitality industry in Nepal. 

**One OS. Every Role.** What the waiter enters, the kitchen sees instantly, and the owner tracks globally. 

---

## 🔥 The Quad-OS Ecosystem

### 👑 1. Executive Admin Dashboard
*Your real-time financial command center. Track daily revenue, live transactions, table occupancy, and top-moving items like "Chicken Momo" and "Mojito" with zero lag.*
<br>
<img src="./public/sc1.jpg" alt="Gecko RMS Admin Dashboard" width="100%" />

<br>

### ⚡ 2. POS & Menu Engine
*Lightning-fast, intuitive checkout. Easily search dishes, filter by "Chef Specials" or "Bar", manage table billing, and process orders instantly.*
<br>
<img src="./public/sc2.jpg" alt="Gecko RMS POS Interface" width="100%" />

<br>

### 🧑‍🍳 3. Kitchen Display System (KitchenOS)
*Paperless Kitchen Order Tickets (KOT). Instantly receive new orders, move items to the "Cooking" queue, and mark plates as "Ready" to ping the waitstaff.*
<br>
<img src="./public/sc3.jpg" alt="Gecko Kitchen Display System" width="100%" />

<br>

### 🏃‍♂️ 4. Waiter Hub & Interactive Floor Plan
*Fully responsive table-side management. Waitstaff can view their total sales, check vacant/occupied tables, and drag-and-drop tables on the Live Floor Map.*
<br>
<img src="./public/sc4.jpg" alt="Gecko Waiter Hub" width="100%" />

<br>

### 📱 5. Instant QR Menus & Mobile Ordering
*Generate unique QR codes for every table. Customers scan to view your live mobile menu, updated instantly without reprints.*
<br>
<img src="./public/sc5.jpg" alt="Gecko QR Mobile Menu" width="100%" />

---

## ✨ Key Features

* ⚡ **Instant Sync Engine:** Changes propagate across all devices (Admin, POS, Kitchen) in under 200ms. No refreshing required.
* 📶 **Offline Mode:** Internet down? No problem. Gecko keeps working locally and syncs payloads when back online.
* 🛑 **Disabled Menus Protection:** Real-time inventory alerts prevent staff from ordering items that just went out of stock.
* 🎨 **120fps UI Physics:** Built with Framer Motion for ultra-smooth, native-app-like interactions (Magnetic buttons, drag-to-pan floor maps).
* 🖨️ **Smart Billing:** Auto-calculate taxes, apply dynamic discounts, and generate thermal-printer-ready receipts.

---

## 🏗️ System Architecture

Gecko RMS relies on a modern, highly scalable tech stack:

* **Frontend:** Next.js (App Router), React 19, Tailwind CSS, Lucide Icons.
* **Animation:** Framer Motion (Hardware-accelerated transforms).
* **Backend & Auth:** Node.js, Next.js Server Actions, Supabase (PostgreSQL).
* **Infrastructure:** Self-Hosted Ubuntu VPS, CloudPanel, Nginx Reverse Proxy.

---

## 🚀 Getting Started

To get a local development environment up and running, follow these steps.

### Prerequisites
* Node.js (v20.x or higher recommended)
* Git

### Installation

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/Nischal456/gecko-rms.git](https://github.com/Nischal456/gecko-rms.git)