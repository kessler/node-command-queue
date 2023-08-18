const test = require('ava')
const { CommandQueue, Command } = require('./index')

test('exposes the size of the queue via the "queueLength" property', t => {
  const { queue } = t.context
  t.is(queue.queueLength, 3)
})

test('executes ALL the commands pushed to the queue in a FIFO order', async t => {
  const { queue, executionOrder } = t.context
  await queue.execute()
  t.deepEqual(executionOrder, [0, 1, 2])
})

test('the queue will pass a command\'s result to the next one as a parameter', async t => {
  class MyCommand extends Command {
    execute(state = 0) {
      return state + 1
    }
  }

  const queue = new CommandQueue()

  queue.enqueue(new MyCommand())
  queue.enqueue(new MyCommand())
  queue.enqueue(new MyCommand())

  const results = []

  queue.on('after execute', (command, result) => {
    results.push(result)
  })

  await queue.execute()
  t.deepEqual(results, [1, 2, 3])
})

test('executes SOME the commands pushed to the queue in a FIFO order', async t => {
  const { queue, executionOrder } = t.context
  await queue.executeStep(2)
  t.deepEqual(executionOrder, [0, 1])
})

test('execute count greater than the queue length will work', async t => {
  const { queue, executionOrder } = t.context
  await queue.executeStep(232)
  t.deepEqual(executionOrder, [0, 1, 2])
})

test('calling execute when no commands are queued has no effect', async t => {
  const queue = new CommandQueue()
  queue.on('after execute', () => t.fail('should not happen'))
  await queue.execute()
  t.pass()
})

test('execution halts if one of the commands has an execution error', async t => {
  const { executionOrder } = t.context
  const queue = new CommandQueue()

  const expectedError = new Error()

  queue.enqueue(new FooCommand(t.context, 0))
  queue.enqueue(new FooCommand(t.context, 1, expectedError))
  queue.enqueue(new FooCommand(t.context, 2))

  await t.throwsAsync(async () => {
    await queue.execute()
  }, { is: expectedError })

  t.deepEqual(executionOrder, [0])
})

test('before execution of a command an event is emitted', async t => {
  t.plan(4)
  const { queue } = t.context
  const emitted = []
  queue.on('before execute', command => {
    t.not(command.executeCalled)
    emitted.push(command.index)
  })

  await queue.execute()
  t.deepEqual(emitted, [0, 1, 2])
})

test('after an execution of a command an event is emitted', async t => {
  t.plan(4)
  const { queue } = t.context
  const emitted = []
  queue.on('after execute', command => {
    t.true(command.executeCalled)
    emitted.push(command.index)
  })

  await queue.execute()
  t.deepEqual(emitted, [0, 1, 2])
})

test('exposes the size of the history queue via the "historyLength" property', async t => {
  const { queue } = t.context
  t.is(queue.historyLength, 0)
  await queue.execute()
  t.is(queue.historyLength, 3)
})

test('undo ALL the executed commands in the reverse order they were executed', async t => {
  const { queue, undoOrder, executionOrder } = t.context
  await queue.execute()
  t.deepEqual(executionOrder, [0, 1, 2])
  await queue.undo()
  t.deepEqual(undoOrder, executionOrder.reverse())
})

test('undo will be invoked with the same state used in command\'s execute() invocation', async t => {
  class MyCommand extends Command {
    execute(state = 0) {
      return state + 1
    }

    undo(state) {
      return state
    }
  }

  const queue = new CommandQueue()

  queue.enqueue(new MyCommand())
  queue.enqueue(new MyCommand())
  queue.enqueue(new MyCommand())

  const results = []

  queue.on('after undo', (command, undoResult) => {
    results.push(undoResult)
  })

  await queue.execute()
  await queue.undo()

  // first command, which is the last undo was invoked with an "undefined" state
  t.deepEqual(results, [2, 1, undefined])
})

test('undo SOME of the executed commands in the reverse order they were executed', async t => {
  const { queue, undoOrder, executionOrder } = t.context
  await queue.execute()
  t.deepEqual(executionOrder, [0, 1, 2])
  await queue.undo(2)
  t.deepEqual(undoOrder, [2, 1])
})

test('undo with count greater than the length of the executed commands will work also', async t => {
  const { queue, undoOrder, executionOrder } = t.context
  await queue.execute()
  t.deepEqual(executionOrder, [0, 1, 2])
  await queue.undo(12)
  t.deepEqual(undoOrder, executionOrder.reverse())
})

test('calling undo when no commands were executed has no effect', async t => {
  const { queue, undoOrder, executionOrder } = t.context
  t.is(executionOrder.length, 0)
  t.is(undoOrder.length, 0)
  await queue.undo()
  t.is(undoOrder.length, 0)
})

