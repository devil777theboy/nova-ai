module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "Gemini API key is missing"
      });
    }

    const { message, history = [] } = req.body || {};

    if (
      typeof message !== "string" ||
      !message.trim() ||
      message.length > 10000
    ) {
      return res.status(400).json({
        error: "Please enter a valid message"
      });
    }

    const contents = [];

    if (Array.isArray(history)) {
      history.slice(-10).forEach((item) => {
        if (
          item &&
          ["user", "model"].includes(item.role) &&
          typeof item.text === "string"
        ) {
          contents.push({
            role: item.role,
            parts: [{ text: item.text.slice(0, 5000) }]
          });
        }
      });
    }

    contents.push({
      role: "user",
      parts: [{ text: message.trim() }]
    });

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({ contents })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", data);
      return res.status(response.status).json({
        error: "Gemini could not process your request. Please try again."
      });
    }

    const reply = data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim();

    if (!reply) {
      return res.status(502).json({
        error: "No reply received from Gemini"
      });
    }

    return res.status(200).json({ reply });

  } catch (error) {
    console.error("Chat error:", error);

    return res.status(500).json({
      error: "Server connection error"
    });
  }
};
