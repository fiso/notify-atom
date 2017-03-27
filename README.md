# notify-atom package

Provides a way for scripts and applications to pass notifications into Atom.

![Package screenshot](http://i.imgur.com/IqlSapi.gif)

## Why would I want this?

The primary intended use is to give your development build system the power to
notify the developer that they have a syntax error somewhere. I've seen too many
developers having nervous breakdowns over dev scripts not working, when they
have a tiny error somewhere that's preventing the automatic builds from generating
any working code for them.

## How do I use it?

The package starts an http server, listening on port 8090 (configurable) on your machine. This server will react to POST requests in JSON or querystring format that contain the `type` and `message` parameters, where `type` is one of `success, info, warning, error, fatalerror` and message can be any string.

Here's an example CURL command line you use, to verify that it's working:
```bash

curl --data '{"type":"info","message":"It works"}' http://localhost:8090
```

Then use any way of making an http POST request in your scripts, to make them talk back to you when they need to.

Here's a longer example of a Node.js script you can pipe your stderr to:

```javascript
const http = require("http");
const readline = require("readline");

function postNotification (type, message, description) {
  const body = JSON.stringify({
    type, message, description,
  });

  const request = http.request({
    url: "http://localhost/",
    port: 8090,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
    },
  });
  request.end(body);
}

function isSassError (line) {
  const lowLine = line.toLocaleLowerCase();
  if (
    lowLine.indexOf("invalid css") !== -1 &&
    lowLine.indexOf("\"formatted\"") !== -1 &&
    lowLine.indexOf("\"formatted\"") < lowLine.indexOf("invalid css")
    ||
    lowLine.indexOf("error") !== -1 &&
    lowLine.indexOf("\"formatted\"") !== -1 &&
    lowLine.indexOf("\"formatted\"") < lowLine.indexOf("error")
  ) {
    return true;
  }

  return false;
}

function parseSassError (line) {
  const lowLine = line.toLocaleLowerCase();
  const lineNum = line.substring(lowLine.indexOf("on line ") +
    "on line ".length, lowLine.indexOf(" ", lowLine.indexOf("on line ") +
      "on line ".length)).trim();
  const sourceFile = line.substring(lowLine.indexOf(" of ",
    lowLine.indexOf("on line ")) + " of ".length, lowLine.indexOf("\\n",
    lowLine.indexOf("on line "))).trim();
  return `Invalid sass syntax on line ${lineNum} of ${sourceFile}`;
}

function isJSError (line) {
  const lowLine = line.toLocaleLowerCase();
  if (
    lowLine.indexOf("syntaxerror") !== -1
  ) {
    return true;
  }

  return false;
}

function parseJSError (line) {
  return line;
}

postNotification("info", "Build system", "Dev runner started");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

rl.on("line", function (line) {
  console.error(line);
  if (isSassError(line)) {
    postNotification("error", "Error compiling sass", parseSassError(line));
  } else if (isJSError(line)) {
    postNotification("error", "Error compiling JavaScript",
      parseJSError(line));
  } else if (line.toLocaleLowerCase().indexOf("error") !== -1) {
    postNotification("error", "Unknown build error", line);
  }
});
```

Usage (assuming you only care about stderr): `mydevrunner.sh 2>&1 >/dev/null | node [error-watching-script.js]`