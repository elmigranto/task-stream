/* eslint-disable no-console */
'use strict';

const curtain = require('curtain-down');
const taskStream = require('./index');

const reader = {
  delay: 300,
  readAhead: 3,
  failAfter: Infinity
};

const writer = {
  delay: 800,
  parallelTasks: 2,
  failAfter: Infinity
};

let getTaskId = 0;
const getTask = (callback) => {
  getTaskId += 1;

  const error = getTaskId > reader.failAfter
    ? new Error('Read Error')
    : null;

  setTimeout(callback, reader.delay, error, {id: getTaskId});
};

let processTaskId = 0;
const processTask = (task, callback) => {
  processTaskId += 1;

  const error = processTaskId > writer.failAfter
    ? new Error('Process Error')
    : null;

  setTimeout(callback, writer.delay, error);
};

const worker = taskStream(
  getTask,
  processTask,
  {
    readAhead: reader.readAhead,
    parallelTasks: writer.parallelTasks,
    onReadError: (error) => console.log('failed to get task'),
    onWriteError: (error) => console.log('failed to process task', error.task),
    onError: (error) => {
      console.log('Some kind of error');
    },
    onFinish: console.log.bind(console, 'Done!')
  }
);

worker.start();
curtain(worker.stop.bind(worker));
