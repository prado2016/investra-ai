
# Stock Finder Tool: Requirements

This document outlines the requirements for the new "Stock Finder" tool. The development will be phased, starting with a core set of features and expanding later.

### **Phase 1: Core Functionality**

#### **1. User Interface (UI) & User Experience (UX)**

*   **1.1. Main Menu Integration:**
    *   A new "Tools" item will be added to the main navigation bar.
    *   Clicking "Tools" will open a dropdown menu containing a link to the "Stock Finder".

*   **1.2. Stock Finder Main Page:**
    *   A new page will be created at the route `/tools/stock-finder`.
    *   **Universe Selection:** The page will feature a primary control (e.g., a dropdown or toggle buttons) to let the user select the stock universe to analyze. The initial options are:
        *   S&P 500
        *   NASDAQ-100
        *   TSX 60
    *   **Analysis Trigger:** A "Run Analysis" button will kick off the analysis for the selected universe.
    *   **Results Table:** A filterable and sortable table will display the analysis results with the following columns:
        *   Ticker Symbol (e.g., AAPL)
        *   Company Name
        *   Exchange (e.g., NASDAQ)
        *   Last Price
        *   **Signal:** "Buy", "Sell", or "Hold", with clear visual indicators (e.g., color-coding).
        *   **Signal Confidence:** A score indicating the strength of the signal.
        *   **AI Insight:** A button to trigger and view AI-generated feedback.

*   **1.3. Stock Detail View:**
    *   Clicking on a row in the results table will open a modal or a detail panel.
    *   This view will display:
        *   A historical price chart with indicator overlays (e.g., SMA lines).
        *   A dedicated section to display the detailed "AI Insight" text.

#### **2. Core Functionality & Logic**

*   **2.1. Analysis Engine:**
    *   The engine will fetch the list of constituent stocks for the user-selected Tier 1 universe.
    *   For each stock, it will fetch historical price data.
    *   It will apply a predefined analysis strategy (initially SMA Crossover) to the data.
    *   It will generate a "Buy", "Sell", or "Hold" signal based on the strategy's rules.

*   **2.2. Initial Indicator: Simple Moving Average (SMA) Crossover:**
    *   The system will calculate two SMAs: a short-term (e.g., 20-day) and a long-term (e.g., 50-day). These periods must be easily configurable.
    *   **Buy Signal:** Generated when the short-term SMA crosses *above* the long-term SMA.
    *   **Sell Signal:** Generated when the short-term SMA crosses *below* the long-term SMA.
    *   **Hold Signal:** All other conditions.

#### **3. Data Management**

*   **3.1. Tier 1 Universe Lists:**
    *   A mechanism will be implemented to fetch the list of all stock tickers for the S&P 500, NASDAQ-100, and TSX 60. This may come from an external API or a static list within the project that can be updated.

*   **3.2. Historical Stock Data:**
    *   A new service will be created to fetch historical daily stock data, leveraging the project's existing `yahoo-finance2` library to ensure consistency.

*   **3.3. Caching:**
    *   A caching strategy will be implemented to avoid re-fetching data unnecessarily.
        *   Universe constituent lists will be cached for at least 24 hours.
        *   Historical price data for each stock will be cached for a shorter period (e.g., 1-4 hours).

#### **4. Architecture & Extensibility**

*   **4.1. Modular Design:**
    *   The system will be designed with an `Indicator` interface and a `Strategy` pattern. This will make it easy to add new indicators (e.g., RSI, MACD) and analysis strategies in the future without refactoring the core engine.

#### **5. AI Integration**

*   **5.1. Leverage Existing AI Services:**
    *   The tool will use the existing `useAIServices` hook and its underlying infrastructure.

*   **5.2. AI Prompt Generation:**
    *   When a user requests an AI insight, the tool will generate a context-rich prompt.
    *   *Example Prompt:* "Provide a brief investment insight. A 'Buy' signal was generated for TSLA (NASDAQ) based on a 20-day SMA crossing above the 50-day SMA. The current price is $185. What is the potential significance of this technical event?"

### **Phase 2: Future Enhancements**

*   **Advanced Filtering:** The UI will be prepared for the addition of more advanced "Tier 2" filters, such as:
    *   Minimum Daily Volume (e.g., > 500k)
    *   Market Cap (e.g., > $500M)
    *   Country (US/CA)
    *   Sector (e.g., Technology, Healthcare)
*   **Additional Indicators:** New indicators will be added to the analysis engine.
*   **Custom Strategies:** Users may be able to create and save their own analysis strategies.
