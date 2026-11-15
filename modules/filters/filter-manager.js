/**
 * AARUTHRUN PORTFOLIO — FILTER MANAGER MODULE
 * Handles multi-criteria filtering for projects.
 * Decoupled from UI - just logic and events.
 */

const FilterManager = (function () {
  'use strict';

  // Lazy access to filter config
  function getFilterConfig() {
    try {
      return AppConfig && AppConfig.getFilters ? AppConfig.getFilters() : { tags: ['ALL'], statuses: ['ALL'] };
    } catch (e) {
      return { tags: ['ALL'], statuses: ['ALL'] };
    }
  }

  // Public API
  return {
    /**
     * Create a new filter manager instance
     */
    create(options = {}) {
      const instance = {};
      const items = options.items || [];
      const onChange = options.onFilterChange || (() => {});
      
      let activeTag = 'ALL';
      let activeStatus = 'ALL';

      /**
       * Apply current filters and return results
       */
      function applyFilters() {
        const filtered = items.filter(item => {
          // Tag check
          const tagOk = activeTag === 'ALL' ||
            (item.tags || []).some(t =>
              t.toUpperCase() === activeTag ||
              (item.category && item.category.toUpperCase() === activeTag)
            );

          // Status check
          const statusOk = activeStatus === 'ALL' ||
            (item.status && item.status.toUpperCase() === activeStatus);

          return tagOk && statusOk;
        });

        // Trigger callback
        onChange(filtered, {
          activeTag,
          activeStatus,
          total: items.length,
          visible: filtered.length,
        });

        // Dispatch event
        const event = new CustomEvent('portfolio:filter-change', {
          detail: {
            activeTag,
            activeStatus,
            filtered,
            total: items.length,
            visible: filtered.length,
          },
          bubbles: true,
        });
        document.dispatchEvent(event);

        return filtered;
      }

      /**
       * Set active tag filter
       */
      instance.setTag = function (tag) {
        activeTag = tag.toUpperCase();
        applyFilters();
      };

      /**
       * Set active status filter
       */
      instance.setStatus = function (status) {
        activeStatus = status.toUpperCase();
        applyFilters();
      };

      /**
       * Set multiple filters at once
       */
      instance.setFilters = function (filters) {
        if (filters.tag !== undefined) {
          activeTag = filters.tag.toUpperCase();
        }
        if (filters.status !== undefined) {
          activeStatus = filters.status.toUpperCase();
        }
        applyFilters();
      };

      /**
       * Reset all filters to ALL
       */
      instance.reset = function () {
        activeTag = 'ALL';
        activeStatus = 'ALL';
        applyFilters();
      };

      /**
       * Get current filter state
       */
      instance.getState = function () {
        const visible = items.filter((item) => {
          const tagOk = activeTag === 'ALL' ||
            (item.tags || []).some(t =>
              t.toUpperCase() === activeTag ||
              (item.category && item.category.toUpperCase() === activeTag)
            );
          const statusOk = activeStatus === 'ALL' ||
            (item.status && item.status.toUpperCase() === activeStatus);
          return tagOk && statusOk;
        }).length;

        return {
          activeTag,
          activeStatus,
          total: items.length,
          visible,
        };
      };

      /**
       * Update items list
       */
      instance.setItems = function (newItems) {
        items.length = 0;
        newItems.forEach(item => items.push(item));
        applyFilters();
      };

      /**
       * Get available tags from items
       */
      instance.getAvailableTags = function () {
        const tags = new Set();
        items.forEach(item => {
          (item.tags || []).forEach(t => tags.add(t));
          if (item.category) tags.add(item.category);
        });
        return Array.from(tags).sort();
      };

      // Initial filter
      applyFilters();

      return instance;
    },

    /**
     * Standalone filter function (stateless)
     */
    filterItems(items, options = {}) {
      const {
        tag = 'ALL',
        status = 'ALL',
        categories = [],
        search = '',
      } = options;

      return items.filter(item => {
        // Tag filter
        if (tag && tag !== 'ALL') {
          const tagMatch = (item.tags || []).some(t =>
            t.toUpperCase() === tag.toUpperCase()
          ) || (item.category && item.category.toUpperCase() === tag.toUpperCase());
          if (!tagMatch) return false;
        }

        // Status filter
        if (status && status !== 'ALL') {
          const statusMatch = item.status &&
            item.status.toUpperCase() === status.toUpperCase();
          if (!statusMatch) return false;
        }

        // Category filter
        if (categories.length > 0 && categories[0] !== 'ALL') {
          if (!categories.includes(item.category)) return false;
        }

        // Search filter
        if (search) {
          const query = search.toLowerCase();
          const searchable = [
            item.title,
            item.summary,
            item.shortTitle,
            item.category,
            ...(item.tags || []),
            ...(item.skills || []),
          ].join(' ').toLowerCase();

          if (!searchable.includes(query)) return false;
        }

        return true;
      });
    },

    /**
     * Get available filter tags from config
     */
    getFilterTags() {
      return getFilterConfig().tags;
    },

    /**
     * Get available filter statuses from config
     */
    getFilterStatuses() {
      return getFilterConfig().statuses;
    },
  };
})();
