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

  /**
   *    execute's the command, if the previous command returned something
   *    it will be provided via state
   *    
   *    @param  {Variant} state 
   *    @return {Variant}
   */
  execute(state) {
    throw new Error('must implement')
  }

  /**
   *    Undo the command, the state is the state that was fed to execute()
   *    @param  {Variant} state
   *    @return {Variant}
   */
  undo(state) {
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

  async execute(state, count = this._queue.length) {
    if (count === 0) {
      return state
    }

    if (this._queue.length === 0) {
      return state
    }

    const nextCommand = this._queue.pop()
    this.emit('before execute', nextCommand, state, this)

    let result = await nextCommand.execute(state, this)
    this._history.push({ command: nextCommand, lastResult: state })
    this.emit('after execute', nextCommand, result, this)

    if (result instanceof HaltCommand) {
      this.emit('halted')
      return result
    }

    // a command that wants to inject a subsequent command into the queue
    // intentionally increasing count here, since the queue length has increased
    if (result instanceof Command) {
      this._queue.push(result)
      result = state
      count++
    }

    return await this.execute(result, --count)
  }

  executeStep(count = 1, state) {
    return this.execute(state, count)
  }

  async undo(count = this._history.length) {
    if (count === 0) {
      return
    }

    if (this._history.length === 0) {
      return
    }

    const { command, lastResult } = this._history.pop()
    this.emit('before undo', command, lastResult, this)
    const undoResult = await command.undo(lastResult, this)
    this.emit('after undo', command, undoResult, this)
    return this.undo(--count)
  }

  undoStep(count = 1) {
    return this.undo(count)
  }

  get queueLength() {
    return this._queue.length
  }

  get historyLength() {
    return this._history.length
  }
}

class HaltCommand extends Command {
  constructor() {
    super()
  }

  async execute() {
    throw new Error('halt command is special and cannot be executed')
  }

  async undo() {
    throw new Error('halt command is special and cannot be undone')
  }
}

module.exports = { Command, CommandQueue, haltCommand: new HaltCommand() }
