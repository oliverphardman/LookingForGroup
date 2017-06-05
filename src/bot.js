const config = require('./config.js');
const Discord = require('discord.js');
const bot = new Discord.Client();
var timerInterval;
var channelActivityInterval;
var sudoMode = [];
require('dotenv').config();
/*
    Adds a game to the verified list !lfgadd
 */
function addGame(MESSAGE) {
    // Verify if the user is the guild owner
    if (MESSAGE.channel.guild.ownerID !== MESSAGE.author.id) {
        MESSAGE.reply('This is an administrative command, only the server owner can run it.');
        return;
    }
    var PARAMS = MESSAGE.content.split(' ').slice(1);
    (PARAMS.length);
    if (PARAMS.length <= 1 || PARAMS[0].match(/[^0-9]/)) {
        MESSAGE.reply('Sorry that didn\'t work. Did you type the command like this: `!lfgadd <MAX PLAYERS> <GAME>`');
        return;
    }
    var LIMIT = PARAMS[0]; // Player limit
    if (LIMIT >= 99) {
        MESSAGE.reply('Sorry, due to Discord limitations max players need to be less than 99.');
        return;
    }
    var GAME = PARAMS[1]; // Game name
    for (var i = 2; i < PARAMS.length; i++) {
        GAME += '-' + PARAMS[i];
    }

    if (GAME.match(/[^a-zA-Z0-9_\-\s]/)) {
        MESSAGE.reply('Sorry, due to Discord limitations game names must be alphanumerical. Names can also contain dashes/underscores.')
        return;
    }


    config.addGame(MESSAGE.guild.id, GAME, LIMIT)
        .then(RESULT => {
            MESSAGE.reply(`Success.\n Added **${GAME}** (max. **${LIMIT} players**) to the verified games list.`);
        }).catch(err => {
            MESSAGE.reply(`Error.\n **${GAME}** could not be added.`);
        });
}

/*
    Removes a game from the verified list !lfgremove
 */
function removeGame(MESSAGE) {
    // Verify if the user is the guild owner
    if (MESSAGE.channel.guild.ownerID !== MESSAGE.author.id) {
        MESSAGE.reply('This is an administrative command, only the server owner can run it.');
        return;
    }
    var PARAMS = MESSAGE.content.split(' ').slice(1);
    var GAME = PARAMS[0];
    config.removeGame(MESSAGE.guild.id, GAME)
        .then(RESULT => {
            MESSAGE.reply(`Success.\n **${GAME}** has been removed from the verified list.`);
        }).catch(err => {
            MESSAGE.reply(`Error.\n **${GAME}** is not in the verified list.`);
        });
}

/*
    Help command !lfg help
 */
function help(MESSAGE) {
    MESSAGE.channel.send(`Here are my available commands:
    \`!lfg GAMENAME\`  - Creates a new guild
    \`!lfg kill\`  - Kills me
    \`!lfgadd PLAYERLIMIT GAMENAME\`  - Add a new playable game
    \`!lfgremove PLAYERLIMIT\`  - Remove a playable game
    \`!lfgend\`  - Terminate a currently active session (must be run in the session's text channel)
    \`!lfg games\`  - Shows all games playable
    \`!lfg sessions\`  - Shows all active sessions
    \`!lfg clean\`  - Removes all data associated with this server     
    \`!lfg help\`  - Shows this dialog (help)`);
}

/*
    Show all defined games !lfg games
 */
function showGames(MESSAGE) {
    var allGames = 'Here are all the available games: ';
    const gamesObject = config.getGames(MESSAGE.guild.id);
    const gamesObjectKeys = Object.keys(gamesObject);
    gamesObjectKeys.forEach((key, index) => {
        allGames += '**' + key + '** (max. ' + gamesObject[key]['LIMIT'] + ')';
        if (index < (gamesObjectKeys.length - 1)) {
            allGames += ', ';
        }
    });
    MESSAGE.channel.send(allGames);
}

//Show all sessions !lfg sessions
function showSessions(MESSAGE) {
    var allSessions = 'Here are all the available sessions: ';
    var sessionsArray = config.getSessions(MESSAGE.guild.id);
    sessionsArray.forEach((val, index) => {
        allSessions += '**' + val[0] + '** (' + val[1] + '/' + val[2] + ')';
        if (index < (sessionsArray.length - 1)) {
            allSessions += ', ';
        }
    });
    MESSAGE.channel.send(allSessions);
}

/*
    Assigns a user into a session !lfg <GAME>
 */
