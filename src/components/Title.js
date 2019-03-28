import React, { useState, useEffect } from "react"
import { Box, Color, Text } from "ink"
import figlet from "figlet"

import { useStore } from "../context"

export default ({ text }) => {
	const [{ isComputing }] = useStore()
	const [title, setTitle] = useState("CowChess")

	useEffect(() => {
		figlet(text, function(err, data) {
			if (!err) setTitle(data)
		})
	}, [text])

	return (
		<Box>
			<Text>
				<Color blue={isComputing} green={!isComputing}>
					{title}
				</Color>
			</Text>
		</Box>
	)
}
