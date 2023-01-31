import { Router } from "express";
const router = Router();

/* GET home page */
router.get("/", function (req, res) {
	res.sendFile("/splash.html", {root: "./public"});
});

/* Pressing the 'PLAY' button, returns game page */
router.get("/play", function(req, res) {
	res.sendFile("/game.html", {root: "./public"});
});

export default router;
