import React, { createContext, useContext, useReducer } from "react"
import { BehaviorSubject } from "rxjs"

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
	username: "",

	error: false
}

// The "reactive" state
export const state = new BehaviorSubject(initialState)

export const reducer = (oldState, action) => {
	const { type, value } = action

	switch (type) {
		case "syncGames":
			if (!Array.isArray(value) || !value.length) return oldState

			// Remove games that are over
			oldState.games = oldState.games.filter(g =>
				value.map(v => v.id).includes(g.id)
			)

			break

		case "updateGames":
			if (!Array.isArray(value) || !value.length) return oldState

			value.forEach(game => {
				const toUpdateIndex = oldState.games.findIndex(
					g => g.id === game.id
				)

				// Update existing game
				if (toUpdateIndex > -1) oldState.games[toUpdateIndex] = game
				// Add a new game to the list
				else oldState.games.push(game)
			})

			break
		// return state

		case "addComputingGame":
			if (!value || !value.id) return oldState

			// We're working here
			if (!oldState.isComputing) oldState.isComputing = true

			const toAddIndex = oldState.computingGames.findIndex(
				g => g.id === value.id
			)

			// Update an existing computing game
			if (toAddIndex > -1) oldState.computingGames[toAddIndex] = value
			// Add a new game to the list
			else oldState.computingGames.push(value)

			break
		// return state

		case "removeComputingGame":
			if (!value || !value.id) return oldState

			const toRemoveIndex = oldState.computingGames.findIndex(
				g => g.id === value.id
			)

			// Remove this game
			if (toRemoveIndex > -1)
				oldState.computingGames.splice(toRemoveIndex, 1)

			// Check if we're still computing something
			if (oldState.isComputing && !oldState.computingGames.length)
				oldState.isComputing = false

			break
		// return state

		case "addEngine":
			if (!value || !value.id || !value.engine) return oldState

			const engineToAddIndex = oldState.engines.findIndex(
				e => e.id === value.id
			)

			// Add or update the engine
			if (engineToAddIndex > -1)
				oldState.engines[engineToAddIndex] = value
			else oldState.engines.push(value)

			// return state
			break

		case "removeEngines":
			if (!value || !Array.isArray(value)) return oldState

			value.forEach(g => {
				const engineToRemove = oldState.engines.findIndex(
					e => e.id === g.id
				)
				if (engineToRemove > -1) {
					try {
						engineToRemove.engine
							.quit()
							.then(() => {})
							.catch(err => dispatch({ error: err }))

						oldState.engines.splice(engineToRemove, 1)
					} catch (err) {
						dispatch({ error: err })
					}
				}
			})

			break

		default:
			oldState = { ...oldState, ...action }

			break
	}

	state.next(oldState)

	return oldState
}
