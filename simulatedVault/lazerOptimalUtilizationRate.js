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
    switch (type) {
        case 'default':
            utilisationRate = protocol.utilisationRate
            break
        case 'balance':
            utilisationRate = protocol.totalBorrowUsd/(protocol.totalSupplyUsd + obj.amount)
            break
    }
// 0.35550774565144816


    if(utilisationRate>0.9) console.log('meme')
    // calculation for under optimal utilisation
    rate = (baseAPY + utilisationRate*0.04) * 100
    return rate
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

    console.log(protocol1)
    console.log(protocol2)

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


    console.log(Object.keys(supplyAPYs).length)
    // iterate through supply APYs,
    for (let date in supplyAPYs) {
        let {protocol1, protocol2} = supplyAPYs[date]
        console.log(protocol1, protocol2)

        // sort a list of apys in an object based on their apy decending, and keep the apy minimal stored as we want to bring the higher apy down by providing the supply there
        apyList = []

        // to store the amount of apy after our capital is stored
        balancedApyProtocol1 = 0
        balancedApyProtocol2 = 0

        // hardcoded for usdc, can be fixed or variable slope, using variable slope here
        apyProtocol1 = calculateApyVariable(protocol1)
        apyProtocol2 = calculateApyVariable(protocol2)



        // capital required to get the apys balanced
        if(apyProtocol1 < apyProtocol2){
            // bring down apyProtocol2 to apyprotocol1's level
            balancedApyProtocol2 = calculateApyVariable(protocol2, 'balance', {amount: 4000000, lowestApy: apyProtocol1})
            balancedApyProtocol1 = apyProtocol1
            console.log('apyProtocol1 is lower')
        } else {
            // bring down apyProtocol2 to apyprotocol1's level
            balancedApyProtocol1 = calculateApyVariable(protocol2, 'balance', {amount: 4000000, lowestApy: apyProtocol1})
            balancedApyProtocol2 = apyProtocol2
            console.log('apyProtocol2 is lower')
        }


        // compare
        console.log(apyProtocol1, apyProtocol2)
        console.log(balancedApyProtocol1, balancedApyProtocol2)




        // if ( (borrowAPYs[date][lendingProvider1] < borrowAPYs[date][lendingProvider2] - 0.5) && (borrowingVault.providerDistribution[lendingProvider1] != 1) ) {
        //     borrowingVault.providerDistribution[lendingProvider1] = 1;
        //     borrowingVault.providerDistribution[lendingProvider2] = 0;
        // } else if ( (borrowAPYs[date][lendingProvider2] < borrowAPYs[date][lendingProvider1] - 0.5) && (borrowingVault.providerDistribution[lendingProvider2] != 1) ) {
        //     borrowingVault.providerDistribution[lendingProvider1] = 0;
        //     borrowingVault.providerDistribution[lendingProvider2] = 1;
        // }
        //
        // borrowingVault.apyHistory[date] = {
        //     'activeProvider': borrowingVault.providerDistribution,
        //     'activeApy': borrowAPYs[date]
        // };
    }
})();

