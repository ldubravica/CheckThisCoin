const socket = new WebSocket("ws://localhost:3000");

let playerID = -1;
let gameID = -1;
let board = [[1,0,1,0,1,0,1,0],[0,1,0,1,0,1,0,1],[1,0,1,0,1,0,1,0],[0,0,0,0,0,0,0,0],
			 [0,0,0,0,0,0,0,0],[0,2,0,2,0,2,0,2],[2,0,2,0,2,0,2,0],[0,2,0,2,0,2,0,2]];

let playerTurn;
let playerAte;
let friendlyPieces;
let enemyPieces;
let diffMoveY;
let diffEatY;
let diffEnemyY;
let endLine;

function setUpBoard() {
	for (let y = 0; y < 8; y++) {
		for (let x = 0; x < 8; x++) {
			if (board[y][x] == 0)
				document.getElementById(`b${y}${x}`).src = "images/none.png";
			else if (board[y][x] == 1)
				document.getElementById(`b${y}${x}`).src = "images/coin_bit.png";
			else if (board[y][x] == 2)
				document.getElementById(`b${y}${x}`).src = "images/coin_usd.png";
			else if (board[y][x] == 3)
				document.getElementById(`b${y}${x}`).src = "images/coin_bit_queen.png";
			else if (board[y][x] == 4)
				document.getElementById(`b${y}${x}`).src = "images/coin_usd_queen.png";
		}
	}
}

let holding = false;
let oldX = 0;
let oldY = 0;

function movePiece(clickedID) {
	const currY = parseInt(clickedID.substring(1,2));
	const currX = parseInt(clickedID.substring(2,3));

	if (!playerTurn) { // if not player's turn
		notify("Not your turn!", true);
	} else if (!holding && friendlyPieces.includes(board[currY][currX])) { // if the first selected tile is a friendly piece
		oldX = currX;
		oldY = currY;
		holding = true;
		playerAte = false;
		document.getElementById(`d${oldY}${oldX}`).style.background = "#006600";
	} else if (holding && validMove(oldX, oldY, currX, currY)) { // if the second selected tile is a valid move
		// update and generate new board
		board[currY][currX] = currY == endLine ? friendlyPieces[1] : board[oldY][oldX];
		board[oldY][oldX] = 0;
		document.getElementById(`d${oldY}${oldX}`).style.background = "#2b002c";
		setUpBoard();

		holding = false;
		socket.send(`board:${gameID}:${playerID}:${JSON.stringify(board)}`);
		playerTurn = playerAte;
		if (!playerTurn) socket.send(`turn:${gameID}:${playerID}`)

		// notify the server and the user if the game is over
		if (hasUserWon()) {
			socket.send(`exit:${gameID}:${playerID}:won`);
			notify(`You won!`, false);
		}
	} else {
		document.getElementById(`d${oldY}${oldX}`).style.background = "#2b002c";
		notify("Invalid move!", true);
		holding = false;
	}
}

// VALIDITY OF THE MOVE

function validMove(startX, startY, endX, endY) {
	if (board[endY][endX] != 0)
		return false;
	if (board[startY][startX] == friendlyPieces[0])
		return validMoveForward(startX, startY, endX, endY) || validEat(startX, startY, endX, endY);
	if (board[startY][startX] == friendlyPieces[1])
		return validQueenMove(startX, startY, endX, endY);
}

function validMoveForward(startX, startY, endX, endY) {
	const allowedY = endY - startY == diffMoveY;
	const allowedX = Math.abs(endX - startX) == 1;
	return allowedY && allowedX;
}

function validEat(startX, startY, endX, endY) {
	const enemyX = (startX + endX) / 2;
	const enemyY = startY + diffEnemyY;
	let allowedMove = false;

	if (endY - startY != diffEatY || Math.abs(endX - startX) != 2) return false;
	if (enemyPieces.includes(board[enemyY][enemyX])) {
		board[enemyY][enemyX] = 0;
		allowedMove = true;
	}
	
	playerAte = allowedMove;
	return allowedMove;
}

function validQueenMove(startX, startY, endX, endY) {
	if (Math.abs(endX - startX) != Math.abs(endY - startY)) return false;

	let stepX = endX > startX ? 1 : -1;
	let stepY = endY > startY ? 1 : -1;
	let foundEnemy = false;
	let enemyX = 0;
	let enemyY = 0;

	while (endX != startX) {
		startX += stepX;
		startY += stepY;
		if (enemyPieces.includes(board[startY][startX])) {
			if (foundEnemy) return false;
			foundEnemy = true;
			enemyX = startX;
			enemyY = startY;
		}
		if (friendlyPieces.includes(board[startY][startX])) return false;
	}

	if (foundEnemy) {
		board[enemyY][enemyX] = 0;
		playerAte = true;
	}
	
	return true;
}

// TOOLS

function hasUserWon() {
	for (let i = 0; i < 8; i++) {
		for (let j = 0; j < 8; j++) {
			if (enemyPieces.includes(board[j][i])) return false;
		}
	}
	return true;
}

function notify(msg, timeout) {
	document.getElementById("notification").innerHTML = msg;
	if (timeout)
		setTimeout( function() {
			document.getElementById("notification").innerHTML = "_";
		}, 4000);
}

function setupPlayer(bitPlayer) {
	playerTurn = bitPlayer; // makes bit_player go first
	friendlyPieces = bitPlayer ? [1, 3] : [2, 4];
	enemyPieces = bitPlayer ? [2, 4] : [1, 3];
	diffMoveY = bitPlayer ? 1 : -1;
	diffEatY = bitPlayer ? 2 : -2;
	diffEnemyY = bitPlayer ? 1 : -1;
	endLine = bitPlayer ? 7 : 0;
}

function leaveGame() {
	socket.send(`exit:${gameID}:${playerID}:left`);
}

// WEB SOCKET

socket.onopen = function() {
	socket.send("screen:game");
};

socket.onmessage = function(event) {
	const input = event.data.split(":");
	if (input[0] == "pid") {
		playerID = input[1];
		socket.send(`registered:pid:${playerID}`);
		notify("waiting for opponent", false);
	} else if (input[0] == "gid") {
		setupPlayer(input[1] == "bit");
		gameID = input[2];
		socket.send(`registered:gid:${gameID}:pid:${playerID}`);
		setUpBoard();
		notify(`You are ${playerTurn ? "first, bitcoin!" : "second, dollar!"}`, true);
	} else if (input[0] == "board") {
		board = JSON.parse(input[1]);
		socket.send(`received:${gameID}:${playerID}`);
		setUpBoard();
	} else if (input[0] == "turn") {
		playerTurn = true;
	} else if (input[0] == "exit") {
		playerTurn = false;
		notify(`You ${input[1]}!`, false);
	} else {
		socket.send(`Invalid message sent to player ${playerID}: ${input}`);
	}
};
