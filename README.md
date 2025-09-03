# Stock Pattern Detection API & Frontend

A comprehensive solution for detecting and visualizing technical analysis patterns in financial markets. This project combines a powerful Node.js backend for pattern detection with a responsive React frontend for intuitive visualization.

## Features

The system detects four key technical chart patterns with high precision:

- **Double Top** - Bearish reversal pattern signaling potential downtrend
- **Triple Bottom** - Bullish reversal pattern signaling potential uptrend
- **Head and Shoulders** - Bearish reversal pattern with distinctive three-peak formation
- **Inverse Head and Shoulders** - Bullish reversal pattern with distinctive three-trough formation

## Architecture

### Backend

The system is built on a modular architecture with specialized components:

- **Express.js API Server** - RESTful endpoints for pattern analysis
- **Pattern Detection Engine** - Advanced algorithms for identifying market patterns
- **Data Service Layer** - Handles retrieval and processing of financial data

### Frontend

A modern React application with TypeScript that provides:

- **Interactive Charts** - Visualizes patterns with professional-grade overlays
- **User-friendly Interface** - Intuitive controls for selecting stocks and timeframes
- **Real-time Analysis** - Instant pattern detection and visualization

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

2.  **Install all dependencies at once:**
    ```bash
    npm run install:all
    ```

    This will install dependencies for the root project, frontend, and backend.

    Alternatively, you can install dependencies separately:
    ```bash
    # Root dependencies
    npm install
    
    # Backend dependencies
    cd backend
    npm install

    # Frontend dependencies
    cd ../frontend
    npm install
    ```

### Package Structure

The project uses a monorepo structure with separate package.json files:

1. **Root package.json**
   - Contains scripts to run both frontend and backend
   - Manages workspace configuration
   - Includes development dependencies shared across projects

2. **Backend package.json** (`/backend/package.json`)
   - Express.js server dependencies
   - Yahoo Finance API integration
   - Server-specific scripts

3. **Frontend package.json** (`/frontend/package.json`)
   - React and TypeScript dependencies
   - Chart visualization libraries
   - Frontend testing utilities
   - Build and development scripts

### Running the Application

1.  **Run both frontend and backend concurrently:**
    ```bash
    npm run dev
    ```

2.  **Start only the backend server:**
    ```bash
    npm run start:backend
    ```

    The backend server runs on port `3001` by default.

3.  **Start only the frontend development server:**
    ```bash
    npm run start:frontend
    ```

    The React development server will start on port `3000` and open in your default browser.

4.  **Run tests:**
    ```bash
    npm test
    ```

    This will run tests for both frontend and backend.

Now, you can use the application in your browser to detect and visualize stock patterns.

## Software Architecture

### Project Structure

```
KW/
├── backend/
│   ├── detectors/               # Pattern detection algorithms
│   │   ├── doubleTop.js         # Double Top pattern detector
│   │   ├── headAndShoulders.js  # Head and Shoulders pattern detector
│   │   ├── inverseHeadAndShoulders.js # Inverse H&S pattern detector
│   │   └── tripleBottom.js      # Triple Bottom pattern detector
│   ├── services/                # Service layer
│   │   └── dataService.js       # Handles data retrieval from Yahoo Finance
│   ├── tests/                   # Test suites
│   │   ├── testRealPatterns.js  # Integration tests with real market data
│   │   └── testData/            # Test data files
│   ├── utils/                   # Utility functions
│   │   └── patternUtils.js      # Common utilities for pattern detection
│   └── index.js                 # API server entry point
└── frontend/
    └── src/
        ├── components/          # React components
        │   ├── Chart.tsx        # Chart visualization
        │   ├── Form.tsx         # User input form
        │   └── ResultsDisplay.tsx # Results presentation
        ├── services/            # Frontend services
        │   └── apiService.ts    # API communication
        └── pages/
            └── Home.tsx         # Main application page
```

### Module Descriptions

#### Backend Modules

1. **Pattern Detectors (`backend/detectors/`)**
   - Each detector implements a specific pattern detection algorithm
   - Follows a modular design with single-responsibility helper functions
   - Returns standardized response objects with pattern data and confidence scores

2. **Data Service (`backend/services/dataService.js`)**
   - Handles data retrieval from Yahoo Finance API
   - Processes and formats financial data for pattern detection
   - Provides caching mechanisms for improved performance

