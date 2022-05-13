# command-queue

**a command queue**

[![npm status]

## example

`npm install --save @kessler/command-queue`

```js
const { CommandQueue, Command, haltCommand } = require('@kessler/command-queue')

class MyCommand extends Command {
    async execute(state) {
        await doSomething()
    }

    async undo(state) {
        await undoSomething()
    }
}

class MultiCommand extends Command {
    async execute(state, queue /*executing queue reference*/) {
        const resultOfSomething = await doSomething()
        if (!resultOfSomething) {
            return haltCommand
        }
        // returned command will execute after this command
        // same as enqueuing two commands but happens at 
        // "runtime". Does not apply to undo
        return new MyCommand()
    }

    async undo(state) {
        await undoSomething()
    }   
}

let queue = new CommandQueue()

queue.enqueue(new MyCommand())
// once MultiCommand is executed, another MyCommand is injected into the queue
// to be executed immediately after
queue.enqueue(new MultiCommand()) 
queue.enqueue(new MyCommand())
queue.enqueue(new MyCommand())

queue.on('enqueue', (command, queue) => {})
queue.on('before execute', (command, lastResult, queue) => {})
queue.on('after execute', (command, result, queue) => {})
queue.on('before undo', (command, lastResult, queue) => {})
queue.on('after undo', (command, undoResult, queue) => {})

const state = await queue.executeStep(2, { foo: 'bar' }) // execute 2 with initial state
await queue.execute(state) // execute the rest
await queue.undoStep() // undo 1
await queue.undo() // undo the rest
```

## license

[MIT](http://opensource.org/licenses/MIT) © Yaniv Kessler
