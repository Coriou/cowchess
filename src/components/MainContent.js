import React from "react"
import { Box } from "ink"

export default ({ children }) => {
	return (
		<Box paddingTop={1} flexDirection="column" flexGrow={1}>
			{children}
		</Box>
	)
}
