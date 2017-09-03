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

    execute(callback) {
        doSomething(callback)
    }

    undo(callback) {
        undoSomething(callback)
    }
}

let queue = new CommandQueue()

queue.enqueue(new MyCommand())
queue.enqueue(new MyCommand())
queue.enqueue(new MyCommand())

queue.execute((err) => {
    queue.undo((err) => {
    })
})
```

## license

[MIT](http://opensource.org/licenses/MIT) © Yaniv Kessler
