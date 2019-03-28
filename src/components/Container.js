import React from "react"
import { Box } from "ink"

export default ({ children, fullscreen }) => {
	return (
		<Box
			height="100%"
			width="100%"
			minHeight={fullscreen ? process.stdout.rows - 1 : 0}
			minWidth={fullscreen ? process.stdout.columns - 1 : 0}
			flexDirection="column"
		>
			{children}
		</Box>
	)
}
