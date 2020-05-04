const fs = require('fs')

module.exports = (mediaRoot, name) => {
  return new Promise(resolve => {
    fs.unlink(`${mediaRoot}/${name}/index.m3u8`, function(err) {
      if (err) {
        console.log(err.message)
      }
      resolve()
    })
  })
}
