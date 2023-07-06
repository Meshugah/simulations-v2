/* eslint-disable */
const axios = require('axios')

const pools = {
  USDC: {
    aavev2: 'a349fea4-d780-4e16-973e-70ca9b606db2',
    compound: 'cefa9bb8-c230-459a-a855-3b94e96acd8c',
    euler: '61b7623c-9ac2-4a73-a748-8db0b1c8c5bc',
    venus: '9f3a6015-5045-4471-ba65-ad3dc7c38269', // bsc
  },
}

// calculateApy variable, type may be calculate to calculate apy, balance to see if a certain amount of capital can bring it down.
calculateApyVariable = (protocol, type = 'default', obj) => {
  // hardcoded values for usdc
  baseAPY = 0
  Rslope1 = 0.04
  Uoptimal = 0.9

  // switch between this function types possible utilisation rates
  utilisationRate = 0
  targetAmount = 0
  current = 0

  switch (type) {
    case 'default':
      utilisationRate = protocol.utilisationRate
      break
    case 'flatten':
    case 'balance':
      utilisationRate =
        protocol.totalBorrowUsd / (protocol.totalSupplyUsd + obj.amount)
      break
  }
  // 0.35550774565144816

  if (utilisationRate > 0.9) console.log('Highutilisation!')
  // calculation for under optimal utilisation
  rate = (baseAPY + utilisationRate * 0.04) * 100
  // console.log('rate:', rate)

  // // only calulate target amount required for rebalance if type is 'balance', use that target to 'flatten' the higher APY, and get back the lower APY.
  switch (type) {
    case 'default':
      break
    case 'balance':
      // leftover amount to get to normal, substituting rate's formula with utilisation rate. solving for this
      targetAmount =
        (0.04 * protocol.totalBorrowUsd) / (obj.lowestApy / 100 - baseAPY) -
        protocol.totalSupplyUsd -
        obj.amount
      break
    case 'flatten':
      // we've only allocated capital towards supply. updating this and returning this
      const currentSupplyUsd = protocol.totalSupplyUsd - obj.amount
      current = {
        // store the values that are current to this method
        supplyUsd: currentSupplyUsd,
        borrowUsd: protocol.totalBorrowUsd,
        utilisationRate: protocol.totalBorrowUsd / currentSupplyUsd,
      }
  }
  // {
  //     "timestamp": "2022-09-21T23:00:53.126Z",
  //     "apyBase": 0.41483,
  //     "utilisationRate": 0.3117194840944437,
  //     "totalBorrowUsd": 429704989,
  //     "totalSupplyUsd": 1378498974,
  //     "protocolName": "aave",
  //     "assetName": "usdc"
  // }

  // {
  //     "supplyUsd": 832204324.1032931,
  //     "borrowUsd": 317764617,
  //     "utilisationRate": 0.3818348544900845
  // }
  return { rate, targetAmount, current, obj }
}

// only store fields, timestamp, apyBase, totalSupplyUsd, totalBorrowUsd, protocol name, utilisation rate
formatApiRequest = (data, protocolName, assetName) => {
  const formattedData = []
  for (let i = 0; i < data.length; i++) {
    const formattedDataPoint = {}

    if (data[i].apyBaseBorrow == null) {
      // console.log('apyBaseBorrow was null for ' + protocolName)
      continue
    }

    formattedDataPoint.timestamp = data[i].timestamp
    formattedDataPoint.apyBase = data[i].apyBase
    formattedDataPoint.utilisationRate =
      data[i].totalBorrowUsd / data[i].totalSupplyUsd
    formattedDataPoint.totalBorrowUsd = data[i].totalBorrowUsd
    formattedDataPoint.totalSupplyUsd = data[i].totalSupplyUsd
    formattedDataPoint.protocolName = protocolName
    formattedDataPoint.assetName = assetName

    formattedData.push(formattedDataPoint)
  }
  return formattedData
}

timestampToDate = (timestamp) => {
    if (!timestamp || timestamp === 0) {
        return null; // or return a default value, such as a specific date
    }

    const date = new Date(timestamp.split('T')[0])
    return date
}

isSameDay = (timestamp1, timestamp2) => {
  const date1 = timestampToDate(timestamp1)
  const date2 = timestampToDate(timestamp2)

  return {
    sameDay:
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate(),
  }
}

getHistoricData = (poolAddress) => {
  console.log('getting historic data for pool from defillama: ' + poolAddress)
  const url = `https://yields.llama.fi/chartLendBorrow/${poolAddress}`
  const response = axios.get(url)

  return response
}

