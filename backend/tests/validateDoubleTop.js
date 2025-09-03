/**
 * Validation script for Double Top pattern detection
 * Tests the enhanced algorithm against known historical patterns
 */

const { detectDoubleTop } = require('../detectors/doubleTop');
const { getHistoricalData } = require('../services/dataService');
const { findPeaksAndTroughs } = require('../utils/patternUtils');

/**
 * Validates Double Top detection on specific historical datasets
 * @param {string} ticker - Stock ticker symbol
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @param {string} description - Description of the test case
 */
async function validateDoubleTop(ticker, startDate, endDate, description) {
    console.log(`\n=== Testing Double Top Detection: ${description} ===`);
    console.log(`Ticker: ${ticker}, Period: ${startDate} to ${endDate}`);
    
    try {
        // Fetch historical data
        const candles = await getHistoricalData(ticker, startDate, endDate);
        
        if (!candles || candles.length === 0) {
            console.error(`No data found for ${ticker} in the specified period`);
            return;
        }
        
        console.log(`Retrieved ${candles.length} candles for analysis`);
        
        // Find peaks and troughs for analysis
        const { peaks, troughs } = findPeaksAndTroughs(candles);
        console.log(`Found ${peaks.length} peaks and ${troughs.length} troughs`);
        
        // Print the top 5 most significant peaks
        if (peaks.length > 0) {
            console.log('\nTop 5 Most Significant Peaks:');
            const sortedPeaks = [...peaks].sort((a, b) => b.significance - a.significance).slice(0, 5);
            sortedPeaks.forEach((peak, i) => {
                console.log(`${i+1}. Date: ${candles[peak.index].date}, High: ${peak.high.toFixed(2)}, Index: ${peak.index}`);
            });
        }
        
        // Special case for S&P 500 dataset - analyze why it's not detecting the pattern
        if (ticker === '^GSPC' && peaks.length >= 2) {
            console.log('\nAnalyzing S&P 500 Double Top (2007):');
            
            // Get the two most significant peaks
            const sortedPeaksForAnalysis = [...peaks].sort((a, b) => b.significance - a.significance).slice(0, 5);
            const peak1 = sortedPeaksForAnalysis[0];
            const peak2 = sortedPeaksForAnalysis[1];
            
            // Find the trough between them
            let valley = null;
            let lowestLow = Infinity;
            const startIdx = Math.min(peak1.index, peak2.index) + 1;
            const endIdx = Math.max(peak1.index, peak2.index);
            
            for (let i = startIdx; i < endIdx; i++) {
                if (candles[i].low < lowestLow) {
                    lowestLow = candles[i].low;
                    valley = { ...candles[i], index: i };
                }
            }
            
            if (valley) {
                // Calculate key metrics
                const firstPeak = peak1.index < peak2.index ? peak1 : peak2;
                const secondPeak = peak1.index > peak2.index ? peak1 : peak2;
                const heightDiff = Math.abs(firstPeak.high - secondPeak.high) / firstPeak.high;
                const troughDecline = (firstPeak.high - valley.low) / firstPeak.high;
                
                console.log(`First Peak: ${candles[firstPeak.index].date}, High: ${firstPeak.high.toFixed(2)}`);
                console.log(`Second Peak: ${candles[secondPeak.index].date}, High: ${secondPeak.high.toFixed(2)}`);
                console.log(`Valley: ${valley.date}, Low: ${valley.low.toFixed(2)}`);
                console.log(`Peak Height Difference: ${(heightDiff * 100).toFixed(2)}%`);
                console.log(`Trough Decline: ${(troughDecline * 100).toFixed(2)}%`);
                console.log(`Time Between Peaks: ${secondPeak.index - firstPeak.index} days`);
            }
        }
        
        // Detect Double Top pattern with ticker information
        const result = detectDoubleTop(candles, { ticker });
        
        // Display results
        if (result.detected && result.patternData) {
            console.log('\n✅ DOUBLE TOP PATTERN DETECTED');
            console.log('Pattern Details:');
            
            // Safely access indices if they exist
            if (result.firstPeakIndex !== undefined && candles[result.firstPeakIndex]) {
                console.log(`- First Peak: ${candles[result.firstPeakIndex].date} (${candles[result.firstPeakIndex].high})`);
            }
            
            if (result.secondPeakIndex !== undefined && candles[result.secondPeakIndex]) {
                console.log(`- Second Peak: ${candles[result.secondPeakIndex].date} (${candles[result.secondPeakIndex].high})`);
            }
            
            // Safely access pattern data properties
            const pd = result.patternData;
            if (pd.confidence !== undefined) console.log(`- Confidence Score: ${pd.confidence.toFixed(2)}`);
            if (pd.peakSimilarity !== undefined) console.log(`- Peak Similarity: ${pd.peakSimilarity.toFixed(2)}`);
            if (pd.troughQuality !== undefined) console.log(`- Trough Quality: ${pd.troughQuality.toFixed(2)}`);
            if (pd.volumeProfile !== undefined) console.log(`- Volume Profile: ${pd.volumeProfile.toFixed(2)}`);
            if (pd.priorTrend !== undefined) console.log(`- Prior Trend: ${pd.priorTrend}`);
            if (pd.trendStrength !== undefined) console.log(`- Trend Strength: ${pd.trendStrength.toFixed(2)}`);
            if (pd.breakoutStrength !== undefined) console.log(`- Breakout Strength: ${pd.breakoutStrength.toFixed(2)}`);
            
            // Calculate price target based on pattern height if values exist
            if (pd.patternHeight !== undefined && pd.necklineLevel !== undefined) {
                const patternHeight = pd.patternHeight;
                const breakoutLevel = pd.necklineLevel;
                const priceTarget = breakoutLevel - patternHeight;
                console.log(`- Price Target: ${priceTarget.toFixed(2)}`);
            }
        } else {
            console.log('\n❌ NO DOUBLE TOP PATTERN DETECTED');
            console.log(`Reason: ${result.reason || 'Unknown'}`);
        }
    } catch (error) {
        console.error(`Error validating Double Top for ${ticker}:`, error);
    }
}

/**
 * Run validation tests on known Double Top patterns
 */
async function runValidationTests() {
    // Test Case 1: S&P 500 Double Top (May-Oct 2007)
    await validateDoubleTop(
        '^GSPC',
        '2007-05-01',
        '2007-10-31',
        'S&P 500 Double Top (May-Oct 2007)'
    );
    
    // Test Case 2: Tesla Double Top (Late 2021)
    await validateDoubleTop(
        'TSLA',
        '2021-09-01',
        '2022-01-31',
        'Tesla Double Top (Late 2021)'
    );
    
    // Test Case 3: Silver Futures Double Top (2011)
    await validateDoubleTop(
        'SI=F',
        '2011-01-01',
        '2011-12-31',
        'Silver Futures Double Top (2011)'
    );
}

// Run the validation tests
runValidationTests().catch(console.error);
