# Zyvan — AWS Production Deployment Guide

This guide provides end-to-end instructions for deploying the **Zyvan Webhook & Event Delivery Infrastructure** to Amazon Web Services (AWS).

---

## 1. Architecture Overview

Zyvan is built as a cloud-native, distributed event delivery engine with strict separation between ingestion persistence and delivery execution:

```
                  ┌─────────────────────────────────────────┐
                  │          AWS Route 53 (DNS)             │
                  └────────────────────┬────────────────────┘
                                       │
                        ┌──────────────┴──────────────┐
                        │   AWS Application Load      │
                        │      Balancer (ALB)         │
                        │    (HTTPS via ACM Cert)     │
                        └──────┬───────────────┬──────┘
                               │               │
                 Path: /*      │               │ Path: /v1/*
                               ▼               ▼
                   ┌─────────────────┐   ┌─────────────────┐
                   │  Zyvan Web      │   │  Zyvan API      │
                   │  (Next.js App)  │   │  (Express.js)   │
                   │  Port: 3000     │   │  Port: 4000     │
                   └─────────────────┘   └────────┬────────┘
                                                  │
                 ┌────────────────────────────────┴────────────────┐
                 │                                                 │
                 ▼                                                 ▼
     ┌───────────────────────┐                         ┌───────────────────────┐
     │  Amazon RDS Postgres  │                         │  Amazon MQ / RabbitMQ │
     │  (System of Record)   │                         │   (AMQP & TTL DLX)    │
     └───────────▲───────────┘                         └───────────┬───────────┘
                 │                                                 │
                 │              ┌──────────────────┐               │
                 └──────────────┤  Zyvan Worker    │◄──────────────┘
                                │  (Delivery/DLQ)  │
                                └────────┬─────────┘
                                         │
                                         ▼
                            Customer Webhook Endpoints
                            (HMAC-SHA256 Signed + AES-256-GCM)
```

### Core Architecture Components:
- **Zyvan API (`apps/api`)**: High-throughput Express ingestion engine with Bearer API-key & JWT validation, idempotency guards, and durable transactional persistence.
- **Zyvan Worker (`apps/worker`)**: Stateless AMQP consumer handling HTTP dispatch, HMAC-SHA256 signing, rate-limiting, exponential retries, and Dead-Letter Queue (DLQ) transitions.
- **Zyvan Web (`apps/web`)**: Next.js dashboard and live webhook simulator for inspecting delivery audit trails, latency percentiles, and destination controls.
- **Amazon RDS (PostgreSQL 16)**: System of record for events, deliveries, attempts, and DLQ entries.
- **Amazon MQ (RabbitMQ 3.13)**: Execution broker providing delayed retry routing via message TTL and Dead Letter Exchange (DLX).
- **Amazon ElastiCache (Redis 7)**: Distributed tenant concurrency counters and token bucket rate limiters.

---

## 2. Deployment Option A: Single EC2 Instance with Docker Compose (Recommended for Portfolio & Resume Demos)

This option deploys the complete stack onto a single `t3.medium` or `t3.small` instance (~$15-$30/month or AWS Free Tier eligible for evaluation).

### Step 1: Launch EC2 Instance
1. In the AWS Console, navigate to **EC2** → **Launch Instance**.
2. **Name**: `zyvan-production`
3. **AMI**: Ubuntu 24.04 LTS (x86_64).
4. **Instance Type**: `t3.medium` (2 vCPU, 4 GiB RAM recommended) or `t3.small`.
5. **Key Pair**: Select or create an SSH key pair.
6. **Network Settings**:
   - Allow **SSH (22)** from your IP.
   - Allow **HTTP (80)** from Anywhere (`0.0.0.0/0`).
   - Allow **HTTPS (443)** from Anywhere (`0.0.0.0/0`).
7. **Storage**: 30 GiB gp3 SSD.
8. Click **Launch Instance**.

### Step 2: Install Docker & Git on EC2
Connect to your instance via SSH:
```bash
ssh -i your-key.pem ubuntu@<EC2_PUBLIC_IP>
```

Update system and install Docker Engine & Compose:
```bash
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y ca-certificates curl gnupg git

# Install Docker
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Allow ubuntu user to run docker without sudo
sudo usermod -aG docker ubuntu
newgrp docker
```

### Step 3: Clone Repository and Configure Environment
```bash
git clone https://github.com/sultanxdev/zyvan.git
cd zyvan

# Create production .env file
cp .env.example .env
nano .env
```

Ensure production security secrets are populated:
```env
NODE_ENV=production
PORT=4000

POSTGRES_USER=zyvan
POSTGRES_PASSWORD=your_strong_postgres_password_here
POSTGRES_DB=zyvan_prod

RABBITMQ_USER=zyvan
RABBITMQ_PASS=your_strong_rabbitmq_password_here

API_KEY_PEPPER=8f92b7c4a10e6284f23b5d19a48c90327f18b329482710385920194857291038
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
JWT_SECRET=super_secure_production_jwt_signing_secret_here

LOG_LEVEL=info
```