function matchTimestamps(timestamp1, timestamp2) {
  const date1 = new Date(timestamp1)
  const date2 = new Date(timestamp2)

  const day1 = date1.getDate()
  const month1 = date1.getMonth()
  const year1 = date1.getFullYear()

  const day2 = date2.getDate()
  const month2 = date2.getMonth()
  const year2 = date2.getFullYear()

  if (day1 === day2 && month1 === month2 && year1 === year2) {
    return true
    // Timestamps match based on day, month, and year
    // console.log("Timestamps match!");
  } else {
    return false
    // Timestamps do not match
    // console.log("Timestamps do not match.");
  }
}

// Function to recursively search for the nested object
function findObjectByTimestamp(obj, timestamp) {
  // convert timestamp from date to timestamp
  const timeInUnix = timestampToDate(timestamp).getTime() / 1000

  // Check if the current object's timestamp matches the query timestamp
  if (
    obj.UnixTimeStamp === timeInUnix ||
    matchTimestamps(obj.timestamp, timestamp)
  ) {
    return obj // Found the object with the matching timestamp
  }

  // Iterate through each property of the current object
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      // Recursively search for the nested object
      const foundObject = findObjectByTimestamp(obj[key], timestamp)
      if (foundObject) {
        return foundObject // Return the found object
      }
    }
  }

  return null // Return null if the object with the matching timestamp is not found
}

