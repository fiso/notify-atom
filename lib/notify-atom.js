'use babel';
import { CompositeDisposable } from 'atom';
import http from 'http';
import querystring from 'querystring';

export default {

  subscriptions: null,

  activate (state) {
    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    this.startListening();
  },
  
  startListening () {
    const server = http.createServer((request, response) => {
      if (request.method.toUpperCase() === "POST") {
        var body = '';

        request.on('data', (data) => {
          body += data;
          if (body.length > 1e6) {
            request.connection.destroy();
          }
        });

        request.on('end', () => {
          var post = querystring.parse(body);
          this.handleRequest(post);
        });
      }
      response.writeHead(200);
      response.end();
    });
    server.listen(8090, () => {
    });
  },
  
  handleRequest (r) {
    const handlers = {
      success: atom.notifications.addSuccess.bind(atom.notifications),
      info: atom.notifications.addInfo.bind(atom.notifications),
      warning: atom.notifications.addWarning.bind(atom.notifications),
      error: atom.notifications.addError.bind(atom.notifications),
      fatalerror: atom.notifications.addFatalError.bind(atom.notifications),
    };
    
    if (!r.type || !handlers[r.type] || !r.message) {
      return;
    }

    handlers[r.type](r.message);
  },

  deactivate () {
    this.subscriptions.dispose();
  },

  serialize () {
    return {
    };
  },
};
