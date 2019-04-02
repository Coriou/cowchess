import React from "react"

import Container from "./components/Container"
import Header from "./components/Header"
import MainContent from "./components/MainContent"
import Games from "./components/Games"
import ErrorContainer from "./components/ErrorContainer"

export default () => {
	return (
		<Container fullscreen>
			<Header />

			<MainContent>
				<Games />
			</MainContent>

			<ErrorContainer />
		</Container>
	)
}
