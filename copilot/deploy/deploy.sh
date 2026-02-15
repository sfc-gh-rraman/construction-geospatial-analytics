#!/bin/bash
# =============================================================================
# TERRA Geospatial Analytics - SPCS Deployment Script
# =============================================================================
# This script builds and deploys the TERRA application to Snowpark Container Services
#
# Usage:
#   ./deploy.sh              # Full deployment (build + push + deploy)
#   ./deploy.sh build        # Build Docker image only
#   ./deploy.sh push         # Push to Snowflake registry only
#   ./deploy.sh deploy       # Deploy/update service only
#   ./deploy.sh logs         # View service logs
#   ./deploy.sh status       # Check service status
#   ./deploy.sh stop         # Stop the service
#   ./deploy.sh setup        # Create compute pool and image repository
# =============================================================================

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
IMAGE_NAME="terra"
IMAGE_TAG="latest"

# Snowflake Configuration
DATABASE="CONSTRUCTION_GEO_DB"
SCHEMA="SPCS"
IMAGE_REPO="TERRA_IMAGES"
COMPUTE_POOL="TERRA_COMPUTE_POOL"
SERVICE_NAME="TERRA_SERVICE"
CONNECTION="${SNOWFLAKE_CONNECTION:-my_snowflake}"

# Registry URL (will be populated dynamically)
REGISTRY_URL=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Setup SPCS infrastructure
setup_spcs() {
    log_info "Setting up SPCS infrastructure..."
    
    # Create SPCS schema
    log_info "Creating SPCS schema..."
    snow sql -c $CONNECTION -q "
    USE DATABASE $DATABASE;
    CREATE SCHEMA IF NOT EXISTS SPCS;
    "
    
    # Create image repository
    log_info "Creating image repository..."
    snow sql -c $CONNECTION -q "
    CREATE IMAGE REPOSITORY IF NOT EXISTS $DATABASE.$SCHEMA.$IMAGE_REPO;
    " 2>/dev/null || log_warning "Image repository may already exist"
    
    # Create compute pool
    log_info "Creating compute pool..."
    snow sql -c $CONNECTION -q "
    CREATE COMPUTE POOL IF NOT EXISTS $COMPUTE_POOL
    MIN_NODES = 1
    MAX_NODES = 2
    INSTANCE_FAMILY = CPU_X64_XS
    AUTO_RESUME = TRUE
    AUTO_SUSPEND_SECS = 300;
    " 2>/dev/null || log_warning "Compute pool may already exist"
    
    # Create external access for map tiles
    log_info "Creating external access integration for map tiles..."
    snow sql -c $CONNECTION -q "
    CREATE OR REPLACE NETWORK RULE TERRA_MAP_NETWORK_RULE
      MODE = EGRESS
      TYPE = HOST_PORT
      VALUE_LIST = (
        'a.tile.openstreetmap.org:443',
        'b.tile.openstreetmap.org:443',
        'c.tile.openstreetmap.org:443',
        'tile.openstreetmap.org:443'
      );
    " 2>/dev/null || log_warning "Network rule may already exist"
    
    snow sql -c $CONNECTION -q "
    CREATE OR REPLACE EXTERNAL ACCESS INTEGRATION TERRA_MAP_TILES_ACCESS
      ALLOWED_NETWORK_RULES = (TERRA_MAP_NETWORK_RULE)
      ENABLED = TRUE
      COMMENT = 'Allow SPCS to fetch OpenStreetMap tiles for equipment tracking map';
    " 2>/dev/null || log_warning "External access integration may already exist"
    
    log_success "SPCS infrastructure setup complete!"
}

