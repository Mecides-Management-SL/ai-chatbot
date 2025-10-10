import { gateway } from "@ai-sdk/gateway";
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";
import { isTestEnvironment } from "../constants";

export const myProvider = isTestEnvironment
  ? (() => {
      const {
        artifactModel,
        chatModel,
        reasoningModel,
        titleModel,
      } = require("./models.mock");
      return customProvider({
        languageModels: {
          "chat-model": chatModel,
          "chat-model-reasoning": reasoningModel,
          "title-model": titleModel,
          "artifact-model": artifactModel,
        },
      });
    })()
  : customProvider({
      languageModels: {
        // "chat-model": gateway.languageModel("anthropic/claude-3-5-sonnet"),
        // "chat-model-reasoning": wrapLanguageModel({
        //   model: gateway.languageModel("anthropic/claude-3-5-sonnet"),
        //   middleware: extractReasoningMiddleware({ tagName: "think" }),
        // }),
        // "title-model": gateway.languageModel("anthropic/claude-3-5-sonnet"),
        // // "artifact-model": gateway.languageModel("anthropic/claude-3-5-sonnet"),
        // "chat-model": gateway.languageModel("openai/gpt-5"),
        // "chat-model-reasoning": wrapLanguageModel({
        //   model: gateway.languageModel("openai/gpt-5"),
        //   middleware: extractReasoningMiddleware({ tagName: "think" }),
        // }),
        // "title-model": gateway.languageModel("openai/gpt-5"),
        "artifact-model": wrapLanguageModel({
          model: gateway.languageModel("openai/gpt-5"),
          middleware: extractReasoningMiddleware({ tagName: "think" }),
        }),
      },
    });
