const config = require('./config.js');
const Discord = require('discord.js');
const bot = new Discord.Client();

//TODO: make these configurable? idk ¯\_(ツ)_/¯
const ROLE_NAME = 'jsLFG';
const CHANNEL_NAME = 'looking-for-group';

require('dotenv').config();

//This can be changed pretty easily to take only a guild as an argument instead of replying to a command if necessary
function setupGuild(message, guild) {
    if(config.data[guild.id]) {
        message.channel.send('This server is already set up.');
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

function addLFG(message) {
    var author = message.author,
        guild = config.getGuild(message.guild);

    if(guild) {
        if(config.getUser(guild, author)) {
            message.member.removeRole(guild.role).then(member => {
                config.removeUser(guild, author);
                message.reply('you are no longer marked as looking for a group.');
            });
        } else {
            message.member.addRole(guild.role).then(member => {
                config.addUser(guild, author);
                message.reply('you have been marked as looking for a group.');
            });
        }
    } else {
        message.reply('This server needs to be set up first.');
    }
}

bot.on('ready', () => {
    console.log('Online');
    bot.generateInvite(['READ_MESSAGES', 'SEND_MESSAGES', 'MANAGE_CHANNELS', 'MANAGE_ROLES']).then(invite => {
        console.log(`Use the following link to invite: ${invite}`);
    });
});

bot.on('message', message => {
    if(message.author.bot) return;

    if(message.content === '!lfg kill') {
        process.exit(0);
    } else if(message.content === '!lfg setup') {
        setupGuild(message, message.guild);
    } else if(message.content === '!lfg') {
        addLFG(message);
    }
});

process.on('unhandledRejection', err => {
    console.error(`Uncaught Rejection (${err.status}): ${err && err.stack || err}`);
});

bot.login(process.env.TOKEN);