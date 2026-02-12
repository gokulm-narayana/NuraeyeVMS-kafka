/**
 * NuraEye VMS - AngularJS Main Module
 */
var app = angular.module('vmsApp', []);

/**
 * Mock Backend Service
 * Simulates API calls to a backend server.
 */
app.service('MockBackendService', ['$q', '$timeout', function ($q, $timeout) {
    var self = this;

    // --- Data Generation Helpers ---
    var _locations = []; // Empty locations

    // Public method to get locations
    this.getLocations = function () {
        return _delay(200).then(function () {
            return _locations;
        });
    };

    // Unified Camera Database
    var _cameras = []; // Empty cameras

    // --- Simulated Database ---
    var _db = {
        cameras: _cameras,
        systemStatus: {
            storageUsage: 0, retentionDays: 0, cpuLoad: 0, memoryUsage: 0,
            serverStatus: 'Unknown', uptime: '0m'
        },
        alerts: [] // Empty alerts
    };

    // Helper to simulate network delay
    var _delay = function (ms) {
        ms = ms || 600;
        return $timeout(function () { }, ms);
    };

    // --- Dashboard Methods ---
    this.getDashboardData = function () {
        return _delay(800).then(function () {
            // Dynamic Stats Calculation
            var total = _db.cameras.length;
            var online = _db.cameras.filter(c => c.status === 'Online').length;
            var offline = _db.cameras.filter(c => c.status === 'Offline').length;
            var recording = _db.cameras.filter(c => c.recording).length;

            _db.cameraSummary = { total: total, online: online, offline: offline, recording: recording };

            // Dynamic Issues List
            var issues = [];

            // Limit issues for dashboard widget
            _db.cameraIssues = issues;

            var liveStatus = angular.copy(_db.systemStatus);

            // Dashboard only shows recent active alerts (slice of unread)
            var recentAlerts = [];

            return {
                cameraSummary: _db.cameraSummary,
                systemStatus: liveStatus,
                cameraIssues: _db.cameraIssues,
                alerts: recentAlerts
            };
        });
    };

    // --- Camera Methods ---
    this.getCameras = function () {
        return _delay(600).then(function () {
            // Return persistent list
            return _db.cameras;
        });
    };

    // --- Alerts Page Methods ---
    this.getAlerts = function (filters) {
        return _delay(500).then(function () {
            return [];
        });
    };

    this.acknowledgeAlert = function (id) {
        return _delay(200).then(function () {
            return true;
        });
    };

    this.acknowledgeAll = function () {
        return _delay(400).then(function () {
            return true;
        });
    };

    this.resolveAlert = function (id) {
        return _delay(200).then(function () {
            return true;
        });
    };

    this.deleteAlert = function (id) {
        return _delay(200).then(function () {
            return true;
        });
    };

}]);

/**
 * Main Controller
 * Handles global navigation and user state.
 */
app.controller('MainController', ['$scope', '$timeout', 'MockBackendService', 'KafkaService', function ($scope, $timeout, MockBackendService, KafkaService) {
    // --- Kafka Initialization ---
    KafkaService.connect().then(function () {
        console.log("MainController: KafkaService Connected");
    }, function (err) {
        console.error("MainController: KafkaService connection failed", err);
    });

    $scope.activePage = 'dashboard';

    // User Profile
    $scope.user = {
        name: 'John Doe',
        role: 'Administrator',
        initials: 'JD'
    };

    $scope.isUserDropdownOpen = false;

    $scope.navigateTo = function (page) {
        $scope.activePage = page;
        console.log("Navigating to: " + page);
    };

    // Camera Issue Details Navigation - SRS Requirement 2.1
    $scope.currentIssue = null;
    $scope.openIssueDetails = function (issue) {
        console.log("Navigating to Issue Details for:", issue.name);
        $scope.currentIssue = issue;
        $scope.activePage = 'camera-issue-details';

        // Critical: Broadcast data to child controller (SRS 4.2 / 5.2 data requirements)
        // Timeout ensures the child controller is instantiated and listening
        $timeout(function () {
            $scope.$broadcast('ISSUE_DATA_UPDATED', issue);
        }, 100);
    };

    // Event Listener for Child Controllers
    $scope.$on('OPEN_ISSUE_DETAILS', function (evt, issue) {
        $scope.openIssueDetails(issue);
    });

    // --- Alert Details Navigation --- (SRS Requirement)
    $scope.openAlertDetails = function (alert) {
        console.log("MainController: Navigating to Alert Details for:", alert.id);
        $scope.activePage = 'alert-details';

        $timeout(function () {
            $scope.$broadcast('ALERT_DATA_UPDATED', alert);
        }, 100);
    };

    $scope.$on('OPEN_ALERT_DETAILS', function (evt, alert) {
        $scope.openAlertDetails(alert);
    });

    // Handle "Live Camera" navigation from Alerts
    $scope.$on('OPEN_CAMERA_LIVE', function (evt, cameraId) {
        console.log("Navigating to Live Camera:", cameraId);
        // alert("MainController received OPEN_CAMERA_LIVE for ID: " + cameraId); // Debug

        $scope.activePage = 'camera-settings';

        MockBackendService.getCameras().then(function (cameras) {
            // Use loose equality (==) for ID matching to handle string/number differences
            var cam = cameras.find(function (c) { return c.id == cameraId; });

            if (cam) {
                console.log("Found camera:", cam.name);
                $timeout(function () {
                    console.log("Broadcasting OPEN_CAMERA_SETTINGS");
                    $scope.$broadcast('OPEN_CAMERA_SETTINGS', cam, 'live');
                }, 100);
            } else {
                console.error("Camera not found for ID:", cameraId);
                alert("Error: Camera not found (ID: " + cameraId + ")");
            }
        });
    });

    $scope.toggleUserDropdown = function (event) {
        event.stopPropagation();
        $scope.isUserDropdownOpen = !$scope.isUserDropdownOpen;
    };

    // Close dropdown on click outside (using a directive is cleaner, but this works for MVP)
    document.addEventListener('click', function () {
        if ($scope.isUserDropdownOpen) {
            $scope.$apply(function () {
                $scope.isUserDropdownOpen = false;
            });
        }
    });

    // Theme Logic
    $scope.theme = 'light'; // Default

    $scope.setTheme = function (newTheme) {
        $scope.theme = newTheme;
        if (newTheme === 'dark') {
            document.body.classList.remove('light-theme');
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
            document.body.classList.add('light-theme');
        }
    };

    $scope.toggleTheme = function () {
        var newTheme = $scope.theme === 'light' ? 'dark' : 'light';
        $scope.setTheme(newTheme);
    };

    // Global Modal Handlers
    $scope.showConfirmModal = false;
    $scope.showDeleteModal = false;

    $scope.cancelAction = function () {
        $scope.showConfirmModal = false;
    };

    $scope.cancelDelete = function () {
        $scope.showDeleteModal = false;
    };
}]);
