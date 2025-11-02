# Dialogue Detective (Chrome Extension)
**Version:** v1.0.0-beta (Multi-Platform Adapter Model)

This is a browser extension prototype that provides a dialogue-aware "X-Ray" feature for major streaming platforms.

* **Currently Supported:** HBO Max, Amazon Prime Video
* **Core Function:** When the user clicks the "DIALOGUE" button, the extension scans the last 15 seconds of subtitles, identifies any characters mentioned, and displays their info (photo, character name, actor name).

## 🏗️ Architecture ("Adapter Model")

The extension uses an Adapter Model to support multiple platforms cleanly.

* **`main.js`:** The core "brain" of the extension. It's platform-independent and handles all logic, UI panel creation, and the Lookup Map.
* **`loader.js`:** The "router." It checks the current URL (`hostname`) and injects the correct platform-specific adapter.
* **`adapters/` (Folder):** Contains platform-specific files (`hbomax-adapter.js`, `amazon-adapter.js`). Each adapter's only job is to provide the correct, stable CSS selectors for:
    1.  Title detection
    2.  The subtitle container
    3.  The control bar (for button injection)
* **`common/api.js`:** Manages all API communication with TMDB.

## 🧠 Core Logic ("Lookup Map")

The heart of this extension is the "Lookup Map" (`characterLookupMap`) for high-speed, accurate matching.

1.  **Preprocessing (`buildCharacterMap`):** On load, the extension processes the full cast list (e.g., 300+ characters) from the TMDB API. It extracts keywords from names (e.g., "Martin 'Marty' Hart" -> `["martin", "marty", "hart"]`).
2.  **STOP_WORDS List:** Common words that are also names (like "lord", "man", "adam") are filtered out to prevent false matches (e.g., "who is that man?").
3.  **Instant Search (`showXRayPanel`):** When the "DIALOGUE" button is clicked, recent subtitles (e.g., `"...what happened to Tuttle'a?"`) are cleaned (`"
