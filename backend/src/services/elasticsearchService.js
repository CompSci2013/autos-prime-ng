const { esClient, ELASTICSEARCH_INDEX } = require('../config/elasticsearch');

/**
 * Get manufacturer-model combinations using Elasticsearch aggregations
 * @param {Object} options - Query options (page, size, search, filters)
 * @returns {Object} - Aggregated manufacturer-model data
 */
async function getManufacturerModelCombinations(options = {}) {
  const { page = 1, size = 50, search = '', manufacturer = null } = options;

  try {
    // Build query
    const query = {
      bool: {
        must: [],
      },
    };

    // Add search if provided - use different query types for different fields
    if (search) {
      query.bool.must.push({
        bool: {
          should: [
            {
              match: {
                manufacturer: {
                  query: search,
                  fuzziness: 'AUTO',
                },
              },
            },
            {
              match: {
                model: {
                  query: search,
                  fuzziness: 'AUTO',
                },
              },
            },
            {
              term: {
                'body_class.keyword': search,
              },
            },
          ],
          minimum_should_match: 1,
        },
      });
    }

    // Add manufacturer filter if provided
    if (manufacturer) {
      query.bool.must.push({
        term: { 'manufacturer.keyword': manufacturer },
      });
    }

    // If no filters, match all
    if (query.bool.must.length === 0) {
      query.bool.must.push({ match_all: {} });
    }

    // Execute aggregation query
    const response = await esClient.search({
      index: ELASTICSEARCH_INDEX,
      size: 0, // We only want aggregations, not documents
      query: query,
      aggs: {
        manufacturers: {
          terms: {
            field: 'manufacturer.keyword',
            size: 100,
            order: { _key: 'asc' },
          },
          aggs: {
            models: {
              terms: {
                field: 'model.keyword',
                size: 100,
                order: { _key: 'asc' },
              },
            },
          },
        },
      },
    });

    // Extract and format results
    const manufacturers = response.aggregations.manufacturers.buckets.map(
      (bucket) => ({
        manufacturer: bucket.key,
        count: bucket.doc_count,
        models: bucket.models.buckets.map((modelBucket) => ({
          model: modelBucket.key,
          count: modelBucket.doc_count,
        })),
      })
    );

    // Apply pagination to manufacturers array
    const startIndex = (page - 1) * size;
    const endIndex = startIndex + size;
    const paginatedManufacturers = manufacturers.slice(startIndex, endIndex);

    return {
      total: manufacturers.length,
      page: parseInt(page),
      size: parseInt(size),
      totalPages: Math.ceil(manufacturers.length / size),
      data: paginatedManufacturers,
    };
  } catch (error) {
    console.error('Elasticsearch query error:', error);
    throw new Error(`Failed to fetch vehicle data: ${error.message}`);
  }
}

/**
 * Get detailed vehicle records for specific manufacturer-model combinations
 * @param {Object} options - Query options
 * @param {Array} options.modelCombos - Array of {manufacturer, model} objects
 * @param {number} options.page - Page number (1-indexed)
 * @param {number} options.size - Results per page
 * @param {Object} options.filters - Filter criteria
 * @param {string} options.sortBy - Field to sort by
 * @param {string} options.sortOrder - Sort order (asc/desc)
 * @returns {Object} - Paginated vehicle detail records
 */
