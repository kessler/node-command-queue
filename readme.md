# command-queue

**a command queue**

[![npm status](http://img.shields.io/npm/v/command-queue.svg?style=flat-square)](https://www.npmjs.org/package/command-queue) 

## example

`npm install --save @kessler/command-queue`

```js
const { CommandQueue, Command } = require('@kessler/command-queue')

class MyCommand extends Command {
    constructor() {
    }

    async execute(state) {
        await doSomething()
    }

    async undo(state) {
        await undoSomething()
    }
}

let queue = new CommandQueue()

queue.enqueue(new MyCommand())
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
