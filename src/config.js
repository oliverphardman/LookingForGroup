const fs = require('fs');
if (!fs.existsSync('../data/config.json')) {
    if (!fs.existsSync('../data'))
        fs.mkdirSync('../data');
    fs.writeFileSync('../data/config.json', '{}');
}
const config = module.exports = {
    data: require('../data/config.json')
};

// Saves the changes made to config.json
config.save = function () {
    fs.writeFile('../data/config.json', JSON.stringify(config.data), err => {
        if (err) {
            throw err;
        }
    });
};

config.addUser = function (GUILD_ID, ROLE_ID, USER_ID) {
    return new Promise((resolve, reject) => {
        try {
            initIfNeeded(GUILD_ID);
            for (let i = 0; i < config.data[GUILD_ID].games.length; i++) {
                if (config.data[GUILD_ID][ROLE_ID].game == config.data[GUILD_ID].games[i][0]) {
                    if (config.data[GUILD_ID][ROLE_ID].members.length < config.data[GUILD_ID].games[i][1]) {
                        if (config.data[GUILD_ID][ROLE_ID].members.includes(USER_ID) == false) { //Makes sure there will be no duplicate entries in the player list
                            config.data[GUILD_ID][ROLE_ID].members.push(USER_ID)
                            config.save()

                            if (config.data[GUILD_ID][ROLE_ID].members.length == config.data[GUILD_ID].games[i][1]) {
                                config.data[GUILD_ID].games[i].full = true
                                resolve(config.data[GUILD_ID].games[i])
                            } else {
                                var result = config.data[GUILD_ID].games[i]
                                resolve(result)
                            }
                        }
                    }
                }
            }
        } catch (err) {
            reject(err)
        }
    })
};

config.removeUser = function (GUILD_ID, ROLE_ID, USER_ID) {
    initIfNeeded(GUILD_ID);
    if (USER_ID != config.data[GUILD_ID][ROLE_ID].creator) {
        delete config.data[GUILD_ID][ROLE_ID].members.splice(config.data[GUILD_ID][ROLE_ID].members.indexOf(USER_ID), 1);
        config.save();
    }
};

// Creates a new configuration (config.json) for the current guild
config.createSession = function (GUILD_ID, USER_ID, ROLE_ID, GAME, CHANNEL_ID, MESSAGE_ID) {
    initIfNeeded(GUILD_ID);
    config.data[GUILD_ID][ROLE_ID] = {
        creator: USER_ID,
        game: GAME,
        channel: CHANNEL_ID,
        members: [],
        messageid: MESSAGE_ID
    };
    config.save();
};

// Adds a new game to the allowed games list along with the max group size
config.addGame = function (GUILD_ID, GAME, LIMIT) {
    return new Promise((resolve, reject) => {
        try {
            initIfNeeded(GUILD_ID);
            if (config.data[GUILD_ID].games.hasOwnProperty(GAME)) {
                reject(false);
            }
            config.data[GUILD_ID].games.push([GAME, LIMIT]);
            config.save();
            resolve(true);
        } catch (err) {
            console.error(err);
            reject(err);
        }
    });
};

// Removes a game from the allowed games list
config.removeGame = function (GUILD_ID, GAME) {
    return new Promise((resolve, reject) => {
        try {
            initIfNeeded(GUILD_ID);
            var newGameArray = config.data[GUILD_ID].games.filter(function (val) { // Clone the Games array wothout the selected game
                if (val[0] === GAME) {
                    return false;
                }
                return true;
            });
            config.data[GUILD_ID].games = newGameArray; // Update the existing games array
            config.save();
            resolve(true);
        } catch (err) {
            reject(false);
        }
    });
};

// Promises a specified game on the list
config.getGame = function (GUILD_ID, GAME) {
    return new Promise((resolve, reject) => {
        try {
            initIfNeeded(GUILD_ID);
            var gameFound = false; // Was the game found?
            config.data[GUILD_ID].games.filter(function (val) { // Search for the game
                if (val[0] === GAME) {
                    gameFound = true;
                }
            });
            if (config.data[GUILD_ID] === undefined || !gameFound) {
                resolve(false);
            } else {
                resolve(true);
            }
        } catch (err) {
            console.error(err);
            resolve(false);
        }
    });
};

// Returns a list of games and max players
config.getGames = function (GUILD_ID) {
    initIfNeeded(GUILD_ID);
    return config.data[GUILD_ID].games;
};

config.getRoleByReaction = function (REACTION, GUILD_ID) { //https://stackoverflow.com/a/9907509
    initIfNeeded(GUILD_ID);
    var obj = config.data[GUILD_ID];
    for (var prop in obj) {
        if (obj.hasOwnProperty(prop)) {
            if (obj[prop].messageid === REACTION.message.id)
                return prop;
        }
    }
};

config.findSession = function (GUILD_ID, GAME) {
    return new Promise((resolve, reject) => {
        if (config.data[GUILD_ID] === undefined) {
            resolve(false);
        } else {
            for (element in config.data[GUILD_ID]) {
                if (config.data[GUILD_ID][element].game === GAME) {
                    resolve(element);
                }
            }
            resolve(false);
        }
    });
};

config.getChannelID = function (GUILD_ID, SESSION) {
    return new Promise((resolve, reject) => {
        initIfNeeded(GUILD_ID);
        resolve(config.data[GUILD_ID][SESSION].channel);
    });

};

function initIfNeeded(GUILD_ID) {
    if (config.data[GUILD_ID] === undefined || config.data[GUILD_ID].games === undefined) {
        config.data[GUILD_ID] = {
            games: []
        };
    }
}
