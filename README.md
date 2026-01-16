# Emyn Reader

**Emyn Reader** is a modern, minimalist RSS feed reader web application inspired by the clean utility of the original Google Reader and Feedly. It aims to bring order to your information diet with a focus on typography, speed, and privacy.

![Emyn Reader](https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/google-news.png)

## 🤖 AI-Assisted Development

This project is a unique experiment in modern software engineering. It was built through a collaborative effort between a human developer and a suite of advanced AI models.

The architecture, logic, and UI were generated, refactored, and problem-solved using a combination of:

*   **Google Gemini 3**
*   **DeepSeek R1**
*   **Mistral Code**

These models were used in conjunction with **manual coding** and architectural oversight. This project serves as a testament to what can be achieved by leveraging LLMs for rapid application prototyping and complex logic generation.

## 🚧 Project Status: Needs Contributors!

**Emyn is currently in a Proof of Concept / Beta state.**

While the core reading experience works well, the project is unfinished. You may encounter bugs, unoptimized code patterns, or UI quirks.

**We are releasing this to the open-source community in the hope that developers with more expertise can adopt it, improve it, and help it reach its full potential.**

Whether you are a React expert, a UI designer, or just love RSS, your contributions are welcome!

## Features

*   **RSS/Atom Support:** Subscribe to any standard feed URL.
*   **Organization:** Group feeds into custom folders with drag-and-drop support.
*   **Reading Modes:** Toggle between List, Card, and Expanded views.
*   **Bookmarks:** Save articles for later with tagging support.
*   **Cloud Sync (Optional):** Built-in support for self-hosted sync via Supabase (requires your own credentials).
*   **Privacy First:** No tracking; data is stored locally in `localStorage` unless cloud sync is explicitly configured.
*   **Dark Mode:** Fully supported.
*   **Keyboard Shortcuts:** Navigate through articles efficiently (J/K navigation style support planned).

## Tech Stack

*   **Frontend:** React 19, TypeScript
*   **Build Tool:** Vite
*   **Styling:** Tailwind CSS
*   **Icons:** Lucide React
*   **Data Persistence:** LocalStorage & Supabase (Optional)

## Getting Started

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/emyn-reader.git
    cd emyn-reader
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    ```

4.  **Open in browser:**
    Navigate to `http://localhost:5173`

## Contributing

Please feel free to fork this repository and submit Pull Requests. Since much of this codebase was AI-generated, refactoring, code cleanup, and performance optimizations are highly appreciated!

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

---

**License:** MIT
