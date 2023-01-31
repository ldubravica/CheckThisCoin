const express = require("express");
const http = require("http");
const websocket = require("ws");

let currentGames = [];
let waitingPlayers = [];
let playerID = 0; // try: removing or renaming to sessionID which stays across both splash and game screen
let gameID = 0;

class Game {
	constructor() {
		this.id = -1;
		this.player1 = -1; // set to ws
		this.player2 = -1; // set to ws
		this.board = [[1,0,1,0,1,0,1,0],[0,1,0,1,0,1,0,1],[1,0,1,0,1,0,1,0],[0,0,0,0,0,0,0,0],
					  [0,0,0,0,0,0,0,0],[0,2,0,2,0,2,0,2],[2,0,2,0,2,0,2,0],[0,2,0,2,0,2,0,2]];
		this.turn = 1; // when set to 0, game is loading
	}
}

const port = process.argv[2];
const app = express();

app.use(express.static(__dirname + "/public"));

const server = http.createServer(app);
const wss = new websocket.Server({ server });

wss.on("connection", function(ws) {

	// WARM UP
	console.log("\n[SER] server ready");

	// SET UP CLIENT
	ws.send(`playerid: ${(playerID % 2) + 1}`);
	waitingPlayers.unshift(ws);
	playerID++;
	
	// SET UP GAME
    ws.on("message", function incoming(message) {
		console.log(`[CLI] ${message}`);
		if(message == "screen:splash") {
			playerID--;
			waitingPlayers.shift();
			console.log(`[SER] player ${playerID} deregistered due to splash`);
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

	const newGame = new Game();
	newGame.id = gameID++; // not tested: ++
	newGame.player1 = waitingPlayers.pop();
	newGame.player2 = waitingPlayers.pop();
	currentGames.push(newGame);

	try{
		newGame.player1.send(`gameid:bit:${newGame.id}`);
		newGame.player2.send(`gameid:usd:${newGame.id}`);
	}
	catch {
		exitGame("exit:0");
	}
}

function updateBoard(message) {  // board:3:1:1010...0202
	const input = message.split(":");
	const currGameID = input[1];
	const currPlayerID = input[2];
	const nextPlayerID = (currPlayerID == 1) ? 2 : 1;
	const currBoard = JSON.parse(input[3]);
	let pos = -1;

	for (let i = 0; i < currentGames.length; i++) {
		if (currentGames[i].id == currGameID) {
			pos = i;
			i = currentGames.length;
		}
	}

	currentGames[pos].board = currBoard;
	currentGames[pos].turn = nextPlayerID;
	currentGames[pos][`player${nextPlayerID}`].send(`board:${JSON.stringify(currentGames[pos].board)}`);
}

function exitGame(message, ws) {
	let input = message.split(":");
	
	for (let i = 0; i < currentGames.length; i++) {
		if (currentGames[i].id == input[1]) {
			if (input[2] == 0) {
				input[2] = ws == currentGames[i].player1 ? 1 : 2; 
			}

			const contact = currentGames[i][`player${input[2] == 1 ? 2 : 1}`];
			if (contact != -1) contact.send(`exit:${input[1]}`);

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