3. **Pattern Utilities (`backend/utils/patternUtils.js`)**
   - Implements core algorithms used across multiple pattern detectors
   - Contains the critical `findPeaksAndTroughs` function
   - Provides helper functions for dynamic threshold calculations

4. **API Server (`backend/index.js`)**
   - Exposes RESTful endpoints for pattern analysis
   - Handles request validation and error handling
   - Orchestrates the flow between data service and pattern detectors

#### Frontend Modules

1. **Home Page (`frontend/src/pages/Home.tsx`)**
   - Central component that manages application state
   - Coordinates data flow between components
   - Handles API communication through apiService

2. **Form Component (`frontend/src/components/Form.tsx`)**
   - Manages user input for pattern analysis
   - Implements form validation and submission
   - Provides intuitive UI for selecting analysis parameters

3. **Chart Component (`frontend/src/components/Chart.tsx`)**
   - Renders financial data visualizations
   - Overlays pattern elements on charts
   - Provides interactive features for data exploration

4. **API Service (`frontend/src/services/apiService.ts`)**
   - Handles communication with backend API
   - Manages request/response formatting
   - Implements error handling for network requests

## Pattern Detection: Core Algorithms

### Foundation: Adaptive Peak & Trough Detection

The backbone of our pattern detection system is the `findPeaksAndTroughs` algorithm, which employs an adaptive sliding window approach to identify significant market turning points.

#### How It Works:

1. **Dynamic Window Sizing**
   - The algorithm automatically calculates optimal window size based on dataset length
   - Smaller datasets use proportionally larger windows (5% of data length)
   - Medium datasets use moderate windows (4% of data length)
   - Larger datasets use smaller windows (3% of data length)

2. **Peak Identification**
   - A candle is marked as a peak when its high price is the maximum within its surrounding window
   - This identifies significant resistance levels where price couldn't continue higher

3. **Trough Identification**
   - A candle is marked as a trough when its low price is the minimum within its surrounding window
   - This identifies significant support levels where buying pressure overcame selling

4. **Adaptive Fallback Mechanism**
   - If insufficient peaks/troughs are found, the system automatically attempts smaller window sizes
   - This ensures pattern detection across various market conditions and volatilities

This initial step transforms raw price data into a structured list of significant highs and lows, which serves as the input for the individual pattern detectors.

### Double Top Pattern Detection

The Double Top is a bearish reversal pattern consisting of two peaks at approximately the same price level with a moderate trough between them.

#### Algorithm Implementation:

1. **Structure Identification**
   - Locates two consecutive peaks with a significant trough between
   - Requires minimum spacing between peaks (at least 5 candles)
   - Peak heights must be within 10% of each other for pattern validity

2. **Trough Validation**
   - The trough between peaks must represent a minimum 5% price decline from the first peak
   - This confirms the significance of the pattern's middle reversal

3. **Neckline Establishment**
   - The neckline is established at the lowest point between the two peaks
   - Serves as critical support level and breakout confirmation point

4. **Breakout Confirmation**
   - Pattern is confirmed when price closes at least 3% below the neckline
   - If no breakout yet occurred, pattern is still detected but with reduced confidence

5. **Confidence Scoring**
   - Base confidence is calculated from peak similarity (1 minus the height difference ratio)
   - Without breakout confirmation, confidence is reduced by 30%

6. **Price Target Projection**
   - Measures pattern height (average of peak heights minus neckline level)
   - Projects this height downward from the neckline to establish price target

### Triple Bottom Pattern Detection

The Triple Bottom is a bullish reversal pattern showing three distinct troughs at similar price levels, indicating strong support and potential reversal.

#### Algorithm Implementation:

1. **Structure Identification**
   - Locates three consecutive troughs with intermediate peaks
   - All three troughs must be at similar price levels (within 8% tolerance)

2. **Peak Validation**
   - Two peaks must form between the three troughs
   - Peaks establish the resistance level that becomes the neckline

3. **Neckline Establishment**
   - Neckline is drawn horizontally at the level of the higher intermediate peak
   - Serves as the breakout confirmation level

4. **Breakout Confirmation**
   - Pattern is confirmed when price closes above the neckline
   - Without breakout confirmation, pattern is rejected

5. **Confidence Scoring**
   - Calculated based on the similarity of the three bottom points
   - Higher score when troughs are at more similar price levels

6. **Price Target Projection**
   - Measures pattern height (neckline minus average of trough prices)
   - Projects this height upward from the neckline to establish price target

