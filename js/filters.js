/**
 * AARUTHRUN PORTFOLIO — FILTER UTILITY
 * Handles multi-tag and status filtering for project grids and timeline datasets.
 */

window.PortfolioFilters = (function () {
  'use strict';

  function createFilterManager(options) {
    const opts = Object.assign({
      items: [],
      onFilterChange: function () {}
    }, options);

    let activeTag = 'ALL';
    let activeStatus = 'ALL';

    function setTag(tag) {
      activeTag = tag.toUpperCase();
      applyFilters();
    }

    function setStatus(status) {
      activeStatus = status.toUpperCase();
      applyFilters();
    }

    function applyFilters() {
      const filtered = opts.items.filter(item => {
        // Tag check
        let matchesTag = false;
        if (activeTag === 'ALL') {
          matchesTag = true;
        } else if (item.tags && Array.isArray(item.tags)) {
          matchesTag = item.tags.some(t => t.toUpperCase() === activeTag);
        } else if (item.category) {
          matchesTag = item.category.toUpperCase() === activeTag;
        }

        // Status check
        let matchesStatus = false;
        if (activeStatus === 'ALL') {
          matchesStatus = true;
        } else if (item.status) {
          matchesStatus = item.status.toUpperCase() === activeStatus;
        }

        return matchesTag && matchesStatus;
      });

      opts.onFilterChange(filtered, {
        activeTag: activeTag,
        activeStatus: activeStatus
      });
    }

    function reset() {
      activeTag = 'ALL';
      activeStatus = 'ALL';
      applyFilters();
    }

    return {
      setTag: setTag,
      setStatus: setStatus,
      reset: reset,
      applyFilters: applyFilters,
      getActiveTag: () => activeTag,
      getActiveStatus: () => activeStatus
    };
  }

  return {
    create: createFilterManager
  };
})();
