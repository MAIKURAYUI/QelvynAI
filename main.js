
async function loadConversations() {
  try {
    const response = await fetch("./greetings.json");

    if (!response.ok) {
      throw new Error("greetings.jsonを読み込めませんでした");
    }

    const data = await response.json();

    console.log("会話データを読み込みました！", data);

    return data.conversations;
  } catch (error) {
    console.error("読み込みエラー:", error);
    return [];
  }
}

function normalizeText(text) {
  return text
    .normalize("NFKC")
    .replace(/[!！?？。、,.]/g, "")
    .replace(/\s+/g, "")
    .trim();
}

async function replyToUser(userText) {
  const conversations = await loadConversations();
  const normalizedInput = normalizeText(userText);

  for (const conversation of conversations) {
    const matched = conversation.keywords.some(keyword =>
      normalizedInput.includes(normalizeText(keyword))
    );

    if (matched) {
      const responses = conversation.responses;
      return responses[Math.floor(Math.random() * responses.length)];
    }
  }

  return "ごめんね、まだその言葉はわからないよ。";
}

// 動作テスト
replyToUser("こんにちは！！！").then(reply => {
  console.log("AI:", reply);
});
