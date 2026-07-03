import motor.motor_asyncio
from config import settings

client = motor.motor_asyncio.AsyncIOMotorClient(settings.MONGO_URI)
db = client[settings.MONGO_DB]