### Step 4: Run Database Migrations and Seed
```bash
# Start PostgreSQL first to initialize database schema
docker compose -f docker-compose.prod.yml up -d postgres rabbitmq redis

# Wait 5 seconds for PostgreSQL to become healthy
docker compose -f docker-compose.prod.yml ps

# Run Prisma migrations & seed
npm install
npx prisma db push --schema=packages/database/prisma/schema.prisma
npx ts-node packages/database/prisma/seed.ts
```

### Step 5: Start the Full Stack
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Verify all containers are up and healthy:
```bash
docker compose -f docker-compose.prod.yml ps
```

### Step 6: Configure Nginx & SSL with Certbot
Install Nginx and Certbot for custom domain SSL termination:
```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx
```

Configure `/etc/nginx/sites-available/zyvan`:
```nginx
server {
    server_name your-domain.com api.your-domain.com;

    # Frontend (Next.js)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # API Endpoints
    location /v1/ {
        proxy_pass http://localhost:4000/v1/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:4000/health;
    }
}
```

Enable site and acquire free Let's Encrypt SSL certificate:
```bash
sudo ln -s /etc/nginx/sites-available/zyvan /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
sudo certbot --nginx -d your-domain.com -d api.your-domain.com
```

---

## 3. Deployment Option B: Enterprise AWS ECS Fargate + Managed Services

For high-availability enterprise environments supporting 10,000+ webhooks/sec:

1. **Amazon RDS PostgreSQL (Multi-AZ)**:
   - Engine: PostgreSQL 16.2.
   - Instance: `db.m6g.large` with Multi-AZ failover and automated backups.
2. **Amazon MQ (RabbitMQ)**:
   - Broker engine: RabbitMQ 3.13.
   - Deployment: Active/Standby Cluster with replication across Availability Zones.
3. **Amazon ElastiCache (Redis)**:
   - Engine: Redis Cluster with automated failover for tenant token-bucket rate limiting.
4. **AWS ECS Fargate Clusters**:
   - `zyvan-api-service`: 2+ tasks behind an Application Load Balancer with auto-scaling based on CPU (70%) and ALB Request Count.
   - `zyvan-worker-service`: 3+ tasks with auto-scaling based on RabbitMQ queue depth metrics (`zyvan.delivery` unacked message count).
5. **AWS Secrets Manager**:
   - Store `ENCRYPTION_KEY`, `API_KEY_PEPPER`, `JWT_SECRET`, and database connection credentials.

---

## 4. Verification and Health Checks

Once deployed, verify your live AWS instance:

```bash
# 1. API Liveness Check
curl https://your-domain.com/health
# Response: {"status":"ok","timestamp":"2026-09-04T..."}

# 2. Dependency Readiness Check
curl https://your-domain.com/ready
# Response: {"status":"ready","database":"ok","redis":"ok","rabbitmq":"ok"}

# 3. Ingest Test Webhook
curl -X POST https://your-domain.com/v1/events \
  -H "Authorization: Bearer zyvan_live_demo1234567890abcdef" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "payment_intent.succeeded",
    "tenant_id": "tenant_default",
    "idempotency_key": "test_idemp_aws_01",
    "data": { "amount": 2500, "currency": "USD" }
  }'
# Response: {"event_id":"evt_...","status":"queued","duplicate":false}
```

---

## 5. Resume Engineering Highlights

When listing this project on your resume, emphasize these technical accomplishments:

- **Durable Ingestion & Transactional Outbox Pattern**: Built with Express.js and PostgreSQL to persist events and delivery intents before asynchronous queuing, guaranteeing zero event loss on worker or broker failure.
- **AMQP Delayed Exponential Backoff via RabbitMQ DLX**: Engineered RabbitMQ TTL queues and dead-letter exchanges (DLX) to schedule exponential retry intervals with full jitter without polling databases.
- **Tenant Isolation & Noisy-Neighbor Mitigation**: Designed composite database indexes (`project_id`, `idempotency_key`) and Redis token-bucket rate limiters to bound concurrency per tenant.
- **Cryptographic Webhook Signatures & Secret Security**: Implemented AES-256-GCM symmetric encryption for tenant endpoint secrets at rest and timestamped HMAC-SHA256 request headers (`Zyvan-Signature`) preventing replay attacks.
- **Full-Stack Reliability Observability**: Created Next.js 16 analytics dashboard featuring live delivery latency percentiles (P50/P95/P99), Dead-Letter Queue inspection, and single-click dead-letter replay.
