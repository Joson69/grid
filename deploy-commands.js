const { REST, Routes } = require("discord.js");
require("dotenv").config();

const clientId = process.env.CLIENT_ID;
const token = process.env.DISCORD_TOKEN;

const commands = [
    {
        name: "avatar",
        description: "Displays the profile picture of a user",
        options: [
            {
                name: "user",
                type: 6, // User type
                description: "The user whose avatar you want to see",
                required: false,
            },
        ],
    },
        {
        name: "warn",
        description: "Warns a user and logs the warning",
        options: [
            {
                name: "user",
                type: 6,
                description: "The user to warn",
                required: true,
            },
            {
                name: "reason",
                type: 3,
                description: "Reason for the warning",
                required: false,
            },
        ],
    },
    {
        name: "warns",
        description: "Shows the number of warnings a user has",
        options: [
            {
                name: "user",
                type: 6,
                description: "The user to check warnings for",
                required: true,
            },
        ],
    },
    {
        name: "unban",
        description: "Unbans a user by their user ID",
        options: [
            {
                name: "user_id",
                type: 3,
                description: "The ID of the user to unban",
                required: true,
            },
        ],
    },
    {
    name: "trivia",
    description: "Answer a random trivia question!",
    options: [
        {
            name: "type",
            description: "Type of question (truefalse or multiple)",
            type: 3, // STRING
            required: false,
            choices: [
                { name: "True/False", value: "boolean" },
                { name: "Multiple Choice", value: "multiple" }
            ]
        }
    ]
},
    {
    name: "lyrics",
    description: "Get lyrics for the song you’re currently listening to on Spotify"
},
    {
        name: "dadjoke",
        description: "Sends a random dad joke",
    },
    {
        name: "define",
        description: "Fetches the definition of a word",
        options: [
            {
                name: "word",
                type: 3,
                description: "The word to define",
                required: true,
            },
        ],
    },
    {
        name: "convert",
        description: "Converts units (e.g., cm to inches, USD to EUR)",
        options: [
            {
                name: "value",
                type: 10,
                description: "The numerical value to convert",
                required: true,
            },
            {
                name: "from",
                type: 3,
                description: "The unit to convert from",
                required: true,
            },
            {
                name: "to",
                type: 3,
                description: "The unit to convert to",
                required: true,
            },
        ],
    },
    {
    name: "translate",
    description: "Translates a given text to another language",
    options: [
        {
            name: "text",
            type: 3,
            description: "The text to translate",
            required: true,
        },
        {
            name: "language",
            type: 3,
            description: "The target language (e.g., en, fr, es)",
            required: true,
        },
        {
            name: "from",
            type: 3,
            description: "The source language (e.g., hi, fr, es) - optional, defaults to auto-detect",
            required: false,
        },
    ],
},
    {
        name: "ascii",
        description: "Converts text into ASCII art",
        options: [
            {
                name: "text",
                type: 3,
                description: "The text to convert",
                required: true,
            },
        ],
    },
    {
        name: "ban",
        description: "Bans a user from the server",
        options: [
            {
                name: "user",
                type: 6, // User type
                description: "The user to ban",
                required: true,
            },
            {
                name: "reason",
                type: 3, // String type
                description: "Reason for the ban",
                required: false,
            },
        ],
    },
    {
        name: "clear",
        description: "Deletes a specified number of messages",
        options: [
            {
                name: "amount",
                type: 4, // Integer type
                description: "Number of messages to delete (max 100)",
                required: true,
            },
        ],
    },
    {
    name: "coinflip",
    description: "Flip a coin and bet on the outcome!",
    options: [
        {
            name: "choice",
            type: 3, // String
            description: "Your choice: heads or tails",
            required: true,
            choices: [
                { name: "Heads", value: "heads" },
                { name: "Tails", value: "tails" }
            ]
        },
        {
            name: "bet",
            type: 4, // Integer
            description: "The amount to bet",
            required: true,
            min_value: 1
        },
    ],
},
    {
    name: "balance",
    description: "Check your virtual currency balance",
    options: [
        {
            name: "user",
            type: 6, // User
            description: "The user to check the balance for (default: you)",
            required: false
        }
    ]
},
    {
    name: "leaderboard",
    description: "Show the top users by virtual currency winnings",
    options: [
        {
            name: "limit",
            type: 4, // Integer
            description: "Number of users to show (default: 10)",
            required: false,
            min_value: 1,
            max_value: 20
        }
    ]
},
    {
    name: "give",
    description: "Give virtual currency to another user",
    options: [
        {
            name: "user",
            type: 6, // User
            description: "The user to give currency to",
            required: true
        },
        {
            name: "amount",
            type: 4, // Integer
            description: "The amount to give",
            required: true,
            min_value: 1
        }
    ]
},
    {
    name: "daily",
    description: "Claim your daily virtual currency reward",
},
    {
        name: "hello",
        description: "Replies with a friendly greeting!",
    },
    {
        name: "kick",
        description: "Kicks a user from the server",
        options: [
            {
                name: "user",
                type: 6, // User type
                description: "The user to kick",
                required: true,
            },
            {
                name: "reason",
                type: 3, // String type
                description: "Reason for the kick",
                required: false,
            },
        ],
    },
    {
        name: "mute",
        description: "Mutes a user for a specified time",
        options: [
            {
                name: "user",
                type: 6, // User type
                description: "The user to mute",
                required: true,
            },
            {
                name: "duration",
                type: 4, // Integer type
                description: "Duration in minutes (default: 10)",
                required: false,
            },
            {
                name: "reason",
                type: 3, // String type
                description: "Reason for muting",
                required: false,
            },
        ],
    },
    // Add these to the commands array
    {
        name: "rps",
        description: "Play Rock, Paper, Scissors with the bot!",
        options: [
            {
                name: "choice",
                type: 3, // String type
                description: "Your choice: rock, paper, or scissors",
                required: true,
                choices: [
                    { name: "Rock", value: "rock" },
                    { name: "Paper", value: "paper" },
                    { name: "Scissors", value: "scissors" },
                ],
            },
        ],
    },
    {
        name: "random",
        description: "Generate a random number between two values",
        options: [
            {
                name: "min",
                type: 4, // Integer type
                description: "Minimum value (default: 1)",
                required: false,
            },
            {
                name: "max",
                type: 4, // Integer type
                description: "Maximum value (default: 100)",
                required: false,
            },
        ],
    },
    {
        name: "8ball",
        description: "Ask the Magic 8-Ball a question",
        options: [
            {
                name: "question",
                type: 3, // String type
                description: "Your yes/no question",
                required: true,
            },
        ],
    },
    {
        name: "meme",
        description: "Generate a random meme from internet",
    },
    {
        name: "poll",
        description: "Creates a poll with a yes/no vote",
        options: [
            {
                name: "question",
                type: 3, // String type
                description: "The poll question",
                required: true,
            },
        ],
    },
    {
        name: "remind",
        description: "Sets a reminder and DMs you after a specified time",
        options: [
            {
                name: "message",
                type: 3, // String type
                description: "Reminder message",
                required: true,
            },
            {
                name: "minutes",
                type: 4, // Integer type
                description: "Time in minutes (default: 1)",
                required: false,
            },
        ],
    },
    {
        name: "serverinfo",
        description: "Shows detailed information about this server",
    },
    {
        name: "userinfo",
        description: "Shows information about a user",
        options: [
            {
                name: "user",
                type: 6, // User type
                description: "The user to get info about",
                required: false,
            },
        ],
    },
    {
        name: "membercount",
        description: "Displays the number of humans and bots in the server",
    },
    {
        name: "uptime",
        description: "Shows how long the bot has been running",
    },
    {
        name: "ping",
        description: "Displays the bot’s latency",
    },
    {
        name: "say",
        description: "Makes the bot repeat a message",
        options: [
            {
                name: "message",
                type: 3, // String type
                description: "The message to repeat",
                required: true,
            },
        ],
    },
    {
        name: "roleinfo",
        description: "Provides information about a role",
        options: [
            {
                name: "role",
                type: 8, // Role type
                description: "The role to get info about",
                required: true,
            },
        ],
    },
    {
        name: "emojiinfo",
        description: "Displays details about an emoji",
        options: [
            {
                name: "emoji",
                type: 3, // String type
                description: "The emoji to get info about",
                required: true,
            },
        ],
    },
    {
        name: 'blackjack',
        description: 'Play a game of blackjack against the bot!',
    },
    {
        name: "servericon",
        description: "Displays the server’s icon",
    },
    {
        name: "nickname",
        description: "Changes a user’s nickname",
        options: [
            {
                name: "user",
                type: 6, // User type
                description: "The user whose nickname to change",
                required: true,
            },
            {
                name: "nickname",
                type: 3, // String type
                description: "The new nickname",
                required: true,
            },
        ],
    },
    {
        name: "emojiadd",
        description: "Adds an emoji to the server",
        options: [
            {
                name: "name",
                type: 3, // String type
                description: "Name of the emoji",
                required: true,
            },
            {
                name: "url",
                type: 3, // String type
                description: "URL of the emoji image",
                required: true,
            },
        ],
    },
    {
        name: "emojiremove",
        description: "Removes an emoji from the server",
        options: [
            {
                name: "emoji",
                type: 3, // String type
                description: "The emoji to remove",
                required: true,
            },
        ],
    },
    {
        name: "weather",
        description: "Gets the current weather for a city",
        options: [
            {
                name: "city",
                type: 3, // String type
                description: "City name",
                required: true,
            },
        ],
    },
    {
        name: "lock",
        description: "Locks a channel for @everyone",
        options: [
            {
                name: "channel",
                type: 7, // Channel type
                description: "The channel to lock (optional)",
                required: false,
            },
        ],
    },
    {
        name: "unlock",
        description: "Unlocks a channel for @everyone",
        options: [
            {
                name: "channel",
                type: 7, // Channel type
                description: "The channel to unlock (optional)",
                required: false,
            },
        ],
    },
    {
        name: "slowmode",
        description: "Sets slowmode for a channel",
        options: [
            {
                name: "time",
                type: 4, // Integer type
                description: "Slowmode duration in seconds",
                required: true,
            },
            {
                name: "channel",
                type: 7, // Channel type
                description: "The channel to set slowmode (optional)",
                required: false,
            },
        ],
    },
    {
        name: "purge",
        description: "Deletes a number of messages from the channel",
        options: [
            {
                name: "amount",
                type: 4, // Integer type
                description: "Number of messages to delete (max 100)",
                required: true,
            },
        ],
    },
    {
        name: "help",
        description:
            "Shows a list of commands or detailed info for a specific command",
        options: [
            {
                name: "command",
                type: 3, // String type
                description:
                    "The command to get detailed info about (optional)",
                required: false,
            },
        ],
    },
    {
        name: "invite",
        description: "Generates an invite link for the bot or server",
        options: [
            {
                name: "type",
                type: 3, // String type
                description: "Type of invite (bot or server, default: bot)",
                required: false,
                choices: [
                    { name: "Bot", value: "bot" },
                    { name: "Server", value: "server" },
                ],
            },
        ],
    },
    {
        name: "stats",
        description: "Displays bot statistics and performance metrics",
    },
    {
        name: "quote",
        description: "Quotes a message by ID",
        options: [
            {
                name: "message_id",
                type: 3, // String type
                description: "The ID of the message to quote",
                required: true,
            },
            {
                name: "channel",
                type: 7, // Channel type
                description:
                    "The channel where the message is (optional, defaults to current channel)",
                required: false,
            },
        ],
    },
];

const rest = new REST({ version: "10" }).setToken(token);

(async () => {
    try {
        console.log("Started refreshing application (/) commands.");
        await rest.put(Routes.applicationCommands(clientId), {
            body: commands,
        });
        console.log("Successfully reloaded application (/) commands.");
    } catch (error) {
        console.error("Error registering slash commands:", error);
    }
})();
