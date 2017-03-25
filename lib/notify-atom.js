"use babel";
import {CompositeDisposable} from "atom";
import http from "http";
import querystring from "querystring";

export default {
  config: {
    port: {
      type: "integer",
      default: 8090,
      minimum: 1,
    },
  },

  subscriptions: null,
  packageName: "notify-atom",

  activate (state) {
    this.subscriptions = new CompositeDisposable();

    const configPort = "notify-atom.port";

    const restartServer = (wasRestart) => {
      if (this.server) {
        this.server.close();
      }
      this.port = atom.config.get(configPort);
      this.startListening(this.port, wasRestart);
    };

    restartServer();

    atom.config.onDidChange(configPort, ({newValue, oldValue}) => {
      if (this.restartTimeout) {
        window.clearTimeout(this.restartTimeout);
      }

      this.restartTimeout = window.setTimeout(() => {
        this.restartTimeout = null;
        restartServer(true);
      }, 1000);
    });
  },

  startListening (port, wasRestart) {
    this.server = http.createServer((request, response) => {
      if (request.method.toUpperCase() === "POST") {
        let body = "";

        request.on("data", (data) => {
          body += data;
          if (body.length > 1e6) {
            request.connection.destroy();
          }
        });

        request.on("end", () => {
          let requestParams = {};
          try {
            requestParams = JSON.parse(body);
          } catch (e) {
            requestParams = querystring.parse(body);
          }

          this.handleRequest(requestParams);
        });
      }
      response.writeHead(200);
      response.end();
    });

    this.server.on("error", (err) => {
      if (err.code.indexOf("EADDRINUSE") !== -1) {
        atom.notifications.addWarning(`Failed to start ${this.packageName}`, {
          description: `Unable to bind to port (${this.port}). This port is already in use by another service. Please change your port number in the package settings.`,  // eslint-disable-line
        });
      } else {
        atom.notifications.addError(`Failed to start ${this.packageName}`, {
          description: `Unable to bind to port (${this.port}) for an unknown reason. Please report this to the package maintainer:<br/><br/>${err}` // eslint-disable-line
        });
      }
    });

    this.server.listen(port, () => {
      if (wasRestart) {
        atom.notifications.addSuccess(`${this.packageName} restarted`, {
          description: `Now listening on port ${this.port}`,
        });
      }
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
