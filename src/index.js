import React from "react"
import { render } from "ink"
import inquirer from "inquirer"
import { Provider, reducer, initialState } from "./context"
import { readSettings, writeSettings } from "./utils"

import App from "./App"

inquirer
	.prompt([
		{
			type: "input",
			name: "username",
			message: "What's your chess.com username ?",
			default: readSettings().username
		}
	])
	.then(userInput => {
		const { username } = userInput

		writeSettings({ username: username })

		const Wrapper = () => {
			initialState.username = username

			return (
				<Provider initialState={initialState} reducer={reducer}>
					<App />
				</Provider>
			)
		}

		const { unmount } = render(<Wrapper />)

		// setTimeout(unmount, 10e3)
	})
