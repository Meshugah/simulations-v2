/*
Objective: to test and validate rebalancing strategies to minimize borrowing costs.

A Vault, in the end, provides the user with a certain interest rate.

To get the poolAddress, go to https://defillama.com/docs/api => pools or get request https://yields.llama.fi/pools

V0: switch 100% of fund between aave and compound if the interest rate difference is greater than 0.5%. Ignore slippage.
*/

const axios = require('axios');

let collateralAsset = 'ETH';
let borrowedAsset = 'USDC';

let chains = ['Mainnet', 'Polygon', 'Arbitrum', 'Optimism'];
// let allowedLendingProviders = ['AaveV2', 'CompoundV2'];

// let allowedLendingProviders = ['AaveV2', 'AaveV3', 'CompoundV2', 'CompoundV3',
//                             'Euler', 'Notional', 'Morpho', 'Sturdy Finance',
//                             'Radiant', '0vix', 'Hundred', 'Iron Bank',
//                             'dForce', 'WePiggy', 'Midas', 'Wing'];

let pools = {
    'USDC': {
        'aavev2': 'a349fea4-d780-4e16-973e-70ca9b606db2',
        'compound': 'cefa9bb8-c230-459a-a855-3b94e96acd8c',
        'euler': '61b7623c-9ac2-4a73-a748-8db0b1c8c5bc',
        'venus': '9f3a6015-5045-4471-ba65-ad3dc7c38269' // bsc
    }
};

timestampToDate = (timestamp) => {
    let date = new Date(timestamp.split('T')[0]);
    return date;
}

class supplyInterestRates {
    constructor(collateralAsset, borrowedAsset) {
        this.collateralAsset = collateralAsset;
        this.borrowedAsset = borrowedAsset;
    }

    formatApiRequest(data, protocolName) {
        let formattedData = [];
        for (let i = 0; i < data.length; i++) {
            let formattedDataPoint = {};

            if (data[i]['apyBaseBorrow'] == null) {
                console.log('apyBaseBorrow was null for ' + protocolName)
                continue;
            }

            formattedDataPoint['timestamp'] = data[i].timestamp;
            formattedDataPoint['apyBaseBorrow'] = data[i].apyBaseBorrow; // todo vignesh change this to supply
            formattedDataPoint['utilisationRate'] = data[i].totalBorrowUsd / data[i].totalSupplyUsd
            // formattedDataPoint['protocolName'] = protocolName

            formattedData.push(formattedDataPoint);
        }
        return formattedData;
    }



    isSameDay(timestamp1, timestamp2) {
        let date1 = timestampToDate(timestamp1);
        let date2 = timestampToDate(timestamp2);

        return {
            sameDay: date1.getFullYear() === date2.getFullYear() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getDate() === date2.getDate()}
    }

    getLiveData() {
        let url = 'https://yields.llama.fi/lendBorrow';
        let response = axios.get(url);

        return response
    }

    getHistoricData(poolAddress) {
        console.log('getting historic data for pool from defillama: ' + poolAddress)
        let url = `https://yields.llama.fi/chartLendBorrow/${poolAddress}`;
        let response = axios.get(url);

        return response;
    }
}

// not being used
rebalanceStrategy = (borroowingVault, supplyInterestRates) => {
    obj = {
        borroowingVault : borroowingVault,
        supplyInterestRates : supplyInterestRates,
        lastRebalnceDate : new Date(),
        rebalanceFrequency : 24 // in hours
    }
}

simulatedVault = (collateralAsset, collateralAmount, debtAsset, debtAmount) => {
    return {
        collateralAsset : collateralAsset,
        collateralAmount : collateralAmount,
        debtAsset : debtAsset,
        debtAmount : debtAmount,
        lendingProviders : ['aavev2', 'compound'],
        apyHistory : {},
        providerDistribution : {}
    }
}

calcAvgBorrowRate = (vault,data) => {
    let avgBorrowRate = 0;

    // loop through the lending providers
    for (let i = 0; i < vault.lendingProviders.length; i++) {
        let provider = vault.lendingProviders[i];
        avgBorrowRate += data['activeProvider'][provider] * data['activeApy'][provider];
    }

    return avgBorrowRate;
}



//-----//
// Main
let ir = new supplyInterestRates(collateralAsset, borrowedAsset);

let borrowingVault =  simulatedVault(collateralAsset,
                                        1000,
                                         borrowedAsset,
                                         4e5);

let lendingProvider1 = 'aavev2';
let lendingProvider2 = 'compound';
let lendingProvider3 = 'euler';
let lendingProvider4 = 'venus';



