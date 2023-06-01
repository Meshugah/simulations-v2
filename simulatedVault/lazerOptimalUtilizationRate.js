const axios = require('axios');

let pools = {
    'USDC': {
        'aavev2': 'a349fea4-d780-4e16-973e-70ca9b606db2',
        'compound': 'cefa9bb8-c230-459a-a855-3b94e96acd8c',
        'euler': '61b7623c-9ac2-4a73-a748-8db0b1c8c5bc',
        'venus': '9f3a6015-5045-4471-ba65-ad3dc7c38269' // bsc
    }
};

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
            utilisationRate = protocol.totalBorrowUsd/(protocol.totalSupplyUsd + obj.amount)
            break
    }
// 0.35550774565144816

    if(utilisationRate>0.9) console.log('Highutilisation!')
    // calculation for under optimal utilisation
    rate = (baseAPY + utilisationRate*0.04) * 100
    // console.log('rate:', rate)

    // // only calulate target amount required for rebalance if type is 'balance', use that target to 'flatten' the higher APY, and get back the lower APY.
    switch (type) {
        case 'default':
            break
        case 'balance':
            // leftover amount to get to normal, substituting rate's formula with utilisation rate. solving for this
            targetAmount = 0.04 * protocol.totalBorrowUsd / ((obj.lowestApy) / 100 - baseAPY) - protocol.totalSupplyUsd - obj.amount
            break
        case 'flatten':
            // we've only allocated capital towards supply. updating this and returning this
            let currentSupplyUsd = protocol.totalSupplyUsd - obj.amount
            current = {
                // store the values that are current to this method
                supplyUsd : currentSupplyUsd,
                borrowUsd : protocol.totalBorrowUsd,
                utilisationRate: protocol.totalBorrowUsd/currentSupplyUsd
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
    return {rate, targetAmount, current, obj}
}

// only store fields, timestamp, apyBase, totalSupplyUsd, totalBorrowUsd, protocol name, utilisation rate
formatApiRequest = (data, protocolName, assetName) => {
    let formattedData = [];
    for (let i = 0; i < data.length; i++) {
        let formattedDataPoint = {};

        if (data[i]['apyBaseBorrow'] == null) {
            // console.log('apyBaseBorrow was null for ' + protocolName)
            continue;
        }

        formattedDataPoint['timestamp'] = data[i].timestamp;
        formattedDataPoint['apyBase'] = data[i].apyBase;
        formattedDataPoint['utilisationRate'] = data[i].totalBorrowUsd / data[i].totalSupplyUsd
        formattedDataPoint['totalBorrowUsd'] = data[i].totalBorrowUsd
        formattedDataPoint['totalSupplyUsd']  = data[i].totalSupplyUsd
        formattedDataPoint['protocolName'] = protocolName
        formattedDataPoint['assetName'] = assetName;


        formattedData.push(formattedDataPoint);
    }
    return formattedData;
}

timestampToDate = (timestamp) => {
    let date = new Date(timestamp.split('T')[0]);
    return date;
}

isSameDay = (timestamp1, timestamp2) => {
    let date1 = timestampToDate(timestamp1);
    let date2 = timestampToDate(timestamp2);

    return {
        sameDay: date1.getFullYear() === date2.getFullYear() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getDate() === date2.getDate()}
}

getHistoricData = (poolAddress) => {
    console.log('getting historic data for pool from defillama: ' + poolAddress)
    let url = `https://yields.llama.fi/chartLendBorrow/${poolAddress}`;
    let response = axios.get(url);

    return response;
}

// Main IIFE
(async function() {
    // Get Historic Data from saved file
    protocol1File = require('./aaveData')
    protocol2File = require('./compoundData')

    // format data into only categories we require
    protocol1 = formatApiRequest(protocol1File.data, 'aave', 'usdc'); // todo change to accept pools
    protocol2 = formatApiRequest(protocol2File.data, 'compound', 'usdc');

    // console.log(protocol1)
    // console.log(protocol2)

    // borrow APY
    let supplyAPYs = {};

    // formatting for unbalanced lists from defillama
    for (let i = 0,j = 0; i < protocol1.length, j < protocol2.length; i++, j++) {
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
        const {sameDay} = isSameDay(protocol1[i].timestamp, protocol2[j].timestamp)

        // set the key with the respective timestamp, in this case the highest, as it may lag
        let date1 = this.timestampToDate(protocol1[i].timestamp);
        let date2 = this.timestampToDate(protocol2[j].timestamp);

        let keyDate
        if (date1.getDate() >= date2.getDate()) keyDate = timestampToDate(protocol1[i].timestamp)
        else if (date2.getDate() <= date1.getDate()) keyDate = timestampToDate(protocol2[j].timestamp)


        if (!sameDay) {
            if (date1.getDate() >= date2.getDate()) {
                i--
            }
            if (date1.getDate() <= date2.getDate()) {
                j--
            }

        } else if (sameDay) {
            supplyAPYs[keyDate] = {};
            supplyAPYs[keyDate].protocol1 = protocol1[i];
            supplyAPYs[keyDate].protocol2 = protocol2[i];
        } else console.log('we missed one!')
    }


    // console.log(Object.keys(supplyAPYs).length)
    // iterate through supply APYs,
    for (let date in supplyAPYs) {
        let {protocol1, protocol2} = supplyAPYs[date]
        // console.log(protocol1, protocol2)

        // sort a list of apys in an object based on their apy decending, and keep the apy minimal stored as we want to bring the higher apy down by providing the supply there
        apyList = []

        // to store the amount of apy after our capital is stored
        balancedApyProtocol1 = 0
        balancedApyProtocol2 = 0

        // to store the lowest APY possible when deploying all capital into the largest strategy
        lowestApy = 0

        // hardcoded for usdc, can be fixed or variable slope, using variable slope here
        const {rate: apyProtocol1} = calculateApyVariable(protocol1)
        const {rate: apyProtocol2} = calculateApyVariable(protocol2)

        // main, capital deployed as a total
        let capitalDeployed = 200000000
        // capitalDeployed = 10000000 -1352513.295011282

        // capital required to get the apys balanced
        if (apyProtocol1 < apyProtocol2) {
            // bring down apyProtocol2 to apyprotocol1's level
            returnObj = calculateApyVariable(protocol2, 'balance', {amount: capitalDeployed, lowestApy: apyProtocol1})
            balancedApyProtocol2 = returnObj.rate
            rebalanceAmount = returnObj.targetAmount

            balancedApyProtocol1 = apyProtocol1
            console.log('apyProtocol1 is lower')
        } else {
            continue
            // bring down apyProtocol1 to apyprotocol2's level
            returnObj = calculateApyVariable(protocol1, 'balance', {amount: 10000000, lowestApy: apyProtocol2})
            balancedApyProtocol1 = returnObj.rate
            rebalanceAmount = returnObj.targetAmount
            balancedApyProtocol2 = apyProtocol2
            console.log('apyProtocol2 is lower')
        }

        // todo vignesh get back the amount from that function and then return it as an amount.
        //  now you need to return the value, if it's positive, then that's an amount I need to return
        //  now if it's negative, I have that amount to balance.
        //  I have a utilisation rate that I need to calculate and redistribute capital to these protocols
        //  how do i do that? I think If i sort utilization rates descending, then I should have the protocol that I want to allocate to.

        // Risk: Higher utilization rates can indicate that more funds have been borrowed from the protocol. This suggests a higher demand for borrowing and potentially higher usage of the protocol. However, it may also imply a higher risk of default if borrowers are unable to repay their loans. If you prefer a lower risk profile, you might choose the protocol with a lower utilization rate.
        //
        // Earnings Stability: Lower utilization rates might suggest that the protocol has more available funds for lending, potentially leading to a more stable earning environment. With lower competition for borrowing, you may have a higher likelihood of consistently earning the stated APR. However, keep in mind that a lower utilization rate may also mean lower overall returns.
        //
        // Liquidity and Availability: Higher utilization rates indicate a more active lending and borrowing market within the protocol. This could translate into better liquidity for your deposited funds, making it easier to lend or withdraw when needed. Conversely, a lower utilization rate might mean your funds might be less readily available for borrowing or withdrawal.
        //
        // Platform Preferences: Consider any additional features, security measures, user experience, or community reputation associated with each protocol. These factors may influence your decision and should be taken into account alongside utilization rates.
        //
        // In summary, when the APRs are the same, it is important to assess your risk tolerance, desired earnings stability, liquidity needs, and platform preferences to determine whether depositing into a protocol with a higher or lower utilization rate aligns better with your objectives.
        //
        // Maximise returns by sticking in yield to provide returns. maybe I can just call the functions recursively

        // todo check why aave is not coming up in the protocol names


        // this is only for  if (apyProtocol1 < apyProtocol2) { // todo vignesh add the opposite case
        // basically, if it's in a rebalance case, if it doesnt cross this threshold, it's just max allocation into max APY lending market
        if (rebalanceAmount < 0) {
            // allocate capital in both so that APY is maximal
            // so let's run it again and get the utilisation rates this time
            if (apyProtocol1 < apyProtocol2) {
                // bring down apyProtocol2 to apyprotocol1's level
                returnObj = calculateApyVariable(protocol2, 'flatten', {
                    amount: capitalDeployed + rebalanceAmount,
                    lowestApy: apyProtocol1,
                    otherProtocol: protocol1
                })
                balancedApyProtocol2 = returnObj.rate
            }


        }

        // compare
        console.log(apyProtocol1, apyProtocol2)
        console.log(balancedApyProtocol1, balancedApyProtocol2)
        console.log(rebalanceAmount)


        console.log(returnObj)

        // ideal allocation between the protocols
        // Current APYs for each protocol
        // const currentAPYProtocolA = returnObj.rate; // Current APY for Protocol A
        // const currentAPYProtocolB = returnObj.rate; // Current APY for Protocol B
        //
        // // Function to calculate the maximum possible desired APY based on current APYs
        // function calculateMaxDesiredAPY(currentAPYProtocolA, currentAPYProtocolB, utilizationRateProtocolA, utilizationRateProtocolB) {
        //     // Calculate the maximum desired APYs based on the current APYs
        //     const maxDesiredAPYProtocolA = currentAPYProtocolA / utilizationRateProtocolA;
        //     const maxDesiredAPYProtocolB = currentAPYProtocolB / utilizationRateProtocolB;
        //
        //     // Calculate the maximum possible desired APY
        //     // Return the maximum possible desired APY // todo vignesh
        //     return Math.min(maxDesiredAPYProtocolA, maxDesiredAPYProtocolB);
        // }
        //
        // // Utilization rates for each protocol
        // const utilizationRateProtocolA = returnObj.current.utilisationRate; // Utilization rate for Protocol A
        // const utilizationRateProtocolB = returnObj.obj.otherProtocol.utilisationRate; // Utilization rate for Protocol B
        //
        // // Call the function to get the maximum possible desired APY
        // const maxDesiredAPY = calculateMaxDesiredAPY(currentAPYProtocolA, currentAPYProtocolB, utilizationRateProtocolA, utilizationRateProtocolB);


        // this is allocation if the total amount is not used, and just the extra amount to balance
        // Constants
        const currentAPYProtocolA = apyProtocol1; // Current APY for each protocol
        const currentAPYProtocolB = apyProtocol2; // Current APY for each protocol
        const capitalAvailability = Math.abs(capitalDeployed); // Capital availability towards the total supply
        const utilizationRateProtocolA = returnObj.current.utilisationRate; // Utilization rate for Protocol A
        const utilizationRateProtocolB = returnObj.obj.otherProtocol.utilisationRate; // Utilization rate for Protocol B
        const totalSupplyProtocolA = returnObj.current.supplyUsd; // Total supply for Protocol A
        const totalSupplyProtocolB = returnObj.obj.otherProtocol.totalSupplyUsd; // Total supply for Protocol B

// Function to calculate the highest APY and allocation amounts
        console.log(apyProtocol1, apyProtocol2)
        function calculateHighestAPYAndAllocation(currentAPYProtocolA, currentAPYProtocolB, capitalAvailability, utilizationRateProtocolA, utilizationRateProtocolB, totalSupplyProtocolA, totalSupplyProtocolB) {
            let highestAPY = 0;
            let allocationProtocolA = 0;
            let allocationProtocolB = 0;
            let benchmarkAPY = 0;

            for (let amountProtocolA = 0; amountProtocolA <= capitalAvailability; amountProtocolA += 1000) {
                const amountProtocolB = capitalAvailability - amountProtocolA;
                const apyProtocolA = currentAPYProtocolA * (amountProtocolA / (totalSupplyProtocolA * utilizationRateProtocolA));
                const apyProtocolB = currentAPYProtocolB * (amountProtocolB / (totalSupplyProtocolB * utilizationRateProtocolB));
                const totalAPY = apyProtocolA + apyProtocolB;

                if (totalAPY > highestAPY) {
                    highestAPY = totalAPY;
                    allocationProtocolA = amountProtocolA;
                    allocationProtocolB = amountProtocolB;
                }

                if (amountProtocolA === capitalAvailability) {
                    benchmarkAPY = Math.max(currentAPYProtocolA, currentAPYProtocolB);
                }
            }

            // Return the highest APY, allocation amounts, and benchmark APY
            return { highestAPY, allocationProtocolA, allocationProtocolB, benchmarkAPY };
        }

        // Call the function to get the highest APY, allocation amounts, and benchmark APY
        const result = calculateHighestAPYAndAllocation(currentAPYProtocolA, currentAPYProtocolB, capitalAvailability, utilizationRateProtocolA, utilizationRateProtocolB, totalSupplyProtocolA, totalSupplyProtocolB);

        // Output the results
        console.log("Highest APY:", result.highestAPY);
        console.log("Allocation for Protocol A:", result.allocationProtocolA);
        console.log("Allocation for Protocol B:", result.allocationProtocolB);

        benchmark = (currentAPY, capital, utilizationRate, totalSupply) => {
            const apy = currentAPY * (capital / (totalSupply * utilizationRate));
            return apy;
        }

        console.log("Benchmark APY (if all capital in one protocol):", benchmark(apyProtocol1>apyProtocol2?apyProtocol1:apyProtocol2, capitalAvailability, apyProtocol1>apyProtocol2?utilizationRateProtocolA:utilizationRateProtocolB, apyProtocol1>apyProtocol2?totalSupplyProtocolA:totalSupplyProtocolB));





        console.log('------------')
    }
})();

// add gas costs for each transaction, withdraw.

// ICP
// Acquisition
// Activation
// Revenue
// Retention
// Referral (ask for referrals, top thing to do)

// Cac to CLTV
// Good ratio is CLTV
// 4:1 is great, 3:1 is good

// i need to be in a country where i can do client dinners

