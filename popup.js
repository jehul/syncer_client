// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

"use strict";

let startSession = document.getElementById("start-session");
let contentBody = document.getElementById("content-body");
const getVideoId = () =>
  parseInt(window.location.href.match(/^.*\/([0-9]+)\??.*/)[1]);

chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
  chrome.runtime.sendMessage({ type: "NETFLIX_TAB", tab: tabs[0] });
  chrome.tabs.executeScript(tabs[0].id, { file: "contentScript.js" });
});

startSession.onclick = element => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    chrome.runtime.sendMessage({
      type: "SESSION_INIT",
      netflixTab: tabs[0]
    });
  });
};

chrome.runtime.onMessage.addListener(res => {
  console.log(res);
  if (res.type == "POPUP") {
    const url = document.querySelector(".form-control");
    url.value = res.sessionURL;
  }
});
