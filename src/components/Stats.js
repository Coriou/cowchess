import React, { useEffect, useContext } from "react"
import { Box, Color, Text } from "ink"
import { getProcessUsage } from "../utils"
import { Context, Consumer } from "../store"

export default props => {
	const store = useContext(Context)

	useEffect(() => {
		checkStats()

		store.lastCheck = "Oh yeah"
	}, [])

	// let {
	// 	lastCheck,
	// 	engines,
	// 	nodeRam,
	// 	stockfishRam,
	// 	stockfishCPU,
	// 	isRunning
	// } = store

	const formatLastChecked = () =>
		store.lastCheck
			? `${lastCheck
					.getHours()
					.toString()
					.padStart(2, "0")}:${store.lastCheck
					.getMinutes()
					.toString()
					.padStart(2, "0")}:${store.lastCheck
					.getSeconds()
					.toString()
					.padStart(2, "0")}`
			: "..."

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
							store.nodeRam = data.currentProcess.ram
					// store.setState({ nodeRam: data.currentProcess.ram })

					if (data.stockfish) {
						if (data.stockfish.ram)
							// store.setState({ stockfishRam: data.stockfish.ram })
							store.stockfishRam = data.stockfish.ram

						if (typeof data.stockfish.cpu !== undefined)
							if (
								data.currentProcess &&
								typeof data.currentProcess.cpu !== undefined
							)
								store.stockfishCPU =
									parseFloat(data.stockfish.cpu) +
									parseFloat(data.currentProcess.cpu)
							else
								store.stockfishCPU = parseFloat(
									data.stockfish.cpu
								)
					}
				} catch (err) {}
			})
			.finally(() => {
				setTimeout(checkStats, 1500)
			})
	}

	return (
		<Consumer>
			{({ store, update }) => {
				// update({ lastCheck: "OH YEAH" })
				return (
					<Box flexDirection="column">
						<Box>
							Last Check:{" "}
							<Color bgWhite black>
								{/* {formatLastChecked()} */}
								{store.lastCheck.toString()}
							</Color>
						</Box>

						<Box>
							<Color gray>
								Engines running: {store.engines.length}
							</Color>
						</Box>

						<Box>
							<Color gray>
								RAM:{" "}
								{parseInt(store.nodeRam) +
									parseInt(store.stockfishRam)}{" "}
								Mb (Node: {parseInt(store.nodeRam)} Mb /
								Stockfish: {parseInt(store.stockfishRam)} Mb)
							</Color>
						</Box>

						<Box>
							<Color gray>CPU: {store.stockfishCPU} %</Color>
						</Box>

						<Box>
							<Color gray>PID: {process.pid}</Color>
						</Box>

						<Box>
							<Color bold blue>
								{store.isRunning ? (
									store.progress.length ? (
										<>
											<Spinner type="dots" />{" "}
											<Text>
												Computing{" "}
												{store.progress.length}{" "}
												{store.progress.length > 1
													? "games"
													: "game"}{" "}
												[
												{store.progress
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
						</Box>
					</Box>
				)
			}}
		</Consumer>
	)
}
