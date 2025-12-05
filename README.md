# 🕵️‍♂️ Dialogue Detective

**Dialogue Detective** is a browser extension that brings a "dialogue-aware" X-Ray experience to streaming platforms like **HBO Max** and **Amazon Prime Video**.

Instead of just showing who is on screen, it answers the question: *"Wait, who are they talking about?"* by identifying character names mentioned in the subtitles.


##  Key Features

* **Smart Detection:** Analyzes the last 15 seconds of subtitles to find character names instantly.
* **Multi-Platform:** Seamlessly integrates with **HBO Max** and **Amazon Prime Video**.
* **Instant Results:** Powered by a custom **Lookup Map** algorithm for zero-latency character matching.
* **Context Aware:** Intelligently filters out common words (e.g., "Man", "Lord") to prevent false positives.
* **Secure Architecture:** Uses **Cloudflare Workers** to proxy API requests, ensuring security and high performance via Edge Caching.
* **Affiliate Integration:** Helps users find movies and merchandise related to the characters they love.

##  Tech Stack & Architecture

This project is built with a focus on performance, security, and scalability using the **Adapter Design Pattern**.

* **Frontend:** Vanilla JavaScript (ES6+), HTML5, CSS3 (Glassmorphism UI).
* **Core Logic:** Platform-agnostic "Brain" (`main.js`) handles the logic, while specific adapters manage DOM interactions for each streaming service.
* **Backend:** **Cloudflare Workers** (Serverless).
    * Handles TMDB API communication.
    * Implements **KV Caching** to minimize API usage.
    * Manages user feedback webhooks.

##  Installation (For Developers)

1.  **Clone the Repository**
    ```bash
    git clone [https://github.com/yourusername/dialogue-detective.git](https://github.com/yourusername/dialogue-detective.git)
    ```

2.  **Load into Chrome**
    * Open `chrome://extensions`.
    * Enable **Developer mode**.
    * Click **Load unpacked** and select the project folder.

3.  **Backend Configuration (Optional)**
    * The extension requires a backend proxy to function correctly.
    * You will need to deploy the `worker.js` to your own Cloudflare account and configure the necessary Environment Variables (`TMDB_API_KEY`, `GOOGLE_SCRIPT_URL`).
    * Update `common/api.js` with your worker's URL.

##  Legal & Disclaimer

* **Attribution:** This product uses the TMDB API but is not endorsed or certified by TMDB.
* **Privacy:** This extension operates locally on your browser. It does not store or transmit personal browsing data.
* **Affiliate Disclosure:** This extension may contain affiliate links to Amazon.com.
* **Trademarks:** Netflix, HBO Max, and Amazon Prime Video are trademarks of their respective owners. This is an independent project.



