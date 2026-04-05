import { describe, expect, it } from "vitest";
import { invokeLLM } from "./_core/llm";

describe("OpenAI API Integration", () => {
  it("should successfully call OpenAI GPT API with a simple prompt", async () => {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant. Respond in Korean.",
        },
        {
          role: "user",
          content: "Say 'Hello' in one word.",
        },
      ],
    });

    expect(response).toBeDefined();
    expect(response.choices).toBeDefined();
    expect(response.choices.length).toBeGreaterThan(0);
    expect(response.choices[0]?.message).toBeDefined();
    expect(response.choices[0]?.message.content).toBeDefined();
    expect(typeof response.choices[0]?.message.content).toBe("string");
  }, 10000);

  it("should handle Korean language responses", async () => {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant specializing in Korean audiobook recommendations. Respond in Korean with simple, kind language suitable for seniors.",
        },
        {
          role: "user",
          content: "좋은 오디오북을 추천해주세요.",
        },
      ],
    });

    expect(response).toBeDefined();
    expect(response.choices[0]?.message.content).toBeDefined();
    const content = response.choices[0]?.message.content;
    expect(typeof content).toBe("string");
    expect(content.length).toBeGreaterThan(0);
  }, 15000);
});