### Head and Shoulders Pattern Detection

The Head and Shoulders is a bearish reversal pattern featuring three peaks, with the middle peak (head) higher than the two outer peaks (shoulders).

#### Algorithm Implementation:

1. **Structure Identification**
   - Locates three consecutive peaks with two intervening troughs
   - Head must be higher than both shoulders
   - System dynamically adjusts tolerance based on market volatility

2. **Shoulder Symmetry Validation**
   - Shoulder heights must be reasonably similar (within adaptive tolerance thresholds)
   - Higher confidence assigned to patterns with more symmetrical shoulders

3. **Neckline Calculation**
   - Sloped neckline formed by connecting the two troughs between shoulders and head
   - Formula: `necklineValue = m * index + c` where m is slope and c is y-intercept

4. **Breakout Confirmation**
   - Confirmed when price closes below the neckline after right shoulder forms
   - System allows for near-breakout detection based on price volatility patterns
   - Without full breakout, pattern can be detected with reduced confidence

5. **Market Volatility Adaptation**
   - Validation rules adapt automatically to different market volatilities
   - Uses Average True Range (ATR) as a percentage of average price to measure volatility
   - Adjusts thresholds for shoulder symmetry, head dominance, and breakout confirmation

6. **Price Target Projection**
   - Measures pattern height (head peak minus neckline at head position)
   - Projects this height downward from breakout point to establish price target

### Inverse Head and Shoulders Pattern Detection

The Inverse Head and Shoulders is a bullish reversal pattern featuring three troughs, with the middle trough (head) lower than the two outer troughs (shoulders).

#### Algorithm Implementation:

1. **Structure Identification**
   - Locates three consecutive troughs with two intervening peaks
   - Head must be lower than both shoulders (with adaptive tolerance)
   - Uses dynamically calculated shoulder depth tolerance based on market characteristics

2. **Shoulder Symmetry Validation**
   - Shoulder depths must be reasonably similar (within 25% difference)
   - Time symmetry is evaluated but not strictly enforced (40% tolerance)

3. **Neckline Calculation**
   - Sloped neckline formed by connecting the two peaks between shoulders and head
   - Creates resistance level that becomes breakout confirmation point

4. **Breakout Confirmation**
   - Pattern is confirmed when price closes above the neckline
   - Breakout confirmation can be made optional based on detection parameters

5. **Formation Detection**
   - Special logic to detect patterns still in formation (not yet completed)
   - For forming patterns, uses different confidence calculation and price projections

6. **Price Target Projection**
   - Measures pattern height (neckline at head position minus head trough)
   - Projects this height upward from breakout point to establish price target

## Confidence Scoring System

The system employs a sophisticated confidence scoring mechanism to rate the quality and reliability of each detected pattern:

### Score Components:

1. **Pattern Structure Quality**
   - How closely the pattern adheres to its theoretical ideal form
   - For Head and Shoulders: shoulder symmetry and head dominance
   - For Double/Triple patterns: similarity of peaks/troughs heights

2. **Breakout Confirmation**
   - Patterns with confirmed breakouts receive higher confidence
   - Patterns without breakout confirmation have confidence reduced by 20-30%

3. **Dynamic Market Adaptation**
   - Algorithm automatically adjusts thresholds based on volatility and price characteristics
   - Ensures appropriate pattern detection across all market instruments without hardcoded ticker rules

### Score Calculation:

- **Double/Triple Top/Bottom**: `1.0 - heightDifference` (reduced if no breakout)
- **Head and Shoulders**: `1.0 - shoulderHeightDiff` (symmetry-based scoring)
- **Inverse Head and Shoulders**: Uses same symmetry-based scoring with minimum threshold of 0.6

## Market Volatility Analysis

A key innovation in our system is the dynamic adaptation to market volatility. This ensures consistent pattern detection across different instruments and market conditions without requiring hardcoded rules for specific tickers.

### Volatility Calculation:

The system calculates market volatility using the Average True Range (ATR) as a percentage of average price:

1. For each candle, calculate the True Range (greatest of: current high-low, high-previous close, previous close-low)
2. Calculate the 14-period average of these True Ranges
3. Divide by the average price to get a normalized volatility measure
4. Use this volatility measure to dynamically adjust pattern detection thresholds

### Threshold Adjustment:

Based on the calculated volatility, the system automatically adjusts its detection thresholds:

