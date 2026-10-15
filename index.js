
const chat = document.querySelector("#chat");
const status = document.querySelector("#status");
const mic = document.querySelector("#mic");
const stop = document.querySelector("#stop");
const form = document.querySelector("#form");
const input = document.querySelector("#input");

function addMessage(text, type) {
  const el = document.createElement("div");
  el.className = "message " + type;
  el.textContent = text;
  chat.appendChild(el);
  chat.scrollTop = chat.scrollHeight;
}

function reply(text) {
  const q = text.toLowerCase();
  let answer;

  if (/こんにちは|こんばんは|おはよう/.test(q)) {
    answer = "こんにちは！今日はどんなことを話そうか？";
  } else if (/名前/.test(q)) {
    answer = "私は Mini Voice AI だよ！";
  } else if (/元気/.test(q)) {
    answer = "元気だよ！あなたはどう？";
  } else if (/ありがとう/.test(q)) {
    answer = "どういたしまして！";
  } else if (/何ができる|できること/.test(q)) {
    answer = "あいさつや簡単な質問に答えられるよ。";
  } else if (/さようなら|バイバイ/.test(q)) {
    answer = "また話そうね！";
  } else {
    answer = "まだその質問には答えられないんだ。別の言い方で聞いてみてね。";
  }

  addMessage(answer, "bot");
  speak(answer);
}

function speak(text) {
  if (!("speechSynthesis" in window)) {
    status.textContent = "音声合成に対応していません";
    return;
  }

  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ja-JP";
  utterance.onstart = () => status.textContent = "返答を読み上げ中";
  utterance.onend = () => status.textContent = "準備完了";
  speechSynthesis.speak(utterance);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  addMessage(text, "user");
  input.value = "";
  reply(text);
});

stop.addEventListener("click", () => {
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  status.textContent = "読み上げを停止しました";
});

const Recognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

if (Recognition) {
  const recognition = new Recognition();
  recognition.lang = "ja-JP";
  recognition.continuous = false;
  recognition.interimResults = false;

  mic.addEventListener("click", () => {
    try {
      status.textContent = "聞き取り中...";
      recognition.start();
    } catch {
      status.textContent = "少し待ってから、もう一度押してください";
    }
  });

  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript;
    addMessage(text, "user");
    reply(text);
  };

  recognition.onerror = (event) => {
    status.textContent = "音声認識エラー: " + event.error;
  };

  recognition.onend = () => {
    if (status.textContent === "聞き取り中...") {
      status.textContent = "準備完了";
    }
  };
} else {
  mic.disabled = true;
  status.textContent =
    "このブラウザでは音声認識を利用できません。文字入力を試してください。";
}
