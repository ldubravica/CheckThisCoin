var socket = new WebSocket("ws://localhost:3000");

socket.onopen = function(){
	socket.send("splash:info");
};

socket.onmessage = function(event){
	document.getElementById("ongoing").innerHTML = event.data + " ongoing games";
};

