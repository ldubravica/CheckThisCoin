var holding = false;
var originalPosition = 0;
var socket = new WebSocket("ws://localhost:3000");

var playerid = -1;
var gameid = -1;
var playermove = false;
var bit_player = false;
var board = "1010101001010101101010100000000000000000020202022020202002020202";

function setUpBoard() {
	for (let i = 0; i < 64; i++) {
		if(board.charAt(i) == "0")
			document.getElementById("b" + i).src = "images/none.png";
		else if(board.charAt(i) == "1")
			document.getElementById("b" + i).src = "images/coin_bit.png";
		else if(board.charAt(i) == "2")
			document.getElementById("b" + i).src = "images/coin_usd.png";
	//	queen stuff
		else if(board.charAt(i) == "3")
			document.getElementById("b" + i).src = "images/coin_bit_queen.png";
		else if(board.charAt(i) == "4")
			document.getElementById("b" + i).src = "images/coin_usd_queen.png";
	}
}

function move_piece(clicked_id) {
	var selectedPosition = clicked_id.substring(1,3);
	if (playermove && holding == false && (board.charAt(selectedPosition) == (bit_player ? "1" : "2") || board.charAt(selectedPosition) == (bit_player ? "3" : "4"))) {
		originalPosition = selectedPosition;
		holding = true;
		document.getElementById("d"+originalPosition).style.background = "#006600";
	}
	else if (playermove && holding == true && board.charAt(selectedPosition) == "0" && valid_move(originalPosition, selectedPosition)) {
	// queen stuff
		if(bit_player && selectedPosition > 55)
			board = replaceChar(board, originalPosition, "3");
		else if(!bit_player && selectedPosition < 8)
			board = replaceChar(board, originalPosition, "4");

		board = replaceChar(board, selectedPosition, board[originalPosition]);
		board = replaceChar(board, originalPosition, "0");

		setUpBoard();
		document.getElementById("d"+originalPosition).style.background = "#2b002c";

		holding = false;
		playermove = false;

		if (!gameOver())
		{
			socket.send("board:" + gameid + ":" + playerid + ":" + board);
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
		if(end_pos - start_pos < 10) return valid_move_bit(parseInt(start_pos), parseInt(end_pos))
		else return valid_eat_bit(parseInt(start_pos), parseInt(end_pos));
	else if (board.charAt(start_pos) == "2")
		if(start_pos - end_pos < 10) return valid_move_usd(parseInt(start_pos), parseInt(end_pos))
		else return valid_eat_usd(parseInt(start_pos), parseInt(end_pos));
	else if (board.charAt(start_pos) == "3" || board.charAt(start_pos) == "4") { //	<<------	added queen property
		if(Math.abs(end_pos - start_pos) < 10) return valid_move_bit(parseInt(start_pos), parseInt(end_pos)) || valid_move_usd(parseInt(start_pos), parseInt(end_pos));	// queen move
		else return valid_eat_queen(parseInt(start_pos), parseInt(end_pos));	// queen eat
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
	if((board.charAt(start_pos + (end_pos - start_pos)/2) == (bit_player ? "2" : "1")) || (board.charAt(start_pos + (end_pos - start_pos)/2) == (bit_player ? "4" : "3")))
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
	var noBit = true;
	var noUsd = true;
	for (let i = 0; i < board.length; i++) {
		if (board[i] == '1' || board[i] == '3') noBit = false;
		else if (board[i] == '2' || board[i] == '4') noUsd = false;
	}
	/*
	if (noBit) socket.send("exit:" + gameid + ":" + playerid);
	else if (noUsd) socket.send("exit:" + gameid + ":" + playerid);
	*/
	if (noBit || noUsd) {
		socket.send("exit:" + gameid + ":" + playerid);
		if ((noBit && bit_player) || (noUsd && !bit_player)) {
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
	var input = event.data;
	if (input.startsWith("playerid:")) {
		playerid = input.split(":").pop();
		socket.send("registered: player" + playerid);
		notify("waiting for opponent", false);
	}
	else if (input.startsWith("gameid:")) {
		var array = input.split(":");
		gameid = array[2];
		bit_player = (array[1] == "bit");
		playermove = bit_player; // makes bit_player go first
		socket.send("player " + playerid + " registered to game " + gameid);
		setUpBoard();
		notify("You are " + (bit_player ? "first, bitcoin!" : "second, dollar!"), true);
	}
	else if (input.startsWith("board:")) {
		board = input.split(":").pop();
		playermove = true;
		socket.send("board for game " + gameid + " received");
		setUpBoard();
	}
	else if (input.startsWith("exit:")) {
		playermove = false;
		var exitcode = input.split(":").pop();
		notify("You lost!", false);
	}
	else {
		socket.send("Invalid message sent to player " + playerid + " : " + input);
	}
};

socket.onopen = function(){
	socket.send("client ready");
};