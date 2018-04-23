////////// VARIABLES
const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server, {wsEngine: 'ws'});
const path = require('path');
const db = require('./db/db.js');
db.dbName('quiz');
var players = [];

//////////  FUNCTIONS
var launchQuestion = function(num, msg, sckt) {
    if (msg == true) {
        db.connectDB(function(linkToDb) {
            console.log('db connected');
            linkToDb.collection('questions').findOne({number: num}, function (err, data) {
                io.emit('question' + num, {//sends question to all clients
                    number: data.number,
                    question: data.question
                });
            });
        });
    }   
};

var checkResponse = function(num, sckt) {
    db.connectDB(function(linkToDb) {
        linkToDb.collection('questions').findOne({number: num}, function(err, data) {
            players.forEach(function(player) {
                var regexp = new RegExp('(' + data['answer'] + ')', 'i');
                if (sckt.id == player.id) {
                    if (player[num].match(regexp)) {//if db answer == regexp of player's response
                        player.score++;
                    }
                }
            });
        });
    });
}

/////////////// HTTP SERVER
app.locals.pretty = true;
app.locals.serverRoot = __dirname;

app.use(express.static(path.join(__dirname + '/public')));

app.get('/', function (req, res, next) {
    res.sendFile(path.join(__dirname + '/public/home.html'));
});

server.listen(80, function () {
    console.log('80');
});

/////////////// SOCKET.IO SERVER
io.on('connection', function(socket) {
/////////// PLAYER ARRIVES ON WEBSITE
    socket.on('newPlayer', function(message) {
        if (players.length == 2) {//if more than 2 connections in array, sorry you're out !
            socket.emit('3dPlayer', 'Partie en cours ! Revenez plus tard...');
        }
        db.connectDB(function(linkToDb) {
            console.log('db connected');
            linkToDb.collection('players').find().sort({score: -1}).limit(5).toArray(function(err, data) {
                socket.emit('allPlayers', {//sends list of connected players to client + 5 top scores from DB
                    players: players,
                    highscore: data
                });
            });
        });
    });

/////////// PLAYER LOGS IN
    socket.on('playerName', function(playerName) {
        db.connectDB(function(linkToDb) {
            console.log('db connected');
            var regexp = new RegExp(playerName, 'i');
            linkToDb.collection('players').find({name: regexp}).toArray(function (err, data) {//checks if input value already exists in DB
                if (data[0]) {//if occurence exists
                    socket.emit('nameTaken', 'Nom déjà pris !');
                } else {
                    linkToDb.collection('players').insertOne({//inserted in DB
                        name: playerName,
                        score: 0
                    }, function (err, r) {
                        if (err) {
                            console.log(err);
                        } else {
                            players.push({//name pushed into the list of connected players
                                name: playerName,
                                id: socket.id,
                                score: 0
                            });
                            socket.emit('playerLogged', {//name + list sent to client only
                                logged: true,
                                name: playerName,
                                players: players
                            });
                            socket.broadcast.emit('playerLoggedAll', { //name sent to other player
                                name: playerName,
                            });
                            if (players.length == 1) {
                                socket.emit('waiting', 'Nous attendons un deuxième joueur...')
                            }
                            if (players.length == 2) {
                                io.emit('twoPlayers', {
                                    twoPlayers: true,
                                    name: playerName
                                });
                            }
                        }
                    });
                }
            });
        });
    });//end of login event

/////////// RECEIVING INPUT VAL ON CHANGE
    socket.on('inputVal', function(inputVal) {
        socket.broadcast.emit('inputValAll', inputVal);
    });

/////////// RECEIVING RESPONSE
    socket.on('response', function(response) {
        players.forEach(function(player) {
            if (socket.id == player.id) { //for current socket
                if (player[4]) {
                    player[5] = response; //response pushed in list of players
                    checkResponse(5, socket);//checks if response is correct
                    socket.emit('response5Saved', true);
                } else {
                    if (player[3]) {
                        player[4] = response;
                        checkResponse(4, socket);
                        socket.emit('response4Saved', true);
                    } else {
                        if (player[2]) {
                            player[3] = response;
                            checkResponse(3, socket);
                            socket.emit('response3Saved', true);
                        } else {
                            if (player[1]) {
                                player[2] = response;
                                checkResponse(2, socket);
                                socket.emit('response2Saved', true);
                            } else {
                                player[1] = response;
                                checkResponse(1, socket);
                                socket.emit('response1Saved', true);
                            }
                        }
                    }
                }

            }
        });
    });//end of socket event

/////////// PLAYERS ARE 2 AND GAME BEGINS
socket.on('launchQuestion1', function(message) {
    launchQuestion(1, message, socket);
});

socket.on('launchQuestion2', function(message) {
    if (players[0][1] && players[1][1]) {//if 2 players have responded, sends next question
        launchQuestion(2, message, socket);
    }
});

socket.on('launchQuestion3', function(message) {
    if (players[0][2] && players[1][2]) {
        launchQuestion(3, message, socket);
    }
});

socket.on('launchQuestion4', function(message) {
    if (players[0][3] && players[1][3]) {
        launchQuestion(4, message, socket);
    }
});

socket.on('launchQuestion5', function(message) {
    if (players[0][4] && players[1][4]) {
        launchQuestion(5, message, socket);
    }
});

socket.on('endGame', function(message) {
    if (message == true) {
        if (players[0][5] && players[1][5]) {//if 2 players have responded all questions
            db.connectDB(function(linkToDb) {
                console.log('db connected');
                players.forEach(function(player) {
                    linkToDb.collection('players').updateOne({name: player.name}, {$set: {score: player.score}});//updating scores in DB
                });
            });
            io.emit('results', players);//sending results to all clients
        }
    }
});

/////////// PLAYER DISCONNECTS
    socket.on('disconnect', function() {//when player disconnects
        players.forEach(function(player) {//checking the connected players list
            if (socket.id == player.id) {//if an entry matches the player
                console.log(player.id + ' est déconnecté');
                players.splice(player);//deleted from the list
                socket.broadcast.emit('playerDisconnected', player.name);//tells the other player
            }
        });
        console.log(players);
    });
});//end of connection