//Get variables from the settings.
const bot = process.settings.discord.user;
const symbol = process.settings.coin.symbol;
const decimals = process.settings.coin.decimals;
const fee = process.settings.coin.withdrawFee;
const maintainer = process.settings.meta.maintainer;
const admin = process.settings.meta.admin;

//Default help tect.
const help = `
**${symbol}-TIPBOT**

This bot is a work in progress based on the open source code available at https://github.com/walkingsteeve/tip-bot.

To run a command, either preface it with "!" ("!deposit", "!tip") or ping the bot ("<@${bot}> deposit", "<@${bot}> tip").

This bot does use decimals, and has ${decimals} decimals of accuracy. You can also use "all" instead of any AMOUNT to tip/withdraw your entire balance.

-- *!balance*
Prints your balance.

-- *!tip <@PERSON> <AMOUNT>*
Tips the person that amount of ${symbol}.

-- *!withdraw <AMOUNT> <ADDRESS>*
Withdraws AMOUNT to ADDRESS, charging a ${fee} ${symbol} fee.

-- *!deposit*
Prints your personal deposit address.

If you have any questions, feel free to ask @${admin} or @${maintainer}.

`;

module.exports = async (msg) => {
    msg.obj.author.send({
        embed: {
            description: help
        }
    });
};
