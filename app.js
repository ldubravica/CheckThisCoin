const express = require("express");
const http = require("http");
const websocket = require("ws");

let currentGames = new Map();
let waitingPlayers = [];
let playerID = 99;
let gameID = 99;

class Game {
	constructor() {
		this.id = -1;
		this.players = [];
		this.turn = 0;
		this.board = [[1,0,1,0,1,0,1,0],[0,1,0,1,0,1,0,1],[1,0,1,0,1,0,1,0],[0,0,0,0,0,0,0,0],
					  [0,0,0,0,0,0,0,0],[0,2,0,2,0,2,0,2],[2,0,2,0,2,0,2,0],[0,2,0,2,0,2,0,2]];
	}
}

const port = process.argv[2];
const app = express();

app.use(express.static(__dirname + "/public"));

const server = http.createServer(app);
const wss = new websocket.Server({ server });

wss.on("connection", function(ws) {

    ws.on("message", function incoming(message) {
		console.log(`[CLI] ${message}`);
		if (message == "screen:splash") { // screen:splash
			ws.send(currentGames.size);
		} else if (message == "screen:game") { // screen:game
			ws.send(`pid:${++playerID}`);
			waitingPlayers.unshift(ws);
			setUpGame();
		} else if (message.startsWith("board:")) { // board:gid:pid:[[...]]
			updateBoard(message);
		} else if (message.startsWith("turn:")) { // turn:gid:pid
			updateTurn(message);
		} else if (message.startsWith("exit:")) { // exit:gid:pid:won/left
			exitGame(message, null);
		}
	});

	ws.on("close", function() {
		exitGame("exit:-1:-1:left", ws);
	});

});

server.listen(port);

function setUpGame() {
	if (waitingPlayers.length < 2) return;

	const newGame = new Game();
	newGame.id = ++gameID;
	newGame.players = [waitingPlayers.pop(), waitingPlayers.pop()];
	currentGames.set(newGame.id, newGame);

	try {
		newGame.players[0].send(`gid:bit:${newGame.id}`);
		newGame.players[1].send(`gid:usd:${newGame.id}`);
	}
	catch {
		currentGames.delete(newGame.id);
	}
}

function updateBoard(message) { // board:gid:pid:[[...]]
	const input = message.split(":");
	const currGameID = parseInt(input[1]);
	
	const currGame = currentGames.get(currGameID);
	if (currGame == null) return;

	currGame.board = JSON.parse(input[3])
	currentGames.set(currGameID, currGame);

	// TODO: inverse the board depending on the currGame.turn

	currGame.players[(currGame.turn + 1) % 2].send(`board:${JSON.stringify(currGame.board)}`);
}

function updateTurn(message) { // turn:gid:pid
	const input = message.split(":");
	const currGameID = parseInt(input[1]);
	
	const currGame = currentGames.get(currGameID);
	currGame.turn = (currGame.turn + 1) % 2;
	currentGames.set(currGameID, currGame);

	currGame.players[currGame.turn].send(`turn:${currGame.turn}`);
}

function exitGame(message, ws) { // exit:gid:pid:won/left
	const input = message.split(":");
	let currGameID = parseInt(input[1]);

	if (currGameID == -1) {
		for (const pair of currentGames.entries()) {
			const key = pair[0];
			const value = pair[1];

			if (value.players.includes(ws)) {
				currGameID = key;
				break;
			}
		}
	} 

	const currGame = currentGames.get(currGameID);
	if (currGame == null) return;

	const nextPlayerStatus = input[3] == "won" ? "lost" : "won";
	currGame.players[(currGame.turn + 1) % 2].send(`exit:${nextPlayerStatus}`);

	currentGames.delete(currGameID);
}