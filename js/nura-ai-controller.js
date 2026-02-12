/**
 * NuraAi Controller
 * Handles the chatbot interaction and logic.
 */
app.controller('NuraAiController', ['$scope', '$timeout', function ($scope, $timeout) {
    $scope.chatHistory = [
        { sender: 'ai', type: 'text', text: 'Hello! I am NuraAi. How can I assist you with your VMS today?' }
    ];
    $scope.userMessage = '';
    $scope.isTyping = false;

    // Image Modal State
    $scope.showImageModal = false;
    $scope.modalImageUrl = '';

    $scope.openImageModal = function (url) {
        $scope.modalImageUrl = url;
        $scope.showImageModal = true;
    };

    $scope.closeImageModal = function () {
        $scope.showImageModal = false;
        $scope.modalImageUrl = '';
    };

    // Scroll to bottom of chat
    function scrollToBottom() {
        $timeout(function () {
            var chatContainer = document.getElementById('nura-ai-chat-body');
            if (chatContainer) {
                chatContainer.scrollTop = chatContainer.scrollHeight;
            }
        }, 50); // Small delay to allow ng-repeat to render
    }

    $scope.sendMessage = function () {
        if (!$scope.userMessage.trim()) return;

        // Add User Message
        $scope.chatHistory.push({ sender: 'user', type: 'text', text: $scope.userMessage });
        var userQuery = $scope.userMessage;
        $scope.userMessage = '';
        scrollToBottom();

        // Simulate AI Typing
        $scope.isTyping = true;
        scrollToBottom();

        // Simulate AI Response Delay
        $timeout(function () {
            var response = generateResponse(userQuery);
            // Response is now an object { type, text, imageUrl? }
            $scope.chatHistory.push({
                sender: 'ai',
                type: response.type,
                text: response.text,
                imageUrl: response.imageUrl
            });
            $scope.isTyping = false;
            scrollToBottom();
        }, 1500);
    };

    // Include logic to handle "Enter" key in textarea if needed, 
    // though usually ng-keydown or a form submit handles this.
    $scope.handleKeyDown = function (event) {
        if (event.keyCode === 13 && !event.shiftKey) {
            event.preventDefault();
            $scope.sendMessage();
        }
    };

    function generateResponse(query) {
        var lowerQuery = query.toLowerCase();

        // Specific Commands First
        if (lowerQuery.includes('snapshot') || lowerQuery.includes('image') || lowerQuery.includes('picture')) {
            return {
                type: 'text',
                text: "Snapshots are not available as no cameras are connected.",
                imageUrl: ''
            };
        } else if (lowerQuery.includes('chart') || lowerQuery.includes('graph')) {
            return {
                type: 'text',
                text: "Analytics data is currently unavailable."
            };
        }
        // General Help Topics
        else if (lowerQuery.includes('alert') || lowerQuery.includes('alarm')) {
            return { type: 'text', text: "I can help you with alerts. You can view active alerts on the Alerts page, or configure alert rules in Settings." };
        } else if (lowerQuery.includes('camera') || lowerQuery.includes('video')) {
            return { type: 'text', text: "For camera management, please visit the Cameras page. You can add, remove, or configure camera settings there." };
        } else if (lowerQuery.includes('storage') || lowerQuery.includes('recording')) {
            return { type: 'text', text: "Storage usage is currently at normal levels. You can manage retention policies in the Settings > Storage section." };
        } else if (lowerQuery.includes('user') || lowerQuery.includes('password')) {
            return { type: 'text', text: "User management is available for Administrators in the Settings > Users section." };
        } else if (lowerQuery.includes('hello') || lowerQuery.includes('hi')) {
            return { type: 'text', text: "Hello there! I am ready to help you manage your security system." };
        } else {
            return { type: 'text', text: "I'm not sure I understand that command yet. I'm still learning! Try asking about alerts, cameras, or storage." };
        }
    }
}]);

