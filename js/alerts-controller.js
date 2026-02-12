/**
 * Alerts Controller
 * Handles the logic for the Alerts Page as per SRS.
 */
app.controller('AlertsController', ['$scope', 'MockBackendService', '$interval', 'KafkaService', function ($scope, MockBackendService, $interval, KafkaService) {

    // --- State ---
    $scope.isLoading = true;
    $scope.allAlerts = [];
    $scope.filteredAlerts = [];
    $scope.paginatedAlerts = [];
    $scope.liveAlerts = []; // Store real-time alerts permanently

    // Pagination
    $scope.pagination = {
        currentPage: 1,
        itemsPerPage: 15,
        totalItems: 0,
        label: "Showing 0-0 of 0"
    };

    // Filters Model
    $scope.filters = {
        search: '',
        severity: '', // '', 'Critical', 'High', 'Medium', 'Low'
        status: 'Unread', // 'All', 'Unread', 'Resolved', 'Deleted'
        location: '', // New Location Filter
        timeRange: '24h', // '15m', '1h', '4h', '24h', 'today', 'yesterday', '7d', '30d', 'custom'
        customStart: null,
        customEnd: null
    };

    // Options for Selects
    $scope.options = {
        severities: ['Critical', 'High', 'Medium', 'Low'],
        statuses: ['Unread', 'All', 'Resolved', 'Deleted'],
        locations: [], // Populated from backend
        timeRanges: [
            { label: 'Last 15 Minutes', val: '15m' },
            { label: 'Last 1 Hour', val: '1h' },
            { label: 'Last 4 Hours', val: '4h' },
            { label: 'Last 24 Hours', val: '24h' },
            { label: 'Today', val: 'today' },
            { label: 'Yesterday', val: 'yesterday' },
            { label: 'Last 7 Days', val: '7d' },
            { label: 'Last 30 Days', val: '30d' },
            { label: 'Custom Range', val: 'custom' }
        ]
    };

    // --- Stats ---
    $scope.stats = { unread: 0, critical: 0 };

    // --- UI State ---
    $scope.activeActionMenu = false;
    $scope.activeActionAlert = null;
    $scope.menuPosition = {};

    // --- Init ---
    $scope.init = function () {
        console.log("Initializing Alerts Page...");
        $scope.fetchLocations();
        $scope.fetchAlerts();

        // --- Kafka Subscription ---
        KafkaService.subscribe('alerts', function (alertPayload) {
            console.log("AlertsController: Received Real-Time Alert:", alertPayload);

            // Add new alert to the top of the list
            $scope.liveAlerts.unshift(alertPayload);
            // Update filtered view (assume new alert matches, or we could filter it)
            $scope.filteredAlerts.unshift(alertPayload);
            // Also update stats
            if (alertPayload.status === 'Unread') $scope.stats.unread++;
            if (alertPayload.severity === 'Critical') $scope.stats.critical++;

            $scope.updatePagination();
        });


        // Auto-refresh every 30s (as per SRS Requirement 20 "Auto-refresh without full page reload")
        // Note: SRS says "Alert update latency <= 5 seconds", for MVP polling at 15s is safer for mock backend.
        // STOPPED FOR KAFKA INTEGRATION: WebSockets provide real-time updates. Polling wipes the list.
        // $scope.refreshInterval = $interval($scope.fetchAlerts, 15000);

        $scope.$on('$destroy', function () {
            if ($scope.refreshInterval) $interval.cancel($scope.refreshInterval);
        });
    };

    $scope.fetchLocations = function () {
        MockBackendService.getLocations().then(function (locs) {
            $scope.options.locations = locs;
        });
    };

    // --- Data Fetching ---
    $scope.fetchAlerts = function () {
        // Calculate Time Stamps based on Time Range
        var now = Date.now();
        var startTime = 0;
        var endTime = now;

        switch ($scope.filters.timeRange) {
            case '15m': startTime = now - (15 * 60 * 1000); break;
            case '1h': startTime = now - (60 * 60 * 1000); break;
            case '4h': startTime = now - (4 * 60 * 60 * 1000); break;
            case '24h': startTime = now - (24 * 60 * 60 * 1000); break;
            case '7d': startTime = now - (7 * 24 * 60 * 60 * 1000); break;
            case '30d': startTime = now - (30 * 24 * 60 * 60 * 1000); break;
            case 'today':
                var t = new Date(); t.setHours(0, 0, 0, 0); startTime = t.getTime();
                break;
            case 'yesterday':
                var y = new Date(); y.setDate(y.getDate() - 1); y.setHours(0, 0, 0, 0); startTime = y.getTime();
                var yEnd = new Date(); yEnd.setDate(yEnd.getDate() - 1); yEnd.setHours(23, 59, 59, 999); endTime = yEnd.getTime();
                break;
            case 'custom':
                if ($scope.filters.customStart) startTime = new Date($scope.filters.customStart).getTime();
                if ($scope.filters.customEnd) endTime = new Date($scope.filters.customEnd).getTime();
                break;
        }

        var serviceFilters = {
            status: $scope.filters.status,
            severity: $scope.filters.severity,
            location: $scope.filters.location,
            search: $scope.filters.search,
            startTime: startTime,
            endTime: endTime
        };

        $scope.isLoading = true; // Show loading for UX responsiveness
        MockBackendService.getAlerts(serviceFilters).then(function (backendAlerts) {
            // Merge Live Alerts with Backend Alerts
            // Note: In a real app, backend would return all, but since backend is mock/empty, we prepend live
            var all = $scope.liveAlerts.concat(backendAlerts);

            // Simple Client-Side Filtering for Live Alerts (to respect active filters)
            // This is a basic implementation to prevent "reset" feeling
            var result = all.filter(function (a) {
                if ($scope.filters.status && $scope.filters.status !== 'All' && a.status !== $scope.filters.status) return false;
                if ($scope.filters.severity && a.severity !== $scope.filters.severity) return false;
                if ($scope.filters.search) {
                    var s = $scope.filters.search.toLowerCase();
                    if (!a.type.toLowerCase().includes(s) && !a.location.toLowerCase().includes(s) && !a.cameraName.toLowerCase().includes(s)) return false;
                }
                return true;
            });

            $scope.filteredAlerts = result;
            $scope.updatePagination();
            $scope.updateStats();
            $scope.isLoading = false;
        });
    };

    // --- Pagination ---
    $scope.updatePagination = function () {
        $scope.pagination.totalItems = $scope.filteredAlerts.length;
        var start = ($scope.pagination.currentPage - 1) * $scope.pagination.itemsPerPage;
        var end = start + $scope.pagination.itemsPerPage;

        $scope.paginatedAlerts = $scope.filteredAlerts.slice(start, end);

        var showStart = $scope.pagination.totalItems === 0 ? 0 : start + 1;
        var showEnd = Math.min(end, $scope.pagination.totalItems);
        $scope.pagination.label = "Showing " + showStart + "-" + showEnd + " of " + $scope.pagination.totalItems;
    };

    $scope.nextPage = function () {
        if ($scope.pagination.currentPage * $scope.pagination.itemsPerPage < $scope.pagination.totalItems) {
            $scope.pagination.currentPage++;
            $scope.updatePagination();
        }
    };

    $scope.prevPage = function () {
        if ($scope.pagination.currentPage > 1) {
            $scope.pagination.currentPage--;
            $scope.updatePagination();
        }
    };

    // --- Actions ---
    $scope.openAlertDetails = function (alert) {
        console.log("Opening details for alert:", alert);
        // Navigate via parent (MainController)
        $scope.$emit('OPEN_ALERT_DETAILS', alert);
    };

    $scope.acknowledge = function (alert) {
        MockBackendService.acknowledgeAlert(alert.id).then(function () {
            // Optimistic update or Re-fetch?
            // Re-fetch is safer to maintain sort order SRS "Unread ... first"
            $scope.fetchAlerts();
        });
    };

    $scope.acknowledgeAll = function () {
        if (!confirm("Acknowledge all visible unread alerts?")) return;
        MockBackendService.acknowledgeAll().then(function () {
            $scope.fetchAlerts();
        });
    };

    $scope.resolve = function (alert) {
        MockBackendService.resolveAlert(alert.id).then(function () {
            $scope.fetchAlerts();
        });
    };

    $scope.delete = function (alert) {
        if (!confirm("Delete this alert?")) return;
        MockBackendService.deleteAlert(alert.id).then(function () {
            $scope.fetchAlerts();
        });
    };

    // --- UI Actions ---
    $scope.toggleActionMenu = function ($event, alert) {
        $event.stopPropagation();

        if ($scope.activeActionAlert && $scope.activeActionAlert.id === alert.id && $scope.activeActionMenu) {
            $scope.closeActionMenu();
            return;
        }

        $scope.activeActionAlert = alert;
        $scope.activeActionMenu = true;

        // Position Logic (Simple)
        var btn = $event.currentTarget;
        var rect = btn.getBoundingClientRect();

        // Default: Bottom Left relative to button
        var top = rect.bottom + window.scrollY + 5;
        var left = rect.right + window.scrollX - 160; // Approx menu width

        // Edge check (Bottom of screen)
        if (window.innerHeight - rect.bottom < 200) {
            top = rect.top + window.scrollY - 180; // Flip up
        }

        $scope.menuPosition = {
            top: top + 'px',
            left: left + 'px'
        };
    };

    $scope.closeActionMenu = function () {
        $scope.activeActionMenu = false;
        $scope.activeActionAlert = null;
    };

    $scope.handleAction = function (action, alert) {
        console.log("Action:", action, alert);
        if (action === 'View Camera') {
            // If we had a direct View Camera action
        }
        // Dispatch to specific handlers if needed, or just log for View/Playback
        // Specific handlers like acknowledge/resolve are called directly from HTML for simplicity
    };

    // Global Click to Close
    var closeHandler = function () {
        if ($scope.activeActionMenu) {
            $scope.$apply(function () {
                $scope.closeActionMenu();
            });
        }
    };
    document.addEventListener('click', closeHandler);

    $scope.$on('$destroy', function () {
        document.removeEventListener('click', closeHandler);
        if ($scope.refreshInterval) $interval.cancel($scope.refreshInterval);
    });

    // --- Helpers ---
    $scope.updateStats = function () {
        // This calculates stats based on current filter view, or global? 
        // Likely global stats needed a separate call, but for MVP we count visible 
        // OR we'd need a separate backend call for "Global Counts". 
        // For now let's just count potentially visible items in filtered set
        $scope.stats.unread = $scope.filteredAlerts.filter(function (a) { return a.status === 'Unread'; }).length;
        $scope.stats.critical = $scope.filteredAlerts.filter(function (a) { return a.severity === 'Critical'; }).length;
    };

    $scope.getSeverityClass = function (severity) {
        return severity.toLowerCase(); // 'critical', 'high', 'medium', 'low'
    };

    $scope.formatDate = function (ts) {
        return new Date(ts).toLocaleString();
    };

    // Handle Filter Changes
    $scope.onFilterChange = function () {
        $scope.pagination.currentPage = 1; // Reset to page 1
        $scope.fetchAlerts();
    };

    // Init
    $scope.init();
}]);
