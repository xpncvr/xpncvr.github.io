const users = [];
let selectedUser = null;
let mode = null;
let userCount = 0;

const modeSelect = document.querySelector(".mode-select");
const userList = document.querySelector(".user-list");
const createUserForm = document.querySelector(".create-user-form");
const sendMessageForm = document.querySelector(".send-message-form");
const usernamePrompt = document.querySelector(".username-prompt");
const urlInput = document.querySelector(".url-input");
const nameInput = document.querySelector(".name-input");
const messageInput = document.querySelector(".message-input");
const timeInput = document.querySelector(".time-input");

function setMode(selectedMode) {
  mode = selectedMode;
  modeSelect.classList.add("hidden");
  createUserForm.classList.remove("hidden");

  if (mode === "talking") {
    userCount = 0;
    promptNextUser();
  }
}

function promptNextUser() {
  usernamePrompt.textContent = userCount === 0 ? "What is your username?" : "Enter another user's name:";
  usernamePrompt.classList.remove("hidden");
  urlInput.value = "";
  nameInput.value = "";
}

function createUser() {
  const url = urlInput.value;
  const name = nameInput.value;
  if (!url || !name) return;

  const id = Date.now() + userCount;
  users.push({ url, name, id });
  renderUsers();

  if (mode === "talking") {
    userCount++;
    if (userCount === 1) {
      initSelfUser(name, url);
      promptNextUser();
    } else {
      initUser(name, url);
      createUserForm.classList.add("hidden");
      usernamePrompt.classList.add("hidden");
    }
  } else {
    usernamePrompt.classList.add("hidden");
  }

  urlInput.value = "";
  nameInput.value = "";
}

function renderUsers() {
  userList.innerHTML = "";

  const plus = document.createElement("div");
  plus.className = "plus-user";
  plus.textContent = "+";
  plus.onclick = () => {
    selectedUser = null;
    sendMessageForm.classList.add("hidden");
    createUserForm.classList.remove("hidden");
  };
  userList.appendChild(plus);

  users.forEach((user, index) => {
    const div = document.createElement("div");
    div.className = "user";
    div.innerHTML = `<img class="user-avatar" src="${user.url}"><span>${user.name}</span>`;
    div.onclick = () => selectUser(index);
    userList.appendChild(div);
  });
}

function selectUser(index) {
  selectedUser = users[index];
  createUserForm.classList.add("hidden");
  sendMessageForm.classList.remove("hidden");
  setDefaultTime();

  messageInput.focus();
  messageInput.onkeydown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
      messageInput.focus();
    }
  };
}

function sendMessage() {
  if (!selectedUser || !messageInput.value) return;
  // window.opener for popup, window for not
  window.postMessage(
    {
      type: "injectMessage",
      url: selectedUser.url,
      name: selectedUser.name,
      message: messageInput.value,
      id: selectedUser.id,
      time: timeInput.value,
    },
    "*",
  );

  messageInput.value = "";
}

function initUser(name, url) {
  window.postMessage({ type: "initUser", name, url }, "*");
}

function initSelfUser(name, url) {
  window.postMessage({ type: "initSelfUser", name, url }, "*");
}

function removeUser() {
  if (!selectedUser) return;
  const i = users.findIndex((u) => u.id === selectedUser.id);
  if (i > -1) users.splice(i, 1);
  selectedUser = null;
  renderUsers();
  sendMessageForm.classList.add("hidden");
  createUserForm.classList.remove("hidden");
}

function setDefaultTime() {
  const now = new Date();
  timeInput.value = now.getHours().toString().padStart(2, "0") + ":" + now.getMinutes().toString().padStart(2, "0");
}