function addLFG(MESSAGE) {
    var AUTHOR = MESSAGE.author,
        GUILD_ID = MESSAGE.guild.id,
        PARAMS = MESSAGE.content.split(' ').slice(1);
    GAME = PARAMS[0];
    config.getGame(GUILD_ID, GAME)
        .then(RESULT => {
            if (RESULT === false) {
                //Game not found
                return MESSAGE.reply(`Error.
                Invalid game specified (Please contact server Admin to add the game).
                Alternatively, if you are an Admin use the !lfgadd command.`);
            }
            //Search if lobby exists before creating new session (modularisation FTW)
            if (config.findSession(GUILD_ID, GAME) === false) {
                //Creates new session
                MESSAGE.guild.createRole({
                        name: 'TEMP'
                    })
                    .then(ROLE => {
                        ROLE.edit({
                            name: 'lfg_' + GAME.toLowerCase()
                        });
                        //Adds role to the user
                        MESSAGE.member.addRole(ROLE).then(() => {
                            // Creates a text channel
                            MESSAGE.guild.createChannel('lfg_' + GAME.toLowerCase(), "text")
                                .then(TEXT_CHANNEL => {
                                    //Sets permissions
                                    TEXT_CHANNEL.overwritePermissions(GUILD_ID, {
                                        'SEND_MESSAGES': false
                                    });
                                    TEXT_CHANNEL.overwritePermissions(ROLE, {
                                        'SEND_MESSAGES': true
                                    });

                                    const games = config.getGames(GUILD_ID);
                                    const maxPlayers = games[GAME]['LIMIT'];

                                    TEXT_CHANNEL.send('Text channel for ' + GAME);
                                    TEXT_CHANNEL.send('Don\'t forget to type !lfgend when you are done!');
                                    // Creates a voice channel with a maximum user limit
                                    MESSAGE.guild.createChannel('lfg_' + GAME.toLowerCase(), 'voice')
                                        .then(VOICE_CHANNEL => {
                                            VOICE_CHANNEL.join()
                                            VOICE_CHANNEL.setUserLimit(parseInt(maxPlayers + 1))
                                                .then(VOICE_CHANNEL => {
                                                    VOICE_CHANNEL.overwritePermissions(GUILD_ID, {
                                                        'CONNECT': false
                                                    });
                                                    VOICE_CHANNEL.overwritePermissions(ROLE, {
                                                        'CONNECT': true
                                                    });

                                                    // Check channel activity
                                                    channelActivityInterval = setInterval(function() {
                                                        var textChannelMessage = TEXT_CHANNEL.fetchMessages()
                                                            .then(MESSAGES => {
                                                                var messageArray = MESSAGES.array();

                                                                if (messageArray.length > 0) {
                                                                    messageArray.sort(function(a, b) {
                                                                        return a - b;
                                                                    });

                                                                    var newestMessage = messageArray[0];

                                                                    // This is in seconds. 15 minutes = 900 seconds
                                                                    var timeSincePosted = (Date.now() - newestMessage.createdTimestamp) / 1000;
                                                                    console.log(timeSincePosted);

                                                                    // If no message has been posted for at least 15 minutes
                                                                    if (timeSincePosted >= 900000) {
                                                                        // Check how many people are in the voice channel
                                                                        if (VOICE_CHANNEL.members.array().length <= 1) {
                                                                            endSession(MESSAGE);
                                                                        }
                                                                    }
                                                                } else {
                                                                    TEXT_CHANNEL.send('Text channel for ' + GAME);
                                                                    TEXT_CHANNEL.send('Don\'t forget to type !lfgend when you are done!');
                                                                    // The bot should have created a message in the channel, so the array shouldn't be empty
                                                                    //MESSAGE.reply("Something went wrong");
                                                                }
                                                            });
                                                        //Normally 900000
                                                    }, 900000);
                                                });
                                            MESSAGE.reply(`Success.\nGame created in **<#${TEXT_CHANNEL.id}>**. Click the + reaction below to join. Click it again to leave.`)
                                                .then(m => {
                                                    m.react('➕');
                                                    config.createSession(GUILD_ID, AUTHOR.id, ROLE.id, GAME, TEXT_CHANNEL.id, m.id); // Testing params for now

                                                    config.addUser(GUILD_ID, ROLE.id, AUTHOR.id)
                                                        .then(data => {
                                                            if (data == 'full') {
                                                                MESSAGE.channel.sendMessage('**' + GAME + '** is now full!');
                                                            } else {
                                                                MESSAGE.channel.send(config.data[GUILD_ID][ROLE.id].members.length + '/' + data[1] + ' members has joined **' + GAME + '**');

                                                            }
                                                        });
                                                });
                                        }).catch(errr => {
                                            console.error(errr);
                                        });

                                });
                        }).catch(err => {
                            console.error(err);
                        });
                    });


            }
            //End of session creation
            //Adds user to existing session
            else {
                config.addUser(GUILD_ID, FOUND, AUTHOR.id)
                    .then((data) => {
                        config.getChannelID(GUILD_ID, FOUND)
                            .then(CHN => {
                                MESSAGE.reply(`Success.\nYou have been added to a session in <#${CHN}>! :D`);
                                MESSAGE.channel.send(config.data[GUILD_ID][FOUND].members.length + '/' + data[1] + ' members have joined **' + GAME + '**');
                                MESSAGE.member.addRole(FOUND);
                            });
                    })
                    .catch((err, game) => {
                        if (err == 'full') {
                            config.getChannelID(GUILD_ID, FOUND).then(CHN => {
                                MESSAGE.reply('Sorry, group is full.');
                                //shit broke yo
                            });
                        }
                    });
            }



        });
}

