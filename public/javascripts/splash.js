const socket = new WebSocket("ws://localhost:3000");

socket.onopen = function(){
	socket.send("screen:splash");
};

socket.onmessage = function(event){
	document.getElementById("ongoing").innerHTML = `${event.data} ongoing games`;
};
