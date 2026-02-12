# AI Integration with Google Gemma (Local LLM)

This guide explains how to integrate Google's **Gemma** model with your NuraEye VMS to provide intelligent analysis of camera alerts in real-time.

## Overview
We use **Ollama** to run the Gemma model locally on your machine.
- **Privacy:** Video descriptions and alert data never leave your local network.
- **Speed:** Low latency inference on Apple Silicon (M1/M2/M3).
- **Cost:** Free to run (no API keys required).

## 1. Prerequisites (Ollama Setup)

### Install Ollama
Ollama is the easiest way to run open LLMs like Gemma locally.

1.  **Download & Install:**
    Go to [ollama.com](https://ollama.com/download) and download the installer for macOS.

2.  **Verify Installation:**
    Open a terminal and run:
    ```bash
    ollama --version
    ```

### Pull the Gemma Model
We will use `gemma:2b` (2 billion parameters) for speed, or `gemma:7b` for higher intelligence.

1.  **Pull the Model:**
    ```bash
    ollama pull gemma:2b
    ```
    *(This downloads approximately 1.5GB)*

2.  **Test the Model:**
    Check if it works by chatting with it in the terminal:
    ```bash
    ollama run gemma:2b "Hello, tell me about security cameras."
    ```
    *Exit by typing `/bye`.*

---

## 2. Python Integration Setup

The script `gemma_kafka_consumer.py` acts as a bridge between Kafka and Gemma.

### Install Python Dependencies
You need the `requests` library to talk to Ollama's local API, and `kafka-python` to read alerts.

```bash
pip install requests kafka-python
```

---

## 3. Running the AI Analysis

1.  **Ensure Kafka is Running:**
    (See [README_KAFKA.md](README_KAFKA.md) for details)

2.  **Start the Ollama Server:**
    (Usually runs maximizing in the background, but you can run `ollama serve` if needed).

3.  **Start the AI Consumer Script:**
    This script listens for Kafka alerts and sends them to Gemma for analysis.
    ```bash
    python3 gemma_kafka_consumer.py
    ```

4.  **Trigger an Alert:**
    Run the producer in another terminal:
    ```bash
    python3 kafka-producer.py
    ```

### Expected Output
You should see output like this in the `gemma_kafka_consumer.py` terminal:

```text
[Kafka] Received Alert: Weapon Detected in Zone 2
[Gemma AI] Analysis:
ALERT PRIORITY: CRITICAL.
Analysis: A weapon has been detected in a public zone.
Action: Immediately notify security personnel and lock down Zone 2.
```