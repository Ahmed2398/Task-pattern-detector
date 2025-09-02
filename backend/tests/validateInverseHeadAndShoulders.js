const { getHistoricalData } = require('../services/dataService.js');
const { detectInverseHeadAndShoulders } = require('../detectors/inverseHeadAndShoulders.js');
const { findPeaksAndTroughs } = require('../utils/patternUtils.js');

/**
 * Validates Inverse Head and Shoulders pattern detection on historical datasets
 */
async function validateInverseHeadAndShoulders() {
    try {
        // Test Case 1: NVDA (Late 2022-Early 2023)
        console.log('=== Testing Inverse Head and Shoulders Detection: NVDA (Late 2022-Early 2023) ===');
        const nvdaData = await getHistoricalData('NVDA', '2022-09-01', '2023-03-31');
        console.log(`Ticker: NVDA, Period: 2022-09-01 to 2023-03-31`);
        console.log(`Retrieved ${nvdaData.length} candles for analysis`);
        
        // Find peaks and troughs for analysis with a smaller window size
        const { peaks, troughs } = findPeaksAndTroughs(nvdaData, 10);
        console.log(`Found ${peaks.length} peaks and ${troughs.length} troughs\n`);
        
        // Print all troughs for detailed analysis
        console.log('All Troughs:');
        troughs.forEach((trough, i) => {
            console.log(`${i+1}. Date: ${nvdaData[trough.index].date}, Low: ${trough.low.toFixed(2)}, Index: ${trough.index}`);
        });
        console.log('');
        
        // Print all peaks for detailed analysis
        console.log('All Peaks:');
        peaks.forEach((peak, i) => {
            console.log(`${i+1}. Date: ${nvdaData[peak.index].date}, High: ${peak.high.toFixed(2)}, Index: ${peak.index}`);
        });
        console.log('');
        
        // Print top 5 most significant troughs (for Inverse H&S we care about troughs)
        const sortedTroughs = [...troughs].sort((a, b) => a.low - b.low);
        console.log('Top 5 Most Significant Troughs:');
        for (let i = 0; i < Math.min(5, sortedTroughs.length); i++) {
            const trough = sortedTroughs[i];
            console.log(`${i+1}. Date: ${nvdaData[trough.index].date}, Low: ${trough.low.toFixed(2)}, Index: ${trough.index}`);
        }
        console.log('');
        
        // Analyze key dates for the NVDA Inverse H&S pattern
        console.log('Analyzing NVDA Inverse H&S Pattern (2022-2023):');
        // Expected pattern: Left shoulder (Oct 2022), Head (Dec 2022), Right shoulder (Feb 2023)
        const leftShoulderDate = new Date('2022-10-13');
        const headDate = new Date('2022-12-28');
        const rightShoulderDate = new Date('2023-02-22');
        
        let leftShoulder = null;
        let head = null;
        let rightShoulder = null;
        
        // Find troughs closest to these dates
        for (const trough of troughs) {
            const troughDate = new Date(nvdaData[trough.index].date);
            
            // Left shoulder (Oct 2022)
            if (Math.abs(troughDate - leftShoulderDate) < 7 * 24 * 60 * 60 * 1000) { // Within 7 days
                leftShoulder = { date: nvdaData[trough.index].date, low: trough.low, index: trough.index };
            }
            // Head (Dec 2022)
            else if (Math.abs(troughDate - headDate) < 7 * 24 * 60 * 60 * 1000) { // Within 7 days
                head = { date: nvdaData[trough.index].date, low: trough.low, index: trough.index };
            }
            // Right shoulder (Jan 2023)
            else if (Math.abs(troughDate - rightShoulderDate) < 7 * 24 * 60 * 60 * 1000) { // Within 7 days
                rightShoulder = { date: nvdaData[trough.index].date, low: trough.low, index: trough.index };
            }
        }
        
        if (leftShoulder && head && rightShoulder) {
            console.log(`Left Shoulder: ${leftShoulder.date}, Low: ${leftShoulder.low.toFixed(2)}`);
            console.log(`Head: ${head.date}, Low: ${head.low.toFixed(2)}`);
            console.log(`Right Shoulder: ${rightShoulder.date}, Low: ${rightShoulder.low.toFixed(2)}`);
            
            // Calculate key metrics
            const leftShoulderHeadRatio = (leftShoulder.low - head.low) / head.low;
            const rightShoulderHeadRatio = (rightShoulder.low - head.low) / head.low;
            const shoulderDepthDiff = Math.abs(leftShoulder.low - rightShoulder.low) / Math.min(leftShoulder.low, rightShoulder.low);
            
            console.log(`Left Shoulder-Head Ratio: ${(leftShoulderHeadRatio * 100).toFixed(2)}%`);
            console.log(`Right Shoulder-Head Ratio: ${(rightShoulderHeadRatio * 100).toFixed(2)}%`);
            console.log(`Shoulder Depth Difference: ${(shoulderDepthDiff * 100).toFixed(2)}%`);
            console.log(`Time Between Left Shoulder and Right Shoulder: ${Math.round((new Date(rightShoulder.date) - new Date(leftShoulder.date)) / (1000 * 60 * 60 * 24))} days\n`);
        } else {
            console.log('Could not find all three key points of the pattern in the data.\n');
        }
        
        // Run the detector with the ticker info
        const nvdaResult = detectInverseHeadAndShoulders(nvdaData, 'NVDA');
        
        if (nvdaResult.success) {
            console.log('✅ INVERSE HEAD AND SHOULDERS PATTERN DETECTED');
            console.log('Pattern Details:');
            console.log(`- Left Shoulder: ${nvdaResult.patternData.keyPoints.leftShoulder.date} (${nvdaResult.patternData.keyPoints.leftShoulder.price})`);
            console.log(`- Head: ${nvdaResult.patternData.keyPoints.head.date} (${nvdaResult.patternData.keyPoints.head.price})`);
            console.log(`- Right Shoulder: ${nvdaResult.patternData.keyPoints.rightShoulder.date} (${nvdaResult.patternData.keyPoints.rightShoulder.price})`);
            console.log(`- Confidence Score: ${nvdaResult.patternData.confidence.toFixed(2)}`);
            console.log(`- Price Target: ${nvdaResult.patternData.priceTarget.toFixed(2)}`);
            
            // Print detailed confidence metrics if available
            if (nvdaResult.patternData.confidenceMetrics) {
                console.log('\nConfidence Metrics:');
                const metrics = nvdaResult.patternData.confidenceMetrics;
                console.log(`- Head Prominence: ${metrics.headProminence.toFixed(2)}`);
                console.log(`- Shoulder Symmetry: ${metrics.shoulderSymmetry.toFixed(2)}`);
                console.log(`- Neckline Quality: ${metrics.necklineQuality.toFixed(2)}`);
                console.log(`- Volume Profile: ${metrics.volumeProfile.toFixed(2)}`);
                console.log(`- Prior Trend: ${metrics.priorTrend.toFixed(2)}`);
                console.log(`- Breakout Strength: ${metrics.breakoutStrength.toFixed(2)}`);
                console.log(`- Partial Breakout: ${metrics.partialBreakout}`);
            }
            
            // Print configuration used if available
            if (nvdaResult.patternData.configUsed) {
                console.log('\nConfiguration Used:');
                const config = nvdaResult.patternData.configUsed;
                console.log(`- Window Size: ${config.windowSize}`);
                console.log(`- Min Head Prominence: ${config.minHeadProminence.toFixed(3)}`);
                console.log(`- Max Shoulder Diff: ${config.maxShoulderDiff.toFixed(3)}`);
                console.log(`- Volatility Adjusted: ${config.volatilityAdjusted}`);
                console.log(`- Ticker Specific: ${config.tickerSpecific}`);
            }
        } else {
            console.log('❌ NO INVERSE HEAD AND SHOULDERS PATTERN DETECTED');
            console.log(`Reason: ${nvdaResult.reason}`);
        }
        
        // Test Case 2: BTC-USD (Early 2023)
        console.log('\n=== Testing Inverse Head and Shoulders Detection: BTC-USD (Early 2023) ===');
        const btcData = await getHistoricalData('BTC-USD', '2022-11-01', '2023-04-30');
        console.log(`Ticker: BTC-USD, Period: 2022-11-01 to 2023-04-30`);
        console.log(`Retrieved ${btcData.length} candles for analysis`);
        
        const btcResult = detectInverseHeadAndShoulders(btcData, 'BTC-USD');
        
        if (btcResult.success) {
            console.log('✅ INVERSE HEAD AND SHOULDERS PATTERN DETECTED');
            console.log('Pattern Details:');
            console.log(`- Left Shoulder: ${btcResult.patternData.keyPoints.leftShoulder.date} (${btcResult.patternData.keyPoints.leftShoulder.price})`);
            console.log(`- Head: ${btcResult.patternData.keyPoints.head.date} (${btcResult.patternData.keyPoints.head.price})`);
            console.log(`- Right Shoulder: ${btcResult.patternData.keyPoints.rightShoulder.date} (${btcResult.patternData.keyPoints.rightShoulder.price})`);
            console.log(`- Confidence Score: ${btcResult.patternData.confidence.toFixed(2)}`);
            console.log(`- Price Target: ${btcResult.patternData.priceTarget.toFixed(2)}`);
            
            // Print configuration used if available
            if (btcResult.patternData.configUsed) {
                console.log('\nConfiguration Used:');
                const config = btcResult.patternData.configUsed;
                console.log(`- Window Size: ${config.windowSize}`);
                console.log(`- Min Head Prominence: ${config.minHeadProminence.toFixed(3)}`);
                console.log(`- Max Shoulder Diff: ${config.maxShoulderDiff.toFixed(3)}`);
                console.log(`- Volatility Adjusted: ${config.volatilityAdjusted}`);
                console.log(`- Ticker Specific: ${config.tickerSpecific}`);
            }
        } else {
            console.log('❌ NO INVERSE HEAD AND SHOULDERS PATTERN DETECTED');
            console.log(`Reason: ${btcResult.reason}`);
        }
        
    } catch (error) {
        console.error('Error validating Inverse Head and Shoulders pattern:', error);
    }
}

// Run the validation
validateInverseHeadAndShoulders();
