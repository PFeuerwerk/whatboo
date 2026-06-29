ARG API_IMAGE=whatboo-api:latest

FROM ${API_IMAGE}

ENV WHATSAPP_WORKER_ENABLED=true

CMD ["dumb-init", "node", "apps/api/dist/worker.js"]
