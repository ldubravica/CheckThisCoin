const socket = new WebSocket("ws://localhost:3000");

let playerID = -1;
let gameID = -1;
let board = [[1,0,1,0,1,0,1,0],[0,1,0,1,0,1,0,1],[1,0,1,0,1,0,1,0],[0,0,0,0,0,0,0,0],
			 [0,0,0,0,0,0,0,0],[0,2,0,2,0,2,0,2],[2,0,2,0,2,0,2,0],[0,2,0,2,0,2,0,2]];

let isPlayerTurn;
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

let isHolding = false;
let prevX = 0;
let prevY = 0;

function movePiece(clickedID) {
	const currY = parseInt(clickedID.substring(1,2));
	const currX = parseInt(clickedID.substring(2,3));

	const isFriendly = friendlyPieces.includes(board[currY][currX]);
	const samePiece = currX == prevX && currY == prevY;
	const canEat = canAnythingEat();
	const canPrevEat = canPieceEat(prevX, prevY);
	const canCurrEat = canPieceEat(currX, currY);
	const canPrevMove = canPieceMove(prevX, prevY);
	const canCurrMove = canPieceMove(currX, currY);

	console.log("canEat " + canEat);
	console.log("canPrevEat " + canPrevEat);
	console.log("canCurrEat " + canCurrEat);

	if (!isPlayerTurn) {
		notify("Not your turn!", true);
	} else if (!isHolding) {
		if (!isFriendly || !(canCurrEat || canCurrMove)) {
			notify("Invalid move!", true);
			return;
		}
		rememberPiece(currX, currY);
		isHolding = true;
	} else if (isHolding && samePiece && !canCurrEat) {
		isHolding = false;
		document.getElementById(`d${currY}${currX}`).style.background = "#2b002c";
	} else if (isHolding && canPrevEat) {
		let enemyPiece = validEat(prevX, prevY, currX, currY);
		console.log("Eating possible, but is valid? " + (enemyPiece.length == 2));
		if (enemyPiece.length == 0) {
			notify("Invalid move!", true);
			return;
		}
		// remove the eaten piece
		board[enemyPiece[1]][enemyPiece[0]] = 0;
		updateBoard(prevX, prevY, currX, currY);
		// check if another eating is allowed
		if (canPieceEat(currX, currY)) {
			rememberPiece(currX, currY);
		} else {
			finishMove();
		}
	} else if (isHolding && canPrevMove) {
		console.log("Moving possible, but is valid? " + validMove(prevX, prevY, currX, currY));
		if (!validMove(prevX, prevY, currX, currY) || canEat) {
			notify("Invalid move!", true);
			return;
		}
		updateBoard(prevX, prevY, currX, currY);
		finishMove();
	}
}

function canAnythingEat() {
	for (let y = 0; y < 8; y++) {
		for (let x = 0; x < 8; x++) {
			if (friendlyPieces.includes(board[y][x])) {
				let info = canPieceEat(x, y);
				console.log("anything " + info);
				if (info) return true;
			}
		}
	}
	return false;
}

// VALIDITY OF THE MOVE - ALTERNATIVE

function canPieceMove(startX, startY) {
	// console.log("canPieceMove " + board[startY][startX] + " " + friendlyPieces[0] + " " + (board[startY][startX] == friendlyPieces[0]));
	if (board[startY][startX] == friendlyPieces[0]) {
		const optionA = startX > 0 && validMove(startX, startY, startX - 1, startY + diffMoveY);
		const optionB = startX < 7 && validMove(startX, startY, startX + 1, startY + diffMoveY);
		// console.log("canPieceMove " + (optionA || optionB));
		return optionA || optionB;
	} else {
		for (let i = startX, j = startY; i < 8 && j < 8; i++, j++) {
			if (validQueenMove(startX, startY, i, j).length == 0) return true; 
		}
		for (let i = startX, j = startY; i < 8 && j > -1; i++, j--) {
			if (validQueenMove(startX, startY, i, j).length == 0) return true;
		}
		for (let i = startX, j = startY; i > -1 && j < 8; i--, j++) {
			if (validQueenMove(startX, startY, i, j).length == 0) return true;
		}
		for (let i = startX, j = startY; i > -1 && j > -1; i--, j--) {
			if (validQueenMove(startX, startY, i, j).length == 0) return true;
		}
		return false;
	}
}

