const inquirer = require('inquirer');
let Web3 = require('web3');
let web3FusionExtend = require('web3-fusion-extend');
let provider;
provider = new Web3.providers.WebsocketProvider('wss://testnetpublicgateway1.fusionnetwork.io:10001');
let web3 = new Web3(provider);
web3 = web3FusionExtend.extend(web3);

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
let assets = [];

addAsset = async (asset) => {
    await web3.fsn.getAsset(asset).then(function(data){
        assets[asset] = data;
    })
}

getAllBalances = async () => {
    console.log('Retrieving balances and assets..');
    await web3.fsn.allInfoByAddress("").then(function(r){
        for(let asset in r.balances){
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
                        name: 'size',
                        message: 'Which asset?',
                        choices: [
                            {
                                name: 'Pepperoni and cheese',
                                value: 'PepperoniCheese'
                            },
                            {
                                name: 'All dressed',
                                value: 'alldressed'
                            },
                            {
                                name: 'Hawaiian',
                                value: 'hawaiian'
                            }
                        ],
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
                    console.log('\nTransaction Hash:');
                    console.log(JSON.stringify(answers, null, '  '));
                });
            }
        });
}
