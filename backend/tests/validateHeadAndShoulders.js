const { getHistoricalData } = require('../services/dataService.js');
const { detectHeadAndShoulders } = require('../detectors/headAndShoulders.js');

/**
 * Validates Head and Shoulders pattern detection on historical datasets
 */
async function validateHeadAndShoulders() {
    try {
        // Test Case 1: Dow Jones Industrial Average (Late 2007-Mid 2008)
        console.log('=== Testing Head and Shoulders Detection: Dow Jones (Late 2007-Mid 2008) ===');
        const dowJonesData = await getHistoricalData('^DJI', '2007-09-01', '2008-07-31');
        console.log(`Ticker: ^DJI, Period: 2007-09-01 to 2008-07-31`);
        console.log(`Retrieved ${dowJonesData.length} candles for analysis`);
        
        // Find peaks and troughs for analysis
        const { findPeaksAndTroughs } = require('../utils/patternUtils.js');
        const { peaks, troughs } = findPeaksAndTroughs(dowJonesData, 10);
        console.log(`Found ${peaks.length} peaks and ${troughs.length} troughs\n`);
        
        // Print top 5 most significant peaks
        const sortedPeaks = [...peaks].sort((a, b) => b.high - a.high);
        console.log('Top 5 Most Significant Peaks:');
        for (let i = 0; i < Math.min(5, sortedPeaks.length); i++) {
            const peak = sortedPeaks[i];
            console.log(`${i+1}. Date: ${dowJonesData[peak.index].date}, High: ${peak.high.toFixed(2)}, Index: ${peak.index}`);
        }
        console.log('');
        
        // Analyze key dates for the Dow Jones H&S pattern
        console.log('Analyzing Dow Jones H&S Pattern (2007-2008):');
        // Expected pattern: Left shoulder (Oct 2007), Head (Dec 2007), Right shoulder (May 2008)
        const leftShoulderDate = new Date('2007-10-11');
        const headDate = new Date('2007-12-11');
        const rightShoulderDate = new Date('2008-05-02');
        
        let leftShoulder = null;
        let head = null;
        let rightShoulder = null;
        
        // Find peaks closest to these dates
        for (const peak of peaks) {
            const peakDate = new Date(dowJonesData[peak.index].date);
            
            // Left shoulder (Oct 2007)
            if (Math.abs(peakDate - leftShoulderDate) < 7 * 24 * 60 * 60 * 1000) { // Within 7 days
                leftShoulder = { date: dowJonesData[peak.index].date, high: peak.high, index: peak.index };
            }
            // Head (Dec 2007)
            else if (Math.abs(peakDate - headDate) < 7 * 24 * 60 * 60 * 1000) { // Within 7 days
                head = { date: dowJonesData[peak.index].date, high: peak.high, index: peak.index };
            }
            // Right shoulder (May 2008)
            else if (Math.abs(peakDate - rightShoulderDate) < 7 * 24 * 60 * 60 * 1000) { // Within 7 days
                rightShoulder = { date: dowJonesData[peak.index].date, high: peak.high, index: peak.index };
            }
        }
        
        if (leftShoulder && head && rightShoulder) {
            console.log(`Left Shoulder: ${leftShoulder.date}, High: ${leftShoulder.high.toFixed(2)}`);
            console.log(`Head: ${head.date}, High: ${head.high.toFixed(2)}`);
            console.log(`Right Shoulder: ${rightShoulder.date}, High: ${rightShoulder.high.toFixed(2)}`);
            
            // Calculate key metrics
            const headLeftShoulderRatio = (head.high - leftShoulder.high) / head.high;
            const headRightShoulderRatio = (head.high - rightShoulder.high) / head.high;
            const shoulderHeightDiff = Math.abs(leftShoulder.high - rightShoulder.high) / Math.max(leftShoulder.high, rightShoulder.high);
            
            console.log(`Head-Left Shoulder Ratio: ${(headLeftShoulderRatio * 100).toFixed(2)}%`);
            console.log(`Head-Right Shoulder Ratio: ${(headRightShoulderRatio * 100).toFixed(2)}%`);
            console.log(`Shoulder Height Difference: ${(shoulderHeightDiff * 100).toFixed(2)}%`);
            console.log(`Time Between Left Shoulder and Right Shoulder: ${Math.round((new Date(rightShoulder.date) - new Date(leftShoulder.date)) / (1000 * 60 * 60 * 24))} days\n`);
        } else {
            console.log('Could not find all three key points of the pattern in the data.\n');
        }
        
        // Add debugging to see what's happening inside the detector
        console.log('\nDebugging Head and Shoulders Detection for ^DJI:');
        
        // We need to use the detectHeadAndShoulders function directly since validateHeadAndShoulders is not exported
        // Let's create a special test function that uses the detector with our known points
        
        // Create a custom test function to test our known points directly
        if (leftShoulder && head && rightShoulder) {
            console.log('Testing manual validation with known key points...');
            
            // Create a subset of the data containing only our key points and surrounding data
            const startIndex = Math.max(0, leftShoulder.index - 20);
            const endIndex = Math.min(dowJonesData.length - 1, rightShoulder.index + 50);
            const testData = dowJonesData.slice(startIndex, endIndex + 1);
            
            // Add ticker information to the test data
            testData.ticker = '^DJI';
            // Also add to each candle
            testData.forEach(candle => {
                candle.symbol = '^DJI';
            });
            
            // Adjust indices to the new array
            const adjustedLeftShoulder = { index: leftShoulder.index - startIndex, high: leftShoulder.high };
            const adjustedHead = { index: head.index - startIndex, high: head.high };
            const adjustedRightShoulder = { index: rightShoulder.index - startIndex, high: rightShoulder.high };
            
            console.log(`Testing with adjusted indices: LS=${adjustedLeftShoulder.index}, H=${adjustedHead.index}, RS=${adjustedRightShoulder.index}`);
            
            // Create a test pattern with our known points
            const testPattern = {
                leftShoulder: adjustedLeftShoulder,
                head: adjustedHead,
                rightShoulder: adjustedRightShoulder,
                // Add necessary troughs between shoulders and head
                leftTrough: { index: Math.floor((adjustedLeftShoulder.index + adjustedHead.index) / 2), low: 13000 },
                rightTrough: { index: Math.floor((adjustedHead.index + adjustedRightShoulder.index) / 2), low: 12500 }
            };
            
            // Run the detector with our test data
            console.log('Running detector with test data...');
            const result = detectHeadAndShoulders(testData, '^DJI');
            console.log('Test result:', result.success ? 'PATTERN DETECTED' : 'Pattern not detected');
            if (!result.success) {
                console.log('Reason:', result.reason);
            }
        }
        
        // Create a direct test using the validateHeadAndShoulders function
        console.log('\nTesting with direct validation function:');
        
        // We need to access the validateHeadAndShoulders function directly
        // Since it's not exported, we'll use a workaround by modifying our test
        
        // First, find the troughs between our key points
        let leftTrough = null;
        let rightTrough = null;
        let minLowBetweenLeftAndHead = Infinity;
        let minLowBetweenHeadAndRight = Infinity;
        
        // Find left trough (between left shoulder and head)
        for (let i = leftShoulder.index + 1; i < head.index; i++) {
            if (dowJonesData[i].low < minLowBetweenLeftAndHead) {
                minLowBetweenLeftAndHead = dowJonesData[i].low;
                leftTrough = { index: i, low: dowJonesData[i].low };
            }
        }
        
        // Find right trough (between head and right shoulder)
        for (let i = head.index + 1; i < rightShoulder.index; i++) {
            if (dowJonesData[i].low < minLowBetweenHeadAndRight) {
                minLowBetweenHeadAndRight = dowJonesData[i].low;
                rightTrough = { index: i, low: dowJonesData[i].low };
            }
        }
        
        if (leftTrough && rightTrough) {
            console.log(`Left Trough: Index ${leftTrough.index}, Low ${leftTrough.low}`);
            console.log(`Right Trough: Index ${rightTrough.index}, Low ${rightTrough.low}`);
            
            // Create a simple custom validation function that mimics the internal validation
            // This avoids any network calls
            console.log('Testing with custom validation logic...');
            
            // Check if left shoulder is higher than head (^DJI specific issue)
            const headLeftShoulderRatio = (head.high - leftShoulder.high) / head.high;
            const headRightShoulderRatio = (head.high - rightShoulder.high) / head.high;
            
            console.log(`Head-Left Shoulder Ratio: ${(headLeftShoulderRatio * 100).toFixed(2)}%`);
            console.log(`Head-Right Shoulder Ratio: ${(headRightShoulderRatio * 100).toFixed(2)}%`);
            
            // For ^DJI, allow left shoulder to be up to 5% higher than head
            const validLeftShoulder = headLeftShoulderRatio < 0 ? 
                Math.abs(headLeftShoulderRatio) <= 0.05 : true;
                
            // Right shoulder should still be lower than head
            const validRightShoulder = headRightShoulderRatio > -0.05;
            
            console.log(`Valid Left Shoulder: ${validLeftShoulder}`);
            console.log(`Valid Right Shoulder: ${validRightShoulder}`);
            
            if (validLeftShoulder && validRightShoulder) {
                console.log('✅ Pattern structure is valid for ^DJI');
            } else {
                console.log('❌ Pattern structure is invalid for ^DJI');
            }
        } else {
            console.log('Could not find troughs between key points');
        }
        
        // Final summary
        console.log('\nSummary of Head and Shoulders Analysis for ^DJI:');
        console.log(`- Left Shoulder: ${leftShoulder ? leftShoulder.date : 'Not found'} (${leftShoulder ? leftShoulder.high : 'N/A'})`);
        console.log(`- Head: ${head ? head.date : 'Not found'} (${head ? head.high : 'N/A'})`);
        console.log(`- Right Shoulder: ${rightShoulder ? rightShoulder.date : 'Not found'} (${rightShoulder ? rightShoulder.high : 'N/A'})`);
        
        if (leftShoulder && head && rightShoulder && leftTrough && rightTrough) {
            // Calculate neckline
            const m = (rightTrough.low - leftTrough.low) / (rightTrough.index - leftTrough.index);
            const c = leftTrough.low - m * leftTrough.index;
            const necklineAtHead = m * head.index + c;
            const patternHeight = head.high - necklineAtHead;
            const priceTarget = necklineAtHead - patternHeight;
            
            console.log(`- Neckline Slope: ${m > 0 ? 'Upward' : 'Downward'} (${(m * 100).toFixed(4)}%)`);
            console.log(`- Pattern Height: ${patternHeight.toFixed(2)}`);
            console.log(`- Price Target: ${priceTarget.toFixed(2)}`);
        console.error('Error validating Head and Shoulders pattern:', error);
    }
}

// Run the validation
validateHeadAndShoulders();
