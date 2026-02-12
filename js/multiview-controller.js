/**
 * Multiview Controller
 * Handles the logic for the Multi-View grid page with Pagination.
 */
app.controller('MultiviewController', ['$scope', 'MockBackendService', '$timeout', function ($scope, MockBackendService, $timeout) {

    // --- State ---
    $scope.layout = '2x2'; // Default layout
    $scope.itemsPerPage = 4; // Derived from layout (1, 4, 9, 16)

    // Global assignment storage (Flat array of cameras assigned to slots)
    // Indexes 0-3 are Page 1 (in 2x2), 4-7 are Page 2, etc.
    // We initialize with enough nulls for a practical limit, e.g., 64 items (16 pages of 2x2, or 4 pages of 8x8 if we had it)
    $scope.allAssignments = new Array(64).fill(null);

    // Current View State
    $scope.cells = []; // The visible cells for current page
    $scope.currentPage = 1;
    $scope.totalPages = 1;

    // Data
    $scope.cameras = [];
    $scope.isLoading = true;

    // Modal State
    $scope.isSelectorOpen = false;
    $scope.selectedCellIndex = null; // Relative to current page (0 to itemsPerPage-1)
    $scope.cameraSearch = '';
    $scope.filteredCameras = [];

    // --- Init ---
    $scope.init = function () {
        console.log("Initializing Multiview Page...");
        $scope.loadCameras();
        $scope.updateLayoutState('2x2');
    };

    // --- Layout Management ---
    $scope.setLayout = function (type) {
        if ($scope.layout === type) return;
        $scope.layout = type;
        $scope.currentPage = 1; // Reset to page 1 on layout change for simplicity (or we could try to keep focus)
        $scope.updateLayoutState(type);
    };

    $scope.updateLayoutState = function (type) {
        switch (type) {
            case '1x1': $scope.itemsPerPage = 1; break;
            case '2x2': $scope.itemsPerPage = 4; break;
            case '3x3': $scope.itemsPerPage = 9; break;
            case '4x4': $scope.itemsPerPage = 16; break;
            default: $scope.itemsPerPage = 4;
        }
        $scope.renderPage();
    };

    // --- Pagination ---
    $scope.renderPage = function () {
        // Calculate the furthest filled slot
        var maxAssignedIndex = -1;
        for (var i = $scope.allAssignments.length - 1; i >= 0; i--) {
            if ($scope.allAssignments[i] !== null) {
                maxAssignedIndex = i;
                break;
            }
        }

        // Calculate how many pages are actually used.
        // e.g., if index 5 is used and itemsPerPage is 4, we use 2 pages.
        var filledPages = Math.ceil((maxAssignedIndex + 1) / $scope.itemsPerPage);

        // We always allow the logical "Next" page to be available for adding new cameras.
        // So max allowed page is (filledPages + 1)
        // e.g., if Page 1 is full, we allow Page 2. If Page 1 has 1 item, we allow Page 2? 
        // Logic: You can always go to (Last Filled Page) or (Last Filled Page + 1).
        // If Page 1 is totally empty, filledPages is 0. We force at least 1.

        filledPages = Math.max(1, filledPages);

        var allowedPages = filledPages;
        // Check if the last filled page is completely full?
        // If index 3 is filled (4 items), filled pages is 1. Should we allow Page 2? Yes.
        // If index 2 is filled (3 items), filled pages is 1. Should we allow Page 2? Yes (to drag/drop or just move).
        // Standard UX: Always allow 1 empty page at the end.
        $scope.totalPages = filledPages + 1;

        // Ensure current page is valid
        if ($scope.currentPage < 1) $scope.currentPage = 1;
        if ($scope.currentPage > $scope.totalPages) $scope.currentPage = $scope.totalPages;

        // Extract cells for current view
        var start = ($scope.currentPage - 1) * $scope.itemsPerPage;
        var end = start + $scope.itemsPerPage;

        var pageSlice = $scope.allAssignments.slice(start, end);

        // Pad with nulls
        while (pageSlice.length < $scope.itemsPerPage) {
            pageSlice.push(null);
        }

        $scope.cells = pageSlice;
    };

    $scope.nextPage = function () {
        // Allow next page only if we haven't reached the limit
        if ($scope.currentPage < $scope.totalPages) {
            $scope.currentPage++;
            $scope.renderPage();
        }
    };

    $scope.prevPage = function () {
        if ($scope.currentPage > 1) {
            $scope.currentPage--;
            $scope.renderPage();
        }
    };

    // --- Data Loading ---
    $scope.loadCameras = function () {
        $scope.isLoading = true;
        MockBackendService.getCameras().then(function (cameras) {
            $scope.cameras = cameras;
            $scope.filteredCameras = cameras;
            $scope.isLoading = false;
        });
    };

    // --- Assignment Logic ---
    $scope.openCameraSelector = function (localIndex) {
        $scope.selectedCellIndex = localIndex;
        $scope.isSelectorOpen = true;
        $scope.cameraSearch = '';
        $scope.filterCameras();
    };

    $scope.closeCameraSelector = function () {
        $scope.isSelectorOpen = false;
        $scope.selectedCellIndex = null;
    };

    $scope.assignCamera = function (camera) {
        if ($scope.selectedCellIndex !== null) {
            // Calculate Global Index
            var globalIndex = (($scope.currentPage - 1) * $scope.itemsPerPage) + $scope.selectedCellIndex;

            // Assign
            if (globalIndex < $scope.allAssignments.length) {
                $scope.allAssignments[globalIndex] = camera;
                $scope.renderPage(); // Update view
            }
            $scope.closeCameraSelector();
        }
    };

    $scope.clearCell = function ($event, localIndex) {
        $event.stopPropagation();
        var globalIndex = (($scope.currentPage - 1) * $scope.itemsPerPage) + localIndex;
        if (globalIndex < $scope.allAssignments.length) {
            $scope.allAssignments[globalIndex] = null;
            $scope.renderPage();
        }
    };

    $scope.clearAll = function () {
        if (confirm("Clear all cameras from ALL pages?")) {
            $scope.allAssignments.fill(null);
            $scope.currentPage = 1;
            $scope.renderPage();
        }
    };

    // --- Search Logic ---
    $scope.filterCameras = function () {
        if (!$scope.cameraSearch) {
            $scope.filteredCameras = $scope.cameras;
            return;
        }
        var q = $scope.cameraSearch.toLowerCase();
        $scope.filteredCameras = $scope.cameras.filter(function (cam) {
            return cam.name.toLowerCase().includes(q) ||
                cam.location.toLowerCase().includes(q);
        });
    };

    // --- Full Screen Logic ---
    $scope.fullScreenCellIndex = null;

    $scope.toggleFullScreen = function (localIndex) {
        if ($scope.fullScreenCellIndex === localIndex) {
            $scope.fullScreenCellIndex = null;
        } else {
            if ($scope.cells[localIndex]) {
                $scope.fullScreenCellIndex = localIndex;
            }
        }
    };

    // ESC Handler
    var escHandler = function (e) {
        if (e.key === 'Escape' && $scope.fullScreenCellIndex !== null) {
            $scope.$apply(function () {
                $scope.fullScreenCellIndex = null;
            });
        }
    };
    document.addEventListener('keydown', escHandler);

    $scope.$on('$destroy', function () {
        document.removeEventListener('keydown', escHandler);
    });

    // --- External Events ---
    $scope.$on('ADD_TO_MULTIVIEW', function (evt, camera) {
        console.log("Multiview received ADD request for:", camera.name);

        // Find first empty slot
        var emptyIndex = $scope.allAssignments.findIndex(function (slot) { return slot === null; });

        if (emptyIndex !== -1) {
            $scope.allAssignments[emptyIndex] = camera;

            // Calculate which page this slot is on
            var targetPage = Math.floor(emptyIndex / $scope.itemsPerPage) + 1;
            $scope.currentPage = targetPage;
            $scope.renderPage();

            // Optional: You could show a toast here
        } else {
            console.warn("Multiview grid is full!");
            alert("Multiview grid is full! Clear some slots first.");
        }
    });

    // --- Init ---
    $scope.init();
}]);
