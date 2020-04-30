const fs = require('fs')

const template = name => {
  let line = `#EXTM3U\n#EXT-X-VERSION:3\n`
  line += `#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360\nhls_360p/${name}/index.m3u8\n`
  line += `#EXT-X-STREAM-INF:BANDWIDTH=1400000,RESOLUTION=842x480\nhls_480p/${name}/index.m3u8\n`
  line += `#EXT-X-STREAM-INF:BANDWIDTH=2800000,RESOLUTION=1280x720\nhls_720p/${name}/index.m3u8`
  return line
}

module.exports = (mediaRoot, name) => {
  console.log('create abr playlist');
  return new Promise((resolve, reject) => {
    const playlist = `${mediaRoot}/${name}.m3u8`
      fs.writeFile(playlist, template(name), errWrite => {
        if (errWrite) {
          reject(errWrite.message)
          return
        } else {
          resolve()
        }
      })
  })
}
