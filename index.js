const express = require('express');
const app = express();
const port = process.env.PORT || 4000;

app.get('/', (req, res) => {
  res.send('Bot is running!');
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Your bot code starts here

const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    PermissionsBitField,
    InteractionResponseFlags,
    ChannelType,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require("discord.js");
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));
require("dotenv").config();

const { translate } = require('@vitalets/google-translate-api');

const figlet = require("figlet");

const { createCanvas, loadImage } = require('canvas');

const fs = require('fs');

// Load currency data
let currencyData = {};
if (fs.existsSync('currency.json')) {
    currencyData = JSON.parse(fs.readFileSync('currency.json', 'utf8'));
}

// Function to save currency data
function saveCurrencyData() {
    fs.writeFileSync('currency.json', JSON.stringify(currencyData, null, 2));
}

// Function to get user's currency
function getUserCurrency(userId) {
    if (!currencyData[userId]) {
        currencyData[userId] = { pocket: 10000, winnings: 0, lastDaily: 0 }; // Added lastDaily for /daily
        saveCurrencyData();
    }
    return currencyData[userId];
};

const languageMap = {
    english: "en",
    hindi: "hi",
    french: "fr",
    spanish: "es",
    german: "de",
};

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
    ],
});

client.once("ready", () => {
    console.log(`✅ Logged in as ${client.user.tag}!`);
});

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    try {
        switch (interaction.commandName) {
            case "avatar": {
                const avatarUser = interaction.options.getUser("user") || interaction.user;
                const avatarEmbed = new EmbedBuilder()
                    .setTitle(`🖼️ Avatar: ${avatarUser.tag}`)
                    .setImage(
                        avatarUser.displayAvatarURL({
                            dynamic: true,
                            size: 1024,
                        }),
                    )
                    .setColor(0x3498db)
                    .setFooter({
                        text: `Requested by ${interaction.user.tag}`,
                        iconURL: interaction.user.displayAvatarURL(),
                    });
                await interaction.reply({ embeds: [avatarEmbed] });
                break;
            }

            case "ban": {
                if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
                    return interaction.reply({
                        content: "❌ You don’t have permission to ban members!",
                        flags: [InteractionResponseFlags.Ephemeral],
                    });
                }
                if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) {
                    return interaction.reply({
                        content: "❌ I don’t have permission to ban members!",
                        flags: [InteractionResponseFlags.Ephemeral],
                    });
                }
                const banUser = interaction.options.getUser("user");
                const banReason = interaction.options.getString("reason") || "Banned by bot command";
                try {
                    const banMember = await interaction.guild.members.fetch(banUser.id);
                    await banMember.ban({ reason: banReason });
                    await interaction.reply({
                        content: `✅ **${banUser.tag}** has been banned. Reason: ${banReason}`,
                        flags: [InteractionResponseFlags.Ephemeral],
                    });
                } catch (error) {
                    console.error("Ban Error:", error);
                    await interaction.reply({
                        content: "❌ Error banning user.",
                        flags: [InteractionResponseFlags.Ephemeral],
                    });
                }
                break;
            }

            case "clear": {
                if (interaction.channel.type !== ChannelType.GuildText) {
                    return interaction.reply({
                        content: "❌ This command can only be used in text channels!",
                        flags: [InteractionResponseFlags.Ephemeral],
                    });
                }
                if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
                    return interaction.reply({
                        content: "❌ You don’t have permission to delete messages!",
                        flags: [InteractionResponseFlags.Ephemeral],
                    });
                }
                if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
                    return interaction.reply({
                        content: "❌ I don’t have permission to delete messages!",
                        flags: [InteractionResponseFlags.Ephemeral],
                    });
                }
                const amount = interaction.options.getInteger("amount");
                if (amount < 1 || amount > 100) {
                    return interaction.reply({
                        content: "❌ Please specify a number between 1 and 100!",
                        flags: [InteractionResponseFlags.Ephemeral],
                    });
                }
                try {
                    const messages = await interaction.channel.bulkDelete(amount, true);
                    await interaction.reply({
                        content: `🗑️ Deleted **${messages.size}** messages.`,
                        flags: [InteractionResponseFlags.Ephemeral],
                    });
                } catch (error) {
                    console.error("Clear Error:", error);
                    await interaction.reply({
                        content: "❌ Error deleting messages.",
                        flags: [InteractionResponseFlags.Ephemeral],
                    });
                }
                break;
            }

            case "coinflip": {
    const choice = interaction.options.getString("choice");
    const bet = interaction.options.getInteger("bet");

    // Check if choice is provided
    if (!choice) {
        return interaction.reply({
            content: "❌ Please provide a choice (heads or tails)!",
            ephemeral: true
        });
    }

    const userChoice = choice.toLowerCase();

    // Get user's currency
    const userId = interaction.user.id;
    const userCurrency = getUserCurrency(userId);

    // Check if user has enough currency
    if (userCurrency.pocket < bet) {
        return interaction.reply({
            content: `❌ You don’t have enough currency to place this bet! Your pocket: ${userCurrency.pocket}`,
            ephemeral: true
        });
    }

    // Deduct the bet
    userCurrency.pocket -= bet;

    // Flip the coin
    const result = Math.random() < 0.5 ? "heads" : "tails";
    const won = userChoice === result;
    let payout = 0;

    if (won) {
        payout = bet * 2;
        userCurrency.pocket += payout;
        userCurrency.winnings += bet;
    } else {
        userCurrency.winnings -= bet;
    }
    saveCurrencyData();

    const embed = new EmbedBuilder()
        .setTitle('🪙 Coin Flip')
        .addFields(
            { name: 'Your Choice', value: userChoice.charAt(0).toUpperCase() + userChoice.slice(1), inline: true },
            { name: 'Result', value: result.charAt(0).toUpperCase() + result.slice(1), inline: true },
            { name: 'Outcome', value: won ? 'You Win! 🎉' : 'You Lose! 😔', inline: false },
            { name: 'Payout', value: payout.toLocaleString(), inline: true },
            { name: 'Pocket', value: userCurrency.pocket.toLocaleString(), inline: true },
            { name: 'Winnings', value: userCurrency.winnings.toLocaleString(), inline: true },
            { name: 'Net', value: (userCurrency.pocket + userCurrency.winnings - 10000).toLocaleString(), inline: true }
        )
        .setColor(won ? '#00FF00' : '#FF0000');

    await interaction.reply({ embeds: [embed] });
    break;
}

            case "hello": {
                await interaction.reply("Hey there! 👋");
                break;
            }

            case "kick": {
                if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
                    return interaction.reply({
                        content: "❌ You don’t have permission to kick members!",
                        flags: [InteractionResponseFlags.Ephemeral],
                    });
                }
                if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.KickMembers)) {
                    return interaction.reply({
                        content: "❌ I don’t have permission to kick members!",
                        flags: [InteractionResponseFlags.Ephemeral],
                    });
                }
                const kickUser = interaction.options.getUser("user");
                const kickReason = interaction.options.getString("reason") || "Kicked by bot command";
                try {
                    const kickMember = await interaction.guild.members.fetch(kickUser.id);
                    await kickMember.kick(kickReason);
                    await interaction.reply({
                        content: `✅ **${kickUser.tag}** has been kicked. Reason: ${kickReason}`,
                        flags: [InteractionResponseFlags.Ephemeral],
                    });
                } catch (error) {
                    console.error("Kick Error:", error);
                    await interaction.reply({
                        content: "❌ Error kicking user.",
                        flags: [InteractionResponseFlags.Ephemeral],
                    });
                }
                break;
            }

            case "mute": {
                if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
                    return interaction.reply({
                        content: "❌ You don’t have permission to mute members!",
                        flags: [InteractionResponseFlags.Ephemeral],
                    });
                }
                if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
                    return interaction.reply({
                        content: "❌ I don’t have permission to manage roles!",
                        flags: [InteractionResponseFlags.Ephemeral],
                    });
                }
                const muteUser = interaction.options.getUser("user");
                const duration = interaction.options.getInteger("duration") || 10;
                const muteReason = interaction.options.getString("reason") || "Muted by bot command";
                try {
                    const muteMember = await interaction.guild.members.fetch(muteUser.id);
                    let mutedRole = interaction.guild.roles.cache.find((role) => role.name === "Muted");
                    if (!mutedRole) {
                        mutedRole = await interaction.guild.roles.create({
                            name: "Muted",
                            color: 0x808080,
                            permissions: [],
                        });
                        interaction.guild.channels.cache.forEach((channel) => {
                            if (channel.type === ChannelType.GuildText) {
                                channel.permissionOverwrites.create(mutedRole, {
                                    SendMessages: false,
                                });
                            }
                        });
                    }
                    await muteMember.roles.add(mutedRole, muteReason);
                    await interaction.reply(
                        `🔇 **${muteUser.tag}** has been muted for **${duration} minutes**. Reason: ${muteReason}`
                    );
                    setTimeout(async () => {
                        try {
                            await muteMember.roles.remove(mutedRole);
                            if (interaction.channel.type === ChannelType.GuildText) {
                                await interaction.channel.send(
                                    `🔊 **${muteUser.tag}** has been unmuted.`
                                );
                            }
                        } catch (error) {
                            console.error("Unmute Error:", error);
                        }
                    }, duration * 60000);
                } catch (error) {
                    console.error("Mute Error:", error);
                    await interaction.reply({
                        content: "❌ Failed to mute user.",
                        flags: [InteractionResponseFlags.Ephemeral],
                    });
                }
                break;
            }

            case "poll": {
                const pollQuestion = interaction.options.getString("question");
                const pollMessage = await interaction.reply({
                    content: `📊 **Poll:** ${pollQuestion}`,
                    fetchReply: true,
                });
                await pollMessage.react("👍");
                await pollMessage.react("👎");
                break;
            }

            case "remind": {
                const reminderMessage = interaction.options.getString("message");
                const minutes = interaction.options.getInteger("minutes") || 1;
                await interaction.reply(
                    `⏳ Reminder set for **${minutes} minutes**.`
                );
                setTimeout(() => {
                    interaction.user
                        .send(`⏰ Reminder: **${reminderMessage}**`)
                        .catch((error) => {
                            console.error("Reminder Error:", error);
                        });
                }, minutes * 60000);
                break;
            }

            case "serverinfo": {
                await interaction.deferReply();
                const { guild } = interaction;
                const owner = await guild.fetchOwner();
                const createdAt = `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`;
                const totalMembers = guild.memberCount;
                const humanCount = guild.members.cache.filter((member) => !member.user.bot).size;
                const botCount = guild.members.cache.filter((member) => member.user.bot).size;
                const rolesCount = guild.roles.cache.size;
                const categories = guild.channels.cache.filter((c) => c.type === 4).size;
                const textChannels = guild.channels.cache.filter((c) => c.type === 0).size;
                const voiceChannels = guild.channels.cache.filter((c) => c.type === 2).size;
                const boostLevel = guild.premiumTier;
                const serverId = guild.id;
                const verificationLevel = guild.verificationLevel;

                const serverEmbed = new EmbedBuilder()
                    .setTitle(`📜 ${guild.name} - Server Info`)
                    .setThumbnail(guild.iconURL({ dynamic: true, size: 1024 }))
                    .setColor(0x3498db)
                    .addFields(
                        { name: "**Owner**", value: `${owner.user.tag}`, inline: true },
                        { name: "**Created On**", value: createdAt, inline: true },
                        { name: "**Server ID**", value: serverId, inline: false },
                        {
                            name: "👥 **Members**",
                            value: `Humans: ${humanCount}\nBots: ${botCount}\nTotal: ${totalMembers}`,
                            inline: true,
                        },
                        { name: "📜 **Roles**", value: `${rolesCount}`, inline: true },
                        {
                            name: "🗂️ **Channels**",
                            value: `Categories: ${categories}\nText: ${textChannels}\nVoice: ${voiceChannels}`,
                            inline: true,
                        },
                        {
                            name: "💎 **Boost Level**",
                            value: `${boostLevel > 0 ? `Level ${boostLevel}` : "None"}`,
                            inline: true,
                        },
                        { name: "🔒 **Verification**", value: `${verificationLevel}`, inline: true }
                    )
                    .setFooter({
                        text: `Requested by ${interaction.user.tag}`,
                        iconURL: interaction.user.displayAvatarURL(),
                    });
                await interaction.editReply({ embeds: [serverEmbed] });
                break;
            }

            case "userinfo": {
                const user = interaction.options.getUser("user") || interaction.user;
                const member = await interaction.guild.members.fetch(user.id);

                let status = "Offline";
                if (user.presence) {
                    switch (user.presence.status) {
                        case "online":
                            status = "Online";
                            break;
                        case "idle":
                            status = "Idle";
                            break;
                        case "dnd":
                            status = "Do Not Disturb";
                            break;
                        case "invisible":
                            status = "Invisible";
                            break;
                    }
                }

                const roles =
                    member.roles.cache
                        .filter((role) => role.id !== interaction.guild.roles.everyone.id)
                        .map((role) => role.name)
                        .join(", ") || "None";

                const userEmbed = new EmbedBuilder()
                    .setTitle(`👤 User Info: ${user.tag}`)
                    .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 1024 }))
                    .setColor(0x7289da)
                    .addFields(
                        { name: "🆔 User ID", value: user.id, inline: true },
                        {
                            name: "📅 Account Created",
                            value: `<t:${Math.floor(user.createdTimestamp / 1000)}:D>`,
                            inline: true,
                        },
                        {
                            name: "📆 Joined Server",
                            value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:D>`,
                            inline: true,
                        },
                        { name: "🔋 Status", value: status, inline: true },
                        {
                            name: "🎭 Roles",
                            value: roles.length > 1024 ? `${roles.substring(0, 1021)}...` : roles,
                            inline: false,
                        }
                    )
                    .setFooter({
                        text: `Requested by ${interaction.user.tag}`,
                        iconURL: interaction.user.displayAvatarURL(),
                    })
                    .setTimestamp();

                await interaction.reply({ embeds: [userEmbed] });
                break;
            }

            case "membercount": {
                try {
                    await interaction.guild.members.fetch({ force: true, timeout: 10000 });
                    const humans = interaction.guild.members.cache.filter((m) => !m.user.bot).size;
                    const bots = interaction.guild.members.cache.filter((m) => m.user.bot).size;
                    const total = interaction.guild.memberCount;

                    console.log(`Member Count - Humans: ${humans}, Bots: ${bots}, Total: ${total}`);
                    if (humans + bots !== total) {
                        console.warn(
                            `Mismatch detected: Humans + Bots (${humans + bots}) does not equal Total (${total})`
                        );
                    }

                    const memberCountEmbed = new EmbedBuilder()
                        .setTitle("👥 Members")
                        .setDescription(`Humans: ${humans}\nBots: ${bots}\nTotal: ${total}`)
                        .setColor(0x3498db)
                        .setFooter({
                            text: `Requested by ${interaction.user.tag}`,
                            iconURL: interaction.user.displayAvatarURL(),
                        })
                        .setTimestamp();

                    await interaction.reply({ embeds: [memberCountEmbed] });
                } catch (error) {
                    console.error("MemberCount Error:", error);
                    await interaction.reply({
                        content:
                            "❌ Failed to fetch member count. Ensure I have proper permissions and intents are enabled.",
                        flags: [InteractionResponseFlags.Ephemeral],
                    });
                }
                break;
            }

            case "uptime": {
                const uptime = process.uptime();
                const uptimeString = new Date(uptime * 1000).toISOString().substr(11, 8);
                await interaction.reply(`⏳ Bot Uptime: **${uptimeString}**`);
                break;
            }

            case "ping": {
                await interaction.reply(`🏓 Pong! Latency: **${client.ws.ping}ms**`);
                break;
            }

            case "say": {
                const message = interaction.options.getString("message");
                await interaction.reply({
                    content: message,
                    allowedMentions: { parse: [] },
                });
                break;
            }

            case "roleinfo": {
                const role = interaction.options.getRole("role");
                const roleEmbed = new EmbedBuilder()
                    .setTitle(`📜 Role Info: ${role.name}`)
                    .setColor(role.color)
                    .addFields(
                        { name: "🆔 Role ID", value: role.id, inline: true },
                        { name: "🎨 Color", value: role.hexColor, inline: true },
                        {
                            name: "📅 Created",
                            value: `<t:${Math.floor(role.createdTimestamp / 1000)}:D>`,
                            inline: true,
                        },
                        { name: "👥 Members", value: `${role.members.size}`, inline: true },
                        { name: "🔒 Mentionable", value: role.mentionable ? "Yes" : "No", inline: true }
                    );
                await interaction.reply({ embeds: [roleEmbed] });
                break;
            }

            case "emojiinfo": {
                const emoji = interaction.options.getString("emoji");
                const parsedEmoji = interaction.client.emojis.cache.find(
                    (e) => e.name === emoji || e.id === emoji
                );
                if (!parsedEmoji) {
                    return interaction.reply({
                        content: "❌ Emoji not found.",
                        flags: [InteractionResponseFlags.Ephemeral],
                    });
                }
                const emojiEmbed = new EmbedBuilder()
                    .setTitle(`😃 Emoji Info: ${parsedEmoji.name}`)
                    .setThumbnail(parsedEmoji.url)
                    .addFields(
                        { name: "🆔 Emoji ID", value: parsedEmoji.id, inline: true },
                        { name: "🔗 URL", value: `[Click here](${parsedEmoji.url})`, inline: true },
                        {
                            name: "📅 Created",
                            value: `<t:${Math.floor(parsedEmoji.createdTimestamp / 1000)}:D>`,
                            inline: true,
                        },
                        { name: "💠 Animated", value: parsedEmoji.animated ? "Yes" : "No", inline: true }
                    );
                await interaction.reply({ embeds: [emojiEmbed] });
                break;
            }

            case "servericon": {
                const icon = interaction.guild.iconURL({ dynamic: true, size: 1024 });
                if (!icon) {
                    return interaction.reply({
                        content: "❌ This server has no icon.",
                        flags: [InteractionResponseFlags.Ephemeral],
                    });
                }
                const iconEmbed = new EmbedBuilder()
                    .setTitle(`🖼️ ${interaction.guild.name} - Server Icon`)
                    .setImage(icon)
                    .setColor(0x3498db);
                await interaction.reply({ embeds: [iconEmbed] });
                break;
            }

            case "nickname": {
                if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageNicknames)) {
                    return interaction.reply({
                        content: "❌ You don’t have permission to change nicknames!",
                        flags: [InteractionResponseFlags.Ephemeral],
                    });
                }
                if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageNicknames)) {
                    return interaction.reply({
                        content: "❌ I don’t have permission to change nicknames!",
                        flags: [InteractionResponseFlags.Ephemeral],
                    });
                }
                const targetUser = interaction.options.getUser("user");
                const newNickname = interaction.options.getString("nickname");
                try {
                    const member = await interaction.guild.members.fetch(targetUser.id);
                    await member.setNickname(newNickname);
                    await interaction.reply({
                        content: `✅ Changed **${targetUser.tag}**’s nickname to **${newNickname}**.`,
                        flags: [InteractionResponseFlags.Ephemeral],
                    });
                } catch (error) {
                    console.error("Nickname Error:", error);
                    await interaction.reply({
                        content: "❌ Failed to change nickname.",
                        flags: [InteractionResponseFlags.Ephemeral],
                    });
                }
                break;
            }

            case "help": {
    const commandName = interaction.options.getString("command")?.toLowerCase();
    const commands = [
        "avatar", "ban", "clear", "coinflip", "hello", "kick", "mute", "poll", "remind",
        "serverinfo", "userinfo", "membercount", "uptime", "ping", "say", "roleinfo",
        "emojiinfo", "servericon", "nickname", "emojiadd", "emojiremove", "weather",
        "lock", "unlock", "slowmode", "purge", "invite", "stats", "quote", "rps", "random",
        "8ball", "meme", "warn", "warns", "unban", "trivia", "dadjoke", "define", "convert",
        "translate", "ascii", "blackjack", "balance", "leaderboard", "give", "daily"
    ];

    if (commandName) {
        const command = commands.find((cmd) => cmd === commandName);
        if (!command) {
            return interaction.reply({
                content: "❌ Command not found!",
                flags: [InteractionResponseFlags.Ephemeral],
            });
        }
        const commandInfo = {
            avatar: "Displays a user's profile picture.",
            ban: "Bans a user from the server with an optional reason.",
            clear: "Deletes a specified number of messages (1-100).",
            coinflip: "Flips a coin and bets on the outcome (heads or tails).",
            hello: "Replies with a friendly greeting.",
            kick: "Kicks a user from the server with an optional reason.",
            mute: "Mutes a user for a specified time (minutes) with an optional reason.",
            poll: "Creates a poll with a yes/no vote.",
            remind: "Sets a reminder to DM you after a specified time (minutes).",
            serverinfo: "Shows detailed information about the server.",
            userinfo: "Shows information about a user.",
            membercount: "Displays the number of humans and bots in the server.",
            uptime: "Shows how long the bot has been running.",
            ping: "Displays the bot’s latency.",
            say: "Makes the bot repeat a message.",
            roleinfo: "Provides information about a role.",
            emojiinfo: "Displays details about an emoji.",
            servericon: "Displays the server’s icon.",
            nickname: "Changes a user’s nickname.",
            emojiadd: "Adds an emoji to the server using a name and URL.",
            emojiremove: "Removes an emoji from the server.",
            weather: "Gets the current weather for a city.",
            lock: "Locks a text channel for @everyone.",
            unlock: "Unlocks a text channel for @everyone.",
            slowmode: "Sets slowmode for a text channel.",
            purge: "Deletes a number of messages from the channel (1-100).",
            invite: "Generates an invite link for the bot or server.",
            stats: "Displays bot statistics and performance metrics.",
            quote: "Quotes a message by ID.",
            rps: "Play Rock, Paper, Scissors with the bot.",
            random: "Generates a random number between two values.",
            "8ball": "Ask the Magic 8-Ball a question.",
            meme: "Fetches a random meme from the internet.",
            warn: "Warns a user and logs the warning.",
            warns: "Shows the number of warnings a user has.",
            unban: "Unbans a user by their ID.",
            trivia: "Answer a random trivia question and earn currency!",
            dadjoke: "Sends a random dad joke.",
            define: "Fetches the definition of a word.",
            convert: "Converts units (e.g., cm to inches, USD to EUR).",
            translate: "Translates text to another language.",
            ascii: "Converts text into ASCII art.",
            blackjack: "Play a game of blackjack against the bot.",
            balance: "Check your virtual currency balance.",
            leaderboard: "Show the top users by virtual currency winnings.",
            give: "Give virtual currency to another user.",
            daily: "Claim your daily virtual currency reward."
        };
        const helpEmbed = new EmbedBuilder()
            .setTitle(`ℹ️ Help: /${commandName}`)
            .setDescription(commandInfo[command])
            .setColor(0x3498db)
            .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
            })
            .setTimestamp();
        await interaction.reply({ embeds: [helpEmbed] });
    } else {
        const helpEmbed = new EmbedBuilder()
            .setTitle("📜 Bot Commands")
            .setDescription(
                "Here’s a list of all available commands. Use `/help <command>` for details:"
            )
            .addFields(
                {
                    name: "Moderation",
                    value: "ban, kick, mute, clear, lock, unlock, slowmode, purge, nickname, warn, warns, unban",
                    inline: true,
                },
                {
                    name: "Info",
                    value: "serverinfo, userinfo, membercount, uptime, ping, roleinfo, emojiinfo, servericon, stats",
                    inline: true,
                },
                {
                    name: "Fun",
                    value: "coinflip, hello, poll, say, rps, random, 8ball, meme, trivia, dadjoke, blackjack",
                    inline: true,
                },
                {
                    name: "Utility",
                    value: "avatar, remind, weather, emojiadd, emojiremove, invite, quote, define, convert, translate, ascii",
                    inline: true,
                },
                {
                    name: "Economy",
                    value: "balance, leaderboard, give, daily",
                    inline: true,
                }
            )
            .setColor(0x3498db)
            .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
            })
            .setTimestamp();
        await interaction.reply({ embeds: [helpEmbed] });
    }
    break;
}

            case "invite": {
                const inviteType = interaction.options.getString("type") || "bot";
                try {
                    if (inviteType === "bot") {
                        const botInvite = `https://discord.com/api/oauth2/authorize?client_id=${process.env.CLIENT_ID}&permissions=8&scope=bot%20applications.commands`;
                        await interaction.reply({
                            content: `📨 Invite me to your server: ${botInvite}`,
                            flags: [InteractionResponseFlags.Ephemeral],
                        });
                    } else {
                        const invite = await interaction.channel.createInvite({
                            maxAge: 0,
                            maxUses: 0,
                        });
                        await interaction.reply({
                            content: `📨 Server Invite Link: ${invite.url}`,
                            flags: [InteractionResponseFlags.Ephemeral],
                        });
                    }
                } catch (error) {
                    console.error("Invite Error:", error);
                    await interaction.reply({
                        content: "❌ Failed to generate invite link.",
                        flags: [InteractionResponseFlags.Ephemeral],
                    });
                }
                break;
            }

            case "emojiadd": {
                if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
                    return interaction.reply({
                        content: "❌ You don’t have permission to add emojis!",
                        flags: [],
                    });
                }
                if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
                    return interaction.reply({
                        content: "❌ I don’t have permission to add emojis!",
                        flags: [],
                    });
                }
                const emojiName = interaction.options.getString("name");
                const emojiURL = interaction.options.getString("url");
                try {
                    const addedEmoji = await interaction.guild.emojis.create({
                        attachment: emojiURL,
                        name: emojiName,
                    });
                    await interaction.reply({
                        content: `✅ Emoji **${addedEmoji.name}** added! ${addedEmoji}`,
                        flags: [],
                    });
                } catch (error) {
                    console.error("Emoji Add Error:", error);
                    await interaction.reply({
                        content: "❌ Failed to add emoji.",
                        flags: [InteractionResponseFlags.Ephemeral],
                    });
                }
                break;
            }

            case "emojiremove": {
                if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
                    return interaction.reply({
                        content: "❌ You don’t have permission to remove emojis!",
                        flags: [InteractionResponseFlags.Ephemeral],
                    });
                }
                if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageEmojisAndStickers)) {
                    return interaction.reply({
                        content: "❌ I don’t have permission to remove emojis!",
                        flags: [InteractionResponseFlags.Ephemeral],
                    });
                }
                const emoji = interaction.options.getString("emoji");
                try {
                    const parsedEmoji = interaction.guild.emojis.cache.find(
                        (e) => e.name === emoji || e.id === emoji || `<:${e.name}:${e.id}>` === emoji
                    );
                    if (!parsedEmoji) {
                        return interaction.reply({
                            content: "❌ Emoji not found in this server!",
                            flags: [InteractionResponseFlags.Ephemeral],
                        });
                    }
                    await parsedEmoji.delete();
                    await interaction.reply({
                        content: `✅ Emoji **${parsedEmoji.name}** has been removed!`,
                        flags: [InteractionResponseFlags.Ephemeral],
                    });
                } catch (error) {
                    console.error("Emoji Remove Error:", error);
                    await interaction.reply({
                        content: "❌ Failed to remove emoji.",
                        flags: [InteractionResponseFlags.Ephemeral],
                    });
                }
                break;
            }

            case "weather": {
                const city = interaction.options.getString("city");
                try {
                    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`;
                    const response = await fetch(url);
                    const data = await response.json();

                    if (data.cod !== 200) {
                        return interaction.reply({
                            content: `❌ Weather API Error: ${data.message}`,
                            flags: [InteractionResponseFlags.Ephemeral],
                        });
                    }

                    const weatherEmbed = new EmbedBuilder()
                        .setTitle(`☀️ Weather in ${data.name}, ${data.sys.country}`)
                        .setDescription(`**${data.weather[0].description}**`)
                        .setThumbnail(`https://openweathermap.org/img/wn/${data.weather[0].icon}.png`)
                        .setColor(0x00aaff)
                        .addFields(
                            { name: "🌡️ Temperature", value: `${data.main.temp}°C`, inline: true },
                            { name: "💨 Wind Speed", value: `${data.wind.speed} m/s`, inline: true },
                            { name: "💧 Humidity", value: `${data.main.humidity}%`, inline: true }
                        );
                    await interaction.reply({ embeds: [weatherEmbed] });
                } catch (error) {
                    console.error("Weather Error:", error);
                    await interaction.reply({
                        content: `❌ Failed to fetch weather data: ${error.message}`,
                        flags: [InteractionResponseFlags.Ephemeral],
                    });
                }
                break;
            }

            case "lock": {
                if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                    return interaction.reply({
                        content: "❌ You don’t have permission to lock channels!",
                        flags: [InteractionResponseFlags.Ephemeral],
                    });
                }
                if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                    return interaction.reply({
                        content: "❌ I don’t have permission to manage channels!",
                        flags: [InteractionResponseFlags.Ephemeral],
                    });
                }
                const lockChannel = interaction.options.getChannel("channel") || interaction.channel;
                if (lockChannel.type !== ChannelType.GuildText) {
                    return interaction.reply({
                        content: "❌ This command can only lock text channels!",
                        flags: [InteractionResponseFlags.Ephemeral],
                    });
                }
                await lockChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                    SendMessages: false,
                });
                await interaction.reply({
                    content: `🔒 Locked ${lockChannel}`,
                    flags: [InteractionResponseFlags.Ephemeral],
                });
                break;
            }

            case "unlock": {
                if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                    return interaction.reply({
                        content: "❌ You don’t have permission to unlock channels!",
                        flags: [InteractionResponseFlags.Ephemeral],
                    });
                }
                if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                    return interaction.reply({
                        content: "❌ I don’t have permission to manage channels!",
                        flags: [InteractionResponseFlags.Ephemeral],
                    });
                }
                const unlockChannel = interaction.options.getChannel("channel") || interaction.channel;
                if (unlockChannel.type !== ChannelType.GuildText) {
                    return interaction.reply({
                        content: "❌ This command can only unlock text channels!",
                        flags: [InteractionResponseFlags.Ephemeral],
                    });
                }
                await unlockChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                    SendMessages: true,
                });
                await interaction.reply({
                    content: `🔓 Unlocked ${unlockChannel}`,
                    flags: [InteractionResponseFlags.Ephemeral],
                });
                break;
            }

            case "slowmode": {
                if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                    return interaction.reply({
                        content: "❌ You don’t have permission to set slowmode!",
                        flags: [InteractionResponseFlags.Ephemeral],
                    });
                }
                if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                    return interaction.reply({
                        content: "❌ I don’t have permission to manage channels!",
                        flags: [InteractionResponseFlags.Ephemeral],
                    });
                }
                const slowChannel = interaction.options.getChannel("channel") || interaction.channel;
                if (slowChannel.type !== ChannelType.GuildText) {
                    return interaction.reply({
                        content: "❌ This command can only set slowmode in text channels!",
                        flags: [InteractionResponseFlags.Ephemeral],
                    });
                }
                const slowTime = interaction.options.getInteger("time");
                await slowChannel.setRateLimitPerUser(slowTime);
                await interaction.reply({
                    content: `⏳ Slowmode set to ${slowTime} seconds in ${slowChannel}`,
                    flags: [InteractionResponseFlags.Ephemeral],
                });
                break;
            }

            case "purge": {
    if (!interaction.channel.isTextBased()) {
        return interaction.reply({
            content: "❌ This command can only be used in text channels!",
            ephemeral: true, // ✅ Correct ephemeral usage
        });
    }
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        return interaction.reply({
            content: "❌ You don’t have permission to delete messages!",
            ephemeral: true,
        });
    }
    if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        return interaction.reply({
            content: "❌ I don’t have permission to delete messages!",
            ephemeral: true,
        });
    }
    
    const purgeAmount = interaction.options.getInteger("amount");
    if (!purgeAmount || purgeAmount < 1 || purgeAmount > 100) {
        return interaction.reply({
            content: "❌ You can only delete between 1 and 100 messages!",
            ephemeral: true,
        });
    }

    try {
        const deletedMessages = await interaction.channel.bulkDelete(purgeAmount, true);
        await interaction.reply({
            content: `🧹 Deleted **${deletedMessages.size}** messages.`,
            ephemeral: true,
        });
    } catch (error) {
        console.error("Purge Error:", error);
        await interaction.reply({
            content: "❌ Error deleting messages.",
            ephemeral: true,
        });
    }
    break;
}


            case "stats": {
                const uptime = process.uptime();
                const uptimeString = new Date(uptime * 1000).toISOString().substr(11, 8);
                const memoryUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
                const guildCount = client.guilds.cache.size;
                const userCount = client.users.cache.size;

                const statsEmbed = new EmbedBuilder()
                    .setTitle("📊 Bot Statistics")
                    .setColor(0x3498db)
                    .addFields(
                        { name: "⏳ Uptime", value: uptimeString, inline: true },
                        { name: "💾 Memory Usage", value: `${memoryUsage} MB`, inline: true },
                        { name: "🌐 Servers", value: `${guildCount}`, inline: true },
                        { name: "👥 Users", value: `${userCount}`, inline: true },
                        { name: "🏓 Ping", value: `${client.ws.ping}ms`, inline: true }
                    )
                    .setFooter({
                        text: `Requested by ${interaction.user.tag}`,
                        iconURL: interaction.user.displayAvatarURL(),
                    })
                    .setTimestamp();

                await interaction.reply({ embeds: [statsEmbed] });
                break;
            }

            case "quote": {
                const messageId = interaction.options.getString("message_id");
                const channel = interaction.options.getChannel("channel") || interaction.channel;
                if (channel.type !== ChannelType.GuildText) {
                    return interaction.reply({
                        content: "❌ This command can only quote messages from text channels!",
                        flags: [InteractionResponseFlags.Ephemeral],
                    });
                }
                try {
                    const message = await channel.messages.fetch(messageId);
                    const quoteEmbed = new EmbedBuilder()
                        .setAuthor({
                            name: message.author.tag,
                            iconURL: message.author.displayAvatarURL(),
                        })
                        .setDescription(message.content || "[No content]")
                        .setColor(0x3498db)
                        .setTimestamp(message.createdTimestamp)
                        .setFooter({ text: `Quoted by ${interaction.user.tag}` });
                    await interaction.reply({ embeds: [quoteEmbed] });
                } catch (error) {
                    console.error("Quote Error:", error);
                    await interaction.reply({
                        content: "❌ Failed to fetch message. Ensure the ID is valid.",
                        flags: [InteractionResponseFlags.Ephemeral],
                    });
                }
                break;
            }

            case "rps": {
                const userChoice = interaction.options.getString("choice");
                const choices = ["rock", "paper", "scissors"];
                const botChoice = choices[Math.floor(Math.random() * choices.length)];

                let result;
                if (userChoice === botChoice) {
                    result = "It’s a tie!";
                } else if (
                    (userChoice === "rock" && botChoice === "scissors") ||
                    (userChoice === "paper" && botChoice === "rock") ||
                    (userChoice === "scissors" && botChoice === "paper")
                ) {
                    result = "You win!";
                } else {
                    result = "I win!";
                }

                await interaction.reply({
                    content: `You chose **${userChoice}**, I chose **${botChoice}**. ${result}`,
                    flags: [],
                });
                break;
            }

            case "random": {
                const min = interaction.options.getInteger("min") || 1;
                const max = interaction.options.getInteger("max") || 100;
                if (min >= max) {
                    return interaction.reply({
                        content: "❌ Min must be less than max!",
                        flags: [InteractionResponseFlags.Ephemeral],
                    });
                }
                const randomNum = Math.floor(Math.random() * (max - min + 1)) + min;
                await interaction.reply({
                    content: `🎲 Your random number between ${min} and ${max} is: **${randomNum}**`,
                    flags: [],
                });
                break;
            }

            case "8ball": {
                const question = interaction.options.getString("question");
                const responses = [
                    "Yes, definitely!",
                    "No way!",
                    "Maybe, who knows?",
                    "Ask again later.",
                    "Absolutely not.",
                    "Signs point to yes.",
                    "Don’t count on it.",
                    "It is certain.",
                ];
                const answer = responses[Math.floor(Math.random() * responses.length)];
                await interaction.reply({
                    content: `🎱 **Question:** ${question}\n**Answer:** ${answer}`,
                    flags: [],
                });
                break;
            }

            case "blackjack": {
    if (!interaction.channel) return;

    const suits = ['S', 'H', 'C', 'D'];
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

    // Map of card values and suits to custom emojis
    const emojiMap = {
        // Spades (S)
        '2S': '<:card_2S:123456789012345678>', // Replace with your emoji ID
        '3S': '<:card_3S:123456789012345679>',
        '4S': '<:card_4S:123456789012345680>',
        '5S': '<:card_5S:123456789012345681>',
        '6S': '<:card_6S:123456789012345682>',
        '7S': '<:card_7S:123456789012345683>',
        '8S': '<:card_8S:123456789012345684>',
        '9S': '<:card_9S:123456789012345685>',
        '10S': '<:card_10S:123456789012345686>',
        'JS': '<:card_JS:123456789012345687>',
        'QS': '<:card_QS:123456789012345688>',
        'KS': '<:card_KS:123456789012345689>',
        'AS': '<:card_AS:123456789012345690>',
        // Hearts (H)
        '2H': '<:card_2H:123456789012345691>',
        '3H': '<:card_3H:123456789012345692>',
        '4H': '<:card_4H:123456789012345693>',
        '5H': '<:card_5H:123456789012345694>',
        '6H': '<:card_6H:123456789012345695>',
        '7H': '<:card_7H:123456789012345696>',
        '8H': '<:card_8H:123456789012345697>',
        '9H': '<:card_9H:123456789012345698>',
        '10H': '<:card_10H:123456789012345699>',
        'JH': '<:card_JH:123456789012345700>',
        'QH': '<:card_QH:123456789012345701>',
        'KH': '<:card_KH:123456789012345702>',
        'AH': '<:card_AH:123456789012345703>',
        // Clubs (C)
        '2C': '<:card_2C:123456789012345704>',
        '3C': '<:card_3C:123456789012345705>',
        '4C': '<:card_4C:123456789012345706>',
        '5C': '<:card_5C:123456789012345707>',
        '6C': '<:card_6C:123456789012345708>',
        '7C': '<:card_7C:123456789012345709>',
        '8C': '<:card_8C:123456789012345710>',
        '9C': '<:card_9C:123456789012345711>',
        '10C': '<:card_10C:123456789012345712>',
        'JC': '<:card_JC:123456789012345713>',
        'QC': '<:card_QC:123456789012345714>',
        'KC': '<:card_KC:123456789012345715>',
        'AC': '<:card_AC:123456789012345716>',
        // Diamonds (D)
        '2D': '<:card_2D:123456789012345717>',
        '3D': '<:card_3D:123456789012345718>',
        '4D': '<:card_4D:123456789012345719>',
        '5D': '<:card_5D:123456789012345720>',
        '6D': '<:card_6D:123456789012345721>',
        '7D': '<:card_7D:123456789012345722>',
        '8D': '<:card_8D:123456789012345723>',
        '9D': '<:card_9D:123456789012345724>',
        '10D': '<:card_10D:123456789012345725>',
        'JD': '<:card_JD:123456789012345726>',
        'QD': '<:card_QD:123456789012345727>',
        'KD': '<:card_KD:123456789012345728>',
        'AD': '<:card_AD:123456789012345729>',
        // Card back for hidden cards
        'BACK': '<:card_back:987654321098765432>' // Replace with your card back emoji ID
    };

    function createDeck() {
        return suits.flatMap(suit => values.map(value => ({ value, suit })));
    }

    function shuffleDeck(deck) {
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return deck;
    }

    function calculateHandValue(hand) {
        let value = 0, aces = 0;
        for (const card of hand) {
            if (card.value === 'A') {
                aces++;
                value += 11;
            } else if (['K', 'Q', 'J'].includes(card.value)) {
                value += 10;
            } else {
                value += parseInt(card.value);
            }
        }
        while (value > 21 && aces > 0) {
            value -= 10;
            aces--;
        }
        return value;
    }

    function displayHand(hand, hideFirst = false) {
        return hand.map((card, index) => {
            if (hideFirst && index === 1) return emojiMap['BACK'];
            const cardKey = `${card.value}${card.suit}`;
            return emojiMap[cardKey] || '🃏'; // Fallback to a default card emoji if not found
        }).join(' ');
    }

    let deck = shuffleDeck(createDeck());
    let playerHand = [deck.pop(), deck.pop()];
    let dealerHand = [deck.pop(), deck.pop()];
    let playerValue = calculateHandValue(playerHand);
    let dealerValue = calculateHandValue(dealerHand);

    const embed = new EmbedBuilder()
        .setTitle('♠ Blackjack Game ♣')
        .addFields(
            { name: 'Your Hand', value: `${displayHand(playerHand)}\n**Value:** ${playerValue}`, inline: false },
            { name: 'Dealer\'s Hand', value: `${displayHand(dealerHand, true)}\n**Value:** ${calculateHandValue([dealerHand[0]])} (one card hidden)`, inline: false },
            { name: 'Action', value: '🃏 Click **Hit** to draw a card, or ✋ **Stand** to hold your hand!', inline: false }
        )
        .setColor('#0099ff');

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('hit')
                .setLabel('🃏 Hit')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('stand')
                .setLabel('✋ Stand')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.reply({ embeds: [embed], components: [row] });
    const message = await interaction.fetchReply();

    const filter = i => i.user.id === interaction.user.id;
    const collector = message.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async i => {
        if (i.customId === 'hit') {
            playerHand.push(deck.pop());
            playerValue = calculateHandValue(playerHand);

            if (playerValue > 21) {
                embed.setFields(
                    { name: 'Your Hand', value: `${displayHand(playerHand)}\n**Bust! 💀**`, inline: false },
                    { name: 'Dealer\'s Hand', value: `${displayHand(dealerHand)}\n**Value:** ${dealerValue}`, inline: false },
                    { name: 'Result', value: '**You went over 21! You lose!**', inline: false }
                ).setColor('#FF0000');

                await i.update({ embeds: [embed], components: [] });
                collector.stop();
            } else {
                embed.setFields(
                    { name: 'Your Hand', value: `${displayHand(playerHand)}\n**Value:** ${playerValue}`, inline: false },
                    { name: 'Dealer\'s Hand', value: `${displayHand(dealerHand, true)}\n**Value:** ${calculateHandValue([dealerHand[0]])} (one card hidden)`, inline: false },
                    { name: 'Action', value: '🃏 Click **Hit** to draw a card, or ✋ **Stand** to hold your hand!', inline: false }
                );

                await i.update({ embeds: [embed], components: [row] });
            }
        } else if (i.customId === 'stand') {
            while (dealerValue < 17) {
                dealerHand.push(deck.pop());
                dealerValue = calculateHandValue(dealerHand);
            }

            let result = dealerValue > 21 ? '**Dealer Busts! You Win! 🎉**' :
                playerValue > dealerValue ? '**You Win! 🎉**' :
                dealerValue > playerValue ? '**Dealer Wins! 😔**' :
                '**It\'s a Tie! 🤝**';

            embed.setFields(
                { name: 'Your Hand', value: `${displayHand(playerHand)}\n**Value:** ${playerValue}`, inline: false },
                { name: 'Dealer\'s Hand', value: `${displayHand(dealerHand)}\n**Value:** ${dealerValue}`, inline: false },
                { name: 'Result', value: result, inline: false }
            ).setColor(dealerValue > 21 || playerValue > dealerValue ? '#00FF00' : '#FF0000');

            await i.update({ embeds: [embed], components: [] });
            collector.stop();
        }
    });

    collector.on('end', () => {
        message.edit({ components: [] }).catch(() => {});
    });

    break;
}



           case "warn": {
                const user = interaction.options.getUser("user");
                const reason = interaction.options.getString("reason") || "No reason provided";
                // Save warning in a database or log (not implemented here)
                await interaction.reply(`⚠️ **${user.tag}** has been warned. Reason: ${reason}`);
                break;
            }

            case "warns": {
                const user = interaction.options.getUser("user");
                // Fetch warnings from database (not implemented here)
                await interaction.reply(`⚠️ **${user.tag}** has X warnings.`);
                break;
            }

            case "unban": {
                const userId = interaction.options.getString("user_id");
                try {
                    await interaction.guild.members.unban(userId);
                    await interaction.reply(`✅ User **${userId}** has been unbanned.`);
                } catch {
                    await interaction.reply("❌ Failed to unban user. Make sure the ID is correct.");
                }
                break;
            }

             case "trivia": {
    try {
        const questionType = interaction.options.getString("type") || (Math.random() > 0.5 ? "boolean" : "multiple");
        const response = await fetch(`https://opentdb.com/api.php?amount=1&type=${questionType}`);
        const data = await response.json();
        const question = data.results[0];

        let answers = [];
        let correctAnswer = question.correct_answer;

        if (questionType === "boolean") {
            answers = ["True", "False"];
        } else {
            answers = [...question.incorrect_answers, question.correct_answer];
            answers.sort(() => Math.random() - 0.5);
        }

        const triviaEmbed = new EmbedBuilder()
            .setTitle("Trivia Time! 🎉")
            .setDescription(`${question.question}\n\n**Options:**\n${answers.map((ans, i) => `${i + 1}. ${ans}`).join("\n")}`)
            .setColor(0x00aaff)
            .setFooter({ text: "You have 30 seconds to answer! Correct answer: +500 currency" });

        const row = new ActionRowBuilder();
        answers.forEach((answer, index) => {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`trivia_${index}`)
                    .setLabel(`${index + 1}`)
                    .setStyle(ButtonStyle.Primary)
            );
        });

        const message = await interaction.reply({ embeds: [triviaEmbed], components: [row], fetchReply: true });

        const collector = message.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id && i.customId.startsWith("trivia_"),
            time: 30000
        });

        collector.on("collect", async i => {
            const selectedIndex = parseInt(i.customId.split("_")[1]);
            const userAnswer = answers[selectedIndex];
            const isCorrect = userAnswer === correctAnswer;

            // Update currency if correct
            const userCurrency = getUserCurrency(interaction.user.id);
            let reward = 0;
            if (isCorrect) {
                reward = 500;
                userCurrency.pocket += reward;
                userCurrency.winnings += reward;
                saveCurrencyData();
            }

            await i.update({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(isCorrect ? "Correct! 🎉" : "Wrong! 😔")
                        .setDescription(`${question.question}\n\nYour Answer: **${userAnswer}**\nCorrect Answer: **${correctAnswer}**${isCorrect ? `\n\n**Reward:** +${reward} currency` : ''}`)
                        .addFields(
                            { name: 'Pocket', value: userCurrency.pocket.toLocaleString(), inline: true },
                            { name: 'Winnings', value: userCurrency.winnings.toLocaleString(), inline: true }
                        )
                        .setColor(isCorrect ? 0x00ff00 : 0xff0000)
                        .setFooter({ text: `Thanks for playing, ${i.user.tag}!` })
                ],
                components: []
            });
            collector.stop();
        });

        collector.on("end", async (collected) => {
            if (collected.size === 0) {
                await message.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle("Time’s Up! ⏰")
                            .setDescription(`${question.question}\n\nCorrect Answer: **${correctAnswer}**`)
                            .setColor(0xff9900)
                            .setFooter({ text: "Better luck next time!" })
                    ],
                    components: []
                });
            }
        });
    } catch (error) {
        console.error("Trivia API Error:", error);
        await interaction.reply("❌ Couldn’t fetch a trivia question right now!");
    }
    break;
}
            case "give": {
    const targetUser = interaction.options.getUser("user");
    const amount = interaction.options.getInteger("amount");

    if (targetUser.id === interaction.user.id) {
        return interaction.reply({
            content: "❌ You can’t give currency to yourself!",
            flags: InteractionResponseFlags.Ephemeral
        });
    }

    const senderCurrency = getUserCurrency(interaction.user.id);
    if (senderCurrency.pocket < amount) {
        return interaction.reply({
            content: `❌ You don’t have enough currency to give! Your pocket: ${senderCurrency.pocket}`,
            flags: InteractionResponseFlags.Ephemeral
        });
    }

    const receiverCurrency = getUserCurrency(targetUser.id);
    senderCurrency.pocket -= amount;
    receiverCurrency.pocket += amount;
    saveCurrencyData();

    const embed = new EmbedBuilder()
        .setTitle('💸 Currency Transfer')
        .setDescription(`${interaction.user.tag} gave ${amount.toLocaleString()} currency to ${targetUser.tag}!`)
        .addFields(
            { name: 'Your New Balance', value: senderCurrency.pocket.toLocaleString(), inline: true },
            { name: `${targetUser.tag}'s New Balance`, value: receiverCurrency.pocket.toLocaleString(), inline: true }
        )
        .setColor('#00FF00');

    await interaction.reply({ embeds: [embed] });

    // Notify the receiver
    try {
        await targetUser.send({
            content: `💸 ${interaction.user.tag} gave you ${amount.toLocaleString()} currency! Your new balance: ${receiverCurrency.pocket.toLocaleString()}`
        });
    } catch (error) {
        console.log(`Could not DM ${targetUser.tag} about the currency transfer:`, error);
    }
    break;
}
            case "daily": {
    const userCurrency = getUserCurrency(interaction.user.id);
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    if (userCurrency.lastDaily && (now - userCurrency.lastDaily) < oneDay) {
        const timeLeft = oneDay - (now - userCurrency.lastDaily);
        const hours = Math.floor(timeLeft / (60 * 60 * 1000));
        const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
        return interaction.reply({
            content: `❌ You can claim your daily reward again in ${hours}h ${minutes}m!`,
            flags: InteractionResponseFlags.Ephemeral
        });
    }

    const reward = 1000;
    userCurrency.pocket += reward;
    userCurrency.winnings += reward;
    userCurrency.lastDaily = now;
    saveCurrencyData();

    const embed = new EmbedBuilder()
        .setTitle('🎁 Daily Reward')
        .setDescription(`You claimed your daily reward of ${reward.toLocaleString()} currency!`)
        .addFields(
            { name: 'Pocket', value: userCurrency.pocket.toLocaleString(), inline: true },
            { name: 'Winnings', value: userCurrency.winnings.toLocaleString(), inline: true }
        )
        .setColor('#FFD700');

    await interaction.reply({ embeds: [embed] });
    break;
}

            case "dadjoke": {
    try {
        const response = await fetch('https://icanhazdadjoke.com/', {
            headers: { Accept: 'application/json' }
        });
        const data = await response.json();
        await interaction.reply(data.joke);
    } catch (error) {
        console.error("Dad Joke API Error:", error);
        await interaction.reply("❌ Couldn’t fetch a dad joke right now!");
    }
    break;
}

                case "define": {
                    const word = interaction.options.getString("word");
                    const apiKey = process.env.MERRIAM_WEBSTER_API_KEY;
                    if (!apiKey) {
                        return interaction.reply({ content: "❌ Merriam-Webster API key is not set.", ephemeral: true });
                    }
                    const url = `https://dictionaryapi.com/api/v3/references/collegiate/json/${word}?key=${apiKey}`;
                    try {
                        const response = await fetch(url);
                        if (!response.ok) {
                            console.error(`API Error: Status ${response.status}, ${response.statusText}`);
                            return interaction.reply({ content: `❌ API Error: ${response.status} ${response.statusText}`, ephemeral: true });
                        }
                        const data = await response.json();
                        if (!Array.isArray(data) || data.length === 0) {
                            return interaction.reply({ content: "❌ No results found for the word.", ephemeral: true });
                        }
                        if (typeof data[0] === "string") {
                            return interaction.reply({ content: `❌ Word not found. Did you mean: ${data.join(", ")}?`, ephemeral: true });
                        }
                        const entry = data[0]; // First entry in the response
                        if (!entry || !entry.shortdef || !entry.shortdef.length) {
                            return interaction.reply({ content: "❌ No definition found for the word.", ephemeral: true });
                        }
                        const definition = entry.shortdef[0]; // Safely access the first definition
                        await interaction.reply(`📖 Definition of **${word}**: ${definition}`);
                    } catch (error) {
                        console.error("Define Command Error:", error.message);
                        await interaction.reply({ content: "❌ Error fetching definition: " + error.message, ephemeral: true });
                    }
                    break;
                }

            case "convert": {
    const value = interaction.options.getNumber("value");
    const from = interaction.options.getString("from").toLowerCase();
    const to = interaction.options.getString("to").toLowerCase();

    let result;
    let unitType;

    // Length conversions
    const lengthUnits = {
        cm: { toInches: 0.393701 },
        inches: { toCm: 2.54 },
        meters: { toFeet: 3.28084 },
        feet: { toMeters: 0.3048 },
        km: { toMiles: 0.621371 },
        miles: { toKm: 1.60934 },
    };

    // Temperature conversions
    const tempUnits = {
        celsius: {
            toFahrenheit: (val) => (val * 9) / 5 + 32,
            toKelvin: (val) => val + 273.15,
        },
        fahrenheit: {
            toCelsius: (val) => ((val - 32) * 5) / 9,
            toKelvin: (val) => ((val - 32) * 5) / 9 + 273.15,
        },
        kelvin: {
            toCelsius: (val) => val - 273.15,
            toFahrenheit: (val) => ((val - 273.15) * 9) / 5 + 32,
        },
    };

    // Currency conversions (we'll fetch rates dynamically)
    const currencyUnits = ["usd", "eur", "gbp", "jpy", "inr"];

    // Check for length conversion
    if (from in lengthUnits && to in lengthUnits) {
        unitType = "Length";
        if (from === "cm" && to === "inches") result = value * lengthUnits.cm.toInches;
        else if (from === "inches" && to === "cm") result = value * lengthUnits.inches.toCm;
        else if (from === "meters" && to === "feet") result = value * lengthUnits.meters.toFeet;
        else if (from === "feet" && to === "meters") result = value * lengthUnits.feet.toMeters;
        else if (from === "km" && to === "miles") result = value * lengthUnits.km.toMiles;
        else if (from === "miles" && to === "km") result = value * lengthUnits.miles.toKm;
        else {
            return interaction.reply({
                content: "❌ Unsupported length conversion!",
                flags: InteractionResponseFlags.Ephemeral
            });
        }
    }
    // Check for temperature conversion
    else if (from in tempUnits && to in tempUnits) {
        unitType = "Temperature";
        if (from === "celsius" && to === "fahrenheit") result = tempUnits.celsius.toFahrenheit(value);
        else if (from === "celsius" && to === "kelvin") result = tempUnits.celsius.toKelvin(value);
        else if (from === "fahrenheit" && to === "celsius") result = tempUnits.fahrenheit.toCelsius(value);
        else if (from === "fahrenheit" && to === "kelvin") result = tempUnits.fahrenheit.toKelvin(value);
        else if (from === "kelvin" && to === "celsius") result = tempUnits.kelvin.toCelsius(value);
        else if (from === "kelvin" && to === "fahrenheit") result = tempUnits.kelvin.toFahrenheit(value);
        else {
            return interaction.reply({
                content: "❌ Unsupported temperature conversion!",
                flags: InteractionResponseFlags.Ephemeral
            });
        }
    }
    // Check for currency conversion
    else if (currencyUnits.includes(from) && currencyUnits.includes(to)) {
        unitType = "Currency";
        try {
            const response = await fetch(
                `https://v6.exchangerate-api.com/v6/${process.env.EXCHANGERATE_API_KEY}/latest/${from.toUpperCase()}`
            );
            const data = await response.json();
            if (data.result !== "success") {
                return interaction.reply({
                    content: `❌ Currency API Error: ${data.error-type}`,
                    flags: InteractionResponseFlags.Ephemeral
                });
            }
            const rate = data.conversion_rates[to.toUpperCase()];
            if (!rate) {
                return interaction.reply({
                    content: `❌ Invalid currency pair!`,
                    flags: InteractionResponseFlags.Ephemeral
                });
            }
            result = value * rate;
        } catch (error) {
            console.error("Currency Conversion Error:", error);
            return interaction.reply({
                content: "❌ Failed to fetch currency conversion rates!",
                flags: InteractionResponseFlags.Ephemeral
            });
        }
    } else {
        return interaction.reply({
            content: "❌ Unsupported conversion! Supported units: cm/inches, meters/feet, km/miles, celsius/fahrenheit/kelvin, usd/eur/gbp/jpy/inr",
            flags: InteractionResponseFlags.Ephemeral
        });
    }

    const embed = new EmbedBuilder()
        .setTitle(`🔄 ${unitType} Conversion`)
        .addFields(
            { name: 'From', value: `${value} ${from.toUpperCase()}`, inline: true },
            { name: 'To', value: `${result.toFixed(2)} ${to.toUpperCase()}`, inline: true }
        )
        .setColor('#00AAFF');

    await interaction.reply({ embeds: [embed] });
    break;
}

            case "translate": {
    const text = interaction.options.getString("text");
    let toLang = interaction.options.getString("language") || "en";
    const fromLang = interaction.options.getString("from"); // Get the source language if provided
    
    // Map full language names to codes
    toLang = languageMap[toLang.toLowerCase()] || toLang;
    const fromLangMapped = fromLang ? (languageMap[fromLang.toLowerCase()] || fromLang) : undefined;

    try {
        console.log(`Translating: "${text}" from ${fromLangMapped || "auto"} to ${toLang}`);
        const translateOptions = { to: toLang };
        if (fromLangMapped) {
            translateOptions.from = fromLangMapped; // Specify the source language if provided
        }
        const result = await translate(text, translateOptions);
        console.log("Translation Result:", result);

        const languageNames = {
            hi: "Hindi",
            en: "English",
            fr: "French",
            es: "Spanish",
            de: "German",
        };
        const fromLangName = languageNames[result.raw.src] || result.raw.src;
        const toLangName = languageNames[toLang] || toLang;

        const translationEmbed = new EmbedBuilder()
            .setTitle("Translation")
            .addFields(
                { name: "Original", value: text, inline: false },
                { name: `Translated (${fromLangName} → ${toLangName})`, value: result.text, inline: false }
            )
            .setColor(0x00ff00)
            .setFooter({ text: `Requested by ${interaction.user.tag}` });
        await interaction.reply({ embeds: [translationEmbed] });
    } catch (error) {
        console.error("Translation Error Details:", error.message, error.stack);
        await interaction.reply("❌ Couldn’t translate the text—try again later! (Check logs for details)");
    }
    break;
}


            case "balance": {
    const targetUser = interaction.options.getUser("user") || interaction.user;
    const userCurrency = getUserCurrency(targetUser.id);

    const embed = new EmbedBuilder()
        .setTitle(`💰 Balance for ${targetUser.tag}`)
        .addFields(
            { name: 'Pocket', value: userCurrency.pocket.toLocaleString(), inline: true },
            { name: 'Winnings', value: userCurrency.winnings.toLocaleString(), inline: true },
            { name: 'Net', value: (userCurrency.pocket + userCurrency.winnings - 10000).toLocaleString(), inline: true }
        )
        .setColor('#FFD700');

    await interaction.reply({ embeds: [embed] });
    break;
}
            case "leaderboard": {
    const limit = interaction.options.getInteger("limit") || 10;

    // Sort users by winnings
    const sortedUsers = Object.entries(currencyData)
        .sort(([, a], [, b]) => (b.winnings + b.pocket) - (a.winnings + a.pocket))
        .slice(0, limit);

    if (sortedUsers.length === 0) {
        return interaction.reply({
            content: "❌ No users have played yet!",
            flags: InteractionResponseFlags.Ephemeral
        });
    }

    const embed = new EmbedBuilder()
        .setTitle('🏆 Currency Leaderboard')
        .setDescription(
            sortedUsers.map(([userId, data], index) => {
                const user = client.users.cache.get(userId);
                const username = user ? user.tag : 'Unknown User';
                return `${index + 1}. **${username}** - Total: ${(data.pocket + data.winnings).toLocaleString()} (Winnings: ${data.winnings.toLocaleString()})`;
            }).join('\n')
        )
        .setColor('#FFD700');

    await interaction.reply({ embeds: [embed] });
    break;
}

            case "ascii": {
    const text = interaction.options.getString("text");
    if (!text) return interaction.reply("❌ Please provide text to convert!");

    figlet(text, (err, data) => {
        if (err) return interaction.reply("❌ Failed to generate ASCII art!");
        interaction.reply(`🎨 ASCII Art:\n\`\`\`${data}\`\`\``);
    });
    break;
}

            case "meme": {
    try {
        const response = await fetch('https://meme-api.com/gimme');
        const data = await response.json();
        if (!data.url || !data.url.match(/\.(jpg|png|gif)$/)) {
            return interaction.reply("❌ Couldn’t find an image meme right now!");
        }
        const memeEmbed = new EmbedBuilder()
            .setTitle(data.title || "Random Meme")
            .setImage(data.url)
            .setFooter({ text: `From r/${data.subreddit} • ${data.ups} upvotes` })
            .setColor(0xff9900);
        await interaction.reply({ embeds: [memeEmbed] });
    } catch (error) {
        console.error("Meme API Error:", error);
        await interaction.reply("❌ Couldn’t fetch a meme right now!");
    }
    break;
}
        }
    } catch (error) {
        console.error("❌ Command Execution Error:", error);
        if (!interaction.replied) {
            await interaction.reply({
                content: "❌ An unexpected error occurred.",
                flags: [InteractionResponseFlags.Ephemeral],
            });
        }
    }
});

client.login(process.env.DISCORD_TOKEN).catch((error) => {
    console.error("❌ Login Failed:", error);
});
console.log(`Public URL: https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`);
