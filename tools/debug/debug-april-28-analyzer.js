/**
 * Interactive Debug Analyzer for April 28, 2025 Issue
 * Run this in the browser console to get detailed diagnostics
 */

window.debugApril28 = {
  async analyzeIssue() {
    console.log('🔍 APRIL 28 DEBUG ANALYZER STARTING...\n');
    
    try {
      // Check if daily P/L service is accessible
      const serviceModule = await import('./src/services/analytics/dailyPLService.js');
      const service = serviceModule.dailyPLAnalyticsService;
      
      console.log('✅ Daily P/L service loaded');
      
      // Get portfolio data
      const portfolioModule = await import('./src/services/supabaseService.js');
      const portfolios = await portfolioModule.SupabaseService.portfolio.getPortfolios();
      
      if (!portfolios.success) {
        console.error('❌ Failed to fetch portfolios:', portfolios.error);
        return;
      }
      
      console.log(`📁 Found ${portfolios.data.length} portfolios`);
      
      // Test each portfolio
      for (const portfolio of portfolios.data) {
        console.log(`\n📊 Testing portfolio: ${portfolio.name} (${portfolio.id})`);
        
        // Get April 2025 data
        const result = await service.getMonthlyPLData(2025, 3, portfolio.id); // Month 3 = April
        
        if (result.error) {
          console.error(`❌ Error for ${portfolio.name}:`, result.error);
          continue;
        }
        
        if (!result.data) {
          console.warn(`⚠️  No data returned for ${portfolio.name}`);
          continue;
        }
        
        // Find April 28 data
        const april28Data = result.data.dailyData.find(day => day.dayOfMonth === 28);
        
        if (april28Data) {
          console.log('🎯 FOUND APRIL 28 DATA:');
          console.log('  Date:', april28Data.date);
          console.log('  Transaction Count:', april28Data.transactionCount);
          console.log('  Has Transactions:', april28Data.hasTransactions);
          console.log('  Total P/L:', april28Data.totalPL);
          console.log('  Color Category:', april28Data.colorCategory);
          console.log('  Transactions Array Length:', april28Data.transactions?.length || 0);
          
          if (april28Data.transactions && april28Data.transactions.length > 0) {
            console.log('  Transaction Details:');
            april28Data.transactions.forEach((t, i) => {
              console.log(`    ${i + 1}. ${t.asset?.symbol} - ${t.transaction_type} - $${t.total_amount}`);
            });
          }
        } else {
          console.warn(`⚠️  No April 28 data found in ${portfolio.name}`);
          console.log('  Available days:', result.data.dailyData.map(d => d.dayOfMonth));
        }
      }
      
    } catch (error) {
      console.error('❌ Debug analysis failed:', error);
      console.log('💡 Try running this in the app context where modules are available');
    }
  },

  // Check current calendar state
  checkCalendarState() {
    console.log('🔍 CHECKING CALENDAR STATE...\n');
    
    // Look for calendar component in DOM
    const calendarContainer = document.querySelector('[class*="CalendarContainer"]');
    if (calendarContainer) {
      console.log('✅ Calendar component found in DOM');
    } else {
      console.log('❌ Calendar component not found');
    }
    
    // Check for day cells
    const dayCells = document.querySelectorAll('[class*="DayCell"]');
    console.log(`📅 Found ${dayCells.length} day cells`);
    
    // Look for April 28 specifically
    const april28Cell = Array.from(dayCells).find(cell => {
      const dayNumber = cell.querySelector('[class*="DayNumber"]');
      return dayNumber && dayNumber.textContent === '28';
    });
    
    if (april28Cell) {
      console.log('🎯 Found April 28 cell in DOM');
      console.log('  Classes:', april28Cell.className);
      console.log('  Has click handler:', april28Cell.onclick !== null);
      
      // Check for P/L amount display
      const plAmount = april28Cell.querySelector('[class*="PLAmount"]');
      if (plAmount) {
        console.log('  P/L Amount displayed:', plAmount.textContent);
      } else {
        console.log('  ⚠️  No P/L amount found');
      }
      
      // Check for transaction count
      const transactionCount = april28Cell.querySelector('[class*="TransactionCount"]');
      if (transactionCount) {
        console.log('  Transaction count displayed:', transactionCount.textContent);
      } else {
        console.log('  ⚠️  No transaction count found');
      }
    } else {
      console.log('❌ April 28 cell not found in DOM');
    }
  },

  // Test modal state
  checkModalState() {
    console.log('🔍 CHECKING MODAL STATE...\n');
    
    const modal = document.querySelector('[class*="DayDetailsModal"]');
    if (modal) {
      console.log('✅ Modal found in DOM');
      const isOpen = modal.style.display !== 'none' && !modal.hidden;
      console.log('  Is Open:', isOpen);
      
      if (isOpen) {
        // Check modal content
        const modalContent = modal.querySelector('[class*="ModalContent"]');
        if (modalContent) {
          const metricRows = modalContent.querySelectorAll('[class*="MetricRow"]');
          console.log(`  Metric rows found: ${metricRows.length}`);
          
          metricRows.forEach((row, i) => {
            const label = row.querySelector('[class*="MetricLabel"]');
            const value = row.querySelector('[class*="MetricValue"]');
            if (label && value) {
              console.log(`    ${i + 1}. ${label.textContent} ${value.textContent}`);
            }
          });
        }
      }
    } else {
      console.log('❌ Modal not found in DOM');
    }
  },

  // Run complete analysis
  async runFullAnalysis() {
    console.log('🚀 RUNNING FULL APRIL 28 DEBUG ANALYSIS\n');
    console.log('=' .repeat(50));
    
    this.checkCalendarState();
    console.log('\n' + '=' .repeat(50));
    
    this.checkModalState();
    console.log('\n' + '=' .repeat(50));
    
    await this.analyzeIssue();
    console.log('\n' + '=' .repeat(50));
    
    console.log('✅ Analysis complete! Check the output above for issues.');
  }
};

// Auto-run if in browser context
if (typeof window !== 'undefined') {
  console.log('💡 April 28 Debug Analyzer loaded!');
  console.log('💡 Run: debugApril28.runFullAnalysis()');
}