// Main IIFE
(async function(){
    // Call Axios API
    // let aavev2DataHistoric = await ir.getHistoricData(pools[ir.borrowedAsset][lendingProvider1]);
    // let compoundDataHistoric = await ir.getHistoricData(pools[ir.borrowedAsset][lendingProvider2]);
    // let eulerData = await ir.getHistoricData(pools[ir.borrowedAsset][lendingProvider3]);
    // let venusData = await ir.getHistoricData(pools[ir.borrowedAsset][lendingProvider4]);
    //
    //
    // console.log(compoundDataHistoric.data)
    //
    // aavev2Data = ir.formatApiRequest(aavev2DataHistoric.data.data, 'aave');
    // compoundData = ir.formatApiRequest(compoundDataHistoric.data.data, 'compound');
    // eulerData = ir.formatApiRequest(eulerData.data.data, 'euler');

    // Get Historic Data from saved file
    aavev2DataHistoric = require('./aaveData')
    compoundDataHistoric = require('./compoundData')
    // format data
    aavev2Data = ir.formatApiRequest(aavev2DataHistoric.data, 'aave');
    compoundData = ir.formatApiRequest(compoundDataHistoric.data, 'compound');



    // main
    let borrowAPYs = {};

    // loops through the 'aave data length' todo change that to the longest length param instead
    for (let i = 0,j = 0; i < aavev2Data.length, j < compoundData.length; i++, j++) {
        // skip empty fields
        if (!compoundData[i]) {
            console.log('empty data')
            continue
        }
        // if (!aavev2Data[i]) {
        //     console.log('empty data')
        //     continue
        // }


        // checks if the days match
        // todo pointers
        const {sameDay} = ir.isSameDay(aavev2Data[i].timestamp, compoundData[j].timestamp)

        // set the key with the respective timestamp, in this case the highest, as it may lag
        let date1 = this.timestampToDate(aavev2Data[i].timestamp);
        let date2 = this.timestampToDate(compoundData[j].timestamp);

        let keyDate
        if (date1.getDate() >= date2.getDate()) keyDate = timestampToDate(aavev2Data[i].timestamp)
        else if (date2.getDate() <= date1.getDate()) keyDate = timestampToDate(compoundData[j].timestamp)



        if(!sameDay){
            if(date1.getDate() >= date2.getDate()) {
                i--
            }
            if(date1.getDate() <= date2.getDate()) {
                j--
            }

        }

        else if (sameDay) {
            borrowAPYs[keyDate] = {};
            borrowAPYs[keyDate][lendingProvider1] = aavev2Data[i].apyBaseBorrow;
            borrowAPYs[keyDate][lendingProvider2] = compoundData[i].apyBaseBorrow;
        }
        else (console.log('we missed one!')
        )
    }

    borrowingVault.providerDistribution[lendingProvider1] = 0;
    borrowingVault.providerDistribution[lendingProvider2] = 0;

    for (let date in borrowAPYs) {

        // todo show that moving it is actually a good decision
        // not a binary move, greedy
        // yield maximization, backtest
        // no threshold

        if ( (borrowAPYs[date][lendingProvider1] < borrowAPYs[date][lendingProvider2] - 0.5) && (borrowingVault.providerDistribution[lendingProvider1] != 1) ) {
            borrowingVault.providerDistribution[lendingProvider1] = 1;
            borrowingVault.providerDistribution[lendingProvider2] = 0;
        } else if ( (borrowAPYs[date][lendingProvider2] < borrowAPYs[date][lendingProvider1] - 0.5) && (borrowingVault.providerDistribution[lendingProvider2] != 1) ) {
            borrowingVault.providerDistribution[lendingProvider1] = 0;
            borrowingVault.providerDistribution[lendingProvider2] = 1;
        }

        borrowingVault.apyHistory[date] = {
            'activeProvider': borrowingVault.providerDistribution,
            'activeApy': borrowAPYs[date]
        };
    }

    /*
        Calculate the total interest paid by the vault
    */

    endDate = new Date();

    // sum up borrowingVault.apyHistory rates
    let accumulatedInterest = 0;
    let totalDayCount = 0;
    for (date in borrowingVault.apyHistory) {
        currentDate = new Date(date);
        if (currentDate <= endDate) {
            totalDayCount += 1;
            accumulatedInterest += calcAvgBorrowRate(borrowingVault,borrowingVault.apyHistory[date]) / 100;
        }
    }

    let totalInterestPaid = borrowingVault.debtAmount * accumulatedInterest / 365;

    console.log('The borrowing vault rebalanced', borrowingVault.debtAmount,
                borrowingVault.debtAsset, 'for', totalDayCount, 'days');
    console.log('Total interest paid', totalInterestPaid, borrowingVault.debtAsset);

    /*
    - how much total interest paid with rebalancing
    - how much total interest paid with aavev2
    - how much total interest paid with compound
    */

})();

// todo vignesh
//  add utilization rate to the date streamed in

// todo vignesh find what that extra param is
