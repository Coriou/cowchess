import React from "react"
import { Box, Color } from "ink"
import Spinner from "ink-spinner"

import { useStore } from "../context"

export default () => {
	const [{ isComputing, isCheckingGames, computingGames }] = useStore()

	const ComputingStatus = ({ computingGames }) => (
		<>
			<Spinner type="monkey" />{" "}
			{`Working on ${computingGames.length} game(s) [${computingGames
				.map(g => g.opponent)
				.join(",")}]`}
		</>
	)

	return (
		<Box textWrap="truncate-end">
			<Color bold={isComputing || isCheckingGames} blue>
				{isCheckingGames ? "Checking chess.com" : null}
				{isComputing && !computingGames.length ? "Working..." : null}
				{isComputing && computingGames.length ? (
					<ComputingStatus computingGames={computingGames} />
				) : null}
				{!isCheckingGames && !isComputing ? "Waiting..." : null}
			</Color>
		</Box>
	)
}
