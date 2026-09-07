package com.triage.ai

import android.content.Intent
import android.net.Uri
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

class TriageActivity : AppCompatActivity() {

    private lateinit var engine: LlamaEngine

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_triage)

        // Initialize llama.cpp engine
        engine = LlamaEngine(this)

        // Load model in background
        lifecycleScope.launch(Dispatchers.IO) {
            engine.loadModelFromAssets("models/Llama-3.2-3B-Instruct-Q4_K_M.gguf")
        }

        val emailInput = findViewById<EditText>(R.id.emailInput)
        val btnSummarize = findViewById<Button>(R.id.btnSummarize)
        val aiOutput = findViewById<TextView>(R.id.aiOutput)
        val btnSubscribe = findViewById<Button>(R.id.btnSubscribe)

        btnSubscribe.setOnClickListener {
            val intent = Intent(Intent.ACTION_VIEW)
            intent.data = Uri.parse("https://triageai.cc/subscribe")
            startActivity(intent)
        }

        btnSummarize.setOnClickListener {
            val emailText = emailInput.text.toString()
            if (emailText.isBlank()) return@setOnClickListener

            aiOutput.text = "Neural Apprentice is analyzing..."

            lifecycleScope.launch(Dispatchers.IO) {
                // AI triage logic
                val prompt = """
                    You are Triage AI. Analyze the following email and produce:
                    1. A short summary
                    2. A triage category (Urgent, Important, Junk, Later)
                    3. A confidence score (0–100%)
                    4. Any extracted tasks or dates
                    5. Whether any bi-laws are triggered

                    Email:
                    $emailText
                """.trimIndent()

                val result = engine.reply(prompt)

                withContext(Dispatchers.Main) {
                    aiOutput.text = result
                }
            }
        }
    }
}
