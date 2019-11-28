module.exports = async (msg) => {
    let address = await process.core.users.getAddress(msg.sender);

    if (!address) {
	address = await process.core.coin.createAddress(msg.sender);

	if (!await process.core.users.setAddress(msg.sender, address)) {
	    msg.obj.reply("Sorry, an error occured.");
	    return;
	}
    }

    msg.obj.reply("Your reusable address is: " + address);
};
