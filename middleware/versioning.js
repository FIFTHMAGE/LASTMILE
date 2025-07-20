/**
 * API Versioning Middleware
 * Handles API version routing and backward compatibility
 */

const semver = require('semver');

/**
 * API Version Configuration
 */
const API_VERSIONS = {
  'v1': '1.0.0',
  'v1.1': '1.1.0',
  'v2': '2.0.0'
};

const CURRENT_VERSION = 'v1';
const SUPPORTED_VERSIONS = ['v1'];
const DEPRECATED_VERSIONS = [];

/**
 * Version Detection Middleware
 * Detects API version from URL path, header, or query parameter
 */
const detectVersion = (req, res, next) => {
  let version = CURRENT_VERSION;
  
  // 1. Check URL path for version (e.g., /api/v1/users)
  const pathMatch = req.path.match(/^\/api\/v(\d+(?:\.\d+)?)\//);
  if (pathMatch) {
    version = `v${pathMatch[1]}`;
    // Remove version from path for downstream processing
    req.originalPath = req.path;
    req.path = req.path.replace(`/v${pathMatch[1]}`, '');
    req.url = req.url.replace(`/v${pathMatch[1]}`, '');
  }
  
  // 2. Check Accept-Version header
  const headerVersion = req.headers['accept-version'];
  if (headerVersion && !pathMatch) {
    version = headerVersion.startsWith('v') ? headerVersion : `v${headerVersion}`;
  }
  
  // 3. Check version query parameter
  const queryVersion = req.query.version;
  if (queryVersion && !pathMatch && !headerVersion) {
    version = queryVersion.startsWith('v') ? queryVersion : `v${queryVersion}`;
    // Remove version from query params
    delete req.query.version;
  }
  
  // Validate version
  if (!API_VERSIONS[version]) {
    return res.status(400).json({
      success: false,
      error: {
        message: `Unsupported API version: ${version}`,
        code: 'UNSUPPORTED_VERSION',
        statusCode: 400,
        supportedVersions: Object.keys(API_VERSIONS),
        timestamp: new Date().toISOString()
      }
    });
  }
  
  // Check if version is deprecated
  if (DEPRECATED_VERSIONS.includes(version)) {
    res.set('X-API-Deprecated', 'true');
    res.set('X-API-Deprecation-Date', getDeprecationDate(version));
    res.set('X-API-Sunset-Date', getSunsetDate(version));
  }
  
  // Set version info in request
  req.apiVersion = version;
  req.apiVersionNumber = API_VERSIONS[version];
  
  // Set response headers
  res.set('X-API-Version', version);
  res.set('X-API-Version-Number', API_VERSIONS[version]);
  
  next();
};

/**
 * Version Compatibility Middleware
 * Handles backward compatibility transformations
 */
const handleCompatibility = (req, res, next) => {
  const version = req.apiVersion;
  
  // Store original response methods
  const originalJson = res.json;
  const originalSend = res.send;
  
  // Override response methods to apply version-specific transformations
  res.json = function(data) {
    const transformedData = applyResponseTransformation(data, version, req);
    return originalJson.call(this, transformedData);
  };
  
  res.send = function(data) {
    if (typeof data === 'object') {
      const transformedData = applyResponseTransformation(data, version, req);
      return originalSend.call(this, transformedData);
    }
    return originalSend.call(this, data);
  };
  
  // Apply request transformations
  req.body = applyRequestTransformation(req.body, version, req);
  
  next();
};

/**
 * Apply version-specific request transformations
 */
const applyRequestTransformation = (data, version, req) => {
  if (!data || typeof data !== 'object') return data;
  
  const transformations = getRequestTransformations(version);
  
  return transformations.reduce((transformedData, transformation) => {
    return transformation(transformedData, req);
  }, { ...data });
};

/**
 * Apply version-specific response transformations
 */
const applyResponseTransformation = (data, version, req) => {
  if (!data || typeof data !== 'object') return data;
  
  const transformations = getResponseTransformations(version);
  
  return transformations.reduce((transformedData, transformation) => {
    return transformation(transformedData, req);
  }, { ...data });
};

/**
 * Get request transformations for a specific version
 */
const getRequestTransformations = (version) => {
  const transformations = [];
  
  switch (version) {
    case 'v1':
      // v1 transformations
      transformations.push(transformV1Request);
      break;
    case 'v1.1':
      // v1.1 transformations (includes v1)
      transformations.push(transformV1Request);
      transformations.push(transformV1_1Request);
      break;
    default:
      break;
  }
  
  return transformations;
};

/**
 * Get response transformations for a specific version
 */
const getResponseTransformations = (version) => {
  const transformations = [];
  
  switch (version) {
    case 'v1':
      // v1 transformations
      transformations.push(transformV1Response);
      break;
    case 'v1.1':
      // v1.1 transformations
      transformations.push(transformV1_1Response);
      break;
    default:
      break;
  }
  
  return transformations;
};

/**
 * Version-specific transformation functions
 */

// V1 Request Transformations
const transformV1Request = (data, req) => {
  // Handle legacy field names
  if (data.businessProfile) {
    data.profile = data.businessProfile;
    delete data.businessProfile;
  }
  
  if (data.riderProfile) {
    data.profile = data.riderProfile;
    delete data.riderProfile;
  }
  
  // Handle legacy coordinate format
  if (data.coordinates && Array.isArray(data.coordinates)) {
    data.location = {
      type: 'Point',
      coordinates: data.coordinates
    };
    delete data.coordinates;
  }
  
  return data;
};

// V1 Response Transformations
const transformV1Response = (data, req) => {
  // Transform new response format to v1 format
  if (data.success !== undefined) {
    // Current format is already v1 compatible
    return data;
  }
  
  // Handle pagination format changes
  if (data.pagination) {
    const { currentPage, totalPages, totalItems, hasNext, hasPrev } = data.pagination;
    data.pagination = {
      page: currentPage,
      pages: totalPages,
      total: totalItems,
      hasNext,
      hasPrev
    };
  }
  
  return data;
};

// V1.1 Request Transformations
const transformV1_1Request = (data, req) => {
  // V1.1 specific transformations
  return data;
};

// V1.1 Response Transformations
const transformV1_1Response = (data, req) => {
  // V1.1 specific transformations
  return data;
};

/**
 * Version Deprecation Utilities
 */
const getDeprecationDate = (version) => {
  const deprecationDates = {
    // Add deprecation dates as versions are deprecated
  };
  
  return deprecationDates[version] || null;
};

const getSunsetDate = (version) => {
  const sunsetDates = {
    // Add sunset dates as versions are deprecated
  };
  
  return sunsetDates[version] || null;
};

/**
 * Version Information Endpoint
 */
const getVersionInfo = (req, res) => {
  const currentVersion = req.apiVersion || CURRENT_VERSION;
  
  res.json({
    success: true,
    data: {
      currentVersion,
      currentVersionNumber: API_VERSIONS[currentVersion],
      supportedVersions: SUPPORTED_VERSIONS.map(v => ({
        version: v,
        versionNumber: API_VERSIONS[v],
        deprecated: DEPRECATED_VERSIONS.includes(v),
        deprecationDate: getDeprecationDate(v),
        sunsetDate: getSunsetDate(v)
      })),
      deprecatedVersions: DEPRECATED_VERSIONS,
      latestVersion: Object.keys(API_VERSIONS).reduce((latest, version) => {
        return semver.gt(API_VERSIONS[version], API_VERSIONS[latest]) ? version : latest;
      }),
      changelog: '/api/changelog',
      documentation: '/api/docs'
    }
  });
};

/**
 * Migration Helper
 * Provides migration guidance for version upgrades
 */
const getMigrationGuide = (req, res) => {
  const fromVersion = req.query.from;
  const toVersion = req.query.to || CURRENT_VERSION;
  
  if (!fromVersion) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Source version (from) is required',
        code: 'MISSING_VERSION',
        statusCode: 400
      }
    });
  }
  
  if (!API_VERSIONS[fromVersion] || !API_VERSIONS[toVersion]) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Invalid version specified',
        code: 'INVALID_VERSION',
        statusCode: 400
      }
    });
  }
  
  const migrationSteps = generateMigrationSteps(fromVersion, toVersion);
  
  res.json({
    success: true,
    data: {
      fromVersion,
      toVersion,
      migrationRequired: fromVersion !== toVersion,
      breakingChanges: getBreakingChanges(fromVersion, toVersion),
      migrationSteps,
      estimatedEffort: calculateMigrationEffort(fromVersion, toVersion),
      supportEndDate: getSunsetDate(fromVersion)
    }
  });
};

