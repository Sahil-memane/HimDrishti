#!/usr/bin/env bash
# HimDrishti GCP orchestrator.
# Phases: apis artifact-registry secrets cloudsql migrate model1 model2 model3 gateway frontend duckdns fix-billing redeploy-frontend all
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
[ ! -f .env.deploy ] && { echo 'Missing .env.deploy'; exit 1; }
set -a; source .env.deploy; set +a
: "${GCP_PROJECT_ID:?Set GCP_PROJECT_ID}"
: "${GCP_REGION:=asia-south1}"
: "${DB_INSTANCE_NAME:=himdrishti-db}"
: "${DB_TIER:=db-f1-micro}"
: "${AR_REPO:=himdrishti}"
: "${DUCKDNS_DOMAIN:=}"
: "${DUCKDNS_TOKEN:=}"
REPO_ROOT="$(cd ../.. && pwd)"
AR_HOST="${GCP_REGION}-docker.pkg.dev"
AR_BASE="${AR_HOST}/${GCP_PROJECT_ID}/${AR_REPO}"
echo "Project: ${GCP_PROJECT_ID} | Region: ${GCP_REGION}"
[ -n "${DUCKDNS_DOMAIN}" ] && echo "DuckDNS: http://${DUCKDNS_DOMAIN}"
_rand_secret() { openssl rand -hex 32; }
_conn() { gcloud sql instances describe "${DB_INSTANCE_NAME}" --format='value(connectionName)'; }
_db_url() {
  local p; p="$(cat .db_password.local 2>/dev/null || gcloud secrets versions access latest --secret=himdrishti-db-password)"
  echo "postgresql://postgres:${p}@/himdrishti?host=/cloudsql/$(_conn)"
}
_cors_origins() {
  if [ -n "${DUCKDNS_DOMAIN}" ]; then echo "${1},http://${DUCKDNS_DOMAIN},https://${DUCKDNS_DOMAIN}"
  else echo "${1}"; fi
}
_upsert_secret() {
  local nm="$1" val="$2"
  if gcloud secrets describe "${nm}" >/dev/null 2>&1; then
    printf '%s' "${val}" | gcloud secrets versions add "${nm}" --data-file=-
  else
    printf '%s' "${val}" | gcloud secrets create "${nm}" --data-file=-
  fi
}
phase_apis() {
  gcloud config set project "${GCP_PROJECT_ID}" >/dev/null
  gcloud services enable run.googleapis.com sqladmin.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com cloudbuild.googleapis.com compute.googleapis.com
}
phase_artifact_registry() {
  gcloud artifacts repositories describe "${AR_REPO}" --location="${GCP_REGION}" >/dev/null 2>&1 || \
    gcloud artifacts repositories create "${AR_REPO}" --repository-format=docker --location="${GCP_REGION}" --description="HimDrishti"
  gcloud auth configure-docker "${AR_HOST}" --quiet
}
phase_secrets() {
  local dbp="${DB_PASSWORD:-}" jwt="${JWT_SECRET:-}" mk="${MISTRAL_API_KEY:-}"
  [ -z "$dbp" ] && dbp="$(_rand_secret)"
  [ -z "$jwt" ] && jwt="$(_rand_secret)"
  _upsert_secret himdrishti-db-password "${dbp}"
  _upsert_secret himdrishti-jwt-secret "${jwt}"
  _upsert_secret himdrishti-mistral-key "${mk}"
  echo "${dbp}" >.db_password.local
}
phase_cloudsql() {
  gcloud sql instances describe "${DB_INSTANCE_NAME}" >/dev/null 2>&1 || \
    gcloud sql instances create "${DB_INSTANCE_NAME}" --database-version=POSTGRES_15 --tier="${DB_TIER}" --region="${GCP_REGION}" --storage-size=10GB --storage-auto-increase
  local p; p="$(cat .db_password.local 2>/dev/null || gcloud secrets versions access latest --secret=himdrishti-db-password)"
  gcloud sql users set-password postgres --instance="${DB_INSTANCE_NAME}" --password="${p}" >/dev/null
  gcloud sql databases describe himdrishti --instance="${DB_INSTANCE_NAME}" >/dev/null 2>&1 || gcloud sql databases create himdrishti --instance="${DB_INSTANCE_NAME}"
  local pn; pn="$(gcloud projects describe "${GCP_PROJECT_ID}" --format='value(projectNumber)')"
  gcloud projects add-iam-policy-binding "${GCP_PROJECT_ID}" --member="serviceAccount:${pn}-compute@developer.gserviceaccount.com" --role="roles/cloudsql.client" --condition=None >/dev/null
}
phase_migrate() {
  local p; p="$(cat .db_password.local 2>/dev/null || gcloud secrets versions access latest --secret=himdrishti-db-password)"
  local my_ip; my_ip="$(curl -s https://api.ipify.org)"
  gcloud sql instances patch "${DB_INSTANCE_NAME}" --authorized-networks="${my_ip}/32" --quiet
  local pub; pub="$(gcloud sql instances describe "${DB_INSTANCE_NAME}" --format='value(ipAddresses[0].ipAddress)')"
  for f in "${REPO_ROOT}"/db/migrations/*.sql; do
    docker run --rm -v "${REPO_ROOT}/db/migrations:/migrations:ro" -e PGPASSWORD="${p}" postgres:15 psql "host=${pub} port=5432 dbname=himdrishti user=postgres sslmode=require" -f "/migrations/$(basename "$f")"
  done
  gcloud sql instances patch "${DB_INSTANCE_NAME}" --clear-authorized-networks --quiet
}
_deploy_model() {
  local name="$1" port="$2" df="$3" ctx="$4"
  docker build -f "${df}" -t "${AR_BASE}/${name}:latest" "${ctx}" && docker push "${AR_BASE}/${name}:latest"
  gcloud run deploy "${name}" --image="${AR_BASE}/${name}:latest" --region="${GCP_REGION}" --port="${port}" --no-allow-unauthenticated --add-cloudsql-instances="$(_conn)" --set-env-vars="DATABASE_URL=$(_db_url)" --min-instances=0 --memory=1Gi
}
phase_model1() { _deploy_model model1 8001 "${REPO_ROOT}/backend/model1-seaice-service/Dockerfile.prod" "${REPO_ROOT}"; }
phase_model2() { _deploy_model model2 8002 "${REPO_ROOT}/backend/model2-iceberg-service/Dockerfile.prod" "${REPO_ROOT}"; }
phase_model3() {
  docker build -t "${AR_BASE}/model3:latest" "${REPO_ROOT}/backend/model3-routing-service" && docker push "${AR_BASE}/model3:latest"
  local mk; mk="$(gcloud secrets versions access latest --secret=himdrishti-mistral-key 2>/dev/null || echo '')"
  gcloud run deploy model3 --image="${AR_BASE}/model3:latest" --region="${GCP_REGION}" --port=8003 --no-allow-unauthenticated --add-cloudsql-instances="$(_conn)" --set-env-vars="DATABASE_URL=$(_db_url),MISTRAL_API_KEY=${mk}" --min-instances=0 --memory=1Gi
}
phase_gateway() {
  docker build -t "${AR_BASE}/api-gateway:latest" "${REPO_ROOT}/backend/api-gateway" && docker push "${AR_BASE}/api-gateway:latest"
  local jwt m1 m2 m3 fe_url cors
  jwt="$(gcloud secrets versions access latest --secret=himdrishti-jwt-secret)"
  m1="$(gcloud run services describe model1 --region="${GCP_REGION}" --format='value(status.url)')"
  m2="$(gcloud run services describe model2 --region="${GCP_REGION}" --format='value(status.url)')"
  m3="$(gcloud run services describe model3 --region="${GCP_REGION}" --format='value(status.url)')"
  fe_url="$(gcloud run services describe frontend --region="${GCP_REGION}" --format='value(status.url)' 2>/dev/null || echo '')"
  cors="$(_cors_origins "${fe_url:-*}")"
  gcloud run deploy api-gateway --image="${AR_BASE}/api-gateway:latest" --region="${GCP_REGION}" --port=8000 --allow-unauthenticated --no-cpu-throttling --add-cloudsql-instances="$(_conn)" --set-env-vars="DATABASE_URL=$(_db_url),JWT_SECRET=${jwt},MODEL1_URL=${m1},MODEL2_URL=${m2},MODEL3_URL=${m3},CORS_ORIGINS=${cors}" --min-instances=0 --memory=512Mi
  local gw_sa; gw_sa="$(gcloud run services describe api-gateway --region="${GCP_REGION}" --format='value(spec.template.spec.serviceAccountName)')"
  for m in model1 model2 model3; do gcloud run services add-iam-policy-binding "$m" --region="${GCP_REGION}" --member="serviceAccount:${gw_sa}" --role="roles/run.invoker" --quiet; done
}
phase_frontend() {
  local gw_url; gw_url="$(gcloud run services describe api-gateway --region="${GCP_REGION}" --format='value(status.url)')"
  docker build -f "${REPO_ROOT}/frontend/Dockerfile.prod" --build-arg "VITE_API_BASE_URL=${gw_url}/api" -t "${AR_BASE}/frontend:latest" "${REPO_ROOT}/frontend" && docker push "${AR_BASE}/frontend:latest"
  gcloud run deploy frontend --image="${AR_BASE}/frontend:latest" --region="${GCP_REGION}" --port=8080 --allow-unauthenticated --min-instances=0 --memory=256Mi
  local fe_url cors
  fe_url="$(gcloud run services describe frontend --region="${GCP_REGION}" --format='value(status.url)')"
  cors="$(_cors_origins "${fe_url}")"
  gcloud run services update api-gateway --region="${GCP_REGION}" --update-env-vars="CORS_ORIGINS=${cors}"
  echo "Frontend: ${fe_url}"; [ -n "${DUCKDNS_DOMAIN}" ] && echo "DuckDNS: http://${DUCKDNS_DOMAIN} (run ./deploy.sh duckdns)"
}
phase_duckdns() {
  [ -z "${DUCKDNS_DOMAIN}" ] && { echo "Set DUCKDNS_DOMAIN=himdrishti-clutchx.duckdns.org in .env.deploy"; exit 1; }
  local fe_url cr_host cr_ip sub cors
  fe_url="$(gcloud run services describe frontend --region="${GCP_REGION}" --format='value(status.url)')"
  cr_host="${fe_url#https://}"; sub="${DUCKDNS_DOMAIN%%.*}"
  cr_ip="$(curl -s "https://dns.google/resolve?name=${cr_host}&type=A" | "C:\Program Files\Python\Python312\python.exe" -c "import sys,json; a=json.load(sys.stdin).get('Answer',[]); print(a[-1]['data'] if a else '')" 2>/dev/null || echo '')"
  echo "=== DuckDNS: ${DUCKDNS_DOMAIN} | Cloud Run: ${fe_url} | IP: ${cr_ip:-unknown}"
  echo "Manual: https://www.duckdns.org -> subdomain ${sub} -> IP ${cr_ip:-paste-ip}"
  if [ -n "${DUCKDNS_TOKEN}" ] && [ -n "${cr_ip}" ]; then
    local resp; resp="$(curl -s "https://www.duckdns.org/update?domains=${sub}&token=${DUCKDNS_TOKEN}&ip=${cr_ip}")"
    [ "${resp}" = "OK" ] && echo "SUCCESS: DuckDNS updated to ${cr_ip}" || echo "WARNING: ${resp}"
  fi
  cors="$(_cors_origins "${fe_url}")"
  gcloud run services update api-gateway --region="${GCP_REGION}" --update-env-vars="CORS_ORIGINS=${cors}"
  echo "CORS: ${cors}"
}
# Fix billing: run after resolving payment at the GCP billing console.
# The billing account 018E48-6E3300-9DD827 was past-due, causing 500 errors.
# After payment succeeds, existing Cloud Run revisions still fail until a new
# revision is created. This phase forces that by adding a no-op env var.
phase_fix_billing() {
  echo "=== Fix Billing: forcing new revisions ==="
  echo "Prereq: https://console.cloud.google.com/billing/018E48-6E3300-9DD827/manage"
  local ts; ts="$(date +%s)"
  for svc in frontend api-gateway model1 model2 model3; do
    printf "  %-15s: " "${svc}"
    gcloud run services update "${svc}" --region="${GCP_REGION}" --project="${GCP_PROJECT_ID}" --update-env-vars="DEPLOY_TS=${ts}" >/dev/null 2>&1 && echo "OK" || echo "FAILED"
  done
  local fe_url; fe_url="$(gcloud run services describe frontend --region="${GCP_REGION}" --format='value(status.url)' 2>/dev/null || echo N/A)"
  echo "Done. Test: ${fe_url}"; [ -n "${DUCKDNS_DOMAIN}" ] && echo "or: http://${DUCKDNS_DOMAIN}"
}
phase_redeploy_frontend() {
  local gw_url; gw_url="$(gcloud run services describe api-gateway --region="${GCP_REGION}" --format='value(status.url)')"
  docker build -f "${REPO_ROOT}/frontend/Dockerfile.prod" --build-arg "VITE_API_BASE_URL=${gw_url}/api" -t "${AR_BASE}/frontend:latest" "${REPO_ROOT}/frontend" && docker push "${AR_BASE}/frontend:latest"
  gcloud run deploy frontend --image="${AR_BASE}/frontend:latest" --region="${GCP_REGION}" --port=8080 --allow-unauthenticated --min-instances=0 --memory=256Mi
  local fe_url cors; fe_url="$(gcloud run services describe frontend --region="${GCP_REGION}" --format='value(status.url)')"
  cors="$(_cors_origins "${fe_url}")"
  gcloud run services update api-gateway --region="${GCP_REGION}" --update-env-vars="CORS_ORIGINS=${cors}"
  echo "Frontend: ${fe_url}"; [ -n "${DUCKDNS_DOMAIN}" ] && echo "DuckDNS: http://${DUCKDNS_DOMAIN}"
}
PHASE="${1:-all}"
case "$PHASE" in
  apis) phase_apis ;; artifact-registry) phase_artifact_registry ;; secrets) phase_secrets ;;
  cloudsql) phase_cloudsql ;; migrate) phase_migrate ;; model1) phase_model1 ;;
  model2) phase_model2 ;; model3) phase_model3 ;; gateway) phase_gateway ;;
  frontend) phase_frontend ;; duckdns) phase_duckdns ;; fix-billing) phase_fix_billing ;;
  redeploy-frontend) phase_redeploy_frontend ;;
  all) phase_apis; phase_artifact_registry; phase_secrets; phase_cloudsql; phase_migrate; phase_model1; phase_model2; phase_model3; phase_gateway; phase_frontend; [ -n "${DUCKDNS_DOMAIN}" ] && phase_duckdns ;;
  *) echo "Unknown: $PHASE"; exit 1 ;;
esac
