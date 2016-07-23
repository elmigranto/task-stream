'use strict';

const {Readable, Writable} = require('stream');
const debugMod = require('debug');

const createDebug = (id) => debugMod(id ? `task-stream:${id}` : 'task-stream');
const debug = createDebug();

class Tasks extends Readable {
  constructor (options) {
    super({
      objectMode: true,
      highWaterMark: options.parallelism - 1
    });

    this.stopped = false;
    this.getTask = options.getTask;
    this.debug = createDebug('tasks');
  }

  _read (size) {
    this.debug('_read()');

    if (this.stopped) {
      this.debug('stopped, pushing null…');
      return this.push(null);
    }

    this.getTask((err, task = null) => {
      if (err) {
        this.debug('getTask() failed', err);
        return this.emit('error', err);
      }

      this.debug('queueing', task);
      this.push(task);
    });
  }
}

class Worker extends Writable {
  constructor (options) {
    super({
      objectMode: true,
      highWaterMark: options.parallelism - 1
    });

    this.processTask = options.processTask;
    this.debug = createDebug('worker');
  }

  _write (task, encoding, done) {
    this.debug('processing', task);
    this.processTask(task, (err) => {
      if (err) {
        this.debug('processTask() failed', err);
        err.task = task;
      }
      else
        this.debug('processed', task);

      done(err);
    });
  }
}

module.exports = function (getTask, processTask, {
  readAhead = 0,
  parallelTasks = 1,
  onReadError, onWriteError, onError, onFinish
} = {}) {
  const tasks = new Tasks({
    getTask,
    parallelism: readAhead + 1
  });

  const worker = new Worker({
    processTask,
    parallelism: parallelTasks
  });

  const whoFinished = {
    tasks: false,
    worker: false
  };

  if (onReadError instanceof Function)
    tasks.on('error', onReadError);

  if (onWriteError instanceof Function)
    worker.on('error', onWriteError);

  if (onError instanceof Function) {
    tasks.on('error', onError);
    worker.on('error', onError);
  }

  if (onFinish instanceof Function) {
    const done = () => {
      if (whoFinished.tasks && whoFinished.worker) {
        debug('calling onFinish()');
        onFinish();
      }
    };

    tasks.on('end', () => {
      debug('tasks ended');
      whoFinished.tasks = true;
      done();
    });

    worker.on('finish', () => {
      debug('worker finished');
      whoFinished.worker = true;
      done();
    });
  }

  return {
    start () {
      debug('Starting…');
      tasks.pipe(worker);
    },

    stop () {
      debug('Stopping tasks…');
      tasks.stopped = true;
    }
  };
};
