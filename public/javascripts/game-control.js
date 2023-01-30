const socket = new WebSocket("ws://localhost:3000");

let playerID = -1;
let gameID = -1;
let playerMove = false;
let bitPlayer = false;
let board = "1010101001010101101010100000000000000000020202022020202002020202";

function setUpBoard() {
	for (let i = 0; i < 64; i++) {
		if (board.charAt(i) == "0")
			document.getElementById("b" + i).src = "images/none.png";
		else if (board.charAt(i) == "1")
			document.getElementById("b" + i).src = "images/coin_bit.png";
		else if (board.charAt(i) == "2")
			document.getElementById("b" + i).src = "images/coin_usd.png";
		else if (board.charAt(i) == "3")
			document.getElementById("b" + i).src = "images/coin_bit_queen.png";
		else if (board.charAt(i) == "4")
			document.getElementById("b" + i).src = "images/coin_usd_queen.png";
	}
}

let holding = false;
let originalPosition = 0;

function movePiece(clickedID) {
	const selectedPosition = clickedID.substring(1,3);
	if (playerMove && !holding && (bitPlayer ? [1, 3] : [2, 4]).includes(board.charAt(selectedPosition))) {
		originalPosition = selectedPosition;
		holding = true;
		document.getElementById("d" + originalPosition).style.background = "#006600";
	}
	else if (playerMove && holding && board.charAt(selectedPosition) == "0" && validMove(originalPosition, selectedPosition)) {
		// QUEEN STUFF
		if (bitPlayer && selectedPosition > 55)
			board = replaceChar(board, originalPosition, "3");
		else if (!bitPlayer && selectedPosition < 8)
			board = replaceChar(board, originalPosition, "4");

		board = replaceChar(board, selectedPosition, board[originalPosition]);
		board = replaceChar(board, originalPosition, "0");

		setUpBoard();
		document.getElementById("d" + originalPosition).style.background = "#2b002c";

		holding = false;
		playerMove = false;

		if (!gameOver()) {
			socket.send("board:" + gameID + ":" + playerID + ":" + board);
		}
	}
	else {
		document.getElementById("d"+originalPosition).style.background = "#2b002c";
		notify("Invalid move!", true);
		holding = false;
	}
}

// VALIDITY OF THE MOVE

function validMove(startPos, endPos) { // ADD RECURSIVE CALL FOR EATING or allow user to move his piece again only if he is eating again, implement later w/ networking
	if (board.charAt(startPos) == "1")
		if (endPos - startPos < 10) 
			return validMoveBit(startPos, endPos)
		else 
			return validEatBit(startPos, endPos);
	else if (board.charAt(startPos) == "2")
		if (startPos - endPos < 10) 
			return validMoveUsd(startPos, endPos)
		else 
			return validEatUsd(startPos, endPos);
	else if ([3, 4].includes(board.charAt(startPos))) // QUEEN PROPERTY
		if (Math.abs(endPos - startPos) < 10)
			return validMoveQueen(startPos, endPos);
		else 
			return validEatQueen(startPos, endPos);
}

function validMoveBit(startPos, endPos) { // checks the validity of the bit move
	if (startPos % 8 == 0) { // if piece alongside left border
		return endPos == startPos + 9;
	}
	else if (startPos % 8 == 7) { // if piece alongside right border
		return endPos == startPos + 7;
	}
	else {
		return (endPos == startPos + 9 || endPos == startPos + 7);
	}
}

function validMoveUsd(startPos, endPos) { // checks the validity of the usd move
	if (startPos % 8 == 0) { // if piece alongside left border
		return endPos == startPos - 7;
	}
	else if (startPos % 8 == 7) { // if piece alongside right border
		return endPos == startPos - 9;
	}
	else {
		return (endPos == startPos - 9 || endPos == startPos - 7);
	}
}

function validMoveQueen(startPos, endPos) {
	return validMoveBit(startPos, endPos) || validMoveUsd(startPos, endPos);
}

