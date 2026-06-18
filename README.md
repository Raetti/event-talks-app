# BigQuery Release Notes Explorer

A beautiful, self-contained web application built using **Python Flask** for the backend, and **Vanilla HTML, CSS, and JavaScript** for the frontend. It fetches, parses, and formats the official Google Cloud BigQuery release notes XML feed, presenting them in an interactive timeline with rich search, category-based filtering, and a custom Tweet/X sharing workspace.

---

## Features

-   **Live Timeline**: Automatically synchronizes with the official Google Cloud BigQuery RSS feed, displaying releases in a clean, scrollable timeline.
-   **Auto-Categorization**: Intelligently parses HTML descriptions, grouping updates into dedicated categories: `Feature`, `Announcement`, `Deprecation`, and `Fix` with custom glowing badges.
-   **Live Search & Filtering**: Real-time filtering by category or text query on dates, tags, and content.
-   **Premium Aesthetics**: Modern dark mode with glassmorphic cards, transition animations, and responsive layouts.
-   **Interactive X/Twitter Composer**:
    -   Click the **Share** button on any release to open a draft post workspace.
    -   Pre-populates a concise snippet of the release along with the date and source link.
    -   Features a dynamic, SVG-based radial character counter showing remaining characters out of 280 (color-coded blue, amber, and red).
    -   Provides one-click clipboard copying and direct posting via Twitter Web Intent.

---

## Directory Layout

```text
bigquery-releases/
├── app.py                  # Flask application server
├── templates/
│   └── index.html          # Main HTML structure and modal layouts
├── static/
│   ├── css/
│   │   └── style.css       # Premium vanilla stylesheet and styling tokens
│   └── js/
│       └── app.js          # Core frontend state, feed parsing, and interactive events
├── .gitignore              # Files and directories excluded from Git
└── README.md               # Project documentation
```

---

## Getting Started

### Prerequisites

-   Python 3.12+ (tested up to 3.14)
-   `pip` (Python package manager)

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/Raetti/event-talks-app.git
    cd event-talks-app
    ```

2.  Install the required dependencies:
    ```bash
    pip3 install flask
    ```

### Running the App

Start the Flask local development server:
```bash
python3 app.py
```

The application will be accessible at:
👉 **[http://127.0.0.1:5000](http://127.0.0.1:5000)**
