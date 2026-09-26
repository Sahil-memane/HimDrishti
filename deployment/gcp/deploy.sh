#!/usr/bin/env bash
# HimDrishti — GCP deployment orchestrator.
#
# What this does, in order: enables required APIs, creates an Artifact
# Registry repo, provisions a Cloud SQL (PostgreSQL) instance, runs the real
# db/migrations/*.sql against it, then builds/pushes/deploys all 5 services
# to Cloud Run in the correct order (models first, since api-gateway needs
# their URLs; api-gateway before frontend, since the frontend build bakes in
# api-gateway's URL at build time).
#
# Nothing here changes application logic — this only packages and deploys
# the exact same services docker-compose.yml already runs locally.
#
# Usage:
#   cp .env.deploy.example .env.deploy   # fill in your values first
#   ./deploy.sh              # run everything, in order
#   ./deploy.sh sql          # re-run just one phase (see PHASES below)
#
# PHASES: apis, artifact-registry, secrets, cloudsql, migrate,
#         model1, model2, model3, gateway, frontend

set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

if [ ! -f .env.deploy ]; then
  echo "Missing .env.deploy — copy .env.deploy.example to .env.deploy and fill it in first."
  exit 1
fi
set -a; source .env.deploy; set +a

: "${GCP_PROJECT_ID:?Set GCP_PROJECT_ID in .env.deploy}"
: "${GCP_REGION:=asia-south1}"
: "${DB_INSTANCE_NAME:=himdrishti-db}"
: "${DB_TIER:=db-f1-micro}"
: "${AR_REPO:=himdrishti}"

REPO_ROOT="$(cd ../.. && pwd)"
AR_HOST="${GCP_REGION}-docker.pkg.dev"
AR_BASE="${AR_HOST}/${GCP_PROJECT_ID}/${AR_REPO}"

echo "Project:  ${GCP_PROJECT_ID}"
echo "Region:   ${GCP_REGION}"
echo "Repo:     ${AR_BASE}"
echo

phase_apis() {
  echo "== Enabling required GCP APIs =="
  gcloud config set project "${GCP_PROJECT_ID}" >/dev/null
  gcloud services enable \
    run.googleapis.com \
    sqladmin.googleapis.com \
    artifactregistry.googleapis.com \
    secretmanager.googleapis.com \
    cloudbuild.googleapis.com \
    compute.googleapis.com
}

phase_artifact_registry() {
  echo "== Artifact Registry =="
  if ! gcloud artifacts repositories describe "${AR_REPO}" --location="${GCP_REGION}" >/dev/null 2>&1; then
    gcloud artifacts repositories create "${AR_REPO}" \
      --repository-format=docker --location="${GCP_REGION}" \
      --description="HimDrishti service images"
  else
    echo "Repo ${AR_REPO} already exists, skipping."
  fi
  gcloud auth configure-docker "${AR_HOST}" --quiet
}

_rand_secret() { openssl rand -hex 32; }

phase_secrets() {
  echo "== Secrets =="
  local db_password="${DB_PASSWORD:-}"
  local jwt_secret="${JWT_SECRET:-}"
  [ -z "$db_password" ] && db_password="$(_rand_secret)"
  [ -z "$jwt_secret" ] && jwt_secret="$(_rand_secret)"

  for name_value in "himdrishti-db-password:${db_password}" "himdrishti-jwt-secret:${jwt_secret}" "himdrishti-mistral-key:${MISTRAL_API_KEY:-}"; do
    local name="${name_value%%:*}"
    local value="${name_value#*:}"
    if ! gcloud secrets describe "$name" >/dev/null 2>&1; then
      printf '%s' "$value" | gcloud secrets create "$name" --data-file=-
    else
      printf '%s' "$value" | gcloud secrets versions add "$name" --data-file=-
    fi
  done

  # Persist the DB password locally (only) so later phases (cloudsql,
  # migrate) can use it without re-reading Secret Manager each time.
  echo "$db_password" > .db_password.local
  echo "Secrets stored in Secret Manager: himdrishti-db-password, himdrishti-jwt-secret, himdrishti-mistral-key"
}

