docker compose -f docker-compose.source.yaml -f docker-compose.yaml up -d;
chroma run --port 8080 &
source ./.venv/bin/activate
python ./run_server.py
