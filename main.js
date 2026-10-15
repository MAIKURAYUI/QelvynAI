
"use strict";

const statusElement = document.getElementById("status");
const messagesElement = document.getElementById("messages");
const micButton = document.getElementById("micButton");
const stopButton = document.getElementById("stopButton");
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");

let recognition = null;
let isListening = false;

// 画面にメッセージを追加
function addMessage(text, type) {
  const el = document.createElement("div");
  el.className = "message " + type;
  el.textContent = (type === "user" ? "あなた：" : "AI：") + text;
  messagesElement.appendChild(el);
}

// 文字の表記を統一
function normalizeText(text) {
  return String(text)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[!！?？。、,.，．]/g, "")
    .replace(/\s+/g, "")
    .trim();
}

// 会話データを読み込む
async function loadConversations() {
  try {
    const response = await fetch("./greetings.json");

    if (!response.ok) {
      throw new Error("HTTP " + response.status);
    }

    const data = await response.json();

    if (!Array.isArray(data.conversations)) {
      throw new Error("conversations 配列がありません");
    }

    return data.conversations;
  } catch (error) {
    console.error("JSON読み込みエラー:", error);
    statusElement.textContent =
      "会話データを読み込めません。greetings.jsonを確認してください。";
    return [];
  }
}

let conversations = [];

// 返事を探す
function findReply(text) {
  const query = normalizeText(text);

  for (const conversation of conversations) {
    const keywords = Array.isArray(conversation.keywords)
      ? conversation.keywords
      : [];

    if (keywords.some(keyword => {
      const key = normalizeText(keyword);
      return key && query.includes(key);
    })) {
      const responses = Array.isArray(conversation.responses)
        ? conversation.responses
        : [];

      if (responses.length) {
        return responses[Math.floor(Math.random() * responses.length)];
      }
    }
  }

  return "まだその言葉はわからないんだ。別の言い方で聞いてみてね。";
}

// 音声読み上げ
function speak(text) {
  if (!("speechSynthesis" in window)) {
    statusElement.textContent = "音声読み上げに対応していません";
    return;
  }

  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ja-JP";

  utterance.onstart = () => {
    statusElement.textContent = "返答を読み上げ中";
  };

  utterance.onend = () => {
    statusElement.textContent = "準備完了";
  };

  utterance.onerror = () => {
    statusElement.textContent = "読み上げに失敗しました";
  };

  speechSynthesis.speak(utterance);
}

// メッセージ送信
function sendMessage(text) {
  const message = text.trim();

  if (!message) return;

  if (conversations.length === 0) {
    statusElement.textContent =
      "会話データがありません。greetings.jsonを確認してください。";
    return;
  }

  addMessage(message, "user");

  const answer = findReply(message);
  addMessage(answer, "bot");
  speak(answer);
}

// 文字入力
chatForm.addEventListener("submit", event => {
  event.preventDefault();

  sendMessage(userInput.value);
  userInput.value = "";
});

// 読み上げ停止
stopButton.addEventListener("click", () => {
  if ("speechSynthesis" in window) {
    speechSynthesis.cancel();
  }

  statusElement.textContent = "読み上げを停止しました";
});

// 音声認識
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.lang = "ja-JP";
  recognition.continuous = false;
  recognition.interimResults = false;

  micButton.addEventListener("click", () => {
    if (isListening) {
      recognition.stop();
      return;
    }

    try {
      recognition.start();
    } catch (error) {
      console.error("マイク起動エラー:", error);
      statusElement.textContent =
        "マイクを起動できません。少し待って再試行してください。";
    }
  });

  recognition.onstart = () => {
    isListening = true;
    micButton.textContent = "🎤 聞き取り中...";
    statusElement.textContent = "話しかけてね！";
  };

  recognition.onresult = event => {
    const text = event.results[0][0].transcript;
    sendMessage(text);
  };

  recognition.onerror = event => {
    statusElement.textContent = "音声認識エラー: " + event.error;
  };

  recognition.onend = () => {
    isListening = false;
    micButton.textContent = "🎤 話しかける";
  };
} else {
  micButton.disabled = true;
  statusElement.textContent =
    "音声認識に非対応です。文字入力を利用してください。";
}

// 起動
async function init() {
  statusElement.textContent = "会話データを読み込み中...";
  conversations = await loadConversations();

  if (conversations.length > 0) {
    statusElement.textContent = "準備完了";
  }
}

init();