async function getVehicleDetails(options = {}) {
  const {
    modelCombos = [],
    page = 1,
    size = 20,
    filters = {},
    highlights = {},  // NEW: Highlight filters for segmented statistics
    sortBy = null,
    sortOrder = 'asc',
  } = options;

  try {
    // Build the main query
    let query;

    if (modelCombos.length > 0) {
      // Build boolean query with should clauses for each manufacturer-model pair
      const shouldClauses = modelCombos.map((combo) => ({
        bool: {
          must: [
            { term: { 'manufacturer.keyword': combo.manufacturer } },
            { term: { 'model.keyword': combo.model } },
          ],
        },
      }));

      query = {
        bool: {
          should: shouldClauses,
          minimum_should_match: 1,
          filter: [],
        },
      };
    } else {
      // No model combos specified - match all vehicles
      query = {
        bool: {
          must: [{ match_all: {} }],
          filter: [],
        },
      };
    }

    // Pattern 2: Field-specific search parameters (partial matching on individual fields)
    // Used by table column filters - each column searches ONLY its own field

    // Manufacturer search (partial matching on manufacturer field only)
    if (filters.manufacturerSearch) {
      query.bool.filter.push({
        match_phrase_prefix: {
          manufacturer: {
            query: filters.manufacturerSearch,
            max_expansions: 50
          }
        }
      });
    }

    // Model search (partial matching on model field only)
    if (filters.modelSearch) {
      query.bool.filter.push({
        match_phrase_prefix: {
          model: {
            query: filters.modelSearch,
            max_expansions: 50
          }
        }
      });
    }

    // Body class search (partial matching on body_class field only)
    if (filters.bodyClassSearch) {
      const searchTerm = filters.bodyClassSearch.toLowerCase();
      query.bool.filter.push({
        wildcard: {
          'body_class': {
            value: `*${searchTerm}*`,
            case_insensitive: true
          }
        }
      });
    }

    // Data source search (partial matching on data_source field only)
    if (filters.dataSourceSearch) {
      const searchTerm = filters.dataSourceSearch.toLowerCase();
      query.bool.filter.push({
        wildcard: {
          'data_source': {
            value: `*${searchTerm}*`,
            case_insensitive: true
          }
        }
      });
    }

    // Apply filters (exact matching for Query Control selections)
    if (filters.manufacturer) {
      // Handle comma-separated manufacturers (OR logic)
      const manufacturers = filters.manufacturer.split(',').map(m => m.trim()).filter(m => m);

      if (manufacturers.length === 1) {
        // Single manufacturer: exact match using term query
        query.bool.filter.push({
          term: {
            'manufacturer.keyword': manufacturers[0]
          }
        });
      } else if (manufacturers.length > 1) {
        // Multiple manufacturers: OR logic with exact matching
        query.bool.filter.push({
          bool: {
            should: manufacturers.map(mfr => ({
              term: { 'manufacturer.keyword': mfr }
            })),
            minimum_should_match: 1,
          },
        });
      }
    }

    if (filters.model) {
      // Handle comma-separated models (OR logic)
      const models = filters.model.split(',').map(m => m.trim()).filter(m => m);

      if (models.length === 1) {
        // Single model: exact match using term query
        query.bool.filter.push({
          term: {
            'model.keyword': models[0]
          }
        });
      } else if (models.length > 1) {
        // Multiple models: OR logic with exact matching
        query.bool.filter.push({
          bool: {
            should: models.map(mdl => ({
              term: { 'model.keyword': mdl }
            })),
            minimum_should_match: 1,
          },
        });
      }
    }

    if (filters.yearMin !== undefined) {
      query.bool.filter.push({
        range: {
          year: { gte: filters.yearMin },
        },
      });
    }

    if (filters.yearMax !== undefined) {
      query.bool.filter.push({
        range: {
          year: { lte: filters.yearMax },
        },
      });
    }

    if (filters.bodyClass) {
      // Exact match using term query (Query Control selections)
      query.bool.filter.push({
        term: {
          'body_class': filters.bodyClass
        }
      });
    }

    if (filters.dataSource) {
      // Exact match using term query (Query Control selections)
      query.bool.filter.push({
        term: {
          'data_source': filters.dataSource
        }
      });
    }

    // Build sort array
    let sort;
    if (sortBy) {
      // Only manufacturer and model need .keyword (they are text fields with keyword sub-fields)
      // body_class and data_source are already pure keyword types
      // year is an integer type
      const sortField =
        sortBy === 'manufacturer' || sortBy === 'model'
          ? `${sortBy}.keyword`
          : sortBy;

      sort = [{ [sortField]: { order: sortOrder } }];
    } else {
      // Default sort
      sort = [
        { 'manufacturer.keyword': { order: 'asc' } },
        { 'model.keyword': { order: 'asc' } },
        { year: { order: 'desc' } },
      ];
    }

    // Calculate pagination
    const from = (page - 1) * size;

    // Build highlight filter for sub-aggregations
    const highlightFilter = { bool: { filter: [] } };
    let hasHighlights = false;

    if (highlights.yearMin !== undefined || highlights.yearMax !== undefined) {
      const yearRange = { range: { year: {} } };
      if (highlights.yearMin !== undefined) yearRange.range.year.gte = highlights.yearMin;
      if (highlights.yearMax !== undefined) yearRange.range.year.lte = highlights.yearMax;
      highlightFilter.bool.filter.push(yearRange);
      hasHighlights = true;
    }

    if (highlights.manufacturer) {
      // Support comma-separated values for multi-select highlighting
      const manufacturers = highlights.manufacturer.split(',').map(m => m.trim()).filter(m => m);
      if (manufacturers.length > 0) {
        highlightFilter.bool.filter.push({
          terms: { 'manufacturer.keyword': manufacturers }
        });
        hasHighlights = true;
      }
    }

    if (highlights.modelCombos && highlights.modelCombos.length > 0) {
      // Model combos: Array of {manufacturer, model} pairs
      // Create OR query with AND conditions for each pair
      // Example: (manufacturer=Dodge AND model=Charger) OR (manufacturer=Chevrolet AND model=Camaro)
      const modelComboQueries = highlights.modelCombos.map(combo => ({
        bool: {
          must: [
            { term: { 'manufacturer.keyword': combo.manufacturer } },
            { term: { 'model.keyword': combo.model } }
          ]
        }
      }));

      highlightFilter.bool.filter.push({
        bool: {
          should: modelComboQueries,
          minimum_should_match: 1
        }
      });
      hasHighlights = true;
    }

    if (highlights.bodyClass) {
      // Support comma-separated values for multi-select highlighting
      const bodyClasses = highlights.bodyClass.split(',').map(b => b.trim()).filter(b => b);
      if (bodyClasses.length > 0) {
        highlightFilter.bool.filter.push({
          terms: { 'body_class': bodyClasses }
        });
        hasHighlights = true;
      }
    }

    // Build sub-aggregation for highlighted portion
    const highlightedSubAgg = hasHighlights ? {
      highlighted: {
        filter: highlightFilter,
      }
    } : {};

    // Execute search query with aggregations for statistics
    const response = await esClient.search({
      index: ELASTICSEARCH_INDEX,
      from: from,
      size: size,
      query: query,
      sort: sort,
      aggs: {
        // Aggregation 1: By Manufacturer (with segmented sub-agg)
        by_manufacturer: {
          terms: {
            field: 'manufacturer.keyword',
            size: 100,
            order: { _count: 'desc' }
          },
          aggs: highlightedSubAgg
        },

        // Aggregation 2: Models by Manufacturer (nested)
        models_by_manufacturer: {
          terms: {
            field: 'manufacturer.keyword',
            size: 100
          },
          aggs: {
            models: {
              terms: {
                field: 'model.keyword',
                size: 50
              },
              aggs: highlightedSubAgg
            }
          }
        },

        // Aggregation 3: By Year (individual years, with segmented sub-agg)
        by_year_range: {
          terms: {
            field: 'year',
            size: 100,  // Support up to 100 years
            order: { _key: 'asc' }  // Sort by year ascending
          },
          aggs: highlightedSubAgg
        },

        // Aggregation 4: By Body Class (with segmented sub-agg)
        by_body_class: {
          terms: {
            field: 'body_class',
            size: 20,
            order: { _count: 'desc' }
          },
          aggs: highlightedSubAgg
        }
      }
    });

    // Extract hits
    const results = response.hits.hits.map((hit) => hit._source);

    // Query autos-vins index to get instance counts for each vehicle_id
    // Only query if we have results to avoid unnecessary calls
    if (results.length > 0) {
      try {
        const vehicleIds = results.map(v => v.vehicle_id);

        const vinCountResponse = await esClient.search({
          index: 'autos-vins',
          size: 0,  // We only need aggregations, not individual documents
          query: {
            terms: { vehicle_id: vehicleIds }  // Match any of the vehicle_ids from results
          },
          aggs: {
            instance_counts: {
              terms: {
                field: 'vehicle_id',
                size: vehicleIds.length  // Get counts for all vehicles in this page
              }
            }
          }
        });

        // Build a map of vehicle_id -> instance_count for fast lookup
        const instanceCountMap = {};
        if (vinCountResponse.aggregations && vinCountResponse.aggregations.instance_counts) {
          vinCountResponse.aggregations.instance_counts.buckets.forEach(bucket => {
            instanceCountMap[bucket.key] = bucket.doc_count;
          });
        }

        // Add instance_count to each result
        results.forEach(vehicle => {
          vehicle.instance_count = instanceCountMap[vehicle.vehicle_id] || 0;
        });
      } catch (vinError) {
        console.error('Error fetching VIN instance counts:', vinError);
        // Don't fail the entire request - just set instance_count to null
        results.forEach(vehicle => {
          vehicle.instance_count = null;
        });
      }
    }

    // Transform aggregations into statistics object
    const statistics = {
      byManufacturer: transformTermsAgg(response.aggregations.by_manufacturer),
      modelsByManufacturer: transformNestedAgg(response.aggregations.models_by_manufacturer),
      byYearRange: transformTermsAgg(response.aggregations.by_year_range),  // Now using terms agg for individual years
      byBodyClass: transformTermsAgg(response.aggregations.by_body_class),
      totalCount: response.hits.total.value
    };

    return {
      total: response.hits.total.value,
      page: parseInt(page),
      size: parseInt(size),
      totalPages: Math.ceil(response.hits.total.value / size),
      query: {
        modelCombos: modelCombos,
        filters: filters,
        sortBy: sortBy,
        sortOrder: sortOrder,
      },
      results: results,
      statistics: statistics // NEW
    };
  } catch (error) {
    console.error('Elasticsearch vehicle details query error:', error);
    throw new Error(`Failed to fetch vehicle details: ${error.message}`);
  }
}

