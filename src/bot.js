const config = require('./config.js');
const Discord = require('discord.js');
const bot = new Discord.Client();

require('dotenv').config();
//Adds a game to the verified list
function addGame(MESSAGE) {
    var PARAMS = MESSAGE.content.split(" ").slice(1);
    var GAME = PARAMS[0]
    config.addGame(MESSAGE.guild.id, GAME)
    .then(RESULT => {
        MESSAGE.reply(`Success.\n Added ${GAME} to the verified games list.`)
    }).catch(err => {
        MESSAGE.reply(`Error.\n ${GAME} could not be added.`);
    });
};
//Removes a game from the verified list
function removeGame(MESSAGE){
    var PARAMS = MESSAGE.content.split(" ").slice(1);
    var GAME = PARAMS[0]
    config.removeGame(MESSAGE.guild.id,game, GAME)
    .then(RESULT => {
        MESSAGE.reply(`Success.\n ${GAME} has been removed from the verified list.`)
    }).catch(err => {
        MESSAGE.reply(`Error.\n ${GAME} is not in the verified list.`)
    });
};
//Help command
function help(MESSAGE) {
    message.channel.send(`Here are my available commands:
    \`!lfg PARAMS\`  - Creates a new guild
    \`!lfg kill\`  - Kills me
    \`!lfg help\`  - Shows this dialog (help)`);
};
//Assigns a user into a session
function addLFG(MESSAGE) {
    var AUTHOR = MESSAGE.author,
    GUILD_ID = MESSAGE.guild.id,
    PARAMS = MESSAGE.content.split(" ").slice(1);
    GAME = PARAMS[0]
    config.getGame(GUILD_ID, GAME)
    .then(RESULT => {
        if (RESULT === false) {
            //Game not found
            return MESSAGE.reply("Error.\nInvalid game specified (Please contact server Admin to add the game).\nAlternatively, if you are an Admin use the !lfgadd command.")
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
                        name: ROLE.id
                    });
                    //Adds role to the user
                    MESSAGE.member.addRole(ROLE).then(() => {
                        //Clones the channel
                        MESSAGE.channel.clone(ROLE.name, true)
                        .then(CHANNEL => {
                            //Sets permissions
                            CHANNEL.overwritePermissions(GUILD_ID, {
                                "SEND_MESSAGES": false
                            })
                            CHANNEL.overwritePermissions(ROLE, {
                                "SEND_MESSAGES": true
                            })
                            MESSAGE.reply(`Success.\nGame created in <#${CHANNEL.id}>. Click the + reaction below to join.`)

                            .then(m => { 
                                m.react("➕")
                                config.createSession(GUILD_ID, AUTHOR.id, ROLE.id, GAME,CHANNEL.id, m.id) // Testing params for now
                                config.addUser(GUILD_ID, ROLE.id, AUTHOR.id)
                            });
                        }).catch(errr => {
                            console.error(errr)
                        });
                    });
                }).catch(err =>{
                    console.error(err)
                });
            } 
            //End of session creation
            //Adds user to existing session
            else { 
                config.addUser(GUILD_ID, FOUND, AUTHOR.id)
                MESSAGE.member.addRole(FOUND)
                config.getChannelID(GUILD_ID,FOUND).then(CHN => {
                    MESSAGE.reply(`Success.\nYou have been added to a session in <#${CHN}}>! :D`)
                })
            };
        });
    });
};

//Removes a user from a session
function removeLFG(message) {
    
    
    
};

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
    } else if (message.content.split(" ")[0] === '!lfg') { // Creates a new guild
        addLFG(message);
    } else if (message.content.split(" ")[0] === '!lfgadd') { //Hopefully the parameters will be sorted out with the new framework
        addGame(message);
    }
});

bot.on('messageReactionAdd', (reaction, user) => {
    if(reaction.emoji.name=="➕" && user.id!=bot.user.id) {
        config.addUser(reaction.message.guild.id, config.getRoleByReaction(reaction, reaction.message.guild.id), user.id)
        reaction.message.guild.member(user).addRole(config.getRoleByReaction(reaction, reaction.message.guild.id))
    }
});

process.on('unhandledRejection', err => {
    console.error(`Uncaught Rejection (${err.status}): ${err && err.stack || err}`);
});

bot.login(process.env.TOKEN);
