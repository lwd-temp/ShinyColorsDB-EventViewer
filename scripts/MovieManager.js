class MovieManager {
    constructor() {
        this._container = new PIXI.Container();
        this._loader = PIXI.Loader.shared;
    }

    get stageObj() {
        return this._container;
    }

    reset() {
        this._container.removeChildren(0, this._container.children.length);
    }

    processMovieByInput(movie, onMovieEnded) {
        if (!movie) { return; }

        this._onMovieEnded = onMovieEnded;
        this._playMovie(movie);
    }

    _playMovie(movie) {
        let texture = PIXI.Texture.from(this._loader.resources[`movie${movie}`].data);
        let movieSprite = new PIXI.Sprite(texture);

        this._container.addChild(movieSprite);

        const controller = movieSprite.texture.baseTexture.resource.source;
        controller.addEventListener("ended", () => {
            setTimeout(() => {
                Utilities.fadingEffect(movieSprite, {
                    type: "to", alpha: 0, time: 1000, ease: "easeOutQuart"
                });
            }, 1500);

            setTimeout(() => {
                this._container.removeChild(movieSprite);
                this._onMovieEnded();
            }, 2500);
        });
    }
}