- High volatility markets (>3%): Increase tolerance thresholds by 50%
- Medium volatility markets (1.5-3%): Increase tolerance thresholds by 20%
- Low volatility markets (<1.5%): Use standard tolerance thresholds

This ensures that pattern detection remains effective across different market conditions without requiring manual calibration.

## API Response Structure

When a pattern is successfully detected, the API returns a JSON object containing all the necessary data for analysis and visualization.

Example API Response Structure:
- success: Boolean indicating if pattern was found
- pattern: Type of pattern detected
- ticker: Stock symbol analyzed
- dateRange: Time period of the analysis
- patternData: Object containing pattern metrics and key points
- chartData: Raw price data used for analysis
- patternLines: Visualization data for chart rendering

The `patternData` object contains:
- confidence: The calculated confidence score (0.0 to 1.0)
- keyPoints: Date, price, and volume of each critical point in the pattern
- necklineLevel: The price level of the neckline at breakout
- priceTarget: The projected price target after the breakout
- patternHeight: The measured height of the pattern
- timespan: The duration of the pattern in days



### Production Validation Cases

These datasets serve as the final test for system robustness:

| Pattern             | Market Category | Approximate Timeframe   |
| ------------------- | -------------- | ----------------------- |
| Head and Shoulders  | Market Index   | Late 2007 - Mid 2008    |
| Double Top          | Market Index   | May 2007 - October 2007 |
| Inverse H&S         | Semiconductor  | Late 2022 - Early 2023  |
| Double Top          | Automotive     | Late 2021               |
| Triple Bottom       | Market Index   | Q3 2002 - Q1 2003       |
| Double Top          | Commodity      | 2011                    |

## Best Practices for Analyzing Results

1. **Consider Confidence Score**: Higher confidence patterns (>0.85) have greater reliability
2. **Check Breakout Status**: Confirmed breakouts provide stronger trading signals
3. **Analyze Volume Profile**: Increasing volume on breakouts adds confirmation
4. **Evaluate Pattern Timeframe**: Longer formations tend to produce more reliable signals
5. **Use in Conjunction**: Combine pattern signals with other technical indicators for best results

## Frontend Architecture

### Core Components

The frontend is built with a modular component architecture:

#### Home Component (`Home.tsx`)
- Central orchestrator that manages application state
- Handles API communication and error handling
- Coordinates child component rendering and data flow

#### Form Component (`Form.tsx`)
- Captures user input for analysis parameters:
  - Stock ticker symbol
  - Date range selection
  - Pattern type selection
- Implements form validation and submission logic
- Uses controlled components for precise state management

#### Chart Component (`Chart.tsx`)
- High-performance visualization using professional charting libraries
- Renders OHLC candlestick data with volume indicators
- Overlays pattern-specific elements:
  - Necklines and pattern outlines
  - Key points highlighting
  - Price target projections

#### ResultsDisplay Component (`ResultsDisplay.tsx`)
- Presents pattern detection results in user-friendly format
- Shows confidence score, key metrics, and pattern details
- Provides explanatory context for detected patterns

### Data Flow

1. User inputs analysis parameters via `Form` component
2. `Home` component sends request to backend via `apiService`
3. Backend processes request and returns pattern detection results
4. `Home` component updates state with results
5. `Chart` and `ResultsDisplay` components render updated visualization and information

## Project Strengths & Weaknesses

### Strengths

1. **Dynamic Adaptation**: Algorithms automatically adjust to different market conditions without hardcoded rules
2. **Modular Architecture**: Clean separation of concerns with single-responsibility functions
3. **Comprehensive Testing**: Unit tests and real-world validation ensure robust pattern detection
4. **Confidence Scoring**: Provides quantitative assessment of pattern quality and reliability
5. **Visual Clarity**: Frontend visualization makes complex patterns easily understandable

### Weaknesses

1. **Computational Intensity**: Complex pattern detection can be resource-intensive for very large datasets
2. **Edge Cases**: Unusual market conditions may still produce false positives/negatives
3. **API Dependencies**: Reliance on Yahoo Finance API for historical data
4. **Limited Pattern Types**: Currently supports only four pattern types (though the architecture is extensible)

## Future Enhancements

1. **Additional Patterns**: Expand detection to include flags, pennants, wedges, and rectangles
2. **Machine Learning Integration**: Implement ML models to improve pattern recognition accuracy
3. **Mobile Optimization**: Enhance frontend for better mobile experience
4. **Performance Optimization**: Implement more efficient algorithms for large datasets