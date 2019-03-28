import React from "react"
import { Box, Color } from "ink"

import { useStore } from "../context"

export default () => {
	const [{ error }] = useStore()

	let formattedError = null

	if (!error || error === null || error === "undefined") formattedError = null
	else if (error instanceof Error) formattedError = error.stack
	else if (typeof error === "string") formattedError = error
	else if (typeof error === "object")
		formattedError = JSON.stringify(error, null, 2)

	if (!formattedError) return null

	return (
		<Box paddingTop={1} flexDirection="column">
			<Color red>{formattedError}</Color>
		</Box>
	)
}
