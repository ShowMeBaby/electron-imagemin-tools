'use strict';

const version = "2.1";
const domain = ''; //'http://localhost'; no need

const electron = require('electron');

var ipc = electron.ipcRenderer;

function getFileSize(bytes) {
  var exp = Math.floor(Math.log(bytes) / Math.log(1024)) | 0;
  var result = (bytes / Math.pow(1024, exp)).toFixed(2);

  return result + ' ' + (exp == 0 ? 'bytes' : 'KMGTPEZY' [exp - 1] + 'B');
}


function basename(path) {
  var name = path.split(/[\\/]/).pop();
  return name.substring(0, name.lastIndexOf('.'));
}

function extname(path) {
  return path.split('.').pop();
}

function toast(message, timeout = 3000) {
  var options = {
    timeout: timeout,
    position: 'bottom'
  };
  mdui.snackbar(message, options)
}

function drop_handler(ev) {
  ev.preventDefault();
  // If dropped items aren't files, reject them
  var dt = ev.dataTransfer;
  var files = new Array();
  if (dt.items) {
    // Use DataTransferItemList interface to access the file(s)
    for (var i = 0; i < dt.items.length; i++) {
      if (dt.items[i].kind == "file") {
        var f = dt.items[i].getAsFile();
        // console.log("... file[" + i + "].name = " + f.name);
        files.push(f);
      }
    }
  } else {
    // Use DataTransfer interface to access the file(s)
    // for (var i=0; i < dt.files.length; i++) {
    //   console.log("... file[" + i + "].name = " + dt.files[i].name);
    // }
    files = dt.files;
  }
  console.log(files);

  // requestToken(dt.files);
  compFile(files, null);
}

function dragover_handler(ev) {
  // console.log("dragOver");
  // Prevent default select and drag behavior
  ev.preventDefault();

}

function dragend_handler(ev) {
  // console.log("dragEnd");
  // Remove all of the drag data
  var dt = ev.dataTransfer;
  if (dt.items) {
    // Use DataTransferItemList interface to remove the drag data
    for (var i = 0; i < dt.items.length; i++) {
      dt.items.remove(i);
    }
  } else {
    // Use DataTransfer interface to remove the drag data
    ev.dataTransfer.clearData();
  }
}


function validateFile(files) {
  if (!files)
    return false;

  // 检查文件(基本名)是否相同
  for (var i = 0; i < files.length; i++) {
    var base1 = basename(files[i].name);
    for (var j = i + 1; j < files.length; j++) {
      var base2 = basename(files[j].name);
      if (base1 === base2) {
        toast("文件基本名不能相同");
        return false;
      }
    }
  }

  return true;
}


// https://stackoverflow.com/questions/24139216/js-input-file-to-json-with-for-example-json-stringify
function getFilesInfo(files) {
  var myArray = [];
  var file = {};

  console.log(files); // see the FileList

  // manually create a new file obj for each File in the FileList
  for (var i = 0; i < files.length; i++) {

    file = {
      'lastModified': files[i].lastModified,
      'lastModifiedDate': files[i].lastModifiedDate,
      'path': files[i].path,
      'name': files[i].name,
      'size': files[i].size,
      'type': files[i].type,
    }

    //add the file obj to your array
    myArray.push(file)
  }

  return myArray;
}

function startWorker(files) {

  var fileInfo = getFilesInfo(files);

  // load quality setting
  var jpgQ = parseInt(localStorage.getItem('jpg-quality')) || 80;
  var pngQ = parseInt(localStorage.getItem('pngQ-quality')) || 80;
  var webpQ = parseInt(localStorage.getItem('webpQ-quality')) || 80;

  jpgQ = Math.max(1, Math.min(100, jpgQ));
  pngQ = Math.max(21, Math.min(100, pngQ));
  var pngQ_min = pngQ - 20;

  webpQ = Math.max(1, Math.min(100, webpQ));

  var quality = {
    'jpgq': jpgQ,
    'pngq': pngQ,
    'pngq_min': pngQ_min,
    'webpq': webpQ,
  };

  ipc.send('req-comp-files', fileInfo, quality);
}

