"use strict";
// based from https://github.com/ffmpegwasm/ffmpeg.wasm/discussions/580
var ffmpeg = null;
var loadBtn = null;
var lineSpacingValue = null;
var loadProrgess = null;
var loader = null;
var resetBtn = null;
var downloadBtn = null;
var logDiv = null;
var originalImg = null;
var previewImg = null;
var dropArea = null;
var previewArea = null;
var tryMultiThread = true;

var hasFileDropped = false;

var betterWhite = true;

var ffmpegLoaded = false;

var inputFileName = "";

const baseURL = "https://xpncvr.github.io/ffmpeg";

const toBlobURLPatched = async (url, mimeType, patcher) => {
  var resp = await fetch(url);
  var body = await resp.text();
  if (patcher) body = patcher(body);
  var blob = new Blob([body], { type: mimeType });
  return URL.createObjectURL(blob);
};

const toBlobURL = async (url, mimeType) => {
  var resp = await fetch(url);
  var body = await resp.blob();
  var blob = new Blob([body], { type: mimeType });
  return URL.createObjectURL(blob);
};

const fetchFile = async (url) => {
  var resp = await fetch(url);
  var buffer = await resp.arrayBuffer();
  return new Uint8Array(buffer);
};

const load = async () => {
  loadBtn.setAttribute("disabled", true);
  loader.style.display = "inline-block";
  loadProrgess.innerHTML = "Loading progress 0/4";
  const ffmpegBlobURL = await toBlobURLPatched(`${baseURL}/ffmpeg.js`, "text/javascript", (js) => js.replace("new URL(e.p+e.u(814),e.b)", "r.workerLoadURL"));
  await import(ffmpegBlobURL);
  ffmpeg = new FFmpegWASM.FFmpeg();
  ffmpeg.on("log", ({ message }) => {
    if (message == "Aborted()") {
      message = "Finished";
    }
    logDiv.innerHTML = message;
    console.log(message);
  });
  console.log("Hiding loader...");
  loadProrgess.innerHTML = "Loading progress 1/4";
  // check if SharedArrayBuffer is supported via crossOriginIsolated global var
  // https://developer.mozilla.org/en-US/docs/Web/API/crossOriginIsolated
  if (tryMultiThread && window.crossOriginIsolated) {
    await ffmpeg.load({
      workerLoadURL: await toBlobURL(`${baseURL}/814.ffmpeg.js`, "text/javascript"),
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      workerURL: await toBlobURL(`${baseURLCoreMT}/ffmpeg-core.worker.js`, "application/javascript"),
    });
  } else {
    await ffmpeg.load({
      workerLoadURL: await toBlobURL(`${baseURL}/814.ffmpeg.js`, "text/javascript"),
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
    });
  }
  loadProrgess.innerHTML = "Loading progress 4/4";
  loader.style.display = "none";
  console.log("ffmpeg.load success");
  ffmpegLoaded = true;

  fetch("https://xpncvr.github.io/assets/images/discord-bubble-template.png")
    .then((response) => response.arrayBuffer())
    .then((arrayBuffer) => {
      const uint8Array = new Uint8Array(arrayBuffer);

      ffmpeg.writeFile("discord-bubble-template.png", uint8Array);
    })
    .catch((error) => console.error("Error fetching the image file:", error));
};

const escapeFFmpegText = (text) => {
  return text
    .replace(/\\/g, "\\\\") // \ -> \\ //broken
    .replace(/'/g, "\\'") // ' -> \'
    .replace(/:/g, "\\:"); // : -> \:
};

const makeImage = async () => {
  if (!hasFileDropped) return;

  if (!inputFileName) throw new Error("No input image");

  await ffmpeg.exec([
    "-i",
    inputFileName,
    "-i",
    "discord-bubble-template.png",
    "-filter_complex",
    `[1:v][0:v]scale2ref=w=iw:h=ih[overlay][base];` + `[base][overlay]overlay=0:0`,
    "-y",
    "output.png",
  ]);

  const data = await ffmpeg.readFile("output.png");
  previewImg.src = URL.createObjectURL(new Blob([data.buffer], { type: "image/png" }));

  downloadBtn.removeAttribute("disabled");
};

const reset = async () => {
  dropArea.classList.remove("hidden");
  originalImg.classList.add("hidden");
  previewArea.classList.remove("hidden");
  previewImg.classList.add("hidden");
  originalImg.src = "";
  previewImg.src = "";
  downloadBtn.setAttribute("disabled", true);
};

const download = async () => {
  const link = document.createElement("a");
  link.href = previewImg.src;
  link.download = "export.gif";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const handleFileDrop = async (event) => {
  event.preventDefault();
  event.stopPropagation();

  const file = event.dataTransfer.files[0];
  if (!file || !ffmpegLoaded) return;

  const extension = file.name.substring(file.name.lastIndexOf(".") + 1);
  inputFileName = `input.${extension}`;

  dropArea.classList.toggle("hidden");
  originalImg.classList.toggle("hidden");
  previewArea.classList.toggle("hidden");
  previewImg.classList.toggle("hidden");

  originalImg.src = URL.createObjectURL(file);

  try {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    ffmpeg.writeFile(inputFileName, uint8Array);
    hasFileDropped = true;

    makeImage();
  } catch (error) {
    console.error("Error processing file:", error);
  }
};

const handleFileClick = async () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.click();

  input.onchange = async (event) => {
    const file = event.target.files[0];
    if (!file || !ffmpegLoaded) return;

    const extension = file.name.substring(file.name.lastIndexOf(".") + 1);
    inputFileName = `input.${extension}`;

    dropArea.classList.toggle("hidden");
    originalImg.classList.toggle("hidden");
    previewArea.classList.toggle("hidden");
    previewImg.classList.toggle("hidden");

    originalImg.src = URL.createObjectURL(file);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      ffmpeg.writeFile(inputFileName, uint8Array);
      hasFileDropped = true;

      makeImage();
    } catch (error) {
      console.error("Error processing file:", error);
    }
  };
};

function onTextEnter(event) {
  if (event.key === "Enter") {
    makeImage();
    event.preventDefault();
  }
}

addEventListener("load", async (event) => {
  loadBtn = document.querySelector("#load-button");
  loadBtn.addEventListener("click", async () => await load());
  loadBtn.removeAttribute("disabled");

  loadProrgess = document.querySelector("#load-progress");
  loader = document.querySelector("#loader");
  loader.style.display = "none";

  lineSpacingValue = document.querySelector("#line-spacing");

  resetBtn = document.querySelector("#reset-button");
  resetBtn.addEventListener("click", async () => await reset());

  downloadBtn = document.querySelector("#download-button");
  downloadBtn.addEventListener("click", async () => await download());

  logDiv = document.querySelector("#log-div");

  originalImg = document.querySelector("#original-image");
  previewArea = document.querySelector("#preview-area");
  previewImg = document.querySelector("#result-image");

  dropArea = document.querySelector("#drop-area");
  dropArea.addEventListener("dragover", (e) => e.preventDefault());
  dropArea.addEventListener("drop", handleFileDrop);
  dropArea.addEventListener("click", handleFileClick);

  console.log("window loaded");
});
