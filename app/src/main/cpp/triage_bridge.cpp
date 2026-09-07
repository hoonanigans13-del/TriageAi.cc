#include <jni.h>
#include <string>
#include <android/log.h>
#include "llama.h"

#define LOG_TAG "TriageAI"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

static llama_context *g_ctx = nullptr;

extern "C"
JNIEXPORT jboolean JNICALL
Java_com_triage_ai_llm_LlamaEngine_initModel(
        JNIEnv *env,
        jobject /* this */,
        jstring jModelPath
) {
    const char *modelPath = env->GetStringUTFChars(jModelPath, nullptr);
    LOGI("Loading model: %s", modelPath);

    llama_backend_init();

    llama_model_params mparams = llama_model_default_params();
    llama_context_params cparams = llama_context_default_params();

    llama_model *model = llama_load_model_from_file(modelPath, mparams);
    if (!model) {
        LOGE("Failed to load model");
        env->ReleaseStringUTFChars(jModelPath, modelPath);
        return JNI_FALSE;
    }

    g_ctx = llama_new_context_with_model(model, cparams);
    env->ReleaseStringUTFChars(jModelPath, modelPath);

    if (!g_ctx) {
        LOGE("Failed to create context");
        return JNI_FALSE;
    }

    LOGI("Model loaded successfully");
    return JNI_TRUE;
}

extern "C"
JNIEXPORT jstring JNICALL
Java_com_triage_ai_llm_LlamaEngine_generate(
        JNIEnv *env,
        jobject /* this */,
        jstring jPrompt
) {
    if (!g_ctx) {
        LOGE("Context not initialized");
        return env->NewStringUTF("Model not initialized");
    }

    const char *prompt = env->GetStringUTFChars(jPrompt, nullptr);

    // VERY minimal example: you will replace this with proper tokenization + loop.
    std::string result = std::string("Stubbed response to: ") + prompt;

    env->ReleaseStringUTFChars(jPrompt, prompt);
    return env->NewStringUTF(result.c_str());
}
