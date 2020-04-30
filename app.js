const NodeMediaServer = require('./');
const createPlaylist = require('./create-playlist')
const deletePlaylist = require('./delete-playlist')
const _ = require('lodash');

const config = {
  logType: 4,
  rtmp: {
    port: 1935,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60
  },
  http: {
    port: 8000,
    mediaroot: './media',
    webroot: './www',
    allow_origin: '*',
    api: true
  },
  https: {
    port: 8443,
    key: './privatekey.pem',
    cert: './certificate.pem',
  },
  auth: {
    api: true,
    api_user: 'admin',
    api_pass: 'admin',
    play: false,
    publish: false,
    secret: 'nodemedia2017privatekey'
  },
  relay: {
    ffmpeg: '/usr/local/bin/ffmpeg',
    tasks: [
      {
        app: 'stream',
        mode: 'push',
        edge: 'rtmp://127.0.0.1/hls_360p',
      },
      {
        app: 'stream',
        mode: 'push',
        edge: 'rtmp://127.0.0.1/hls_480p',
      },
      {
        app: 'stream',
        mode: 'push',
        edge: 'rtmp://127.0.0.1/hls_720p',
      },
    ],
  },
  trans: {
    ffmpeg: '/usr/local/bin/ffmpeg',
    tasks: [
      {
        app: 'hls_360p',
        hls: true,
        raw: [
          '-c:v',
          'libx264',
          '-c:a',
          'aac',
          '-ac',
          '1',
          '-strict',
          '-2',
          '-crf',
          '18',
          '-vf',
          'scale=w=640:h=360:force_original_aspect_ratio=decrease',
          '-profile:v',
          'baseline',
          '-b:v',
          '800k',
          '-maxrate',
          '856k',
          '-bufsize',
          '1200k',
          '-b:a',
          '96k',
          '-pix_fmt',
          'yuv420p',
          '-flags',
          '-global_header',
          '-hls_time',
          '4',
          '-hls_list_size',
          '6',
          '-hls_flags',
          'delete_segments',
          '-max_muxing_queue_size',
          '1024',
          '-strftime',
          '1',
          '-hls_segment_filename',
          '${mediaroot}/${streamApp}/${streamName}/%Y%m%d-%s.ts'
        ],
        hlsFlags: '',
      },
      {
        app: 'hls_480p',
        hls: true,
        raw: [
          '-c:v',
          'libx264',
          '-c:a',
          'aac',
          '-ac',
          '1',
          '-strict',
          '-2',
          '-crf',
          '18',
          '-vf',
          'scale=w=842:h=480:force_original_aspect_ratio=decrease',
          '-profile:v',
          'baseline',
          '-b:v',
          '1400k',
          '-maxrate',
          '1498k',
          '-bufsize',
          '2100k',
          '-b:a',
          '128k',
          '-pix_fmt',
          'yuv420p',
          '-flags',
          '-global_header',
          '-hls_time',
          '4',
          '-hls_list_size',
          '6',
          '-hls_flags',
          'delete_segments',
          '-max_muxing_queue_size',
          '1024',
          '-strftime',
          '1',
          '-hls_segment_filename',
          '${mediaroot}/${streamApp}/${streamName}/%Y%m%d-%s.ts'
        ],
        hlsFlags: '',
      },
      {
        app: 'hls_720p',
        hls: true,
        raw: [
          '-c:v',
          'libx264',
          '-c:a',
          'aac',
          '-ac',
          '1',
          '-strict',
          '-2',
          '-crf',
          '18',
          '-vf',
          'scale=w=1280:h=720:force_original_aspect_ratio=decrease',
          '-profile:v',
          'baseline',
          '-b:v',
          '2800k',
          '-maxrate',
          '2996k',
          '-bufsize',
          '4200k',
          '-b:a',
          '128k',
          '-pix_fmt',
          'yuv420p',
          '-flags',
          '-global_header',
          '-hls_time',
          '4',
          '-hls_list_size',
          '6',
          '-hls_flags',
          'delete_segments',
          '-max_muxing_queue_size',
          '1024',
          '-strftime',
          '1',
          '-hls_segment_filename',
          '${mediaroot}/${streamApp}/${streamName}/%Y%m%d-%s.ts'
        ],
        hlsFlags: '',
      },
    ]
  },
};


let nms = new NodeMediaServer(config)
nms.run();

nms.on('preConnect', (id, args) => {
  console.log('[NodeEvent on preConnect]', `id=${id} args=${JSON.stringify(args)}`);
  // let session = nms.getSession(id);
  // session.reject();
});

nms.on('postConnect', (id, args) => {
  console.log('[NodeEvent on postConnect]', `id=${id} args=${JSON.stringify(args)}`);
});

nms.on('doneConnect', (id, args) => {
  console.log('[NodeEvent on doneConnect]', `id=${id} args=${JSON.stringify(args)}`);
});

nms.on('prePublish', (id, StreamPath, args) => {
  console.log('[NodeEvent on prePublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
  // let session = nms.getSession(id);
  // session.reject();
});

nms.on('postPublish', async (id, StreamPath, args) => {
  console.log('[NodeEvent on postPublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
  if (StreamPath.indexOf('hls_') != -1) {
    const name = StreamPath.split('/').pop()
    try {
      await createPlaylist(config.http.mediaroot, name)
    } catch (err) {
      console.log(err);
    }
  }
});

nms.on('donePublish', async (id, StreamPath, args) => {
  console.log('[NodeEvent on donePublish]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
  if (StreamPath.indexOf('hls_') != -1) {
    const name = StreamPath.split('/').pop()
    try {
      await deletePlaylist(config.http.mediaroot, name)
    } catch (err) {
      console.log(err);
    }
  }
});

nms.on('prePlay', (id, StreamPath, args) => {
  console.log('[NodeEvent on prePlay]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
  // let session = nms.getSession(id);
  // session.reject();
});

nms.on('postPlay', (id, StreamPath, args) => {
  console.log('[NodeEvent on postPlay]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
});

nms.on('donePlay', (id, StreamPath, args) => {
  console.log('[NodeEvent on donePlay]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
});

