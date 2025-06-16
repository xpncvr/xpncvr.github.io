"use strict";
// based from https://github.com/ffmpegwasm/ffmpeg.wasm/discussions/580
var ffmpeg = null;
var loadBtn = null;
var betterWhiteBtn = null;
var loadProrgess = null;
var loader = null;
var runBtn = null;
var previewBtn = null;
var resetBtn = null;
var downloadBtn = null;
var inputTxt = null;
var inputSize = null;
var logDiv = null;
var originalImg = null;
var previewImg = null;
var dropArea = null;
var previewArea = null;
var tryMultiThread = true;

var hasFileDropped = false;

var betterWhite = true;

var ffmpegLoaded = false;

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
    runBtn.innerHTML = "Make gif (multi-threaded)";
    await ffmpeg.load({
      workerLoadURL: await toBlobURL(`${baseURL}/814.ffmpeg.js`, "text/javascript"),
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
      workerURL: await toBlobURL(`${baseURLCoreMT}/ffmpeg-core.worker.js`, "application/javascript"),
    });
  } else {
    runBtn.innerHTML = "Make gif (single-threaded)";
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
  runBtn.removeAttribute("disabled");
  previewBtn.removeAttribute("disabled");
  betterWhiteBtn.removeAttribute("disabled");

  fetch("https://xpncvr.github.io/assets/font/DejaVuSans-Bold.ttf")
    .then((response) => response.arrayBuffer())
    .then((arrayBuffer) => {
      const uint8Array = new Uint8Array(arrayBuffer);

      ffmpeg.writeFile("DejaVuSans-Bold.ttf", uint8Array);
    })
    .catch((error) => console.error("Error fetching the font file:", error));
};

const makeGif = async () => {
  if (hasFileDropped) {
    runBtn.setAttribute("disabled", true);
    if (betterWhite) {
      ffmpeg.exec([
        "-i",
        "input.gif",
        "-filter_complex",
        "[0:v]pad=iw:ih+80:0:80:white,drawtext=text='" + inputTxt.value + "':fontfile=DejaVuSans-Bold.ttf:fontcolor=black:fontsize=" + inputSize.value + ":x=(w-text_w)/2:y=25",
        "-f",
        "gif",
        "-pix_fmt",
        "rgb24",
        "output.gif",
      ]);
    } else {
      ffmpeg.exec(["-i", "input.gif", "-vf", "palettegen", "palette.png"]);

      ffmpeg.exec([
        "-i",
        "input.gif",
        "-i",
        "palette.png",
        "-filter_complex",
        "[0:v]pad=iw:ih+80:0:80:white,drawtext=text='" +
          inputTxt.value +
          "':fontfile=DejaVuSans-Bold.ttf:fontcolor=black:fontsize=" +
          inputSize.value +
          ":x=(w-text_w)/2:y=25[padded];[padded][1:v]paletteuse",
        "output.gif",
      ]);
    }

    const data = await ffmpeg.readFile("output.gif");
    previewImg.src = URL.createObjectURL(new Blob([data.buffer], { type: "image/gif" }));
    runBtn.removeAttribute("disabled");
    downloadBtn.removeAttribute("disabled");
    downloadBtn.removeAttribute("disabled");
  }
};

const loadPreview = async () => {
  if (hasFileDropped) {
    await ffmpeg.exec(["-i", "input.gif", "-vf", "select=eq(n\\,0)", "-vframes", "1", "output.png"]);

    if (betterWhite) {
      ffmpeg.exec([
        "-i",
        "output.png",
        "-filter_complex",
        "pad=iw:ih+80:0:80:white,drawtext=text='" + inputTxt.value + "':fontfile=DejaVuSans-Bold.ttf:fontcolor=black:fontsize=" + inputSize.value + ":x=(w-text_w)/2:y=25",
        "output2.png",
      ]);
    } else {
      ffmpeg.exec(["-i", "input.gif", "-vf", "palettegen", "palette.png"]);

      ffmpeg.exec([
        "-i",
        "output.png",
        "-i",
        "palette.png",
        "-filter_complex",
        "pad=iw:ih+80:0:80:white,drawtext=text='" +
          inputTxt.value +
          "':fontfile=DejaVuSans-Bold.ttf:fontcolor=black:fontsize=" +
          inputSize.value +
          ":x=(w-text_w)/2:y=25[padded];[padded][1:v]paletteuse",
        "output2.png",
      ]);
    }

    const data = await ffmpeg.readFile("output2.png");

    previewImg.src = URL.createObjectURL(new Blob([data.buffer], { type: "image/png" }));
  }
};

