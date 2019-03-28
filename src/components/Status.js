import React from "react"
import { Box, Color } from "ink"

import { useStore } from "../context"

export default () => {
	const [{ isComputing, isCheckingGames, computingGames }] = useStore()

	return (
		<Box>
			<Color bold={isComputing || isCheckingGames} blue>
				{isCheckingGames ? "Checking chess.com" : null}
				{isComputing && !computingGames.length ? "Working..." : null}
				{isComputing && computingGames.length
					? `Working on ${
							computingGames.length
					  } game(s) [${computingGames
							.map(g => g.opponent)
							.join(",")}]`
					: null}
				{!isCheckingGames && !isComputing ? "Waiting..." : null}
			</Color>
		</Box>
	)
}
