const fs = require("fs");
const config = module.exports = {
    data: require("../data/config.json")
};

config.save = function () {
    fs.writeFile("data/config.json", JSON.stringify(config.data), err => {
        if (err) {
            throw err;
        }
    });
};

config.addGuild = function (id, role_id) {
    config.data[id] = {
        role: role_id,
        users: {}
    };
    config.save();
};

config.getGuild = function (guild) {
    return config.data[guild.id];
};

config.addUser = function (guild, roleid, user) {
    config.data[guild.id][roleid].members.push(user.id)
    config.save();
};

config.removeUser = function (guild, user) {
    delete guild.users[user.id];
    config.save();
};

config.getUser = function (guild, user) {
    return guild.users[user.id];
};

config.createSession = function (guild, user, role, game, msgid) {
    if (config.data[guild.id] === undefined) {
        config.data[guild.id] = {}
    }
    config.data[guild.id][role.id] = {
        game: game,
        members: [],
        messageid: msgid
    }
    config.save();
};

config.addGame = function (guild, game) {
    return new Promise((resolve, reject) => {
        try {

            if (config.data[guild.id] === undefined || config.data[guild.id].games === undefined) {
                config.data[guild.id] = {
                    games: []
                }
            } else if (config.data[guild.id].games.hasOwnProperty(game)) {
                reject(false)
            }
            config.data[guild.id].games.push(game)
            config.save()
            resolve(true)
        } catch (err) {
            console.error(err)
            reject(err)
        }
    });
}

config.getGame = function (guild, game) {
    return new Promise((resolve, reject) => {
        try {
            if (config.data[guild.id] === undefined || config.data[guild.id].games.indexOf(game) === -1) {
                resolve(false)
            } else {
                resolve(true)
            }
        } catch (err) {
            console.error(err)
            resolve(false)
        }
    })

}

config.getRoleByReaction = function (reaction, guild) { //https://stackoverflow.com/a/9907509
    var obj = config.data[guild.id];
    for (var prop in obj) {
        if (obj.hasOwnProperty(prop)) {
            if (obj[prop].messageid === reaction.message.id)
                return prop;
        }
    }
}