/**
 * Get distinct manufacturers for filter dropdown
 * @param {string} searchTerm - Optional search term to filter manufacturers
 * @param {number} limit - Maximum number of results (default: 1000)
 * @returns {Array} - Sorted array of manufacturer names
 */
async function getDistinctManufacturers(searchTerm = '', limit = 1000) {
  try {
    // Build query based on search term
    let query = { match_all: {} };

    if (searchTerm && searchTerm.trim()) {
      // Use wildcard query on keyword field for prefix matching
      // This ensures "for" matches "Ford" but not "Freightliner"
      query = {
        wildcard: {
          'manufacturer.keyword': {
            value: `${searchTerm.toLowerCase()}*`,
            case_insensitive: true,
          },
        },
      };
    }

    const response = await esClient.search({
      index: ELASTICSEARCH_INDEX,
      size: 0,
      query: query,
      aggs: {
        manufacturers: {
          terms: {
            field: 'manufacturer.keyword',
            size: limit,
            order: { _key: 'asc' },
          },
        },
      },
    });

    return response.aggregations.manufacturers.buckets.map((bucket) => bucket.key);
  } catch (error) {
    console.error('Error fetching manufacturers:', error);
    throw new Error(`Failed to fetch manufacturers: ${error.message}`);
  }
}

