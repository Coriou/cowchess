import React, { useEffect } from "react"
import { Box, Color } from "ink"
import { getGames, createEngine, findBestMove } from "../utils"

import { useStore, globalState as state } from "../context"

// The main logic
const updateGames = dispatch => {
	dispatch({ isCheckingGames: true })

	getGames({ username: "cowriou" })
		.then(apiGames => {
			// Could be our first run, let the app know we good
			if (!state.hasInit) {
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
					const match = state.games.find(gm => {
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

			// dispatch({ error: state.games.map(t => t.bestMove) })
			// dispatch({error: state.computingGames.length.toString()})
			// dispatch({ error: state.hasInit.toString() })

			// Handle games to play
			let jobs = []
			if (gamesToPlay.length) {
				// Create an array of jobs (games to solve)
				jobs = gamesToPlay.map(g => {
					// Check if we have a running engine for this game already
					let engine = state.engines.find(e => e.id === g.id)

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
					setTimeout(() => updateGames(dispatch), 5e3)
				})
		})
		.catch(err => {
			dispatch({ error: err })
			setTimeout(() => updateGames(dispatch), 5e3)
		})
		.finally(() => {
			dispatch({ lastCheck: new Date(), isCheckingGames: false })
		})
}

// Status component
const GamesStatus = ({ games }) => {
	const [{ hasInit }] = useStore()

	if (!hasInit) return <Color yellow>Looking for games...</Color>

	if (!games) return <Color red>Something might be wrong...</Color>
	else if (!games.length)
		return <Color yellow>You're not playing any games currently</Color>
	else if (games.length === 1)
		return <Color green>You're playing only 1 game right now</Color>
	else
		return (
			<Color green>You're playing {games.length} games right now</Color>
		)
}

// Turn component
const Turn = ({ games }) => {
	if (!games || !games.length) return null

	const myTurn = games.filter(g => g.myColor === g.turn)

	return (
		<Color yellow={!myTurn.length}>
			{myTurn.length === 0 ? "Waiting on opponents" : null}
			{myTurn.length === 1 ? "You've got 1 move to make" : null}
			{myTurn.length > 1
				? `You've got ${myTurn.length} moves to make`
				: null}
		</Color>
	)
}

// Moves component
const Moves = () => {
	const [{ games }] = useStore()
	// const gamesToPlay =

	return (
		<Box flexDirection="column" paddingTop={1}>
			{games
				.filter(g => g.bestMove)
				.map(g => (
					<Move game={g} />
				))}
		</Box>
	)
}

// Move component
const Move = ({ game }) => {
	return (
		<Box flexDirection="column" key={game.id} marginTop={1}>
			<Box>Opponent: {game.opponent}</Box>
			<Box>Best move: {game.bestMove}</Box>
		</Box>
	)
}

export default props => {
	const [{ games }, dispatch] = useStore()

	useEffect(() => {
		updateGames(dispatch)
	}, [])

	return (
		<Box flexDirection="column">
			<GamesStatus games={games} />

			<Turn games={games} />

			<Moves games={games} />
		</Box>
	)
}
