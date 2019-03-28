import React, { useEffect, useState } from "react"
import { Box, Color } from "ink"

import { getProcessUsage, formatDate } from "../utils"
import { useStore } from "../context"

import Title from "./Title"
import Status from "./Status"

// CPU Component
const CPU = ({ process, stockfish }) => {
	const hasProcess = process && typeof process.cpu !== "undefined"
	const hasStockfish = stockfish && typeof stockfish.cpu !== "undefined"

	let value = 0,
		legend = null

	if (hasProcess && hasStockfish) {
		value = process.cpu + stockfish.cpu
		legend = `(Node: ${process.cpu} % / Stockfish: ${stockfish.cpu} %)`
	} else if (hasProcess) value = process.cpu
	else if (hasStockfish) value = stockfish.cpu

	return (
		<Box>
			CPU:{" "}
			<Color red={value > 70} yellow={value > 50}>
				{value.toFixed(2)} %
			</Color>{" "}
			{legend}
		</Box>
	)
}

// RAM Component
const RAM = ({ process, stockfish }) => {
	const hasProcess = process && typeof process.ram !== undefined
	const hasStockfish = stockfish && typeof stockfish.ram !== undefined

	let value = 0,
		legend = null

	if (hasProcess && hasStockfish) {
		value = process.ram + stockfish.ram
		legend = `(Node: ${process.ram} Mb / Stockfish: ${stockfish.ram} Mb)`
	} else if (hasProcess) value = process.ram
	else if (hasStockfish) value = stockfish.ram

	return (
		<Box>
			RAM:{" "}
			<Color red={value > 400} yellow={value > 300}>
				{value} Mb
			</Color>{" "}
			{legend}
		</Box>
	)
}

export default props => {
	const [{ lastCheck, engines }, dispatch] = useStore()
	const [processUsage, setProcessUsage] = useState(0)
	const [stockfishUsage, setStockfishUsage] = useState(0)

	const getStats = () => {
		Promise.all([
			getProcessUsage(process.pid, true)
				.then(data => {
					setProcessUsage(data)
				})
				.catch(error => {
					dispatch({ error: error })
				}),
			getProcessUsage("stockfish")
				.then(data => {
					setStockfishUsage(data)
				})
				.catch(error => {
					dispatch({ error: error })
				})
		]).finally(() => setTimeout(getStats, 1.5e3))
	}

	useEffect(() => {
		getStats()
	}, [])

	return (
		<Color gray>
			<Box flexDirection="column">
				<Title text="CowChess" />

				<Box>
					<Color white>Last check: {formatDate(lastCheck)}</Color>
				</Box>

				<CPU process={processUsage} stockfish={stockfishUsage} />
				<RAM process={processUsage} stockfish={stockfishUsage} />

				<Box>Engines running: {engines.length}</Box>
				<Status />
			</Box>
		</Color>
	)
}
