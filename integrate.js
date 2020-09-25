/*
 * Copyright 2020 Jiří Janoušek <janousek.jiri@gmail.com>
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

'use strict';

(function (Nuvola) {
  // Create media player component
  var player = Nuvola.$object(Nuvola.MediaPlayer)

  // Handy aliases
  var PlaybackState = Nuvola.PlaybackState
  var PlayerAction = Nuvola.PlayerAction

  // Create new WebApp prototype
  var WebApp = Nuvola.$WebApp()

  // Initialization routines
  WebApp._onInitWebWorker = function (emitter) {
    Nuvola.WebApp._onInitWebWorker.call(this, emitter)

    var state = document.readyState
    if (state === 'interactive' || state === 'complete') {
      this._onPageReady()
    } else {
      document.addEventListener('DOMContentLoaded', this._onPageReady.bind(this))
    }
  }

  // Page is ready for magic
  WebApp._onPageReady = function () {
    // Connect handler for signal ActionActivated
    Nuvola.actions.connect('ActionActivated', this)

    // Start update routine
    this.update()
  }

  // Extract data from the web page
  WebApp.update = function () {
    var elms = this._getElements()

    var track = {
      title: Nuvola.queryText('#webplayer-region .track-title .track-name'),
      artist: Nuvola.queryText('#webplayer-region .track-title .artist-name', s => s.replace(/\s*-\s*$/, '')),
      album: null,
      artLocation: Nuvola.queryAttribute('#webplayer-region .track-region .artwork img', 'src', (src) => (
        src ? 'https:' + src.replace('?size=62x62', '?size=200x200') : null
      )),
      rating: null,
      length: Nuvola.queryText('#webplayer-region .progress-region .total')
    }

    var state
    if (!track.title && !track.artist) {
      state = PlaybackState.UNKNOWN // advertisement
    } else if (elms.pause) {
      state = PlaybackState.PLAYING
    } else if (elms.play) {
      state = PlaybackState.PAUSED
    } else {
      state = PlaybackState.UNKNOWN
    }

    player.setPlaybackState(state)
    player.setTrack(track)
    player.setTrackPosition(Nuvola.queryText('#webplayer-region .progress-region .time'))

    var volumeMark = elms.volumebar ? elms.volumebar.firstElementChild : null
    if (volumeMark && volumeMark.style.width.includes('%')) {
      player.updateVolume(volumeMark.style.width.replace('%', '') / 100)
    }
    player.setCanChangeVolume(!!elms.volumebar)

    player.setCanGoPrev(false)
    player.setCanGoNext(!!elms.next)
    player.setCanPlay(!!elms.play)
    player.setCanPause(!!elms.pause)

    // Schedule the next update
    setTimeout(this.update.bind(this), 500)
  }

  // Handler of playback actions
  WebApp._onActionActivated = function (emitter, name, param) {
    var elms = this._getElements()
    switch (name) {
      case PlayerAction.TOGGLE_PLAY:
        if (elms.play) {
          Nuvola.clickOnElement(elms.play)
        } else {
          Nuvola.clickOnElement(elms.pause)
        }
        break
      case PlayerAction.PLAY:
        Nuvola.clickOnElement(elms.play)
        break
      case PlayerAction.PAUSE:
      case PlayerAction.STOP:
        Nuvola.clickOnElement(elms.pause)
        break
      case PlayerAction.NEXT_SONG:
        Nuvola.clickOnElement(elms.next)
        break
      case PlayerAction.CHANGE_VOLUME:
        Nuvola.clickOnElement(elms.volumebar, Math.max(0.004, param), 0.5)
        break
    }
  }

  WebApp._getElements = function () {
    // Interesting elements
    var elms = {
      play: document.querySelector('#webplayer-region .controls .play-button a'),
      pause: null,
      next: document.querySelector('.controls .skip-button div.skip-button'),
      volumebar: document.querySelector('#popup-volume .progress-container')
    }

    if (elms.play) {
      if (elms.play.classList.contains('icon-pause')) {
        elms.pause = elms.play
        elms.play = null
      } else if (!elms.play.classList.contains('icon-play')) {
        elms.play = null
      }
    }

    if (elms.next && elms.next.classList.contains('noskip')) {
      elms.next = null
    }

    return elms
  }

  WebApp.start()
})(this) // function(Nuvola)
