import os from "os"

const exec = require("child_process").exec

const execute = (command, callback) => {
	exec(command, function(error, stdout, stderr) {
		callback(stderr || error, stdout)
	})
}

export const getProcessUsage = (search, usePID = false) => {
	return new Promise((resolve, reject) => {
		try {
			const cmd = usePID
				? `ps -axm -o rss,pcpu,comm,pid | grep ${search}`
				: `ps -axm -o rss,pcpu,comm | grep ${search}`

			execute(cmd, (error, output) => {
				if (error) return reject(error)

				try {
					const lines = output
						.split("\n")
						.map(l => l.trim().replace(/\s+/, " "))
						.filter(l => l)

					const memory = Math.round(
						lines
							.map(l => l.split(" ")[0])
							.reduce((a, b) => parseInt(a) + parseInt(b)) / 1024
					)

					const cpu =
						parseFloat(
							lines
								.map(l => l.split(" ")[1])
								.reduce((a, b) => parseFloat(a) + parseFloat(b))
						) / os.cpus().length

					return resolve({
						ram: memory,
						cpu: cpu,
						processes: lines.length
					})
				} catch (err) {
					return reject(err)
				}
			})
		} catch (err) {
			return reject(err)
		}
	})
}
