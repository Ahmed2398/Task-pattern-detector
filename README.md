# Stock Pattern Detection API & Frontend

This project provides a complete solution for detecting common technical analysis patterns in stock market data. It consists of a Node.js/Express.js backend API for pattern detection and a React frontend for visualization.

## Features

The backend API can detect the following chart patterns:

- Double Top
- Double Bottom
- Triple Top
- Triple Bottom
- Head and Shoulders
- Inverse Head and Shoulders

## Architecture

- **Backend**: A RESTful API built with Express.js that takes historical stock data and returns detected patterns with key data points for visualization.
- **Frontend**: A React application that allows users to input a stock ticker and date range, then visualizes the detected patterns on a chart.

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine.

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or later recommended)
- [npm](https://www.npmjs.com/)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd KW
    ```

2.  **Install backend dependencies:**
    ```bash
    cd backend
    npm install
    ```

3.  **Install frontend dependencies:**
    ```bash
    cd ../frontend
    npm install
    ```

### Running the Application

1.  **Start the backend server:**

    The backend server runs on port `3001` by default. Make sure to create a `.env` file in the `backend` directory if required by the data service.

    ```bash
    cd backend
    npm start
    ```

2.  **Start the frontend development server:**

    The React development server will start on port `3000` and open in your default browser.

    ```bash
    cd frontend
    npm start
    ```

Now, you can use the application in your browser to detect and visualize stock patterns.

## How The Algorithms Work

The detection engine identifies patterns by performing a multi-stage analysis rooted in classical technical analysis principles. The process can be broken down into three main phases: Key Point Identification, Pattern Validation, and Breakout Confirmation.

### 1. Key Point Identification

The foundation of the entire system is the `findPeaksAndTroughs` function. It scans the historical price data to find significant turning points.

-   **Algorithm**: It uses a **sliding window** approach. For each candle, it looks at a specified number of preceding and succeeding candles (the "window").
-   **Peak Detection**: A candle is marked as a **peak** if its high price is the absolute highest within its entire window.
-   **Trough Detection**: Similarly, a candle is marked as a **trough** if its low price is the absolute lowest within its window.

This initial step transforms raw price data into a structured list of significant highs and lows, which serves as the input for the individual pattern detectors.

### 2. Pattern Validation Logic

Each pattern detector iterates through the identified peaks and troughs to find sequences that match its required structure. Below is a detailed breakdown for each pattern family.

#### Double Top & Double Bottom

-   **Algorithm Steps**:
    1.  The detector iterates through each peak (for Double Top) or trough (for Double Bottom).
    2.  It searches for a subsequent peak/trough to form a pair.
    3.  It locates the intervening trough/peak between the pair.
-   **Validation Rules**:
    -   **Price Similarity**: The highs of the two peaks (or lows of the two troughs) must be within a **6% price tolerance** of each other. This ensures the pattern represents a consistent level of resistance or support.
    -   **Reversal Significance**: The intervening trough (or peak) must represent a price reversal of at least **10%** from the first peak's high (or first trough's low). This confirms the significance of the neckline.
-   **Reference**: [Lux Algo Chart Patterns](https://www.luxalgo.com/)

#### Triple Top & Triple Bottom

-   **Algorithm Steps**:
    1.  The logic extends the double pattern search, looking for three consecutive peaks or troughs.
    2.  It identifies the two intervening troughs (or peaks) that separate the three main points.
-   **Validation Rules**:
    -   **Price Similarity**: All three peaks/troughs must fall within a **5-8% price tolerance**, ensuring a well-defined resistance/support zone.
    -   **Neckline Definition**: The neckline is drawn horizontally at the level of the *lowest* of the two troughs (for a Triple Top) or the *highest* of the two peaks (for a Triple Bottom). This forms the critical level for breakout confirmation.
-   **Reference**: [Lux Algo Chart Patterns](https://www.luxalgo.com/)

#### Head and Shoulders & Inverse Head and Shoulders

-   **Algorithm Steps**:
    1.  The detector searches for a sequence of three consecutive peaks (for H&S) or troughs (for Inverse H&S).
    2.  It identifies the two intervening troughs/peaks that form the neckline points.
-   **Validation Rules**:
    -   **Head Dominance**: The middle peak (the "Head") *must* be higher than the two adjacent peaks (the "Shoulders"). For an Inverse pattern, the Head must be the lowest trough.
    -   **Shoulder Symmetry**: The heights of the two Shoulders are compared. The pattern is only considered valid if their height difference is within a **15% tolerance**, ensuring a degree of symmetry.
    -   **Sloped Neckline**: A trendline is calculated by connecting the two intervening troughs (or peaks). This line is often sloped and is a key feature of the pattern.
-   **Reference**: [Lux Algo Chart Patterns](https://www.luxalgo.com/)

### 3. Breakout Confirmation and Price Target

-   **Breakout Logic**: After a pattern is validated, the algorithm monitors the candles immediately following the pattern. A breakout is confirmed if a candle's closing price moves decisively past the calculated neckline.
-   **Price Target Projection**: The **pattern height** is first calculated (e.g., the vertical distance from the Head to the neckline). This height is then projected from the breakout point in the direction of the breakout to estimate a potential price target.

### 4. Confidence Scoring

To provide a measure of the quality and reliability of each detected pattern, a **confidence score** is calculated. This score is based on how closely the pattern's structure adheres to its ideal form.

-   **Double/Triple Top & Bottom**: The confidence is determined by the **price similarity** of the peaks or troughs. The smaller the percentage difference between their highs (for tops) or lows (for bottoms), the higher the confidence score. A perfect pattern with identical peaks/troughs would have a score of 1.0.

-   **Head and Shoulders**: The confidence is based on the **symmetry** of the two shoulders. The score is higher when the shoulders are closer in height (for a standard H&S) or depth (for an inverse H&S). This reflects a more balanced and reliable pattern structure.

## API Response Structure

When a pattern is successfully detected, the API returns a JSON object containing all the necessary data for analysis and visualization. Below is a description of the key fields in the response.

```json
{
  "success": true,
  "pattern": "Double Top",
  "ticker": "AAPL",
  "dateRange": { "start": "2023-01-01", "end": "2023-12-31" },
  "patternData": {
    "confidence": 0.98,
    "keyPoints": { ... },
    "necklineLevel": 175.50,
    "priceTarget": 160.00,
    "patternHeight": 15.50,
    "timespan": 90
  },
  "chartData": [ ... ],
  "patternLines": [ ... ]
}
```

-   `patternData`: An object containing the core metrics of the detected pattern:
    -   `confidence`: The calculated confidence score (0.0 to 1.0).
    -   `keyPoints`: An object detailing the date, price, and volume of each critical point in the pattern (e.g., `leftShoulder`, `head`, `breakoutPoint`).
    -   `necklineLevel`: The price level of the neckline at the point of breakout.
    -   `priceTarget`: The projected price target after the breakout.
-   `chartData`: The raw OHLCV (Open, High, Low, Close, Volume) data used for the analysis.
-   `patternLines`: An array of objects designed to help the frontend render the pattern on a chart. Each object specifies the `type` of line (e.g., `neckline`, `patternOutline`), the `points` (date/price coordinates), and suggested `color` and `style`.

## Testing & Validation

Use the following datasets to build, debug, and validate your algorithm. Your code should successfully identify the patterns in these cases.

### Development Data (Your Sandbox)

| Pattern             | Ticker  | Approximate Timeframe   |
| ------------------- | ------- | ----------------------- |
| Head and Shoulders  | AAPL    | Late 2012 - Mid 2013    |
| Double Top          | AMZN    | July 2021 - February 2022 |
| Triple Bottom       | BTC-USD | May 2021 - July 2021    |

### Validation Data (The Final Test)
Your final submission will be tested against this "unseen" data to evaluate its robustness.

| Pattern             | Ticker  | Approximate Timeframe   |
| ------------------- | ------- | ----------------------- |
| Head and Shoulders  | ^DJI    | Late 2007 - Mid 2008    |
| Double Top          | ^GSPC   | May 2007 - October 2007 |
| Inverse H&S         | NVDA    | Late 2022 - Early 2023  |
| Double Top          | TSLA    | Late 2021               |
| Triple Bottom       | ^GSPC   | Q3 2002 - Q1 2003       |
| Double Top          | SI=F    | 2011                    |


## Frontend Architecture

The frontend is a React application built with TypeScript that provides a user-friendly interface for interacting with the pattern detection API. The architecture is designed to be modular and maintainable, with a clear separation of concerns.

### Core Components

The user interface is built from a set of reusable components:

-   **`Home.tsx`**: The main page component that serves as the central hub of the application. It manages the overall state, including loading status, analysis results, and error messages.
-   **`Form.tsx`**: A controlled component that captures user input for the stock ticker, date range, and pattern type. It handles form validation and triggers the analysis when submitted.
-   **`Chart.tsx`**: A sophisticated visualization component that uses a charting library to render the historical stock data. It is responsible for plotting the OHLC candles and overlaying the detected pattern lines (neckline, outline, and price target).
-   **`ResultsDisplay.tsx`**: A component that presents the results of the analysis in a clear and readable format, including the detected pattern's name, confidence score, and key metrics.

### Services and Data Flow

The application's logic and data handling are managed by a dedicated service and a well-defined data flow:

-   **`apiService.ts`**: This service acts as the bridge between the frontend and the backend. It encapsulates the logic for making API requests to the `/api/analyze` endpoint, handling query parameters, and processing the JSON response.
-   **`types.ts`**: This file contains all the TypeScript type definitions for the application, ensuring type safety and consistency for objects like `AnalysisResult` and `FormData`.

### State Management and Logic

1.  **User Interaction**: The user fills out the `Form` component with the desired analysis parameters.
2.  **API Request**: Upon submission, the `Home` component calls the `apiService` to send a request to the backend.
3.  **State Update**: While the request is in progress, the `loading` state is set to `true`, and the UI provides feedback to the user.
4.  **Data Handling**: Once the backend responds, the `Home` component updates its state with the analysis results or an error message.
5.  **Rendering**: The `Chart` and `ResultsDisplay` components re-render to visualize the new data, displaying the stock chart with the detected pattern and the detailed analysis metrics.

