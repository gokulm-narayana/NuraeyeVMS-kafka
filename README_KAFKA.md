# Kafka Setup Guide for NuraEye VMS

This guide explains how to set up and run a local Apache Kafka server required for the NuraEye VMS backend.

## Prerequisites

- **Java (JDK 8+)**: Kafka requires Java to run.
  - Check if installed: `java -version`
  - If not, install via Homebrew: `brew install openjdk`

## Option 1: Running with Homebrew (Easiest for Mac)

1.  **Install Kafka and Zookeeper**
    ```bash
    brew install kafka
    ```

2.  **Start Zookeeper** (Required by Kafka)
    ```bash
    zookeeper-server-start /opt/homebrew/etc/kafka/zookeeper.properties
    ```
    *Open a new terminal tab after running this.*

3.  **Start Kafka Server**
    ```bash
    kafka-server-start /opt/homebrew/etc/kafka/server.properties
    ```
    *Open a new terminal tab after running this.*

4.  **Create the 'alerts' Topic**
    The application listens to the `alerts` topic. Create it manually:
    ```bash
    kafka-topics --create --topic alerts --bootstrap-server localhost:9092 --partitions 1 --replication-factor 1
    ```

---

## Option 2: Running from Binaries (Manual Download)

If you prefer not to use Homebrew, or are on a different OS:

1.  **Download Kafka**
    - Go to [Apache Kafka Downloads](https://kafka.apache.org/downloads).
    - Download the latest **Binary download** (e.g., Scala 2.13).
    - Extract the archive: `tar -xzf kafka_2.13-x.x.x.tgz`
    - `cd` into the extracted folder.

2.  **Start Zookeeper**
    ```bash
    bin/zookeeper-server-start.sh config/zookeeper.properties
    ```

3.  **Start Kafka Server**
    ```bash
    bin/kafka-server-start.sh config/server.properties
    ```

4.  **Create the Topic**
    ```bash
    bin/kafka-topics.sh --create --topic alerts --bootstrap-server localhost:9092
    ```

---

## Running the VMS Backend

Once Kafka is running, you can start the application components:

1.  **Start the WebSocket Backend** (Consumer)
    ```bash
    python3 kafka-backend.py
    ```

2.  **Start the Alert Producer** (Simulates Camera Alerts)
    ```bash
    python3 kafka-producer.py
    ```

---

## How It Works (Architecture)

The NuraEye VMS uses a real-time event-driven architecture powered by Kafka:

1.  **Producer (Camera Simulation)**
    - `kafka-producer.py` simulates AI cameras detecting events (e.g., "Weapon Detected", "Intrusion").
    - It generates JSON messages and pushes them to the **Kafka Topic** named `alerts`.

2.  **Kafka Broker & Topic**
    - **Apache Kafka** acts as the central message hub.
    - The `alerts` topic stores the stream of events reliably.

3.  **Consumer (Backend Bridge)**
    - `kafka-backend.py` listens to the `alerts` topic.
    - It consumes new messages instantly as they arrive.
    - It also functions as a **WebSocket Server**.

4.  **Frontend (Real-Time UI)**
    - The active user interface (dashboard) connects to `kafka-backend.py` via WebSockets.
    - When the backend receives a Kafka message, it immediately forwards it to the browser.
    - The UI updates instantly without needing to refresh.

---

## Automatic Startup (Production/NVR)

In a real deployment (e.g., on a Linux-based NVR), you don't start these manually. Instead, you use `systemd` to start them automatically on boot.

### 1. Create Zookeeper Service
File: `/etc/systemd/system/zookeeper.service`
```ini
[Unit]
Description=Apache Zookeeper server
Documentation=http://zookeeper.apache.org
Requires=network.target remote-fs.target
After=network.target remote-fs.target

[Service]
Type=simple
ExecStart=/path/to/kafka/bin/zookeeper-server-start.sh /path/to/kafka/config/zookeeper.properties
ExecStop=/path/to/kafka/bin/zookeeper-server-stop.sh
Restart=on-abnormal

[Install]
WantedBy=multi-user.target
```

### 2. Create Kafka Service
File: `/etc/systemd/system/kafka.service`
```ini
[Unit]
Description=Apache Kafka Server
Documentation=http://kafka.apache.org/documentation.html
Requires=zookeeper.service
After=zookeeper.service

[Service]
Type=simple
Environment="JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64"
ExecStart=/path/to/kafka/bin/kafka-server-start.sh /path/to/kafka/config/server.properties
ExecStop=/path/to/kafka/bin/kafka-server-stop.sh
Restart=on-abnormal

[Install]
WantedBy=multi-user.target
```

### 3. Enable Services
```bash
sudo systemctl daemon-reload
sudo systemctl enable zookeeper
sudo systemctl enable kafka
sudo systemctl start zookeeper
sudo systemctl start kafka
```

---

## Managing Disk Space (Retention)

By default, Kafka might keep messages for a long time (or forever), which can fill up your disk. Use `configure_retention.py` to set limits on how much data the `alerts` topic stores.

### Usage
This script configures the `alerts` topic to keep data for a maximum of **10 days** or **50 GB**, whichever comes first.

1.  **Run the script:** 
    ```bash
    python3 configure_retention.py
    ```

2.  **Customize Limits:**
    Open `configure_retention.py` and edit these lines to change the policy:
    ```python
    # Retention Limits
    RETENTION_DAYS = 10  # e.g., Change to 10 days
    RETENTION_GB = 50    # e.g., Change to 50 GB
    ```

