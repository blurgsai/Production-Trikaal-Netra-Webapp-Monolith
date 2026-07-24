from pymongo import MongoClient
from pymongo.errors import OperationFailure




uri="mongodb://chat-admin:chat-pwd-123@localhost:27017"



client = MongoClient(uri)
db = client["dev"]





from bson.objectid import ObjectId
from datetime import datetime

db.per_session_documents.insert_one({
    "session_id": ObjectId("69c2b5dc49a25d1639c5c904"),
    "file_name": "MV Asterion Dawn.pdf",
    "file_path": "omnisense-docs/MV Asterion Dawn.pdf",
    "enabled": True,
    "created_at": datetime.utcnow(),
    "mime_type": "application/pdf"
})