/**
 * Generate migration steps between versions
 */
const generateMigrationSteps = (fromVersion, toVersion) => {
  const steps = [];
  
  // Define migration paths
  const migrationPaths = {
    'v1-v1.1': [
      {
        step: 1,
        title: 'Update API endpoints',
        description: 'No breaking changes, all v1 endpoints remain compatible',
        action: 'optional',
        impact: 'low'
      },
      {
        step: 2,
        title: 'Adopt new features',
        description: 'Take advantage of new v1.1 features like enhanced filtering',
        action: 'recommended',
        impact: 'low'
      }
    ],
    'v1-v2': [
      {
        step: 1,
        title: 'Review breaking changes',
        description: 'Review all breaking changes documented in the changelog',
        action: 'required',
        impact: 'high'
      },
      {
        step: 2,
        title: 'Update authentication',
        description: 'Migrate to new authentication system if applicable',
        action: 'required',
        impact: 'medium'
      },
      {
        step: 3,
        title: 'Update data models',
        description: 'Update request/response handling for changed data models',
        action: 'required',
        impact: 'high'
      },
      {
        step: 4,
        title: 'Test thoroughly',
        description: 'Comprehensive testing of all integrated endpoints',
        action: 'required',
        impact: 'medium'
      }
    ]
  };
  
  const pathKey = `${fromVersion}-${toVersion}`;
  return migrationPaths[pathKey] || [];
};

