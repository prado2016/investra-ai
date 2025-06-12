How Positions Work in Investra AI
1. Core Concept
A position represents your current holding in a specific asset (stock, ETF, option, etc.) within a portfolio. It tracks:

How many shares/units you own
Your average cost basis
Current market value
Profit/loss calculations
Associated transactions
2. Database Structure
Positions are stored in the positions table with these key fields:

3. Position Lifecycle
Opening a Position
When you buy an asset for the first time:

Adding to Position
When you buy more of the same asset:

Quantity increases
Average cost is recalculated using weighted average
Total cost increases
Reducing Position
When you sell part of your holdings:

Quantity decreases
Average cost stays the same
Realized P&L is calculated for the sold portion
Closing Position
When you sell all shares:

Quantity becomes 0
Position may be marked as closed or removed
4. Key Calculations
Average Cost Calculation (Weighted Average)
Unrealized P&L
Total Return Percentage
5. Data Flow
Transaction Entry → User enters buy/sell in TransactionForm
Transaction Processing → System validates and saves transaction
Position Update → Position calculator updates affected positions
Real-time Updates → Market data service updates current prices
P&L Calculation → System recalculates gains/losses
UI Display → Portfolio and position components show updated data
6. State Management
The system uses PortfolioContext to manage position state:

7. Real-time Features
Live Price Updates: Market data service periodically fetches current prices
Automatic P&L Calculation: Unrealized gains/losses update in real-time
Portfolio Value Tracking: Total portfolio value recalculates as prices change
8. Position Types Supported
Long Positions: Regular stock/ETF holdings (positive quantity)
Short Positions: Borrowed securities sold (negative quantity)
Options: Calls and puts with expiration dates
Crypto: Digital assets with 24/7 market data
9. Key Components
PositionsList: Displays all positions in a portfolio
PositionCard: Shows individual position details
TransactionForm: Interface for adding transactions that affect positions
PortfolioSummary: Aggregated view of all positions
10. Error Handling
The system handles various edge cases:

Selling more shares than owned (prevents negative positions for most assets)
Market data failures (graceful degradation)
Concurrent transaction processing (database constraints)
This position system provides a comprehensive foundation for portfolio tracking, allowing users to monitor their investments, track performance, and make informed decisions based on real-time data and historical performance metrics.