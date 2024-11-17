const axios = require("axios");
const cheerio = require("cheerio");

// Store matches data globally
let matchUrlMap = new Map();
let allMatches = [];
let currentPage = new Map();
let urlCounter = 1;

// Helper functions
function getShortId(url) {
  for (let [id, storedUrl] of matchUrlMap.entries()) {
    if (storedUrl === url) return id;
  }
  const id = urlCounter.toString();
  matchUrlMap.set(id, url);
  urlCounter++;
  return id;
}

async function fetchSporthubMatches() {
  try {
    const response = await axios.get("https://soccer8.sportshub.stream/");
    const $ = cheerio.load(response.data);

    // Reset all matches
    allMatches = [];

    // First get top matches as a special section
    const topMatches = {
      date: "Top Matches",
      matches: [],
    };

    $("ul.row.list-top-events li").each((_, element) => {
      const matchTitle = $(element).find("span.mr-5").text().trim();
      let matchUrl = $(element).find("a").attr("href");
      const isLive = $(element).find("span.live-label").length > 0;
      const score = $(element).find("span.d-flex").text().trim();

      if (matchTitle && matchUrl) {
        matchUrl = encodeURI(decodeURI(matchUrl));
        let displayTitle = isLive
          ? `🔴 ${matchTitle}${score ? ` (${score})` : ""}`
          : matchTitle;

        topMatches.matches.push({
          title: displayTitle,
          url: matchUrl,
        });
      }
    });

    allMatches.push(topMatches);

    // Then get matches by date
    let currentDateMatches = null;

    $("ul.row.list-events > li").each((_, element) => {
      const dateHeader = $(element).find("li.col-xs-12.events-date h4");

      if (dateHeader.length > 0) {
        // If we have matches from previous date, save them
        if (currentDateMatches && currentDateMatches.matches.length > 0) {
          allMatches.push(currentDateMatches);
        }

        // Start new date group
        currentDateMatches = {
          date: dateHeader.text().trim(),
          matches: [],
        };
      } else {
        if (currentDateMatches) {
          const matchTitle = $(element).find("span.mr-5").text().trim();
          let matchUrl = $(element).find("a").attr("href");
          const isLive = $(element).find("span.live-label").length > 0;
          const score = $(element).find("span.d-flex").text().trim();

          if (matchTitle && matchUrl) {
            matchUrl = encodeURI(decodeURI(matchUrl));
            let displayTitle = isLive
              ? `🔴 ${matchTitle}${score ? ` (${score})` : ""}`
              : matchTitle;

            currentDateMatches.matches.push({
              title: displayTitle,
              url: matchUrl,
            });
          }
        }
      }
    });

    // Save the last date's matches
    if (currentDateMatches && currentDateMatches.matches.length > 0) {
      allMatches.push(currentDateMatches);
    }

    return allMatches;
  } catch (error) {
    console.error("Error fetching Sporthub matches:", error);
    return [];
  }
}

async function sendMatchesPage(ctx, editMessage = false) {
  const matches = await fetchSporthubMatches();
  if (matches.length === 0) {
    await ctx.reply("No matches found on Sporthub.");
    return;
  }

  const userPage = currentPage.get(ctx.from.id) || 0;
  const MATCHES_PER_PAGE = 30;

  // Get current date section
  let currentDateIndex = 0;
  let matchStart = 0;

  if (userPage > 0) {
    // Skip top matches page
    currentDateIndex = 1;
    let totalMatches = 0;

    // Find which date section we're in
    while (currentDateIndex < matches.length) {
      const dateMatches = matches[currentDateIndex].matches.length;
      if (totalMatches + dateMatches > (userPage - 1) * MATCHES_PER_PAGE) {
        matchStart = (userPage - 1) * MATCHES_PER_PAGE - totalMatches;
        break;
      }
      totalMatches += dateMatches;
      currentDateIndex++;
    }
  }

  let messageText = "";
  let buttons = [];

  if (userPage === 0) {
    // Show top matches
    messageText = "🔝 *Today's Top Matches:*\n";
    matches[0].matches.forEach((match) => {
      buttons.push([
        {
          text: match.title,
          callback_data: `sh_${getShortId(match.url)}`,
        },
      ]);
    });
  } else {
    // Show date matches
    const dateSection = matches[currentDateIndex];
    messageText = `📅 *${dateSection.date}:*\n`;

    // Get matches for this page
    const pageMatches = dateSection.matches.slice(
      matchStart,
      matchStart + MATCHES_PER_PAGE
    );

    // Arrange matches in 2 columns
    for (let i = 0; i < pageMatches.length; i += 2) {
      const row = [];
      row.push({
        text: pageMatches[i].title,
        callback_data: `sh_${getShortId(pageMatches[i].url)}`,
      });

      if (pageMatches[i + 1]) {
        row.push({
          text: pageMatches[i + 1].title,
          callback_data: `sh_${getShortId(pageMatches[i + 1].url)}`,
        });
      }
      buttons.push(row);
    }
  }

  // Add navigation buttons
  const navButtons = [];

  // Add Home button at the very bottom separately
  const homeButton = [{ text: "🏠 Home", callback_data: "back_to_matches" }];

  // Calculate total number of pages
  let totalPages = 1; // Start with 1 for top matches page
  let totalMatches = 0;
  for (let i = 1; i < matches.length; i++) {
    totalMatches += matches[i].matches.length;
  }
  totalPages += Math.ceil(totalMatches / MATCHES_PER_PAGE);

  if (userPage === 0) {
    // On top matches page, only show Next if there are more matches
    if (matches.length > 1) {
      navButtons.push(
        { text: `1/${totalPages}`, callback_data: "page_info" },
        { text: "Next ➡️", callback_data: "next_page" }
      );
      buttons.push(navButtons);
    }
  } else {
    // On regular pages
    const currentSection = matches[currentDateIndex];
    const remainingInSection =
      currentSection.matches.length - (matchStart + MATCHES_PER_PAGE);
    const hasMoreDates = currentDateIndex < matches.length - 1;

    // Add Previous button
    navButtons.push({ text: "⬅️ Previous", callback_data: "prev_page" });

    // Add page number
    navButtons.push({
      text: `${userPage + 1}/${totalPages}`,
      callback_data: "page_info",
    });

    // Only add Next button if not on the last page
    if (userPage + 1 < totalPages) {
      navButtons.push({ text: "Next ➡️", callback_data: "next_page" });
    }

    // Add navigation buttons if there are any
    if (navButtons.length > 0) {
      buttons.push(navButtons);
    }

    // Always add Home button at the very bottom for regular pages
    buttons.push(homeButton);
  }

  const messageOptions = {
    reply_markup: {
      inline_keyboard: buttons,
    },
    parse_mode: "Markdown",
  };

  if (editMessage) {
    await ctx.editMessageText(messageText, messageOptions);
  } else {
    await ctx.reply(messageText, messageOptions);
  }
}

