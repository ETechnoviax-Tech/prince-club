# Prince Club

A real-time color prediction and trading simulator built with React and Vite. Designed for strategy testing and practice using virtual credits.

## Features

- **Real-Time Round Timer**: 30-second countdown rounds with automatic resolution.
- **Color & Number Prediction**: Place virtual bets on Green, Violet, Red, or individual numbers (0–9).
- **Dynamic Odds & Multipliers**: Accurate payout multipliers reflecting classic probability tables.
- **Balance & History Tracking**: Live transaction logs, round history, and real-time wallet updates.
- **Responsive Interface**: Mobile-first design styled with custom responsive CSS.

## Architecture

```
├── index.html        # Entry HTML template
├── package.json      # Dependencies and scripts
├── src/
│   ├── App.jsx       # State management, round logic, wallet system
│   ├── main.jsx      # React entry point
│   └── styles.css    # Custom UI styling and responsive layouts
└── public/           # Static assets
```

## Setup & Installation

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/ETechnoviax-Tech/prince-club.git
   cd prince-club
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

## Usage

1. Open `http://localhost:5173` in your browser.
2. Select your stake amount and choose a color (Green, Violet, Red) or a number (0–9).
3. Confirm the order before the round countdown reaches the lock window.
4. Review the result and your updated virtual balance upon round completion.

## Deployment

Build the optimized production assets:

```bash
npm run build
```

The compiled static files will be placed in the `dist/` directory, ready to deploy to platforms like Vercel, Netlify, or GitHub Pages.