phase_cloudsql() {
  echo "== Cloud SQL =="
  # This schema stores every geometry as plain WKT text (see
  # backend/api-gateway/models.py) — no PostGIS extension is actually used
  # anywhere (verified: no `geometry` column or CREATE EXTENSION postgis in
  # db/migrations/*.sql), so a plain Cloud SQL Postgres instance is enough.
  if ! gcloud sql instances describe "${DB_INSTANCE_NAME}" >/dev/null 2>&1; then
    gcloud sql instances create "${DB_INSTANCE_NAME}" \
      --database-version=POSTGRES_15 \
      --tier="${DB_TIER}" \
      --region="${GCP_REGION}" \
      --storage-size=10GB \
      --storage-auto-increase
  else
    echo "Instance ${DB_INSTANCE_NAME} already exists, skipping create."
  fi

  local db_password
  db_password="$(cat .db_password.local 2>/dev/null || gcloud secrets versions access latest --secret=himdrishti-db-password)"

  gcloud sql users set-password postgres \
    --instance="${DB_INSTANCE_NAME}" --password="${db_password}" >/dev/null

  if ! gcloud sql databases describe himdrishti --instance="${DB_INSTANCE_NAME}" >/dev/null 2>&1; then
    gcloud sql databases create himdrishti --instance="${DB_INSTANCE_NAME}"
  fi

  # Grant the Cloud Run default compute service account permission to
  # connect to Cloud SQL via the unix-socket connector (no public IP
  # exposure needed for the deployed services themselves).
  local project_number
  project_number="$(gcloud projects describe "${GCP_PROJECT_ID}" --format='value(projectNumber)')"
  gcloud projects add-iam-policy-binding "${GCP_PROJECT_ID}" \
    --member="serviceAccount:${project_number}-compute@developer.gserviceaccount.com" \
    --role="roles/cloudsql.client" --condition=None >/dev/null
}