# Get the Snowflake registry URL
get_registry_url() {
    log_info "Getting Snowflake registry URL..."
    REGISTRY_URL=$(snow sql -c $CONNECTION -q "SHOW IMAGE REPOSITORIES LIKE '$IMAGE_REPO' IN SCHEMA $DATABASE.$SCHEMA" --format JSON 2>/dev/null | \
        python3 -c "import sys, json; data = json.load(sys.stdin); print(data[0]['repository_url'])" 2>/dev/null)
    
    if [ -z "$REGISTRY_URL" ]; then
        log_error "Failed to get registry URL. Run './deploy.sh setup' first."
        exit 1
    fi
    
    log_info "Registry URL: $REGISTRY_URL"
}

# Build the Docker image
build_image() {
    log_info "Building Docker image..."
    cd "$PROJECT_DIR"
    
    echo -e "${CYAN}"
    echo " ████████╗███████╗██████╗ ██████╗  █████╗ "
    echo " ╚══██╔══╝██╔════╝██╔══██╗██╔══██╗██╔══██╗"
    echo "    ██║   █████╗  ██████╔╝██████╔╝███████║"
    echo "    ██║   ██╔══╝  ██╔══██╗██╔══██╗██╔══██║"
    echo "    ██║   ███████╗██║  ██║██║  ██║██║  ██║"
    echo "    ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝"
    echo "    Geospatial Analytics Platform"
    echo -e "${NC}"
    
    # Build multi-platform image for SPCS (linux/amd64)
    docker build \
        --platform linux/amd64 \
        -f deploy/Dockerfile \
        -t "${IMAGE_NAME}:${IMAGE_TAG}" \
        .
    
    log_success "Docker image built: ${IMAGE_NAME}:${IMAGE_TAG}"
}

# Login to Snowflake registry and push image
push_image() {
    get_registry_url
    
    log_info "Logging into Snowflake registry..."
    # Use Snow CLI for registry login
    snow spcs image-registry login -c $CONNECTION
    
    log_info "Tagging image for Snowflake registry..."
    FULL_IMAGE_URL="${REGISTRY_URL}/${IMAGE_NAME}:${IMAGE_TAG}"
    docker tag "${IMAGE_NAME}:${IMAGE_TAG}" "$FULL_IMAGE_URL"
    
    log_info "Pushing image to Snowflake registry..."
    docker push "$FULL_IMAGE_URL"
    
    log_success "Image pushed: $FULL_IMAGE_URL"
}

# Deploy or update the service
deploy_service() {
    get_registry_url
    FULL_IMAGE_URL="${REGISTRY_URL}/${IMAGE_NAME}:${IMAGE_TAG}"
    
    log_info "Checking compute pool status..."
    POOL_STATUS=$(snow sql -c $CONNECTION -q "DESCRIBE COMPUTE POOL $COMPUTE_POOL" --format JSON 2>/dev/null | \
        python3 -c "import sys, json; data = json.load(sys.stdin); print(data[0].get('state', 'UNKNOWN'))" 2>/dev/null || echo "UNKNOWN")
    
    log_info "Compute pool status: $POOL_STATUS"
    
    if [ "$POOL_STATUS" == "SUSPENDED" ]; then
        log_info "Resuming compute pool..."
        snow sql -c $CONNECTION -q "ALTER COMPUTE POOL $COMPUTE_POOL RESUME"
        log_info "Waiting for compute pool to become active..."
        sleep 30
    fi
    
    log_info "Deploying service..."
    
    # Check if service exists
    SERVICE_EXISTS=$(snow sql -c $CONNECTION -q "SHOW SERVICES LIKE '$SERVICE_NAME' IN SCHEMA $DATABASE.$SCHEMA" --format JSON 2>/dev/null | \
        python3 -c "import sys, json; data = json.load(sys.stdin); print('yes' if data else 'no')" 2>/dev/null || echo "no")
    
    if [ "$SERVICE_EXISTS" == "yes" ]; then
        log_info "Service exists. Updating..."
        snow sql -c $CONNECTION -q "ALTER SERVICE $DATABASE.$SCHEMA.$SERVICE_NAME FROM SPECIFICATION \$\$
spec:
  containers:
    - name: terra
      image: $FULL_IMAGE_URL
      env:
        SNOWFLAKE_DATABASE: $DATABASE
        SNOWFLAKE_SCHEMA: CONSTRUCTION_GEO
        SNOWFLAKE_WAREHOUSE: CONSTRUCTION_WH
        LOG_LEVEL: INFO
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
    - name: terra-endpoint
      port: 8080
      public: true
\$\$"
    else
        log_info "Creating new service..."
        snow sql -c $CONNECTION -q "CREATE SERVICE $DATABASE.$SCHEMA.$SERVICE_NAME
IN COMPUTE POOL $COMPUTE_POOL
FROM SPECIFICATION \$\$
spec:
  containers:
    - name: terra
      image: $FULL_IMAGE_URL
      env:
        SNOWFLAKE_DATABASE: $DATABASE
        SNOWFLAKE_SCHEMA: CONSTRUCTION_GEO
        SNOWFLAKE_WAREHOUSE: CONSTRUCTION_WH
        LOG_LEVEL: INFO
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
    - name: terra-endpoint
      port: 8080
      public: true
\$\$
MIN_INSTANCES = 1
MAX_INSTANCES = 2
EXTERNAL_ACCESS_INTEGRATIONS = (TERRA_MAP_TILES_ACCESS)"
    fi
    
    log_success "Service deployed!"
    
    # Wait for service to be ready and get endpoint
    log_info "Waiting for service to be ready..."
    sleep 10
    get_status
}

