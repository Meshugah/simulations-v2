const axios = require('axios');

let pools = {
    'USDC': {
        'aavev2': 'a349fea4-d780-4e16-973e-70ca9b606db2',
        'compound': 'cefa9bb8-c230-459a-a855-3b94e96acd8c',
        'euler': '61b7623c-9ac2-4a73-a748-8db0b1c8c5bc',
        'venus': '9f3a6015-5045-4471-ba65-ad3dc7c38269' // bsc
    }
};

// only store fields, timestamp, apyBaseBorrow, totalSupplyUsd, totalBorrowUsd, protocol name, utilisation rate
formatApiRequest = (data, protocolName) => {
    let formattedData = [];
    for (let i = 0; i < data.length; i++) {
        let formattedDataPoint = {};

        if (data[i]['apyBaseBorrow'] == null) {
            // console.log('apyBaseBorrow was null for ' + protocolName)
            continue;
        }

        formattedDataPoint['timestamp'] = data[i].timestamp;
        formattedDataPoint['apyBaseBorrow'] = data[i].apyBaseBorrow; // todo vignesh change this to supply
        formattedDataPoint['utilisationRate'] = data[i].totalBorrowUsd / data[i].totalSupplyUsd
        formattedDataPoint['totalBorrowUsd'] = data[i].totalBorrowUsd
        formattedDataPoint['totalSupplyUsd']  = data[i].totalSupplyUsd
        formattedDataPoint['protocolName'] = protocolName

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
    protocol1 = formatApiRequest(protocol1File.data, 'aave');
    protocol2 = formatApiRequest(protocol2File.data, 'compound');

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
            supplyAPYs[keyDate][protocol1[i].protocolName] = protocol1[i].apyBaseBorrow;
            supplyAPYs[keyDate][protocol2[i].protocolName] = protocol2[i].apyBaseBorrow;
        } else console.log('we missed one!')
    }


    console.log(supplyAPYs)
    // iterate through borrow APYs,
    // for (let date in borrowAPYs) {
    //
    //     if ( (borrowAPYs[date][lendingProvider1] < borrowAPYs[date][lendingProvider2] - 0.5) && (borrowingVault.providerDistribution[lendingProvider1] != 1) ) {
    //         borrowingVault.providerDistribution[lendingProvider1] = 1;
    //         borrowingVault.providerDistribution[lendingProvider2] = 0;
    //     } else if ( (borrowAPYs[date][lendingProvider2] < borrowAPYs[date][lendingProvider1] - 0.5) && (borrowingVault.providerDistribution[lendingProvider2] != 1) ) {
    //         borrowingVault.providerDistribution[lendingProvider1] = 0;
    //         borrowingVault.providerDistribution[lendingProvider2] = 1;
    //     }
    //
    //     borrowingVault.apyHistory[date] = {
    //         'activeProvider': borrowingVault.providerDistribution,
    //         'activeApy': borrowAPYs[date]
    //     };
    // }
})();

