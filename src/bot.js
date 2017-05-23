const config = require('./config.js');
const Discord = require('discord.js');
const bot = new Discord.Client();

//TODO: make these configurable? idk ¯\_(ツ)_/¯
const ROLE_NAME = 'jsLFG';
const CHANNEL_NAME = 'looking-for-group';

require('dotenv').config();

//This can be changed pretty easily to take only a guild as an argument instead of replying to a command if necessary
function setupGuild(message, guild) {
    if (config.data[guild.id]) {
        return message.channel.send('This server is already set up.');
    } else {
        Promise.all([
            guild.createRole({
                name: ROLE_NAME,
                color: '#ffaa00'
            }),
            guild.createChannel(CHANNEL_NAME, 'text')
        ]).then(values => {
            config.addGuild(guild.id, values[0].id);
            message.channel.send('Server setup complete!');
        });
    }
}

function addGame(msg) {
    var guild = msg.guild,
        params = msg.content.split(" ").slice(1);
    config.addGame(guild, params[0]).then(value => {
        msg.reply(`Added ${params[0]} to the verified games list.`)

    }).catch(msg.reply("An uknown error occured is the game arleady added?"));

}

function help(msg) {
    msg.channel.send(`Here are my available commands:
      \`!lfg PARAMS\`  - Creates a new guild
      \`!lfg kill\`  - Kills me
      \`!lfg help\`  - Shows this dialog (help)`);
}

function addLFG(msg) {
    var author = msg.author,
        guild = msg.guild,
        params = msg.content.split(" ").slice(1);
    config.getGame(guild, params[0])
        .then(result => {

            if (result === false) {
                return msg.reply("Invalid game specified (Please contact server Admin to add the game).\n  Alternatively, if you are an Admin use the !lfgadd command.")
            }
            msg.guild.createRole({
                name: 'TEMP'
            })
                .then(role => {
                    role.edit({
                        name: role.id
                    })
                    msg.member.addRole(role).then(() => {
                        msg.channel.clone(role.name, true)
                            .then(channel => {
                                channel.overwritePermissions(msg.guild.id, {
                                    "SEND_MESSAGES": false
                                })
                                channel.overwritePermissions(role, {
                                    "SEND_MESSAGES": true
                                })
                                msg.reply(`Game created in <#${channel.id}>. Click the + reaction below to join.`)
                                    .then(m => { m.react("➕"); return m; }).then(m => {
                                        config.createSession(guild, author, role, params[0], m.id) // Testing params for now
                                        config.addUser(guild, role.id, author)
                                    });
                            }).catch(console.error)
                    });
                }).catch(console.error)
        })
}


function removeLFG(message) {



}

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
    } else if (message.content === '!lfg setup') { //
        setupGuild(message, message.guild);
    } else if (message.content === '!lfg help') { // Help command (sends a description about the bot)
        help(message);
    } else if (message.content.split(" ")[0] === '!lfg') { // Creates a new guild
        addLFG(message);
    } else if (message.content.split(" ")[0] === '!lfgadd') {
        addGame(message);
    }
});

bot.on('messageReactionAdd', (reaction, user) => {
    if(reaction.emoji.name=="➕" && user.id!=bot.user.id)
        config.addUser(reaction.message.guild, config.getRoleByReaction(reaction, reaction.message.guild), user)
})

process.on('unhandledRejection', err => {
    console.error(`Uncaught Rejection (${err.status}): ${err && err.stack || err}`);
});

bot.login(process.env.TOKEN);