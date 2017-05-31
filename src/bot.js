const config = require('./config.js');
const Discord = require('discord.js');
const bot = new Discord.Client();
var timer;

require('dotenv').config();
//Adds a game to the verified list !lfgadd
function addGame(MESSAGE) {
    // Verify if the user is the guild owner
    if (MESSAGE.channel.guild.ownerID !== MESSAGE.author.id) {
        MESSAGE.reply('This is an administrative command, only the server owner can run it.');
        return;
    }
    var PARAMS = MESSAGE.content.split(' ').slice(1);
    (PARAMS.length);
    if (PARAMS.length <= 1) {
        MESSAGE.reply('Sorry that didn\'t work. Did you type the command like this: `!lfgadd <MAX PLAYERS> <GAME>`');
        return;
    }
    var LIMIT = PARAMS[0]; // Player limit
    if (LIMIT >= 99) {
        MESSAGE.reply('Sorry, due to Discord limitations max players need to be less than 99.');
        return;
    }
    var GAME = '';         // Game name
    for (var i = 1; i < PARAMS.length; i++) {
        GAME += PARAMS[i];
    }
    config.addGame(MESSAGE.guild.id, GAME, LIMIT)
        .then(RESULT => {
            MESSAGE.reply(`Success.\n Added **${GAME}** (max. **${LIMIT} players**) to the verified games list.`);
        }).catch(err => {
            MESSAGE.reply(`Error.\n **${GAME}** could not be added.`);
        });
}

//Removes a game from the verified list !lfgremove
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

//Help command !lfg help
function help(MESSAGE) {
    MESSAGE.channel.send(`Here are my available commands:
    \`!lfg PARAMS\`  - Creates a new guild
    \`!lfg kill\`  - Kills me
    \`!lfg help\`  - Shows this dialog (help)`);
}

//Show all defined games !lfg games
function showGames(MESSAGE) {
    var allGames = 'Here are all the available games: ';
    var gamesArray = config.getGames(MESSAGE.guild.id);
    gamesArray.forEach((val, index) => {
        allGames += '**' + val[0] + '** (max. ' + val[1] + ')';
        if (index < (gamesArray.length - 1)) { allGames += ', '; }
    });
    MESSAGE.channel.send(allGames);
}

//Assigns a user into a session !lfg <GAME>
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
            config.findSession(GUILD_ID, GAME).then(FOUND => {
                if (FOUND === false) {
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
                                //Clones the channel
                                MESSAGE.channel.clone('lfg_' + GAME.toLowerCase(), true)
                                    .then(CHANNEL => {
                                        //Sets permissions
                                        CHANNEL.overwritePermissions(GUILD_ID, {
                                            'SEND_MESSAGES': false
                                        });
                                        CHANNEL.overwritePermissions(ROLE, {
                                            'SEND_MESSAGES': true
                                        });
                                        var games = config.getGames(GUILD_ID);
                                        var maxPlayers = 0;
                                        for (var x = 0; x < games.length; x++) {
                                            var game = games[x];
                                            if (game[0] === GAME) {
                                                maxPlayers = game[1];
                                                break;
                                            }
                                        }
                                        MESSAGE.guild.createChannel('lfg_' + GAME.toLowerCase(), 'voice')
                                            .then(VOICE_CHANNEL => {
                                                VOICE_CHANNEL.setUserLimit(maxPlayers)
                                                    .then(VOICE_CHANNEL => {
                                                        VOICE_CHANNEL.overwritePermissions(GUILD_ID, {
                                                            'SEND_MESSAGES': false
                                                        });
                                                        VOICE_CHANNEL.overwritePermissions(ROLE, {
                                                            'SEND_MESSAGES': true
                                                        });
                                                    });
                                                MESSAGE.reply(`Success.\nGame created in **<#${CHANNEL.id}>**. Click the + reaction below to join. Click it again to leave.`)
                                                    .then(m => {
                                                        m.react('➕');
                                                        config.createSession(GUILD_ID, AUTHOR.id, ROLE.id, GAME, CHANNEL.id, m.id); // Testing params for now

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

            // Start timer
            timer = Date.now();


        });


}

function endSession(message){
    var author = message.author,
        guild_id = message.guild.id,
        roles = message.member.roles.array(),
        role = null;

    for(var i = 0; i < roles.length; i++){
        role = roles[i];

        if(role.name.startsWith('lfg_')){
            break;
        }
    }

    if(guild_id != null && (role.id != null || role.id != '')){
        config.removeSession(guild_id, role.id);
        role.delete();

        var channels = message.guild.channels.array();

        for(var x = 0; x < channels.length; x++){
            var channel = channels[x];

            if(channel.name === role.name){
                channel.delete()
                    .then()
                    .catch(console.error);
            }
        }

        message.reply('Session has ended');
    } else {
        message.reply('Oops! Something went wrong');
    }



}

//Removes a user from a session
function removeLFG(message) {



}

//Events
bot.on('ready', () => {
    console.log('Online');
    bot.generateInvite(['READ_MESSAGES', 'SEND_MESSAGES', 'MANAGE_CHANNELS', 'MANAGE_ROLES']).then(invite => {
        console.log(`Use the following link to invite: ${invite}`);
    });
});

bot.on('message', message => {
    if (message.author.bot) return;

    if (message.content === '!lfg kill') { // (Literally) kills the bot
        process.exit(0);
    } else if (message.content === '!lfg help') { // Help command (sends a description about the bot)
        help(message);
    } else if (message.content === '!lfg games') { // Show all games
        showGames(message);
    } else if (message.content.split(' ')[0] === '!lfg') { // Creates a new guild
        addLFG(message);
    } else if (message.content.split(' ')[0] === '!lfgadd') { // Hopefully the parameters will be sorted out with the new framework
        addGame(message);
    } else if (message.content.split(' ')[0] === '!lfgremove') { // Remove a game from the current list
        removeGame(message);
    } else if(message.content.split(' ')[0] === '!lfgend'){
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
