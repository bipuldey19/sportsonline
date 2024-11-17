const axios = require("axios");

// Utility Functions
function formatBangladeshTime(timestamp) {
    const date = new Date(parseInt(timestamp));
    const options = {
        timeZone: "Asia/Dhaka",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    };
    return date.toLocaleString("en-US", options);
}

function createSafeCallbackData(type, id, page) {
    const safeType = String(type).trim();
    const safeId = String(id).trim();
    const safePage = String(page).trim();
    
    let callbackData = '';
    switch(safeType) {
        case 'sport':
        case 'filter':
            callbackData = `${safeType}_${safeId}_${safePage}`;
            break;
        case 'match':
            callbackData = `match_${safeId}_${safePage}`;
            break;
        case 'page':
            callbackData = `page_${safeId}_${safePage}`;
            break;
        default:
            callbackData = `${safeType}_${safeId}`;
    }
    
    return callbackData.slice(0, 64);
}

// Button Creation Functions
function createSportsButtons(sports) {
    const buttons = [];
    let row = [];

    sports.forEach((sport, index) => {
        row.push({
            text: sport.name,
            callback_data: createSafeCallbackData('sport', sport.id, '1')
        });

        if ((index + 1) % 3 === 0 || index === sports.length - 1) {
            buttons.push(row);
            row = [];
        }
    });

    buttons.push([{ text: "All Matches", callback_data: createSafeCallbackData('filter', 'all', '1') }]);
    buttons.push([{ text: "Today's Matches", callback_data: createSafeCallbackData('filter', 'today', '1') }]);
    buttons.push([{ text: "🔴 Live Matches", callback_data: createSafeCallbackData('filter', 'live', '1') }]);

    return buttons;
}

function createPaginatedMatchButtons(matches, sportId, currentPage = 1) {
    const matchesPerPage = 30;
    const totalPages = Math.ceil(matches.length / matchesPerPage);
    const buttons = [];
    let row = [];

    currentPage = Math.max(1, Math.min(currentPage, totalPages));

    const startIdx = (currentPage - 1) * matchesPerPage;
    const endIdx = Math.min(startIdx + matchesPerPage, matches.length);
    const currentMatches = matches.slice(startIdx, endIdx);

    currentMatches.forEach((match, index) => {
        row.push({
            text: match.title,
            callback_data: createSafeCallbackData('match', match.id, sportId)
        });

        if ((index + 1) % 2 === 0 || index === currentMatches.length - 1) {
            buttons.push(row);
            row = [];
        }
    });

    const paginationRow = [];
    
    if (currentPage > 1) {
        paginationRow.push({
            text: "⬅️ Previous",
            callback_data: createSafeCallbackData('page', sportId, currentPage - 1)
        });
    }

    paginationRow.push({
        text: `${currentPage}/${totalPages}`,
        callback_data: 'noop'
    });

    if (currentPage < totalPages) {
        paginationRow.push({
            text: "Next ➡️",
            callback_data: createSafeCallbackData('page', sportId, currentPage + 1)
        });
    }

    if (totalPages > 1) {
        buttons.push(paginationRow);
    }

    buttons.push([{ text: "🏠 Home", callback_data: "home" }]);
    
    return buttons;
}

function createStreamButtons(sources, embedUrls, sportId) {
    const buttons = sources
        .map((source, index) => {
            if (!embedUrls[index] || embedUrls[index].length === 0) return null;

            return embedUrls[index].map((stream, streamIndex) => [
                {
                    text:
                        `${source.source.toUpperCase()} - ${streamIndex + 1}` +
                        `${stream.language ? ` (${stream.language})` : ""}` +
                        `${stream.hd ? " | HD" : ""}`,
                    url: `https://srv1.eu.org/?stream=${encodeURIComponent(
                        stream.embedUrl
                    )}`,
                },
            ]);
        })
        .filter((button) => button !== null)
        .flat();

    buttons.push([
        { text: "🔙 Back", callback_data: `back_to_matches_${sportId}` },
    ]);

    return buttons;
}