/**
 * Get breaking changes between versions
 */
const getBreakingChanges = (fromVersion, toVersion) => {
  const breakingChanges = {
    'v1-v2': [
      {
        endpoint: '/api/auth/login',
        change: 'Response format updated',
        description: 'Login response now includes additional user metadata',
        impact: 'medium',
        migration: 'Update response parsing to handle new fields'
      }
    ]
  };
  
  const pathKey = `${fromVersion}-${toVersion}`;
  return breakingChanges[pathKey] || [];
};

/**
 * Calculate migration effort
 */
const calculateMigrationEffort = (fromVersion, toVersion) => {
  const effortMatrix = {
    'v1-v1.1': 'low',
    'v1-v2': 'high',
    'v1.1-v2': 'medium'
  };
  
  const pathKey = `${fromVersion}-${toVersion}`;
  return effortMatrix[pathKey] || 'unknown';
};

/**
 * Middleware to handle version-specific route loading
 */
const versionedRoute = (versions) => {
  return (req, res, next) => {
    const requestedVersion = req.apiVersion;
    
    if (versions[requestedVersion]) {
      // Load version-specific route handler
      return versions[requestedVersion](req, res, next);
    }
    
    // Fallback to default version
    const defaultVersion = versions[CURRENT_VERSION] || versions.default;
    if (defaultVersion) {
      return defaultVersion(req, res, next);
    }
    
    // No handler found
    res.status(501).json({
      success: false,
      error: {
        message: `Version ${requestedVersion} not implemented for this endpoint`,
        code: 'VERSION_NOT_IMPLEMENTED',
        statusCode: 501
      }
    });
  };
};

module.exports = {
  detectVersion,
  handleCompatibility,
  getVersionInfo,
  getMigrationGuide,
  versionedRoute,
  API_VERSIONS,
  CURRENT_VERSION,
  SUPPORTED_VERSIONS,
  DEPRECATED_VERSIONS
};