ipc.on('rsp-comp-files', (event, arg0, arg1) => {
  console.log(arg0)

  var result = arg0;
  $("#filelist").empty();
  for (var i = 0; i < result.length; i++) {

    var percent = Math.floor((result[i].comp_size - result[i].size) * 100 / result[i].size) + "%";
    var item = "<tr><td>" + result[i].name + "</td><td>" + getFileSize(result[i].size) + "</td><td>" + getFileSize(
      result[i].comp_size) + "</td><td>" + percent + "</td></tr>";
    $("#filelist").append(item);
  }

  var folder = arg1;
  if (result.length > 0)
    $("#explore").data("folder", folder);
  else
    $("#explore").data("folder", "");

  $("#summary").text("共成功压缩 " + result.length + " 个文件");

  $("#progress").addClass("hide");
  $("#result").removeClass("hide");

});

ipc.on('rsp-comp-files-error', (event, error) => {
  toast("出错了，可能是系统资源不足");
});

function compFile(files, response) {
  if (!response)
    response = [];

  if (false === validateFile(files)) {
    return;
  }

  $("#result").addClass("hide");
  $("#progress").removeClass("hide");

  startWorker(files);
  return;
}

function onQualityChange() {
  var jpgQ = $('input[name=jpg]').val();
  var pngQ = $('input[name=png]').val();
  var webpQ = $('input[name=webp]').val();

  $("#jpg-val").text(jpgQ);
  $("#png-val").text(pngQ);
  $("#webp-val").text(webpQ);

  localStorage.setItem('jpg-quality', jpgQ);
  localStorage.setItem('pngQ-quality', pngQ);
  localStorage.setItem('webpQ-quality', webpQ);
}

function loadSetting() {
  var jpgQ = parseInt(localStorage.getItem('jpg-quality')) || 80;
  var pngQ = parseInt(localStorage.getItem('pngQ-quality')) || 80;
  var webpQ = parseInt(localStorage.getItem('webpQ-quality')) || 80;

  jpgQ = Math.max(1, Math.min(100, jpgQ));
  pngQ = Math.max(1, Math.min(100, pngQ));
  webpQ = Math.max(1, Math.min(100, webpQ));

  // show setting

  $('input[name=jpg]').val(jpgQ);
  $('input[name=png]').val(pngQ);
  $('input[name=webp]').val(webpQ);

  $("#jpg-val").text(jpgQ);
  $("#png-val").text(pngQ);
  $("#webp-val").text(webpQ);
  mdui.updateSliders();
}

function init() {
  // reqAppver();

  // var token = localStorage.getItem('access-token');
  // if(token === null) {
  //     $("#login-modal").modal();
  //     return;
  // }
}

$(document).ready(function() {

  $("#btn-close").click(function() {
    ipc.send('close-main-window');
  });

  $("#btn-min").click(function() {
    ipc.send('min-main-window');
  });

  $("#drop-upload-files").click(function() {
    $("#input-upload-files").val(null);
    $("#input-upload-files").click();
    return false;
  });

  $("#input-upload-files").change(function() {
    var files = $('#input-upload-files')[0].files;
    compFile(files, null);
    return false;
  });

  $("#explore").click(function() {
    var folder = $(this).data("folder");
    if (folder !== "")
      electron.shell.openPath(folder);
    return false;
  });

  $("#setting").click(function() {
    loadSetting();
    var tab = new mdui.Tab('#example4-tab');
    document.getElementById('setting-modal1').addEventListener('open.mdui.dialog', function() {
      tab.handleUpdate();
    });
    var inst = new mdui.Dialog('#setting-modal1', {});
    inst.open();
    return false;
  });

  $('input[name=jpg]').on("input change", function() {
    onQualityChange();
  });
  $('input[name=png]').on("input change", function() {
    onQualityChange();
  });
  $('input[name=webp]').on("input change", function() {
    onQualityChange();
  });

  $(document).on('click', 'a[href^="http"]', function(event) {
    event.preventDefault();
    electron.shell.openExternal(this.href);
  });

  init();
});
