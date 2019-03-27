import os from "os"
import { Engine } from "node-uci"
import axios from "axios"
import React, { useState, useEffect } from "react"
import { render, Box, Color, Text } from "ink"
import Spinner from "ink-spinner"
import Link from "ink-link"
import convertHR from "convert-hrtime"
import { getProcessUsage } from "./utils"
import figlet from "figlet"

import Stats from "./components/Stats"

let gamesMemory = []
let engines = []

const getGames = ({ username }) => {
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

const findBestMove = async (game, { enginePath, isDebug }) => {
	if (!enginePath) enginePath = "./stockfish/stockfish-10-64"
	if (isDebug !== false && !isDebug) isDebug = false

	// Add the game to the memory if we haven't yet
	let inMemory = gamesMemory.find(gm => gm.id === game.id)
	if (!inMemory) {
		gamesMemory.push(game)
		inMemory = game
	}

	// It's our turn to play, let's see if we need to compute the best move
	if (game.turn === game.myColor) {
		if (!inMemory.bestMove || inMemory.fen !== game.fen) {
			let existingEngine = engines.find(e => e.id === game.id)
			if (!existingEngine) {
				existingEngine = {
					id: game.id,
					engine: new Engine(enginePath)
						.chain()
						.init()
						.setoption("MultiPV", isDebug ? 1 : 5)
						.setoption("Threads", os.cpus().length)
				}

				engines.push(existingEngine)
			}

			const engine = existingEngine.engine

			const computed = await engine
				.position(game.fen)
				.go({ depth: isDebug ? 1 : 20 })
				.then(r => r)

			// Set best move
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

			// Update memory
			gamesMemory.forEach((gm, i) => {
				if (gm.id === game.id) gamesMemory[i] = game
			})
		}
	} else {
		// Reset if need be
		gamesMemory.forEach((gm, i) => {
			if (gm.id === game.id && gm.bestMove) {
				gamesMemory[i].bestMove = false
				gamesMemory[i].score = false
				gamesMemory[i].execTime = false
			}
		})
	}

	return gamesMemory.find(gm => gm.id === game.id)
}

const View = () => {
	useEffect(() => {
		run()
		checkStats()

		figlet("CowChess", function(err, data) {
			if (err) setTitle(err.message)

			setTitle(data)
		})
	}, [])

	const [lastCheck, setLastCheck] = useState(false)
	const [games, setGames] = useState([])
	const [isRunning, setIsRunning] = useState(false)
	const [hasError, setHasError] = useState(false)
	const [progress, setProgress] = useState([])
	const [nodeRam, setNodeRAM] = useState(0)
	const [stockfishRam, setStockfishRAM] = useState(0)
	const [stockfishCPU, setStockfishCPU] = useState(0)
	const [title, setTitle] = useState(false)

	const run = () => {
		setIsRunning(true)

		getGames({ username: "cowriou" })
			.then(games => {
				// Delete unused engines
				const gamesIDS = games.map(g => g.id)
				engines.forEach((e, i) => {
					if (!gamesIDS.includes(e.id)) {
						engines[i].engine
							.quit()
							.then(() => {
								engines.splice(i, 1)
								setHasError(
									`Deleted engine for game ${engines[i].id}`
								)
							})
							.catch(() => {
								setHasError(
									`Could not delete engine for game ${
										engines[i].id
									}`
								)
							})
					}
				})

				// Mesure exec time
				const hrstart = process.hrtime()

				// Load all the jobs in a local progress array
				let tempProgress = games.map(g => {
					return { id: g.id, opponent: g.opponent }
				})

				// Wait a bit before we push it to the state
				setTimeout(() => setProgress(tempProgress), 250)

				const jobs = games.map(g => {
					return findBestMove(g, { isDebug: false })
						.then(computedGame => {
							if (!computedGame.execTime) {
								const hrend = process.hrtime(hrstart)
								const execTime = convertHR(hrend)
								computedGame.execTime = execTime.seconds
							}

							return computedGame
						})
						.catch(err => setHasError(err.stack))
						.finally(() => {
							// Let's see if we need to remove this job from the progress array
							const progressToDelete = tempProgress.findIndex(
								p => parseInt(p.id) === parseInt(g.id)
							)

							if (progressToDelete > -1) {
								tempProgress.splice(progressToDelete, 1)
								setTimeout(() => setProgress(tempProgress), 250)
							}
						})
				})

				Promise.all(jobs)
					.then(computedGames => {
						// Reduce results
						computedGames = computedGames.filter(g => g.bestMove)

						setGames(computedGames)
						setLastCheck(new Date())
					})
					.catch(err => setHasError(err.stack))
					.finally(() => {
						setIsRunning(false)
						setProgress([])
						setTimeout(() => {
							run()
						}, 10e3)
					})
			})
			.catch(err => setHasError(err.stack))
			.finally(() => setProgress([]))
	}

	const checkStats = () => {
		Promise.all([
			getProcessUsage(process.pid, true)
				.then(data => {
					return { currentProcess: data }
				})
				.catch(() => []),
			getProcessUsage("stockfish")
				.then(data => {
					return { stockfish: data }
				})
				.catch(() => [])
		])
			.then(data => {
				try {
					// Flatten results
					data = [].concat
						.apply([], data)
						.reduce((a, b) => Object.assign(a, b))

					if (data.currentProcess)
						if (data.currentProcess.ram)
							setNodeRAM(data.currentProcess.ram)

					if (data.stockfish) {
						if (data.stockfish.ram)
							setStockfishRAM(data.stockfish.ram)

						if (typeof data.stockfish.cpu !== undefined)
							if (
								data.currentProcess &&
								typeof data.currentProcess.cpu !== undefined
							)
								setStockfishCPU(
									parseFloat(data.stockfish.cpu) +
										parseFloat(data.currentProcess.cpu)
								)
							else setStockfishCPU(parseFloat(data.stockfish.cpu))
					}
				} catch (err) {}
			})
			.finally(() => {
				setTimeout(checkStats, 1500)
			})
	}

	const formatLastChecked = () =>
		lastCheck
			? `${lastCheck
					.getHours()
					.toString()
					.padStart(2, "0")}:${lastCheck
					.getMinutes()
					.toString()
					.padStart(2, "0")}:${lastCheck
					.getSeconds()
					.toString()
					.padStart(2, "0")}`
			: "..."

	const formatGames = games => (
		<Box flexDirection="column" flexGrow={1}>
			{games.map(g => (
				<Box key={g.id} flexDirection="column" paddingTop={1}>
					<Text>
						Opponent: <Color cyan>{g.opponent}</Color> ({g.id})
					</Text>

					<Text>
						Best move: <Color green>{g.bestMove || ""}</Color>
					</Text>

					{g.score && games.length <= 5 ? (
						<Text>
							Score:{" "}
							<Color
								red={parseInt(g.score) <= 0}
								yellow={parseInt(g.score) > 0}
								green={g.score.toString().match(/mate/i)}
							>
								{g.score}
							</Color>
						</Text>
					) : null}

					{g.execTime && games.length <= 5 ? (
						<Text>
							Computing time:{" "}
							<Color magenta>{g.execTime} seconds</Color>
						</Text>
					) : null}

					{games.length <= 5 ? (
						<Text>
							NCM:{" "}
							<Link url={g.ncm}>
								<Color white>See board</Color>
							</Link>
						</Text>
					) : null}
				</Box>
			))}
		</Box>
	)

	// We DO NOT render the app without a title !
	if (!title) return null

	return (
		<Box
			flexDirection="column"
			flexGrow={1}
			minHeight={process.stdout.rows - 1}
			minWidth={process.stdout.columns - 1}
			height="100%"
			width="100%"
		>
			<Box>
				<Color blue={progress.length} green={!progress.length}>
					{title}
				</Color>
			</Box>
			<Box flexDirection="column">
				<Box>
					Last Check:{" "}
					<Color bgWhite black>
						{formatLastChecked()}
					</Color>
				</Box>

				<Box>
					<Color gray>Engines running: {engines.length}</Color>
				</Box>

				<Box>
					<Color gray>
						RAM: {parseInt(nodeRam) + parseInt(stockfishRam)} Mb
						(Node: {parseInt(nodeRam)} Mb / Stockfish:{" "}
						{parseInt(stockfishRam)} Mb)
					</Color>
				</Box>

				<Text>
					<Color gray>CPU: {stockfishCPU} %</Color>
				</Text>

				<Text>
					<Color gray>PID: {process.pid}</Color>
				</Text>

				<Text>
					<Color bold blue>
						{isRunning ? (
							progress.length ? (
								<>
									<Spinner type="dots" />{" "}
									<Text>
										Computing {progress.length}{" "}
										{progress.length > 1 ? "games" : "game"}{" "}
										[
										{progress
											.map(p => p.opponent)
											.join(",")}
										]
									</Text>
								</>
							) : (
								"Checking chess.com"
							)
						) : (
							"Idling"
						)}
					</Color>
				</Text>
			</Box>

			{games.length ? (
				formatGames(games)
			) : (
				<Box paddingTop={1} flexDirection="column" flexGrow={1}>
					<Color bold green={lastCheck} red={!lastCheck}>
						{lastCheck
							? "No games to play"
							: "Looking games up, please wait a sec..."}
					</Color>
				</Box>
			)}

			{hasError ? (
				<Box flexDirection="column" paddingTop={2}>
					<Text>
						<Color red bold>
							{hasError}
						</Color>
					</Text>
				</Box>
			) : null}
		</Box>
	)
}

render(<View />)

// const engine = new Engine("./stockfish/stockfish-10-64")
// engine
// 	.chain()
// 	.init()
// 	.setoption("MultiPV", 5)
// 	.setoption("Threads", os.cpus().length)
// 	.position(
// 		"r1bqkb1r/ppp1nppp/2n5/4p3/N3P1P1/3p1B2/PPPP1P1P/R1BQK1NR w KQkq - 0 7"
// 	)
// 	.go({ depth: 5 })
// 	.then(r => {
// 		// let scores = r.info.filter(i => i.score && i.score.unit && i.score.unit !== "cp")
// 		console.log(r.bestmove)

// 		engine.quit()
// 		.then(console.log)
// 		.catch(console.error)
// 	})

// 3k4/p2b4/1p1P1p1p/PP4p1/3n3P/5Pb1/1r4P1/7K b - - 0 1
