import os from "os"
import { exec } from "child_process"
import { Engine } from "node-uci"
import axios from "axios"

const execute = (command, callback) => {
	exec(command, function(error, stdout, stderr) {
		callback(stderr || error, stdout)
	})
}

export const getProcessUsage = (search, usePID = false) => {
	return new Promise((resolve, reject) => {
		try {
			const cmd = usePID
				? `ps -axm -o rss,pcpu,comm,pid | grep ${search} || true`
				: `ps -axm -o rss,pcpu,comm | grep ${search} || true`

			execute(cmd, (error, output) => {
				if (error) return reject(error)

				try {
					const lines = output
						.split("\n")
						.map(l => l.trim().replace(/\s+/, " "))
						.filter(l => l)

					// This is when we have no output from ps
					if (!lines.length) return resolve(false)

					const memory = Math.round(
						lines
							.map(l => l.split(" ")[0])
							.reduce((a, b) => parseInt(a) + parseInt(b)) / 1024
					)

					const cpu =
						parseFloat(
							lines
								.map(l => l.split(" ")[1])
								.reduce((a, b) => parseFloat(a) + parseFloat(b))
						) / os.cpus().length

					return resolve({
						ram: memory,
						cpu: cpu,
						processes: lines.length
					})
				} catch (err) {
					return reject(err)
				}
			})
		} catch (err) {
			return reject(err)
		}
	})
}

export const formatDate = date =>
	date && date instanceof Date
		? `${date
				.getHours()
				.toString()
				.padStart(2, "0")}:${date
				.getMinutes()
				.toString()
				.padStart(2, "0")}:${date
				.getSeconds()
				.toString()
				.padStart(2, "0")}`
		: "..."

export const getGames = ({ username }) => {
	return new Promise((resolve, reject) => {
		axios
			.get(`https://api.chess.com/pub/player/${username}/games`)
			.then(response => {
				const games = response.data.games.map(g => {
					const id = parseInt(
						g.url.match(
							/https:\/\/www\.chess\.com\/daily\/game\/(\d+)/i
						)[1]
					)

					const myColor = g.white.match(
						new RegExp(`player\/${username}$`, "i")
					)
						? "white"
						: "black"

					const opponent =
						myColor === "white"
							? g.black.match(/player\/(.*)$/i)[1]
							: g.white.match(/player\/(.*)$/i)[1]

					return {
						id: id,
						myColor: myColor,
						opponent: opponent,
						fen: g.fen,
						turn: g.turn,
						ncm: `https://nextchessmove.com/?fen=${encodeURIComponent(
							g.fen
						)}&flipped=${myColor === "white" ? "false" : "true"}`
					}
				})

				return resolve(games)
			})
			.catch(reject)
	})
}

export const findBestMove = (game, engine, options = {}) => {
	return new Promise(async (resolve, reject) => {
		const { isDebug = false, depth = 20 } = options

		try {
			// Compute the current game
			const computed = await engine
				.position(game.fen)
				.go({ depth: isDebug ? 1 : depth })
				.then(r => r)

			// Add the best move to the game object
			game.bestMove = computed.bestmove

			// Set score
			const score = computed.info.find(i => i.pv === computed.bestmove)
			if (
				score &&
				typeof score.score === "object" &&
				score.score.unit &&
				score.score.value
			) {
				const { unit, value } = score.score

				if (unit === "cp") game.score = parseInt(value)
				else game.score = `${unit} ${value}`
			}

			// Return the enriched game object
			return resolve(game)
		} catch (err) {
			return reject(err)
		}
	})
}

export const createEngine = (options = {}) => {
	const {
		enginePath = "./stockfish/stockfish-10-64",
		multiPV = 5,
		isDebug = false
	} = options

	return new Engine(enginePath)
		.chain()
		.init()
		.setoption("MultiPV", isDebug ? 1 : multiPV)
		.setoption("Threads", os.cpus().length)
}
