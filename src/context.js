import React, { createContext, useContext, useReducer } from "react"
// import { observable, observe } from "@nx-js/observer-util"

export const Context = createContext()

export const Provider = ({ reducer, initialState, children }) => {
	return (
		<Context.Provider value={useReducer(reducer, initialState)}>
			{children}
		</Context.Provider>
	)
}

export const useStore = () => useContext(Context)

/**  */

export const initialState = {
	isCheckingGames: false,
	isComputing: false,
	lastCheck: false,
	games: [],
	computingGames: [],
	engines: [],
	hasInit: false,

	error: false
}

// The "reactive" state
// export let globalState = observable(initialState)
export let globalState = initialState

export const reducer = (state, action) => {
	const { type, value } = action
	switch (type) {
		case "updateGames":
			if (!Array.isArray(value) || !value.length) return state

			value.forEach(game => {
				const toUpdateIndex = state.games.findIndex(
					g => g.id === game.id
				)

				// Update existing game
				if (toUpdateIndex > -1) state.games[toUpdateIndex] = game
				// Add a new game to the list
				else state.games.push(game)
			})

			break
		// return state

		case "addComputingGame":
			if (!value || !value.id) return state

			// We're working here
			if (!state.isComputing) state.isComputing = true

			const toAddIndex = state.computingGames.findIndex(
				g => g.id === value.id
			)

			// Update an existing computing game
			if (toAddIndex > -1) state.computingGames[toAddIndex] = value
			// Add a new game to the list
			else state.computingGames.push(value)

			break
		// return state

		case "removeComputingGame":
			if (!value || !value.id) return state

			const toRemoveIndex = state.computingGames.findIndex(
				g => g.id === value.id
			)

			// Remove this game
			if (toRemoveIndex > -1)
				state.computingGames.splice(toRemoveIndex, 1)

			// Check if we're still computing something
			if (state.isComputing && !state.computingGames.length)
				state.isComputing = false

			break
		// return state

		case "addEngine":
			if (!value || !value.id || !value.engine) return state

			const engineToAddIndex = state.engines.findIndex(
				e => e.id === value.id
			)

			// Add or update the engine
			if (engineToAddIndex > -1) state.engines[engineToAddIndex] = value
			else state.engines.push(value)

			// return state
			break

		default:
			// return observable({ ...state, ...action })
			// return { ...state, ...action }
			state = { ...state, ...action }

			break
	}

	// state = observable(state)
	globalState = state
	// observe(() => (globalState = state))

	return state
}