// Module Export
module.exports = (bot) => {
    // Main command handler
    bot.command("streamed", async (ctx) => {
        try {
            const response = await axios.get("https://streamed.su/api/sports");
            const sports = response.data;

            const buttons = createSportsButtons(sports);

            await ctx.reply("Choose an option:", {
                reply_markup: {
                    inline_keyboard: buttons,
                },
            });
        } catch (error) {
            console.error("Error in streamed command:", error);
            await ctx.reply("Sorry, something went wrong. Please try again.");
        }
    });

    // Sport selection handler
    bot.action(/^sport_(.+)_(\d+)$/, async (ctx) => {
        try {
            const sportId = ctx.match[1];
            const page = parseInt(ctx.match[2]) || 1;
            
            const response = await axios.get(`https://streamed.su/api/matches/${sportId}/popular`);
            const matches = response.data;
            const buttons = createPaginatedMatchButtons(matches, sportId, page);

            await ctx.editMessageText(`Popular ${sportId} matches:`, {
                reply_markup: {
                    inline_keyboard: buttons
                }
            });

            await ctx.answerCbQuery();
        } catch (error) {
            console.error("Error in sport selection:", error);
            await ctx.answerCbQuery("Sorry, something went wrong.");
        }
    });

    // Filter handlers
    bot.action(/^filter_(.+)_(\d+)$/, async (ctx) => {
        try {
            const filterType = ctx.match[1];
            const page = parseInt(ctx.match[2]) || 1;
            let response;
            let messageText;

            switch(filterType) {
                case 'all':
                    response = await axios.get("https://streamed.su/api/matches/all/popular");
                    messageText = "All Popular Matches:";
                    break;
                case 'today':
                    response = await axios.get("https://streamed.su/api/matches/all-today/popular");
                    messageText = "Today's Matches:";
                    break;
                case 'live':
                    response = await axios.get("https://streamed.su/api/matches/live/popular");
                    messageText = "🔴 Live Matches:";
                    break;
                default:
                    throw new Error("Invalid filter type");
            }

            const matches = response.data;
            const buttons = createPaginatedMatchButtons(matches, filterType, page);

            await ctx.editMessageText(messageText, {
                reply_markup: {
                    inline_keyboard: buttons
                }
            });

            await ctx.answerCbQuery();
        } catch (error) {
            console.error("Error in filter:", error);
            await ctx.answerCbQuery("Sorry, something went wrong.");
        }
    });

    // Match selection handler
    bot.action(/^match_(.+)_(.+)$/, async (ctx) => {
        try {
            const matchId = ctx.match[1];
            const sportId = ctx.match[2];

            const response = await axios.get(`https://streamed.su/api/matches/${sportId}/popular`);
            const match = response.data.find(m => m.id === matchId);

            if (!match) {
                await ctx.answerCbQuery("Match not found!");
                return;
            }

            const streamPromises = match.sources.map(source => 
                axios.get(`https://streamed.su/api/stream/${source.source}/${source.id}`)
                    .then(response => response.data)
                    .catch(() => [])
            );

            const streamResponses = await Promise.all(streamPromises);

            if (streamResponses.every(response => response.length === 0)) {
                await ctx.answerCbQuery("No available servers for this match!", {show_alert: true});
                return;
            }

            let messageText = `<b>${match.title}</b>\n` +
                             `📅 ${formatBangladeshTime(match.date)}`;

            if (match.poster) {
                messageText = `${messageText}<a href="https://streamed.su${match.poster}">&#8205;</a>`;
            }

            const buttons = createStreamButtons(match.sources, streamResponses, sportId);

            await ctx.editMessageText(messageText, {
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: buttons
                }
            });

            await ctx.answerCbQuery();
        } catch (error) {
            console.error("Error in match selection:", error);
            await ctx.answerCbQuery("Sorry, something went wrong.");
        }
    });

    // Pagination handler
    bot.action(/^page_(.+)_(\d+)$/, async (ctx) => {
        try {
            const sportId = ctx.match[1];
            const newPage = parseInt(ctx.match[2]);

            if (isNaN(newPage) || newPage < 1) {
                await ctx.answerCbQuery("Invalid page number");
                return;
            }

            let response;
            let messageText;

            switch(sportId) {
                case 'all':
                    response = await axios.get("https://streamed.su/api/matches/all/popular");
                    messageText = "All Popular Matches:";
                    break;
                case 'today':
                    response = await axios.get("https://streamed.su/api/matches/all-today/popular");
                    messageText = "Today's Matches:";
                    break;
                case 'live':
                    response = await axios.get("https://streamed.su/api/matches/live/popular");
                    messageText = "🔴 Live Matches:";
                    break;
                default:
                    response = await axios.get(`https://streamed.su/api/matches/${sportId}/popular`);
                    messageText = "Popular Matches:";
            }

            const matches = response.data;
            const totalPages = Math.ceil(matches.length / 30);
            
            if (newPage > totalPages) {
                await ctx.answerCbQuery("Page number out of range");
                return;
            }

            const buttons = createPaginatedMatchButtons(matches, sportId, newPage);

            await ctx.editMessageText(messageText, {
                reply_markup: {
                    inline_keyboard: buttons
                }
            });

            await ctx.answerCbQuery();
        } catch (error) {
            console.error("Error in pagination:", error);
            await ctx.answerCbQuery("An error occurred");
        }
    });

    // Back to matches handler
    bot.action(/^back_to_matches_(.+)$/, async (ctx) => {
        try {
            const sportId = ctx.match[1];
            let response;
            let messageText;

            switch(sportId) {
                case 'all':
                    response = await axios.get("https://streamed.su/api/matches/all/popular");
                    messageText = "All Popular Matches:";
                    break;
                case 'today':
                    response = await axios.get("https://streamed.su/api/matches/all-today/popular");
                    messageText = "Today's Matches:";
                    break;
                case 'live':
                    response = await axios.get("https://streamed.su/api/matches/live/popular");
                    messageText = "🔴 Live Matches:";
                    break;
                default:
                    response = await axios.get(`https://streamed.su/api/matches/${sportId}/popular`);
                    messageText = "Popular Matches:";
            }

            const matches = response.data;
            const buttons = createPaginatedMatchButtons(matches, sportId, 1);

            await ctx.editMessageText(messageText, {
                reply_markup: {
                    inline_keyboard: buttons
                }
            });

            await ctx.answerCbQuery();
        } catch (error) {
            console.error("Error returning to matches:", error);
            await ctx.answerCbQuery("Sorry, something went wrong.");
        }
    });

    // Home handler
    bot.action("home", async (ctx) => {
        try {
            const response = await axios.get("https://streamed.su/api/sports");
            const sports = response.data;

            const buttons = createSportsButtons(sports);

            await ctx.editMessageText("Choose an option:", {
                reply_markup: {
                    inline_keyboard: buttons,
                },
            });

            await ctx.answerCbQuery();
        } catch (error) {
            console.error("Error returning home:", error);
            await ctx.answerCbQuery("Sorry, something went wrong.");
        }
    });
};