// Main module export
module.exports = (bot) => {
  // Main sporthub command
  bot.command("sportshub", async (ctx) => {
    try {
      currentPage.set(ctx.from.id, 0);
      await sendMatchesPage(ctx);
    } catch (error) {
      console.error("Error in sporthub command:", error);
      await ctx.reply("Sorry, something went wrong. Please try again.");
    }
  });

  // Handle match selection
  bot.action(/sh_(\d+)/, async (ctx) => {
    try {
      const urlId = ctx.match[1];
      const matchPageUrl = matchUrlMap.get(urlId);

      if (!matchPageUrl) {
        await ctx.answerCbQuery("Sorry, match details not found.");
        return;
      }

      const encodedMatchPageUrl = encodeURI(decodeURI(matchPageUrl));
      const response = await axios.get(encodedMatchPageUrl);
      const $ = cheerio.load(response.data);

      const title = $(".d-flex.m-0 > span:nth-of-type(1)").text();
      const servers = [];

      $("table:nth-of-type(n+2) [width='227'] a").each((_, element) => {
        let fullUrl = $(element).attr("href");

        if (fullUrl && fullUrl.includes("totalsportek.space/embed")) {
          try {
            fullUrl = encodeURI(decodeURI(fullUrl));
            const urlObj = new URL(fullUrl);
            const forceParam = urlObj.searchParams.get("force");

            if (forceParam) {
              const decodedUrl = decodeURIComponent(forceParam);
              const serverDomain = new URL(decodedUrl).hostname;
              const embedUrl = `https://srv1.eu.org/?stream=${encodeURIComponent(
                decodedUrl
              )}`;

              servers.push({
                text: `🖥 ${serverDomain}`,
                url: embedUrl,
              });
            }
          } catch (urlError) {
            console.error("Error processing URL:", urlError);
          }
        }
      });

      // Create 2-column layout for servers
      const serverButtons = [];
      for (let i = 0; i < servers.length; i += 2) {
        const row = [];
        row.push(servers[i]);
        if (servers[i + 1]) {
          row.push(servers[i + 1]);
        }
        serverButtons.push(row);
      }

      // Add back button
      serverButtons.push([
        { text: "🔙 Back", callback_data: "back_to_matches" },
      ]);

      if (servers.length === 0) {
        await ctx.answerCbQuery("No available servers found for this match.");
      } else {
        await ctx.editMessageText(`Available servers for *${title}*:`, {
          reply_markup: {
            inline_keyboard: serverButtons,
          },
          parse_mode: "Markdown",
        });
      }
    } catch (error) {
      console.error("Error fetching match servers:", error);
      await ctx.answerCbQuery("Sorry, something went wrong. Please try again.");
    }
  });

  // Handle pagination and back actions
  bot.action("page_info", async (ctx) => {
    await ctx.answerCbQuery("Current page number");
  });

  bot.action("next_page", async (ctx) => {
    try {
      const currentUserPage = currentPage.get(ctx.from.id) || 0;
      currentPage.set(ctx.from.id, currentUserPage + 1);
      await sendMatchesPage(ctx, true);
      await ctx.answerCbQuery();
    } catch (error) {
      console.error("Error in next page:", error);
      await ctx.answerCbQuery("Sorry, something went wrong.");
    }
  });

  bot.action("prev_page", async (ctx) => {
    try {
      const currentUserPage = currentPage.get(ctx.from.id) || 0;
      currentPage.set(ctx.from.id, currentUserPage - 1);
      await sendMatchesPage(ctx, true);
      await ctx.answerCbQuery();
    } catch (error) {
      console.error("Error in previous page:", error);
      await ctx.answerCbQuery("Sorry, something went wrong.");
    }
  });

  bot.action("back_to_matches", async (ctx) => {
    try {
      currentPage.set(ctx.from.id, 0);
      await sendMatchesPage(ctx, true);
      await ctx.answerCbQuery();
    } catch (error) {
      console.error("Error in back action:", error);
      await ctx.answerCbQuery("Sorry, something went wrong. Please try again.");
    }
  });
};