function validEatBit(startPos, endPos) {
	if (startPos % 8 == 0 && endPos == startPos + 18 && [2, 4].includes(board.charAt(endPos - 9))) {
		board = replaceChar(board, endPos - 9, "0");
		return true;
	}
	else if (startPos % 8 == 7 && endPos == startPos + 14 && [2, 4].includes(board.charAt(endPos - 7))) {
		board = replaceChar(board, endPos - 7, "0");
		return true;
	}
	else if (([2, 4].includes(board.charAt(startPos + 9)) && endPos == startPos + 18) 
		|| ([2, 4].includes(board.charAt(startPos + 7)) && endPos == startPos + 14)) {
		board = replaceChar(board, (startPos + (endPos - startPos)/2), "0");
		return true;
	}
	else return false;
}

function validEatUsd(startPos, endPos) {
	if (startPos % 8 == 0 && endPos == startPos - 14 && board.charAt(startPos - 7) % 2 == 1) {
		board = replaceChar(board, endPos + 7, '0');
		return true;
	}
	else if (startPos % 8 == 7 && endPos == startPos - 18 && board.charAt(startPos - 9) % 2 == 1) {
		board = replaceChar(board, endPos + 9, '0');
		return true;
	}
	else if ((board.charAt(startPos - 9) % 2 == 1 && endPos == startPos - 18) 
		|| (board.charAt(startPos - 7) % 2 == 1 && endPos == startPos - 14)) {
		board = replaceChar(board, startPos + (endPos - startPos)/2, "0");
		return true;
	}
	else return false;
}

function validEatQueen(startPos, endPos) {
	if ((bitPlayer ? [2, 4] : [1, 3]).includes(board.charAt(startPos + (endPos - startPos)/2))) {
		if (startPos % 8 == 0 && [startPos - 14, startPos + 18].includes(endPos)) {
			board = replaceChar(board, startPos + (endPos - startPos)/2, "0");
			return true;
		}
		else if (startPos % 8 == 7 && [startPos + 14, startPos - 18].includes(endPos)) {
			board = replaceChar(board, startPos + (endPos - startPos)/2, "0");
			return true;
		}
		else if ([14, 18].includes(Math.abs(endPos - startPos))) {
			board = replaceChar(board, startPos + (endPos - startPos)/2, "0")
			return true;
		}
	}
	else return false;
}

// TOOLS

function replaceChar(string, index, replace) {
	index = parseInt(index);
	return string.substring(0, index) + replace + string.substring(index + 1, 64);
}

function gameOver() {
	let noBit = true;
	let noUsd = true;

	for (let i = 0; i < board.length; i++) {
		if (board[i] == '1' || board[i] == '3') noBit = false;
		else if (board[i] == '2' || board[i] == '4') noUsd = false;
	}

	if (noBit || noUsd) {
		socket.send("exit:" + gameID + ":" + playerID);
		if ((noBit && bitPlayer) || (noUsd && !bitPlayer)) {
			notify("You lost!", false);
		}
		else {
			notify("You won!", false);
		}
	}
	
	return noBit || noUsd;
}

function notify(msg, timeout) {
	document.getElementById("notification").innerHTML = msg;
	if (timeout)
		setTimeout( function() {
			document.getElementById("notification").innerHTML = "_";
		}, 4000);
}

// WEB SOCKET

socket.onmessage = function(event){
	const input = event.data;
	if (input.startsWith("playerid:")) {
		playerID = input.split(":").pop();
		socket.send("registered: player" + playerID);
		notify("waiting for opponent", false);
	}
	else if (input.startsWith("gameid:")) {
		const array = input.split(":");
		gameID = array[2];
		bitPlayer = (array[1] == "bit");
		playerMove = bitPlayer; // makes bit_player go first
		socket.send("game " + gameID + ": registered player " + playerID);
		setUpBoard();
		notify("You are " + (bitPlayer ? "first, bitcoin!" : "second, dollar!"), true);
	}
	else if (input.startsWith("board:")) {
		board = input.split(":").pop();
		playerMove = true;
		socket.send("game " + gameID + ": board received");
		setUpBoard();
	}
	else if (input.startsWith("exit:")) {
		playerMove = false;
		const exitcode = input.split(":").pop();
		notify("You won!", false);
	}
	else {
		socket.send("Invalid message sent to player " + playerID + " : " + input);
	}
};

socket.onopen = function(){
	socket.send("screen:game");
};