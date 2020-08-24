// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

"use strict";

const type = {
  PLAYBACK: "PLAYBACK",
  INIT: "INIT",
  SESSION_INIT: "SESSION_INIT",
  SESSION_JOIN: "SESSION_JOIN",
  SESSION_ACK: "SESSION_ACK",
  PING: "PING",
  NETFLIX_TAB: "NETFLIX_TAB", //get the netflix tab
  VIDEO: "VIDEO", //video data sent from content script
  POPUP: "POPUP",
  DISCONNECT: "DISCONNECT"
};

class SyncerClient {
  // singleton pattern
  static getInstance() {
    if (!this.instance) {
      this.instance = new SyncerClient();
    }
    return this.instance;
  }
  constructor() {
    console.log("constructing background");
    this.ws = null;
    this.tab = null;
    this.uid = "";
    this.videoId = "";
    this.sessionId = "";
    this.sessionURL = "";
    //this.connect();

    chrome.runtime.onMessage.addListener(
      async (request, sender, sendResponse) => {
        //If we are in a session
        console.log(this.sessionId);
        console.log(request.type);
        //only if websocket is established
        if (this.ws) {
          if (this.sessionId != "" && request.type == type.PLAYBACK) {
            console.log(request.currentTime);
            this.ws.send(
              this.encodeData({
                type: type.PLAYBACK,
                uid: this.uid,
                sessionId: this.sessionId,
                currentTime: request.currentTime,
                paused: request.paused
              })
            );
            sendResponse({ farewell: "socket: packet sent" });

            /*
            if (request.paused == false) {
              this.ws.send(
                this.encodeData({
                  type: type.PLAYBACK,
                  uid: this.uid,
                  sessionId: this.sessionId,
                  currentTime: request.currentTime,
                  paused: false
                })
              );
              sendResponse({ farewell: "socket:packet sent" });
            }
            */
          }

          if (request.type == type.SESSION_INIT) {
            console.log("session initialization");
            console.log(this.videoId);
            this.sendToSocket({
              type: type.SESSION_INIT,
              videoId: this.videoId
            });
            //send session url to contentScript in order
            //to display URL to share
            //sendResponse({ sessionURL: this.sessionURL });
          }
        }
        //simply set videoId and sessionId if it exists
        if (request.type == type.VIDEO) {
          console.log("video request");
          console.log(request.videoId);
          this.videoId = request.videoId;
          this.sessionId = request.sessionId;

          // session id full meaning we are in a session
          if (this.sessionId != "") {
            this.sendToSocket({
              type: type.SESSION_JOIN,
              uid: this.uid,
              sessionId: this.sessionId
            });
          }
          console.log(this.videoId);
        }

        //get netflix tab
        if (request.type == type.NETFLIX_TAB) {
          console.log(request.tab);
          this.connect();
          this.tab = request.tab;

          //listener to destruct when tab closed
          chrome.tabs.onRemoved.addListener((tabid, removed) => {
            if (tabid == this.tab.id) {
              this.disconnect();
            }
          });
        }
      }
    );
  }

  encodeData = data => JSON.stringify(data);
  decodeData = data => JSON.parse(data);

  disconnect = () => {
    this.sendToSocket({ type: type.DISCONNECT, uid: this.uid });
  };

  connect = () => {
    //this.ws = new WebSocket("ws://localhost:8888");
    this.ws = new WebSocket("ws://cryptic-tor-27653.herokuapp.com");
    //ws://cryptic-tor-27653.herokuapp.com/

    // meaningless pinging to keep heroku connection alive
    setInterval(() => {
      if (this.ws) {
        this.ws.send(this.encodeData({ type: type.PING, uid: this.uid }));
      }
    }, 5000);

    this.ws.onclose = event => {
      console.log("WebSocket is closed now.");
      this.ws = null;
      this.tab = null;
      this.uid = "";
      this.videoId = "";
      this.sessionId = "";
      this.sessionURL = "";
    };

    this.ws.onmessage = event => {
      console.log(`socket(received): ${event.data}`);
      this.onReceiveSocket(this.decodeData(event.data));
    };
    /*
    return new Promise((resolve, reject) => {
      console.log(this.isSocketConnected());
      if (!this.isSocketConnected()) {
        console.log("trying to connect");
        this.ws = new WebSocket("ws://localhost:5000");
        this.ws.onmessage = event => {
          var video = document.getElementsByTagName("video")[0];
          console.log(video);
          console.log(event.data);
        };
        this.ws.onopen = () => {
          resolve(null);
        };
      }
      console.log("done");
    });
    */
  };

  sendToSocket = data => {
    data.uid = this.uid;
    this.ws.send(this.encodeData(data));
  };

  // ALL communication we receive from socket handled here
  onReceiveSocket = data => {
    console.log(data);
    if (data.type == type.INIT) {
      this.uid = data.uuid;
      console.log(this.uid);
    }
    if (data.type == type.PLAYBACK) {
      console.log(data);
      chrome.tabs.sendMessage(this.tab.id, data, function(response) {
        console.log(response);
      });
    }
    if (data.type == type.SESSION_ACK) {
      console.log("Received session ack");
      this.sessionId = data.sessionId;
      this.sessionURL = data.sessionURL;
      chrome.runtime.sendMessage({
        type: type.POPUP,
        sessionURL: this.sessionURL
      });
      console.log(`Session URL is: ${this.sessionURL}`);
    }
  };
}

chrome.runtime.onInstalled.addListener(function() {
  chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
    chrome.declarativeContent.onPageChanged.addRules([
      {
        conditions: [
          new chrome.declarativeContent.PageStateMatcher({
            pageUrl: {
              hostEquals: "www.netflix.com",
              pathPrefix: "/watch/",
              schemes: ["http", "https"]
            }
          })
        ],
        actions: [new chrome.declarativeContent.ShowPageAction()]
      }
    ]);
  });
});

window.syncer = SyncerClient.getInstance();

/*

if (!window.hasLoaded) {
  const connection = new WebSocket("ws://localhost:5000");
  const button = document.querySelector("#changeColor");

  window.hasLoaded = true;
}

connection.onopen = event => {
  console.log("websocket is open");
};
connection.onclose = event => {
  console.log("WebSocket is closed now.");
};

connection.onerror = event => {
  console.error("WebSocket error observed:", event);
};

connection.onmessage = event => {
  var video = document.getElementsByTagName("video")[0].play();
  console.log(video);
  console.log(event.data);
};

document.querySelector("#changeColor").addEventListener("click", () => {
  const data = `<p>Im the client</p>`;

  // Send composed message to the server
  connection.send(data);
});

*/
