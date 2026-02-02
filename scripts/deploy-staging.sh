#!/bin/bash
# Deployment script for staging environment

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="socialai-staging"
ENV_FILE=".env.staging"
KUBECONFIG="kubectl"

echo -e "${GREEN}Deploying to staging environment...${NC}"

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}Error: kubectl is not installed${NC}"
    exit 1
fi

# Check if kubeconfig is set
if ! $KUBECONFIG config view &> /dev/null; then
    echo -e "${YELLOW}Warning: No kubeconfig found, using default context${NC}"
fi

# Create namespace if it doesn't exist
echo -e "${NC}Creating namespace: ${NAMESPACE}..."
$KUBECONFIG create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# Apply ConfigMap
echo -e "${NC}Applying ConfigMap..."
$KUBECONFIG apply -f k8s/configmap.yaml

# Apply Secrets (create from env file)
echo -e "${NC}Creating Secrets..."
kubectl create secret generic socialai-secrets \
  --namespace=$NAMESPACE \
  --from-env-file=$ENV_FILE \
  --save-config

# Deploy Backend
echo -e "${NC}Deploying Backend..."
$KUBECONFIG apply -f k8s/backend-deployment.yaml
$KUBECONFIG apply -f k8s/backend-service.yaml
$KUBECONFIG apply -f k8s/backend-hpa.yaml

# Wait for backend to be ready
echo -e "${NC}Waiting for Backend pods to be ready..."
$KUBECONFIG wait --for=condition=ready --timeout=300s pod -l app=socialai -l component=backend -n socialai

# Deploy Frontend
echo -e "${NC}Deploying Frontend..."
$KUBECONFIG apply -f k8s/frontend-deployment.yaml
$KUBECONFIG apply -f k8s/frontend-service.yaml
$KUBECONFIG apply -f k8s/frontend-hpa.yaml

# Wait for frontend to be ready
echo -e "${NC}Waiting for Frontend pods to be ready..."
$KUBECONFIG wait --for=condition=ready --timeout=300s pod -l app=socialai -l component=frontend -n socialai

# Deploy AI Service
echo -e "${NC}Deploying AI Service..."
$KUBECONFIG apply -f k8s/ai-service-deployment.yaml
$KUBECONFIG apply -f k8s/ai-service-service.yaml

# Wait for AI service to be ready
echo -e "${NC}Waiting for AI Service pods to be ready..."
$KUBECONFIG wait --for=condition=ready --timeout=300s pod -l app=socialai -l component=ai-service -n socialai

# Get Service URLs
BACKEND_URL=$($KUBECONFIG get svc socialai-backend -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
FRONTEND_URL=$($KUBECONFIG get svc socialai-frontend -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
AI_SERVICE_URL=$($KUBECONFIG get svc socialai-ai-service -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Display deployment status
echo -e "${GREEN}Deployment completed successfully!${NC}"
echo ""
echo -e "${NC}Staging URLs:${NC}"
echo -e "  Backend: http://${BACKEND_URL:-localhost}:3001"
echo -e "  Frontend: http://${FRONTEND_URL:-localhost}"
echo -e "  AI Service: http://${AI_SERVICE_URL:-localhost}:8000"
echo ""
echo -e "${YELLOW}To check pod status:${NC}"
echo -e "  kubectl get pods -n $NAMESPACE"
echo -e "  kubectl get svc -n $NAMESPACE"
echo -e "  kubectl get hpa -n $NAMESPACE"
echo ""
echo -e "${GREEN}Deployment to staging complete!${NC}"