// Main IIFE
;(async function () {
  // Get Historic Data from saved file
  protocol1File = require('./aaveData')
  protocol2File = require('./compoundData')
  protocol3File = require('./eulerData')
  // todo vignesh this needs to move to a multi chain format.
  gasFile = require('./gasDataEth.json')
  ethToUsdFile = require('./ethToUsd.json')

    // format data into only categories we require
    protocol1 = formatApiRequest(protocol1File.data, 'aave', 'usdc') // todo change to accept pools
    protocol2 = formatApiRequest(protocol2File.data, 'compound', 'usdc')
    protocol3 = formatApiRequest(protocol3File.data, 'euler', 'usdc')

  // console.log(protocol1)
  // console.log(protocol2)

    const protocols = [protocol1, protocol2, protocol3]
    // Create an object to store the supply APYs for each key date
    const supplyAPYs = {};

// Iterate over the protocols
    for (let i = 0; i < protocols.length; i++) {
        const currentProtocol = protocols[i];

        // Iterate over each entry in the current protocol
        for (let j = 0; j < currentProtocol.length; j++) {
            const entry = currentProtocol[j];

            // Skip if entry is empty
            if (!entry) {
                console.log('Empty data for protocol', i + 1);
                continue;
            }

            const { timestamp } = entry;

            // Check if timestamp exists in all protocols
            const isMatchingTimestamp = protocols.every((protocol) =>
                protocol.find(
                    (entry) =>
                        entry && entry.timestamp && entry.timestamp.split('T')[0] === timestamp.split('T')[0]
                )
            );


            if (!isMatchingTimestamp) {
                console.log('No matching timestamp for entry:', entry);
                continue;
            }

            // Convert the timestamp to a key date
            const keyDate = timestampToDate(timestamp);

            // Create a new entry in supplyAPYs for the key date if it doesn't exist
            if (!supplyAPYs[keyDate]) {
                supplyAPYs[keyDate] = {};
            }

            const protocolEntry = {
                timestamp: entry.timestamp,
                apyBase: entry.apyBase,
                utilisationRate: entry.utilisationRate,
                totalBorrowUsd: entry.totalBorrowUsd,
                totalSupplyUsd: entry.totalSupplyUsd,
                protocolName: entry.protocolName,
                assetName: entry.assetName,
                gasUsed: 0, // Placeholder value, update as needed
                ethToUsd: 0, // Placeholder value, update as needed
            };

            // Enrich with gas values
            const gas = findObjectByTimestamp(gasFile, entry.timestamp);
            const ethToUsd = findObjectByTimestamp(ethToUsdFile, entry.timestamp);

            protocolEntry.gasUsed = gas ? gas['Value (Wei)'] : 0; // Conversion to wei, or 0 if gas data is not available
            protocolEntry.ethToUsd = ethToUsd ? ethToUsd.open : 0; // Eth to USD conversion, or 0 if ETH to USD data is not available

            // Assign the protocol entry to the supplyAPYs object
            supplyAPYs[keyDate]['protocol' + (i + 1)] = protocolEntry;
        }
    }

  // console.log(Object.keys(supplyAPYs).length)

    // Function to calculate the weighted average APY, allocation list, and running average
    function calculateWeightedAverageAPYAndAllocation(supplyAPYs, capitalAvailability, interval) {
        let allocationLists = {};
        let runningAverages = {};
        let adjustedYearlyReturnsList = {};

        const intervalInDays = interval * 7; // Convert interval to days

        const dates = Object.keys(supplyAPYs); // Get all dates from supplyAPYs

        for (let i = 0; i < dates.length; i++) {
            const currentDate = dates[i];
            allocationLists[currentDate] = {};
            runningAverages[currentDate] = {};
            adjustedYearlyReturnsList[currentDate] = {};

            let totalWeightedAverageAPY = 0;
            let totalAllocatedCapital = 0;

            for (const protocol in supplyAPYs[currentDate]) {
                const apyBase = supplyAPYs[currentDate][protocol].apyBase;
                const totalSupplyUsd = supplyAPYs[currentDate][protocol].totalSupplyUsd;
                const totalBorrowUsd = supplyAPYs[currentDate][protocol].totalBorrowUsd;
                const gasUsed = supplyAPYs[currentDate][protocol].gasUsed;
                const ethToUsd = supplyAPYs[currentDate][protocol].ethToUsd;

                // Calculate the allocation ratio for the protocol
                const allocationRatio = (apyBase * totalSupplyUsd) /
                    Object.values(supplyAPYs[currentDate]).reduce((sum, p) => sum + (p.apyBase * p.totalSupplyUsd), 0);

                // Calculate the allocated capital for the protocol
                const allocatedCapital = allocationRatio * capitalAvailability;

                // Adjust the APY based on the allocated capital and utilization rate
                const utilisationRate = totalBorrowUsd / (totalSupplyUsd + allocatedCapital);
                const adjustedAPY = apyBase * (1 - utilisationRate);

                // Calculate the weighted average APY
                const weightedAverageAPY = adjustedAPY >= 0 ? adjustedAPY : apyBase;

                // Add allocation and APY to the allocation list
                allocationLists[currentDate][protocol] = {
                    allocatedCapital,
                    apyBase,
                    weightedAverageAPY,
                    gasUsed,
                    ethToUsd,
                };

                // Update the total weighted average APY and allocated capital
                totalWeightedAverageAPY += weightedAverageAPY;
                totalAllocatedCapital += allocatedCapital;
            }

            // Calculate the running average for each protocol
            for (const protocol in supplyAPYs[currentDate]) {
                const { weightedAverageAPY } = allocationLists[currentDate][protocol];
                runningAverages[currentDate][protocol] = weightedAverageAPY / totalWeightedAverageAPY;
            }

            // Calculate the adjusted yearly returns based on the interval
            if (i >= intervalInDays) {
                const startDate = dates[i - intervalInDays + 1];
                const endDate = dates[i];

                for (const protocol in supplyAPYs[currentDate]) {
                    let sumDailyAPYs = 0;
                    let sumGasUsed = 0;
                    for (let j = i - intervalInDays + 1; j <= i; j++) {
                        const date = dates[j];
                        sumDailyAPYs += allocationLists[date][protocol].weightedAverageAPY;
                        sumGasUsed += allocationLists[date][protocol].gasUsed;
                    }

                    const averageGasUsed = sumGasUsed / intervalInDays;
                    const averageDailyAPY = sumDailyAPYs / intervalInDays;
                    const adjustedYearlyReturn = Math.pow(1 + averageDailyAPY, 365) - 1;

                    adjustedYearlyReturnsList[currentDate][protocol] = {
                        adjustedYearlyReturn,
                        averageGasUsed,
                    };
                }
            } else {
                adjustedYearlyReturnsList[currentDate] = {};
            }

            // Calculate the overall APY with daily rebalancing
            let overallAPY = 0;
            let overallGasUsed = 0;
            if (i >= intervalInDays) {
                const startDate = dates[i - intervalInDays + 1];
                const endDate = dates[i];

                for (const protocol in allocationLists[currentDate]) {
                    const { weightedAverageAPY, allocatedCapital, gasUsed } = allocationLists[currentDate][protocol];
                    const dailyAPY = (1 + adjustedYearlyReturnsList[currentDate][protocol].adjustedYearlyReturn) ** (1 / 365) - 1;
                    const dailyGasUsed = adjustedYearlyReturnsList[currentDate][protocol].averageGasUsed;
                    overallAPY += dailyAPY * allocatedCapital;
                    overallGasUsed += dailyGasUsed * allocatedCapital;
                }
            }

            // Return the allocation lists, running averages, adjusted yearly returns list, overall APY, and overall gas used
            if (i >= intervalInDays) {
                return { allocationLists, runningAverages, adjustedYearlyReturnsList, overallAPY, overallGasUsed };
            }
        }

        // If there are not enough data points for rebalancing, return empty results
        return { allocationLists, runningAverages, adjustedYearlyReturnsList, overallAPY: 0, overallGasUsed: 0 };
    }







    // Constants
  const capitalAvailability = 200000 // Capital availability towards the total supply

    // Call the function to get the allocation lists and running averages
    const result = calculateWeightedAverageAPYAndAllocation(supplyAPYs, capitalAvailability,14);

// Output the allocation lists and running averages
    for (const date in result.allocationLists) {
        console.log(`Allocation List (${date}):`);
        const allocationList = result.allocationLists[date];
        for (const protocol in allocationList) {
            console.log(`Protocol: ${protocol}`);
            console.log(allocationList[protocol]);
        }
        console.log(`Running Averages (${date}):`);
        const runningAverage = result.runningAverages[date];
        for (const protocol in runningAverage) {
            console.log(`Protocol: ${protocol}`);
            console.log(`Running Average: ${runningAverage[protocol]}`);
        }
        console.log();
    }


// Calculate the final APY using the final running averages and allocations
    let finalAPY = 0;
    let totalAllocatedCapital = 0;

    for (const date in result.allocationLists) {
        const allocationList = result.allocationLists[date];
        for (const protocol in allocationList) {
            const { weightedAverageAPY, allocatedCapital } = allocationList[protocol];
            finalAPY += weightedAverageAPY * allocatedCapital;
            totalAllocatedCapital += allocatedCapital;
        }
    }

    finalAPY /= totalAllocatedCapital;

    console.log(`Final APY with Lazer's allocation: ${finalAPY}`);

  // todo vignesh
  // add more deferential possibilities for different periods. Daily, weekly, monthly.
    function calculateFinalAPYForProtocol(protocolName, allocationLists, runningAverages) {
        let finalAPY = 0;
        let totalAllocatedCapital = 0;

        // Loop through each date
        for (const date in allocationLists) {
            if (allocationLists[date].hasOwnProperty(protocolName)) {
                const { allocatedCapital, apyBase } = allocationLists[date][protocolName];
                const runningAverageAPY = runningAverages[date][protocolName];

                // Calculate the contribution of the protocol to the final APY
                const protocolAPYContribution = runningAverageAPY * allocatedCapital;

                // Increment the final APY and total allocated capital
                finalAPY += protocolAPYContribution;
                totalAllocatedCapital += allocatedCapital;
            }
        }

        // Calculate the final APY for the protocol
        const protocolFinalAPY = totalAllocatedCapital !== 0 ? finalAPY / totalAllocatedCapital : 0;

        return protocolFinalAPY;
    }

    protocolName = "protocol1";
    finalAPY1 = calculateFinalAPYForProtocol(protocolName, result.allocationLists, result.runningAverages);
    console.log(`Final APY for ${protocolName}: ${finalAPY1}`);

    protocolName = "protocol2";
    finalAPY2 = calculateFinalAPYForProtocol(protocolName, result.allocationLists, result.runningAverages);
    console.log(`Final APY for ${protocolName}: ${finalAPY2}`);

    protocolName = "protocol3";
    finalAPY3 = calculateFinalAPYForProtocol(protocolName, result.allocationLists, result.runningAverages);
    console.log(`Final APY for ${protocolName}: ${finalAPY3}`);

    console.log('------------')
})()

// so for aave
// withdrawal
// 276,755 | 207,564 (75%)
// our 70% is 193,728.5

// depsosit
// 300,000 | 207,489 (69.16%)
// our 60% is 180,000

// the average we're using will be: 186,864.25

// so for compound
// redeem
// 292,020 | 230,151 (78.81%)
// 532,020 | 423,710 (79.64%)
// 222,020 | 177,502 (79.95%)
// 239,268 | 194,590 (81.33%)
// 227,847 | 177,478 (77.89%)
// using 250k

// mint
// 252,020 | 204,820 (81.27%)
// 252,020 | 204,820 (81.27%)
// 212,020 | 173,474 (81.82%)
// 180k gas
// so average for compound is 215k

// on page redeems limit is 160k
// https://etherscan.io/txs?a=0x39AA39c021dfbaE8faC545936693aC917d5E7563&p=300
