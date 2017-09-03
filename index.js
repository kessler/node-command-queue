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

	execute(callback) {
		throw new Error('must implement')
	}

	undo(callback) {
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

	execute(callback) {
		if (this._queue.length === 0) {
			return callback()
		}

		let nextCommand = this._queue.pop()
		this.emit('before execute', nextCommand, this)

		nextCommand.execute((err) => {
			if (err) {
				return callback(err)
			}

			this._history.push(nextCommand)
			this.emit('after execute', nextCommand, this)
			this.execute(callback)
		})
	}

	undo(callback) {
		if (this._history.length === 0) {
			return callback()
		}

		let nextCommand = this._history.pop()
		this.emit('before undo', nextCommand, this)

		nextCommand.undo((err) => {
			if (err) {
				return callback(err)
			}
			
			this.emit('after undo', nextCommand, this)
			this.undo(callback)
		})
	}

	get queueLength() {
		return this._queue.length
	}

	get historyLength() {
		return this._history.length
	}
}

module.exports = { Command, CommandQueue }
