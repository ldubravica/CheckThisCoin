var express = require("express");
var http = require("http");
var websocket = require("ws");

var splash = false;

// setting the core
var currentGames = [];
var waitingPlayers = [];
var playerid = 0; // try: removing or renaming to sessionID which stays across both splash and game screen
var gameid = 0;

function Game() {
	var id = -1;
	var player1 = -1; // set to ws
	var player2 = -1; // set to ws
	var board = "1010101001010101101010100000000000000000020202022020202002020202"; 
	var turn = 1; // when set to 0, game is loading
}

var port = process.argv[2];
var app = express();

app.use(express.static(__dirname + "/public"));

var server = http.createServer(app);

const wss = new websocket.Server({ server });

wss.on("connection", function(ws) {

	// WARM UP

	console.log("[SER] server ready");

	// SET UP CLIENT
	ws.send("playerid:" + ((playerid % 2) + 1));
	waitingPlayers.unshift(ws);
	playerid++;
	
	// SET UP GAME

    ws.on("message", function incoming(message) {
		console.log("[CLI] " + message);
		if(message == "splash:info") {
			playerid--;
			waitingPlayers.shift();
			console.log("[SER] player " + playerid + " deregistered due to splash");
			ws.send(currentGames.length);
		}
		else if (message.startsWith("registered:")) {
			setUpGame();
		}
		// UPDATE BOARD
		else if (message.startsWith("board:")) { // board:3:1:1010...0202
			updateBoard(message);
		}
		// EXIT
		else if (message.startsWith("exit:")) { // exit:3:2
			exitGame(message, ws);
		}
	});

	ws.on("close", function() {
		exitGame("exit:0:0", ws);
	});

});

server.listen(port);

function setUpGame() {
	if (waitingPlayers.length < 2) return;

	var newGame = new Game();
	newGame.id = gameid++; // not tested: ++
	newGame.player1 = waitingPlayers.pop();
	newGame.player2 = waitingPlayers.pop();
	currentGames.push(newGame);

	try{
		newGame.player1.send("gameid:" + "bit:" + newGame.id);
		newGame.player2.send("gameid:" + "usd:" + newGame.id);
	}
	catch {
		exitGame("exit:0");
	}
}

function updateBoard(message) {  // board:3:1:1010...0202
	var input = message.split(":");
	var temp_gameid = input[1];
	var temp_playerid = input[2];
	var next_playerid = (temp_playerid == 1) ? 2 : 1;
	var temp_board = input[3];
	var pos = -1;

	for (let i = 0; i < currentGames.length; i++) {
		if (currentGames[i].id == temp_gameid) {
			pos = i;
			i = currentGames.length;
		}
	}

	currentGames[pos].board = temp_board;
	currentGames[pos].turn = next_playerid;
	currentGames[pos]["player" + next_playerid].send("board:" + currentGames[pos].board);
}

function exitGame(message, ws) {
	var input = message.split(":");
	
	for (let i = 0; i < currentGames.length; i++) {
		if (currentGames[i].id == input[1]) {
			if (input[2] == 0) {
				input[2] = ws == currentGames[i].player1 ? 1 : 2; 
			}

			var contact = currentGames[i]["player" + (input[2] == 1 ? 2 : 1)];
			if (contact != -1) contact.send("exit:" + input[1]);

			currentGames[i].player1 = -1;
			currentGames[i].player2 = -1;

			if (i == currentGames.length - 1) {
				currentGames.pop();
			}
			else {
				currentGames[i] = currentGames[currentGames.length - 1];
				currentGames.pop();
			}

			return;
		}
	}
}