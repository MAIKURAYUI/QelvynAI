
"use strict";

const statusElement = document.getElementById("status");
const messagesElement = document.getElementById("messages");
const micButton = document.getElementById("micButton");
const stopButton = document.getElementById("stopButton");
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");

let conversations = [];
let recognition = null;
let isListening = false;

// 会話データを最初に1回だけ読み込む
async function loadConversations() {
  try {
    statusElement.textContent = "会話データを読み込み中...";

    const response = await fetch("./greetings.json");

    if (!response.ok) {
      throw new Error(`greetings.json: HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data.conversations)) {
      throw new Error("conversations 配列がありません");
    }

    conversations = data.conversations;
    statusElement.textContent = "準備完了";
    return true;
  } catch (error) {
    console.error("JSON読み込みエラー:", error);
    statusElement.textContent =
      "会話データを読み込めません。greetings.jsonを確認してください。";
    return false;
  }
}

// 表記の違いをある程度吸収する
function normalizeText(text) {
  return String(text)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[!！?？。、,.，．]/g, "")
    .replace(/\s+/g, "")
    .trim();
}

// メッセージを画面に表示する
function addMessage(label, text) {
  const paragraph = document.createElement("p");
  paragraph.textContent = `${label}：${text}`;
  messagesElement.appendChild(paragraph);
}

// JSONのキーワードから返事を探す
function findReply(userText) {
  const input = normalizeText(userText);

  if (!input) {
    return "何か話しかけてみてね！";
  }

  for (const conversation of conversations) {
    const keywords = Array.isArray(conversation.keywords)
      ? conversation.keywords
      : [];

    const matched = keywords.some((keyword) => {
      const key = normalizeText(keyword);
      return key && input.includes(key);
    });

    if (matched) {
      const responses = Array.isArray(conversation.responses)
        ? conversation.responses
        : [];

      if (responses.length > 0) {
        return responses[
          Math.floor(Math.random() * responses.length)
        ];
      }
    }
  }

  return "ごめんね、まだその言葉はわからないよ。";
}

// AIの返事を音声で読み上げる
function speak(text) {
  if (!("speechSynthesis" in window)) {
    statusElement.textContent =
      "このブラウザは音声読み上げに対応していません。";
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ja-JP";
  utterance.rate = 1;

  window.speechSynthesis.speak(utterance);
}

// 入力された文章に返事をする
function sendMessage(text) {
  const message = text.trim();

  if (!message) return;

  if (conversations.length === 0) {
    statusElement.textContent = "会話データがまだ読み込まれていません。";
    return;
  }

  addMessage("あなた", message);

  const reply = findReply(message);
  addMessage("AI", reply);

  speak(reply);
}

// 文字入力フォーム
chatForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const text = userInput.value;
  userInput.value = "";

  sendMessage(text);
  userInput.focus();
});

// 音声認識の準備
function setupSpeechRecognition() {
  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    micButton.disabled = true;
    statusElement.textContent =
      "音声認識に非対応です。文字入力を利用してください。";
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "ja-JP";
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onstart = () => {
    isListening = true;
    micButton.textContent = "🎤 聞き取り中...";
    statusElement.textContent = "話しかけてね！";
  };

  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript;
    userInput.value = text;
    sendMessage(text);
  };

  recognition.onerror = (event) => {
    console.error("音声認識エラー:", event.error);
    statusElement.textContent =
      `音声認識エラー: ${event.error}`;
  };

  recognition.onend = () => {
    isListening = false;
    micButton.textContent = "🎤 話しかける";
  };
}

// マイクボタン
micButton.addEventListener("click", () => {
  if (!recognition) {
    setupSpeechRecognition();
  }

  if (!recognition) {
    statusElement.textContent =
      "このブラウザでは音声認識を利用できません。";
    return;
  }

  if (isListening) {
    recognition.stop();
  } else {
    try {
      recognition.start();
    } catch (error) {
      console.error("マイク起動エラー:", error);
      statusElement.textContent =
        "マイクを起動できません。少し待って再試行してください。";
    }
  }
});

// 読み上げ停止ボタン
stopButton.addEventListener("click", () => {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
    statusElement.textContent = "読み上げを停止しました。";
  }
});

// 起動
async function init() {
  setupSpeechRecognition();
  await loadConversations();
}

init();