/*
    Ends a session
 */
function endSession(message) {
    var author = message.author,
        guild_id = message.guild.id,
        roles = message.member.roles.array(),
        role = null;

    for (var i = 0; i < roles.length; i++) {
        role = roles[i];

        if (role.name.startsWith('lfg_')) {
            break;
        }
    }

    if (guild_id != null && (role.id != null || role.id != '')) {
        config.removeSession(guild_id, role.id);
        role.delete();

        var channels = message.guild.channels.array();

        for (var x = 0; x < channels.length; x++) {
            var channel = channels[x];

            if (channel.name === role.name) {
                channel.delete()
                    .then()
                    .catch(console.error);
            }
        }

        message.reply('Session has ended');

        clearInterval(channelActivityInterval);
    } else {
        message.reply('Oops! Could not find an LFG role!');
    }
}

/*
    Removes a user from a session
 */
function removeLFG(message) {

}

// Events
bot.on('ready', () => {
    console.log('LookingForGroup: A project by the LFG development team licesnsed under the MIT Public License.');
    console.log('Bot is ready.');
    bot.generateInvite(['ADMINISTRATOR', 'KICK_MEMBERS', 'MANAGE_CHANNELS', 'ADD_REACTIONS', 'READ_MESSAGES', 'SEND_MESSAGES', 'SEND_TTS_MESSAGES', 'MANAGE_MESSAGES', 'MENTION_EVERYONE', 'CONNECT', 'SPEAK', 'MOVE_MEMBERS', 'USE_VAD', 'CHANGE_NICKNAME', 'MANAGE_ROLES']).then(invite => {
        console.log(`Use the following link to invite:\n\n${invite}\n`);
    });
});

function cleanGuild(MESSAGE){
	if(sudoMode.indexOf(MESSAGE.guild.id) > -1){
		sudoMode.splice(sudoMode.indexOf(MESSAGE.guild.id),1);
	    config.cleanGuild(MESSAGE.guild.id).then(RESULT => {
            MESSAGE.reply(`Success. This server's data has been cleared.`);
        }).catch(err => {
            MESSAGE.reply(`There was an error.`);
        });
    } else{
    	sudoMode.push(MESSAGE.guild.id);
    	MESSAGE.channel.send("WARNING: This will remove all bot-side data relating to your server. If you really want to do this, type the command again.");
    }
}

bot.on('message', message => {
    if (message.author.bot){
    	return;
    }
    if (message.content === '!lfg kill') { // (Literally) kills the bot
        process.exit(0);
    } else if (message.content === '!lfg help') { // Help command (sends a description about the bot)
        help(message);
    }
    else if (message.content === '!lfgclean') { // Help command (sends a description about the bot)
        cleanGuild(message);
    }
     else if (message.content === '!lfg games') { // Show all games
        showGames(message);
    } else if (message.content === '!lfg sessions') { // Show all sessions
        showSessions(message);
    } else if (message.content.split(' ')[0] === '!lfg') { // Creates a new guild
        addLFG(message);
    } else if (message.content.split(' ')[0] === '!lfgadd') { // Hopefully the parameters will be sorted out with the new framework
        addGame(message);
    } else if (message.content.split(' ')[0] === '!lfgremove') { // Remove a game from the current list
        removeGame(message);
    } else if (message.content.split(' ')[0] === '!lfgend') {
        endSession(message);
    }
});

bot.on('messageReactionAdd', (reaction, user) => {
    if (reaction.emoji.name == '➕' && user.id != bot.user.id) {
        config.addUser(reaction.message.guild.id, config.getRoleByReaction(reaction, reaction.message.guild.id), user.id)
            .then(data => {
                if (data == 'full') {
                    MESSAGE.channel.sendMessage('**' + GAME + '** is now full!');
                }
            });
        reaction.message.guild.member(user).addRole(config.getRoleByReaction(reaction, reaction.message.guild.id)); //TODO
    }
});

bot.on('messageReactionRemove', (reaction, user) => {
    if (reaction.emoji.name == '➕' && user.id != bot.user.id) {
        config.removeUser(reaction.message.guild.id, config.getRoleByReaction(reaction, reaction.message.guild.id), user.id);
        reaction.message.guild.member(user).removeRole(config.getRoleByReaction(reaction, reaction.message.guild.id));
    }
});

process.on('unhandledRejection', err => {
    console.error(`Uncaught Rejection (${err.status}): ${err && err.stack || err}`);
});

bot.login(process.env.TOKEN);