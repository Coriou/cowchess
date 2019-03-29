import os from "os"
import { exec } from "child_process"
import { Engine } from "node-uci"
import axios from "axios"
import convertHR from "convert-hrtime"

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
			// Mesure exec time
			const hrstart = process.hrtime()

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

			if (!game.execTime) {
				const hrend = process.hrtime(hrstart)
				const execTime = convertHR(hrend)
				game.execTime = execTime.seconds.toFixed(2)
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

// The main logic
export const updateGames = (dispatch, state) => {
	let localState = {}
	state.subscribe(s => (localState = s))

	dispatch({ isCheckingGames: true })

	getGames({ username: "cowriou" })
		.then(apiGames => {
			// Could be our first run, let the app know we good
			if (!localState.hasInit) {
				dispatch({
					hasInit: true,
					games: apiGames
				})
			}

			// Update games list for games we don't need to play
			dispatch({
				type: "updateGames",
				value: apiGames.filter(g => g.myColor !== g.turn)
			})

			// Check if it's our turn to play any of those games
			const gamesToPlay = apiGames.filter(g => {
				// return g.myColor === g.turn
				// It's our turn to play
				if (g.myColor === g.turn) {
					// Check if we already have computed this game
					const match = localState.games.find(gm => {
						// We don't have this game in memory
						if (gm.id !== g.id) return false

						// We don't have a best move already computed or board has changed
						if (!gm.bestMove || gm.fen !== g.fen) return true

						// Otherwise juste ignore
						return false
					})

					if (!match) return false
					else return true
				}

				return false
			})

			// dispatch({ error: localState.hasInit.toString() })

			// Handle games to play
			let jobs = []
			if (gamesToPlay.length) {
				// Create an array of jobs (games to solve)
				jobs = gamesToPlay.map(g => {
					// Check if we have a running engine for this game already
					let engine = localState.engines.find(e => e.id === g.id)

					// Let's create a new engine
					if (!engine || !engine.engine) {
						engine = { id: g.id, engine: createEngine() }
						dispatch({
							type: "addEngine",
							value: engine
						})
					}

					// Tell the app we're working on this game
					dispatch({ type: "addComputingGame", value: g })

					// Return the actual job
					return findBestMove(g, engine.engine, {
						isDebug: false
					})
						.then(computed => {
							// On completion, update the game with the added computed results
							dispatch({
								type: "updateGames",
								value: [computed]
							})

							return computed
						})
						.catch(err => dispatch({ error: err }))
						.finally(() => {
							// Remove the game from the computing games array
							dispatch({
								type: "removeComputingGame",
								value: g
							})
						})
				})
			}

			// Run the jobs
			Promise.all(jobs)
				.then(() => {})
				.catch(err => dispatch(err))
				.finally(() => {
					// This dispatch is more to trigger a re-render than anything else
					dispatch({ isComputing: false })
					setTimeout(() => updateGames(dispatch, state), 15e3)
				})
		})
		.catch(err => {
			dispatch({ error: err })
			setTimeout(() => updateGames(dispatch, state), 15e3)
		})
		.finally(() => {
			dispatch({ lastCheck: new Date(), isCheckingGames: false })
		})
}
