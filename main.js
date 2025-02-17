'use strict';

async function init() {
    const font = new FontFaceObserver(usedFont);
    await font.load();

    let eventId = getQueryVariable("eventId", null);
    let eventType = getQueryVariable("eventType", "produce_events");

    let isIframeMode = getQueryVariable("iframeMode", null) === "1";
    let jsonPath;
    if (isIframeMode) {

    }
    else if (eventId) {
        jsonPath = `${eventType}/${eventId}.json`;
    } else {
        jsonPath = prompt("input json path: ", "produce_events/202100711.json");
        eventId = jsonPath.split("/")[1].split(".")[0];
        eventType = jsonPath.split("/")[0];
        window.location.search = `eventType=${eventType}&eventId=${eventId}`;
    }

    // if not iframe mode
    if (!isIframeMode) {
        prepareCanvas(jsonPath);
    }
    // if iframe mode
    else {
        const receiveJson = function (e) {
            if (!e.origin || !e.data?.iframeJson) {
                return;
            }
            prepareCanvas(null, e.data.iframeJson);
        }
        window.addEventListener('message', receiveJson, false);
    }
}

async function prepareCanvas(jsonPath, injectedJson) {
    if (document.getElementById("ShinyColors")) {
        document.getElementById("ShinyColors").remove();
    }

    const interestedEvents = ["click", "touchstart"];
    let app = new PIXI.Application({
        width: 1136,
        height: 640
    });

    app.view.setAttribute("id", "ShinyColors");

    document.body.appendChild(app.view);

    resize(app);
    window.onresize = () => {
        resize(app);
    };

    let tm = new TrackManager(app);
    tm.addToStage();

    if (jsonPath) {
        await new Promise((resolve, reject) => {
            app.loader
                .add("eventJson", `${assetUrl}/json/${jsonPath}`)
                .load(
                    (_, resources) => {
                        if (resources.eventJson.error && !injectedJson) { alert("No such event."); return; }
                        tm.setTrack = resources.eventJson.data;
                        resolve();
                    }
                )
        });

    }
    else {
        tm.setTrack = injectedJson;
    }

    app.loader
        .add("touchToStart", "./assets/touchToStart.png")
        .add("autoOn", "./assets/autoOn.png")
        .add("autoOff", "./assets/autoOff.png")
        .load(
            (_, resources) => {
                window.addEventListener("message", (e) => {
                    if (!e.origin || !e.data?.iframeJson) {
                        return;
                    }
                    tm.endOfEvent();
                    tm = null;
                    app.stage.destroy(true);
                });

                const touchToStart = new PIXI.Sprite(resources.touchToStart.texture);
                const autoOn = new PIXI.Sprite(resources.autoOn.texture),
                    autoOff = new PIXI.Sprite(resources.autoOff.texture);
                app.stage.addChild(touchToStart);
                touchToStart.anchor.set(0.5);
                touchToStart.position.set(568, 500);

                const nextTrack = function () {
                    if (tm.autoplay) { return; }
                    if (tm._timeoutToClear) {
                        clearTimeout(tm._timeoutToClear);
                    }
                    tm._renderTrack();
                };

                const afterTouch = function () {
                    app.stage.interactive = false;
                    app.stage.removeChild(touchToStart);

                    tm.loadAssetsByTrack();

                    autoOn.anchor.set(0.5);
                    autoOff.anchor.set(0.5);

                    interestedEvents.forEach(e => { // autoplay is initialized to false
                        autoOn.on(e, () => {
                            tm.toggleAutoplay();
                            toggleAutoplay(autoOn, autoOff, tm.autoplay, tm, app);
                        });
                        autoOff.on(e, () => {
                            tm.toggleAutoplay();
                            toggleAutoplay(autoOn, autoOff, tm.autoplay, tm, app);
                        });
                    });

                    app.stage.addChild(autoOn);
                    app.stage.addChild(autoOff);
                    autoOn.position.set(1075, 50);
                    autoOff.position.set(1075, 50);
                    autoOn.alpha = 1;
                    autoOff.alpha = 0;
                    autoOn.interactive = true;
                    autoOff.interactive = false;

                    interestedEvents.forEach(e => {
                        app.view.removeEventListener(e, afterTouch);
                    });

                    interestedEvents.forEach(e => {
                        app.stage.on(e, nextTrack);
                    });
                };

                interestedEvents.forEach(e => {
                    app.view.addEventListener(e, afterTouch);
                });
            }
        );
}

function resize(theApp) {
    const height = document.documentElement.clientHeight,
        width = document.documentElement.clientWidth;

    const ratioX = width / 1136,
        ratioY = height / 640;

    let resizedX, resizedY;

    if (ratioX > ratioY) {
        resizedX = 1136 * ratioY;
        resizedY = 640 * ratioY;
    } else {
        resizedX = 1136 * ratioX;
        resizedY = 640 * ratioX;
    }

    theApp.view.style.width = resizedX + 'px';
    theApp.view.style.height = resizedY + 'px';
}

function getQueryVariable(name, defRet = null) {
    const reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i");
    const result = window.location.search.substring(1).match(reg);
    if (result != null) {
        return decodeURI(result[2]);
    } else {
        return defRet;
    }
}

function toggleAutoplay(on, off, status, tm, app) {
    if (status) { // toggle on
        if (!tm._timeoutToClear) {
            tm._renderTrack();
        }

        on.alpha = 1;
        on.interactive = true;
        off.alpha = 0;
        off.interactive = false;

        app.stage.interactive = false;
    }
    else { // toggle off
        if (tm._timeoutToClear) {
            clearTimeout(tm._timeoutToClear);
            tm._timeoutToClear = null;
        }

        on.alpha = 0;
        on.interactive = false;
        off.alpha = 1;
        off.interactive = true;

        app.stage.interactive = true;
    }
}
