const { CommandQueue, Command } = require('./index')
const { expect } = require('chai')

describe('CommandQueue', () => {
	let queue, executionOrder, undoOrder

	it('exposes the size of the queue via the "queueLength" property', () => {
		expect(queue.queueLength).to.equal(3)
	})

	it('executes queue commands that were pushed to the queue in a FIFO order', (done) => {
		queue.execute((err) => {
			if (err) return done(err)
			expect(executionOrder).to.deep.equal([0, 1, 2])
			done()
		})
	})

	it('calling execute when no commands where queued has no effect', (done) => {
		queue = new CommandQueue()

		queue.execute((err) => {
			if (err) return done(err)
			expect(executionOrder).to.deep.equal([])
			done()
		})
	})

	it('execution halts if one of the commands has an execution error', (done) => {
		queue = new CommandQueue()

		let expectedError = new Error()

		queue.enqueue(new FooCommand(0))
		queue.enqueue(new FooCommand(1, expectedError))
		queue.enqueue(new FooCommand(2))

		queue.execute((err) => {
			if (!err) {
				return done(new Error('expected an error from execute() call'))
			}

			expect(err).to.eql(expectedError)
			expect(executionOrder).to.deep.equal([0])
			done()
		})
	})

	it('before execution of a command an event is emitted', (done) => {
		let emitted = []

		queue.on('before execute', (command) => {
			expect(command.executeCalled).to.be.false
			emitted.push(command.index)
		})

		queue.execute((err) => {
			if (err) return done(err)
			expect(emitted).to.deep.equal([0, 1, 2])
			done()
		})
	})

	it('after an execution of a command an event is emitted', (done) => {
		let emitted = []

		queue.on('after execute', (command) => {
			emitted.push(command.index)
		})

		queue.execute((err) => {
			if (err) return done(err)
			expect(emitted).to.deep.equal([0, 1, 2])
			done()
		})
	})

	it('exposes the size of the history queue via the "historyLength" property', (done) => {
		expect(queue.historyLength).to.equal(0)
		queue.execute((err) => {
			if (err) return done(err)
			expect(queue.historyLength).to.equal(3)
			done()
		})
	})

	it('undo all the executed commands in the reverse order they were executed', (done) => {
		queue.execute((err) => {
			if (err) return done(err)

			queue.undo((err) => {
				if (err) return done(err)
				expect(undoOrder).to.deep.equal([2, 1, 0])
				done()
			})
		})
	})

	it('calling undo when no commands were executed has no effect', (done) => {
		queue.undo((err) => {
			if (err) return done(err)
			expect(undoOrder).to.deep.equal([])
			done()
		})
	})

	it('if a command undo errors, the undo process is halted', (done) => {
		queue = new CommandQueue()

		let expectedError = new Error()

		queue.enqueue(new FooCommand(0))
		queue.enqueue(new FooCommand(1, null, expectedError))
		queue.enqueue(new FooCommand(2))

		queue.execute((err) => {
			if (err) {
				return done(err)
			}

			queue.undo((err) => {
				if (!err) return done(new Error('expected an error from undo() call'))

				expect(err).to.eql(expectedError)
				expect(undoOrder).to.deep.equal([2])
				done()
			})
		})
	})

	it('before undoing a command an event is emitted', (done) => {
		let emitted = []

		queue.on('before undo', (command) => {
			expect(command.undoCalled).to.be.false
			emitted.push(command.index)
		})

		queue.execute((err) => {
			if (err) return done(err)

			queue.undo((err) => {
				if (err) return done(err)

				expect(emitted).to.deep.equal([2, 1, 0])
				done()
			})
		})
	})

	it('after undoing a command an event is emitted', (done) => {
		let emitted = []

		queue.on('after undo', (command) => {
			expect(command.undoCalled).to.be.true
			emitted.push(command.index)
		})

		queue.execute((err) => {
			if (err) return done(err)

			queue.undo((err) => {
				if (err) return done(err)

				expect(emitted).to.deep.equal([2, 1, 0])
				done()
			})
		})
	})

	it('calling clear() will remove all queued commands', () => {
		expect(queue.queueLength).to.equal(3)
		queue.clear()
		expect(queue.queueLength).to.equal(0)
	})

	it('calling clear() will NOT remove commands from the history queue', () => {
		expect(queue.queueLength).to.equal(3)
		queue.execute((err) => {
			if (err) return done(err)
			expect(queue.historyLength).to.equal(3)
			queue.clear()
			expect(queue.historyLength).to.equal(3)
		})
	})

	beforeEach(() => {
		queue = new CommandQueue()
		executionOrder = []
		undoOrder = []

		queue.enqueue(new FooCommand(0))
		queue.enqueue(new FooCommand(1))
		queue.enqueue(new FooCommand(2))
	})

	class FooCommand extends Command {
		constructor(index, executeError, undoError) {
			super()
			this.index = index
			this._executeError = executeError
			this._undoError = undoError
			this.executeCalled = false
			this.undoCalled = false
		}

		execute(callback) {
			this.executeCalled = true
			if (this._executeError) {
				return callback(this._executeError)
			}

			executionOrder.push(this.index)

			callback()
		}

		undo(callback) {
			this.undoCalled = true
			if (this._undoError) {
				return callback(this._undoError)
			}

			undoOrder.push(this.index)

			callback()
		}
	}
})