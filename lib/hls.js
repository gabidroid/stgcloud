
const _ = require('lodash');
const chokidar = require('chokidar');
const { join } = require('path');
const fs = require('./fs');
const s3 = require('./s3');
const m3u8 = require('./m3u8');

const VOD_APP_NAME = '720p';

// ABR - media/test4/index.m3u8
const handleMasterPlaylist = async path => {
  const params = {
    Body: await fs.readFile(join(process.env.MEDIA_ROOT, path)),
    Bucket: process.env.ASSETS_BUCKET,
    Key: path,
    ContentType: 'application/x-mpegURL',
    CacheControl: 'max-age=3600'
  };
  await s3.putObject(params);

  // TODO 
  // Put /vod.m3u8 with vod.m3u8 playlists.
};

// HLS - test4/720p/index.m3u8
const handlePlaylist = async path => {
  console.log('handlePlaylist', path);
  if (await fs.exists(join(process.env.MEDIA_ROOT, path))) {
    const liveM3u8 = await fs.readFile(join(process.env.MEDIA_ROOT, path));
    const params = {
      Body: liveM3u8,
      Bucket: process.env.ASSETS_BUCKET,
      Key: path,
      ContentType: 'application/x-mpegURL',
      CacheControl: 'max-age=0'
    };
    await s3.putObject(params);

    // TODO 
    // Put /vod.m3u8 with all segments and end tag.
    const paths = _.split(path, '/');
    const streamName = _.nth(paths, 0);
    const appName = _.nth(paths, 1);
    if (_.isEqual(appName, VOD_APP_NAME)) {
      let vodM3u8;
      const vodPath = join(process.env.MEDIA_ROOT, streamName, 'vod.m3u8');
      if (await fs.exists(vodPath)) {
        vodM3u8 = await fs.readFile(vodPath);
      }
      vodM3u8 = m3u8.sync_m3u8(liveM3u8, vodM3u8, appName);
      await fs.writeFile(vodPath, vodM3u8);
      const params = {
        Body: vodM3u8,
        Bucket: process.env.ASSETS_BUCKET,
        Key: `${streamName}/vod.m3u8`,
        ContentType: 'application/x-mpegURL',
        CacheControl: 'max-age=0'
      };
      await s3.putObject(params);
    }
  }
};

// TS  - media/test4/720p/20200504-1588591755.ts
const handleSegment = async path => {
  // TODO Check if valid before uploading.
  // ffprobe -v error -i /Users/findleyr/Documents/code/live-streaming-server/mnt/hls/2a9dafff-2676-7090-8625-b7916a001969_hd/21.ts
  const params = {
    Body: fs.createReadStream(join(process.env.MEDIA_ROOT, path)),
    Bucket: process.env.ASSETS_BUCKET,
    Key: path,
    ContentType: 'video/MP2T',
    CacheControl: 'max-age=31536000'
  };
  await s3.putObject(params);
  await handlePlaylist(_.join(_.union(_.initial(_.split(path, '/')), ['index.m3u8']), '/'));
};

// ABR - media/test4/live.m3u8
// HLS - media/test4/720p/index.m3u8
// TS  - media/test4/720p/20200504-1588591755.ts
// [360p, 480p, 720p]

const onFile = async (absolutePath, type) => {
  try {
    const path = _.trim(_.replace(absolutePath, process.env.MEDIA_ROOT, ''), '/');
    console.log(`File ${path} has been added`);
    if (_.endsWith(path, '.m3u8')) {
      if (_.size(_.split(path, '/')) === 2) {
        await handleMasterPlaylist(path);
      }
    } else if (_.endsWith(path, '.ts')) {
      await handleSegment(path);
    }
  } catch (err) {
    console.log(err);
  }
};

module.exports = () => {
  console.log(`Start watcher - ${process.env.NODE_ENV}, ${process.env.MEDIA_ROOT}`);
  chokidar.watch(process.env.MEDIA_ROOT, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 100
    }
  }).on('add', (path) => onFile(path, 'add')).on('change', (path) => onFile(path, 'change'));
};
