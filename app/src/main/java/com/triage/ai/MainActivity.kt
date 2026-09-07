package com.triage.ai

import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.triage.ai.llm.LlamaEngine
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : AppCompatActivity() {

    private lateinit var engine: LlamaEngine

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        engine = LlamaEngine(this)
        
        // Load model in background to avoid blocking main thread
        lifecycleScope.launch(Dispatchers.IO) {
            engine.loadModelFromAssets("models/Llama-3.2-3B-Instruct-Q4_K_M.gguf")
        }

        val input = findViewById<EditText>(R.id.inputPrompt)
        val output = findViewById<TextView>(R.id.outputText)
        val button = findViewById<Button>(R.id.buttonGenerate)

        button.setOnClickListener {
            val emailBody = input.text.toString()
            output.text = "Summarizing..."
            
            lifecycleScope.launch(Dispatchers.IO) {
                val result = engine.reply("Summarize this email: $emailBody")
                withContext(Dispatchers.Main) {
                    output.text = result
                }
            }
        }
    }
}
