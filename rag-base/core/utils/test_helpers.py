"""Helper functions for tests to get or create users"""
from bson import ObjectId
from core.clients.chat_db_client import ChatMongoClient


def get_or_create_test_user(client: ChatMongoClient, username: str = "test_user") -> ObjectId:
    """Get or create a test user in MongoDB
    
    Args:
        client: ChatMongoClient instance
        username: Username for the test user
        
    Returns:
        ObjectId: The user's _id from the users collection
    """
    # Use a fixed user ID instead of creating users
    if username == "test_user":
        user_id = ObjectId("507f1f77bcf86cd799439012")  # Fixed test user ID
    else:
        user_id = ObjectId("507f1f77bcf86cd799439013")  # Fixed alternative user ID
    
    return user_id
