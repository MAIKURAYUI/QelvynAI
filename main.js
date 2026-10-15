
"use strict";

// ========================================
// QelvynAI - main.js
// JSON会話・文字入力・音声入力・音声読み上げ
// ========================================

const elements = {
  status: document.getElementById("status"),
  messages: document.getElementById("messages"),
  micButton: document.getElementById("micButton"),
  stopButton: document.getElementById("stopButton"),
  chatForm: document.getElementById("chatForm"),
  userInput: document.getElementById("userInput")
};

const DATA_URL = "./greetings.json";

let conversations = [];
let recognition = null;
let isListening = false;

// 画面のステータスを更新
function setStatus(message) {
  if (elements.status) {
    elements.status.textContent = message;
  }
}

// 日本語の表記ゆれ・空白・句読点を整理
function normalizeText(text) {
  return String(text ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\u3000、。，．！？!?「」『』（）()【】［］〈〉《》…・,.]/g, "");
}

// 会話データを読み込む
async function loadConversations() {
  try {
    setStatus("会話データを読み込み中...");

    const response = await fetch(DATA_URL, {
      cache: "no-cache"
    });

    if (!response.ok) {
      throw new Error(
        `greetings.json の読み込みに失敗しました (${response.status})`
      );
    }

    const data = await response.json();

    if (!data || !Array.isArray(data.conversations)) {
      throw new Error("JSONに conversations 配列がありません。");
    }

    conversations = data.conversations.filter(item =>
      item &&
      Array.isArray(item.keywords) &&
      Array.isArray(item.responses) &&
      item.keywords.length > 0 &&
      item.responses.length > 0
    );

    if (conversations.length === 0) {
      throw new Error("有効な会話データがありません。");
    }

    setStatus(`準備完了（${conversations.length}件の会話データ）`);
    return true;
  } catch (error) {
    console.error("会話データの読み込みエラー:", error);
    setStatus("会話データを読み込めませんでした。JSONを確認してください。");
    return false;
  }
}

// 最も長く一致するキーワードを探す
function findReply(userText) {
  const query = normalizeText(userText);

  if (!query) {
    return "何か話しかけてみてね！";
  }

  const matches = [];

  for (const conversation of conversations) {
    conversation.keywords.forEach((keyword, keywordIndex) => {
      const normalizedKeyword = normalizeText(keyword);

      if (normalizedKeyword && query.includes(normalizedKeyword)) {
        matches.push({
          keyword: normalizedKeyword,
          keywordIndex,
          responses: conversation.responses
        });
      }
    });
  }

  // 長いキーワードを優先。同じ長さならJSONの登録順
  matches.sort((a, b) => b.keyword.length - a.keyword.length);

  if (matches.length > 0) {
    const match = matches[0];

    // キーワードの順番と返事の順番を対応させる
    const responseIndex =
      match.keywordIndex % match.responses.length;

    return String(match.responses[responseIndex]);
  }

  return "なるほどね！もう少し詳しく教えてくれる？";
}

// 会話を画面に表示
function addMessage(speaker, text) {
  if (!elements.messages) return;

  const message = document.createElement("p");
  message.className =
    speaker === "あなた" ? "message user-message" : "message ai-message";

  const label = document.createElement("strong");
  label.textContent = `${speaker}：`;

  const content = document.createElement("span");
  content.textContent = text;

  message.append(label, content);
  elements.messages.appendChild(message);

  // 新しいメッセージまでスクロール
  message.scrollIntoView({
    behavior: "smooth",
    block: "nearest"
  });
}

// AIの返事を読み上げる
function speak(text) {
  if (!("speechSynthesis" in window)) {
    setStatus("このブラウザは音声読み上げに対応していません。");
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ja-JP";
  utterance.rate = 1.0;
  utterance.pitch = 1.0;

  utterance.onstart = () => setStatus("QelvynAIが話しています...");
  utterance.onend = () => setStatus("準備完了");
  utterance.onerror = event => {
    console.warn("音声読み上げエラー:", event.error);
    setStatus("音声読み上げを利用できませんでした。");
  };

  window.speechSynthesis.speak(utterance);
}

// ユーザーの入力を処理
function handleUserMessage(text) {
  const message = String(text ?? "").trim();

  if (!message) return;

  addMessage("あなた", message);

  const reply = findReply(message);
  addMessage("QelvynAI", reply);
  speak(reply);
}

// 音声認識を準備
function setupSpeechRecognition() {
  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    if (elements.micButton) {
      elements.micButton.disabled = true;
      elements.micButton.textContent = "🎤 音声入力非対応";
    }
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "ja-JP";
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    isListening = true;
    if (elements.micButton) {
      elements.micButton.textContent = "🎤 聞き取り中...";
    }
    setStatus("話しかけてください...");
  };

  recognition.onresult = event => {
    const transcript = event.results?.[0]?.[0]?.transcript;

    if (transcript) {
      handleUserMessage(transcript);
    }
  };

  recognition.onerror = event => {
    console.warn("音声認識エラー:", event.error);

    if (event.error === "not-allowed") {
      setStatus("マイクの使用を許可してください。");
    } else if (event.error === "no-speech") {
      setStatus("声を聞き取れませんでした。もう一度試してください。");
    } else {
      setStatus(`音声認識エラー: ${event.error}`);
    }
  };

  recognition.onend = () => {
    isListening = false;

    if (elements.micButton) {
      elements.micButton.textContent = "🎤 話しかける";
    }

    if (!window.speechSynthesis?.speaking) {
      setStatus("準備完了");
    }
  };
}

// ボタン・フォームのイベントを登録
function setupEvents() {
  elements.chatForm?.addEventListener("submit", event => {
    event.preventDefault();

    const text = elements.userInput?.value ?? "";
    handleUserMessage(text);

    if (elements.userInput) {
      elements.userInput.value = "";
      elements.userInput.focus();
    }
  });

  elements.micButton?.addEventListener("click", () => {
    if (!recognition) {
      setStatus("このブラウザは音声認識に対応していません。");
      return;
    }

    if (isListening) {
      recognition.stop();
      return;
    }

    try {
      window.speechSynthesis?.cancel();
      recognition.start();
    } catch (error) {
      console.warn("音声認識を開始できません:", error);
      setStatus("音声入力を開始できませんでした。少し待って再試行してください。");
    }
  });

  elements.stopButton?.addEventListener("click", () => {
    window.speechSynthesis?.cancel();

    if (isListening && recognition) {
      recognition.stop();
    }

    setStatus("読み上げを停止しました。");
  });
}

// 起動
async function init() {
  setupEvents();
  setupSpeechRecognition();

  const loaded = await loadConversations();

  if (loaded) {
    addMessage(
      "QelvynAI",
      "こんにちは！私はQelvynAIだよ。気軽に話しかけてね！"
    );
  }
}

init();
