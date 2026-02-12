/**
 * Kafka Service
 * Handles WebSocket connections to a Kafka Gateway/Proxy.
 * 
 * Since browsers cannot directly connect to Kafka brokers (TCP), 
 * this service connects to a WebSocket server that forwards Kafka messages.
 */
app.factory('KafkaService', ['$q', '$rootScope', function ($q, $rootScope) {
    var Service = {};
    var ws = null;
    var listeners = {}; // Topic -> [Callback]
    var isConnected = false;

    // Configuration
    var WS_URL = 'ws://localhost:8081'; // Updated to match Python backend root path

    Service.connect = function () {
        console.log("KafkaService: connect() called. Using URL:", WS_URL);
        var deferred = $q.defer();

        if (ws) {
            deferred.resolve();
            return deferred.promise;
        }

        console.log("KafkaService: Connecting to " + WS_URL + "...");

        try {
            ws = new WebSocket(WS_URL);

            ws.onopen = function () {
                console.log("KafkaService: Connected");
                // VISUAL LOG FOR USER
                alert("Kafka Service: Connected Successfully to ws://localhost:8081!");

                isConnected = true;
                $rootScope.$apply(function () {
                    $rootScope.$broadcast('KAFKA_CONNECTED');
                });
                deferred.resolve();
            };

            ws.onmessage = function (event) {
                try {
                    console.log("KafkaService Raw Message:", event.data); // DEBUG LOG
                    var message = JSON.parse(event.data);
                    // Expected format: { topic: "cameras", payload: { ... } }

                    if (message.topic && listeners[message.topic]) {
                        listeners[message.topic].forEach(function (callback) {
                            $rootScope.$apply(function () {
                                callback(message.payload);
                            });
                        });
                    }
                } catch (e) {
                    console.error("KafkaService: Error parsing message", e);
                }
            };

            ws.onerror = function (err) {
                console.error("KafkaService: Socket Error - Check if 'python3 kafka-backend.py' is running and port 8080 is open.", err);
                deferred.reject(err);
            };

            ws.onclose = function () {
                console.log("KafkaService: Connection Closed");
                isConnected = false;
                ws = null;
                $rootScope.$apply(function () {
                    $rootScope.$broadcast('KAFKA_DISCONNECTED');
                });
                // Optional: Auto-reconnect logic could go here
            };

        } catch (e) {
            console.error("KafkaService: Connection Failed", e);
            deferred.reject(e);
        }

        return deferred.promise;
    };

    // --- REAL BACKEND CONNECTION ONLY ---


    Service.subscribe = function (topic, callback) {
        if (!listeners[topic]) {
            listeners[topic] = [];
        }
        listeners[topic].push(callback);
        console.log("KafkaService: Subscribed to topic '" + topic + "'");

        // If we need to tell the backend we are subscribing:
        if (isConnected && ws) {
            ws.send(JSON.stringify({ action: 'subscribe', topic: topic }));
        }
    };

    Service.publish = function (topic, payload) {
        if (isConnected && ws) {
            ws.send(JSON.stringify({
                action: 'publish',
                topic: topic,
                payload: payload
            }));
        } else {
            console.warn("KafkaService: Cannot publish, not connected.");
        }
    };

    Service.disconnect = function () {
        if (ws) {
            ws.close();
        }
    };

    Service.isConnected = function () {
        return isConnected;
    };

    return Service;
}]);
