var video = document.getElementsByTagName("video")[0];
console.log(video);

var extensionLoaded = false;

//execute only once per page

if (extensionLoaded == false) {
  extensionLoaded = true;

  const injectSeek = time => {
    var th = document.getElementById("appMountPoint");
    var s = document.createElement("script");
    s.id = "tempscript";
    const scriptContent = `
    window.videoPlayer = netflix.appContext.state.playerApp.getAPI()
      .videoPlayer;
    window.player = window.videoPlayer.getVideoPlayerBySessionId(
      videoPlayer.getAllPlayerSessionIds()[0]
    );
    window.player.seek(${time})`;
    s.setAttribute("type", "text/javascript");
    s.appendChild(document.createTextNode(scriptContent));
    th.appendChild(s);
    document.getElementById("tempscript").remove();
  };

  class Controller {
    constructor() {
      this.enabled = false;
      this.paused = video.paused;
      this.videoId = "";
      this.sessionId = "";
      this.enable();
      this.listenToBackground();
    }

    enable = () => {
      if (this.enabled) return;
      console.log(this.getVideoId());

      this.videoId = this.getVideoId();
      this.sessionId = this.getSessionId();
      console.log(this.videoId);

      chrome.runtime.sendMessage({
        type: "VIDEO",
        videoId: this.videoId,
        sessionId: this.sessionId
      });

      const observer = new MutationObserver((mutations, observer) => {
        if (video.paused != this.paused) {
          console.log("video has been paused or played");
          console.log(video.currentTime);
          chrome.runtime.sendMessage(
            {
              type: "PLAYBACK",
              paused: video.paused,
              currentTime: video.currentTime * 1000
            },
            response => {
              console.log(response.farewell);
            }
          );
          this.paused = video.paused;
        }
      });

      observer.observe(document.querySelector("#appMountPoint"), {
        childList: true,
        subtree: true
      });

      //prevent multiple instances of observer
      this.enabled = true;
    };

    listenToBackground = () => {
      chrome.runtime.onMessage.addListener(
        async (request, sender, sendResponse) => {
          console.log(request);
          if (request.paused == true) {
            video.pause();
            //injectSeek(request.currentTime);

            sendResponse({ farewell: "goodbye" });
          }
          if (request.paused == false) {
            video.play();
            //injectSeek(request.currentTime);

            sendResponse({ farewell: "goodbye" });
          }

          return true;
        }
      );
    };

    getSessionId = () => {
      const queryString = window.location.search;
      const urlParams = new URLSearchParams(queryString);
      const sessionId = urlParams.get("sessionId");
      return sessionId ? sessionId : "";
    };
    getVideoId = () =>
      parseInt(window.location.href.match(/^.*\/([0-9]+)\??.*/)[1]);
  }

  const controller = new Controller();
}
