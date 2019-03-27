import React, { createContext, useContext, useState } from "react"

const Context = createContext({
	lastCheck: false,
	engines: [],
	nodeRam: 0,
	stockfishRam: 0,
	stockfishCPU: 0,
	isRunning: false,
	progress: []
})
const { Consumer } = Context

const useStore = props => {
	const [store, setStore] = useState(useContext(Context))

	const update = data => {
		const newStore = Object.assign({}, store, data)
		if (JSON.stringify(store) !== JSON.stringify(newStore))
			setStore(newStore)
	}

	return [store, update]
}

const Provider = props => {
	const [store, update] = useStore()

	return (
		<Context.Provider value={{ store, update }}>
			{props.children}
		</Context.Provider>
	)
}

export { Provider, Consumer, Context }
