# command-queue

**a command queue**

[![npm status](http://img.shields.io/npm/v/command-queue.svg?style=flat-square)](https://www.npmjs.org/package/command-queue) 

## example

`npm install --save @kessler/command-queue`

```js
const { CommandQueue, Command } = require('@kessler/command-queue')

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
        await doSomething()
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

await queue.execute(2) // execute 2
await queue.execute() // execute the rest
await queue.undo(1) // undo 1
await queue.undo() // undo the rest
```

## license

[MIT](http://opensource.org/licenses/MIT) © Yaniv Kessler
