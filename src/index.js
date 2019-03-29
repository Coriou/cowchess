import React from "react"
import { render } from "ink"
import { Provider, reducer, initialState } from "./context"

import App from "./App"

const Wrapper = () => {
	return (
		<Provider initialState={initialState} reducer={reducer}>
			<App />
		</Provider>
	)
}

const { unmount } = render(<Wrapper />)

// setTimeout(unmount, 10e3)
