function saveFile(blob, filename) {
  if (window.navigator.msSaveOrOpenBlob) {
    window.navigator.msSaveOrOpenBlob(blob, filename);
  } else {
    const a = document.createElement("a");
    document.body.appendChild(a);
    const url = window.URL.createObjectURL(blob);
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }, 0);
  }
} // copy paste from a stackoverflow

const response = await fetch(videojs.getAllPlayers()[0]["src"]());
const reader = response.body.getReader();
var length = 0;
var total = +response.headers.get("content-length");
var chunks = [];
while (true) {
  const { done, value } = await reader.read();
  if (done) {
    break;
  }
  chunks.push(value);
  length += value.length;
  console.log(((length / total) * 100).toFixed(2) + "%");
}
var blob = new Blob(chunks);
saveFile(blob, "video.mp4");
