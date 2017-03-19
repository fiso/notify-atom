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

The package starts an http server, listening on port 8090 (port number currently not configurable, sorry) on your machine. This server will react to POST requests that contain the `type` and `message` parameters, where `type` is one of `success, info, warning, error, fatalerror` and message can be any string.

Here's an example CURL command line you use, to verify that it's working:
```bash
curl --data "type=info&message=Script is running..." http://localhost:8090
```

Then use any way of making an http POST request in your scripts, to make them talk back to you when they need to.

Here's a longer example of a Node.js script you can pipe your stderr to:

```javascript
const querystring = require("querystring");
const http = require("http");
const fs = require("fs");
const readline = require("readline");
function postNotification (type, message) {
  const postData = querystring.stringify({
    type, message,
  });

  const postOptions = {
    host: "localhost",
    port: "8090",
    path: "/",
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": Buffer.byteLength(postData),
    },
  };

  const request = http.request(postOptions, function (result) {
    result.setEncoding("utf8");
    result.on("data", function (chunk) {
      console.log("Response: " + chunk);
    });
  });

  request.write(postData);
  request.end();
}

postNotification("info", "Dev runner started");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

rl.on("line", function (line) {
  // Here, you'll want to have some smarter detection of whether the line is
  // actually an error or not, plus format the error message nicely.
  if (line.toLocaleLowerCase().indexOf("error") !== -1) {
    console.log(line);
    postNotification("error", line);
  }
});
```

Usage (assuming you only care about stderr): `mydevrunner.sh 2>&1 >/dev/null | node [error-watching-script.js]`
