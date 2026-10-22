import { IncomingMessage, ServerResponse } from 'node:http';
import { Duplex } from 'node:stream';

// Exercise the real Express/HTTP request and response classes without a socket
// listener. This verifies server routing; it is not a browser integration test.
export function request(app, url, { method = 'GET', accept = 'text/html' } = {}) {
  return new Promise((resolve, reject) => {
    const output = [];
    const socket = new Duplex({
      highWaterMark: 16 * 1024 * 1024,
      read() { },
      write(chunk, encoding, done) {
        output.push(Buffer.from(chunk));
        done();
      }
    });
    const req = new IncomingMessage(socket);
    req.method = method;
    req.url = url;
    req.headers = { accept };
    const res = new ServerResponse(req);
    res.assignSocket(socket);
    res.on('error', reject);
    res.on(
      'finish',
      () => {
        resolve(
          {
            status: res.statusCode,
            headers: res.getHeaders(),
            output: Buffer.concat(output).toString()
          }
        );
        socket.destroy();
      }
    );
    app(req, res);
  });
}