test('if a command undo errors, the undo process is halted', async t => {
  const { undoOrder, executionOrder } = t.context
  const queue = new CommandQueue()
  const expectedError = new Error()

  queue.enqueue(new FooCommand(t.context, 0))
  // make undo throw an error, not execute
  queue.enqueue(new FooCommand(t.context, 1, null, expectedError))
  queue.enqueue(new FooCommand(t.context, 2))

  await queue.execute()
  await t.throwsAsync(async () => {
    await queue.undo()
  }, { is: expectedError })

  // undo only worked for last command, this stopped due to error on command index 1
  t.deepEqual(undoOrder, [2])
})

test('before undoing a command an event is emitted', async t => {
  t.plan(7)
  const { queue } = t.context
  const emitted = []
  queue.on('before undo', command => {
    t.not(command.undoCalled)
    t.true(command.executeCalled)
    emitted.push(command.index)
  })

  await queue.execute()
  await queue.undo()
  t.deepEqual(emitted, [2, 1, 0])
})

test('after undoing a command an event is emitted', async t => {
  t.plan(7)
  const { queue } = t.context
  const emitted = []
  queue.on('after undo', command => {
    t.true(command.undoCalled)
    t.true(command.executeCalled)
    emitted.push(command.index)
  })

  await queue.execute()
  await queue.undo()
  t.deepEqual(emitted, [2, 1, 0])
})

test('calling clear() will remove all queued commands', t => {
  const { queue } = t.context
  t.is(queue.queueLength, 3)
  queue.clear()
  t.is(queue.queueLength, 0)
})

test('calling clear() will NOT remove commands from the history queue', async t => {
  const { queue } = t.context
  t.is(queue.queueLength, 3)
  await queue.execute()
  t.is(queue.historyLength, 3)
  queue.clear()
  t.is(queue.historyLength, 3)
})

test('injecting another command into the queue by returning it from an existing command\'s execute() method', async t => {
  const exec = []
  const undo = []
  class MyCommand extends Command {
    execute() {
      exec.push(0)

      return new(class extends MyCommand {
        execute(state) {
          // state should be the same as command that injected
          t.is(state, 99)
          exec.push(1)
        }

        undo() {
          undo.push(1)
        }
      })
    }

    undo() {
      undo.push(0)
    }
  }

  class MyCommand1 extends Command {
    execute() {
      exec.push(2)
    }

    undo() {
      undo.push(2)
    }
  }

  const queue = new CommandQueue()
  queue.enqueue(new MyCommand())
  queue.enqueue(new MyCommand1())
  await queue.execute(99)
  t.deepEqual(exec, [0, 1, 2])
  await queue.undo()
  t.deepEqual(undo, [2, 1, 0])
})

test('queue.execute will return the result from the last command', async t => {
  class MyCommand extends Command {
    execute(state = 0) {
      return state + 1
    }
  }

  const queue = new CommandQueue()
  queue.enqueue(new MyCommand())
  queue.enqueue(new MyCommand())
  queue.enqueue(new MyCommand())
  queue.enqueue(new MyCommand())
  queue.enqueue(new MyCommand())

  const result = await queue.execute()
  t.is(result, 5)
})

test('we can provide initial state to queue.execute', async t => {
  class MyCommand extends Command {
    execute(state = 0) {
      return state + 1
    }
  }

  const queue = new CommandQueue()
  queue.enqueue(new MyCommand())
  queue.enqueue(new MyCommand())
  queue.enqueue(new MyCommand())
  queue.enqueue(new MyCommand())
  queue.enqueue(new MyCommand())

  const result = await queue.execute(10)
  t.is(result, 15)
})

test('stepped execution returns the result from the last command executed', async t => {
  class MyCommand extends Command {
    execute(state = 0) {
      return state + 1
    }
  }

  const queue = new CommandQueue()
  queue.enqueue(new MyCommand())
  queue.enqueue(new MyCommand())
  queue.enqueue(new MyCommand())
  queue.enqueue(new MyCommand())
  queue.enqueue(new MyCommand())

  let result = await queue.executeStep(2)
  t.is(result, 2)

  result = await queue.executeStep(1, result)
  t.is(result, 3)

  result = await queue.execute(result)
  t.is(result, 5)
})

test.beforeEach(t => {
  t.context.queue = new CommandQueue()
  t.context.executionOrder = []
  t.context.undoOrder = []

  t.context.queue.enqueue(new FooCommand(t.context, 0))
  t.context.queue.enqueue(new FooCommand(t.context, 1))
  t.context.queue.enqueue(new FooCommand(t.context, 2))
})

class FooCommand extends Command {
  constructor({ executionOrder, undoOrder }, index, executeError, undoError) {
    super()
    this.index = index
    this._executeError = executeError
    this._undoError = undoError
    this.executeCalled = false
    this.undoCalled = false
    this._executionOrder = executionOrder
    this._undoOrder = undoOrder
  }

  execute() {
    this.executeCalled = true
    if (this._executeError) {
      throw this._executeError
    }

    this._executionOrder.push(this.index)

    return Promise.resolve()
  }

  undo() {
    this.undoCalled = true
    if (this._undoError) {
      throw this._undoError
    }

    this._undoOrder.push(this.index)

    return Promise.resolve()
  }
}