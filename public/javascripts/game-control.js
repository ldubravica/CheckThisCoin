const socket = new WebSocket("ws://localhost:3000");

let playerID = -1;
let gameID = -1;
let hasWon = false;
let hasLost = false;
let board = [[1,0,1,0,1,0,1,0],[0,1,0,1,0,1,0,1],[1,0,1,0,1,0,1,0],[0,0,0,0,0,0,0,0],
			 [0,0,0,0,0,0,0,0],[0,2,0,2,0,2,0,2],[2,0,2,0,2,0,2,0],[0,2,0,2,0,2,0,2]];

let playerTurn;
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

	if (!playerTurn) {
		notify("Not your turn!", true);
	} else if (!holding && friendlyPieces.includes(board[currY][currX])) {
		oldX = currX;
		oldY = currY;
		holding = true;
		document.getElementById(`d${oldY}${oldX}`).style.background = "#006600";
	} else if (holding && validMove(oldX, oldY, currX, currY)) {
		board[currY][currX] = currY == endLine ? friendlyPieces[1] : board[oldY][oldX];
		board[oldY][oldX] = 0;
		setUpBoard();

		document.getElementById(`d${oldY}${oldX}`).style.background = "#2b002c";
		holding = false;
		playerTurn = false;

		if (gameOver()) {
			socket.send(`exit:${gameID}:${playerID}`);
			notify(`You ${hasWon ? "won" : "lost"}!`, false);
		} else {
			socket.send(`board:${gameID}:${playerID}:${JSON.stringify(board)}`);
		}
	} else {
		document.getElementById(`d${oldY}${oldX}`).style.background = "#2b002c";
		notify("Invalid move!", true);
		holding = false;
	}
}

// VALIDITY OF THE MOVE

function validMove(startX, startY, endX, endY) { // ADD RECURSIVE CALL FOR EATING or allow user to move his piece again only if he is eating again, implement later w/ networking
	if (board[endY][endX] != 0) return false;
	if (board[startY][startX] == friendlyPieces[0])
		return validMoveForward(startX, startY, endX, endY) || validEat(startX, startY, endX, endY);
	if (board[startY][startX] == friendlyPieces[1])
		return validQueenMove(startX, startY, endX, endY);
}

function validMoveForward(startX, startY, endX, endY) {
	return endY - startY == diffMoveY && Math.abs(endX - startX) == 1;
}

function validEat(startX, startY, endX, endY) {
	const enemyX = (startX + endX) / 2;
	const enemyY = startY + diffEnemyY;

	if (endY - startY != diffEatY || Math.abs(endX - startX) != 2) return false;
	if (enemyPieces.includes(board[enemyY][enemyX])) {
		board[enemyY][enemyX] = 0;
		return true;
	}
	
	return false;
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
	if (foundEnemy) board[enemyY][enemyX] = 0;
	
	return true;
}

// TOOLS

function gameOver() {
	hasWon = true;
	hasLost = true;

	for (let i = 0; i < 8; i++) {
		for (let j = 0; j < 8; j++) {
			if (friendlyPieces.includes(board[j][i])) hasLost = false;
			else if (enemyPieces.includes(board[j][i])) hasWon = false;
		}
	}
	
	return hasWon || hasLost;
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

// WEB SOCKET

socket.onmessage = function(event){
	const input = event.data.split(":");
	if (input[0] == "playerid") {
		playerID = input.pop();
		socket.send(`registered: player${playerID}`);
		notify("waiting for opponent", false);
	} else if (input[0] == "gameid") {
		setupPlayer(input[1] == "bit");
		gameID = input[2];
		socket.send(`game ${gameID}: registered player ${playerID}`);
		setUpBoard();
		notify(`You are ${playerTurn ? "first, bitcoin!" : "second, dollar!"}`, true);
	} else if (input[0] == "board") {
		board = JSON.parse(input.pop());
		playerTurn = true;
		socket.send(`game ${gameID}: board received`);
		setUpBoard();
	} else if (input[0] == "exit") {
		playerTurn = false;
		notify("You won!", false);
	} else {
		socket.send(`Invalid message sent to player ${playerID}: ${input}`);
	}
};

socket.onopen = function(){
	socket.send("screen:game");
};