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
  // todo vignesh this needs to move to a multi chain format.
  gasFile = require('./gasDataEth.json')
  ethToUsdFile = require('./ethToUsd.json')

  // format data into only categories we require
  protocol1 = formatApiRequest(protocol1File.data, 'aave', 'usdc') // todo change to accept pools
  protocol2 = formatApiRequest(protocol2File.data, 'compound', 'usdc')

  // console.log(protocol1)
  // console.log(protocol2)

  // borrow APY
  const supplyAPYs = {}

  // formatting for unbalanced lists from defillama
  for (let i = 0, j = 0; i < protocol1.length, j < protocol2.length; i++, j++) {
    // skip empty fields
    if (!protocol1[i]) {
      // console.log('empty data')
      continue
    }
    if (!protocol2[i]) {
      console.log('empty data')
      continue
    }

    // checks if the days match
    // todo pointers
    const { sameDay } = isSameDay(
      protocol1[i].timestamp,
      protocol2[j].timestamp
    )

    // set the key with the respective timestamp, in this case the highest, as it may lag
    const date1 = this.timestampToDate(protocol1[i].timestamp)
    const date2 = this.timestampToDate(protocol2[j].timestamp)

    let keyDate
    if (date1.getDate() >= date2.getDate())
      keyDate = timestampToDate(protocol1[i].timestamp)
    else if (date2.getDate() <= date1.getDate())
      keyDate = timestampToDate(protocol2[j].timestamp)

    if (!sameDay) {
      if (date1.getDate() >= date2.getDate()) {
        i--
      }
      if (date1.getDate() <= date2.getDate()) {
        j--
      }
    } else if (sameDay) {
      supplyAPYs[keyDate] = {}
      supplyAPYs[keyDate].protocol1 = protocol1[i]
      supplyAPYs[keyDate].protocol2 = protocol2[i]
      // enrich with gas values
      // for protocol1
      // supplyAPYs[keyDate].protocol1.gas =
      const gas = findObjectByTimestamp(gasFile, protocol1[i].timestamp)
      const ethToUsd = findObjectByTimestamp(
        ethToUsdFile,
        protocol1[i].timestamp
      )
      supplyAPYs[keyDate].protocol1.gasUsed = gas['Value (Wei)'] / 10e18 // conversion to wei
      supplyAPYs[keyDate].protocol2.gasUsed = gas['Value (Wei)'] / 10e18 // convertsion to eth
      supplyAPYs[keyDate].protocol1.ethToUsd = ethToUsd.open
      supplyAPYs[keyDate].protocol2.ethToUsd = ethToUsd.open
    } else console.log('we missed one!')
  }

  // console.log(Object.keys(supplyAPYs).length)

    // Function to calculate the weighted average APY, allocation list, running average, and adjusted yearly returns list
    // Function to calculate the weighted average APY, allocation list, and running average
    function calculateWeightedAverageAPYAndAllocation(supplyAPYs, capitalAvailability) {
        let allocationLists = {};
        let runningAverages = {};

        for (const date in supplyAPYs) {
            allocationLists[date] = {};
            runningAverages[date] = {};

            let totalWeightedAverageAPY = 0;
            let totalAllocatedCapital = 0;

            for (const protocol in supplyAPYs[date]) {
                const apyBase = supplyAPYs[date][protocol].apyBase;
                const totalSupplyUsd = supplyAPYs[date][protocol].totalSupplyUsd;
                const gasUsed = supplyAPYs[date][protocol].gasUsed;
                const ethToUsd = supplyAPYs[date][protocol].ethToUsd;

                // Calculate the allocation ratio for the protocol
                const allocationRatio = (apyBase * totalSupplyUsd) / Object.values(supplyAPYs[date]).reduce((sum, p) => sum + (p.apyBase * p.totalSupplyUsd), 0);

                // Allocate capital to the protocol based on the allocation ratio
                const allocatedCapital = allocationRatio * capitalAvailability;

                // Calculate the adjusted APY by subtracting the gas cost
                const adjustedAPY = (apyBase * totalSupplyUsd - gasUsed * ethToUsd) / (totalSupplyUsd + allocatedCapital);

                // Calculate the weighted average APY
                const weightedAverageAPY = (adjustedAPY * allocatedCapital) / capitalAvailability;

                // Add allocation to the allocation list
                allocationLists[date][protocol] = {
                    allocatedCapital,
                    adjustedAPY,
                    weightedAverageAPY,
                };

                // Update the total weighted average APY and allocated capital
                totalWeightedAverageAPY += weightedAverageAPY;
                totalAllocatedCapital += allocatedCapital;

                // Calculate the running average for the current protocol
                runningAverages[date][protocol] = totalWeightedAverageAPY / totalAllocatedCapital;
            }
        }

        // Return the allocation lists and running averages
        return { allocationLists, runningAverages };
    }

  // Constants
  const capitalAvailability = 2000000 // Capital availability towards the total supply

    // Call the function to get the allocation lists and running averages
    const result = calculateWeightedAverageAPYAndAllocation(supplyAPYs, capitalAvailability);

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

// Calculate the average of all the running averages
    let sumOfRunningAverages = 0;
    let count = 0;

    for (const date in result.runningAverages) {
        const runningAverage = result.runningAverages[date];
        for (const protocol in runningAverage) {
            sumOfRunningAverages += runningAverage[protocol];
            count++;
        }
    }

    const averageRunningAverage = sumOfRunningAverages / count;
    console.log(`Average of all running averages: ${averageRunningAverage}`);

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

    console.log(`Final APY: ${finalAPY}`);

  // todo vignesh
  // add more deferential possibilities for different periods. Daily, weekly, monthly.
    function getProtocolWithHighestAPYSum(supplyAPYs) {
        let highestSum = 0;
        let protocolWithHighestSum = '';

        for (const date in supplyAPYs) {
            const protocols = Object.keys(supplyAPYs[date]);
            let sum = 0;

            for (const protocol of protocols) {
                const apy = supplyAPYs[date][protocol].apyBase;
                sum += apy;
            }

            if (sum > highestSum) {
                highestSum = sum;
                protocolWithHighestSum = protocols[0];
            }
        }

        return protocolWithHighestSum;
    }

    function calculateAPY(protocolName, supplyAPYs, capitalAvailability) {
        let sumAPY = 0;
        let count = 0;

        for (const date in supplyAPYs) {
            const apy = supplyAPYs[date][protocolName].apyBase;
            const totalSupplyUsd = supplyAPYs[date][protocolName].totalSupplyUsd;

            // Calculate the allocated capital
            const allocatedCapital = capitalAvailability * count;

            // Recalculate APY based on allocated capital
            const apyAllocated =
                (apy * totalSupplyUsd) / (totalSupplyUsd + allocatedCapital);

            sumAPY += apyAllocated;
            count++;
        }

        const averageAPY = sumAPY / count;

        return {
            protocol: protocolName,
            averageAPY: averageAPY,
        };
    }

    const protocolWithHighestAPYSum = getProtocolWithHighestAPYSum(supplyAPYs);
    const benchmark = calculateAPY(protocolWithHighestAPYSum, supplyAPYs, capitalAvailability);
    console.log(benchmark);



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
