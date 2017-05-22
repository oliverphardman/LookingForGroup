const fs = require("fs");
const config = module.exports = {
    data: require("../data/config.json")
};

config.save = function() {
    fs.writeFile("../data/config.json", JSON.stringify(config.data), err => {
        if (err) {
            throw err;
        }
    });
};

config.addGuild = function(id, role_id) {
    config.data[id] = {
        role: role_id,
        users: {}
    };

    config.save();
};

config.getGuild = function(guild) {
    return config.data[guild.id];
};

config.addUser = function(guild, role, user) {
    data[guild.id][role.id].members.push(user.id)
    config.save();
};

config.removeUser = function(guild, user) {
    delete guild.users[user.id];
    config.save();
};

config.getUser = function(guild, user) {
    return guild.users[user.id];
};

config.createSession = function(guild, user, role, max_players, game) {
    data[guild.id][role.id] = {
        game: this.game,
        max_players: this.max_players,
        members: []
    }
}