/**
 * Get distinct models for filter dropdown
 * @returns {Array} - Sorted array of model names
 */
async function getDistinctModels(searchTerm = '', limit = 1000) {
  try {
    // Build query based on search term
    let query = { match_all: {} };

    if (searchTerm && searchTerm.trim()) {
      // Use wildcard query on keyword field for prefix matching
      // This ensures "bon" matches "Bonneville" but not "3 ton"
      query = {
        wildcard: {
          'model.keyword': {
            value: `${searchTerm.toLowerCase()}*`,
            case_insensitive: true,
          },
        },
      };
    }

    const response = await esClient.search({
      index: ELASTICSEARCH_INDEX,
      size: 0,
      query: query,
      aggs: {
        models: {
          terms: {
            field: 'model.keyword',
            size: limit,
            order: { _key: 'asc' },
          },
        },
      },
    });

    return response.aggregations.models.buckets.map((bucket) => bucket.key);
  } catch (error) {
    console.error('Error fetching models:', error);
    throw new Error(`Failed to fetch models: ${error.message}`);
  }
}

/**
 * Get distinct body classes for filter dropdown
 * @returns {Array} - Sorted array of body class names
 */
async function getDistinctBodyClasses() {
  try {
    const response = await esClient.search({
      index: ELASTICSEARCH_INDEX,
      size: 0,
      query: { match_all: {} },
      aggs: {
        body_classes: {
          terms: {
            field: 'body_class',
            size: 100,
            order: { _key: 'asc' },
          },
        },
      },
    });

    return response.aggregations.body_classes.buckets.map((bucket) => bucket.key);
  } catch (error) {
    console.error('Error fetching body classes:', error);
    throw new Error(`Failed to fetch body classes: ${error.message}`);
  }
}

