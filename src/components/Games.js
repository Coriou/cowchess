import React, { useEffect } from "react"
import { Box, Color } from "ink"
import { updateGames } from "../utils"

import { useStore, state } from "../context"

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
const Moves = ({ games }) => {
	return (
		<Box flexDirection="column" paddingTop={1}>
			{games
				.filter(g => g.bestMove)
				.map((g, i) => (
					<Move key={i} game={g} />
				))}
		</Box>
	)
}

// Move component
const Move = ({ game }) => {
	return (
		<Box flexDirection="column" key={game.id} marginTop={1}>
			<Box>
				Opponent:{" "}
				<Color bold cyan>
					{game.opponent}
				</Color>
			</Box>
			<Box>
				Best move:{" "}
				<Color bold green>
					{game.bestMove}
					{typeof game.score === "string" &&
					game.score.match(/mate/) ? (
						<Color grey> ({game.score})</Color>
					) : null}
				</Color>
			</Box>
			<Box>
				<Color gray>in {game.execTime} seconds</Color>
			</Box>
		</Box>
	)
}

export default props => {
	const [{ games }, dispatch] = useStore()

	useEffect(() => {
		updateGames(dispatch, state)
	}, [])

	return (
		<Box flexDirection="column">
			<GamesStatus games={games} />

			<Turn games={games} />

			<Moves games={games} />
		</Box>
	)
}
