module.exports = (bot) => {
    bot.command("start", (ctx) => {
        ctx.replyWithAnimation(
            "https://assets.bwbx.io/images/users/iqjWHBFdfxIU/iXqPwMMQW6Jg/v0/-999x-999.gif",
            {
                caption: `🎉 *Welcome to the Live Streaming Bot* 🎉
        
I'm here to help you catch all the *LIVE sports events* from around the world. ⚽🏀🎾

📅 *What you can do:*
- See today's live matches 🕒
- Get live streams for your favorite games 🔴
- Choose from multiple server options for the best viewing experience 🖥️

Just type /sportshub or /streamed or use to the *Menu* button to get started and enjoy your game! 🏅

⚠️ *Disclaimer:* This bot does not host any streams. All streams are external links. Use at your own discretion.

💬 *Important:* It may take a moment to show the results. Please be patient.

Let's get ready for some action! 🎬`,
                parse_mode: "Markdown",
            }
        );
    });
};