/**
 * Get distinct data sources for filter dropdown
 * @returns {Array} - Sorted array of data source names
 */
async function getDistinctDataSources() {
  try {
    const response = await esClient.search({
      index: ELASTICSEARCH_INDEX,
      size: 0,
      query: { match_all: {} },
      aggs: {
        data_sources: {
          terms: {
            field: 'data_source',
            size: 50,
            order: { _key: 'asc' },
          },
        },
      },
    });

    return response.aggregations.data_sources.buckets.map((bucket) => bucket.key);
  } catch (error) {
    console.error('Error fetching data sources:', error);
    throw new Error(`Failed to fetch data sources: ${error.message}`);
  }
}

/**
 * Get year range for filter dropdown
 * @returns {Object} - {min: number, max: number}
 */
async function getYearRange() {
  try {
    const response = await esClient.search({
      index: ELASTICSEARCH_INDEX,
      size: 0,
      aggs: {
        year_stats: {
          stats: {
            field: 'year',
          },
        },
      },
    });

    const stats = response.aggregations.year_stats;
    return {
      min: Math.floor(stats.min),
      max: Math.ceil(stats.max),
    };
  } catch (error) {
    console.error('Error fetching year range:', error);
    throw new Error(`Failed to fetch year range: ${error.message}`);
  }
}

/**
 * Transform terms aggregation to object format
 * @param {Object} agg - Elasticsearch terms aggregation
 * @returns {Object} - { "key": count }
 */
function transformTermsAgg(agg) {
  return agg.buckets.reduce((acc, bucket) => {
    // Check if bucket has highlighted sub-aggregation (segmented data)
    if (bucket.highlighted !== undefined) {
      acc[bucket.key] = {
        total: bucket.doc_count,
        highlighted: bucket.highlighted.doc_count
      };
    } else {
      // Legacy format (no highlights)
      acc[bucket.key] = bucket.doc_count;
    }
    return acc;
  }, {});
}

/**
 * Transform nested aggregation (manufacturer -> models)
 * @param {Object} agg - Elasticsearch nested aggregation
 * @returns {Object} - { "manufacturer": { "model": count } }
 */
function transformNestedAgg(agg) {
  return agg.buckets.reduce((acc, mfrBucket) => {
    acc[mfrBucket.key] = mfrBucket.models.buckets.reduce((models, modelBucket) => {
      // Check if model bucket has highlighted sub-aggregation (segmented data)
      if (modelBucket.highlighted !== undefined) {
        models[modelBucket.key] = {
          total: modelBucket.doc_count,
          highlighted: modelBucket.highlighted.doc_count
        };
      } else {
        // Legacy format (no highlights)
        models[modelBucket.key] = modelBucket.doc_count;
      }
      return models;
    }, {});
    return acc;
  }, {});
}

/**
 * Transform range aggregation to object format
 * @param {Object} agg - Elasticsearch range aggregation
 * @returns {Object} - { "range-key": count }
 */
function transformRangeAgg(agg) {
  return agg.buckets.reduce((acc, bucket) => {
    acc[bucket.key] = bucket.doc_count;
    return acc;
  }, {});
}

module.exports = {
  getManufacturerModelCombinations,
  getVehicleDetails,
  getDistinctManufacturers,
  getDistinctModels,
  getDistinctBodyClasses,
  getDistinctDataSources,
  getYearRange,
};
