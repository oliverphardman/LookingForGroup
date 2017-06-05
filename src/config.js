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
config.save = function() {
    fs.writeFile('../data/config.json', JSON.stringify(config.data), err => {
        if (err) {
            throw err;
        }
    });
};

config.checkUser = function(USER_ID) {
    for (let i = 0; i <= Object.keys(config.data).length - 1; i++) {
        let objectKeys = Object.keys(config.data)[i];
        let keysOfObjectKeys = Object.keys(config.data[objectKeys]);
        if (config.data[objectKeys][keysOfObjectKeys[1]].members.includes(USER_ID)) {
            return false;
        }
    }
    return true;
};

config.cleanGuild = function(GUILD_ID){
    return new Promise((resolve, reject) => {
        try{
            delete config.data[GUILD_ID];
            config.save();
            resolve(true);
        } catch(err) {
            reject(false);
        }
    });
};

// Adds a user to a session
config.addUser = function(GUILD_ID, ROLE_ID, USER_ID) {
    return new Promise((resolve, reject) => {
        try {
            initIfNeeded(GUILD_ID);
            for (let i = 0; i < config.data[GUILD_ID].games.length; i++) {
                if (config.data[GUILD_ID][ROLE_ID].game == config.data[GUILD_ID].games[i][0]) {
                    if (config.data[GUILD_ID][ROLE_ID].members.length < config.data[GUILD_ID].games[i][1]) {
                        if (config.data[GUILD_ID][ROLE_ID].members.includes(USER_ID) == false) { //Makes sure there will be no duplicate entries in the player list
                            config.data[GUILD_ID][ROLE_ID].members.push(USER_ID);
                            config.save();

                            if (config.data[GUILD_ID][ROLE_ID].members.length == config.data[GUILD_ID].games[i][1]) {
                                config.data[GUILD_ID].games[i].full = true;
                                resolve(config.data[GUILD_ID].games[i]);
                            } else {
                                var result = config.data[GUILD_ID].games[i];
                                resolve(result);
                            }
                        }
                    } else {
                        //GROUP IS FULL. DO WHATEVER
                        console.log('Group full');
                        reject('full');
                    }
                }
            }
        } catch (err) {
            reject(err);
        }
    });
};

// Removes a user from the session
config.removeUser = function(GUILD_ID, ROLE_ID, USER_ID) {
    initIfNeeded(GUILD_ID);
    if (USER_ID != config.data[GUILD_ID][ROLE_ID].creator) {
        delete config.data[GUILD_ID][ROLE_ID].members.splice(config.data[GUILD_ID][ROLE_ID].members.indexOf(USER_ID), 1);
        config.save();
    }
};

// Creates a new configuration (config.json) for the current guild
config.createSession = function(GUILD_ID, USER_ID, ROLE_ID, GAME, CHANNEL_ID, MESSAGE_ID) {
    initIfNeeded(GUILD_ID);
    config.data[GUILD_ID][ROLE_ID] = {
        creator: USER_ID,
        game: GAME,
        channel: CHANNEL_ID,
        limit: config.data[GUILD_ID].games[GAME].LIMIT,
        members: [USER_ID],
        messageid: MESSAGE_ID
    };
    config.data[GUILD_ID].sessions.push(ROLE_ID);
    config.save();
};

config.removeSession = function(GUILD_ID, ROLE_ID) {
    initIfNeeded(GUILD_ID);
    delete config.data[GUILD_ID][ROLE_ID];
    config.data[GUILD_ID]['sessions'].splice(config.data[GUILD_ID]['sessions'].indexOf(ROLE_ID), 1);
    config.save();
};

// Adds a new game to the allowed games list along with the max group size
config.addGame = function(GUILD_ID, GAME, LIMIT) {
    return new Promise((resolve, reject) => {
        try {
            initIfNeeded(GUILD_ID);
            if (config.data[GUILD_ID].games.hasOwnProperty(GAME)) {
                reject(false);
            }
            var tempGame = {
                'LIMIT': parseInt(LIMIT)
            };
            config.data[GUILD_ID].games[GAME] = tempGame;
            config.save();
            resolve(true);
        } catch (err) {
            console.error(err);
            reject(err);
        }
    });
};

// Removes a game from the allowed games list
config.removeGame = function(GUILD_ID, GAME) {
    return new Promise((resolve, reject) => {
        try {
            initIfNeeded(GUILD_ID);
            delete config.data[GUILD_ID].games[GAME]; // Delete the game from the object
            config.save()
            resolve(true);
        } catch (err) {
            reject(false);
        }
    });
};

// Promises a specified game on the list
config.getGame = function(GUILD_ID, GAME) {
    return new Promise((resolve, reject) => {
        try {
            initIfNeeded(GUILD_ID);
            if (config.data[GUILD_ID] === undefined || !config.data[GUILD_ID].games[GAME]) {
                resolve(false); // Game not found
            } else {
                resolve(config.data[GUILD_ID].games[GAME]); // Game found
            }
        } catch (err) {
            console.error(err);
            resolve(false);
        }
    });
};

// Returns a list of games and max players
config.getGames = function(GUILD_ID) {
    initIfNeeded(GUILD_ID);
    return config.data[GUILD_ID].games;
};

// Returns a list of sessions
config.getSessions = function(GUILD_ID) {
    initIfNeeded(GUILD_ID);
    var sessions = config.data[GUILD_ID].sessions;
    sessions = sessions.map(val => {
        const game = config.data[GUILD_ID][val].game; // Gets the session's game
        const sessionArr = [
            game,
            config.data[GUILD_ID][val].members.length,
            config.data[GUILD_ID].games[game].LIMIT
        ];
        return sessionArr;
    });
    return sessions;
};

config.getRoleByReaction = function(REACTION, GUILD_ID) { //https://stackoverflow.com/a/9907509
    initIfNeeded(GUILD_ID);
    var obj = config.data[GUILD_ID];
    for (var prop in obj) {
        if (obj.hasOwnProperty(prop)) {
            if (obj[prop].messageid === REACTION.message.id)
                return prop;
        }
    }
};

config.getGuildCount = function(){
    return Object.keys(config.data).length;
}

// Find a session
config.findSession = function(GUILD_ID, GAME) {
    if (config.data[GUILD_ID] === undefined) {
        return false;
    } else {
        for (element in config.data[GUILD_ID]) {
            if (config.data[GUILD_ID][element].game === GAME) {
                return element;
            }
        }
        return false;
    }

};

// Get channel ID
config.getChannelID = function(GUILD_ID, SESSION) {
    return new Promise((resolve, reject) => {
        initIfNeeded(GUILD_ID);
        resolve(config.data[GUILD_ID][SESSION].channel);
    });

};

// Initialises GUILD_ID if necessary
function initIfNeeded(GUILD_ID) {
    if (config.data[GUILD_ID] === undefined || config.data[GUILD_ID].games === undefined) {
        config.data[GUILD_ID] = {
            games: {},
            sessions: []
        };
    }
}