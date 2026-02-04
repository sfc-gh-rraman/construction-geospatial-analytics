#!/bin/bash
# ============================================================================
# TERRA - SPCS Deployment Script
# ============================================================================
# This script builds and deploys TERRA to Snowpark Container Services.
#
# Prerequisites:
# - Docker installed and running
# - snow CLI configured with appropriate credentials
# - Snowflake account with SPCS enabled
#
# Usage:
#   ./deploy.sh [build|push|deploy|all]

set -e

# Configuration
REPO_NAME="terra_repo"
IMAGE_NAME="terra"
IMAGE_TAG="latest"
DATABASE="CONSTRUCTION_GEO_DB"
SCHEMA="CONSTRUCTION_GEO"
COMPUTE_POOL="TERRA_POOL"
SERVICE_NAME="terra_service"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Get the repository URL from Snowflake
get_repo_url() {
    log_info "Getting repository URL from Snowflake..."
    REPO_URL=$(snow sql -q "SHOW IMAGE REPOSITORIES IN SCHEMA ${DATABASE}.${SCHEMA}" --format json | \
        python3 -c "import sys, json; repos = json.load(sys.stdin); print([r['repository_url'] for r in repos if r['name'] == '${REPO_NAME}'][0] if repos else '')")
    
    if [ -z "$REPO_URL" ]; then
        log_error "Could not find repository ${REPO_NAME}. Creating it..."
        snow sql -q "CREATE IMAGE REPOSITORY IF NOT EXISTS ${DATABASE}.${SCHEMA}.${REPO_NAME}"
        REPO_URL=$(snow sql -q "SHOW IMAGE REPOSITORIES IN SCHEMA ${DATABASE}.${SCHEMA}" --format json | \
            python3 -c "import sys, json; repos = json.load(sys.stdin); print([r['repository_url'] for r in repos if r['name'] == '${REPO_NAME}'][0])")
    fi
    
    log_info "Repository URL: ${REPO_URL}"
}

# Build Docker image
build() {
    log_info "Building Docker image..."
    cd "$(dirname "$0")/.."
    
    docker build -t ${IMAGE_NAME}:${IMAGE_TAG} -f deploy/Dockerfile .
    
    log_info "Docker image built successfully"
}

# Push image to Snowflake repository
push() {
    get_repo_url
    
    log_info "Logging in to Snowflake repository..."
    snow spcs image-registry login
    
    FULL_IMAGE_URL="${REPO_URL}/${IMAGE_NAME}:${IMAGE_TAG}"
    
    log_info "Tagging image as ${FULL_IMAGE_URL}..."
    docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${FULL_IMAGE_URL}
    
    log_info "Pushing image to Snowflake..."
    docker push ${FULL_IMAGE_URL}
    
    log_info "Image pushed successfully"
}

# Deploy service to SPCS
deploy() {
    log_info "Deploying service to SPCS..."
    
    # Check if compute pool exists
    POOL_EXISTS=$(snow sql -q "SHOW COMPUTE POOLS LIKE '${COMPUTE_POOL}'" --format json | python3 -c "import sys, json; print(len(json.load(sys.stdin)) > 0)")
    
    if [ "$POOL_EXISTS" != "True" ]; then
        log_warn "Compute pool ${COMPUTE_POOL} does not exist. Creating..."
        snow sql -q "CREATE COMPUTE POOL ${COMPUTE_POOL}
            MIN_NODES = 1
            MAX_NODES = 2
            INSTANCE_FAMILY = CPU_X64_S"
    fi
    
    # Drop existing service if exists
    log_info "Dropping existing service if exists..."
    snow sql -q "DROP SERVICE IF EXISTS ${DATABASE}.${SCHEMA}.${SERVICE_NAME}"
    
    # Create service
    log_info "Creating service..."
    snow sql -q "CREATE SERVICE ${DATABASE}.${SCHEMA}.${SERVICE_NAME}
        IN COMPUTE POOL ${COMPUTE_POOL}
        FROM SPECIFICATION \$\$
spec:
  containers:
    - name: terra
      image: /${DATABASE}/${SCHEMA}/${REPO_NAME}/${IMAGE_NAME}:${IMAGE_TAG}
      env:
        SNOWFLAKE_DATABASE: ${DATABASE}
        SNOWFLAKE_SCHEMA: ${SCHEMA}
        SNOWFLAKE_WAREHOUSE: CONSTRUCTION_WH
      resources:
        requests:
          memory: 2Gi
          cpu: 1
        limits:
          memory: 4Gi
          cpu: 2
      readinessProbe:
        port: 8080
        path: /health
  endpoints:
    - name: terra
      port: 8080
      public: true
\$\$
        EXTERNAL_ACCESS_INTEGRATIONS = (TERRA_MAP_TILES_ACCESS)
        MIN_INSTANCES = 1
        MAX_INSTANCES = 2"
    
    log_info "Waiting for service to start..."
    sleep 10
    
    # Get service URL
    SERVICE_URL=$(snow sql -q "SHOW ENDPOINTS IN SERVICE ${DATABASE}.${SCHEMA}.${SERVICE_NAME}" --format json | \
        python3 -c "import sys, json; eps = json.load(sys.stdin); print(eps[0]['ingress_url'] if eps else 'Not available yet')")
    
    log_info "Service deployed!"
    log_info "Service URL: ${SERVICE_URL}"
}

# Show service status
status() {
    log_info "Service status:"
    snow sql -q "DESCRIBE SERVICE ${DATABASE}.${SCHEMA}.${SERVICE_NAME}"
    
    log_info "Service endpoints:"
    snow sql -q "SHOW ENDPOINTS IN SERVICE ${DATABASE}.${SCHEMA}.${SERVICE_NAME}"
    
    log_info "Service logs:"
    snow sql -q "SELECT * FROM TABLE(${DATABASE}.${SCHEMA}.${SERVICE_NAME}!GET_SERVICE_LOGS('terra', 0, 50))"
}

# Main
case "${1:-all}" in
    build)
        build
        ;;
    push)
        push
        ;;
    deploy)
        deploy
        ;;
    status)
        status
        ;;
    all)
        build
        push
        deploy
        ;;
    *)
        echo "Usage: $0 [build|push|deploy|status|all]"
        exit 1
        ;;
esac

log_info "Done!"