# Get service status and endpoint URL
get_status() {
    log_info "Checking service status..."
    
    snow sql -c $CONNECTION -q "DESCRIBE SERVICE $DATABASE.$SCHEMA.$SERVICE_NAME" 2>/dev/null || {
        log_error "Service not found"
        return 1
    }
    
    echo ""
    log_info "Service endpoints:"
    snow sql -c $CONNECTION -q "SHOW ENDPOINTS IN SERVICE $DATABASE.$SCHEMA.$SERVICE_NAME" 2>/dev/null
    
    # Try to get the public URL
    ENDPOINT_URL=$(snow sql -c $CONNECTION -q "SHOW ENDPOINTS IN SERVICE $DATABASE.$SCHEMA.$SERVICE_NAME" --format JSON 2>/dev/null | \
        python3 -c "import sys, json; data = json.load(sys.stdin); print(data[0].get('ingress_url', 'Not available yet'))" 2>/dev/null || echo "Not available yet")
    
    echo ""
    log_success "TERRA endpoint URL: $ENDPOINT_URL"
}

# View service logs
view_logs() {
    log_info "Fetching service logs..."
    snow sql -c $CONNECTION -q "CALL SYSTEM\$GET_SERVICE_LOGS('$DATABASE.$SCHEMA.$SERVICE_NAME', 0, 'terra', 100)"
}

# Stop the service
stop_service() {
    log_info "Stopping service..."
    snow sql -c $CONNECTION -q "ALTER SERVICE $DATABASE.$SCHEMA.$SERVICE_NAME SUSPEND" 2>/dev/null || {
        log_warning "Service might not exist or already stopped"
    }
    log_success "Service stopped"
}

# Main execution
case "${1:-all}" in
    setup)
        setup_spcs
        ;;
    build)
        build_image
        ;;
    push)
        push_image
        ;;
    deploy)
        deploy_service
        ;;
    logs)
        view_logs
        ;;
    status)
        get_status
        ;;
    stop)
        stop_service
        ;;
    all)
        build_image
        push_image
        deploy_service
        ;;
    *)
        echo "Usage: $0 {setup|build|push|deploy|logs|status|stop|all}"
        echo ""
        echo "Commands:"
        echo "  setup   - Create compute pool and image repository"
        echo "  build   - Build Docker image"
        echo "  push    - Push image to Snowflake registry"
        echo "  deploy  - Deploy/update the service"
        echo "  logs    - View service logs"
        echo "  status  - Check service status"
        echo "  stop    - Stop the service"
        echo "  all     - Build, push, and deploy (default)"
        exit 1
        ;;
esac
