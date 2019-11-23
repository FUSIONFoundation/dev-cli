const inquirer = require('inquirer');
let Web3 = require('web3');
let web3FusionExtend = require('web3-fusion-extend');
let BN = require('bignumber.js');
let config = require("./config.json");
let provider;
provider = new Web3.providers.WebsocketProvider(config.url);
let web3 = new Web3(provider);
web3 = web3FusionExtend.extend(web3);
let account;
if (config.privatekey.indexOf('0x') === -1) {
    config.privatekey = "0x" + config.privatekey;
}
try {
    account = web3.eth.accounts.privateKeyToAccount(
        config.privatekey
    );
} catch (err) {
    console.log(err);
}
console.log(`Unlocked address: ${account.address}`);
provider.on('connect', function () {
    web3._isConnected = true;
    console.log(`Web3 Connection successful.`);
    getAllBalances();
});
provider.on('error', function (err) {
    provider.disconnect();
    console.log(`Web3 connection failed`);
});

let balances = {};
let myassets = [];
let assets = {};

formatAddress = (input) => {
    let a = input.substr(0, 7);
    return a + "..." + input.substr(input.length - 5, input.length);
}
countDecimals = function (decimals) {
    let returnDecimals = '1';
    for (let i = 0; i < decimals; i++) {
        returnDecimals += '0';
    }
    return parseInt(returnDecimals);
}

addAsset = async (asset) => {
    await web3.fsn.getAsset(asset).then(function (data) {
        assets[asset] = data;
        data.balance = balances[asset];
        balances[asset] = data;
        let balanceBN = new BN(data.balance.toString());
        let decimalsBN = new BN(countDecimals(data.Decimals).toString());
        let finalAmount = balanceBN.div(decimalsBN);

        let d = {
            name: `${data.Name} ( ${data.Symbol} ) | ${formatAddress(data.ID)} | ${finalAmount.toString()} available`,
            value: data.ID
        }
        myassets.push(d);
    })
}

getAllBalances = async () => {
    console.log('Retrieving balances and assets..');
    myassets = [];
    await web3.fsn.allInfoByAddress(account.address).then(function (r) {
        for (let asset in r.balances) {
            balances = r.balances;
            addAsset(asset);
        }
    });
    run();
}

run = async () => {
    inquirer
        .prompt([
            {
                type: 'list',
                name: 'menu',
                message: 'Select method:',
                choices: [
                    'Send Asset', 'Create Asset', 'Make Swap', 'Make Swap Random',
                ],
            },
        ])
        .then(answers => {
            if (answers.menu == "Send Asset") {
                let questions = [
                    {
                        type: 'input',
                        name: 'to',
                        message: 'Wallet Address or USAN'
                    },
                    {
                        type: 'list',
                        name: 'asset',
                        message: 'Which asset?',
                        choices: myassets
                    },
                    {
                        type: 'input',
                        name: 'amount',
                        message: 'Amount',
                        validate: function (value) {
                            var valid = !isNaN(parseFloat(value));
                            return valid || 'Please enter a valid number';
                        },
                        filter: Number
                    }
                ];

                inquirer.prompt(questions).then(answers => {
                    sendAsset(answers);
                });
            }
        });
}

makeBigNumber = function (amount, decimals) {
    // Allow .0
    if (amount.substr(0, 1) == ".") {
        let a = "0" + amount;
        amount = a;
    }
    let pieces = amount.split(".");
    let d = parseInt(decimals);
    if (pieces.length === 1) {
        amount = parseInt(amount);
        if (isNaN(amount) || amount < 0) {
            // error message
            return;
        }
        amount = new BN(amount + "0".repeat(parseInt(decimals)));
    } else if (pieces.length > 2) {
        console.log("error");
        // error message
        return;
    } else if (pieces[1].length > d) {
        console.log("error");
        return; // error
    } else {
        let dec = parseInt(pieces[1]);
        let reg = new RegExp("^\\d+$"); // numbers only
        if (isNaN(pieces[1]) || dec < 0 || !reg.test(pieces[1])) {
            console.log("error");
            return;
            // return error
        }
        dec = pieces[1];
        let declen = d - dec.toString().length;
        amount = parseInt(pieces[0]);
        if (isNaN(amount) || amount < 0) {
            console.log("error");
            // error message
            return;
        }
        amount = new BN(amount + dec + "0".repeat(parseInt(declen)));
    }
    return amount;
};

sendAsset = async (input) => {
    if (input.to.indexOf('0x') === -1 || input.length !== 42) {
        await web3.fsn.getAddressByNotation(parseInt(input.to)).then(function (r) {
            input.to = r;
        })
    }

    let amount = new BN(input.amount.toString());
    let amountBNString = amount.toString();

    amount = makeBigNumber(amountBNString, parseInt(assets[input.asset].Decimals));

    try {
        await web3.fsntx.buildSendAssetTx({
            from: account.address.toLowerCase(),
            to: input.to,
            value: amount.toString(),
            asset: input.asset,
        })
            .then(tx => {
                tx.from = account.address.toLowerCase();
                tx.chainId = parseInt(config.chainid);
                return web3.fsn
                    .signAndTransmit(tx, account.signTransaction)
                    .then(txHash => {
                        console.log(`Transaction Hash : ${txHash}`);
                    });
            });
    } catch (err) {
        console.error("buildSendAssetTx", err);
    }
}
