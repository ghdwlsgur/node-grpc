'use strict';

import path from 'path';
const __dirname = path.resolve();
import * as grpc from '@grpc/grpc-js';
import * as protoloader from '@grpc/proto-loader';
import { ProtoGrpcType } from '../proto/random.js';
import { RandomHandlers } from '../proto/randomPackage/Random.js';
import { TodoResponse } from 'proto/randomPackage/TodoResponse.js';
import { TodoRequest } from 'proto/randomPackage/TodoRequest.js';

const PORT = 8082;
const PROTO_FILE = './proto/random.proto';

const packageDef = protoloader.loadSync(path.resolve(__dirname, PROTO_FILE));
const grpcObj = grpc.loadPackageDefinition(
  packageDef,
) as unknown as ProtoGrpcType;
const randomPackage = grpcObj.randomPackage;

function main() {
  const server = getServer();

  server.bindAsync(
    `0.0.0.0:${PORT}`,
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) {
        console.error(err);
        return;
      }
      console.log(`Your server as started on port ${port}`);
      server.start();
    },
  );
}

const todoList: TodoResponse = { todos: [] };
function getServer() {
  const server = new grpc.Server();
  server.addService(randomPackage.Random.service, {
    PingPong: (req, res) => {
      console.log(req.request);
      res(null, { message: 'Pong' });
    },
    RandomNumbers: call => {
      const { maxVal = 10 } = call.request;
      console.log(maxVal);

      let runCount = 0;
      const id = setInterval(() => {
        runCount = ++runCount;
        call.write({
          num: Math.floor(Math.random() * maxVal),
        });
        if (runCount >= 10) {
          clearInterval(id);
          call.end();
        }
      }, 500);
    },
    TodoList: (call, callback) => {
      call.on('data', (chunk: TodoRequest) => {
        todoList.todos?.push(chunk);
        console.log(chunk);
      });

      call.on('end', () => {
        callback(null, {
          todos: todoList.todos,
        });
      });
    },
  } as RandomHandlers);

  return server;
}

main();
