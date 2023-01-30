let holding = false;
let originalPosition = 0;
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
	//	queen stuff
		else if (board.charAt(i) == "3")
			document.getElementById("b" + i).src = "images/coin_bit_queen.png";
		else if (board.charAt(i) == "4")
			document.getElementById("b" + i).src = "images/coin_usd_queen.png";
	}
}

function movePiece(clickedID) {
	console.log("ClickedXXX");
	const selectedPosition = clickedID.substring(1,3);
	if (playerMove && holding == false && (board.charAt(selectedPosition) == (bitPlayer ? "1" : "2") || board.charAt(selectedPosition) == (bitPlayer ? "3" : "4"))) {
		originalPosition = selectedPosition;
		holding = true;
		document.getElementById("d"+originalPosition).style.background = "#006600";
	}
	else if (playerMove && holding == true && board.charAt(selectedPosition) == "0" && valid_move(originalPosition, selectedPosition)) {
	// queen stuff
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

function valid_move(start_pos, end_pos) { // ADD RECURSIVE CALL FOR EATING or allow user to move his piece again only if he is eating again, implement later w/ networking
	if (board.charAt(start_pos) == "1")
		if (end_pos - start_pos < 10) 
			return valid_move_bit(parseInt(start_pos), parseInt(end_pos))
		else 
			return valid_eat_bit(parseInt(start_pos), parseInt(end_pos));
	else if (board.charAt(start_pos) == "2")
		if (start_pos - end_pos < 10) 
			return valid_move_usd(parseInt(start_pos), parseInt(end_pos))
		else 
			return valid_eat_usd(parseInt(start_pos), parseInt(end_pos));
	else if (board.charAt(start_pos) == "3" || board.charAt(start_pos) == "4") { //	<<------	added queen property
		if (Math.abs(end_pos - start_pos) < 10) 
			return valid_move_bit(parseInt(start_pos), parseInt(end_pos)) || valid_move_usd(parseInt(start_pos), parseInt(end_pos));	// queen move
		else 
			return valid_eat_queen(parseInt(start_pos), parseInt(end_pos));	// queen eat
	}
}

function valid_move_bit(start_pos, end_pos) { // checks the validity of the bit move
	if (start_pos % 8 == 0) {
		return end_pos == start_pos + 9;
	}
	else if (start_pos % 8 == 7) {
		return end_pos == start_pos + 7;
	}
	else {
		return (end_pos == start_pos + 9 || end_pos == start_pos + 7);
	}
}

function valid_move_usd(start_pos, end_pos) { // checks the validity of the usd move
	if (start_pos % 8 == 0) {
		return end_pos == start_pos - 7;
	}
	else if (start_pos % 8 == 7) {
		return end_pos == start_pos - 9;
	}
	else {
		return (end_pos == start_pos - 9 || end_pos == start_pos - 7);
	}
}

function valid_eat_bit(start_pos, end_pos) {
	if (start_pos % 8 == 0 && end_pos == start_pos + 18 && (board.charAt(end_pos - 9) == "2" || board.charAt(end_pos - 9) == "4")) {
		board = replaceChar(board, end_pos - 9, "0");
		return true;
	}
	else if (start_pos % 8 == 7 && end_pos == start_pos + 14 && (board.charAt(end_pos - 7) == "2" || board.charAt(end_pos - 7) == "4")) {
		board = replaceChar(board, end_pos - 7, "0");
		return true;
	}
	else if (((board.charAt(start_pos + 9) == "2" || board.charAt(start_pos + 9) == "4") && end_pos == start_pos + 18) || 
	((board.charAt(start_pos + 7) == "2" || board.charAt(start_pos + 7) == "4") && end_pos == start_pos + 14)) {
		board = replaceChar(board, (start_pos + (end_pos - start_pos)/2), "0");
		return true;
	}
	else return false;
}

function valid_eat_usd(start_pos, end_pos) {
	if (start_pos % 8 == 0 && end_pos == start_pos - 14 && board.charAt(start_pos - 7) % 2 == 1) {
		board = replaceChar(board, end_pos + 7, '0');
		return true;
	}
	else if (start_pos % 8 == 7 && end_pos == start_pos - 18 && board.charAt(start_pos - 9) % 2 == 1) {
		board = replaceChar(board, end_pos + 9, '0');
		return true;
	}
	else if ((board.charAt(start_pos - 9) % 2 == 1 && end_pos == start_pos - 18) || (board.charAt(start_pos - 7) % 2 == 1 && end_pos == start_pos - 14)) {
		board = replaceChar(board, start_pos + (end_pos - start_pos)/2, "0");
		return true;
	}
	else return false;
}

function valid_eat_queen(start_pos, end_pos) {
	if((board.charAt(start_pos + (end_pos - start_pos)/2) == (bitPlayer ? "2" : "1")) || (board.charAt(start_pos + (end_pos - start_pos)/2) == (bitPlayer ? "4" : "3")))
	{
		if(start_pos % 8 == 0 && (end_pos == start_pos - 14 || end_pos == start_pos + 18))
		{
			board = replaceChar(board, start_pos + (end_pos - start_pos)/2, "0");
			return true;
		}
		else if(start_pos % 8 == 7 && (end_pos == start_pos + 14 || end_pos == start_pos - 18))
		{
			board = replaceChar(board, start_pos + (end_pos - start_pos)/2, "0");
			return true;
		}
		else if(Math.abs(end_pos - start_pos) == 14 || Math.abs(end_pos - start_pos) == 18)
		{
			board = replaceChar(board, start_pos + (end_pos - start_pos)/2, "0")
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
	/*
	if (noBit) socket.send("exit:" + gameid + ":" + playerid);
	else if (noUsd) socket.send("exit:" + gameid + ":" + playerid);
	*/
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
		socket.send("player " + playerID + " registered to game " + gameID);
		setUpBoard();
		notify("You are " + (bitPlayer ? "first, bitcoin!" : "second, dollar!"), true);
	}
	else if (input.startsWith("board:")) {
		board = input.split(":").pop();
		playerMove = true;
		socket.send("board for game " + gameID + " received");
		setUpBoard();
	}
	else if (input.startsWith("exit:")) {
		playerMove = false;
		const exitcode = input.split(":").pop();
		notify("You lost!", false);
	}
	else {
		socket.send("Invalid message sent to player " + playerID + " : " + input);
	}
};

socket.onopen = function(){
	socket.send("screen:game");
};