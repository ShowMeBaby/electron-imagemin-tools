const electron = require("electron");
const {
  app
} = electron;
const {
  BrowserWindow
} = electron;
const exec = require("child_process").exec;
const fs = require("fs");

let win;

function createWindow() {
  win = new BrowserWindow({
    minWidth: 800,
    minHeight: 600,
    width: 800, //1280,
    height: 600,
    frame: false,
    resizable: true,
    // transparent: true,
    webPreferences: {
      nodeIntegration: true,
    },
  });
  // win.webContents.openDevTools();


  win.loadURL(`file://${__dirname}/www/index.html`);

  win.on("closed", () => {

    win = null;
  });


}


app.on("ready", createWindow);

app.on("window-all-closed", () => {

  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {

  if (win === null) {
    createWindow();
  }
});


var ipc = electron.ipcMain;

ipc.on("close-main-window", function() {
  app.quit();
});

ipc.on("min-main-window", function() {
  win.minimize();
});

/////////////// compress /////////////////////

const mime = [
  // 'image/bmp',
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/svg+xml",
  // 'image/webp'
];

const os = require("os");
const imageminPngquant = require("imagemin-pngquant");
const imageminMozjpeg = require("imagemin-mozjpeg");
// const imageminWebp = require('imagemin-webp');
const imageminGifsicle = require("imagemin-gifsicle");
const imageminSvgo = require("imagemin-svgo");

const imagemin = require("imagemin");

var md5 = require("md5");
var path = require("path");

// 对Date的扩展，将 Date 转化为指定格式的String
// 月(M)、日(d)、小时(h)、分(m)、秒(s)、季度(q) 可以用 1-2 个占位符，
// 年(y)可以用 1-4 个占位符，毫秒(S)只能用 1 个占位符(是 1-3 位的数字)
// 例子：
// (new Date()).Format("yyyy-MM-dd hh:mm:ss.S") ==> 2006-07-02 08:09:04.423
// (new Date()).Format("yyyy-M-d h:m:s.S")      ==> 2006-7-2 8:9:4.18
Date.prototype.format = function(fmt) {
  //author: meizz
  var o = {
    "M+": this.getMonth() + 1, //月份
    "d+": this.getDate(), //日
    "H+": this.getHours(), //小时
    "m+": this.getMinutes(), //分
    "s+": this.getSeconds(), //秒
    "q+": Math.floor((this.getMonth() + 3) / 3), //季度
    S: this.getMilliseconds(), //毫秒
  };
  if (/(y+)/.test(fmt))
    fmt = fmt.replace(
      RegExp.$1,
      (this.getFullYear() + "").substr(4 - RegExp.$1.length)
    );
  for (var k in o)
    if (new RegExp("(" + k + ")").test(fmt))
      fmt = fmt.replace(
        RegExp.$1,
        RegExp.$1.length == 1 ?
        o[k] :
        ("00" + o[k]).substr(("" + o[k]).length)
      );
  return fmt;
};

function basename(path) {
  var name = path.split(/[\\/]/).pop();
  return name.substring(0, name.lastIndexOf("."));
}

function extname(path) {
  return path.split(".").pop();
}

function compFile(event, files, quality) {
  var jpgQ = quality.jpgq; //parseInt(localStorage.getItem('jpg-quality')) || 80;
  var pngQ = quality.pngq / 100; //parseInt(localStorage.getItem('pngQ-quality')) || 80;
  var pngQ_min = quality.pngq_min / 100;
  var webpQ = quality.webq; //parseInt(localStorage.getItem('webpQ-quality')) || 80;

  var now = new Date().format("yyyy-MM-dd-HH_mm_ss");
  var folder = os.homedir() + "/retrocode_io/imagemin/" + now + "/";

  var path = [];
  var result = [];
  for (var i = 0; i < files.length; i++) {
    var type = files[i].type.toLowerCase();
    if (mime.indexOf(type) === -1) continue;

    path.push(files[i].path);
    result.push(files[i]);
  }
  imagemin(path, {
    destination: folder,
    glob: false,
    plugins: [
      // imageminWebp({quality: webpQ}),
      imageminGifsicle({
        optimizationLevel: 3
      }),
      imageminMozjpeg({
        quality: jpgQ
      }),
      imageminPngquant({
        quality: [pngQ_min, pngQ]
      }),
      imageminSvgo(),
    ],
  }).then(
    (output) => {
      console.log(output);
      for (var i = 0; i < result.length; i++) {
        result[i].comp_size = output[i].data.length;
      }
      console.log(result);
      event.reply("rsp-comp-files", result, folder);
      return;
    },
    (error) => {
      console.log(error);
      event.reply("rsp-comp-files-error", error);
    }
  );
}

ipc.on("req-comp-files", (event, arg0, arg1) => {
  compFile(event, arg0, arg1);
});