phase_migrate() {
  echo "== Running db/migrations/*.sql against Cloud SQL =="
  local db_password
  db_password="$(cat .db_password.local 2>/dev/null || gcloud secrets versions access latest --secret=himdrishti-db-password)"

  # Temporarily authorize this machine's public IP so a throwaway `docker
  # run postgres:15 psql` container can reach Cloud SQL directly for the
  # one-time migration run. The deployed Cloud Run services never use this
  # path — they connect over the private unix-socket connector instead
  # (see phase_cloudsql). Revoked again at the end of this phase.
  local my_ip
  my_ip="$(curl -s https://api.ipify.org)"
  echo "Authorizing ${my_ip}/32 for Cloud SQL (temporary) ..."
  gcloud sql instances patch "${DB_INSTANCE_NAME}" \
    --authorized-networks="${my_ip}/32" --quiet

  local public_ip
  public_ip="$(gcloud sql instances describe "${DB_INSTANCE_NAME}" --format='value(ipAddresses[0].ipAddress)')"

  for f in "${REPO_ROOT}"/db/migrations/*.sql; do
    echo "  applying $(basename "$f") ..."
    docker run --rm -v "${REPO_ROOT}/db/migrations:/migrations:ro" \
      -e PGPASSWORD="${db_password}" postgres:15 \
      psql "host=${public_ip} port=5432 dbname=himdrishti user=postgres sslmode=require" \
      -f "/migrations/$(basename "$f")"
  done

  echo "Revoking temporary network authorization ..."
  gcloud sql instances patch "${DB_INSTANCE_NAME}" --clear-authorized-networks --quiet
}

_connection_name() {
  gcloud sql instances describe "${DB_INSTANCE_NAME}" --format='value(connectionName)'
}

_db_url_unix_socket() {
  local db_password
  db_password="$(cat .db_password.local 2>/dev/null || gcloud secrets versions access latest --secret=himdrishti-db-password)"
  echo "postgresql://postgres:${db_password}@/himdrishti?host=/cloudsql/$(_connection_name)"
}

_deploy_internal_model() {
  local name="$1" port="$2" dockerfile="$3" build_ctx="$4"
  echo "== Building & deploying ${name} (auth-only, no VPC) =="
  docker build -f "${dockerfile}" -t "${AR_BASE}/${name}:latest" "${build_ctx}"
  docker push "${AR_BASE}/${name}:latest"
  # Not --ingress=internal: that requires api-gateway to sit on a VPC
  # connector (extra cost + setup) just to reach it. Instead this relies on
  # Cloud Run's own IAM check — --no-allow-unauthenticated means every
  # request needs a valid Google-signed identity token, and phase_gateway
  # grants only api-gateway's own service account roles/run.invoker on this
  # service below. Reachable over the public internet, but unusable without
  # that token — equivalent security to internal ingress here, no VPC
  # connector required.
  gcloud run deploy "${name}" \
    --image="${AR_BASE}/${name}:latest" \
    --region="${GCP_REGION}" \
    --port="${port}" \
    --no-allow-unauthenticated \
    --add-cloudsql-instances="$(_connection_name)" \
    --set-env-vars="DATABASE_URL=$(_db_url_unix_socket)" \
    --min-instances=0 \
    --memory=1Gi
}

phase_model1() {
  _deploy_internal_model model1 8001 "${REPO_ROOT}/backend/model1-seaice-service/Dockerfile.prod" "${REPO_ROOT}"
}

phase_model2() {
  _deploy_internal_model model2 8002 "${REPO_ROOT}/backend/model2-iceberg-service/Dockerfile.prod" "${REPO_ROOT}"
}

phase_model3() {
  echo "== Building & deploying model3 (auth-only, no VPC) =="
  docker build -t "${AR_BASE}/model3:latest" "${REPO_ROOT}/backend/model3-routing-service"
  docker push "${AR_BASE}/model3:latest"
  local mistral_key
  mistral_key="$(gcloud secrets versions access latest --secret=himdrishti-mistral-key 2>/dev/null || echo '')"
  # See _deploy_internal_model above for why this isn't --ingress=internal.
  gcloud run deploy model3 \
    --image="${AR_BASE}/model3:latest" \
    --region="${GCP_REGION}" \
    --port=8003 \
    --no-allow-unauthenticated \
    --add-cloudsql-instances="$(_connection_name)" \
    --set-env-vars="DATABASE_URL=$(_db_url_unix_socket),MISTRAL_API_KEY=${mistral_key}" \
    --min-instances=0 \
    --memory=1Gi
}

phase_gateway() {
  echo "== Building & deploying api-gateway (public) =="
  docker build -t "${AR_BASE}/api-gateway:latest" "${REPO_ROOT}/backend/api-gateway"
  docker push "${AR_BASE}/api-gateway:latest"

  local jwt_secret
  jwt_secret="$(gcloud secrets versions access latest --secret=himdrishti-jwt-secret)"
  local model1_url model2_url model3_url
  model1_url="$(gcloud run services describe model1 --region="${GCP_REGION}" --format='value(status.url)')"
  model2_url="$(gcloud run services describe model2 --region="${GCP_REGION}" --format='value(status.url)')"
  model3_url="$(gcloud run services describe model3 --region="${GCP_REGION}" --format='value(status.url)')"

  # --no-cpu-throttling: POST /api/voyage returns 202 immediately and runs
  # the real ~60s Model1→2→3 pipeline afterward via FastAPI BackgroundTasks
  # (see routes_voyage.py). Cloud Run's default behavior throttles a
  # container's CPU to near-zero the instant the response is sent, since it
  # assumes no code runs between requests — that would starve this
  # in-flight background work indefinitely and every voyage would stay
  # "processing" forever. This keeps full CPU allocated for the container's
  # whole lifetime, not just while handling a request.
  gcloud run deploy api-gateway \
    --image="${AR_BASE}/api-gateway:latest" \
    --region="${GCP_REGION}" \
    --port=8000 \
    --allow-unauthenticated \
    --no-cpu-throttling \
    --add-cloudsql-instances="$(_connection_name)" \
    --set-env-vars="DATABASE_URL=$(_db_url_unix_socket),JWT_SECRET=${jwt_secret},MODEL1_URL=${model1_url},MODEL2_URL=${model2_url},MODEL3_URL=${model3_url}" \
    --min-instances=0 \
    --memory=512Mi

  # api-gateway's own outbound calls to model1/2/3 (pipeline.py) mint a
  # Google-signed identity token per-request via the metadata server — see
  # _auth_headers_for() in pipeline.py. That token proves WHO is calling;
  # this IAM binding is what actually authorizes that identity to call each
  # model (--no-allow-unauthenticated on all three otherwise rejects it).
  local gw_sa
  gw_sa="$(gcloud run services describe api-gateway --region="${GCP_REGION}" --format='value(spec.template.spec.serviceAccountName)')"
  for m in model1 model2 model3; do
    gcloud run services add-iam-policy-binding "$m" --region="${GCP_REGION}" \
      --member="serviceAccount:${gw_sa}" --role="roles/run.invoker" --quiet
  done

  echo "api-gateway deployed at: $(gcloud run services describe api-gateway --region="${GCP_REGION}" --format='value(status.url)')"
}

phase_frontend() {
  echo "== Building & deploying frontend (public) =="
  local gw_url
  gw_url="$(gcloud run services describe api-gateway --region="${GCP_REGION}" --format='value(status.url)')"
  docker build -f "${REPO_ROOT}/frontend/Dockerfile.prod" \
    --build-arg "VITE_API_BASE_URL=${gw_url}/api" \
    -t "${AR_BASE}/frontend:latest" "${REPO_ROOT}/frontend"
  docker push "${AR_BASE}/frontend:latest"
  gcloud run deploy frontend \
    --image="${AR_BASE}/frontend:latest" \
    --region="${GCP_REGION}" \
    --port=8080 \
    --allow-unauthenticated \
    --min-instances=0 \
    --memory=256Mi

  local fe_url
  fe_url="$(gcloud run services describe frontend --region="${GCP_REGION}" --format='value(status.url)')"

  # Now that the frontend's real URL is known, tighten the gateway's CORS
  # from the wide-open local-dev default down to just this origin — a
  # lightweight env-var update, not a rebuild.
  echo "== Restricting api-gateway CORS to ${fe_url} =="
  gcloud run services update api-gateway --region="${GCP_REGION}" \
    --update-env-vars="CORS_ORIGINS=${fe_url}"

  echo
  echo "Frontend deployed at: ${fe_url}"
}

PHASE="${1:-all}"
case "$PHASE" in
  apis) phase_apis ;;
  artifact-registry) phase_artifact_registry ;;
  secrets) phase_secrets ;;
  cloudsql) phase_cloudsql ;;
  migrate) phase_migrate ;;
  model1) phase_model1 ;;
  model2) phase_model2 ;;
  model3) phase_model3 ;;
  gateway) phase_gateway ;;
  frontend) phase_frontend ;;
  all)
    phase_apis
    phase_artifact_registry
    phase_secrets
    phase_cloudsql
    phase_migrate
    phase_model1
    phase_model2
    phase_model3
    phase_gateway
    phase_frontend
    ;;
  *)
    echo "Unknown phase: $PHASE"
    echo "Valid: apis, artifact-registry, secrets, cloudsql, migrate, model1, model2, model3, gateway, frontend, all"
    exit 1
    ;;
esac
