//Establish constants
const config = require('./config.js');
const Discord = require('discord.js');
const fs = require('fs')
const bot = new Discord.Client();
const version = "0.1"
var timerInterval;
var channelActivityInterval;
var sudoMode = [];
//Used for retrieving the client secret environment variable
require('dotenv').config();

//Called when there is an error.
function logError(ERROR, ERROR_CONTENT, GUILD_ID) {
    //Create text file stream
    var stream = fs.createWriteStream("log.txt");
    stream.once('open', function(fd) {
        stream.write("***ERROR***\n")
        stream.write("Guild ID: " + GUILD_ID + "\n")
        stream.write("Friendly error message: " + ERROR + "\n")
        stream.write("Technical info: " + ERROR_CONTENT + "\n")
        stream.end();
    })
    //Log the error in the console
    console.log("ERROR: " + ERROR)
}
//Allows an admin to set various options
function setOption(MESSAGE) {
    if (MESSAGE.channel.guild.ownerID !== MESSAGE.author.id) {
        return
    }
    var PARAMS = MESSAGE.content.split(' ').slice(1);
    if (PARAMS.length != 2) {
        MESSAGE.reply('Sorry that didn\'t work. Did you type the command like this: `!lfgset <SETTING> <VALUE>`')
        return;
    }
    config.setSetting(PARAMS[0], MESSAGE.guild.id, PARAMS[1]).then(RESULT => {
        MESSAGE.reply(`Success.\n Changed **${PARAMS[0]}** to **${PARAMS[1]}**.`);
    }).catch(err => {
        if (err == "NONEXISTANT") {
            MESSAGE.reply('The setting you tried to change does not exist.');
        } else {
            MESSAGE.reply(`Error.\n **${PARAMS[0]}** could not be added.`);
            if (err != false) {
                MESSAGE.reply(err);
            }
        }
    });
}
//Allow administrators to add games
function addGame(MESSAGE) {
    // Verify if the user is an administrator
    if (MESSAGE.member.hasPermission("ADMINISTRATOR") == false) {
        return
    }
    //Get the parameters of the command
    var PARAMS = MESSAGE.content.split(' ').slice(1);
    (PARAMS.length);
    //Validation of the parameters
    if (PARAMS.length <= 1 || PARAMS[0].match(/[^0-9]/)) {
        MESSAGE.reply('Sorry that didn\'t work. Did you type the command like this: `!lfgadd <MAX PLAYERS> <GAME>`');
        return;
    }
    //Establishes LIMIT parameter
    var LIMIT = PARAMS[0]; // Player limit
    //Make sure the player limit does not exceed 99
    if (LIMIT >= 99) {
        MESSAGE.reply('Sorry, due to Discord limitations max players need to be less than 99.');
        return;
    }
    if (LIMIT < 2){
        MESSAGE.reply('Groups must have at least two people in them.');
        return;
    }
    //Establish the game name parameter
    var GAME = PARAMS[1]
    //Hyphenates the game name (removes spaces)
    for (var i = 2; i < PARAMS.length; i++) {
        GAME += '-' + PARAMS[i];
    }
    //Makes sure the game name is alphanumerical
    if (GAME.match(/[^a-zA-Z0-9_\-\s]/)) {
        MESSAGE.reply('Sorry, due to Discord limitations game names must be alphanumerical. Names can also contain dashes/underscores.')
        return;
    }
    //Stores the game in the guild's DB
    config.addGame(MESSAGE.guild.id, GAME, LIMIT).then(RESULT => {
        //Stored successfully
        MESSAGE.reply(`Success.\n Added **${GAME}** (max. **${LIMIT} players**) to the verified games list.`);
    }).catch(err => {
        //Something bad happened
        logError("Failed to add game \"" + GAME + "\" to the games list.", err, MESSAGE.guild.id)
        MESSAGE.reply(`There was an error. Try again or contact the bot operators.`)
    });
}
//Removes a game from the list of approved games
function removeGame(MESSAGE) {
    // Verify if the user is the guild owner
    if (MESSAGE.member.hasPermission("ADMINISTRATOR") == false) {
        return;
    }
    //Establish the parameters
    var PARAMS = MESSAGE.content.split(' ').slice(1);
    var GAME = PARAMS[0];
    //Attempt to remove the game from the list
    config.removeGame(MESSAGE.guild.id, GAME).then(RESULT => {
        //Operation was successful
        MESSAGE.reply(`Success.\n **${GAME}** has been removed from the verified list.`);
    }).catch(err => {
        //The game was not in the list or there was an error
        MESSAGE.reply(`Error.\n **${GAME}** is not in the verified list.`);
    });
}
//The help function telling the user all the commands (may need updating)
function help(MESSAGE) {
    MESSAGE.channel.send(`Here are my available commands:
    \`!lfg GAMENAME\`  - Creates a new guild
    \`!lfg kill\`  - Kills me
    \`!lfgadd PLAYERLIMIT GAMENAME\`  - Add a new playable game
    \`!lfgremove PLAYERLIMIT\`  - Remove a playable game
    \`!lfgend\`  - Terminate a currently active session (must be run in the session's text channel)
    \`!lfg games\`  - Shows all games playable
    \`!lfg sessions\`  - Shows all active sessions
    \`!lfg purge\`  - Removes all data associated with this server
    \`!lfg clean roles\`  - Removes all roles related to LFG
    \`!lfg clean sessions\`  - Removes all LFG sessions
    \`!lfg about\`  - Provides information about the bot
    \`!lfg help\`  - Shows this dialog (help). You already knew that.`);
}
//Tells the user information about the bot
function about(MESSAGE) {
    MESSAGE.channel.send(`LookingForGroup v${version}
    Developed by the LFG development team.
    https://github.com/starsky135/LookingForGroup
    We <3 Discord!`)
}
//Lists all of the games the user can choose from
function showGames(MESSAGE) {
    //Base text
    var allGames = 'Here are all the available games:';
    //Fetch games from config
    const gamesObject = config.getGames(MESSAGE.guild.id);
    //Get keys from object
    const gamesObjectKeys = Object.keys(gamesObject);
    //Repeat for every game
    gamesObjectKeys.forEach((key, index) => {
        //Construct the message segment
        allGames += '\n**' + key + '** (max. ' + gamesObject[key]['LIMIT'] + ')';
        //Add comma if needed
        if (index < (gamesObjectKeys.length - 1)) {
            allGames += ', ';
        }
    });
    //Send the constructed message
    MESSAGE.channel.send(allGames);
}
//Lists all of the sessions in progress
function showSessions(MESSAGE) {
    //Base text
    var allSessions = 'Here are all the available sessions:';
    //Fetch sessions from config
    var sessionsArray = config.getSessions(MESSAGE.guild.id);
    //Repeat for every session
    sessionsArray.forEach((val, index) => {
        //Construct the message segment
        allSessions += '\n**' + val[0] + '** (' + val[1] + '/' + val[2] + ')';
        //Add comma if needed
        if (index < (sessionsArray.length - 1)) {
            allSessions += ', ';
        }
    });
    //Send the constructed message
    MESSAGE.channel.send(allSessions);
}
//Creats a new session (group)
function addLFG(MESSAGE) {
    var AUTHOR = MESSAGE.author,
        GUILD_ID = MESSAGE.guild.id,
        PARAMS = MESSAGE.content.split(' ').slice(1);
    GAME = PARAMS[0];
    //Check to see if the game is approved
    config.getGame(GUILD_ID, GAME).then(RESULT => {
        if (RESULT === false) {
            //Game not found
            return MESSAGE.reply(`Error.
                Invalid game specified (Please contact a server admin to add the game).
                Alternatively, if you are an admin use the !lfgadd command.`);
        }
        //Check to see if the user is already in a group
        USER_ROLES = MESSAGE.member.roles
        //Search the user's roles for one called "lfg"
        if (USER_ROLES.find("name", "lfg")) {
            return MESSAGE.reply(`Error.
              You are already in a group. Please leave the group or contact the server admin for help.`)
        }
        //Search if lobby exists before creating new session (modularisation FTW)
        if (config.findSession(GUILD_ID, GAME) === false) {
            //Creates new role
            MESSAGE.guild.createRole({
                name: 'TEMP'
            }).then(ROLE => {
                ROLE.edit({
                    name: 'lfg'
                });
                //Get the games object from the config
                const games = config.getGames(GUILD_ID);
                //If the user hasn't specified a lobby limit, set it to the maximum allowed for that game. If not, set it to the user provided limit.
                if (PARAMS[1] == null) {
                    LOBBY_LIMIT = games[GAME]['LIMIT'];
                } else if(LOBBY_LIMIT > games[GAME]['LIMIT']){
                    return MESSAGE.reply(`Error
                        You cannot have more than ${games[GAME]['LIMIT']} people in a group for this game.`)
                }else if(LOBBY_LIMIT < 2){
                    return MESSAGE.reply(`Error
                        There must be at least 2 people in a group.`)
                }else if(Number.isInteger(LOBBY_LIMIT)){
                    return MESSAGE.reply(`Error
                        Invalid number.`)
                }else{
                    LOBBY_LIMIT = PARAMS[1]
                }


                //Adds role to the user
                MESSAGE.member.addRole(ROLE).then(() => {
                    // Creates a text channel
                    MESSAGE.guild.createChannel('lfg_' + GAME.toLowerCase() + ROLE.id.toString(), "text").then(TEXT_CHANNEL => {
                        //Sets permissions
                        TEXT_CHANNEL.overwritePermissions(GUILD_ID, {
                            //Stop everyone from being able to see the channel
                            'SEND_MESSAGES': false,
                            'READ_MESSAGES': false
                        });
                        TEXT_CHANNEL.overwritePermissions(ROLE, {
                            //Allow people in the group to send and read messages
                            'SEND_MESSAGES': true,
                            'READ_MESSAGES': true
                        });
                        TEXT_CHANNEL.overwritePermissions(bot.user, {
                            //Give the bot permissions because robots have rights
                            'SEND_MESSAGES': true,
                            'READ_MESSAGES': true,
                            'ADMINISTRATOR': true
                        });
                        //Send messages to alert the user to the channel's creation
                        TEXT_CHANNEL.send('Text channel for ' + GAME);
                        TEXT_CHANNEL.send('<@' + AUTHOR.id + '> Welcome to your group\'s text channel. You also have a voice channel to use.')
                        TEXT_CHANNEL.send('Please don\'t forget to type !lfgend when you are done!');
                        // Creates a voice channel with a maximum user limit
                        MESSAGE.guild.createChannel('lfg_' + GAME.toLowerCase() + ROLE.id.toString(), 'voice').then(VOICE_CHANNEL => {
                            //Set the limit for the maximum number of users who can enter the voice channel
                            VOICE_CHANNEL.setUserLimit(LOBBY_LIMIT).then(VOICE_CHANNEL => {
                                //Stop everyone from being able to connect to the channel
                                VOICE_CHANNEL.overwritePermissions(GUILD_ID, {
                                    'CONNECT': false
                                });
                                VOICE_CHANNEL.overwritePermissions(ROLE, {
                                    //Allow group members to join
                                    'CONNECT': true
                                });
                                VOICE_CHANNEL.overwritePermissions(bot.user, {
                                    //Give the bot permissions to join because he's pretty swell.
                                    'CONNECT': true
                                });
                                MESSAGE.reply(`Lobby for ` + LOBBY_LIMIT + ` ` + GAME + ` players. Click the + reaction below to join. Click it again to leave.`).then(m => {
                                    m.react('➕');
                                    config.createSession(GUILD_ID, AUTHOR.id, ROLE.id, GAME, TEXT_CHANNEL.id, VOICE_CHANNEL.id, m.id, m.channel.id); // Testing params for now
                                    config.addUser(GUILD_ID, ROLE.id, AUTHOR.id).then(data => {
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
                    })
            }
        //End of session creation
        //Adds user to existing session
        else {
            FOUND = config.findSession(GUILD_ID, GAME);
            MESSAGE.channel.send("so we'd put you in a lobby right now but someone broke the code so lol. run !lfg clean sessions.")
        }
    })
}


function deleteCreationMessage(guild, groupID) {
    session = config.getSession(guild.id, groupID)
    guild.channels.get(session['channelid']).messages.get(session['messageid']).delete()
}
/*
    Ends a session
 */
function cleanRoles(MESSAGE) {
    if (sudoMode.indexOf(MESSAGE.guild.id) > -1) {
        sudoMode.splice(sudoMode.indexOf(MESSAGE.guild.id), 1);
        MESSAGE.channel.send("Cleaning...")
        var CLEAR_ROLES = MESSAGE.guild.roles.filter(function(element) {
            return element.name.startsWith("lfg")
        })
        CLEAR_ROLES.deleteAll()
        MESSAGE.channel.send("Cleaning is complete.")
    } else {
        sudoMode.push(MESSAGE.guild.id);
        MESSAGE.channel.send("WARNING: This will delete all roles associated with the LFG bot. DO NOT run this while sessions are in progress. Use *!lfg purge*. If you wish to continue, type *!lfg clean roles* again.");
    }
}
//Cleaning functions
function cleanGuild(MESSAGE) {
    if (sudoMode.indexOf(MESSAGE.guild.id) > -1) {
        sudoMode.splice(sudoMode.indexOf(MESSAGE.guild.id), 1);
        cleanRoles(MESSAGE)
        config.cleanGuild(MESSAGE.guild.id).then(RESULT => {
            MESSAGE.reply(`Success. This server's data has been cleared.`);
        }).catch(err => {
            MESSAGE.reply(`There was an error.`);
        });
    } else {
        sudoMode.push(MESSAGE.guild.id);
        MESSAGE.channel.send("WARNING: This will remove all bot-side data relating to your server. If you really want to do this, type the command again.");
    }
}

function cleanSessions(MESSAGE) {
    config.cleanSessions(MESSAGE.guild.id).then(RESULT => {
        cleanChannels(MESSAGE)
        MESSAGE.reply(`Success. All sessions have been cleared.`);
    }).catch(err => {
        MESSAGE.reply(`There was an error.`);
    });
}

function cleanChannels(MESSAGE) {
    var channels = MESSAGE.guild.channels.array();
    for (var x = 0; x < channels.length; x++) {
        var channel = channels[x];
        if (channel.name.startsWith("lfg")) {
            channel.delete()
        }
    }
}
//Function is run when the user forces a group to disband or the timer is triggered.
function endSession(message) {
    var author = message.author,
        guild_id = message.guild.id,
        roles = message.member.roles,
        role = null;
    var LFG_ROLES = roles.filter(function(element) {
        return element.name == "lfg"
    })
    ROLE = LFG_ROLES.first()
    deleteCreationMessage(message.guild, ROLE.id)
    SESSION = config.getSession(guild_id, ROLE.id)
    if (guild_id != null && (ROLE.id != null || ROLE.id != '')) {
        var channels = message.guild.channels.array();
        for (var x = 0; x < channels.length; x++) {
            var channel = channels[x];
            if (channel.id == SESSION.text_channel) {
                channel.delete()
                SESSION.text_channel = 0
            }
            if (channel.id == SESSION.voice_channel) {
                channel.delete()
                SESSION.voice_channel = 0
            }
        }
        config.removeSession(guild_id, ROLE.id);
        LFG_ROLES.deleteAll()
        message.reply('Session has ended.');
        clearInterval(channelActivityInterval);
    } else {
        message.reply('Oops! Could not find an LFG role!');
    }
}
/*
    Removes a user from a session
 */
function removeLFG(message) {}
bot.on('guildCreate', GUILD => {
    config.initIfNeeded(GUILD.id);
});
//EVENTS
bot.on('ready', () => {
    console.log('LookingForGroup: A project by the LFG development team licesnsed under the MIT Public License.');
    console.log('Bot is ready.');
    bot.generateInvite(['ADMINISTRATOR', 'KICK_MEMBERS', 'MANAGE_CHANNELS', 'ADD_REACTIONS', 'READ_MESSAGES', 'SEND_MESSAGES', 'SEND_TTS_MESSAGES', 'MANAGE_MESSAGES', 'MENTION_EVERYONE', 'CONNECT', 'SPEAK', 'MOVE_MEMBERS', 'USE_VAD', 'CHANGE_NICKNAME', 'MANAGE_ROLES']).then(invite => {
        console.log(`Use the following link to invite:\n\n${invite}\n`);
    });
});
bot.on('message', message => {
    if (message.author.bot) {
        return;
    }
    if (message.content === '!lfg kill') { // (Literally) kills the bot
        process.exit(0);
    } else if (message.content === '!lfg help') { // Help command (sends a description about the bot)
        help(message);
    } else if (message.content === '!lfg about') { // Help command (sends a description about the bot)
        about(message);
    } else if (message.content === '!lfg purge') { // Help command (sends a description about the bot)
        cleanGuild(message);
    } else if (message.content === '!lfg clean roles') { // Help command (sends a description about the bot)
        cleanRoles(message);
    } else if (message.content === '!lfg clean sessions') { // Help command (sends a description about the bot)
        cleanSessions(message);
    } else if (message.content === '!lfg games') { // Show all games
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
    } else if (message.content.split(' ')[0] === '!lfgset') {
        setOption(message);
    }
});
bot.on('messageReactionAdd', (reaction, user) => {
    //Not the best way for checking that the message is valid, should be made better at some point
    if (reaction.emoji.name == '➕' && user.id != bot.user.id && reaction.message.author.id == bot.user.id && reaction.message.content.includes("Game created in")) {
        config.scanForMsdID(reaction.message.id, reaction.message.guild.id).then(ret => {
            config.addUser(reaction.message.guild.id, config.getRoleByReaction(reaction, reaction.message.guild.id), user.id).then(data => {
                if (data == 'full') {
                    MESSAGE.channel.sendMessage('**' + GAME + '** is now full!');
                }
            });
            reaction.message.guild.member(user).addRole(config.getRoleByReaction(reaction, reaction.message.guild.id)); //TODO
        });
    }
});
bot.on('messageReactionRemove', (reaction, user) => {
    if (reaction.emoji.name == '➕' && user.id != bot.user.id && reaction.message.author.id == bot.user.id && reaction.message.content.includes("Game created in")) {
        config.scanForMsdID(reaction.message.id, reaction.message.guild.id).then(ret => {
            config.removeUser(reaction.message.guild.id, config.getRoleByReaction(reaction, reaction.message.guild.id), user.id);
            reaction.message.guild.member(user).removeRole(config.getRoleByReaction(reaction, reaction.message.guild.id));
        });
    }
});
process.on('unhandledRejection', err => {
    console.error(`Uncaught Rejection (${err.status}): ${err && err.stack || err}`);
    logError("Unhandled rejection!", err, "-")
});
bot.login(process.env.TOKEN);
