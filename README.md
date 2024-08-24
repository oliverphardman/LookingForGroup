# This repository is no longer maintained!
I do not recommend forking it. There are several incompatibilities with the Discord API. You will need to rework the entire command system if you want to use it!

# LookingForGroup
Welcome! Looking For Group or LFG for short is a bot for the widely popular gamer messaging service [Discord](https://discordapp.com).

## The Purpose
LFG is a bot designed to help server users form groups with other players. It's essentially a matchmaking service. Players can be automagically placed into groups with other players playing the same game.

For example, LFG can be used to help a player assemble a 5-man team to play a competitive game. This option would be very useful when used with games like Counter-Strike: Global Offensive or Overwatch.

## What Happens?
The server admin configures the bot to work with any game, a list of games or a single game. For this example, this server will be dedicated to playing CS:GO competitive matches.

The first user starts a group

_!lfg CSGO 5_
5 represents the group size including his or herself. CSGO is the game he/she wants to play.

The group is created resulting in a number of things:
* The creation of a text channel that is locked to group members
* The creation of a voice channel that is locked to group members
* The player is assigned a role

The bot will then post a message in the channel the command was executed in telling all players that a group is waiting for players. Other players can then use a command or can 'react' to that message which will automatically add them to  the group.

Once the group has reached its maximum player limit or _!lfg lock_ is called, no new players will be able to join the group.

The group will disband when _!lfg end_ is called or when the  voice/text channels are inactive for 15 minutes (this value can be changed). The channels will be destroyed with the group.

## License
This project is licensed under the MIT license and permits modification, redistribution and copying of the source code.
