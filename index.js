const { EventEmitter } = require('events')

/**
 *	the Command class is an abstract class for all the commands
 *	involved in the process of unloading data to spectrum
 *
 */
class Command {

	constructor() {
		if (new.target === Command) {
			throw new TypeError('Cannot construct Abstract instances directly')
		}
	}

	execute() {
		throw new Error('must implement')
	}

	undo() {
		throw new Error('must implement')
	}
}

class CommandQueue extends EventEmitter {
	constructor() {
		super()

		this._queue = []
		this._history = []
	}

	enqueue(command) {
		if (!(command instanceof Command)) {
			throw new Error('can only push instances of Command')
		}

		this._queue.unshift(command)

		this.emit('enqueue', command, this)
	}

	clear() {
		this._queue = []
	}

	async execute(count = this._queue.length) {
		if (count === 0) {
			return
		}

		if (this._queue.length === 0) {
			return
		}

		const nextCommand = this._queue.pop()
		this.emit('before execute', nextCommand, this)

		await nextCommand.execute()
		this._history.push(nextCommand)
		this.emit('after execute', nextCommand, this)

		return this.execute(--count)
	}

	async undo(count = this._history.length) {
		if (count === 0) {
			return
		}

		if (this._history.length === 0) {
			return
		}

		const nextCommand = this._history.pop()
		this.emit('before undo', nextCommand, this)

		await nextCommand.undo()
		this.emit('after undo', nextCommand, this)
		return this.undo(--count)
	}

	get queueLength() {
		return this._queue.length
	}

	get historyLength() {
		return this._history.length
	}
}

module.exports = { Command, CommandQueue }