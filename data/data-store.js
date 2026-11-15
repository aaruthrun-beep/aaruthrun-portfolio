/**
 * AARUTHRUN PORTFOLIO — DATA STORE
 * Centralized data access layer with caching.
 * All modules access data through this layer, never directly.
 */

const DataStore = (function () {
  'use strict';

  // In-memory cache
  let cache = {
    projects: null,
    loadedAt: null,
  };

  // Configuration
  const CONFIG = {
    cacheDuration: 5 * 60 * 1000, // 5 minutes
    fetchRetries: 2,
    fetchTimeout: 10000, // 10 seconds
  };

  /**
   * Fetch projects data with caching
   */
  async function getProjects(forceRefresh = false) {
    // Return cached if fresh
    if (!forceRefresh && cache.projects && cache.loadedAt) {
      const age = Date.now() - cache.loadedAt;
      if (age < CONFIG.cacheDuration) {
        return cache.projects;
      }
    }

    // Fetch from network
    try {
      const data = await fetchWithRetry();
      cache.projects = data;
      cache.loadedAt = Date.now();
      return data;
    } catch (error) {
      console.error('[DataStore] Failed to fetch projects:', error);

      // Return stale cache if available
      if (cache.projects) {
        console.warn('[DataStore] Returning stale cache');
        return cache.projects;
      }

      throw error;
    }
  }

  /**
   * Fetch with retry logic
   */
  async function fetchWithRetry(retryCount = 0) {
    const urls = [
      './data/projects.json',
      './projects.json',
    ];

    for (const url of urls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.fetchTimeout);

        const response = await fetch(url, {
          signal: controller.signal,
          cache: 'no-cache',
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        if (error.name === 'AbortError') {
          console.warn(`[DataStore] Fetch timeout for ${url}`);
        } else {
          console.warn(`[DataStore] Fetch failed for ${url}:`, error.message);
        }

        // Try next URL
        continue;
      }
    }

    // All URLs failed, retry logic
    if (retryCount < CONFIG.fetchRetries) {
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
      return fetchWithRetry(retryCount + 1);
    }

    throw new Error('All fetch attempts failed');
  }

  /**
   * Find project by slug
   */
  function findProjectBySlug(slug) {
    const projects = cache.projects;
    if (!projects) return null;
    return projects.find(p => p.slug === slug) || null;
  }

  /**
   * Find project by ID
   */
  function findProjectById(id) {
    const projects = cache.projects;
    if (!projects) return null;
    return projects.find(p => p.id === id) || null;
  }

  /**
   * Get featured projects
   */
  function getFeaturedProjects(limit = 6) {
    const projects = cache.projects;
    if (!projects) return [];
    return projects.filter(p => p.featured).slice(0, limit);
  }

  /**
   * Filter projects by criteria
   */
  function filterProjects(options = {}) {
    const projects = cache.projects;
    if (!projects) return [];

    const {
      tags = [],
      statuses = [],
      categories = [],
      search = '',
    } = options;

    return projects.filter(p => {
      // Tag filter
      if (tags.length > 0 && tags[0] !== 'ALL') {
        const hasTag = (p.tags || []).some(t =>
          tags.includes(t) || tags.includes(t.toUpperCase())
        );
        if (!hasTag) return false;
      }

      // Status filter
      if (statuses.length > 0 && statuses[0] !== 'ALL') {
        const matchStatus = (p.status || '').toLowerCase();
        const hasStatus = statuses.some(s =>
          s.toLowerCase() === matchStatus ||
          s.toUpperCase() === (p.status || '').toUpperCase()
        );
        if (!hasStatus) return false;
      }

      // Category filter
      if (categories.length > 0 && categories[0] !== 'ALL') {
        if (!categories.includes(p.category)) return false;
      }

      // Search filter
      if (search) {
        const query = search.toLowerCase();
        const searchable = [
          p.title,
          p.summary,
          p.shortTitle,
          p.category,
          ...(p.tags || []),
          ...(p.skills || []),
        ].join(' ').toLowerCase();

        if (!searchable.includes(query)) return false;
      }

      return true;
    });
  }

  /**
   * Get project count
   */
  function getProjectCount() {
    return cache.projects ? cache.projects.length : 0;
  }

  /**
   * Clear cache
   */
  function clearCache() {
    cache = {
      projects: null,
      loadedAt: null,
    };
  }

  /**
   * Get cache status
   */
  function getCacheStatus() {
    return {
      hasProjects: cache.projects !== null,
      projectCount: cache.projects ? cache.projects.length : 0,
      loadedAt: cache.loadedAt,
      age: cache.loadedAt ? Date.now() - cache.loadedAt : null,
      isFresh: cache.projects && cache.loadedAt &&
        (Date.now() - cache.loadedAt) < CONFIG.cacheDuration,
    };
  }

  // Public API
  return {
    getProjects,
    findProjectBySlug,
    findProjectById,
    getFeaturedProjects,
    filterProjects,
    getProjectCount,
    clearCache,
    getCacheStatus,
  };
})();
