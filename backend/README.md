# Trikaal Netra - Backend

This is the backend service for the Trikaal Netra AIS vessel tracking system.

## Database Configuration

### ClickHouse

#### Connection Details
- **Host**: `34.14.212.228`
- **Port**: `9000`
- **User**: `default`
- **Password**: `FcBkawbYEPanUDFip9Wad17RuvNQrMFTiGG+4gnquUw=`
- **Connection URL**: `http://34.14.212.228:9000`

#### Environment Variables
Add the following to your `.env` file:
```
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=FcBkawbYEPanUDFip9Wad17RuvNQrMFTiGG+4gnquUw=
CLICKHOUSE_HOST=http://34.14.212.228
CLICKHOUSE_PORT=9000
```

#### Usage in Code
The backend uses these environment variables to connect to ClickHouse for AIS data storage and retrieval. The main usage is in `routes/vessel.py` for:
- Fetching vessel trajectories
- Querying vessel positions
- Retrieving historical AIS data

## API Endpoints

### Vessel Data
- `GET /api/vessels/` - List vessels
- `GET /api/vessels/{vessel_id}/trajectory` - Get vessel trajectory
- `GET /api/vessels/positions` - Get current vessel positions

### Events
- `GET /api/events/` - List events
- `POST /api/events/` - Create new event
- `GET /api/events/{event_id}` - Get event details
- `DELETE /api/events/{event_id}` - Delete event

## Development Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Copy `.env.example` to `.env` and update with your credentials
4. Run the development server:
   ```bash
   uvicorn main:app --reload
   ```

## Dependencies

- FastAPI
- Uvicorn
- ClickHouse HTTP interface
- Python-dotenv
- Pydantic
- Motor (for MongoDB)

## License

Proprietary - All rights reserved
