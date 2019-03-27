import React from "react"
import { render } from "ink"
import { Provider } from "./store"
import Stats from "./components/Stats"

const App = props => {
	return (
		<Provider>
			<Stats />
		</Provider>
	)
}

render(<App />)
