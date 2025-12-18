//let popup = window.open("popup.html", "UserPopup", "width=400,height=500");
window.addEventListener("message", (event) => {
  if (event.origin !== window.location.origin) return;

  const data = event.data;
  if (data.type === "injectMessage") {
    injectMessage(data.url, data.name, data.message, data.id, data.time);
  } else if (data.type === "initUser") {
    initUser(data.name, data.url);
  } else if (data.type === "initSelfUser") {
    initSelfUser(data.name, data.url, -1);
  }
});

let lastId = 0;

function injectMessage(url, name, message, id, time) {
  let target = document.querySelector(".scrollerInner__36d07");
  if (!target) {
    alert("Something went wrong target element not found.");
    return;
  }
  let html = "";
  if (id == lastId) {
    html = `
            <li>
                <div class="cozyMessage__5126c wrapper_c19a55 cozy_c19a55 zalgo_c19a55">
                  <div class="contents_c19a55">
                      <div class="markup__75297"><span>${escapeHtml(message)}</span></div>
                  </div>
                </div>
            </li>
            `;
  } else {
    html = `
            <li class="messageListItem__5126c">
                <div class="message__5126c cozyMessage__5126c groupStart__5126c wrapper_c19a55 cozy_c19a55 zalgo_c19a55">
                  <div class="contents_c19a55">
                      <img class="avatar_c19a55 clickable_c19a55" src="${escapeHtml(url)}">
                      <h3 class="header_c19a55"><span class="headerText_c19a55"><span class="username_c19a55 desaturateUserColors__41f68 clickable_c19a55">${escapeHtml(name)}</span></span><span class="timestamp_c19a55 timestampInline_c19a55"><i class="separator_c19a55"> — </i>${time}</span></h3>
                      <div class="markup__75297 messageContent_c19a55"><span>${escapeHtml(message)}</span></div>
                  </div>
                </div>
            </li>
          `;
  }

  let temp = document.createElement("div");
  temp.innerHTML = html;
  target.appendChild(temp.firstElementChild);
  lastId = id;
  let spacer = target.querySelector(".scrollerSpacer__36d07");
  if (spacer) {
    target.appendChild(spacer);
  } else {
    alert("Spacer element not found");
  }
}

let textAreaHolder = null;
let myName = "";
let myAvatarUrl = "";
let myId = "";

function initUser(name, avatarURL) {
  textAreaHolder.textContent = "Message @" + name;
  let topName = document.getElementById("titleTopUsername");
  topName.textContent = name;
  let avatarImage = document.querySelector(".avatar__44b0c");
  avatarImage.src = avatarURL;
}

function initSelfUser(name, avatarURL, id) {
  myName = name;
  myAvatarUrl = avatarURL;
  myId = id;
  textAreaHolder = document.querySelector(".placeholder__1b31f");
  const editableDiv = document.getElementById("editableTextArea");

  editableDiv.addEventListener("keydown", (event) => {
    if (editableDiv.innerHTML == "") {
      textAreaHolder.style.display = "block";
    } else {
      textAreaHolder.style.display = "none";
    }
    if (event.key === "Enter") {
      //todo: handle backspace blank
      if (textAreaHolder.style.display == "none") {
        textAreaHolder.style.display = "block";
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, "0");
        const minutes = now.getMinutes().toString().padStart(2, "0");
        injectMessage(myAvatarUrl, myName, editableDiv.textContent, myId, `${hours}:${minutes}`);
        editableDiv.textContent = "";
      }
      event.preventDefault();
    }
  });
}

function escapeHtml(unsafe) {
  return String(unsafe).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
