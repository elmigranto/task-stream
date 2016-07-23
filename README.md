# task-stream

**This is 0.x version. API will change.**

`npm install task-stream` and process tasks with Node's [Stream API](https://nodejs.org/api/stream.html) and get backpressure and other neat features for free.

## Basic Usage

``` js
const taskStream = require('task-stream');

// Provide a function that fetches tasks one by one
// callback(error, task)
const getTask = (callback) => db.tasks.findOne(callback);

// Provide a processing function
// callback(error)
const processTask = (task, callback) => {
  httpGet(task.url, (error, html) => {
    db.results.insert({
      error: error,
      result: html
    }, callback);
  });
};

// Combine everything together
// and start processing tasks.
const worker = taskStream(getTask, processTask);
worker.start();

// You can also stop selecting new tasks.
// Note that this won't stop any ongoing processing,
// but make sure that no more tasks are queued.
worker.stop();
```

## Notes

- `getTask` must call `callback(null, null)` when no more task are to be scheduled.

## Options

`taskStream` accepts optional `options` object
that may include one or more of the following props:

- `readAhead` positive integer specifies how many tasks will be buffered (defaults to `0`, so `getTask()` will only get called after all currently queued tasks are processed);
- `parallelTasks` positive integer specifies how many tasks can be processed in parallel (defaults to `1`);
- `onError` function will get called on any error;
- `onReadError` function will get called if `getTask` fails as;
- `onWriteError` function will get called if `processTaks` fails;
- `onFinish` function will get called when all the tasks are processed successfuly.

## Data Flow

To get a better idea on the data flow, check out [`test.js`](/test.js) and play around with `reader` and `writer` options using `DEBUG=* node test.js`.
