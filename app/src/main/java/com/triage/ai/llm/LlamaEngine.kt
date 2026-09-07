package com.triage.ai.llm

import android.content.Context
import android.util.Log
import java.io.File

class LlamaEngine(private val context: Context) {

    companion object {
        init {
            System.loadLibrary("triage_llama")
        }
    }

    private external fun initModel(modelPath: String): Boolean
    private external fun generate(prompt: String): String

    private var initialized = false

    fun loadModelFromAssets(assetName: String = "models/Llama-3.2-3B-Instruct-Q4_K_M.gguf"): Boolean {
        val outDir = File(context.filesDir, "models")
        if (!outDir.exists()) outDir.mkdirs()

        val outFile = File(outDir, "model.gguf")
        if (!outFile.exists()) {
            try {
                context.assets.open(assetName).use { input ->
                    outFile.outputStream().use { output ->
                        input.copyTo(output)
                    }
                }
            } catch (e: Exception) {
                Log.e("LlamaEngine", "Error copying model from assets", e)
                return false
            }
        }

        initialized = initModel(outFile.absolutePath)
        Log.i("LlamaEngine", "Model init: $initialized")
        return initialized
    }

    fun reply(prompt: String): String {
        if (!initialized) {
            return "Model not initialized"
        }
        return generate(prompt)
    }
}
