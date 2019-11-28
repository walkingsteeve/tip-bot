const BN = require("bignumber.js");
const mysql = require("promise-mysql");
let pool;

//Definition of the table: `name VARCHAR(64), address VARCHAR(64), balance VARCHAR(64), notify tinyint(1)`.

const table = process.settings.mysql.tips;

const getPool = async () => {
    if (!pool) {
	pool = await mysql.createPool({
	    host: "localhost",
            database: process.settings.mysql.db,
            user: process.settings.mysql.user,
            password: process.settings.mysql.pass
	});
    }
    return pool;
};

const query = async function (q, args) {
    const resultPacket = await (await getPool()).query(q, args);
    if (resultPacket.errno) {
	throw "Error result:" + resultPacket.message;
    }

    return resultPacket;
};

const tryQuery = async function (q, args) {
    try {
	const result = await query(q, args);
	return result;
    }
    catch (err){
	console.error("Query [" + q + "[" + args + "]] failed with: " + err);
	return null;
    }
};

const setNotified = async (user) => {
    const result = await tryQuery("UPDATE " + table + " SET notify = ? WHERE name = ?", [0, user]);
    return result ? result.affectedRows : null;
};

const setBalance = async (user, balance) => {
    const result = await tryQuery("UPDATE " + table + " SET balance = ? WHERE name = ?", [balance, user]);
    return result ? result.affectedRows : null;
};

const setAddress = async (user, address) => {
    const result = await tryQuery("UPDATE " + table + " SET address = ? WHERE name = ?", [address, user]);
    return result ? result.affectedRows : null;
};

const createUser = async (user) => {
    const result = await tryQuery("INSERT INTO " + table + " VALUES(?, ?, ?, ?)", [user, "", "0", 1]);
    return result ? result.affectedRows : null;
};

const getUser = async (user) => {
    const qstring = "SELECT * FROM " + table + " WHERE name = ?";
    const packet = await tryQuery(qstring, [user]);
    return packet ? packet[0] : null;
}

const getUsers = async () => {
    let users = {};
    const rows = await query("SELECT * FROM " + table);

    if (rows) {
	for (let row of rows) {
	    users[row.name] = {
		address: row.address !== "" ? row.address : false,
		balance: BN(row.balance),
		notify: row.notify > 0
	    }
	}
    }
    
    return users;
};

module.exports = {
    getUsers: getUsers,
    getUser: getUser,

    createUser: createUser,

    setNotified: setNotified,
    setBalance: setBalance,
    setAddress: setAddress
};
