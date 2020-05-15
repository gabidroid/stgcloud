//
//  Created by Mingliang Chen on 18/3/9.
//  illuspas[a]gmail.com
//  Copyright (c) 2018 Nodemedia. All rights reserved.
//
const Logger = require('./node_core_logger');

const EventEmitter = require('events');
const { spawn } = require('child_process');
const dateFormat = require('dateformat');
const mkdirp = require('mkdirp');
const fs = require('fs');
const _ = require('lodash');

class NodeTransSession extends EventEmitter {
  constructor(conf) {
    super();
    this.conf = _.assign({}, conf, {
      timeInMilliseconds
    });
  }

  run() {
    let vc = this.conf.vc || 'copy';
    let ac = this.conf.ac || 'copy';
    let inPath = 'rtmp://127.0.0.1:' + this.conf.rtmpPort + this.conf.streamPath;
    let ouPath = `${this.conf.mediaroot}/${this.conf.streamApp}/${this.conf.streamName}`;
    if (this.conf.ouPath) {
      const compiled = _.template(this.conf.ouPath);
      ouPath = compiled(this.conf);
    }
    let ouPaths;
    if (this.conf.ouPaths) {
      ouPaths = _.map(this.conf.ouPaths, (ouPath) => {
        const compiled = _.template(ouPath);
        return compiled(this.conf);
      });
    }
    let mapStr = '';

    if (this.conf.rtmp && this.conf.rtmpApp) {
      if (this.conf.rtmpApp === this.conf.streamApp) {
        Logger.error('[Transmuxing RTMP] Cannot output to the same app.');
      } else {
        let rtmpOutput = `rtmp://127.0.0.1:${this.conf.rtmpPort}/${this.conf.rtmpApp}/${this.conf.streamName}`;
        mapStr += `[f=flv]${rtmpOutput}|`;
        Logger.log('[Transmuxing RTMP] ' + this.conf.streamPath + ' to ' + rtmpOutput);
      }
    }
    if (this.conf.mp4) {
      this.conf.mp4Flags = this.conf.mp4Flags ? this.conf.mp4Flags : '';
      let mp4FileName = dateFormat('yyyy-mm-dd-HH-MM') + '.mp4';
      let mapMp4 = `${this.conf.mp4Flags}${ouPath}/${mp4FileName}|`;
      mapStr += mapMp4;
      Logger.log('[Transmuxing MP4] ' + this.conf.streamPath + ' to ' + ouPath + '/' + mp4FileName);
    }
    if (this.conf.hls) {
      if (_.isNil(ouPaths) || _.isEmpty(ouPaths)) {
        this.conf.hlsFlags = this.conf.hlsFlags ? this.conf.hlsFlags : '';
        let hlsFileName = 'index.m3u8';
        let mapHls = `${this.conf.hlsFlags}${ouPath}/${hlsFileName}${this.conf.raw ? '' : '|'}`;
        mapStr += mapHls;
        Logger.log('[Transmuxing HLS] ' + this.conf.streamPath + ' to ' + ouPath + '/' + hlsFileName);
      } else {
        Logger.log('[Transmuxing HLS] ' + this.conf.streamPath + ' to ' + JSON.stringify(ouPaths));
      }
    }
    if (this.conf.dash) {
      this.conf.dashFlags = this.conf.dashFlags ? this.conf.dashFlags : '';
      let dashFileName = 'index.mpd';
      let mapDash = `${this.conf.dashFlags}${ouPath}/${dashFileName}`;
      mapStr += mapDash;
      Logger.log('[Transmuxing DASH] ' + this.conf.streamPath + ' to ' + ouPath + '/' + dashFileName);
    }
    if (!_.isNil(ouPaths) && !_.isEmpty(ouPaths)) {
      _.forEach(ouPaths, (ouPath) => {
        mkdirp.sync(ouPath);
      });
    } else {
      mkdirp.sync(ouPath);
    }
    let argv = ['-y', '-fflags', 'nobuffer', '-i', inPath];
    if (this.conf.raw) {
      Array.prototype.push.apply(argv, _.map(this.conf.raw, (item) => {
        const compiled = _.template(item);
        return compiled(this.conf);
      }));
      Array.prototype.push.apply(argv, [mapStr]);
    } else {
      Array.prototype.push.apply(argv, ['-c:v', vc]);
      Array.prototype.push.apply(argv, this.conf.vcParam);
      Array.prototype.push.apply(argv, ['-c:a', ac]);
      Array.prototype.push.apply(argv, this.conf.acParam);
      Array.prototype.push.apply(argv, ['-f', 'tee', '-map', '0:a?', '-map', '0:v?', mapStr]);
    }
    argv = argv.filter((n) => { return n }); //去空
    Logger.ffdebug(`${this.conf.ffmpeg} ${_.join(argv, ' ')}`);
    this.ffmpeg_exec = spawn(this.conf.ffmpeg, argv);
    this.ffmpeg_exec.on('error', (e) => {
      Logger.ffdebug(e);
    });

    this.ffmpeg_exec.stdout.on('data', (data) => {
      Logger.ffdebug(`FF输出：${data}`);
    });

    this.ffmpeg_exec.stderr.on('data', (data) => {
      Logger.ffdebug(`FF输出：${data}`);
    });

    this.ffmpeg_exec.on('close', (code) => {
      Logger.log('[Transmuxing end] ' + this.conf.streamPath);
      this.emit('end');
      if (_.isNil(this.conf.cleanup) || this.conf.cleanup) {
        fs.readdir(ouPath, function (err, files) {
          if (!err) {
            files.forEach((filename) => {
              if (filename.endsWith('.ts')
                || filename.endsWith('.m3u8')
                || filename.endsWith('.mpd')
                || filename.endsWith('.m4s')
                || filename.endsWith('.tmp')) {
                fs.unlinkSync(ouPath + '/' + filename);
              }
            })
          }
        });
      }
    });
  }

  end() {
    // this.ffmpeg_exec.kill();
  }
}

module.exports = NodeTransSession;