function canPieceEat(startX, startY) {
	// console.log("canPieceEat " + board[startY][startX] + " " + friendlyPieces[0] + " " + (board[startY][startX] == friendlyPieces[0]));
	if (board[startY][startX] == friendlyPieces[0]) {
		if (startY + diffEatY > 7 || startY + diffEatY < 0) return false;
		const optionA = startX > 1 && (validEat(startX, startY, startX - 2, startY + diffEatY).length == 2);
		const optionB = startX < 6 && (validEat(startX, startY, startX + 2, startY + diffEatY).length == 2);
		// console.log("canPieceEat " + (optionA || optionB));
		return optionA || optionB;
	} else {
		for (let i = startX, j = startY; i < 8 && j < 8; i++, j++) {
			if (validQueenMove(startX, startY, i, j).length == 2) return true; 
		}
		for (let i = startX, j = startY; i < 8 && j > -1; i++, j--) {
			if (validQueenMove(startX, startY, i, j).length == 2) return true;
		}
		for (let i = startX, j = startY; i > -1 && j < 8; i--, j++) {
			if (validQueenMove(startX, startY, i, j).length == 2) return true;
		}
		for (let i = startX, j = startY; i > -1 && j > -1; i--, j--) {
			if (validQueenMove(startX, startY, i, j).length == 2) return true;
		}
		return false;
	}
}

function validMove(startX, startY, endX, endY) {
	// console.log("validMove " + board[startY][startX] + " " + friendlyPieces[0] + " " + (board[startY][startX] == friendlyPieces[0]));
	if (board[endY][endX] != 0) return false;
	if (board[startY][startX] == friendlyPieces[0]) {
		const allowedY = endY - startY == diffMoveY;
		const allowedX = Math.abs(endX - startX) == 1;
		// console.log("validMove " + (allowedY && allowedX));
		return allowedY && allowedX;
	} else {
		return validQueenMove(startX, startY, endX, endY).length == 0;
	}
}

function validEat(startX, startY, endX, endY) {
	// console.log("validEat " + board[endY][endX] + " " + (board[endY][endX] != 0));
	if (board[endY][endX] != 0) return [];

	if (board[startY][startX] == friendlyPieces[0]) {
		const enemyX = (startX + endX) / 2;
		const enemyY = startY + diffEnemyY;

		// console.log("validEat " + (endY - startY == diffEatY && Math.abs(endX - startX) == 2 && enemyPieces.includes(board[enemyY][enemyX])));
		if (endY - startY != diffEatY || Math.abs(endX - startX) != 2) 
			return [];
		if (enemyPieces.includes(board[enemyY][enemyX]))
			return [enemyX, enemyY];
	} else {
		return validQueenMove(startX, startY, endX, endY);
	}
	
	return [];
}

function validQueenMove(startX, startY, endX, endY) {
	// console.log("validQueenMove " + endY + " " + endX);
	if (board[endY][endX] != 0) return [-1];
	if (Math.abs(endX - startX) != Math.abs(endY - startY)) return [-1];

	let stepX = endX > startX ? 1 : -1;
	let stepY = endY > startY ? 1 : -1;
	let foundEnemy = false;
	let enemyX = 0;
	let enemyY = 0;

	while (endX != startX) {
		startX += stepX;
		startY += stepY;
		if (enemyPieces.includes(board[startY][startX])) {
			if (foundEnemy) [-1];
			foundEnemy = true;
			enemyX = startX;
			enemyY = startY;
		}
		if (friendlyPieces.includes(board[startY][startX])) 
			return [-1];
	}

	if (foundEnemy) return [enemyX, enemyY];
	
	return [];
}

// TOOLS

function rememberPiece(currX, currY) {
	prevX = currX;
	prevY = currY;
	document.getElementById(`d${prevY}${prevX}`).style.background = "#006600";
}

function updateBoard(prevX, prevY, currX, currY) {
	board[currY][currX] = currY == endLine ? friendlyPieces[1] : board[prevY][prevX];
	board[prevY][prevX] = 0;
	document.getElementById(`d${prevY}${prevX}`).style.background = "#2b002c";
	setUpBoard();
	socket.send(`board:${gameID}:${playerID}:${JSON.stringify(board)}`);
}

function finishMove() {
	isHolding = false;
	isPlayerTurn = false;
	// check game status
	if (hasUserWon()) {
		socket.send(`exit:${gameID}:${playerID}:won`);
		notify(`You won!`, false);
	} else {
		socket.send(`turn:${gameID}:${playerID}`);
	}
}

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
	isPlayerTurn = bitPlayer; // makes bitPlayer go first
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
		notify(`You are ${isPlayerTurn ? "first, bitcoin!" : "second, dollar!"}`, true);
	} else if (input[0] == "board") {
		board = JSON.parse(input[1]);
		socket.send(`received:${gameID}:${playerID}`);
		setUpBoard();
	} else if (input[0] == "turn") {
		isPlayerTurn = true;
	} else if (input[0] == "exit") {
		isPlayerTurn = false;
		notify(`You ${input[1]}!`, false);
	} else {
		socket.send(`Invalid message sent to player ${playerID}: ${input}`);
	}
};