const reset = async () => {
  dropArea.classList.remove("hidden");
  originalImg.classList.add("hidden");
  previewArea.classList.remove("hidden");
  previewImg.classList.add("hidden");
  originalImg.src = "";
  previewImg.src = "";
  inputSize.value = 35;
  runBtn.setAttribute("disabled", true);
  previewBtn.setAttribute("disabled", true);
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
  if (ffmpegLoaded) {
    if (file.type !== "image/gif") {
      alert("The dropped file type might not be supported.");
      return;
    }

    if (file) {
      dropArea.classList.toggle("hidden");
      originalImg.classList.toggle("hidden");
      previewArea.classList.toggle("hidden");
      previewImg.classList.toggle("hidden");
      originalImg.src = URL.createObjectURL(file);
      runBtn.removeAttribute("disabled");
      previewBtn.removeAttribute("disabled");
      try {
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        ffmpeg.writeFile("input.gif", uint8Array);
        hasFileDropped = true;

        loadPreview();
      } catch (error) {
        console.error("Error processing file:", error);
      }
    }
  }
};

const handleFileClick = async () => {
  if (ffmpegLoaded) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/gif";
    input.click();

    input.onchange = async (event) => {
      const file = event.target.files[0];
      if (file.type !== "image/gif") {
        alert("The selected file type might not be supported.");
        return;
      }

      if (file) {
        dropArea.classList.toggle("hidden");
        originalImg.classList.toggle("hidden");
        previewArea.classList.toggle("hidden");
        previewImg.classList.toggle("hidden");
        originalImg.src = URL.createObjectURL(file);
        runBtn.removeAttribute("disabled");
        previewBtn.removeAttribute("disabled");
        try {
          const arrayBuffer = await file.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);

          ffmpeg.writeFile("input.gif", uint8Array);
          hasFileDropped = true;

          loadPreview();
        } catch (error) {
          console.error("Error processing file:", error);
        }
      }
    };
  }
};

function onTextEnter(event) {
  if (event.key === "Enter") {
    loadPreview();
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

  betterWhiteBtn = document.querySelector("#better-white");
  betterWhiteBtn.addEventListener("click", () => {
    betterWhite = !betterWhite;
  });
  betterWhiteBtn.setAttribute("disabled", true);

  runBtn = document.querySelector("#run-button");
  runBtn.addEventListener("click", async () => await makeGif());
  runBtn.setAttribute("disabled", true);

  previewBtn = document.querySelector("#preview-button");
  previewBtn.addEventListener("click", async () => await loadPreview());
  previewBtn.setAttribute("disabled", true);

  resetBtn = document.querySelector("#reset-button");
  resetBtn.addEventListener("click", async () => await reset());

  downloadBtn = document.querySelector("#download-button");
  downloadBtn.addEventListener("click", async () => await download());
  previewBtn.setAttribute("disabled", true);

  logDiv = document.querySelector("#log-div");

  originalImg = document.querySelector("#original-image");
  previewArea = document.querySelector("#preview-area");
  previewImg = document.querySelector("#result-image");

  inputTxt = document.querySelector("#text-input");
  inputTxt.addEventListener("keydown", onTextEnter);
  inputSize = document.querySelector("#input-size");
  inputSize.addEventListener("keydown", onTextEnter);

  dropArea = document.querySelector("#drop-area");
  dropArea.addEventListener("dragover", (e) => e.preventDefault());
  dropArea.addEventListener("drop", handleFileDrop);
  dropArea.addEventListener("click", handleFileClick);

  console.log("window loaded");
});
