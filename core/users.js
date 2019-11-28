const db = require('./db.js');
const BN = require("bignumber.js");

BN.config({
    ROUNDING_MODE: BN.ROUND_DOWN,
    EXPONENTIAL_AT: process.settings.coin.decimals + 1
});

//RAM cache of users.
var users;

//Array of every handled TX hash.
var handled;


//Checks an amount for validity.
const checkAmount = (amount, getErrorCb) => {
    if (!getErrorCb) getErrorCb = (str) => {};
    
    //If the amount is invalid...
    if (amount.isNaN()) {
	getErrorCb("Amount must be a number.");
        return false;
    }

    const minAmount = BN(10).exponentiatedBy(-process.settings.coin.decimals);

    // If the amount is smaller than the configured minimum amount
    if (amount.isLessThan(minAmount)) {
	getErrorCb("Amount must be at least " + minAmount.toString() + ".");
	return false;
    }

    return true;
}

//Creates a new user.
async function create(user) {
    //If the user already exists, return.
    if (users[user]) {
        return true;
    }

    //Create the new user, with a blank address, balance of 0, and the notify flag on.
    const result = await db.createUser(user);

    if (result) {
	console.log("Created user", result);
    
	//Create the new user in the RAM cache, with a status of no address, balance of 0, and the notify flag on.
	users[user] = {
            address: false,
            balance: BN(0),
            notify: true
	};
    }

    return result;
}

//Sets an user's address.
async function setAddress(user, address) {
    //If they already have an address, return.
    if (typeof(users[user].address) === "string") {
        return true;
    }

    //Update the db with the address.
    const result = await db.setAddress(user, address);
    
    if (result) {

	//Update the RAM cache.
	users[user].address = address;
    }
    
    return result;
}

//Adds to an user's balance.
async function addBalance(user, amount) {
    //Return false if the amount is invalid.
    if (!checkAmount(amount, (err) => { apiError = err; })) {
        return false;
    }

    //Add the amount to the balance.
    var balance = users[user].balance.plus(amount);
    //Convert the balance to the coin's smallest unit.
    balance = balance.toFixed(process.settings.coin.decimals);

    //Update the db with the new balance
    const result = await db.setBalance(user, balance);
    
    if (result) {

	//Update the RAM cache with a BN.
	users[user].balance = BN(balance);
    }
    
    return result;
}

//Subtracts from an user's balance.
async function subtractBalance(user, amount) {
    //Return false if the amount is invalid.
    if (!checkAmount(amount, (err) => { apiError = err; })) {
        return false;
    }

    //Subtracts the amount from the balance.
    var balance = users[user].balance.minus(amount);
    //Return false if the user doesn't have enough funds to support subtracting the amount.
    if (balance.lt(0)) {
	apiError = "No sufficient balance.";
        return false;
    }

    //Convert the balance to the coin's smallest unit.
    balance = balance.toFixed(process.settings.coin.decimals);

    //Update the db with the new balance
    const result = await db.setBalance(user, balance);

    if (result) {

	//Update the RAM cache with a BN.
	users[user].balance = BN(balance);
	return true;
    }
    
    return result;
}

//Updates the notify flag.
async function setNotified(user) {

    //Update the db with a turned off notify flag.
    const result = db.setNotified(user);
    
    if (result) {

	//Update the RAM cache.
	users[user].notify = false;
    }
    
    return result;
}

//Returns an user's address.
function getAddress(user) {
    return users[user].address;
}

//Returns an user's balance
function getBalance(user) {
    return users[user].balance;
}

//Returns an user's notify flag.
function getNotify(user) {
    return users[user].notify;
}

module.exports = async () => {

    //Init the RAM cache.
    users = await db.getUsers();

    //Init the handled array.
    handled = [];

    //Iterate over the existing users
    for (let user of Object.values(users)) {

        //Get this user's existing TXs.
        var txs = await process.core.coin.getTransactions(user.address);

        //Iterate over each, and push their hashes so we don't process them again.
        var x;
        for (x in txs) {
            handled.push(txs[x].txid);
        }
    }

    //Make sure all the pools have accounts.
    for (i in process.settings.pools) {
        //Create an account for each. If they don't have one, this will do nothing.
        await create(i);
    }

    //Return all the functions.
    return {
        create: create,

        setAddress: setAddress,
        addBalance: addBalance,
        subtractBalance: subtractBalance,
        setNotified: setNotified,

	getAddress: getAddress,
	getBalance: getBalance,
	getNotify: getNotify
    };
};

//Every thirty seconds, check the TXs of each user.
setInterval(async () => {
    for (var user in users) {
        //If that user doesn't have an address, continue.
        if (users[user].address === false) {
            continue;
        }

        //Declare the amount deposited.
        var deposited = BN(0);
        //Get the TXs.
        var txs = await process.core.coin.getTransactions(users[user].address);

        //Iterate over the TXs.
        for (var i in txs) {
            //If we haven't handled them...
            if (handled.indexOf(txs[i].txid) === -1) {
                //Add the TX value to the deposited amount.
                deposited = deposited.plus(BN(txs[i].amount));
                //Push the TX ID so we don't handle it again.
                handled.push(txs[i].txid);
            }
        }

        await addBalance(user, deposited);
    }
}, 30 * 1000);
