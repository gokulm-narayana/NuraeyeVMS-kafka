import asyncio
import json
import websockets
from aiokafka import AIOKafkaConsumer

# Configuration
KAFKA_TOPIC = 'alerts'
KAFKA_BOOTSTRAP_SERVERS = 'localhost:9092'
WS_PORT = 8081

async def kafka_ws_handler(websocket):
    print(f"Client connected via WebSocket")
    
    consumer = AIOKafkaConsumer(
        KAFKA_TOPIC,
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
        value_deserializer=lambda x: json.loads(x.decode('utf-8')),
        auto_offset_reset='latest'
    )
    
    try:
        await consumer.start()
        print("Connected to Kafka (Async). Waiting for messages...")

        try:
            async for message in consumer:
                kafka_data = message.value
                print(f"DEBUG: Kafka Message Received: {kafka_data}") # DEBUG LOG
                
                # Forward data to frontend
                ws_payload = {
                    "topic": KAFKA_TOPIC,
                    "payload": kafka_data
                }
                
                print(f"Sending to Frontend: {kafka_data.get('type', 'Unknown Type')}")
                await websocket.send(json.dumps(ws_payload))
                
        except asyncio.CancelledError:
            print("Consumer loop cancelled")
        finally:
            await consumer.stop()
            
    except websockets.exceptions.ConnectionClosed:
        print("Client disconnected")
    except Exception as e:
        print(f"Error in handler: {e}")
    finally:
        # ensure consumer is closed if not already
        pass

async def main():
    async with websockets.serve(kafka_ws_handler, "0.0.0.0", WS_PORT):
        print(f"Starting WebSocket Proxy on ws://0.0.0.0:{WS_PORT}")
        await asyncio.Future()  # Run forever

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Server stopped")
