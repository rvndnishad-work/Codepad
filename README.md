<div align="center">
  <img src="./public/icon.svg" alt="Codepad Logo" width="120" height="120" />
  
  # Codepad 🚀
  
  **A blazing fast, browser-based JavaScript/TypeScript playground built with modern web technologies.**
  
  <p align="center">
    <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js" alt="Next.js" /></a>
    <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react" alt="React" /></a>
    <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.7-blue?style=for-the-badge&logo=typescript" alt="TypeScript" /></a>
    <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind CSS" /></a>
    <a href="https://www.prisma.io/"><img src="https://img.shields.io/badge/Prisma-5.22-2D3748?style=for-the-badge&logo=prisma" alt="Prisma" /></a>
  </p>
</div>

---

## 📸 Showcase

> **Note:** Add a high-resolution screenshot or GIF of your application UI here. Place the image in the `public` folder and link it below.

<div align="center">
  <img src="https://via.placeholder.com/1000x600/1e1e1e/ffffff?text=Add+App+Screenshot+Here" alt="Codepad User Interface" style="border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.2);" />
</div>

---

## ✨ Features

- **⚡ Client-Side Execution:** Zero server execution cost. All code is bundled and run directly in the browser using **Sandpack**.
- **🛡️ Strong Isolation:** User code is executed inside a heavily sandboxed `<iframe>` (`allow-scripts`), ensuring complete security from the parent application.
- **🎨 Professional Editor:** Integrated **Monaco Editor** (the engine behind VS Code) for a familiar, powerful coding experience.
- **🔐 Authentication:** Secure login via GitHub OAuth utilizing **Auth.js (NextAuth v5)**.
- **💾 Persistence:** Save, load, and manage snippets seamlessly with a **Prisma + SQLite** backend (easily swappable to PostgreSQL).
- **🚀 Modern UI/UX:** Responsive, sleek, and dark-mode optimized design crafted with **Tailwind CSS**.

---

## 🛠️ Tech Stack Architecture

Codepad is architected to be highly performant and secure, relying on a monolithic Next.js pattern where the heavy lifting of code compilation is offloaded to the client.

| Category | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | **Next.js 15 (App Router)** | Full-stack routing, API endpoints, and SSR. |
| **Frontend** | **React 19 & Tailwind CSS** | Component architecture and responsive styling. |
| **Execution** | **Sandpack (`@codesandbox`)** | In-browser bundling and secure iframe execution. |
| **Editor** | **Monaco Editor** | Syntax highlighting, code formatting, and editor feel. |
| **Database** | **Prisma ORM + SQLite** | Relational data management for users and snippets. |
| **Auth** | **Auth.js v5** | Session management and GitHub OAuth integration. |

---

## 🚀 Getting Started

Follow these steps to run Codepad locally on your machine.

### 1. Clone the repository
```bash
git clone https://github.com/rvndnishad-work/Codepad.git
cd Codepad
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
Copy the example environment file and fill in your details:
```bash
cp .env.example .env
```
*(Optional)* To enable saving snippets, you will need to set up a GitHub OAuth app and provide `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET`. Generate an `AUTH_SECRET` using `openssl rand -base64 32`.

### 4. Initialize the Database
Push the Prisma schema to your local SQLite database:
```bash
npm run db:push
```

### 5. Start the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to start coding!

---

## 🔮 Future Roadmap

- [ ] **Public Snippet Sharing:** Allow users to explore and discover public snippets.
- [ ] **Forking:** Duplicate and build upon snippets created by others.
- [ ] **Embed Mode:** Generate `<iframe>` code to embed snippets in blogs or documentation (`/embed/[slug]`).
- [ ] **Advanced Intellisense:** Auto-type acquisition (ATA) for npm packages within the Monaco editor.

---

<div align="center">
  <i>Built with ❤️ by <a href="https://github.com/rvndnishad-work">rvndnishad-work</a></i>
</div>
