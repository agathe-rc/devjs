'use strict'
/////////// FUNCTIONS
var displayQuestion = function(msg) {
    $('#question p:first-child').text('Question #' + msg.number);
    $('#question p:last-child').text(msg.question);
};

var displayResponse = function(msg) {
    $('#question').append('<p>Réponse : ' + msg + '</p>')
};

/////////// SCRIPT
$(document).ready(function() {
    let socket = io('http://35.180.42.176');
    $('#game').hide();
/////////// PLAYER ARRIVES ON WEBSITE
    socket.emit('newPlayer', true);
    socket.on('allPlayers', function(message) {//when connected on website, client receives list of connected players
        var dbPlayers = message.highscore;
        dbPlayers.forEach(function(dbPlayer) { //displaying high scores
            $('#highscore > ul').append('<li>' + dbPlayer.name + ' : ' + dbPlayer.score + '/5</li>');
        });
        if (message.players[0]) { //if someone is already connected, he is appended to the screen
            $('#players').append('<div id="' + message.players[0].name + '"class="col-5"><div class="name">' + message.players[0].name + '</div><br><form class="player-form"><input class="resother form-control" type="text"><br><input class="btn" type="submit" value="Répondre"></form></div>');
            $('#players > div[id="'+ message.players[0].name +'"] > form > input').attr('disabled', 'true');//other player's input disabled
        }
    });

    socket.on('3dPlayer', function(sorry) {//if 3d player, sorry you're out!
        alert(sorry);
        $('#login>form>div>input').prop('disabled', true);
    });

/////////// PLAYER LOGS IN
    $('#name-form').on('submit', function(event) {//when login form submitted
        event.preventDefault();
        var playerName = $('#playername');
        var alphanumers = /^[a-zA-Z0-9èéëïàçôîû]+$/i
        if (!alphanumers.test(playerName.val())) {
            playerName.val('');
            playerName.attr('placeholder', 'Veuillez saisir un nom valide');
            $('#name-form > input').prop('disabled', false);
        } else {
            socket.emit('playerName', playerName.val());
            $('#name-form > input').prop('disabled', true);
        }
    });//end of submit event

    socket.on('nameTaken', function(warning) {//if name is already taken
        $('#playername').val('');       
        $('#playername').attr('placeholder', warning);
        $('#name-form > input').prop('disabled', false);
    });

    socket.on('playerLogged', function(message) {
        //console.log(message);
        if (message.logged === true) {//then his own name is added to the screen
            $('#login').hide();
            $('#game').show();
            $('#players').append('<div id="' + message.name + '"class="col-5"><div class="name">' + message.name + '</div><br><form class="resform player-form"><input id="'+ message.name + '"class="res form-control" type="text"><br><input class="btn" type="submit" value="Répondre"></form></div>');
            $('.res').prop('disabled', true);
        }
    });

    socket.on('playerLoggedAll', function(message) { //his name is added to the other player's screen
        $('#players').append('<div id="' + message.name + '"class="col-5"><div class="name">' + message.name + '</div><br><form class="player-form"><input class="resother form-control" type="text"><br><input class="btn" type="submit" value="Répondre"></form></div>');
        $('#players > div[id="'+ message.name +'"] > form > input').prop('disabled', true);//other player's input disabled
    });

    socket.on('waiting', function(waiting){//player 1 waits for player 2
        $('#question p:first-child').text(waiting);
    });

    socket.on('twoPlayers', function(message) {//remove waiting message if 2 players logged
        if (message.twoPlayers == true) {
            $('.res').prop('disabled', false);//if 2d player, input becomes available
            $('#question p:first-child').text('');//clears waiting
            socket.emit('launchQuestion1', true);
        }
    });

    $(document).on('change', '.res', function() {//when input value changes
        var input = $('.res');
        socket.emit('inputVal', input.val());//value sent to the server
    });
    
    socket.on('inputValAll', function(inputVal) {
        $('.resother').val(inputVal);//value of other player put in matching div
    });

/////////// GAME
    //QUESTIONS
    socket.on('question1', function(message) {//receives question
        displayQuestion(message);//displays question
    });

    socket.on('question2', function(message) {
        displayQuestion(message);
        $('.resform .res').prop('disabled', false);
    });

    socket.on('question3', function(message) {
        displayQuestion(message);
        $('.resform .res').prop('disabled', false);
    });

    socket.on('question4', function(message) {
        displayQuestion(message);
        $('.resform .res').prop('disabled', false);
    });

    socket.on('question5', function(message) {
        displayQuestion(message);
        $('.resform .res').prop('disabled', false);
    });


    //RESPONSES
    $(document).on('submit', '.resform', function(event) {//when player sends response
        event.preventDefault();
        var input = $('.resform .res');
        var alphanumers = /^[a-zA-Z0-9èéëïàçôîû\s]+$/
        if (!alphanumers.test(input.val())) {
            input.val('');
            input.attr('placeholder', 'Veuillez saisir une réponse valide');
        } else {
            socket.emit('response', input.val());
            input.val('');
            input.removeAttr('placeholder');
            input.prop('disabled', true);
        }
    });

    socket.on('response1Saved', function(message) {
        if (message == true) {
            socket.emit('launchQuestion2', true);
        }
    });

    socket.on('response2Saved', function(message) {
        if (message == true) {
            socket.emit('launchQuestion3', true);
        }
    });

    socket.on('response3Saved', function(message) {
        if (message == true) {
            socket.emit('launchQuestion4', true);
        }
    });

    socket.on('response4Saved', function(message) {
        if (message == true) {
            socket.emit('launchQuestion5', true);
        }
    });

    socket.on('response5Saved', function(message) {
        if (message == true) {
            socket.emit('endGame', true);
            $('.res').prop('disabled', true);
            $(".resform > input[type='submit']").prop('disabled', true);
            $('#question p:first-child').text('Terminé !');
            $('#question p:last-child').text('');
        }
    });

    //RESULTS
    socket.on('results', function(players) {
        $('#question p:last-child').text('Rechargez la page pour rejouer.');
        players.forEach(function(player) {
            $('#results').append('<div class="col-5"><p>Score : ' + player.score + '/5</p></div>');
        });
    });

/////////// PLAYER DISCONNECTS
    socket.on('playerDisconnected', function(name) {
        $('#question p:first-child').text(name + ' a quitté la partie ! Rechargez la page pour rejouer.');
        $('#question p:last-child').text('');
        $('.res').prop('disabled', true);
        $(".resform > input[type='submit']").prop('disabled', true);
        $('#players').hide();
        $('#results').hide();
    });
});//end of script

