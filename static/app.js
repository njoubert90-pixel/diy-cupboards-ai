const messagesEl = document.getElementById("messages");
const inputEl = document.getElementById("msg");
const sendBtn = document.getElementById("send");

function addMessage(who, text) {
  const row = document.createElement("div");
  row.className = `msg ${who}`;
  row.textContent = `${who === "user" ? "You" : "Bot"}: ${text}`;
  messagesEl.appendChild(row);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

async function sendMessage() {
  const text = inputEl.value.trim();
  if (!text) return;

  addMessage("user", text);
  inputEl.value = "";
  inputEl.focus();

  try {
    sendBtn.disabled = true;

    const res = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });

    if (!res.ok) {
      const err = await res.text();
      addMessage("bot", `Error ${res.status}: ${err}`);
      return;
    }

    const data = await res.json();
    addMessage("bot", data.reply ?? JSON.stringify(data));
  } catch (e) {
    addMessage("bot", `Network error: ${e.message}`);
  } finally {
    sendBtn.disabled = false;
  }
}

sendBtn.addEventListener("click", sendMessage);
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});
