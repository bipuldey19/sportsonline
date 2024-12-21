module.exports = (bot) => {
    bot.command("start", (ctx) => {
        ctx.replyWithAnimation(
            "https://i.giphy.com/media/v1.Y2lkPTc5MGI3NjExbXNmYmMzamk3MXN3enY3MTIybXA2aTVocHppamxhd2J4b3FscGg5MiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/FT81iuXG98uwQuDLIq/giphy.gif",
            {
                caption: `🎉 **Welcome to the Live Streaming Bot!** 🎉
        
I'm here to help you catch all the **LIVE sports events** from around the world. ⚽🏀🎾

📅 **What you can do:**
- See today's live matches 🕒
- Get live streams for your favorite games 🔴
- Choose from multiple server options for the best viewing experience 🖥️

Just type /sportshub or /streamed to get started and enjoy your game! 🏅

⚠️ **Disclaimer:** This bot does not host any streams. All streams are external links. Use at your own discretion.

💬 **Important:** It may take a moment to show the results. Please be patient.

Let's get ready for some action! 🎬`,
                parse_mode: "Markdown",
            }
        );
    });
};